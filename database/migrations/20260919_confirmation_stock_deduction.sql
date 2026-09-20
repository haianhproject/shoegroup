/* ShoeGroup - chỉ trừ tồn khi quản lý xác nhận đơn.
   Chạy idempotent trên dữ liệu cũ đã dùng CartItems để giữ/trừ tồn. */

IF OBJECT_ID(N'dbo.Orders', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.Orders', 'StockDeductedAt') IS NULL
  ALTER TABLE dbo.Orders ADD StockDeductedAt datetime NULL;

IF OBJECT_ID(N'dbo.Orders', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.Orders', 'StockRestoredAt') IS NULL
  ALTER TABLE dbo.Orders ADD StockRestoredAt datetime NULL;

IF OBJECT_ID(N'dbo.AppMigrations', N'U') IS NULL
  EXEC(N'CREATE TABLE dbo.AppMigrations(
    MigrationKey nvarchar(150) NOT NULL PRIMARY KEY,
    AppliedAt datetime NOT NULL DEFAULT GETDATE()
  )');

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF NOT EXISTS (
  SELECT 1 FROM dbo.AppMigrations WITH (UPDLOCK,HOLDLOCK)
  WHERE MigrationKey=N'20260919_CONFIRMATION_STOCK_DEDUCTION'
)
BEGIN
  /* Tất cả đơn cũ chưa hoàn kho đều đã bị trừ bởi luồng checkout cũ. */
  EXEC sys.sp_executesql N'
    UPDATE dbo.Orders
    SET StockDeductedAt=ISNULL(OrderDate,GETDATE())
    WHERE StockDeductedAt IS NULL
      AND StockRestoredAt IS NULL
      AND EXISTS (SELECT 1 FROM dbo.OrderDetails od WHERE od.OrderID=Orders.OrderID);
  ';

  /* Hoàn đúng phần các giỏ cũ đang giữ rồi bỏ toàn bộ bản giữ server. */
  IF OBJECT_ID(N'dbo.CartItems', N'U') IS NOT NULL
     AND OBJECT_ID(N'dbo.ProductVariants', N'U') IS NOT NULL
  BEGIN
    ;WITH held AS (
      SELECT ProductVariantID, SUM(ISNULL(Quantity,0)) AS Quantity
      FROM dbo.CartItems
      WHERE ISNULL(Quantity,0)>0
      GROUP BY ProductVariantID
    )
    UPDATE v
    SET StockQuantity=ISNULL(v.StockQuantity,0)+held.Quantity,
        Version=ISNULL(v.Version,0)+1
    FROM dbo.ProductVariants v
    JOIN held ON held.ProductVariantID=v.ProductVariantID;

    DELETE FROM dbo.CartItems;
  END;

  INSERT dbo.AppMigrations(MigrationKey)
  VALUES(N'20260919_CONFIRMATION_STOCK_DEDUCTION');
END;

COMMIT TRANSACTION;

/* Luồng chuyển khoản mới xác nhận ngay tại QR, không còn hạn 24 giờ. */
IF OBJECT_ID(N'dbo.Orders', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.Orders', 'PaymentDueAt') IS NOT NULL
  UPDATE dbo.Orders SET PaymentDueAt=NULL WHERE PaymentDueAt IS NOT NULL;
