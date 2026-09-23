/* Ghi lai khuyen mai bien the da ap dung cho tung dong don hang de co the
   hoan quota chinh xac khi don bi huy. Cac lenh idempotent. */
IF OBJECT_ID(N'dbo.OrderDetails', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.OrderDetails', 'VariantDiscountID') IS NULL
  ALTER TABLE dbo.OrderDetails ADD VariantDiscountID int NULL;

IF OBJECT_ID(N'dbo.Orders', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.Orders', 'VariantDiscountRestoredAt') IS NULL
  ALTER TABLE dbo.Orders ADD VariantDiscountRestoredAt datetime NULL;

IF OBJECT_ID(N'dbo.OrderDetails', N'U') IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM sys.indexes
     WHERE object_id=OBJECT_ID(N'dbo.OrderDetails')
       AND name=N'IX_OrderDetails_VariantDiscount'
   )
  CREATE INDEX IX_OrderDetails_VariantDiscount
    ON dbo.OrderDetails(VariantDiscountID, OrderID)
    INCLUDE(Quantity);
