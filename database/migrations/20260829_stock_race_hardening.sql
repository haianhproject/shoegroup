/* ShoeGroup - chống oversell và đối soát các đơn dữ liệu cũ
   Migration idempotent: không xóa dữ liệu, không tạo lại bảng Orders. */
IF OBJECT_ID(N'dbo.Orders', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH('dbo.Orders', 'StockIssueStatus') IS NULL
    ALTER TABLE dbo.Orders ADD StockIssueStatus nvarchar(30) NULL;
  IF COL_LENGTH('dbo.Orders', 'StockIssueReason') IS NULL
    ALTER TABLE dbo.Orders ADD StockIssueReason nvarchar(500) NULL;
  IF COL_LENGTH('dbo.Orders', 'StockRestoredAt') IS NULL
    ALTER TABLE dbo.Orders ADD StockRestoredAt datetime NULL;
END
GO

IF OBJECT_ID(N'dbo.Orders', N'U') IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM sys.indexes
     WHERE name = N'IX_Orders_StockIssueStatus'
       AND object_id = OBJECT_ID(N'dbo.Orders')
   )
  CREATE INDEX IX_Orders_StockIssueStatus ON dbo.Orders(StockIssueStatus, Status);
GO

/* Không cho phép bất kỳ đường ghi mới nào đưa tồn kho xuống âm. Nếu dữ liệu
   cũ đã có số âm thì giữ nguyên để audit đánh dấu đơn cần xử lý, không tự ý
   sửa số liệu của quản lý. */
IF OBJECT_ID(N'dbo.ProductVariants', N'U') IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM sys.check_constraints
     WHERE name = N'CK_ProductVariants_Stock_NonNegative'
       AND parent_object_id = OBJECT_ID(N'dbo.ProductVariants')
   )
   AND NOT EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE ISNULL(StockQuantity, 0) < 0)
  ALTER TABLE dbo.ProductVariants WITH CHECK
    ADD CONSTRAINT CK_ProductVariants_Stock_NonNegative CHECK (StockQuantity >= 0);
GO

/* Chỉ gắn cờ các dữ liệu chắc chắn không thể đối soát:
   chi tiết lỗi số lượng, variant không tồn tại/không khớp sản phẩm, hoặc
   tồn kho âm do dữ liệu cũ. Đơn hợp lệ không bị suy đoán là oversell. */
IF OBJECT_ID(N'dbo.Orders', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.OrderDetails', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.ProductVariants', N'U') IS NOT NULL
BEGIN
  UPDATE o
  SET StockIssueStatus = N'NEEDS_REVIEW',
      StockIssueReason = COALESCE(NULLIF(o.StockIssueReason, N''), N'Dữ liệu tồn kho/biến thể cần quản lý kiểm tra.'),
      UpdatedAt = GETDATE()
  FROM dbo.Orders o
  WHERE ISNULL(o.StockIssueStatus, N'') = N''
    AND ISNULL(o.Status, N'') NOT IN (N'Đã hủy', N'Da huy', N'Đã nhận hàng', N'Da nhan hang', N'Đã hoàn tất trả hàng')
    AND EXISTS (
      SELECT 1
      FROM dbo.OrderDetails od
      LEFT JOIN dbo.ProductVariants v ON v.ProductVariantID = od.ProductVariantID
      OUTER APPLY (
        SELECT TOP 1 vv.ProductVariantID
        FROM dbo.ProductVariants vv
        WHERE vv.ProductID = od.ProductID
          AND ISNULL(vv.Size, N'') = ISNULL(od.Size, N'')
          AND ISNULL(vv.ColorName, N'') = ISNULL(od.Color, N'')
        ORDER BY vv.ProductVariantID
      ) matching
      WHERE od.OrderID = o.OrderID
        AND (
          ISNULL(od.Quantity, 0) <= 0
          OR (od.ProductVariantID IS NOT NULL AND (v.ProductVariantID IS NULL OR v.ProductID <> od.ProductID))
          OR (od.ProductVariantID IS NULL AND matching.ProductVariantID IS NULL)
          OR ISNULL(v.StockQuantity, 0) < 0
        )
    );
END
GO
