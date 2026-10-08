-- Mục đích: Giữ số tiền hoàn và số lượng trả lịch sử để tính doanh thu đúng.
-- Keep historical revenue deductions after retiring the returns module.
IF COL_LENGTH(N'dbo.Orders', N'HistoricalRefundAmount') IS NULL
  ALTER TABLE dbo.Orders ADD HistoricalRefundAmount decimal(18,2) NOT NULL
    CONSTRAINT DF_Orders_HistoricalRefundAmount DEFAULT (0);
IF COL_LENGTH(N'dbo.OrderDetails', N'HistoricalReturnedQuantity') IS NULL
  ALTER TABLE dbo.OrderDetails ADD HistoricalReturnedQuantity int NOT NULL
    CONSTRAINT DF_OrderDetails_HistoricalReturnedQuantity DEFAULT (0);
-- Dynamic SQL also works when the columns were added in this batch.
IF OBJECT_ID(N'dbo.Returns', N'U') IS NOT NULL
  EXEC(N'UPDATE o SET HistoricalRefundAmount = r.Amount
    FROM dbo.Orders o JOIN (
      SELECT OrderID, SUM(RefundAmount) Amount FROM dbo.Returns
      WHERE RefundedAt IS NOT NULL GROUP BY OrderID
    ) r ON r.OrderID=o.OrderID');
IF OBJECT_ID(N'dbo.ReturnDetails', N'U') IS NOT NULL
  EXEC(N'UPDATE od SET HistoricalReturnedQuantity = r.Quantity
    FROM dbo.OrderDetails od JOIN (
      SELECT rd.OrderDetailID, SUM(rd.Quantity) Quantity
      FROM dbo.ReturnDetails rd JOIN dbo.Returns r ON r.ReturnID=rd.ReturnID
      WHERE r.Status=N''Đã hoàn tất'' GROUP BY rd.OrderDetailID
    ) r ON r.OrderDetailID=od.OrderDetailID');
