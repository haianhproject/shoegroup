/* ================================================================
 * ShoegroupDB - SCRIPT TOI UU (MIGRATION AN TOAN)
 * ----------------------------------------------------------------
 * Muc tieu: sua cac loi nguy hiem trong bao cao danh gia MA KHONG
 * lam hong du lieu / code cu.
 *
 * Nguyen tac an toan:
 *   - Chi THEM (index, bang tra cuu, cot phu, rang buoc) - KHONG xoa cot,
 *     KHONG doi ten cot, KHONG xoa bang.
 *   - Moi lenh deu co kiem tra IF NOT EXISTS -> chay lai nhieu lan van an toan
 *     (idempotent).
 *   - Cot Orders.Status (chuoi tieng Viet) VAN GIU NGUYEN, chi bo sung them
 *     Orders.StatusCode + bang OrderStatuses va TRIGGER dong bo -> backend cu
 *     chay binh thuong, backend moi dung StatusCode.
 *
 * Cach chay: mo trong SSMS -> Execute (F5)
 *   hoac: sqlcmd -S <server> -d ShoegroupDB -i 01_ShoegroupDB_optimize_migration.sql
 * KHUYEN CAO: BACKUP DATABASE truoc khi chay.
 * ================================================================ */

USE [ShoegroupDB];
GO
SET NOCOUNT ON;
GO

PRINT N'>>> BUOC 0: Sao luu nhanh (tuy chon) - hay tu chay BACKUP DATABASE truoc khi tiep tuc.';
GO

/* ================================================================
 * BUOC 1 - INDEX CHO CAC COT KHOA NGOAI / COT LOC (muc 3.2 bao cao)
 * SQL Server KHONG tu tao index cho cot FK -> phai tao thu cong.
 * ================================================================ */
PRINT N'>>> BUOC 1: Tao index cho cac cot khoa ngoai / cot loc...';
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Orders_UserID' AND object_id=OBJECT_ID('dbo.Orders'))
    CREATE NONCLUSTERED INDEX IX_Orders_UserID ON dbo.Orders(UserID) INCLUDE (Status, OrderDate, TotalAmount);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Orders_Status_OrderDate' AND object_id=OBJECT_ID('dbo.Orders'))
    CREATE NONCLUSTERED INDEX IX_Orders_Status_OrderDate ON dbo.Orders(Status, OrderDate DESC) INCLUDE (UserID, TotalAmount, PaymentStatus);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Orders_OrderDate' AND object_id=OBJECT_ID('dbo.Orders'))
    CREATE NONCLUSTERED INDEX IX_Orders_OrderDate ON dbo.Orders(OrderDate DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Orders_AutoCancelDeadline' AND object_id=OBJECT_ID('dbo.Orders'))
    CREATE NONCLUSTERED INDEX IX_Orders_AutoCancelDeadline ON dbo.Orders(AutoCancelDeadline) WHERE AutoCancelDeadline IS NOT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Orders_RevenueEligibleDate' AND object_id=OBJECT_ID('dbo.Orders'))
    CREATE NONCLUSTERED INDEX IX_Orders_RevenueEligibleDate ON dbo.Orders(RevenueEligibleDate) WHERE RevenueEligibleDate IS NOT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_OrderDetails_OrderID' AND object_id=OBJECT_ID('dbo.OrderDetails'))
    CREATE NONCLUSTERED INDEX IX_OrderDetails_OrderID ON dbo.OrderDetails(OrderID) INCLUDE (ProductID, ProductVariantID, Quantity, UnitPrice);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_OrderDetails_ProductID' AND object_id=OBJECT_ID('dbo.OrderDetails'))
    CREATE NONCLUSTERED INDEX IX_OrderDetails_ProductID ON dbo.OrderDetails(ProductID);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_OrderDetails_ProductVariantID' AND object_id=OBJECT_ID('dbo.OrderDetails'))
    CREATE NONCLUSTERED INDEX IX_OrderDetails_ProductVariantID ON dbo.OrderDetails(ProductVariantID);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Products_CategoryID' AND object_id=OBJECT_ID('dbo.Products'))
    CREATE NONCLUSTERED INDEX IX_Products_CategoryID ON dbo.Products(CategoryID) INCLUDE (ProductName, BasePrice, SalePrice, IsActive);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Products_BrandID' AND object_id=OBJECT_ID('dbo.Products'))
    CREATE NONCLUSTERED INDEX IX_Products_BrandID ON dbo.Products(BrandID);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Products_CollectionID' AND object_id=OBJECT_ID('dbo.Products'))
    CREATE NONCLUSTERED INDEX IX_Products_CollectionID ON dbo.Products(CollectionID);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Products_MaterialID' AND object_id=OBJECT_ID('dbo.Products'))
    CREATE NONCLUSTERED INDEX IX_Products_MaterialID ON dbo.Products(MaterialID);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Products_SoleID' AND object_id=OBJECT_ID('dbo.Products'))
    CREATE NONCLUSTERED INDEX IX_Products_SoleID ON dbo.Products(SoleID);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Products_CushioningID' AND object_id=OBJECT_ID('dbo.Products'))
    CREATE NONCLUSTERED INDEX IX_Products_CushioningID ON dbo.Products(CushioningID);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Products_IsActive_Featured' AND object_id=OBJECT_ID('dbo.Products'))
    CREATE NONCLUSTERED INDEX IX_Products_IsActive_Featured ON dbo.Products(IsActive, IsFeatured) INCLUDE (ProductName, BasePrice, SalePrice, ImageURL);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_ProductVariants_Color_Size' AND object_id=OBJECT_ID('dbo.ProductVariants'))
    CREATE NONCLUSTERED INDEX IX_ProductVariants_Color_Size ON dbo.ProductVariants(ColorID, SizeID);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Users_PasswordResetToken' AND object_id=OBJECT_ID('dbo.Users'))
    CREATE NONCLUSTERED INDEX IX_Users_PasswordResetToken ON dbo.Users(PasswordResetToken) WHERE PasswordResetToken IS NOT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Users_RoleID' AND object_id=OBJECT_ID('dbo.Users'))
    CREATE NONCLUSTERED INDEX IX_Users_RoleID ON dbo.Users(RoleID);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_UserSessions_RememberToken' AND object_id=OBJECT_ID('dbo.UserSessions'))
    CREATE NONCLUSTERED INDEX IX_UserSessions_RememberToken ON dbo.UserSessions(RememberToken) WHERE RememberToken IS NOT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_UserAddresses_UserID' AND object_id=OBJECT_ID('dbo.UserAddresses'))
    CREATE NONCLUSTERED INDEX IX_UserAddresses_UserID ON dbo.UserAddresses(UserID, IsDefault);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Returns_OrderID' AND object_id=OBJECT_ID('dbo.Returns'))
    CREATE NONCLUSTERED INDEX IX_Returns_OrderID ON dbo.Returns(OrderID);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_ReturnDetails_ReturnID' AND object_id=OBJECT_ID('dbo.ReturnDetails'))
    CREATE NONCLUSTERED INDEX IX_ReturnDetails_ReturnID ON dbo.ReturnDetails(ReturnID);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_VariantDiscounts_Variant' AND object_id=OBJECT_ID('dbo.VariantDiscounts'))
    CREATE NONCLUSTERED INDEX IX_VariantDiscounts_Variant ON dbo.VariantDiscounts(ProductVariantID, IsActive);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_OrderStatusHistory_OrderID' AND object_id=OBJECT_ID('dbo.OrderStatusHistory'))
    CREATE NONCLUSTERED INDEX IX_OrderStatusHistory_OrderID ON dbo.OrderStatusHistory(OrderID, ChangedAt DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Notifications_User' AND object_id=OBJECT_ID('dbo.Notifications'))
    AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.Notifications') AND name='UserID')
    EXEC('CREATE NONCLUSTERED INDEX IX_Notifications_User ON dbo.Notifications(UserID)');
GO
PRINT N'    -> Da tao index.';
GO

/* ================================================================
 * BUOC 2 - CHUYEN CAC KHOA NGOAI "WITH NOCHECK" VE TRANG THAI TIN CAY
 * (muc 3.1 bao cao). Neu con du lieu mo coi -> script se IN CANH BAO
 * chu KHONG lam hong du lieu.
 * ================================================================ */
PRINT N'>>> BUOC 2: Kiem tra & lam "tin cay" cac khoa ngoai dang untrusted...';
GO
DECLARE @fk sysname, @tb sysname, @sqlText nvarchar(max);
DECLARE fk_cur CURSOR LOCAL FAST_FORWARD FOR
    SELECT fk.name, OBJECT_NAME(fk.parent_object_id)
    FROM sys.foreign_keys fk
    WHERE fk.is_not_trusted = 1 AND fk.is_disabled = 0;
OPEN fk_cur;
FETCH NEXT FROM fk_cur INTO @fk, @tb;
WHILE @@FETCH_STATUS = 0
BEGIN
    BEGIN TRY
        SET @sqlText = N'ALTER TABLE dbo.' + QUOTENAME(@tb) + N' WITH CHECK CHECK CONSTRAINT ' + QUOTENAME(@fk) + N';';
        EXEC sp_executesql @sqlText;
        PRINT N'    OK  -> ' + @tb + N'.' + @fk;
    END TRY
    BEGIN CATCH
        PRINT N'    CANH BAO: ' + @tb + N'.' + @fk + N' con du lieu mo coi -> can don du lieu truoc. Chi tiet: ' + ERROR_MESSAGE();
    END CATCH
    FETCH NEXT FROM fk_cur INTO @fk, @tb;
END
CLOSE fk_cur; DEALLOCATE fk_cur;
GO

-- Cau lenh tra cuu du lieu mo coi (chi chay khi buoc tren bao CANH BAO):
-- SELECT od.* FROM OrderDetails od LEFT JOIN ProductVariants v ON od.ProductVariantID = v.ProductVariantID
--   WHERE od.ProductVariantID IS NOT NULL AND v.ProductVariantID IS NULL;
GO

/* ================================================================
 * BUOC 3 - CHUAN HOA KIEU TIEN TE VE decimal(18,2) (muc 3.4 bao cao)
 * decimal(18,0) lam mat phan thap phan khi tinh giam gia / VAT.
 * Chuyen tu (18,0) -> (18,2) la MO RONG, khong mat du lieu.
 * ================================================================ */
PRINT N'>>> BUOC 3: Chuan hoa cac cot tien te ve decimal(18,2)...';
GO
DECLARE @c TABLE (TableName sysname, ColumnName sysname, IsNullable bit);
INSERT INTO @c (TableName, ColumnName, IsNullable)
SELECT OBJECT_NAME(c.object_id), c.name, c.is_nullable
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE t.name = 'decimal' AND c.scale = 0 AND c.precision = 18
  AND OBJECT_NAME(c.object_id) IN ('Orders','Products','ProductVariants','Returns','ShippingMethods','OrderDetails','Coupons','VariantDiscounts');

DECLARE @tbl sysname, @col sysname, @nullable bit, @stmt nvarchar(max);
DECLARE c_cur CURSOR LOCAL FAST_FORWARD FOR SELECT TableName, ColumnName, IsNullable FROM @c;
OPEN c_cur;
FETCH NEXT FROM c_cur INTO @tbl, @col, @nullable;
WHILE @@FETCH_STATUS = 0
BEGIN
    BEGIN TRY
        SET @stmt = N'ALTER TABLE dbo.' + QUOTENAME(@tbl) + N' ALTER COLUMN ' + QUOTENAME(@col) +
                    N' decimal(18,2) ' + CASE WHEN @nullable = 1 THEN N'NULL' ELSE N'NOT NULL' END + N';';
        EXEC sp_executesql @stmt;
        PRINT N'    OK  -> ' + @tbl + N'.' + @col + N' = decimal(18,2)';
    END TRY
    BEGIN CATCH
        PRINT N'    CANH BAO: khong doi duoc ' + @tbl + N'.' + @col + N' : ' + ERROR_MESSAGE();
    END CATCH
    FETCH NEXT FROM c_cur INTO @tbl, @col, @nullable;
END
CLOSE c_cur; DEALLOCATE c_cur;
GO

/* ================================================================
 * BUOC 4 - BANG TRANG THAI DON HANG (muc 3.5 bao cao)
 * Cach lam AN TOAN: giu nguyen cot Orders.Status (chuoi tieng Viet)
 * cho code cu; THEM cot Orders.StatusCode + bang tra cuu OrderStatuses
 * + trigger tu dong dong bo hai chieu gia tri.
 * => Code cu KHONG hong, code moi loc bang StatusCode chinh xac 100%.
 * ================================================================ */
PRINT N'>>> BUOC 4: Tao bang OrderStatuses + cot StatusCode (khong pha code cu)...';
GO
IF OBJECT_ID('dbo.OrderStatuses','U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderStatuses(
        StatusID    int IDENTITY(1,1) NOT NULL CONSTRAINT PK_OrderStatuses PRIMARY KEY,
        Code        varchar(30)   NOT NULL CONSTRAINT UQ_OrderStatuses_Code UNIQUE,
        DisplayName nvarchar(50)  NOT NULL,
        SortOrder   int           NOT NULL CONSTRAINT DF_OrderStatuses_SortOrder DEFAULT(0),
        IsFinal     bit           NOT NULL CONSTRAINT DF_OrderStatuses_IsFinal   DEFAULT(0),
        IsActive    bit           NOT NULL CONSTRAINT DF_OrderStatuses_IsActive  DEFAULT(1)
    );
END
GO
MERGE dbo.OrderStatuses AS t
USING (VALUES
    ('PENDING',   N'Chờ xác nhận',               10, 0),
    ('CONFIRMED', N'Đã xác nhận',                20, 0),
    ('PACKING',   N'Đang chuẩn bị hàng',         30, 0),
    ('SHIPPING',  N'Đang giao hàng',             40, 0),
    ('DELIVERED', N'Đã giao hàng thành công',    50, 0),
    ('RECEIVED',  N'Đã nhận hàng',               60, 1),
    ('CANCELLED', N'Đã hủy',                     70, 1),
    ('RETURNED',  N'Đã trả hàng',                80, 1)
) AS s(Code, DisplayName, SortOrder, IsFinal)
ON t.Code = s.Code
WHEN NOT MATCHED THEN INSERT (Code, DisplayName, SortOrder, IsFinal) VALUES (s.Code, s.DisplayName, s.SortOrder, s.IsFinal);
GO

IF COL_LENGTH('dbo.Orders','StatusCode') IS NULL
    ALTER TABLE dbo.Orders ADD StatusCode varchar(30) NULL;
GO
IF COL_LENGTH('dbo.Orders','PaymentStatusCode') IS NULL
    ALTER TABLE dbo.Orders ADD PaymentStatusCode varchar(30) NULL;
GO

/* Ham chuyen chuoi tieng Viet (co dau / khong dau / hoa thuong) -> ma chuan */
IF OBJECT_ID('dbo.fn_MapOrderStatusCode','FN') IS NOT NULL DROP FUNCTION dbo.fn_MapOrderStatusCode;
GO
CREATE FUNCTION dbo.fn_MapOrderStatusCode(@status nvarchar(100))
RETURNS varchar(30)
AS
BEGIN
    DECLARE @s nvarchar(100) = LOWER(LTRIM(RTRIM(ISNULL(@status, N''))));
    RETURN CASE
        WHEN @s IN (N'đã hủy', N'da huy', N'huỷ', N'huy', N'cancelled', N'canceled')            THEN 'CANCELLED'
        WHEN @s IN (N'đã nhận hàng', N'da nhan hang', N'received')                              THEN 'RECEIVED'
        WHEN @s IN (N'đã giao hàng thành công', N'da giao hang thanh cong', N'đã giao hàng',
                    N'da giao hang', N'delivered')                                              THEN 'DELIVERED'
        WHEN @s IN (N'đang giao hàng', N'dang giao hang', N'shipping')                          THEN 'SHIPPING'
        WHEN @s IN (N'đang chuẩn bị hàng', N'dang chuan bi hang', N'đang đóng gói', N'packing') THEN 'PACKING'
        WHEN @s IN (N'đã xác nhận', N'da xac nhan', N'confirmed')                               THEN 'CONFIRMED'
        WHEN @s IN (N'đã trả hàng', N'da tra hang', N'returned', N'hoàn hàng', N'hoan hang')    THEN 'RETURNED'
        WHEN @s IN (N'chờ xác nhận', N'cho xac nhan', N'pending', N'')                          THEN 'PENDING'
        ELSE 'PENDING'
    END;
END;
GO

IF OBJECT_ID('dbo.fn_MapPaymentStatusCode','FN') IS NOT NULL DROP FUNCTION dbo.fn_MapPaymentStatusCode;
GO
CREATE FUNCTION dbo.fn_MapPaymentStatusCode(@status nvarchar(100))
RETURNS varchar(30)
AS
BEGIN
    DECLARE @s nvarchar(100) = LOWER(LTRIM(RTRIM(ISNULL(@status, N''))));
    RETURN CASE
        WHEN @s IN (N'đã thanh toán', N'da thanh toan', N'paid')                    THEN 'PAID'
        WHEN @s IN (N'đã hoàn tiền', N'da hoan tien', N'refunded')                  THEN 'REFUNDED'
        WHEN @s IN (N'thanh toán một phần', N'thanh toan mot phan', N'partial')     THEN 'PARTIAL'
        ELSE 'UNPAID'
    END;
END;
GO

-- Backfill du lieu cu
UPDATE dbo.Orders
   SET StatusCode        = dbo.fn_MapOrderStatusCode(Status),
       PaymentStatusCode = dbo.fn_MapPaymentStatusCode(PaymentStatus)
 WHERE StatusCode IS NULL OR PaymentStatusCode IS NULL;
GO

-- Trigger dong bo: backend CU chi ghi cot Status (text) -> trigger tu dien StatusCode
IF OBJECT_ID('dbo.trg_Orders_SyncStatusCode','TR') IS NOT NULL DROP TRIGGER dbo.trg_Orders_SyncStatusCode;
GO
CREATE TRIGGER dbo.trg_Orders_SyncStatusCode
ON dbo.Orders
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT (UPDATE(Status) OR UPDATE(PaymentStatus)) RETURN;
    UPDATE o
       SET o.StatusCode        = dbo.fn_MapOrderStatusCode(o.Status),
           o.PaymentStatusCode = dbo.fn_MapPaymentStatusCode(o.PaymentStatus),
           o.UpdatedAt         = GETDATE()
      FROM dbo.Orders o
      JOIN inserted i ON i.OrderID = o.OrderID;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Orders_StatusCode' AND object_id=OBJECT_ID('dbo.Orders'))
    CREATE NONCLUSTERED INDEX IX_Orders_StatusCode ON dbo.Orders(StatusCode, OrderDate DESC) INCLUDE (UserID, TotalAmount);
GO

-- View tien dung cho bao cao doanh thu (khong anh huong code cu)
IF OBJECT_ID('dbo.vw_OrdersWithStatus','V') IS NOT NULL DROP VIEW dbo.vw_OrdersWithStatus;
GO
CREATE VIEW dbo.vw_OrdersWithStatus
AS
SELECT o.*, s.DisplayName AS StatusDisplayName, s.IsFinal AS StatusIsFinal
FROM dbo.Orders o
LEFT JOIN dbo.OrderStatuses s ON s.Code = o.StatusCode;
GO

/* ================================================================
 * BUOC 5 - RANG BUOC TOAN VEN DU LIEU (chi them khi du lieu hien tai hop le)
 * ================================================================ */
PRINT N'>>> BUOC 5: Them CHECK constraint an toan...';
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_OrderDetails_Quantity')
   AND NOT EXISTS (SELECT 1 FROM dbo.OrderDetails WHERE Quantity IS NOT NULL AND Quantity <= 0)
    ALTER TABLE dbo.OrderDetails WITH CHECK ADD CONSTRAINT CK_OrderDetails_Quantity CHECK (Quantity IS NULL OR Quantity > 0);
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_OrderDetails_UnitPrice')
   AND NOT EXISTS (SELECT 1 FROM dbo.OrderDetails WHERE UnitPrice IS NOT NULL AND UnitPrice < 0)
    ALTER TABLE dbo.OrderDetails WITH CHECK ADD CONSTRAINT CK_OrderDetails_UnitPrice CHECK (UnitPrice IS NULL OR UnitPrice >= 0);
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_ProductVariants_Stock')
   AND NOT EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE StockQuantity < 0)
    ALTER TABLE dbo.ProductVariants WITH CHECK ADD CONSTRAINT CK_ProductVariants_Stock CHECK (StockQuantity >= 0);
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_Products_BasePrice')
   AND NOT EXISTS (SELECT 1 FROM dbo.Products WHERE BasePrice < 0)
    ALTER TABLE dbo.Products WITH CHECK ADD CONSTRAINT CK_Products_BasePrice CHECK (BasePrice >= 0);
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_Orders_TotalAmount')
   AND NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE TotalAmount < 0)
    ALTER TABLE dbo.Orders WITH CHECK ADD CONSTRAINT CK_Orders_TotalAmount CHECK (TotalAmount >= 0);
GO

-- SKU bien the khong duoc trung (chi tao khi du lieu hien tai khong trung)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UQ_ProductVariants_ChildSKU' AND object_id=OBJECT_ID('dbo.ProductVariants'))
   AND NOT EXISTS (SELECT ChildSKU FROM dbo.ProductVariants WHERE ChildSKU IS NOT NULL GROUP BY ChildSKU HAVING COUNT(*) > 1)
    CREATE UNIQUE NONCLUSTERED INDEX UQ_ProductVariants_ChildSKU ON dbo.ProductVariants(ChildSKU) WHERE ChildSKU IS NOT NULL;
GO
-- Moi san pham chi co 1 to hop mau + size (tranh nhap trung ton kho)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UQ_ProductVariants_Product_Color_Size' AND object_id=OBJECT_ID('dbo.ProductVariants'))
   AND NOT EXISTS (SELECT ProductID, ColorID, SizeID FROM dbo.ProductVariants
                    WHERE ColorID IS NOT NULL AND SizeID IS NOT NULL
                    GROUP BY ProductID, ColorID, SizeID HAVING COUNT(*) > 1)
    CREATE UNIQUE NONCLUSTERED INDEX UQ_ProductVariants_Product_Color_Size
        ON dbo.ProductVariants(ProductID, ColorID, SizeID) WHERE ColorID IS NOT NULL AND SizeID IS NOT NULL;
GO

/* ================================================================
 * BUOC 6 - HO TRO MAT KHAU BAM (bcrypt/scrypt) - muc 2.1 bao cao
 * Cot PasswordHash hien la varchar(255) -> du cho bcrypt/scrypt.
 * Them cot danh dau thuat toan + moc thoi gian nang cap (khong bat buoc
 * doi voi code cu vi deu cho phep NULL).
 * ================================================================ */
PRINT N'>>> BUOC 6: Bo sung cot ho tro bam mat khau...';
GO
IF COL_LENGTH('dbo.Users','PasswordAlgo') IS NULL
    ALTER TABLE dbo.Users ADD PasswordAlgo varchar(20) NULL;   -- 'scrypt' | 'bcrypt' | 'plain'
GO
IF COL_LENGTH('dbo.Users','FailedLoginCount') IS NULL
    ALTER TABLE dbo.Users ADD FailedLoginCount int NULL CONSTRAINT DF_Users_FailedLoginCount DEFAULT(0);
GO
IF COL_LENGTH('dbo.Users','LockoutUntil') IS NULL
    ALTER TABLE dbo.Users ADD LockoutUntil datetime NULL;
GO
-- Danh dau cac tai khoan dang luu mat khau THO de backend tu nang cap khi dang nhap
UPDATE dbo.Users
   SET PasswordAlgo = CASE
        WHEN PasswordHash LIKE 'scrypt$%' THEN 'scrypt'
        WHEN PasswordHash LIKE '$2a$%' OR PasswordHash LIKE '$2b$%' OR PasswordHash LIKE '$2y$%' THEN 'bcrypt'
        ELSE 'plain' END
 WHERE PasswordAlgo IS NULL;
GO
PRINT N'    LUU Y: mat khau cu (plain) se tu dong duoc bam lai o lan dang nhap ke tiep (backend moi).';
GO

/* ================================================================
 * BUOC 7 - THONG KE & KIEM TRA CUOI
 * ================================================================ */
PRINT N'>>> BUOC 7: Cap nhat statistics...';
GO
EXEC sp_updatestats;
GO

PRINT N'================ KET QUA ================';
SELECT 'So index phu' AS ChiTieu, COUNT(*) AS GiaTri FROM sys.indexes WHERE object_id > 100 AND type_desc='NONCLUSTERED'
UNION ALL SELECT 'FK untrusted con lai', COUNT(*) FROM sys.foreign_keys WHERE is_not_trusted = 1
UNION ALL SELECT 'Cot tien decimal(18,0) con lai', COUNT(*) FROM sys.columns c JOIN sys.types t ON c.user_type_id=t.user_type_id WHERE t.name='decimal' AND c.precision=18 AND c.scale=0
UNION ALL SELECT 'Tai khoan mat khau tho (plain)', COUNT(*) FROM dbo.Users WHERE PasswordAlgo='plain';
GO
PRINT N'>>> HOAN TAT TOI UU CSDL ShoegroupDB.';
GO
