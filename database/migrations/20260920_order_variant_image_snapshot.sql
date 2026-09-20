/* ShoeGroup - cố định ảnh đúng màu/biến thể trong lịch sử đơn hàng.
   Dữ liệu cũ được bổ sung từ ProductImages; đơn mới tự lưu snapshot khi tạo. */

IF OBJECT_ID(N'dbo.AppMigrations', N'U') IS NULL
  EXEC(N'CREATE TABLE dbo.AppMigrations(
    MigrationKey nvarchar(150) NOT NULL PRIMARY KEY,
    AppliedAt datetime NOT NULL DEFAULT GETDATE()
  )');

/* The checkout query resolves the exact color image while it owns inventory
   locks. Keep that lookup narrow so concurrent checkouts do not scan the full
   image table. This block deliberately sits outside the data-backfill marker:
   deployments that already ran the backfill still receive the index. */
IF OBJECT_ID(N'dbo.ProductImages', N'U') IS NOT NULL
   AND NOT EXISTS (
     SELECT 1
     FROM sys.indexes
     WHERE object_id=OBJECT_ID(N'dbo.ProductImages')
       AND name=N'IX_ProductImages_Product_Color'
   )
  CREATE INDEX IX_ProductImages_Product_Color
    ON dbo.ProductImages(ProductID,ColorName,IsPrimary,SortOrder);

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF NOT EXISTS (
  SELECT 1 FROM dbo.AppMigrations WITH (UPDLOCK,HOLDLOCK)
  WHERE MigrationKey=N'20260920_ORDER_VARIANT_IMAGE_SNAPSHOT'
)
BEGIN
  IF OBJECT_ID(N'dbo.OrderDetails', N'U') IS NOT NULL
     AND OBJECT_ID(N'dbo.ProductVariants', N'U') IS NOT NULL
     AND OBJECT_ID(N'dbo.ProductImages', N'U') IS NOT NULL
     AND COL_LENGTH('dbo.OrderDetails', 'ImageURLSnapshot') IS NOT NULL
  BEGIN
    UPDATE od
    SET ImageURLSnapshot=COALESCE(NULLIF(od.ImageURLSnapshot,''),variantImage.ImageURL),
        SKUSnapshot=COALESCE(NULLIF(od.SKUSnapshot,''),v.ChildSKU),
        ColorHex=COALESCE(NULLIF(od.ColorHex,''),v.ColorHex)
    FROM dbo.OrderDetails od
    LEFT JOIN dbo.ProductVariants v
      ON v.ProductVariantID=od.ProductVariantID AND v.ProductID=od.ProductID
    OUTER APPLY (
      SELECT TOP 1 pi.ImageURL
      FROM dbo.ProductImages pi
      WHERE pi.ProductID=od.ProductID
        AND LTRIM(RTRIM(ISNULL(pi.ColorName,N'')))=
            LTRIM(RTRIM(COALESCE(NULLIF(v.ColorName,N''),od.Color,N'')))
        AND NULLIF(LTRIM(RTRIM(pi.ImageURL)), '') IS NOT NULL
      ORDER BY pi.IsPrimary DESC,pi.SortOrder
    ) variantImage
    WHERE NULLIF(od.ImageURLSnapshot,'') IS NULL
       OR NULLIF(od.SKUSnapshot,'') IS NULL
       OR NULLIF(od.ColorHex,'') IS NULL;
  END;

  INSERT dbo.AppMigrations(MigrationKey)
  VALUES(N'20260920_ORDER_VARIANT_IMAGE_SNAPSHOT');
END;

COMMIT TRANSACTION;
