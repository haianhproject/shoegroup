-- Mục đích: Tạo cấu trúc database tối giản cho kiểm thử SQL Server; không dùng cho dữ liệu cửa hàng.
CREATE TABLE Users (
  UserID int IDENTITY PRIMARY KEY, RoleID int NOT NULL, FullName nvarchar(100),
  Email varchar(100) UNIQUE, Phone varchar(20), Address nvarchar(500), AvatarURL nvarchar(max),
  PasswordHash varchar(500), IsActive bit DEFAULT 1, LastPasswordChangedAt datetime,
  PasswordResetToken varchar(64), PasswordResetTokenExpiry datetime, UpdatedAt datetime
);
CREATE TABLE Categories(CategoryID int IDENTITY PRIMARY KEY,CategoryName nvarchar(100),Sport nvarchar(50),IsActive bit);
CREATE TABLE Brands(BrandID int IDENTITY PRIMARY KEY,BrandName nvarchar(100),LogoURL nvarchar(max),SortOrder int,IsActive bit);
CREATE TABLE Materials(MaterialID int IDENTITY PRIMARY KEY,MaterialName nvarchar(100),IsActive bit);
CREATE TABLE Colors(ColorID int IDENTITY PRIMARY KEY,ColorName nvarchar(50),ColorHex varchar(20),SortOrder int,IsActive bit);
CREATE TABLE Sizes(SizeID int IDENTITY PRIMARY KEY,SizeName nvarchar(20),SizeStandard varchar(20),SortOrder int,IsActive bit);
CREATE TABLE Products(ProductID int IDENTITY PRIMARY KEY,ProductName nvarchar(255),BasePrice decimal(18,2),ImageURL nvarchar(max),IsActive bit,CategoryID int,BrandID int,MaterialID int,Description nvarchar(max),ParentSKU varchar(50),IsFeatured bit);
CREATE TABLE ProductVariants(ProductVariantID int IDENTITY PRIMARY KEY,ProductID int REFERENCES Products(ProductID),Size nvarchar(10),ColorName nvarchar(50),ColorHex varchar(20),ChildSKU varchar(100),PriceAdjustment decimal(18,2),StockQuantity int,Version int,IsActive bit);
CREATE TABLE ProductImages(ProductImageID int IDENTITY PRIMARY KEY,ProductID int REFERENCES Products(ProductID),ColorName nvarchar(50),ImageURL nvarchar(max),IsPrimary bit,SortOrder int);
CREATE TABLE PosCarts(UserID int PRIMARY KEY REFERENCES Users(UserID),Revision int NOT NULL DEFAULT 0,UpdatedAt datetime2 DEFAULT SYSDATETIME());
CREATE TABLE PosCartItems(UserID int REFERENCES PosCarts(UserID),ProductVariantID int REFERENCES ProductVariants(ProductVariantID),Quantity int CHECK(Quantity>0),PRIMARY KEY(UserID,ProductVariantID));
CREATE TABLE UserAddresses(AddressID int IDENTITY PRIMARY KEY,UserID int REFERENCES Users(UserID),RecipientName nvarchar(100),Phone varchar(20),Province nvarchar(100),District nvarchar(100),Ward nvarchar(100),AddressLine nvarchar(255),FullAddress nvarchar(500),IsVerified bit,IsDefault bit,CreatedAt datetime);
CREATE TABLE Orders(OrderID int IDENTITY PRIMARY KEY,AddressID int REFERENCES UserAddresses(AddressID),ShippingAddress nvarchar(500));
CREATE TABLE OrderDetails(OrderDetailID int IDENTITY PRIMARY KEY,ProductID int REFERENCES Products(ProductID));
CREATE TABLE VariantDiscounts(VariantDiscountID int IDENTITY PRIMARY KEY,ProductID int,ProductVariantID int);
CREATE TABLE Carts(CartID int IDENTITY PRIMARY KEY,UserID int UNIQUE REFERENCES Users(UserID),CreatedAt datetime,UpdatedAt datetime);
CREATE TABLE CartItems(CartItemID int IDENTITY PRIMARY KEY,CartID int REFERENCES Carts(CartID),ProductVariantID int REFERENCES ProductVariants(ProductVariantID),Quantity int,AddedAt datetime,UNIQUE(CartID,ProductVariantID));
