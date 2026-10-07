-- Giỏ tại quầy giữ hàng thật, không tự hết hạn khi khách đang cầm hàng.
-- Mỗi nhân viên có một giỏ; Revision chặn thao tác từ tab cũ và request lặp.
IF OBJECT_ID(N'dbo.PosCarts', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PosCarts (
    UserID int NOT NULL CONSTRAINT PK_PosCarts PRIMARY KEY,
    Revision int NOT NULL CONSTRAINT DF_PosCarts_Revision DEFAULT 0,
    UpdatedAt datetime2 NOT NULL CONSTRAINT DF_PosCarts_UpdatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_PosCarts_Users FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID)
  );
END;
IF OBJECT_ID(N'dbo.PosCartItems', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PosCartItems (
    UserID int NOT NULL,
    ProductVariantID int NOT NULL,
    Quantity int NOT NULL,
    CONSTRAINT PK_PosCartItems PRIMARY KEY (UserID, ProductVariantID),
    CONSTRAINT FK_PosCartItems_Cart FOREIGN KEY (UserID) REFERENCES dbo.PosCarts(UserID),
    CONSTRAINT FK_PosCartItems_Variant FOREIGN KEY (ProductVariantID) REFERENCES dbo.ProductVariants(ProductVariantID),
    CONSTRAINT CK_PosCartItems_Quantity CHECK (Quantity > 0 AND Quantity <= 1000000)
  );
END;
