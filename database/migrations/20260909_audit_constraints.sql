-- Apply after reviewing existing data; WITH CHECK deliberately refuses invalid history.
-- No history is deleted or silently repaired by this migration.
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_OrderDetails_ValidAmounts')
  ALTER TABLE dbo.OrderDetails WITH CHECK ADD CONSTRAINT CK_OrderDetails_ValidAmounts CHECK(Quantity>0 AND UnitPrice>=0);
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Orders_ValidAmounts')
  ALTER TABLE dbo.Orders WITH CHECK ADD CONSTRAINT CK_Orders_ValidAmounts CHECK(TotalAmount>=0 AND ShippingFee>=0 AND DiscountAmount>=0);
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_ReturnDetails_Quantity')
  ALTER TABLE dbo.ReturnDetails WITH CHECK ADD CONSTRAINT CK_ReturnDetails_Quantity CHECK(Quantity>0);
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Returns_RefundAmount')
  ALTER TABLE dbo.Returns WITH CHECK ADD CONSTRAINT CK_Returns_RefundAmount CHECK(RefundAmount>=0);
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_PaymentTransactions_Amount')
  ALTER TABLE dbo.PaymentTransactions WITH CHECK ADD CONSTRAINT CK_PaymentTransactions_Amount CHECK(Amount>=0);
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Coupons_Usage')
  ALTER TABLE dbo.Coupons WITH CHECK ADD CONSTRAINT CK_Coupons_Usage CHECK(UsedCount>=0 AND (UsageLimit IS NULL OR UsageLimit>=0) AND (PerUserLimit IS NULL OR PerUserLimit>=0));
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.PaymentTransactions') AND name='UX_PaymentTransactions_Provider_Reference')
  CREATE UNIQUE INDEX UX_PaymentTransactions_Provider_Reference ON dbo.PaymentTransactions(Provider,ProviderTxnRef) WHERE ProviderTxnRef IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Wallets_Balance')
  ALTER TABLE dbo.ShoeGroupWallets WITH CHECK ADD CONSTRAINT CK_Wallets_Balance CHECK(Balance>=0);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Returns') AND name='IX_Returns_Order_Status')
  CREATE INDEX IX_Returns_Order_Status ON dbo.Returns(OrderID,Status) INCLUDE(RefundAmount,RefundedAt);
GO
-- Legacy procedure is not used by the HTTP API. Keep its signature for existing
-- callers, but reject invalid quantities and use a locked server price snapshot.
CREATE OR ALTER PROCEDURE dbo.sp_ProcessOrderAtomic
  @UserID int, @ProductVariantID int, @Quantity int, @UnitPrice decimal(18,2),
  @ShippingAddress nvarchar(500), @CustomerName nvarchar(100),
  @CustomerPhone varchar(20), @PaymentMethod nvarchar(100), @IsOrderSuccess bit OUTPUT
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON; SET @IsOrderSuccess=0;
  IF @Quantity IS NULL OR @Quantity<=0 OR @Quantity>1000000 RETURN;
  BEGIN TRY
    BEGIN TRANSACTION;
    DECLARE @pid int, @name nvarchar(255), @size nvarchar(10), @color nvarchar(50), @price decimal(18,2);
    SELECT @pid=p.ProductID,@name=p.ProductName,@size=v.Size,@color=v.ColorName,
      @price=CASE WHEN ISNULL(p.SalePrice,0)>0 THEN p.SalePrice ELSE p.BasePrice END
    FROM dbo.Products p JOIN dbo.ProductVariants v WITH(UPDLOCK,HOLDLOCK) ON p.ProductID=v.ProductID
    WHERE v.ProductVariantID=@ProductVariantID AND ISNULL(p.IsActive,1)=1 AND ISNULL(v.IsActive,1)=1;
    IF @pid IS NULL OR @price IS NULL OR @price<0 THROW 50001,'Invalid product/variant/price',1;
    UPDATE dbo.ProductVariants SET StockQuantity=StockQuantity-@Quantity,Version=ISNULL(Version,0)+1
      WHERE ProductVariantID=@ProductVariantID AND StockQuantity>=@Quantity;
    IF @@ROWCOUNT<>1 THROW 50002,'Insufficient stock',1;
    INSERT dbo.Orders(UserID,TotalAmount,Status,ShippingAddress,CustomerName,CustomerPhone,PaymentMethod,PaymentStatus,AutoCancelDeadline,PaymentDueAt)
      VALUES(@UserID,@Quantity*@price,N'Chờ xác nhận',@ShippingAddress,@CustomerName,@CustomerPhone,@PaymentMethod,N'Chưa thanh toán',DATEADD(day,7,GETDATE()),
        CASE WHEN @PaymentMethod LIKE N'%chuyển khoản%' OR @PaymentMethod LIKE '%BANK%' THEN DATEADD(hour,24,GETDATE()) ELSE NULL END);
    DECLARE @oid int=SCOPE_IDENTITY();
    INSERT dbo.OrderDetails(OrderID,ProductID,ProductVariantID,Quantity,UnitPrice,ProductNameSnapshot,Size,Color)
      VALUES(@oid,@pid,@ProductVariantID,@Quantity,@price,@name,@size,@color);
    COMMIT; SET @IsOrderSuccess=1;
  END TRY
  BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK;
    SET @IsOrderSuccess=0;
  END CATCH
END;
