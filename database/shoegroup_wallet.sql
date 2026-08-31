/* Chạy một lần nếu triển khai CSDL mà chưa khởi động backend.
   Backend cũng tự chạy migration tương đương khi kết nối SQL Server. */
IF COL_LENGTH('dbo.Returns', 'WalletCreditedAt') IS NULL
  ALTER TABLE dbo.Returns ADD WalletCreditedAt datetime NULL;
GO
IF OBJECT_ID(N'dbo.ShoeGroupWallets', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ShoeGroupWallets (
    WalletID int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    UserID int NOT NULL UNIQUE,
    Balance decimal(18,2) NOT NULL CONSTRAINT DF_ShoeGroupWallets_Balance DEFAULT(0),
    CreatedAt datetime NOT NULL CONSTRAINT DF_ShoeGroupWallets_CreatedAt DEFAULT(GETDATE()),
    UpdatedAt datetime NOT NULL CONSTRAINT DF_ShoeGroupWallets_UpdatedAt DEFAULT(GETDATE()),
    CONSTRAINT FK_ShoeGroupWallets_Users FOREIGN KEY(UserID) REFERENCES dbo.Users(UserID)
  );
END;
GO
IF OBJECT_ID(N'dbo.ShoeGroupWalletTransactions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ShoeGroupWalletTransactions (
    WalletTransactionID int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    UserID int NOT NULL,
    ReturnID int NULL,
    TransactionType varchar(30) NOT NULL,
    Amount decimal(18,2) NOT NULL,
    BalanceAfter decimal(18,2) NOT NULL,
    Description nvarchar(500) NULL,
    CreatedAt datetime NOT NULL CONSTRAINT DF_ShoeGroupWalletTransactions_CreatedAt DEFAULT(GETDATE()),
    CONSTRAINT FK_ShoeGroupWalletTransactions_Users FOREIGN KEY(UserID) REFERENCES dbo.Users(UserID),
    CONSTRAINT FK_ShoeGroupWalletTransactions_Returns FOREIGN KEY(ReturnID) REFERENCES dbo.Returns(ReturnID)
  );
END;
GO
IF OBJECT_ID(N'dbo.ShoeGroupWalletWithdrawals', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ShoeGroupWalletWithdrawals (
    WithdrawalID int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    UserID int NOT NULL,
    Amount decimal(18,2) NOT NULL,
    Method varchar(20) NOT NULL,
    Destination nvarchar(255) NOT NULL,
    HolderName nvarchar(120) NULL,
    Status nvarchar(30) NOT NULL CONSTRAINT DF_ShoeGroupWalletWithdrawals_Status DEFAULT(N'Chờ xử lý'),
    Note nvarchar(500) NULL,
    CreatedAt datetime NOT NULL CONSTRAINT DF_ShoeGroupWalletWithdrawals_CreatedAt DEFAULT(GETDATE()),
    ProcessedAt datetime NULL,
    ProcessedBy int NULL,
    CONSTRAINT FK_ShoeGroupWalletWithdrawals_Users FOREIGN KEY(UserID) REFERENCES dbo.Users(UserID)
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_ShoeGroupWalletTransactions_ReturnRefund' AND object_id=OBJECT_ID(N'dbo.ShoeGroupWalletTransactions'))
  CREATE UNIQUE INDEX IX_ShoeGroupWalletTransactions_ReturnRefund ON dbo.ShoeGroupWalletTransactions(ReturnID,TransactionType) WHERE ReturnID IS NOT NULL AND TransactionType='REFUND';
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_ShoeGroupWalletTransactions_UserCreated' AND object_id=OBJECT_ID(N'dbo.ShoeGroupWalletTransactions'))
  CREATE INDEX IX_ShoeGroupWalletTransactions_UserCreated ON dbo.ShoeGroupWalletTransactions(UserID,CreatedAt DESC,WalletTransactionID DESC);
GO
