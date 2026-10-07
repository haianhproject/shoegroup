-- MANUAL migration. Back up and verify the database first.
-- Run 20261004_revenue_history.sql before this script.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH(N'dbo.Orders',N'HistoricalRefundAmount') IS NULL
   OR COL_LENGTH(N'dbo.OrderDetails',N'HistoricalReturnedQuantity') IS NULL
  THROW 51000, 'Run the revenue history migration before removing returns.', 1;

DROP TABLE IF EXISTS dbo.ShoeGroupWalletTransactions;
DROP TABLE IF EXISTS dbo.ShoeGroupWalletWithdrawals;
DROP TABLE IF EXISTS dbo.ShoeGroupWallets;
DROP TABLE IF EXISTS dbo.ReturnDetails;
DROP TABLE IF EXISTS dbo.Returns;
DROP TABLE IF EXISTS dbo.PostOffices;

-- Remove dependencies on Products.CollectionID before dropping the column.
DECLARE @sql nvarchar(max)=N'';
SELECT @sql += N'ALTER TABLE dbo.Products DROP CONSTRAINT '+QUOTENAME(f.name)+N';'
FROM sys.foreign_keys f
WHERE f.parent_object_id=OBJECT_ID(N'dbo.Products')
  AND f.referenced_object_id=OBJECT_ID(N'dbo.Collections');
SELECT @sql += N'ALTER TABLE dbo.Products DROP CONSTRAINT '+QUOTENAME(d.name)+N';'
FROM sys.default_constraints d JOIN sys.columns c
 ON c.object_id=d.parent_object_id AND c.column_id=d.parent_column_id
WHERE c.object_id=OBJECT_ID(N'dbo.Products') AND c.name=N'CollectionID';
EXEC sp_executesql @sql;
IF COL_LENGTH(N'dbo.Products',N'CollectionID') IS NOT NULL
  ALTER TABLE dbo.Products DROP COLUMN CollectionID;
DROP TABLE IF EXISTS dbo.Collections;
COMMIT TRANSACTION;
