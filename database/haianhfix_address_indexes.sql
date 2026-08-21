SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

;WITH RankedAddresses AS (
    SELECT AddressID,
           ROW_NUMBER() OVER (
               PARTITION BY UserID
               ORDER BY CASE WHEN ISNULL(IsDefault, 0) = 1 THEN 0 ELSE 1 END,
                        AddressID DESC
           ) AS DefaultRank
    FROM dbo.UserAddresses
)
UPDATE ua
SET IsDefault = CASE WHEN ranked.DefaultRank = 1 THEN 1 ELSE 0 END
FROM dbo.UserAddresses AS ua
JOIN RankedAddresses AS ranked ON ranked.AddressID = ua.AddressID;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.UserAddresses')
      AND name = N'IX_UserAddresses_User_Address'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_UserAddresses_User_Address
        ON dbo.UserAddresses (UserID, AddressID);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.UserAddresses')
      AND name = N'UQ_UserAddresses_OneDefault'
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UQ_UserAddresses_OneDefault
        ON dbo.UserAddresses (UserID)
        WHERE IsDefault = 1;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.Orders')
      AND name = N'IX_Orders_AddressID'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Orders_AddressID
        ON dbo.Orders (AddressID);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.OrderStatusHistory')
      AND name = N'IX_OrderStatusHistory_Order'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_OrderStatusHistory_Order
        ON dbo.OrderStatusHistory (OrderID)
        INCLUDE (Note);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.Returns')
      AND name = N'IX_Returns_OrderID'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Returns_OrderID
        ON dbo.Returns (OrderID);
END;

COMMIT TRANSACTION;
