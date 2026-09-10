-- Durable replay response commits together with order, items, stock and coupon.
IF OBJECT_ID(N'dbo.CheckoutRequests', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CheckoutRequests (
    UserID int NOT NULL REFERENCES dbo.Users(UserID),
    IdempotencyKey varchar(128) COLLATE Latin1_General_100_BIN2 NOT NULL,
    RequestHash char(64) NOT NULL,
    OrderID int NOT NULL REFERENCES dbo.Orders(OrderID),
    ResponseJson nvarchar(max) NOT NULL,
    CreatedAt datetime2 NOT NULL CONSTRAINT DF_CheckoutRequests_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_CheckoutRequests PRIMARY KEY (UserID, IdempotencyKey),
    CONSTRAINT UQ_CheckoutRequests_OrderID UNIQUE (OrderID),
    CONSTRAINT CK_CheckoutRequests_ResponseJson CHECK (ISJSON(ResponseJson)=1)
  );
END;
