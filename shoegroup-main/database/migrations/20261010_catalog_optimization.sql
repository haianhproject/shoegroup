-- Muc dich: Chuan hoa bien the/khuyen mai va tach gio cho tung hoa don cho; giu lich su don.
SET XACT_ABORT ON;
IF OBJECT_ID(N'dbo.AppMigrations',N'U') IS NULL
  CREATE TABLE dbo.AppMigrations(MigrationKey nvarchar(150) NOT NULL PRIMARY KEY,AppliedAt datetime NOT NULL DEFAULT GETDATE());
IF EXISTS(SELECT 1 FROM dbo.AppMigrations WHERE MigrationKey=N'20261010_CATALOG_OPTIMIZATION') RETURN;
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.ProductVariants','SalePrice') IS NULL ALTER TABLE dbo.ProductVariants ADD SalePrice decimal(18,0) NULL;
IF COL_LENGTH('dbo.VariantDiscounts','ColorID') IS NULL ALTER TABLE dbo.VariantDiscounts ADD ColorID int NULL;
IF COL_LENGTH('dbo.ProductImages','ColorID') IS NULL ALTER TABLE dbo.ProductImages ADD ColorID int NULL;
IF COL_LENGTH('dbo.PosCarts','PosCartID') IS NULL ALTER TABLE dbo.PosCarts ADD PosCartID int IDENTITY(1,1) NOT NULL;
IF COL_LENGTH('dbo.PosCarts','ExpiresAt') IS NULL ALTER TABLE dbo.PosCarts ADD ExpiresAt datetime2 NULL;
IF COL_LENGTH('dbo.PosCarts','Status') IS NULL ALTER TABLE dbo.PosCarts ADD Status varchar(10) NOT NULL CONSTRAINT DF_PosCarts_Status DEFAULT 'Open';
IF COL_LENGTH('dbo.PosCartItems','PosCartID') IS NULL ALTER TABLE dbo.PosCartItems ADD PosCartID int NULL;
GO
IF EXISTS(SELECT 1 FROM dbo.AppMigrations WHERE MigrationKey=N'20261010_CATALOG_OPTIMIZATION') RETURN;
EXEC(N'-- Use existing catalog IDs when names match; never guess an unknown size system.
IF EXISTS(SELECT 1 FROM Sizes WHERE NULLIF(SizeStandard,'''') IS NOT NULL AND UPPER(SizeStandard) NOT IN (''EU'',''US'',''UK''))
BEGIN
  -- Only unused invalid catalog entries may be corrected, preserving their IDs.
  IF EXISTS(SELECT 1 FROM Sizes s JOIN ProductVariants v ON v.SizeID=s.SizeID WHERE UPPER(s.SizeStandard) NOT IN (''EU'',''US'',''UK''))
    THROW 51000,N''Co he kich co khong hop le dang duoc su dung. Can sua truoc khi chuyen doi.'',1;
  UPDATE Sizes SET IsActive=0 WHERE UPPER(SizeStandard) NOT IN (''EU'',''US'',''UK'');
END;
UPDATE Sizes SET SizeStandard=UPPER(COALESCE(NULLIF(LTRIM(RTRIM(SizeStandard)),''''),''EU''));
INSERT Colors(ColorName,ColorHex,IsActive,SortOrder)
SELECT DISTINCT LTRIM(RTRIM(v.ColorName)),COALESCE(NULLIF(v.ColorHex,''''),''#000000''),1,0 FROM ProductVariants v
WHERE NULLIF(LTRIM(RTRIM(v.ColorName)),'''') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM Colors c WHERE c.ColorName=LTRIM(RTRIM(v.ColorName)));
INSERT Sizes(SizeName,SizeStandard,IsActive,SortOrder)
SELECT DISTINCT LTRIM(RTRIM(v.Size)),COALESCE(NULLIF(v.SizeStandard,''''),''EU''),1,0 FROM ProductVariants v
WHERE NULLIF(LTRIM(RTRIM(v.Size)),'''') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM Sizes s WHERE s.SizeName=LTRIM(RTRIM(v.Size)) AND s.SizeStandard=COALESCE(NULLIF(v.SizeStandard,''''),''EU''));
UPDATE v SET ColorID=c.ColorID,SizeID=s.SizeID,SalePrice=p.BasePrice+ISNULL(v.PriceAdjustment,0)
FROM ProductVariants v JOIN Products p ON p.ProductID=v.ProductID
OUTER APPLY(SELECT TOP 1 ColorID FROM Colors WHERE ColorName=LTRIM(RTRIM(v.ColorName)) ORDER BY ColorID) c
OUTER APPLY(SELECT TOP 1 SizeID FROM Sizes WHERE SizeName=LTRIM(RTRIM(v.Size)) AND SizeStandard=COALESCE(NULLIF(v.SizeStandard,''''),''EU'') ORDER BY SizeID) s;
IF EXISTS(SELECT 1 FROM ProductVariants WHERE ColorID IS NULL OR SizeID IS NULL OR SalePrice<0)
  THROW 51000,N''Bien the thieu mau/kich co hoac gia khong hop le. Chuyen doi da dung.'',1;
IF EXISTS(SELECT 1 FROM ProductVariants GROUP BY ProductID,ColorID,SizeID HAVING COUNT(*)>1)
  THROW 51000,N''Trung bien the sau khi chuan hoa. Khong tu dong xoa lich su.'',1;
UPDATE d SET ColorID=v.ColorID,ProductID=v.ProductID FROM VariantDiscounts d JOIN ProductVariants v ON v.ProductVariantID=d.ProductVariantID;
UPDATE i SET ColorID=c.ColorID FROM ProductImages i JOIN Colors c ON c.ColorName=i.ColorName;
ALTER TABLE VariantDiscounts ALTER COLUMN ProductVariantID int NULL;
UPDATE VariantDiscounts SET ProductVariantID=NULL WHERE ApplyScope=''color'';
UPDATE c SET ExpiresAt=DATEADD(day,DATEDIFF(day,0,SYSDATETIME())+1,0) FROM PosCarts c;
UPDATE i SET PosCartID=c.PosCartID FROM PosCartItems i JOIN PosCarts c ON c.UserID=i.UserID;
-- Replace only constraints/indexes depending on columns being retired.
DECLARE @sql nvarchar(max)=N'''';
SELECT @sql=@sql+N''ALTER TABLE dbo.''+QUOTENAME(OBJECT_NAME(parent_object_id))+N'' DROP CONSTRAINT ''+QUOTENAME(name)+N'';''
FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(''dbo.PosCartItems'') AND referenced_object_id=OBJECT_ID(''dbo.PosCarts'');
EXEC sys.sp_executesql @sql;
SET @sql=N'''';
SELECT @sql=@sql+N''ALTER TABLE dbo.''+QUOTENAME(OBJECT_NAME(parent_object_id))+N'' DROP CONSTRAINT ''+QUOTENAME(name)+N'';''
FROM sys.key_constraints WHERE parent_object_id IN(OBJECT_ID(''dbo.PosCarts''),OBJECT_ID(''dbo.PosCartItems'')) AND type=''PK'';
EXEC sys.sp_executesql @sql;
SET @sql=N'''';
SELECT DISTINCT @sql=@sql+N''DROP INDEX ''+QUOTENAME(i.name)+N'' ON dbo.ProductVariants;''
FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.ProductVariants'') AND i.is_primary_key=0 AND i.is_unique_constraint=0 AND EXISTS(
SELECT 1 FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND c.name IN(''Size'',''SizeStandard'',''ColorName'',''ColorHex'',''PriceAdjustment''));
EXEC sys.sp_executesql @sql;
SET @sql=N'''';
SELECT @sql=@sql+N''ALTER TABLE dbo.''+QUOTENAME(OBJECT_NAME(d.parent_object_id))+N'' DROP CONSTRAINT ''+QUOTENAME(d.name)+N'';''
FROM sys.default_constraints d JOIN sys.columns c ON c.object_id=d.parent_object_id AND c.column_id=d.parent_column_id
WHERE (OBJECT_NAME(c.object_id)=''ProductVariants'' AND c.name IN(''Size'',''SizeStandard'',''ColorName'',''ColorHex'',''PriceAdjustment'')) OR (OBJECT_NAME(c.object_id)=''Products'' AND c.name=''BasePrice'') OR (OBJECT_NAME(c.object_id)=''VariantDiscounts'' AND c.name IN(''DiscountPercent'',''ColorHex'',''Description''));
EXEC sys.sp_executesql @sql;
ALTER TABLE ProductVariants ALTER COLUMN ColorID int NOT NULL;
ALTER TABLE ProductVariants ALTER COLUMN SizeID int NOT NULL;
ALTER TABLE ProductVariants ALTER COLUMN SalePrice decimal(18,0) NOT NULL;
ALTER TABLE ProductVariants DROP COLUMN Size,SizeStandard,ColorName,ColorHex,PriceAdjustment;
ALTER TABLE Products DROP COLUMN BasePrice;
ALTER TABLE VariantDiscounts ALTER COLUMN ProductVariantID int NULL;
ALTER TABLE VariantDiscounts DROP COLUMN DiscountPercent,ColorName,ColorHex,Description;
DROP INDEX IF EXISTS IX_ProductImages_Product_Color ON ProductImages;
ALTER TABLE ProductImages DROP COLUMN ColorName;
CREATE INDEX IX_ProductImages_Product_Color ON ProductImages(ProductID,ColorID);
ALTER TABLE ProductImages ADD CONSTRAINT FK_ProductImages_Colors FOREIGN KEY(ColorID) REFERENCES Colors(ColorID);
ALTER TABLE PosCartItems ALTER COLUMN PosCartID int NOT NULL;
ALTER TABLE PosCartItems DROP COLUMN UserID;
ALTER TABLE PosCarts ALTER COLUMN ExpiresAt datetime2 NOT NULL;
ALTER TABLE PosCarts ADD CONSTRAINT DF_PosCarts_ExpiresAt DEFAULT DATEADD(day,DATEDIFF(day,0,SYSDATETIME())+1,0) FOR ExpiresAt;
ALTER TABLE PosCarts ADD CONSTRAINT PK_PosCarts PRIMARY KEY(PosCartID);
ALTER TABLE PosCartItems ADD CONSTRAINT PK_PosCartItems PRIMARY KEY(PosCartID,ProductVariantID),CONSTRAINT FK_PosCartItems_Cart FOREIGN KEY(PosCartID) REFERENCES PosCarts(PosCartID);
ALTER TABLE VariantDiscounts ADD CONSTRAINT FK_VariantDiscounts_Colors FOREIGN KEY(ColorID) REFERENCES Colors(ColorID),CONSTRAINT CK_VariantDiscounts_Scope CHECK((ApplyScope=''color'' AND ProductID IS NOT NULL AND ColorID IS NOT NULL AND ProductVariantID IS NULL) OR (ApplyScope=''variant'' AND ProductVariantID IS NOT NULL));
CREATE UNIQUE INDEX UQ_ProductVariants_Product_Color_Size ON ProductVariants(ProductID,ColorID,SizeID);
CREATE UNIQUE INDEX UQ_Sizes_Name_Standard ON Sizes(SizeName,SizeStandard) WHERE IsActive=1;
CREATE INDEX IX_PosCarts_User ON PosCarts(UserID,PosCartID);
ALTER TABLE ProductVariants ADD CONSTRAINT CK_ProductVariants_SalePrice CHECK(SalePrice>=0);
EXEC(N''CREATE OR ALTER VIEW dbo.ProductVariantRead AS SELECT v.*,c.ColorName,c.ColorHex,s.SizeName AS Size,s.SizeStandard FROM dbo.ProductVariants v JOIN dbo.Colors c ON c.ColorID=v.ColorID JOIN dbo.Sizes s ON s.SizeID=v.SizeID'');
EXEC(N''CREATE OR ALTER VIEW dbo.ProductRead AS SELECT p.*,ISNULL((SELECT MIN(v.SalePrice) FROM dbo.ProductVariants v WHERE v.ProductID=p.ProductID AND v.IsActive=1),0) AS BasePrice FROM dbo.Products p'');
EXEC(N''CREATE OR ALTER VIEW dbo.ProductImageRead AS SELECT i.*,c.ColorName FROM dbo.ProductImages i LEFT JOIN dbo.Colors c ON c.ColorID=i.ColorID'');
EXEC(N''CREATE OR ALTER VIEW dbo.VariantDiscountRead AS SELECT d.*,c.ColorName,c.ColorHex FROM dbo.VariantDiscounts d LEFT JOIN dbo.Colors c ON c.ColorID=d.ColorID'');
INSERT AppMigrations(MigrationKey) VALUES(N''20261010_CATALOG_OPTIMIZATION'');
');
COMMIT TRANSACTION;
