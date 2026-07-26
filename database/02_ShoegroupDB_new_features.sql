/* =======================================================================
   ShoeGroup - 02_ShoegroupDB_new_features.sql
   Script CHI THEM BANG MOI + THEM COT. KHONG tao lai DB, KHONG xoa du lieu.
   Chay duoc nhieu lan, khong bao loi (idempotent).

   YEU CAU: chay script 01_ShoegroupDB_optimize_migration.sql TRUOC script nay.
   NHO BACKUP DB TRUOC KHI CHAY.

   ---------------------------------------------------------------------
   26 BANG DA CO SAN TRONG DB - KHONG TAO LAI, CHI DUNG LAI:
     Brands, Categories, Collections, Colors, Coupons, Cushionings,
     Materials, Notifications, OrderDetails, OrderStatusHistory, Orders,
     PaymentMethods, PostOffices, ProductImages, ProductVariants, Products,
     ReturnDetails, Returns, Roles, ShippingMethods, Sizes, Soles,
     UserAddresses, UserSessions, Users, VariantDiscounts

   12 BANG MOI SE TAO TRONG SCRIPT NAY:
     Dinh Doan Hung (nhanh profile) : Reviews, ReviewImages, Wishlists, ProductQuestions
     Vu Tien Son    (nhanh checkout): Carts, CartItems, PaymentTransactions
     Le Minh Hieu   (nhanh shop)    : SearchLogs, SizeCharts, StockAlerts
     Bui Hai Anh    (nhanh admin)   : MemberTiers, PointTransactions
   ======================================================================= */

USE [ShoegroupDB];
GO
SET NOCOUNT ON;
GO
PRINT '=== BAT DAU THEM BANG MOI ===';
GO

/* =========================================================
   PHAN 1 - DINH DOAN HUNG (nhanh profile)
   ========================================================= */

/* 1.1 Reviews - danh gia san pham.
   Bang Products, Users, OrderDetails DA CO SAN, chi tham chieu toi. */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reviews')
BEGIN
    CREATE TABLE [dbo].[Reviews](
        [ReviewID]      INT IDENTITY(1,1) NOT NULL,
        [ProductID]     INT           NOT NULL,
        [UserID]        INT           NOT NULL,
        [OrderDetailID] INT           NULL,          -- chung minh da mua
        [Rating]        TINYINT       NOT NULL,      -- 1..5 sao
        [Title]         NVARCHAR(200) NULL,
        [Content]       NVARCHAR(2000) NULL,
        [SizeFeedback]  NVARCHAR(20)  NULL,          -- DUNG / CHAT / RONG
        [Status]        NVARCHAR(20)  NOT NULL CONSTRAINT DF_Reviews_Status DEFAULT (N'ChoDuyet'),
        [HelpfulCount]  INT           NOT NULL CONSTRAINT DF_Reviews_Helpful DEFAULT (0),
        [CreatedAt]     DATETIME      NOT NULL CONSTRAINT DF_Reviews_CreatedAt DEFAULT (GETDATE()),
        [UpdatedAt]     DATETIME      NULL,
        CONSTRAINT PK_Reviews PRIMARY KEY CLUSTERED ([ReviewID] ASC),
        CONSTRAINT FK_Reviews_Products     FOREIGN KEY ([ProductID])     REFERENCES [dbo].[Products]([ProductID]),
        CONSTRAINT FK_Reviews_Users        FOREIGN KEY ([UserID])        REFERENCES [dbo].[Users]([UserID]),
        CONSTRAINT FK_Reviews_OrderDetails FOREIGN KEY ([OrderDetailID]) REFERENCES [dbo].[OrderDetails]([OrderDetailID]),
        CONSTRAINT CK_Reviews_Rating       CHECK ([Rating] BETWEEN 1 AND 5),
        CONSTRAINT CK_Reviews_Status       CHECK ([Status] IN (N'ChoDuyet', N'DaDuyet', N'An')),
        CONSTRAINT CK_Reviews_SizeFeedback CHECK ([SizeFeedback] IS NULL OR [SizeFeedback] IN (N'DUNG', N'CHAT', N'RONG')),
        -- moi nguoi chi danh gia mot lan cho mot san pham
        CONSTRAINT UQ_Reviews_User_Product UNIQUE ([UserID], [ProductID])
    );
    PRINT 'Da tao bang Reviews';
END
ELSE PRINT 'Bang Reviews da ton tai - bo qua';
GO

IF EXISTS (SELECT 1 FROM sys.tables WHERE name='Reviews')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Reviews_Product_Status')
        CREATE INDEX IX_Reviews_Product_Status ON [dbo].[Reviews]([ProductID], [Status]) INCLUDE ([Rating]);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Reviews_User')
        CREATE INDEX IX_Reviews_User ON [dbo].[Reviews]([UserID]);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Reviews_Status_CreatedAt')
        CREATE INDEX IX_Reviews_Status_CreatedAt ON [dbo].[Reviews]([Status], [CreatedAt] DESC);
END
GO

/* 1.2 ReviewImages - anh that khach chup kem danh gia */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ReviewImages')
BEGIN
    CREATE TABLE [dbo].[ReviewImages](
        [ReviewImageID] INT IDENTITY(1,1) NOT NULL,
        [ReviewID]      INT NOT NULL,
        [ImageURL]      VARCHAR(MAX) NOT NULL,
        [SortOrder]     INT NOT NULL CONSTRAINT DF_ReviewImages_Sort DEFAULT (0),
        CONSTRAINT PK_ReviewImages PRIMARY KEY CLUSTERED ([ReviewImageID] ASC),
        -- xoa danh gia thi anh di theo
        CONSTRAINT FK_ReviewImages_Reviews FOREIGN KEY ([ReviewID])
            REFERENCES [dbo].[Reviews]([ReviewID]) ON DELETE CASCADE
    );
    CREATE INDEX IX_ReviewImages_Review ON [dbo].[ReviewImages]([ReviewID]);
    PRINT 'Da tao bang ReviewImages';
END
ELSE PRINT 'Bang ReviewImages da ton tai - bo qua';
GO

/* 1.3 Wishlists - san pham yeu thich */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Wishlists')
BEGIN
    CREATE TABLE [dbo].[Wishlists](
        [WishlistID]   INT IDENTITY(1,1) NOT NULL,
        [UserID]       INT NOT NULL,
        [ProductID]    INT NOT NULL,
        [NotifyOnSale] BIT NOT NULL CONSTRAINT DF_Wishlists_Notify DEFAULT (1),
        [CreatedAt]    DATETIME NOT NULL CONSTRAINT DF_Wishlists_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT PK_Wishlists PRIMARY KEY CLUSTERED ([WishlistID] ASC),
        CONSTRAINT FK_Wishlists_Users    FOREIGN KEY ([UserID])    REFERENCES [dbo].[Users]([UserID]) ON DELETE CASCADE,
        CONSTRAINT FK_Wishlists_Products FOREIGN KEY ([ProductID]) REFERENCES [dbo].[Products]([ProductID]),
        CONSTRAINT UQ_Wishlists_User_Product UNIQUE ([UserID], [ProductID])
    );
    CREATE INDEX IX_Wishlists_Product ON [dbo].[Wishlists]([ProductID]);
    PRINT 'Da tao bang Wishlists';
END
ELSE PRINT 'Bang Wishlists da ton tai - bo qua';
GO

/* 1.4 ProductQuestions - hoi dap duoi san pham */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProductQuestions')
BEGIN
    CREATE TABLE [dbo].[ProductQuestions](
        [QuestionID]       INT IDENTITY(1,1) NOT NULL,
        [ProductID]        INT NOT NULL,
        [UserID]           INT NULL,              -- NULL = khach chua dang nhap
        [AskerName]        NVARCHAR(100) NULL,
        [Content]          NVARCHAR(1000) NOT NULL,
        [AnswerContent]    NVARCHAR(2000) NULL,
        [AnsweredByUserID] INT NULL,
        [AnsweredAt]       DATETIME NULL,
        [Status]           NVARCHAR(20) NOT NULL CONSTRAINT DF_PQ_Status DEFAULT (N'ChoTraLoi'),
        [CreatedAt]        DATETIME NOT NULL CONSTRAINT DF_PQ_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT PK_ProductQuestions PRIMARY KEY CLUSTERED ([QuestionID] ASC),
        CONSTRAINT FK_PQ_Products FOREIGN KEY ([ProductID]) REFERENCES [dbo].[Products]([ProductID]),
        CONSTRAINT FK_PQ_Users    FOREIGN KEY ([UserID])    REFERENCES [dbo].[Users]([UserID]),
        CONSTRAINT FK_PQ_Answerer FOREIGN KEY ([AnsweredByUserID]) REFERENCES [dbo].[Users]([UserID]),
        CONSTRAINT CK_PQ_Status   CHECK ([Status] IN (N'ChoTraLoi', N'DaTraLoi', N'An'))
    );
    CREATE INDEX IX_PQ_Product_Status ON [dbo].[ProductQuestions]([ProductID], [Status]);
    CREATE INDEX IX_PQ_Status ON [dbo].[ProductQuestions]([Status], [CreatedAt] DESC);
    PRINT 'Da tao bang ProductQuestions';
END
ELSE PRINT 'Bang ProductQuestions da ton tai - bo qua';
GO

/* =========================================================
   PHAN 2 - VU TIEN SON (nhanh checkout)
   ========================================================= */

/* 2.1 Carts - gio hang luu theo tai khoan (moi user mot gio) */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Carts')
BEGIN
    CREATE TABLE [dbo].[Carts](
        [CartID]    INT IDENTITY(1,1) NOT NULL,
        [UserID]    INT NOT NULL,
        [CreatedAt] DATETIME NOT NULL CONSTRAINT DF_Carts_CreatedAt DEFAULT (GETDATE()),
        [UpdatedAt] DATETIME NOT NULL CONSTRAINT DF_Carts_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT PK_Carts PRIMARY KEY CLUSTERED ([CartID] ASC),
        CONSTRAINT FK_Carts_Users FOREIGN KEY ([UserID]) REFERENCES [dbo].[Users]([UserID]) ON DELETE CASCADE,
        CONSTRAINT UQ_Carts_User UNIQUE ([UserID])
    );
    PRINT 'Da tao bang Carts';
END
ELSE PRINT 'Bang Carts da ton tai - bo qua';
GO

/* 2.2 CartItems - tham chieu ProductVariants (DA CO SAN) de biet dung size/mau */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CartItems')
BEGIN
    CREATE TABLE [dbo].[CartItems](
        [CartItemID]       INT IDENTITY(1,1) NOT NULL,
        [CartID]           INT NOT NULL,
        [ProductVariantID] INT NOT NULL,
        [Quantity]         INT NOT NULL CONSTRAINT DF_CartItems_Qty DEFAULT (1),
        [AddedAt]          DATETIME NOT NULL CONSTRAINT DF_CartItems_AddedAt DEFAULT (GETDATE()),
        CONSTRAINT PK_CartItems PRIMARY KEY CLUSTERED ([CartItemID] ASC),
        CONSTRAINT FK_CartItems_Carts FOREIGN KEY ([CartID])
            REFERENCES [dbo].[Carts]([CartID]) ON DELETE CASCADE,
        CONSTRAINT FK_CartItems_Variants FOREIGN KEY ([ProductVariantID])
            REFERENCES [dbo].[ProductVariants]([ProductVariantID]),
        CONSTRAINT CK_CartItems_Qty CHECK ([Quantity] > 0),
        -- them lai cung mot bien the thi cong don, khong tao dong moi
        CONSTRAINT UQ_CartItems_Cart_Variant UNIQUE ([CartID], [ProductVariantID])
    );
    CREATE INDEX IX_CartItems_Variant ON [dbo].[CartItems]([ProductVariantID]);
    PRINT 'Da tao bang CartItems';
END
ELSE PRINT 'Bang CartItems da ton tai - bo qua';
GO

/* 2.3 PaymentTransactions - luu MOI lan giao dich VNPay/MoMo.
   Bang PaymentMethods DA CO SAN nhung chi la danh muc, khong luu giao dich. */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PaymentTransactions')
BEGIN
    CREATE TABLE [dbo].[PaymentTransactions](
        [TransactionID]  INT IDENTITY(1,1) NOT NULL,
        [OrderID]        INT NOT NULL,
        [Provider]       NVARCHAR(30) NOT NULL,      -- VNPAY / MOMO / COD
        [ProviderTxnRef] VARCHAR(100) NULL,          -- ma giao dich ben cong thanh toan
        [Amount]         DECIMAL(18,2) NOT NULL,
        [Status]         NVARCHAR(20) NOT NULL CONSTRAINT DF_PT_Status DEFAULT (N'PENDING'),
        [SignatureValid] BIT NULL,                   -- ket qua kiem tra chu ky callback
        [RawResponse]    NVARCHAR(MAX) NULL,         -- luu nguyen van de doi chieu khi tranh chap
        [CreatedAt]      DATETIME NOT NULL CONSTRAINT DF_PT_CreatedAt DEFAULT (GETDATE()),
        [CompletedAt]    DATETIME NULL,
        CONSTRAINT PK_PaymentTransactions PRIMARY KEY CLUSTERED ([TransactionID] ASC),
        CONSTRAINT FK_PT_Orders FOREIGN KEY ([OrderID]) REFERENCES [dbo].[Orders]([OrderID]),
        CONSTRAINT CK_PT_Status CHECK ([Status] IN (N'PENDING', N'SUCCESS', N'FAILED', N'REFUNDED', N'CANCELLED'))
    );
    CREATE INDEX IX_PT_Order ON [dbo].[PaymentTransactions]([OrderID]);
    CREATE INDEX IX_PT_Status_CreatedAt ON [dbo].[PaymentTransactions]([Status], [CreatedAt] DESC);
    -- chong ghi nhan trung mot giao dich khi cong thanh toan goi lai nhieu lan
    CREATE UNIQUE INDEX UQ_PT_ProviderTxnRef ON [dbo].[PaymentTransactions]([Provider], [ProviderTxnRef])
        WHERE [ProviderTxnRef] IS NOT NULL;
    PRINT 'Da tao bang PaymentTransactions';
END
ELSE PRINT 'Bang PaymentTransactions da ton tai - bo qua';
GO

/* =========================================================
   PHAN 3 - LE MINH HIEU (nhanh shop)
   ========================================================= */

/* 3.1 SearchLogs - luu tu khoa khach tim. Du lieu de biet nen nhap hang gi. */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SearchLogs')
BEGIN
    CREATE TABLE [dbo].[SearchLogs](
        [SearchLogID]        INT IDENTITY(1,1) NOT NULL,
        [Keyword]            NVARCHAR(200) NOT NULL,
        [NormalizedKeyword]  NVARCHAR(200) NULL,   -- ban khong dau, chu thuong
        [ResultCount]        INT NOT NULL CONSTRAINT DF_SL_ResultCount DEFAULT (0),
        [UserID]             INT NULL,
        [CreatedAt]          DATETIME NOT NULL CONSTRAINT DF_SL_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT PK_SearchLogs PRIMARY KEY CLUSTERED ([SearchLogID] ASC),
        CONSTRAINT FK_SearchLogs_Users FOREIGN KEY ([UserID]) REFERENCES [dbo].[Users]([UserID])
    );
    CREATE INDEX IX_SearchLogs_Normalized ON [dbo].[SearchLogs]([NormalizedKeyword]);
    CREATE INDEX IX_SearchLogs_CreatedAt ON [dbo].[SearchLogs]([CreatedAt] DESC);
    -- tu khoa tim ra 0 ket qua = hang khach muon ma shop khong co
    CREATE INDEX IX_SearchLogs_ZeroResult ON [dbo].[SearchLogs]([ResultCount], [CreatedAt] DESC);
    CREATE INDEX IX_SearchLogs_User ON [dbo].[SearchLogs]([UserID]);
    PRINT 'Da tao bang SearchLogs';
END
ELSE PRINT 'Bang SearchLogs da ton tai - bo qua';
GO

/* 3.2 SizeCharts - bang size theo tung hang.
   Bang Brands va Sizes DA CO SAN, chi tham chieu toi. */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SizeCharts')
BEGIN
    CREATE TABLE [dbo].[SizeCharts](
        [SizeChartID]  INT IDENTITY(1,1) NOT NULL,
        [BrandID]      INT NOT NULL,
        [SizeID]       INT NOT NULL,
        [FootLengthCm] DECIMAL(5,1) NULL,    -- chieu dai ban chan tuong ung
        [UsSize]       NVARCHAR(10) NULL,
        [EuSize]       NVARCHAR(10) NULL,
        [Note]         NVARCHAR(300) NULL,   -- vd: hang nay thuong nho hon nua size
        CONSTRAINT PK_SizeCharts PRIMARY KEY CLUSTERED ([SizeChartID] ASC),
        CONSTRAINT FK_SizeCharts_Brands FOREIGN KEY ([BrandID]) REFERENCES [dbo].[Brands]([BrandID]),
        CONSTRAINT FK_SizeCharts_Sizes  FOREIGN KEY ([SizeID])  REFERENCES [dbo].[Sizes]([SizeID]),
        CONSTRAINT UQ_SizeCharts_Brand_Size UNIQUE ([BrandID], [SizeID])
    );
    CREATE INDEX IX_SizeCharts_Size ON [dbo].[SizeCharts]([SizeID]);
    PRINT 'Da tao bang SizeCharts';
END
ELSE PRINT 'Bang SizeCharts da ton tai - bo qua';
GO

/* 3.3 StockAlerts - khach dang ky nhan thong bao khi size het hang co lai */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'StockAlerts')
BEGIN
    CREATE TABLE [dbo].[StockAlerts](
        [StockAlertID]     INT IDENTITY(1,1) NOT NULL,
        [ProductVariantID] INT NOT NULL,
        [Email]            VARCHAR(100) NOT NULL,
        [UserID]           INT NULL,
        [IsNotified]       BIT NOT NULL CONSTRAINT DF_SA_IsNotified DEFAULT (0),
        [CreatedAt]        DATETIME NOT NULL CONSTRAINT DF_SA_CreatedAt DEFAULT (GETDATE()),
        [NotifiedAt]       DATETIME NULL,
        CONSTRAINT PK_StockAlerts PRIMARY KEY CLUSTERED ([StockAlertID] ASC),
        CONSTRAINT FK_SA_Variants FOREIGN KEY ([ProductVariantID])
            REFERENCES [dbo].[ProductVariants]([ProductVariantID]) ON DELETE CASCADE,
        CONSTRAINT FK_SA_Users FOREIGN KEY ([UserID]) REFERENCES [dbo].[Users]([UserID]),
        -- mot email chi dang ky mot lan cho mot bien the
        CONSTRAINT UQ_SA_Variant_Email UNIQUE ([ProductVariantID], [Email])
    );
    CREATE INDEX IX_SA_Pending ON [dbo].[StockAlerts]([IsNotified], [ProductVariantID]);
    CREATE INDEX IX_SA_User ON [dbo].[StockAlerts]([UserID]);
    PRINT 'Da tao bang StockAlerts';
END
ELSE PRINT 'Bang StockAlerts da ton tai - bo qua';
GO

/* =========================================================
   PHAN 4 - BUI HAI ANH (nhanh admin)
   ========================================================= */

/* 4.1 MemberTiers - hang thanh vien */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MemberTiers')
BEGIN
    CREATE TABLE [dbo].[MemberTiers](
        [TierID]          INT IDENTITY(1,1) NOT NULL,
        [TierCode]        VARCHAR(20) NOT NULL,
        [TierName]        NVARCHAR(50) NOT NULL,
        [MinSpend]        DECIMAL(18,2) NOT NULL CONSTRAINT DF_MT_MinSpend DEFAULT (0),
        [DiscountPercent] INT NOT NULL CONSTRAINT DF_MT_Discount DEFAULT (0),
        [PointRate]       DECIMAL(9,4) NOT NULL CONSTRAINT DF_MT_PointRate DEFAULT (1),
        [SortOrder]       INT NOT NULL CONSTRAINT DF_MT_Sort DEFAULT (0),
        [IsActive]        BIT NOT NULL CONSTRAINT DF_MT_IsActive DEFAULT (1),
        CONSTRAINT PK_MemberTiers PRIMARY KEY CLUSTERED ([TierID] ASC),
        CONSTRAINT UQ_MemberTiers_Code UNIQUE ([TierCode]),
        CONSTRAINT CK_MT_Discount CHECK ([DiscountPercent] BETWEEN 0 AND 100)
    );
    PRINT 'Da tao bang MemberTiers';
END
ELSE PRINT 'Bang MemberTiers da ton tai - bo qua';
GO

-- Nap 3 hang mac dinh (chi nap khi chua co)
IF NOT EXISTS (SELECT 1 FROM [dbo].[MemberTiers])
BEGIN
    INSERT INTO [dbo].[MemberTiers] ([TierCode],[TierName],[MinSpend],[DiscountPercent],[PointRate],[SortOrder])
    VALUES ('BRONZE', N'Dong',       0,        0, 1.0, 1),
           ('SILVER', N'Bac',  5000000,        3, 1.2, 2),
           ('GOLD',   N'Vang', 20000000,       5, 1.5, 3);
    PRINT 'Da nap 3 hang thanh vien mac dinh';
END
GO

/* 4.2 PointTransactions - lich su cong/tru diem.
   Diem AM khi khach tra hang, nen cot Points cho phep so am. */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PointTransactions')
BEGIN
    CREATE TABLE [dbo].[PointTransactions](
        [PointTransactionID] INT IDENTITY(1,1) NOT NULL,
        [UserID]             INT NOT NULL,
        [OrderID]            INT NULL,
        [Points]             INT NOT NULL,          -- duong = cong, am = tru
        [Reason]             NVARCHAR(200) NULL,
        [CreatedAt]          DATETIME NOT NULL CONSTRAINT DF_PTr_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT PK_PointTransactions PRIMARY KEY CLUSTERED ([PointTransactionID] ASC),
        CONSTRAINT FK_PTr_Users  FOREIGN KEY ([UserID])  REFERENCES [dbo].[Users]([UserID]) ON DELETE CASCADE,
        CONSTRAINT FK_PTr_Orders FOREIGN KEY ([OrderID]) REFERENCES [dbo].[Orders]([OrderID])
    );
    CREATE INDEX IX_PTr_User_CreatedAt ON [dbo].[PointTransactions]([UserID], [CreatedAt] DESC);
    CREATE INDEX IX_PTr_Order ON [dbo].[PointTransactions]([OrderID]);
    -- mot don chi duoc cong diem mot lan
    CREATE UNIQUE INDEX UQ_PTr_Order_Earn ON [dbo].[PointTransactions]([OrderID])
        WHERE [OrderID] IS NOT NULL AND [Points] > 0;
    PRINT 'Da tao bang PointTransactions';
END
ELSE PRINT 'Bang PointTransactions da ton tai - bo qua';
GO

/* =========================================================
   PHAN 5 - THEM COT VAO BANG DA CO (khong xoa du lieu cu)
   ========================================================= */

/* 5.1 Users: xac thuc email + diem + hang thanh vien.
   LUU Y: cac cot PasswordAlgo, FailedLoginCount, LockoutUntil DA THEM
   o script 01, khong them lai o day. */
IF COL_LENGTH('dbo.Users','EmailVerified') IS NULL
    ALTER TABLE [dbo].[Users] ADD [EmailVerified] BIT NOT NULL CONSTRAINT DF_Users_EmailVerified DEFAULT (0);
GO
IF COL_LENGTH('dbo.Users','EmailVerifyToken') IS NULL
    ALTER TABLE [dbo].[Users] ADD [EmailVerifyToken] VARCHAR(255) NULL;
GO
IF COL_LENGTH('dbo.Users','EmailVerifyExpiry') IS NULL
    ALTER TABLE [dbo].[Users] ADD [EmailVerifyExpiry] DATETIME NULL;
GO
IF COL_LENGTH('dbo.Users','PointBalance') IS NULL
    ALTER TABLE [dbo].[Users] ADD [PointBalance] INT NOT NULL CONSTRAINT DF_Users_PointBalance DEFAULT (0);
GO
IF COL_LENGTH('dbo.Users','TierID') IS NULL
    ALTER TABLE [dbo].[Users] ADD [TierID] INT NULL;
GO
IF COL_LENGTH('dbo.Users','TierID') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_Users_MemberTiers')
    ALTER TABLE [dbo].[Users] ADD CONSTRAINT FK_Users_MemberTiers
        FOREIGN KEY ([TierID]) REFERENCES [dbo].[MemberTiers]([TierID]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Users_TierID')
    CREATE INDEX IX_Users_TierID ON [dbo].[Users]([TierID]);
GO

/* 5.2 Coupons: gioi han moi khach mot lan.
   LUU Y: cac cot StartDate, ExpiryDate, UsageLimit, UsedCount, MinOrderAmount,
   MaxDiscountAmount, DiscountType, DiscountValue DA CO SAN trong bang Coupons.
   Chi thieu duy nhat gioi han theo tung khach. */
IF COL_LENGTH('dbo.Coupons','PerUserLimit') IS NULL
    ALTER TABLE [dbo].[Coupons] ADD [PerUserLimit] INT NULL;
GO
IF COL_LENGTH('dbo.Coupons','IsFlashSale') IS NULL
    ALTER TABLE [dbo].[Coupons] ADD [IsFlashSale] BIT NOT NULL CONSTRAINT DF_Coupons_IsFlashSale DEFAULT (0);
GO

/* 5.3 UserSessions DA CO SAN day du cot (BrowserFingerprint, UserAgent,
   DeviceName, IPAddress, ExpiresAt, IsActive) - KHONG can them gi.
   Do Viet chi can viet API doc/ghi bang nay. */
GO

/* 5.4 Products: dem so luot yeu thich de bao cao "nhieu nguoi thich ma it ban".
   Cot ViewCount DA CO SAN. */
IF COL_LENGTH('dbo.Products','WishlistCount') IS NULL
    ALTER TABLE [dbo].[Products] ADD [WishlistCount] INT NOT NULL CONSTRAINT DF_Products_WishlistCount DEFAULT (0);
GO

/* =========================================================
   PHAN 6 - VIEW HO TRO SAN
   ========================================================= */

/* 6.1 Diem danh gia trung binh moi san pham - Le Minh Hieu dung cho muc S3 */
IF OBJECT_ID('dbo.vw_ProductRatings','V') IS NOT NULL DROP VIEW [dbo].[vw_ProductRatings];
GO
CREATE VIEW [dbo].[vw_ProductRatings]
AS
SELECT  p.[ProductID],
        COUNT(r.[ReviewID])                    AS ReviewCount,
        CAST(AVG(CAST(r.[Rating] AS DECIMAL(4,2))) AS DECIMAL(4,2)) AS AvgRating,
        SUM(CASE WHEN r.[SizeFeedback] = N'DUNG' THEN 1 ELSE 0 END) AS SizeTrueCount,
        SUM(CASE WHEN r.[SizeFeedback] = N'CHAT' THEN 1 ELSE 0 END) AS SizeTightCount,
        SUM(CASE WHEN r.[SizeFeedback] = N'RONG' THEN 1 ELSE 0 END) AS SizeLooseCount
FROM    [dbo].[Products] p
LEFT JOIN [dbo].[Reviews] r
        ON r.[ProductID] = p.[ProductID] AND r.[Status] = N'DaDuyet'
GROUP BY p.[ProductID];
GO

/* 6.2 Tu khoa khach tim nhieu nhat 30 ngay - Bui Hai Anh dung cho bao cao A7 */
IF OBJECT_ID('dbo.vw_TopSearchKeywords','V') IS NOT NULL DROP VIEW [dbo].[vw_TopSearchKeywords];
GO
CREATE VIEW [dbo].[vw_TopSearchKeywords]
AS
SELECT TOP 100
        [NormalizedKeyword],
        COUNT(*)          AS SearchCount,
        MIN([ResultCount]) AS MinResultCount,
        MAX([CreatedAt])   AS LastSearchedAt
FROM    [dbo].[SearchLogs]
WHERE   [CreatedAt] >= DATEADD(DAY, -30, GETDATE())
        AND [NormalizedKeyword] IS NOT NULL
GROUP BY [NormalizedKeyword]
ORDER BY COUNT(*) DESC;
GO

/* =========================================================
   PHAN 7 - CAP NHAT THONG KE VA BAO CAO KET QUA
   ========================================================= */
EXEC sp_updatestats;
GO

PRINT '';
PRINT '=== KET QUA ===';
GO
SELECT  t.name AS [Bang moi da tao],
        (SELECT COUNT(*) FROM sys.columns c WHERE c.object_id = t.object_id) AS [So cot],
        (SELECT COUNT(*) FROM sys.indexes i WHERE i.object_id = t.object_id AND i.type > 0) AS [So index]
FROM    sys.tables t
WHERE   t.name IN ('Reviews','ReviewImages','Wishlists','ProductQuestions',
                   'Carts','CartItems','PaymentTransactions',
                   'SearchLogs','SizeCharts','StockAlerts',
                   'MemberTiers','PointTransactions')
ORDER BY t.name;
GO
SELECT COUNT(*) AS [Tong so bang trong DB] FROM sys.tables;
GO
PRINT 'HOAN TAT. Neu thay 12 bang o tren la thanh cong.';
GO
