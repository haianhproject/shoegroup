-- PerUserLimit already exists in Coupons; persist redemption within checkout.
-- Historical orders have no coupon reference and cannot safely be backfilled.
IF OBJECT_ID(N'dbo.CouponRedemptions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CouponRedemptions (
    RedemptionID int IDENTITY PRIMARY KEY,
    CouponID int NOT NULL REFERENCES dbo.Coupons(CouponID),
    UserID int NULL REFERENCES dbo.Users(UserID),
    OrderID int NOT NULL REFERENCES dbo.Orders(OrderID),
    DiscountAmount decimal(18,2) NOT NULL CHECK (DiscountAmount>=0),
    CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_CouponRedemptions_Order UNIQUE(OrderID)
  );
  CREATE INDEX IX_CouponRedemptions_Coupon_User ON dbo.CouponRedemptions(CouponID,UserID);
END;
IF COL_LENGTH('dbo.CouponRedemptions','DiscountType') IS NULL
  ALTER TABLE dbo.CouponRedemptions ADD DiscountType nvarchar(30) NULL;
