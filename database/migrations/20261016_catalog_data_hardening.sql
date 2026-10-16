-- Muc dich: Don du lieu catalog sai, giu ID/ton/lich su, ngan trung kich co va SKU.
SET XACT_ABORT ON;
IF EXISTS(SELECT 1 FROM dbo.AppMigrations WHERE MigrationKey=N'20261016_CATALOG_DATA_HARDENING') RETURN;
BEGIN TRANSACTION;
SELECT SizeID,UPPER(LTRIM(RTRIM(SizeStandard))) AS Standard,
  TRY_CONVERT(decimal(18,8),REPLACE(SizeName,',','.')) AS Value INTO #SizeValues FROM dbo.Sizes;
SELECT SizeID INTO #InvalidSizes FROM #SizeValues WHERE Standard IS NULL OR Standard NOT IN('EU','US','UK') OR Value IS NULL
  OR Value*2<>FLOOR(Value*2) OR Value<CASE WHEN Standard='EU' THEN 14 ELSE 0 END OR Value>CASE WHEN Standard='EU' THEN 60 ELSE 22 END;
IF EXISTS(SELECT 1 FROM #InvalidSizes i JOIN dbo.ProductVariants v ON v.SizeID=i.SizeID)
  THROW 51000,N'Invalid size is referenced. Correct its meaning explicitly before migration.',1;
DELETE s FROM dbo.Sizes s JOIN #InvalidSizes i ON i.SizeID=s.SizeID;
DROP INDEX IF EXISTS UQ_Sizes_Name_Standard ON dbo.Sizes;
UPDATE s SET SizeStandard=n.Standard,SizeName=CASE WHEN n.Value=FLOOR(n.Value)
  THEN CONVERT(varchar(20),CONVERT(int,n.Value)) ELSE CONVERT(varchar(20),CONVERT(decimal(5,1),n.Value)) END
FROM dbo.Sizes s JOIN #SizeValues n ON n.SizeID=s.SizeID;
SELECT s.SizeID,ROW_NUMBER() OVER(PARTITION BY s.SizeName,s.SizeStandard ORDER BY
  CASE WHEN EXISTS(SELECT 1 FROM dbo.ProductVariants v WHERE v.SizeID=s.SizeID) THEN 0 ELSE 1 END,s.SizeID) AS rn
INTO #RepeatedSizes FROM dbo.Sizes s;
IF EXISTS(SELECT 1 FROM #RepeatedSizes d JOIN dbo.ProductVariants v ON v.SizeID=d.SizeID WHERE d.rn>1)
  THROW 51000,N'Duplicate sizes are referenced. Resolve variant conflicts before migration.',1;
DELETE s FROM dbo.Sizes s JOIN #RepeatedSizes d ON d.SizeID=s.SizeID WHERE d.rn>1;
CREATE UNIQUE INDEX UQ_Sizes_Name_Standard ON dbo.Sizes(SizeName,SizeStandard);
ALTER TABLE dbo.Sizes WITH CHECK ADD CONSTRAINT CK_Sizes_Standard_Value CHECK(
  SizeStandard IS NOT NULL AND SizeStandard IN('EU','US','UK') AND TRY_CONVERT(decimal(18,8),SizeName) IS NOT NULL
  AND TRY_CONVERT(decimal(18,8),SizeName)*2=FLOOR(TRY_CONVERT(decimal(18,8),SizeName)*2)
  AND TRY_CONVERT(decimal(18,8),SizeName) BETWEEN CASE WHEN SizeStandard='EU' THEN 14 ELSE 0 END AND CASE WHEN SizeStandard='EU' THEN 60 ELSE 22 END
  AND SizeName=CASE WHEN TRY_CONVERT(decimal(18,8),SizeName)=FLOOR(TRY_CONVERT(decimal(18,8),SizeName))
    THEN CONVERT(varchar(20),TRY_CONVERT(int,TRY_CONVERT(decimal(18,8),SizeName))) ELSE CONVERT(varchar(20),TRY_CONVERT(decimal(5,1),SizeName)) END);
-- Never delete a variant to repair its old generated SKU; order snapshots remain unchanged.
;WITH Repeated AS(SELECT ProductVariantID,ROW_NUMBER() OVER(PARTITION BY UPPER(LTRIM(RTRIM(ChildSKU))) ORDER BY ProductVariantID) AS rn FROM dbo.ProductVariants)
UPDATE v SET ChildSKU=CONCAT('SKU-P',v.ProductID,'-V',v.ProductVariantID),Version=ISNULL(Version,0)+1
FROM dbo.ProductVariants v JOIN Repeated r ON r.ProductVariantID=v.ProductVariantID
WHERE r.rn>1 OR NULLIF(LTRIM(RTRIM(v.ChildSKU)),'') IS NULL
  OR v.ChildSKU COLLATE Latin1_General_100_BIN2 LIKE '%[^A-Z0-9_-]%';
CREATE UNIQUE INDEX UQ_ProductVariants_SKU ON dbo.ProductVariants(ChildSKU);
ALTER TABLE dbo.ProductVariants WITH CHECK ADD CONSTRAINT CK_ProductVariants_SKU CHECK(
  ChildSKU IS NOT NULL AND LEN(ChildSKU)>0 AND ChildSKU COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^A-Z0-9_-]%');
UPDATE v SET IsActive=0,Version=ISNULL(Version,0)+1 FROM dbo.ProductVariants v JOIN dbo.Products p ON p.ProductID=v.ProductID
WHERE p.IsActive=0 AND v.IsActive=1;
DROP TABLE #RepeatedSizes;
DROP TABLE #InvalidSizes;
DROP TABLE #SizeValues;
INSERT dbo.AppMigrations(MigrationKey) VALUES(N'20261016_CATALOG_DATA_HARDENING');
COMMIT TRANSACTION;
