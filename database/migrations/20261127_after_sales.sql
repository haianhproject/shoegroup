-- Mục đích: Tiếp nhận hàng trả, phân loại tồn và đối soát hoàn tiền; giữ nguyên lịch sử cũ.
SET XACT_ABORT ON;
IF COL_LENGTH('dbo.Orders','ReturnAdjustmentAmount') IS NULL
  ALTER TABLE dbo.Orders ADD ReturnAdjustmentAmount decimal(18,2) NOT NULL CONSTRAINT DF_Orders_ReturnAdjustment DEFAULT(0);
IF COL_LENGTH('dbo.Orders','WarehouseClosedAt') IS NULL
  ALTER TABLE dbo.Orders ADD WarehouseClosedAt datetime2 NULL;
IF COL_LENGTH('dbo.OrderDetails','ReturnedQuantity') IS NULL
  ALTER TABLE dbo.OrderDetails ADD ReturnedQuantity int NOT NULL CONSTRAINT DF_OrderDetails_Returned DEFAULT(0);
IF COL_LENGTH('dbo.ProductVariants','DamagedQuantity') IS NULL
  ALTER TABLE dbo.ProductVariants ADD DamagedQuantity int NOT NULL CONSTRAINT DF_ProductVariants_Damaged DEFAULT(0)
    CONSTRAINT CK_ProductVariants_Damaged CHECK(DamagedQuantity>=0);
IF OBJECT_ID('dbo.OrderReturns','U') IS NULL
BEGIN
  CREATE TABLE dbo.OrderReturns(
    ReturnID int IDENTITY PRIMARY KEY,
    OrderID int NOT NULL REFERENCES dbo.Orders(OrderID),
    RequestKey uniqueidentifier NOT NULL,
    RequestHash char(64) NOT NULL,
    Status varchar(24) NOT NULL CONSTRAINT DF_OrderReturns_Status DEFAULT('REQUESTED'),
    IsOpen bit NOT NULL CONSTRAINT DF_OrderReturns_Open DEFAULT(1),
    Reason nvarchar(500) NOT NULL,
    ReviewNote nvarchar(500) NULL,
    ReceiptNote nvarchar(500) NULL,
    RequestedByUserID int NOT NULL REFERENCES dbo.Users(UserID),
    CreatedAt datetime2 NOT NULL CONSTRAINT DF_OrderReturns_Created DEFAULT(SYSDATETIME()),
    ReviewedAt datetime2 NULL,
    ReceivedAt datetime2 NULL,
    RefundedAt datetime2 NULL,
    RefundAmount decimal(18,2) NOT NULL CONSTRAINT DF_OrderReturns_Amount DEFAULT(0),
    ShippingRefundAmount decimal(18,2) NOT NULL CONSTRAINT DF_OrderReturns_Shipping DEFAULT(0),
    RefundTransactionID int NULL REFERENCES dbo.PaymentTransactions(TransactionID),
    CONSTRAINT UQ_OrderReturns_Request UNIQUE(OrderID,RequestKey),
    CONSTRAINT CK_OrderReturns_Status CHECK(
      (IsOpen=1 AND Status IN ('REQUESTED','APPROVED','REFUND_PENDING')) OR
      (IsOpen=0 AND Status IN ('REJECTED','COMPLETED'))),
    CONSTRAINT CK_OrderReturns_Amounts CHECK(RefundAmount>=0 AND ShippingRefundAmount>=0 AND ShippingRefundAmount<=RefundAmount)
  );
  CREATE UNIQUE INDEX UX_OrderReturns_Open ON dbo.OrderReturns(OrderID) WHERE IsOpen=1;
  CREATE INDEX IX_OrderReturns_Status ON dbo.OrderReturns(IsOpen,CreatedAt,ReturnID);
END;
IF OBJECT_ID('dbo.OrderReturnItems','U') IS NULL
BEGIN
  CREATE TABLE dbo.OrderReturnItems(
    ReturnItemID int IDENTITY PRIMARY KEY,
    ReturnID int NOT NULL REFERENCES dbo.OrderReturns(ReturnID),
    OrderDetailID int NOT NULL REFERENCES dbo.OrderDetails(OrderDetailID),
    RequestedQuantity int NOT NULL,
    GoodQuantity int NOT NULL CONSTRAINT DF_OrderReturnItems_Good DEFAULT(0),
    DamagedQuantity int NOT NULL CONSTRAINT DF_OrderReturnItems_Damaged DEFAULT(0),
    RefundAmount decimal(18,2) NOT NULL CONSTRAINT DF_OrderReturnItems_Refund DEFAULT(0),
    CONSTRAINT UQ_OrderReturnItems_Detail UNIQUE(ReturnID,OrderDetailID),
    CONSTRAINT CK_OrderReturnItems_Quantity CHECK(RequestedQuantity>0 AND GoodQuantity>=0 AND DamagedQuantity>=0 AND GoodQuantity+DamagedQuantity<=RequestedQuantity),
    CONSTRAINT CK_OrderReturnItems_Refund CHECK(RefundAmount>=0)
  );
END;
IF OBJECT_ID('dbo.OrderReturnEvents','U') IS NULL
  CREATE TABLE dbo.OrderReturnEvents(
    EventID int IDENTITY PRIMARY KEY,
    ReturnID int NOT NULL REFERENCES dbo.OrderReturns(ReturnID),
    Status varchar(24) NOT NULL,
    Note nvarchar(500) NOT NULL,
    UserID int NOT NULL REFERENCES dbo.Users(UserID),
    CreatedAt datetime2 NOT NULL CONSTRAINT DF_OrderReturnEvents_Created DEFAULT(SYSDATETIME())
  );
IF OBJECT_ID('dbo.InventoryMovements','U') IS NULL
BEGIN
  CREATE TABLE dbo.InventoryMovements(
    MovementID int IDENTITY PRIMARY KEY,
    ProductVariantID int NOT NULL REFERENCES dbo.ProductVariants(ProductVariantID),
    OrderID int NULL REFERENCES dbo.Orders(OrderID),
    ReturnItemID int NULL REFERENCES dbo.OrderReturnItems(ReturnItemID),
    EventKey varchar(100) NOT NULL UNIQUE,
    Kind varchar(24) NOT NULL,
    AvailableDelta int NOT NULL,
    DamagedDelta int NOT NULL,
    Note nvarchar(500) NOT NULL,
    CreatedByUserID int NOT NULL REFERENCES dbo.Users(UserID),
    CreatedAt datetime2 NOT NULL CONSTRAINT DF_InventoryMovements_Created DEFAULT(SYSDATETIME()),
    CONSTRAINT CK_InventoryMovements_Kind CHECK(Kind IN ('RETURN_RECEIVED','WAREHOUSE_RECEIVED','DAMAGE_REPAIRED','DAMAGE_WRITEOFF'))
  );
  CREATE UNIQUE INDEX UX_InventoryMovements_ReturnItem ON dbo.InventoryMovements(ReturnItemID) WHERE ReturnItemID IS NOT NULL;
END;
IF OBJECT_ID('dbo.RefundConfirmations','U') IS NULL
  CREATE TABLE dbo.RefundConfirmations(
    TransactionID int PRIMARY KEY REFERENCES dbo.PaymentTransactions(TransactionID),
    Reference nvarchar(100) NOT NULL UNIQUE,
    Note nvarchar(500) NOT NULL,
    ConfirmedByUserID int NOT NULL REFERENCES dbo.Users(UserID),
    ConfirmedAt datetime2 NOT NULL CONSTRAINT DF_RefundConfirmations_Date DEFAULT(SYSDATETIME())
  );
-- View cũ có SELECT pv.* cần làm mới metadata sau khi thêm DamagedQuantity.
-- Nếu bỏ qua, các trường tính toán màu/hex/size có thể bị lệch vị trí cột.
IF OBJECT_ID('dbo.ProductVariantRead','V') IS NOT NULL EXEC sys.sp_refreshview N'dbo.ProductVariantRead';
IF OBJECT_ID('dbo.ProductRead','V') IS NOT NULL EXEC sys.sp_refreshview N'dbo.ProductRead';
