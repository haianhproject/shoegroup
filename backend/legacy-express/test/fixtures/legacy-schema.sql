-- Muc dich: Schema goc cho kiem thu migration, khong co du lieu hay lenh thay database.
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Reviews](
	[ReviewID] [int] IDENTITY(1,1) NOT NULL,
	[ProductID] [int] NOT NULL,
	[UserID] [int] NOT NULL,
	[OrderDetailID] [int] NULL,
	[Rating] [tinyint] NOT NULL,
	[Title] [nvarchar](200) NULL,
	[Content] [nvarchar](2000) NULL,
	[SizeFeedback] [nvarchar](20) NULL,
	[Status] [nvarchar](20) NOT NULL,
	[HelpfulCount] [int] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[UpdatedAt] [datetime] NULL,
 CONSTRAINT [PK_Reviews] PRIMARY KEY CLUSTERED
(
	[ReviewID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Products](
	[ProductID] [int] IDENTITY(1,1) NOT NULL,
	[CategoryID] [int] NULL,
	[BrandID] [int] NULL,
	[ProductName] [nvarchar](255) NOT NULL,
	[BasePrice] [decimal](18, 0) NOT NULL,
	[IsActive] [bit] NULL,
	[ImageURL] [varchar](max) NULL,
	[Description] [nvarchar](max) NULL,
	[ImageGallery] [nvarchar](max) NULL,
	[CollectionID] [int] NULL,
	[ParentSKU] [varchar](50) NULL,
	[SalePrice] [decimal](18, 0) NULL,
	[IsFeatured] [bit] NULL,
	[ViewCount] [int] NULL,
	[CreatedAt] [datetime] NULL,
	[UpdatedAt] [datetime] NULL,
	[MaterialID] [int] NULL,
	[WishlistCount] [int] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[ProductID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
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
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SearchLogs](
	[SearchLogID] [int] IDENTITY(1,1) NOT NULL,
	[Keyword] [nvarchar](200) NOT NULL,
	[NormalizedKeyword] [nvarchar](200) NULL,
	[ResultCount] [int] NOT NULL,
	[UserID] [int] NULL,
	[CreatedAt] [datetime] NOT NULL,
 CONSTRAINT [PK_SearchLogs] PRIMARY KEY CLUSTERED
(
	[SearchLogID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
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
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[AppMigrations](
	[MigrationKey] [nvarchar](150) NOT NULL,
	[AppliedAt] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[MigrationKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[bak_Categories_20260804](
	[CategoryID] [int] IDENTITY(1,1) NOT NULL,
	[CategoryName] [nvarchar](100) NOT NULL,
	[IsActive] [bit] NULL,
	[Sport] [nvarchar](100) NULL
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[bak_OrderDetails_20260804](
	[OrderDetailID] [int] IDENTITY(1,1) NOT NULL,
	[OrderID] [int] NULL,
	[ProductID] [int] NULL,
	[Quantity] [int] NULL,
	[UnitPrice] [decimal](18, 2) NULL,
	[Size] [nvarchar](10) NULL,
	[Color] [nvarchar](50) NULL,
	[ProductVariantID] [int] NULL,
	[ProductNameSnapshot] [nvarchar](255) NULL,
	[SKUSnapshot] [varchar](60) NULL,
	[ColorHex] [varchar](20) NULL,
	[ImageURLSnapshot] [varchar](max) NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[bak_Orders_20260804](
	[OrderID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NULL,
	[TotalAmount] [decimal](18, 0) NOT NULL,
	[OrderDate] [datetime] NULL,
	[Status] [nvarchar](50) NULL,
	[ShippingAddress] [nvarchar](500) NULL,
	[CancelReason] [nvarchar](500) NULL,
	[CustomerName] [nvarchar](100) NULL,
	[CustomerPhone] [varchar](20) NULL,
	[PaymentMethod] [nvarchar](100) NULL,
	[ShippingFee] [decimal](18, 2) NULL,
	[DiscountAmount] [decimal](18, 2) NULL,
	[OrderNote] [nvarchar](500) NULL,
	[ShippingMethodID] [int] NULL,
	[PaymentMethodID] [int] NULL,
	[AddressID] [int] NULL,
	[DeliveryDistanceKm] [decimal](9, 2) NULL,
	[RecipientLatitude] [decimal](9, 6) NULL,
	[RecipientLongitude] [decimal](9, 6) NULL,
	[IsAddressVerified] [bit] NULL,
	[EstimatedDeliveryText] [nvarchar](50) NULL,
	[PaymentStatus] [nvarchar](30) NULL,
	[DeliveredDate] [datetime] NULL,
	[ReceivedConfirmedDate] [datetime] NULL,
	[RevenueEligibleDate] [datetime] NULL,
	[IsCountedAsRevenue] [bit] NULL,
	[AutoCancelDeadline] [datetime] NULL,
	[UpdatedAt] [datetime] NULL,
	[TrackingNumber] [varchar](60) NULL,
	[HandledBy] [nvarchar](50) NULL
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[bak_Products_SoleCushion_20260804](
	[ProductID] [int] IDENTITY(1,1) NOT NULL,
	[SoleID] [int] NULL,
	[CushioningID] [int] NULL
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[bak_ProductVariants_20260804](
	[ProductVariantID] [int] IDENTITY(1,1) NOT NULL,
	[ProductID] [int] NOT NULL,
	[Size] [nvarchar](10) NULL,
	[SizeStandard] [varchar](10) NULL,
	[ColorName] [nvarchar](50) NULL,
	[ColorHex] [varchar](20) NULL,
	[ChildSKU] [varchar](60) NULL,
	[StockQuantity] [int] NOT NULL,
	[PriceAdjustment] [decimal](18, 0) NULL,
	[IsActive] [bit] NULL,
	[ColorID] [int] NULL,
	[SizeID] [int] NULL,
	[Version] [int] NOT NULL
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Brands](
	[BrandID] [int] IDENTITY(1,1) NOT NULL,
	[BrandName] [nvarchar](100) NOT NULL,
	[IsActive] [bit] NULL,
	[LogoURL] [varchar](max) NULL,
	[SortOrder] [int] NULL,
PRIMARY KEY CLUSTERED
(
	[BrandID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[CartItems](
	[CartItemID] [int] IDENTITY(1,1) NOT NULL,
	[CartID] [int] NOT NULL,
	[ProductVariantID] [int] NOT NULL,
	[Quantity] [int] NOT NULL,
	[AddedAt] [datetime] NOT NULL,
 CONSTRAINT [PK_CartItems] PRIMARY KEY CLUSTERED
(
	[CartItemID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Carts](
	[CartID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[UpdatedAt] [datetime] NOT NULL,
 CONSTRAINT [PK_Carts] PRIMARY KEY CLUSTERED
(
	[CartID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Categories](
	[CategoryID] [int] IDENTITY(1,1) NOT NULL,
	[CategoryName] [nvarchar](100) NOT NULL,
	[IsActive] [bit] NULL,
	[Sport] [nvarchar](100) NULL,
PRIMARY KEY CLUSTERED
(
	[CategoryID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[CheckoutRequests](
	[UserID] [int] NOT NULL,
	[IdempotencyKey] [varchar](128) NOT NULL,
	[RequestHash] [char](64) NOT NULL,
	[OrderID] [int] NOT NULL,
	[ResponseJson] [nvarchar](max) NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_CheckoutRequests] PRIMARY KEY CLUSTERED
(
	[UserID] ASC,
	[IdempotencyKey] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Collections](
	[CollectionID] [int] IDENTITY(1,1) NOT NULL,
	[BrandID] [int] NULL,
	[CollectionName] [nvarchar](150) NOT NULL,
	[Slug] [varchar](150) NULL,
	[IsActive] [bit] NULL,
PRIMARY KEY CLUSTERED
(
	[CollectionID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Colors](
	[ColorID] [int] IDENTITY(1,1) NOT NULL,
	[ColorName] [nvarchar](50) NOT NULL,
	[ColorHex] [varchar](20) NULL,
	[IsActive] [bit] NOT NULL,
	[SortOrder] [int] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[ColorID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[CouponRedemptions](
	[RedemptionID] [int] IDENTITY(1,1) NOT NULL,
	[CouponID] [int] NOT NULL,
	[UserID] [int] NULL,
	[OrderID] [int] NOT NULL,
	[DiscountAmount] [decimal](18, 2) NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[DiscountType] [nvarchar](30) NULL,
PRIMARY KEY CLUSTERED
(
	[RedemptionID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Coupons](
	[CouponID] [int] IDENTITY(1,1) NOT NULL,
	[CouponCode] [varchar](50) NOT NULL,
	[DiscountPercent] [int] NOT NULL,
	[UsageLimit] [int] NOT NULL,
	[UsedCount] [int] NULL,
	[ExpiryDate] [datetime] NOT NULL,
	[IsActive] [bit] NULL,
	[Description] [nvarchar](500) NULL,
	[CouponName] [nvarchar](200) NULL,
	[DiscountType] [nvarchar](20) NOT NULL,
	[DiscountValue] [decimal](18, 2) NOT NULL,
	[MinOrderAmount] [decimal](18, 2) NOT NULL,
	[MaxDiscountAmount] [decimal](18, 2) NOT NULL,
	[StartDate] [datetime] NULL,
	[PerUserLimit] [int] NULL,
	[IsFlashSale] [bit] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[CouponID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Materials](
	[MaterialID] [int] IDENTITY(1,1) NOT NULL,
	[MaterialName] [nvarchar](100) NOT NULL,
	[IsActive] [bit] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[MaterialID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MemberTiers](
	[TierID] [int] IDENTITY(1,1) NOT NULL,
	[TierCode] [varchar](20) NOT NULL,
	[TierName] [nvarchar](50) NOT NULL,
	[MinSpend] [decimal](18, 2) NOT NULL,
	[DiscountPercent] [int] NOT NULL,
	[PointRate] [decimal](9, 4) NOT NULL,
	[SortOrder] [int] NOT NULL,
	[IsActive] [bit] NOT NULL,
 CONSTRAINT [PK_MemberTiers] PRIMARY KEY CLUSTERED
(
	[TierID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Notifications](
	[NotificationID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[Title] [nvarchar](255) NOT NULL,
	[Message] [nvarchar](max) NOT NULL,
	[Type] [varchar](50) NULL,
	[RelatedID] [int] NULL,
	[IsRead] [bit] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[NotificationID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[OrderDetails](
	[OrderDetailID] [int] IDENTITY(1,1) NOT NULL,
	[OrderID] [int] NULL,
	[ProductID] [int] NULL,
	[Quantity] [int] NULL,
	[UnitPrice] [decimal](18, 2) NULL,
	[Size] [nvarchar](10) NULL,
	[Color] [nvarchar](50) NULL,
	[ProductVariantID] [int] NULL,
	[ProductNameSnapshot] [nvarchar](255) NULL,
	[SKUSnapshot] [varchar](60) NULL,
	[ColorHex] [varchar](20) NULL,
	[ImageURLSnapshot] [varchar](max) NULL,
	[VariantDiscountID] [int] NULL,
PRIMARY KEY CLUSTERED
(
	[OrderDetailID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Orders](
	[OrderID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NULL,
	[TotalAmount] [decimal](18, 0) NOT NULL,
	[OrderDate] [datetime] NULL,
	[Status] [nvarchar](50) NULL,
	[ShippingAddress] [nvarchar](500) NULL,
	[CancelReason] [nvarchar](500) NULL,
	[CustomerName] [nvarchar](100) NULL,
	[CustomerPhone] [varchar](20) NULL,
	[PaymentMethod] [nvarchar](100) NULL,
	[ShippingFee] [decimal](18, 2) NULL,
	[DiscountAmount] [decimal](18, 2) NULL,
	[OrderNote] [nvarchar](500) NULL,
	[ShippingMethodID] [int] NULL,
	[PaymentMethodID] [int] NULL,
	[AddressID] [int] NULL,
	[DeliveryDistanceKm] [decimal](9, 2) NULL,
	[RecipientLatitude] [decimal](9, 6) NULL,
	[RecipientLongitude] [decimal](9, 6) NULL,
	[IsAddressVerified] [bit] NULL,
	[EstimatedDeliveryText] [nvarchar](50) NULL,
	[PaymentStatus] [nvarchar](30) NULL,
	[DeliveredDate] [datetime] NULL,
	[ReceivedConfirmedDate] [datetime] NULL,
	[RevenueEligibleDate] [datetime] NULL,
	[IsCountedAsRevenue] [bit] NULL,
	[AutoCancelDeadline] [datetime] NULL,
	[UpdatedAt] [datetime] NULL,
	[TrackingNumber] [varchar](60) NULL,
	[HandledBy] [nvarchar](50) NULL,
	[PaymentDueAt] [datetime] NULL,
	[PaymentConfirmedAt] [datetime] NULL,
	[StockIssueStatus] [nvarchar](30) NULL,
	[StockIssueReason] [nvarchar](500) NULL,
	[StockRestoredAt] [datetime] NULL,
	[StockDeductedAt] [datetime] NULL,
	[VariantDiscountRestoredAt] [datetime] NULL,
PRIMARY KEY CLUSTERED
(
	[OrderID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[OrderStatusHistory](
	[HistoryID] [int] IDENTITY(1,1) NOT NULL,
	[OrderID] [int] NOT NULL,
	[OldStatus] [nvarchar](50) NULL,
	[NewStatus] [nvarchar](50) NULL,
	[Note] [nvarchar](500) NULL,
	[ChangedBy] [int] NULL,
	[ChangedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED
(
	[HistoryID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PaymentMethods](
	[PaymentMethodID] [int] IDENTITY(1,1) NOT NULL,
	[MethodName] [nvarchar](100) NOT NULL,
	[MethodCode] [varchar](30) NOT NULL,
	[Description] [nvarchar](255) NULL,
	[IconURL] [varchar](max) NULL,
	[SortOrder] [int] NULL,
	[IsActive] [bit] NULL,
PRIMARY KEY CLUSTERED
(
	[PaymentMethodID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PaymentTransactions](
	[TransactionID] [int] IDENTITY(1,1) NOT NULL,
	[OrderID] [int] NOT NULL,
	[Provider] [nvarchar](30) NOT NULL,
	[ProviderTxnRef] [varchar](100) NULL,
	[Amount] [decimal](18, 2) NOT NULL,
	[Status] [nvarchar](20) NOT NULL,
	[SignatureValid] [bit] NULL,
	[RawResponse] [nvarchar](max) NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CompletedAt] [datetime] NULL,
 CONSTRAINT [PK_PaymentTransactions] PRIMARY KEY CLUSTERED
(
	[TransactionID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PointTransactions](
	[PointTransactionID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[OrderID] [int] NULL,
	[Points] [int] NOT NULL,
	[Reason] [nvarchar](200) NULL,
	[CreatedAt] [datetime] NOT NULL,
 CONSTRAINT [PK_PointTransactions] PRIMARY KEY CLUSTERED
(
	[PointTransactionID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PostOffices](
	[PostOfficeID] [int] IDENTITY(1,1) NOT NULL,
	[Name] [nvarchar](150) NOT NULL,
	[Address] [nvarchar](500) NULL,
	[Province] [nvarchar](100) NULL,
	[District] [nvarchar](100) NULL,
	[Ward] [nvarchar](100) NULL,
	[Phone] [varchar](20) NULL,
	[Latitude] [decimal](9, 6) NULL,
	[Longitude] [decimal](9, 6) NULL,
	[IsActive] [bit] NULL,
PRIMARY KEY CLUSTERED
(
	[PostOfficeID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ProductImages](
	[ProductImageID] [int] IDENTITY(1,1) NOT NULL,
	[ProductID] [int] NOT NULL,
	[ColorName] [nvarchar](50) NULL,
	[ImageURL] [varchar](max) NOT NULL,
	[IsPrimary] [bit] NULL,
	[SortOrder] [int] NULL,
PRIMARY KEY CLUSTERED
(
	[ProductImageID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ProductQuestions](
	[QuestionID] [int] IDENTITY(1,1) NOT NULL,
	[ProductID] [int] NOT NULL,
	[UserID] [int] NULL,
	[AskerName] [nvarchar](100) NULL,
	[Content] [nvarchar](1000) NOT NULL,
	[AnswerContent] [nvarchar](2000) NULL,
	[AnsweredByUserID] [int] NULL,
	[AnsweredAt] [datetime] NULL,
	[Status] [nvarchar](20) NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
 CONSTRAINT [PK_ProductQuestions] PRIMARY KEY CLUSTERED
(
	[QuestionID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ProductVariants](
	[ProductVariantID] [int] IDENTITY(1,1) NOT NULL,
	[ProductID] [int] NOT NULL,
	[Size] [nvarchar](10) NULL,
	[SizeStandard] [varchar](10) NULL,
	[ColorName] [nvarchar](50) NULL,
	[ColorHex] [varchar](20) NULL,
	[ChildSKU] [varchar](60) NULL,
	[StockQuantity] [int] NOT NULL,
	[PriceAdjustment] [decimal](18, 0) NULL,
	[IsActive] [bit] NULL,
	[ColorID] [int] NULL,
	[SizeID] [int] NULL,
	[Version] [int] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[ProductVariantID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ReturnDetails](
	[ReturnDetailID] [int] IDENTITY(1,1) NOT NULL,
	[ReturnID] [int] NOT NULL,
	[OrderDetailID] [int] NOT NULL,
	[Quantity] [int] NULL,
	[Reason] [nvarchar](500) NULL,
	[Condition] [nvarchar](30) NULL,
PRIMARY KEY CLUSTERED
(
	[ReturnDetailID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Returns](
	[ReturnID] [int] IDENTITY(1,1) NOT NULL,
	[OrderID] [int] NOT NULL,
	[ReturnType] [varchar](20) NOT NULL,
	[TrackingNumber] [varchar](60) NULL,
	[PostOfficeID] [int] NULL,
	[ReturnAddress] [nvarchar](500) NULL,
	[Reason] [nvarchar](500) NULL,
	[Status] [nvarchar](50) NULL,
	[RefundAmount] [decimal](18, 0) NULL,
	[CreatedAt] [datetime] NULL,
	[UpdatedAt] [datetime] NULL,
	[InspectionNote] [nvarchar](1000) NULL,
	[ResolutionNote] [nvarchar](1000) NULL,
	[ApprovedAt] [datetime] NULL,
	[RefundedAt] [datetime] NULL,
	[RestockedAt] [datetime] NULL,
	[UpdatedBy] [int] NULL,
	[WalletCreditedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED
(
	[ReturnID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ReviewImages](
	[ReviewImageID] [int] IDENTITY(1,1) NOT NULL,
	[ReviewID] [int] NOT NULL,
	[ImageURL] [varchar](max) NOT NULL,
	[SortOrder] [int] NOT NULL,
 CONSTRAINT [PK_ReviewImages] PRIMARY KEY CLUSTERED
(
	[ReviewImageID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Roles](
	[RoleID] [int] IDENTITY(1,1) NOT NULL,
	[RoleName] [varchar](50) NOT NULL,
PRIMARY KEY CLUSTERED
(
	[RoleID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ShippingMethods](
	[ShippingMethodID] [int] IDENTITY(1,1) NOT NULL,
	[MethodName] [nvarchar](50) NOT NULL,
	[MethodCode] [varchar](20) NOT NULL,
	[BasePrice] [decimal](18, 0) NULL,
	[PricePerKm] [decimal](18, 0) NULL,
	[OriginCity] [nvarchar](50) NULL,
	[EstimatedTimeText] [nvarchar](50) NULL,
	[IsActive] [bit] NULL,
PRIMARY KEY CLUSTERED
(
	[ShippingMethodID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ShoeGroupWallets](
	[WalletID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[Balance] [decimal](18, 2) NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[UpdatedAt] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[WalletID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ShoeGroupWalletTransactions](
	[WalletTransactionID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[ReturnID] [int] NULL,
	[TransactionType] [varchar](30) NOT NULL,
	[Amount] [decimal](18, 2) NOT NULL,
	[BalanceAfter] [decimal](18, 2) NOT NULL,
	[Description] [nvarchar](500) NULL,
	[CreatedAt] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[WalletTransactionID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ShoeGroupWalletWithdrawals](
	[WithdrawalID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[Amount] [decimal](18, 2) NOT NULL,
	[Method] [varchar](20) NOT NULL,
	[Destination] [nvarchar](255) NOT NULL,
	[HolderName] [nvarchar](120) NULL,
	[Status] [nvarchar](30) NOT NULL,
	[Note] [nvarchar](500) NULL,
	[CreatedAt] [datetime] NOT NULL,
	[ProcessedAt] [datetime] NULL,
	[ProcessedBy] [int] NULL,
PRIMARY KEY CLUSTERED
(
	[WithdrawalID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SizeCharts](
	[SizeChartID] [int] IDENTITY(1,1) NOT NULL,
	[BrandID] [int] NOT NULL,
	[SizeID] [int] NOT NULL,
	[FootLengthCm] [decimal](5, 1) NULL,
	[UsSize] [nvarchar](10) NULL,
	[EuSize] [nvarchar](10) NULL,
	[Note] [nvarchar](300) NULL,
 CONSTRAINT [PK_SizeCharts] PRIMARY KEY CLUSTERED
(
	[SizeChartID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Sizes](
	[SizeID] [int] IDENTITY(1,1) NOT NULL,
	[SizeName] [nvarchar](20) NOT NULL,
	[SizeStandard] [varchar](10) NULL,
	[IsActive] [bit] NOT NULL,
	[SortOrder] [int] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[SizeID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StockAlerts](
	[StockAlertID] [int] IDENTITY(1,1) NOT NULL,
	[ProductVariantID] [int] NOT NULL,
	[Email] [varchar](100) NOT NULL,
	[UserID] [int] NULL,
	[IsNotified] [bit] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[NotifiedAt] [datetime] NULL,
 CONSTRAINT [PK_StockAlerts] PRIMARY KEY CLUSTERED
(
	[StockAlertID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[UserAddresses](
	[AddressID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[RecipientName] [nvarchar](100) NULL,
	[Phone] [varchar](20) NULL,
	[Province] [nvarchar](100) NULL,
	[District] [nvarchar](100) NULL,
	[Ward] [nvarchar](100) NULL,
	[AddressLine] [nvarchar](255) NULL,
	[FullAddress] [nvarchar](500) NULL,
	[Latitude] [decimal](9, 6) NULL,
	[Longitude] [decimal](9, 6) NULL,
	[IsVerified] [bit] NULL,
	[IsDefault] [bit] NULL,
	[CreatedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED
(
	[AddressID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Users](
	[UserID] [int] IDENTITY(1,1) NOT NULL,
	[RoleID] [int] NULL,
	[Email] [varchar](100) NOT NULL,
	[PasswordHash] [varchar](255) NOT NULL,
	[FullName] [nvarchar](100) NOT NULL,
	[Phone] [varchar](20) NULL,
	[Address] [nvarchar](255) NULL,
	[IsActive] [bit] NULL,
	[CreatedAt] [datetime] NULL,
	[PasswordResetToken] [varchar](255) NULL,
	[PasswordResetTokenExpiry] [datetime] NULL,
	[LastPasswordChangedAt] [datetime] NULL,
	[UpdatedAt] [datetime] NULL,
	[Source] [nvarchar](30) NULL,
	[EmailVerified] [bit] NOT NULL,
	[EmailVerifyToken] [varchar](255) NULL,
	[EmailVerifyExpiry] [datetime] NULL,
	[PointBalance] [int] NOT NULL,
	[TierID] [int] NULL,
	[AvatarURL] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED
(
	[UserID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[UserSessions](
	[SessionID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[BrowserFingerprint] [varchar](255) NULL,
	[UserAgent] [nvarchar](500) NULL,
	[DeviceName] [nvarchar](100) NULL,
	[RememberToken] [varchar](255) NULL,
	[IPAddress] [varchar](45) NULL,
	[CreatedAt] [datetime] NULL,
	[ExpiresAt] [datetime] NULL,
	[IsActive] [bit] NULL,
PRIMARY KEY CLUSTERED
(
	[SessionID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[VariantDiscounts](
	[VariantDiscountID] [int] IDENTITY(1,1) NOT NULL,
	[ProductVariantID] [int] NOT NULL,
	[ProductID] [int] NULL,
	[ColorName] [nvarchar](50) NULL,
	[ColorHex] [varchar](20) NULL,
	[DiscountType] [nvarchar](20) NOT NULL,
	[DiscountValue] [decimal](18, 2) NOT NULL,
	[DiscountPercent] [int] NULL,
	[MaxDiscountAmount] [decimal](18, 2) NOT NULL,
	[Quantity] [int] NOT NULL,
	[UsedCount] [int] NOT NULL,
	[StartDate] [datetime] NULL,
	[EndDate] [datetime] NULL,
	[Reason] [nvarchar](100) NULL,
	[IsActive] [bit] NOT NULL,
	[Description] [nvarchar](500) NULL,
	[CreatedAt] [datetime] NOT NULL,
	[ApplyScope] [varchar](20) NOT NULL,
PRIMARY KEY CLUSTERED
(
	[VariantDiscountID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Wishlists](
	[WishlistID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[ProductID] [int] NOT NULL,
	[NotifyOnSale] [bit] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
 CONSTRAINT [PK_Wishlists] PRIMARY KEY CLUSTERED
(
	[WishlistID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[CartItems] ADD  CONSTRAINT [UQ_CartItems_Cart_Variant] UNIQUE NONCLUSTERED
(
	[CartID] ASC,
	[ProductVariantID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Carts] ADD  CONSTRAINT [UQ_Carts_User] UNIQUE NONCLUSTERED
(
	[UserID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[CheckoutRequests] ADD  CONSTRAINT [UQ_CheckoutRequests_OrderID] UNIQUE NONCLUSTERED
(
	[OrderID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[CouponRedemptions] ADD  CONSTRAINT [UQ_CouponRedemptions_Order] UNIQUE NONCLUSTERED
(
	[OrderID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Coupons] ADD UNIQUE NONCLUSTERED
(
	[CouponCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[MemberTiers] ADD  CONSTRAINT [UQ_MemberTiers_Code] UNIQUE NONCLUSTERED
(
	[TierCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Reviews] ADD  CONSTRAINT [UQ_Reviews_User_Product] UNIQUE NONCLUSTERED
(
	[UserID] ASC,
	[ProductID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[ShoeGroupWallets] ADD UNIQUE NONCLUSTERED
(
	[UserID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[SizeCharts] ADD  CONSTRAINT [UQ_SizeCharts_Brand_Size] UNIQUE NONCLUSTERED
(
	[BrandID] ASC,
	[SizeID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[StockAlerts] ADD  CONSTRAINT [UQ_SA_Variant_Email] UNIQUE NONCLUSTERED
(
	[ProductVariantID] ASC,
	[Email] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Users] ADD UNIQUE NONCLUSTERED
(
	[Email] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Wishlists] ADD  CONSTRAINT [UQ_Wishlists_User_Product] UNIQUE NONCLUSTERED
(
	[UserID] ASC,
	[ProductID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[AppMigrations] ADD  DEFAULT (getdate()) FOR [AppliedAt]
GO
ALTER TABLE [dbo].[Brands] ADD  CONSTRAINT [DF_Brands_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[CartItems] ADD  CONSTRAINT [DF_CartItems_Qty]  DEFAULT ((1)) FOR [Quantity]
GO
ALTER TABLE [dbo].[CartItems] ADD  CONSTRAINT [DF_CartItems_AddedAt]  DEFAULT (getdate()) FOR [AddedAt]
GO
ALTER TABLE [dbo].[Carts] ADD  CONSTRAINT [DF_Carts_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Carts] ADD  CONSTRAINT [DF_Carts_UpdatedAt]  DEFAULT (getdate()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[Categories] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[CheckoutRequests] ADD  CONSTRAINT [DF_CheckoutRequests_CreatedAt]  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Collections] ADD  CONSTRAINT [DF_Collections_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Colors] ADD  CONSTRAINT [DF_Colors_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Colors] ADD  CONSTRAINT [DF_Colors_SortOrder]  DEFAULT ((0)) FOR [SortOrder]
GO
ALTER TABLE [dbo].[CouponRedemptions] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Coupons] ADD  DEFAULT ((0)) FOR [UsedCount]
GO
ALTER TABLE [dbo].[Coupons] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Coupons] ADD  CONSTRAINT [DF_Coupons_DiscountType]  DEFAULT (N'Phần trăm') FOR [DiscountType]
GO
ALTER TABLE [dbo].[Coupons] ADD  CONSTRAINT [DF_Coupons_DiscountValue]  DEFAULT ((0)) FOR [DiscountValue]
GO
ALTER TABLE [dbo].[Coupons] ADD  CONSTRAINT [DF_Coupons_MinOrder]  DEFAULT ((0)) FOR [MinOrderAmount]
GO
ALTER TABLE [dbo].[Coupons] ADD  CONSTRAINT [DF_Coupons_MaxDiscount]  DEFAULT ((0)) FOR [MaxDiscountAmount]
GO
ALTER TABLE [dbo].[Coupons] ADD  CONSTRAINT [DF_Coupons_IsFlashSale]  DEFAULT ((0)) FOR [IsFlashSale]
GO
ALTER TABLE [dbo].[Materials] ADD  CONSTRAINT [DF_Materials_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[MemberTiers] ADD  CONSTRAINT [DF_MT_MinSpend]  DEFAULT ((0)) FOR [MinSpend]
GO
ALTER TABLE [dbo].[MemberTiers] ADD  CONSTRAINT [DF_MT_Discount]  DEFAULT ((0)) FOR [DiscountPercent]
GO
ALTER TABLE [dbo].[MemberTiers] ADD  CONSTRAINT [DF_MT_PointRate]  DEFAULT ((1)) FOR [PointRate]
GO
ALTER TABLE [dbo].[MemberTiers] ADD  CONSTRAINT [DF_MT_Sort]  DEFAULT ((0)) FOR [SortOrder]
GO
ALTER TABLE [dbo].[MemberTiers] ADD  CONSTRAINT [DF_MT_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Notifications] ADD  CONSTRAINT [DF_Notifications_IsRead]  DEFAULT ((0)) FOR [IsRead]
GO
ALTER TABLE [dbo].[Notifications] ADD  CONSTRAINT [DF_Notifications_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[OrderDetails] ADD  DEFAULT ((1)) FOR [Quantity]
GO
ALTER TABLE [dbo].[OrderDetails] ADD  DEFAULT ((0)) FOR [UnitPrice]
GO
ALTER TABLE [dbo].[Orders] ADD  DEFAULT (getdate()) FOR [OrderDate]
GO
ALTER TABLE [dbo].[Orders] ADD  DEFAULT (N'Chờ xác nhận') FOR [Status]
GO
ALTER TABLE [dbo].[Orders] ADD  DEFAULT (N'Chưa cập nhật') FOR [ShippingAddress]
GO
ALTER TABLE [dbo].[Orders] ADD  DEFAULT ((0)) FOR [ShippingFee]
GO
ALTER TABLE [dbo].[Orders] ADD  DEFAULT ((0)) FOR [DiscountAmount]
GO
ALTER TABLE [dbo].[Orders] ADD  CONSTRAINT [DF_Orders_PaymentStatus]  DEFAULT (N'Chưa thanh toán') FOR [PaymentStatus]
GO
ALTER TABLE [dbo].[Orders] ADD  CONSTRAINT [DF_Orders_IsRevenue]  DEFAULT ((0)) FOR [IsCountedAsRevenue]
GO
ALTER TABLE [dbo].[OrderStatusHistory] ADD  CONSTRAINT [DF_OrderStatusHistory_ChangedAt]  DEFAULT (getdate()) FOR [ChangedAt]
GO
ALTER TABLE [dbo].[PaymentMethods] ADD  CONSTRAINT [DF_PaymentMethods_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[PaymentTransactions] ADD  CONSTRAINT [DF_PT_Status]  DEFAULT (N'PENDING') FOR [Status]
GO
ALTER TABLE [dbo].[PaymentTransactions] ADD  CONSTRAINT [DF_PT_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[PointTransactions] ADD  CONSTRAINT [DF_PTr_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[PostOffices] ADD  CONSTRAINT [DF_PostOffices_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[ProductImages] ADD  CONSTRAINT [DF_ProductImages_IsPrimary]  DEFAULT ((0)) FOR [IsPrimary]
GO
ALTER TABLE [dbo].[ProductQuestions] ADD  CONSTRAINT [DF_PQ_Status]  DEFAULT (N'ChoTraLoi') FOR [Status]
GO
ALTER TABLE [dbo].[ProductQuestions] ADD  CONSTRAINT [DF_PQ_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Products] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Products] ADD  CONSTRAINT [DF_Products_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Products] ADD  CONSTRAINT [DF_Products_WishlistCount]  DEFAULT ((0)) FOR [WishlistCount]
GO
ALTER TABLE [dbo].[ProductVariants] ADD  CONSTRAINT [DF_ProductVariants_Stock]  DEFAULT ((0)) FOR [StockQuantity]
GO
ALTER TABLE [dbo].[ProductVariants] ADD  CONSTRAINT [DF_ProductVariants_PriceAdj]  DEFAULT ((0)) FOR [PriceAdjustment]
GO
ALTER TABLE [dbo].[ProductVariants] ADD  CONSTRAINT [DF_ProductVariants_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[ProductVariants] ADD  CONSTRAINT [DF_ProductVariants_Version]  DEFAULT ((0)) FOR [Version]
GO
ALTER TABLE [dbo].[Returns] ADD  CONSTRAINT [DF_Returns_Status]  DEFAULT (N'Chờ xử lý') FOR [Status]
GO
ALTER TABLE [dbo].[Returns] ADD  CONSTRAINT [DF_Returns_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[ReviewImages] ADD  CONSTRAINT [DF_ReviewImages_Sort]  DEFAULT ((0)) FOR [SortOrder]
GO
ALTER TABLE [dbo].[Reviews] ADD  CONSTRAINT [DF_Reviews_Status]  DEFAULT (N'ChoDuyet') FOR [Status]
GO
ALTER TABLE [dbo].[Reviews] ADD  CONSTRAINT [DF_Reviews_Helpful]  DEFAULT ((0)) FOR [HelpfulCount]
GO
ALTER TABLE [dbo].[Reviews] ADD  CONSTRAINT [DF_Reviews_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[SearchLogs] ADD  CONSTRAINT [DF_SL_ResultCount]  DEFAULT ((0)) FOR [ResultCount]
GO
ALTER TABLE [dbo].[SearchLogs] ADD  CONSTRAINT [DF_SL_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[ShippingMethods] ADD  CONSTRAINT [DF_ShippingMethods_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[ShoeGroupWallets] ADD  CONSTRAINT [DF_ShoeGroupWallets_Balance]  DEFAULT ((0)) FOR [Balance]
GO
ALTER TABLE [dbo].[ShoeGroupWallets] ADD  CONSTRAINT [DF_ShoeGroupWallets_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[ShoeGroupWallets] ADD  CONSTRAINT [DF_ShoeGroupWallets_UpdatedAt]  DEFAULT (getdate()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[ShoeGroupWalletTransactions] ADD  CONSTRAINT [DF_ShoeGroupWalletTransactions_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[ShoeGroupWalletWithdrawals] ADD  CONSTRAINT [DF_ShoeGroupWalletWithdrawals_Status]  DEFAULT (N'Chờ xử lý') FOR [Status]
GO
ALTER TABLE [dbo].[ShoeGroupWalletWithdrawals] ADD  CONSTRAINT [DF_ShoeGroupWalletWithdrawals_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Sizes] ADD  CONSTRAINT [DF_Sizes_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Sizes] ADD  CONSTRAINT [DF_Sizes_SortOrder]  DEFAULT ((0)) FOR [SortOrder]
GO
ALTER TABLE [dbo].[StockAlerts] ADD  CONSTRAINT [DF_SA_IsNotified]  DEFAULT ((0)) FOR [IsNotified]
GO
ALTER TABLE [dbo].[StockAlerts] ADD  CONSTRAINT [DF_SA_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[UserAddresses] ADD  CONSTRAINT [DF_UserAddresses_IsVerified]  DEFAULT ((0)) FOR [IsVerified]
GO
ALTER TABLE [dbo].[UserAddresses] ADD  CONSTRAINT [DF_UserAddresses_IsDefault]  DEFAULT ((0)) FOR [IsDefault]
GO
ALTER TABLE [dbo].[UserAddresses] ADD  CONSTRAINT [DF_UserAddresses_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Users] ADD  CONSTRAINT [DF_Users_EmailVerified]  DEFAULT ((0)) FOR [EmailVerified]
GO
ALTER TABLE [dbo].[Users] ADD  CONSTRAINT [DF_Users_PointBalance]  DEFAULT ((0)) FOR [PointBalance]
GO
ALTER TABLE [dbo].[UserSessions] ADD  CONSTRAINT [DF_UserSessions_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[UserSessions] ADD  CONSTRAINT [DF_UserSessions_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[VariantDiscounts] ADD  DEFAULT (N'Theo phần trăm') FOR [DiscountType]
GO
ALTER TABLE [dbo].[VariantDiscounts] ADD  DEFAULT ((0)) FOR [DiscountValue]
GO
ALTER TABLE [dbo].[VariantDiscounts] ADD  DEFAULT ((0)) FOR [MaxDiscountAmount]
GO
ALTER TABLE [dbo].[VariantDiscounts] ADD  DEFAULT ((0)) FOR [Quantity]
GO
ALTER TABLE [dbo].[VariantDiscounts] ADD  DEFAULT ((0)) FOR [UsedCount]
GO
ALTER TABLE [dbo].[VariantDiscounts] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[VariantDiscounts] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[VariantDiscounts] ADD  CONSTRAINT [DF_VariantDiscounts_ApplyScope]  DEFAULT ('color') FOR [ApplyScope]
GO
ALTER TABLE [dbo].[Wishlists] ADD  CONSTRAINT [DF_Wishlists_Notify]  DEFAULT ((1)) FOR [NotifyOnSale]
GO
ALTER TABLE [dbo].[Wishlists] ADD  CONSTRAINT [DF_Wishlists_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[CartItems]  WITH CHECK ADD  CONSTRAINT [FK_CartItems_Carts] FOREIGN KEY([CartID])
REFERENCES [dbo].[Carts] ([CartID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[CartItems] CHECK CONSTRAINT [FK_CartItems_Carts]
GO
ALTER TABLE [dbo].[CartItems]  WITH CHECK ADD  CONSTRAINT [FK_CartItems_Variants] FOREIGN KEY([ProductVariantID])
REFERENCES [dbo].[ProductVariants] ([ProductVariantID])
GO
ALTER TABLE [dbo].[CartItems] CHECK CONSTRAINT [FK_CartItems_Variants]
GO
ALTER TABLE [dbo].[Carts]  WITH CHECK ADD  CONSTRAINT [FK_Carts_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Carts] CHECK CONSTRAINT [FK_Carts_Users]
GO
ALTER TABLE [dbo].[CheckoutRequests]  WITH CHECK ADD FOREIGN KEY([OrderID])
REFERENCES [dbo].[Orders] ([OrderID])
GO
ALTER TABLE [dbo].[CheckoutRequests]  WITH CHECK ADD FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[Collections]  WITH CHECK ADD  CONSTRAINT [FK_Collections_Brands] FOREIGN KEY([BrandID])
REFERENCES [dbo].[Brands] ([BrandID])
GO
ALTER TABLE [dbo].[Collections] CHECK CONSTRAINT [FK_Collections_Brands]
GO
ALTER TABLE [dbo].[CouponRedemptions]  WITH CHECK ADD FOREIGN KEY([CouponID])
REFERENCES [dbo].[Coupons] ([CouponID])
GO
ALTER TABLE [dbo].[CouponRedemptions]  WITH CHECK ADD FOREIGN KEY([OrderID])
REFERENCES [dbo].[Orders] ([OrderID])
GO
ALTER TABLE [dbo].[CouponRedemptions]  WITH CHECK ADD FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[Notifications]  WITH CHECK ADD  CONSTRAINT [FK_Notifications_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[Notifications] CHECK CONSTRAINT [FK_Notifications_Users]
GO
ALTER TABLE [dbo].[OrderDetails]  WITH CHECK ADD FOREIGN KEY([OrderID])
REFERENCES [dbo].[Orders] ([OrderID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[OrderDetails]  WITH CHECK ADD FOREIGN KEY([ProductID])
REFERENCES [dbo].[Products] ([ProductID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[OrderDetails]  WITH CHECK ADD  CONSTRAINT [FK_OrderDetails_ProductVariants] FOREIGN KEY([ProductVariantID])
REFERENCES [dbo].[ProductVariants] ([ProductVariantID])
GO
ALTER TABLE [dbo].[OrderDetails] CHECK CONSTRAINT [FK_OrderDetails_ProductVariants]
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD  CONSTRAINT [FK_Orders_PaymentMethods] FOREIGN KEY([PaymentMethodID])
REFERENCES [dbo].[PaymentMethods] ([PaymentMethodID])
GO
ALTER TABLE [dbo].[Orders] CHECK CONSTRAINT [FK_Orders_PaymentMethods]
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD  CONSTRAINT [FK_Orders_ShippingMethods] FOREIGN KEY([ShippingMethodID])
REFERENCES [dbo].[ShippingMethods] ([ShippingMethodID])
GO
ALTER TABLE [dbo].[Orders] CHECK CONSTRAINT [FK_Orders_ShippingMethods]
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD  CONSTRAINT [FK_Orders_UserAddresses] FOREIGN KEY([AddressID])
REFERENCES [dbo].[UserAddresses] ([AddressID])
GO
ALTER TABLE [dbo].[Orders] CHECK CONSTRAINT [FK_Orders_UserAddresses]
GO
ALTER TABLE [dbo].[OrderStatusHistory]  WITH CHECK ADD  CONSTRAINT [FK_OrderStatusHistory_Orders] FOREIGN KEY([OrderID])
REFERENCES [dbo].[Orders] ([OrderID])
GO
ALTER TABLE [dbo].[OrderStatusHistory] CHECK CONSTRAINT [FK_OrderStatusHistory_Orders]
GO
ALTER TABLE [dbo].[PaymentTransactions]  WITH CHECK ADD  CONSTRAINT [FK_PT_Orders] FOREIGN KEY([OrderID])
REFERENCES [dbo].[Orders] ([OrderID])
GO
ALTER TABLE [dbo].[PaymentTransactions] CHECK CONSTRAINT [FK_PT_Orders]
GO
ALTER TABLE [dbo].[PointTransactions]  WITH CHECK ADD  CONSTRAINT [FK_PTr_Orders] FOREIGN KEY([OrderID])
REFERENCES [dbo].[Orders] ([OrderID])
GO
ALTER TABLE [dbo].[PointTransactions] CHECK CONSTRAINT [FK_PTr_Orders]
GO
ALTER TABLE [dbo].[PointTransactions]  WITH CHECK ADD  CONSTRAINT [FK_PTr_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[PointTransactions] CHECK CONSTRAINT [FK_PTr_Users]
GO
ALTER TABLE [dbo].[ProductImages]  WITH CHECK ADD  CONSTRAINT [FK_ProductImages_Products] FOREIGN KEY([ProductID])
REFERENCES [dbo].[Products] ([ProductID])
GO
ALTER TABLE [dbo].[ProductImages] CHECK CONSTRAINT [FK_ProductImages_Products]
GO
ALTER TABLE [dbo].[ProductQuestions]  WITH CHECK ADD  CONSTRAINT [FK_PQ_Answerer] FOREIGN KEY([AnsweredByUserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[ProductQuestions] CHECK CONSTRAINT [FK_PQ_Answerer]
GO
ALTER TABLE [dbo].[ProductQuestions]  WITH CHECK ADD  CONSTRAINT [FK_PQ_Products] FOREIGN KEY([ProductID])
REFERENCES [dbo].[Products] ([ProductID])
GO
ALTER TABLE [dbo].[ProductQuestions] CHECK CONSTRAINT [FK_PQ_Products]
GO
ALTER TABLE [dbo].[ProductQuestions]  WITH CHECK ADD  CONSTRAINT [FK_PQ_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[ProductQuestions] CHECK CONSTRAINT [FK_PQ_Users]
GO
ALTER TABLE [dbo].[Products]  WITH CHECK ADD FOREIGN KEY([BrandID])
REFERENCES [dbo].[Brands] ([BrandID])
GO
ALTER TABLE [dbo].[Products]  WITH CHECK ADD FOREIGN KEY([BrandID])
REFERENCES [dbo].[Brands] ([BrandID])
GO
ALTER TABLE [dbo].[Products]  WITH CHECK ADD FOREIGN KEY([CategoryID])
REFERENCES [dbo].[Categories] ([CategoryID])
GO
ALTER TABLE [dbo].[Products]  WITH CHECK ADD FOREIGN KEY([CategoryID])
REFERENCES [dbo].[Categories] ([CategoryID])
GO
ALTER TABLE [dbo].[Products]  WITH CHECK ADD  CONSTRAINT [FK_Products_Collections] FOREIGN KEY([CollectionID])
REFERENCES [dbo].[Collections] ([CollectionID])
GO
ALTER TABLE [dbo].[Products] CHECK CONSTRAINT [FK_Products_Collections]
GO
ALTER TABLE [dbo].[Products]  WITH CHECK ADD  CONSTRAINT [FK_Products_Materials] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
GO
ALTER TABLE [dbo].[Products] CHECK CONSTRAINT [FK_Products_Materials]
GO
ALTER TABLE [dbo].[ProductVariants]  WITH CHECK ADD  CONSTRAINT [FK_ProductVariants_Colors] FOREIGN KEY([ColorID])
REFERENCES [dbo].[Colors] ([ColorID])
GO
ALTER TABLE [dbo].[ProductVariants] CHECK CONSTRAINT [FK_ProductVariants_Colors]
GO
ALTER TABLE [dbo].[ProductVariants]  WITH CHECK ADD  CONSTRAINT [FK_ProductVariants_Products] FOREIGN KEY([ProductID])
REFERENCES [dbo].[Products] ([ProductID])
GO
ALTER TABLE [dbo].[ProductVariants] CHECK CONSTRAINT [FK_ProductVariants_Products]
GO
ALTER TABLE [dbo].[ProductVariants]  WITH CHECK ADD  CONSTRAINT [FK_ProductVariants_Sizes] FOREIGN KEY([SizeID])
REFERENCES [dbo].[Sizes] ([SizeID])
GO
ALTER TABLE [dbo].[ProductVariants] CHECK CONSTRAINT [FK_ProductVariants_Sizes]
GO
ALTER TABLE [dbo].[ReturnDetails]  WITH CHECK ADD  CONSTRAINT [FK_ReturnDetails_OrderDetails] FOREIGN KEY([OrderDetailID])
REFERENCES [dbo].[OrderDetails] ([OrderDetailID])
GO
ALTER TABLE [dbo].[ReturnDetails] CHECK CONSTRAINT [FK_ReturnDetails_OrderDetails]
GO
ALTER TABLE [dbo].[ReturnDetails]  WITH CHECK ADD  CONSTRAINT [FK_ReturnDetails_Returns] FOREIGN KEY([ReturnID])
REFERENCES [dbo].[Returns] ([ReturnID])
GO
ALTER TABLE [dbo].[ReturnDetails] CHECK CONSTRAINT [FK_ReturnDetails_Returns]
GO
ALTER TABLE [dbo].[Returns]  WITH CHECK ADD  CONSTRAINT [FK_Returns_Orders] FOREIGN KEY([OrderID])
REFERENCES [dbo].[Orders] ([OrderID])
GO
ALTER TABLE [dbo].[Returns] CHECK CONSTRAINT [FK_Returns_Orders]
GO
ALTER TABLE [dbo].[Returns]  WITH CHECK ADD  CONSTRAINT [FK_Returns_PostOffices] FOREIGN KEY([PostOfficeID])
REFERENCES [dbo].[PostOffices] ([PostOfficeID])
GO
ALTER TABLE [dbo].[Returns] CHECK CONSTRAINT [FK_Returns_PostOffices]
GO
ALTER TABLE [dbo].[ReviewImages]  WITH CHECK ADD  CONSTRAINT [FK_ReviewImages_Reviews] FOREIGN KEY([ReviewID])
REFERENCES [dbo].[Reviews] ([ReviewID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[ReviewImages] CHECK CONSTRAINT [FK_ReviewImages_Reviews]
GO
ALTER TABLE [dbo].[Reviews]  WITH CHECK ADD  CONSTRAINT [FK_Reviews_OrderDetails] FOREIGN KEY([OrderDetailID])
REFERENCES [dbo].[OrderDetails] ([OrderDetailID])
GO
ALTER TABLE [dbo].[Reviews] CHECK CONSTRAINT [FK_Reviews_OrderDetails]
GO
ALTER TABLE [dbo].[Reviews]  WITH CHECK ADD  CONSTRAINT [FK_Reviews_Products] FOREIGN KEY([ProductID])
REFERENCES [dbo].[Products] ([ProductID])
GO
ALTER TABLE [dbo].[Reviews] CHECK CONSTRAINT [FK_Reviews_Products]
GO
ALTER TABLE [dbo].[Reviews]  WITH CHECK ADD  CONSTRAINT [FK_Reviews_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[Reviews] CHECK CONSTRAINT [FK_Reviews_Users]
GO
ALTER TABLE [dbo].[SearchLogs]  WITH CHECK ADD  CONSTRAINT [FK_SearchLogs_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[SearchLogs] CHECK CONSTRAINT [FK_SearchLogs_Users]
GO
ALTER TABLE [dbo].[ShoeGroupWallets]  WITH CHECK ADD  CONSTRAINT [FK_ShoeGroupWallets_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[ShoeGroupWallets] CHECK CONSTRAINT [FK_ShoeGroupWallets_Users]
GO
ALTER TABLE [dbo].[ShoeGroupWalletTransactions]  WITH CHECK ADD  CONSTRAINT [FK_ShoeGroupWalletTransactions_Returns] FOREIGN KEY([ReturnID])
REFERENCES [dbo].[Returns] ([ReturnID])
GO
ALTER TABLE [dbo].[ShoeGroupWalletTransactions] CHECK CONSTRAINT [FK_ShoeGroupWalletTransactions_Returns]
GO
ALTER TABLE [dbo].[ShoeGroupWalletTransactions]  WITH CHECK ADD  CONSTRAINT [FK_ShoeGroupWalletTransactions_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[ShoeGroupWalletTransactions] CHECK CONSTRAINT [FK_ShoeGroupWalletTransactions_Users]
GO
ALTER TABLE [dbo].[ShoeGroupWalletWithdrawals]  WITH CHECK ADD  CONSTRAINT [FK_ShoeGroupWalletWithdrawals_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[ShoeGroupWalletWithdrawals] CHECK CONSTRAINT [FK_ShoeGroupWalletWithdrawals_Users]
GO
ALTER TABLE [dbo].[SizeCharts]  WITH CHECK ADD  CONSTRAINT [FK_SizeCharts_Brands] FOREIGN KEY([BrandID])
REFERENCES [dbo].[Brands] ([BrandID])
GO
ALTER TABLE [dbo].[SizeCharts] CHECK CONSTRAINT [FK_SizeCharts_Brands]
GO
ALTER TABLE [dbo].[SizeCharts]  WITH CHECK ADD  CONSTRAINT [FK_SizeCharts_Sizes] FOREIGN KEY([SizeID])
REFERENCES [dbo].[Sizes] ([SizeID])
GO
ALTER TABLE [dbo].[SizeCharts] CHECK CONSTRAINT [FK_SizeCharts_Sizes]
GO
ALTER TABLE [dbo].[StockAlerts]  WITH CHECK ADD  CONSTRAINT [FK_SA_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[StockAlerts] CHECK CONSTRAINT [FK_SA_Users]
GO
ALTER TABLE [dbo].[StockAlerts]  WITH CHECK ADD  CONSTRAINT [FK_SA_Variants] FOREIGN KEY([ProductVariantID])
REFERENCES [dbo].[ProductVariants] ([ProductVariantID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[StockAlerts] CHECK CONSTRAINT [FK_SA_Variants]
GO
ALTER TABLE [dbo].[UserAddresses]  WITH CHECK ADD  CONSTRAINT [FK_UserAddresses_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[UserAddresses] CHECK CONSTRAINT [FK_UserAddresses_Users]
GO
ALTER TABLE [dbo].[Users]  WITH CHECK ADD FOREIGN KEY([RoleID])
REFERENCES [dbo].[Roles] ([RoleID])
GO
ALTER TABLE [dbo].[Users]  WITH CHECK ADD FOREIGN KEY([RoleID])
REFERENCES [dbo].[Roles] ([RoleID])
GO
ALTER TABLE [dbo].[Users]  WITH CHECK ADD  CONSTRAINT [FK_Users_MemberTiers] FOREIGN KEY([TierID])
REFERENCES [dbo].[MemberTiers] ([TierID])
GO
ALTER TABLE [dbo].[Users] CHECK CONSTRAINT [FK_Users_MemberTiers]
GO
ALTER TABLE [dbo].[UserSessions]  WITH CHECK ADD  CONSTRAINT [FK_UserSessions_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[UserSessions] CHECK CONSTRAINT [FK_UserSessions_Users]
GO
ALTER TABLE [dbo].[VariantDiscounts]  WITH CHECK ADD  CONSTRAINT [FK_VariantDiscounts_Products] FOREIGN KEY([ProductID])
REFERENCES [dbo].[Products] ([ProductID])
GO
ALTER TABLE [dbo].[VariantDiscounts] CHECK CONSTRAINT [FK_VariantDiscounts_Products]
GO
ALTER TABLE [dbo].[VariantDiscounts]  WITH CHECK ADD  CONSTRAINT [FK_VariantDiscounts_ProductVariants] FOREIGN KEY([ProductVariantID])
REFERENCES [dbo].[ProductVariants] ([ProductVariantID])
GO
ALTER TABLE [dbo].[VariantDiscounts] CHECK CONSTRAINT [FK_VariantDiscounts_ProductVariants]
GO
ALTER TABLE [dbo].[Wishlists]  WITH CHECK ADD  CONSTRAINT [FK_Wishlists_Products] FOREIGN KEY([ProductID])
REFERENCES [dbo].[Products] ([ProductID])
GO
ALTER TABLE [dbo].[Wishlists] CHECK CONSTRAINT [FK_Wishlists_Products]
GO
ALTER TABLE [dbo].[Wishlists]  WITH CHECK ADD  CONSTRAINT [FK_Wishlists_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Wishlists] CHECK CONSTRAINT [FK_Wishlists_Users]
GO
ALTER TABLE [dbo].[CartItems]  WITH CHECK ADD  CONSTRAINT [CK_CartItems_Qty] CHECK  (([Quantity]>(0)))
GO
ALTER TABLE [dbo].[CartItems] CHECK CONSTRAINT [CK_CartItems_Qty]
GO
ALTER TABLE [dbo].[CheckoutRequests]  WITH CHECK ADD  CONSTRAINT [CK_CheckoutRequests_ResponseJson] CHECK  ((isjson([ResponseJson])=(1)))
GO
ALTER TABLE [dbo].[CheckoutRequests] CHECK CONSTRAINT [CK_CheckoutRequests_ResponseJson]
GO
ALTER TABLE [dbo].[CouponRedemptions]  WITH CHECK ADD CHECK  (([DiscountAmount]>=(0)))
GO
ALTER TABLE [dbo].[Coupons]  WITH CHECK ADD  CONSTRAINT [CK_Coupons_Usage] CHECK  (([UsedCount]>=(0) AND ([UsageLimit] IS NULL OR [UsageLimit]>=(0)) AND ([PerUserLimit] IS NULL OR [PerUserLimit]>=(0))))
GO
ALTER TABLE [dbo].[Coupons] CHECK CONSTRAINT [CK_Coupons_Usage]
GO
ALTER TABLE [dbo].[MemberTiers]  WITH CHECK ADD  CONSTRAINT [CK_MT_Discount] CHECK  (([DiscountPercent]>=(0) AND [DiscountPercent]<=(100)))
GO
ALTER TABLE [dbo].[MemberTiers] CHECK CONSTRAINT [CK_MT_Discount]
GO
ALTER TABLE [dbo].[OrderDetails]  WITH CHECK ADD  CONSTRAINT [CK_OrderDetails_ValidAmounts] CHECK  (([Quantity]>(0) AND [UnitPrice]>=(0)))
GO
ALTER TABLE [dbo].[OrderDetails] CHECK CONSTRAINT [CK_OrderDetails_ValidAmounts]
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD  CONSTRAINT [CK_Orders_ValidAmounts] CHECK  (([TotalAmount]>=(0) AND [ShippingFee]>=(0) AND [DiscountAmount]>=(0)))
GO
ALTER TABLE [dbo].[Orders] CHECK CONSTRAINT [CK_Orders_ValidAmounts]
GO
ALTER TABLE [dbo].[PaymentTransactions]  WITH CHECK ADD  CONSTRAINT [CK_PaymentTransactions_Amount] CHECK  (([Amount]>=(0)))
GO
ALTER TABLE [dbo].[PaymentTransactions] CHECK CONSTRAINT [CK_PaymentTransactions_Amount]
GO
ALTER TABLE [dbo].[PaymentTransactions]  WITH CHECK ADD  CONSTRAINT [CK_PT_Status] CHECK  (([Status]=N'CANCELLED' OR [Status]=N'REFUNDED' OR [Status]=N'FAILED' OR [Status]=N'SUCCESS' OR [Status]=N'PENDING'))
GO
ALTER TABLE [dbo].[PaymentTransactions] CHECK CONSTRAINT [CK_PT_Status]
GO
ALTER TABLE [dbo].[ProductQuestions]  WITH CHECK ADD  CONSTRAINT [CK_PQ_Status] CHECK  (([Status]=N'An' OR [Status]=N'DaTraLoi' OR [Status]=N'ChoTraLoi'))
GO
ALTER TABLE [dbo].[ProductQuestions] CHECK CONSTRAINT [CK_PQ_Status]
GO
ALTER TABLE [dbo].[ProductVariants]  WITH CHECK ADD  CONSTRAINT [CK_ProductVariants_Stock_NonNegative] CHECK  (([StockQuantity]>=(0)))
GO
ALTER TABLE [dbo].[ProductVariants] CHECK CONSTRAINT [CK_ProductVariants_Stock_NonNegative]
GO
ALTER TABLE [dbo].[ProductVariants]  WITH CHECK ADD  CONSTRAINT [CK_ProductVariants_StockQuantity_NonNegative] CHECK  (([StockQuantity]>=(0)))
GO
ALTER TABLE [dbo].[ProductVariants] CHECK CONSTRAINT [CK_ProductVariants_StockQuantity_NonNegative]
GO
ALTER TABLE [dbo].[ReturnDetails]  WITH CHECK ADD  CONSTRAINT [CK_ReturnDetails_Quantity] CHECK  (([Quantity]>(0)))
GO
ALTER TABLE [dbo].[ReturnDetails] CHECK CONSTRAINT [CK_ReturnDetails_Quantity]
GO
ALTER TABLE [dbo].[Returns]  WITH CHECK ADD  CONSTRAINT [CK_Returns_RefundAmount] CHECK  (([RefundAmount]>=(0)))
GO
ALTER TABLE [dbo].[Returns] CHECK CONSTRAINT [CK_Returns_RefundAmount]
GO
ALTER TABLE [dbo].[Reviews]  WITH CHECK ADD  CONSTRAINT [CK_Reviews_Rating] CHECK  (([Rating]>=(1) AND [Rating]<=(5)))
GO
ALTER TABLE [dbo].[Reviews] CHECK CONSTRAINT [CK_Reviews_Rating]
GO
ALTER TABLE [dbo].[Reviews]  WITH CHECK ADD  CONSTRAINT [CK_Reviews_SizeFeedback] CHECK  (([SizeFeedback] IS NULL OR ([SizeFeedback]=N'RONG' OR [SizeFeedback]=N'CHAT' OR [SizeFeedback]=N'DUNG')))
GO
ALTER TABLE [dbo].[Reviews] CHECK CONSTRAINT [CK_Reviews_SizeFeedback]
GO
ALTER TABLE [dbo].[Reviews]  WITH CHECK ADD  CONSTRAINT [CK_Reviews_Status] CHECK  (([Status]=N'An' OR [Status]=N'DaDuyet' OR [Status]=N'ChoDuyet'))
GO
ALTER TABLE [dbo].[Reviews] CHECK CONSTRAINT [CK_Reviews_Status]
GO
ALTER TABLE [dbo].[ShoeGroupWallets]  WITH CHECK ADD  CONSTRAINT [CK_Wallets_Balance] CHECK  (([Balance]>=(0)))
GO
ALTER TABLE [dbo].[ShoeGroupWallets] CHECK CONSTRAINT [CK_Wallets_Balance]
GO
ALTER TABLE [dbo].[VariantDiscounts]  WITH CHECK ADD  CONSTRAINT [CK_VariantDiscounts_ApplyScope] CHECK  (([ApplyScope]='variant' OR [ApplyScope]='color'))
GO
ALTER TABLE [dbo].[VariantDiscounts] CHECK CONSTRAINT [CK_VariantDiscounts_ApplyScope]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
