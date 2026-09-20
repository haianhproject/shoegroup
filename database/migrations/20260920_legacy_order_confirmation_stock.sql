/* Keep the legacy order procedure compatible without reserving inventory.
   The pending order is validated here and stock is deducted by the same
   confirmation transaction used by the management API. */
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
    DECLARE @pid int, @name nvarchar(255), @size nvarchar(10), @color nvarchar(50),
      @price decimal(18,2), @stock int;
    SELECT @pid=p.ProductID,@name=p.ProductName,@size=v.Size,@color=v.ColorName,
      @price=CASE WHEN ISNULL(p.SalePrice,0)>0 THEN p.SalePrice ELSE p.BasePrice END,
      @stock=ISNULL(v.StockQuantity,0)
    FROM dbo.Products p
    JOIN dbo.ProductVariants v WITH(UPDLOCK,HOLDLOCK) ON p.ProductID=v.ProductID
    WHERE v.ProductVariantID=@ProductVariantID
      AND ISNULL(p.IsActive,1)=1 AND ISNULL(v.IsActive,1)=1;
    IF @pid IS NULL OR @price IS NULL OR @price<0 THROW 50001,'Invalid product/variant/price',1;
    IF ISNULL(@stock,0)<@Quantity THROW 50002,'Insufficient stock',1;
    INSERT dbo.Orders(UserID,TotalAmount,Status,ShippingAddress,CustomerName,CustomerPhone,PaymentMethod,PaymentStatus,AutoCancelDeadline,PaymentDueAt)
      VALUES(@UserID,@Quantity*@price,N'Chờ xác nhận',@ShippingAddress,@CustomerName,@CustomerPhone,@PaymentMethod,N'Chưa thanh toán',DATEADD(day,7,GETDATE()),NULL);
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
