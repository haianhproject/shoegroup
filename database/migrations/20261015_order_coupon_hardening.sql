-- Muc dich: Toi uu voucher, lien ket nhan vien va bao ve lich su/thanh toan.
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;
  IF NOT EXISTS(SELECT 1 FROM dbo.AppMigrations WHERE MigrationKey='20261015_ORDER_COUPON_HARDENING')
  BEGIN
    IF COL_LENGTH('dbo.Coupons','DiscountPercent') IS NOT NULL
    BEGIN
      EXEC(N'UPDATE dbo.Coupons SET DiscountValue=DiscountPercent WHERE DiscountValue=0 AND DiscountPercent>0 AND DiscountType IN (N''Phần trăm'',N''Theo phần trăm'',N''percent'');');
      DECLARE @drop nvarchar(max)=N'';
      SELECT @drop=@drop+N'ALTER TABLE dbo.Coupons DROP CONSTRAINT '+QUOTENAME(name)+N';'
      FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.Coupons') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID('dbo.Coupons'),'DiscountPercent','ColumnId');
      EXEC sys.sp_executesql @drop;
      ALTER TABLE dbo.Coupons DROP COLUMN DiscountPercent;
    END;
    -- Legacy 0 meant unlimited. NULL now means unlimited; new 0 means no vouchers left.
    ALTER TABLE dbo.Coupons ALTER COLUMN UsageLimit int NULL;
    UPDATE dbo.Coupons SET UsageLimit=NULL WHERE UsageLimit=0;
    ALTER TABLE dbo.Coupons WITH CHECK ADD CONSTRAINT CK_Coupons_Value CHECK
      (DiscountValue>=0 AND MinOrderAmount>=0 AND MaxDiscountAmount>=0 AND
       ((DiscountType IN (N'Phần trăm',N'percent') AND DiscountValue>0 AND DiscountValue<=100) OR
        (DiscountType IN (N'Cố định',N'fixed') AND DiscountValue>0) OR DiscountType=N'freeship'));
    ALTER TABLE dbo.Coupons WITH CHECK ADD CONSTRAINT CK_Coupons_Dates CHECK(StartDate IS NULL OR ExpiryDate>=StartDate);
    ALTER TABLE dbo.Coupons WITH CHECK ADD CONSTRAINT CK_Coupons_UsageCap CHECK(UsageLimit IS NULL OR (UsageLimit>=0 AND ISNULL(UsedCount,0)<=UsageLimit));
    ALTER TABLE dbo.Orders ADD HandledByUserID int NULL,CashGiven decimal(18,0) NULL;
    EXEC(N'ALTER TABLE dbo.Orders WITH CHECK ADD CONSTRAINT FK_Orders_HandledByUser FOREIGN KEY(HandledByUserID) REFERENCES dbo.Users(UserID);');
    EXEC(N'ALTER TABLE dbo.Orders WITH CHECK ADD CONSTRAINT CK_Orders_CashGiven CHECK(CashGiven IS NULL OR (CashGiven>=TotalAmount AND PaymentMethod=N''Tiền mặt''));');
    ALTER TABLE dbo.Orders WITH CHECK ADD CONSTRAINT CK_Orders_Status CHECK(Status IN
      (N'Chờ xác nhận',N'Đã xác nhận',N'Đang vận chuyển',N'Giao hàng thất bại',N'Về kho',N'Đã giao hàng thành công',N'Đã nhận hàng',N'Đã hủy',N'Yêu cầu trả hàng',N'Đã hoàn tất trả hàng'));
    ALTER TABLE dbo.Orders WITH CHECK ADD CONSTRAINT CK_Orders_PaymentStatus CHECK(PaymentStatus IN
      (N'Chưa thanh toán',N'Chờ thanh toán',N'Đã thanh toán',N'Hoàn tiền',N'Chờ hoàn tiền',N'Đã hủy'));
    ALTER TABLE dbo.Orders WITH CHECK ADD CONSTRAINT CK_Orders_PaymentMethod CHECK(PaymentMethod IN
      (N'Tiền mặt',N'Chuyển khoản',N'Chuyển khoản ngân hàng',N'Thanh toán khi nhận hàng (COD)'));
    ALTER TABLE dbo.OrderStatusHistory WITH CHECK ADD CONSTRAINT FK_OrderStatusHistory_Users FOREIGN KEY(ChangedBy) REFERENCES dbo.Users(UserID);
    CREATE INDEX IX_OrderStatusHistory_OrderTime ON dbo.OrderStatusHistory(OrderID,ChangedAt,HistoryID);
    CREATE UNIQUE INDEX UX_CouponRedemptions_Order ON dbo.CouponRedemptions(OrderID);
    INSERT dbo.AppMigrations(MigrationKey,AppliedAt) VALUES('20261015_ORDER_COUPON_HARDENING',GETDATE());
  END;
  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
