/* ShoeGroup - sales flow hardening (idempotent)
   Safe to run on an existing database and included at the end of dbsql.sql. */
IF COL_LENGTH('dbo.Orders', 'PaymentDueAt') IS NULL
  ALTER TABLE dbo.Orders ADD PaymentDueAt datetime NULL;
IF COL_LENGTH('dbo.Orders', 'PaymentConfirmedAt') IS NULL
  ALTER TABLE dbo.Orders ADD PaymentConfirmedAt datetime NULL;
IF COL_LENGTH('dbo.Returns', 'InspectionNote') IS NULL
  ALTER TABLE dbo.Returns ADD InspectionNote nvarchar(1000) NULL;
IF COL_LENGTH('dbo.Returns', 'ResolutionNote') IS NULL
  ALTER TABLE dbo.Returns ADD ResolutionNote nvarchar(1000) NULL;
IF COL_LENGTH('dbo.Returns', 'ApprovedAt') IS NULL
  ALTER TABLE dbo.Returns ADD ApprovedAt datetime NULL;
IF COL_LENGTH('dbo.Returns', 'RefundedAt') IS NULL
  ALTER TABLE dbo.Returns ADD RefundedAt datetime NULL;
IF COL_LENGTH('dbo.Returns', 'RestockedAt') IS NULL
  ALTER TABLE dbo.Returns ADD RestockedAt datetime NULL;
IF COL_LENGTH('dbo.Returns', 'UpdatedBy') IS NULL
  ALTER TABLE dbo.Returns ADD UpdatedBy int NULL;
IF COL_LENGTH('dbo.ReturnDetails', 'Condition') IS NULL
  ALTER TABLE dbo.ReturnDetails ADD Condition nvarchar(30) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ReturnDetails_ReturnID' AND object_id = OBJECT_ID('dbo.ReturnDetails'))
  CREATE INDEX IX_ReturnDetails_ReturnID ON dbo.ReturnDetails(ReturnID);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PaymentTransactions_OrderID_CreatedAt' AND object_id = OBJECT_ID('dbo.PaymentTransactions'))
  CREATE INDEX IX_PaymentTransactions_OrderID_CreatedAt ON dbo.PaymentTransactions(OrderID, CreatedAt DESC);
GO

UPDATE dbo.Orders
SET PaymentDueAt = DATEADD(hour, 24, ISNULL(OrderDate, GETDATE()))
WHERE PaymentMethod LIKE N'%chuyển khoản%'
  AND PaymentDueAt IS NULL
  AND ISNULL(PaymentStatus, N'Chưa thanh toán') NOT IN (N'Đã thanh toán', N'Hoàn tiền', N'Đã hủy');
GO
