/* =====================================================================
   ShoeGroup - SCRIPT SUA LOI CO SO DU LIEU (dbnew.sql)
   ---------------------------------------------------------------------
   CHI CHUA CAC LENH SUA LOI - KHONG tao lai bang, KHONG dung du lieu that.
   Chay tren SSMS theo dung thu tu tung PHAN. Moi phan doc lap, chay lai
   nhieu lan van an toan (idempotent).

   SAO LUU TRUOC KHI CHAY:
     BACKUP DATABASE [ShoegroupDB] TO DISK = N'D:\\backup\\ShoegroupDB.bak'
   ===================================================================== */
USE [ShoegroupDB];
GO
SET NOCOUNT ON;
GO

/* =====================================================================
   PHAN 1 - BANG Roles THIEU DONG => CRUD TAI KHOAN LUON BAO LOI
   ---------------------------------------------------------------------
   Roles hien chi co: 1 = Admin, 2 = Customer.
   Code admin tung gan mac dinh role_id = 3 (Nhan vien) -> vi pham khoa
   ngoai Users.RoleID -> moi thao tac them/sua tai khoan deu that bai.
   ===================================================================== */
SET IDENTITY_INSERT [dbo].[Roles] ON;
IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [RoleID] = 3)
    INSERT [dbo].[Roles] ([RoleID], [RoleName]) VALUES (3, N'Nhan vien');
SET IDENTITY_INSERT [dbo].[Roles] OFF;
GO

-- Dua moi tai khoan dang tro toi RoleID khong ton tai ve Customer (2)
UPDATE u
SET u.[RoleID] = 2
FROM [dbo].[Users] u
WHERE u.[RoleID] IS NULL
   OR NOT EXISTS (SELECT 1 FROM [dbo].[Roles] r WHERE r.[RoleID] = u.[RoleID]);
GO

/* =====================================================================
   PHAN 2 - LOI BIEN THE & SO LUONG = 0
   ===================================================================== */

/* 2.1 - Xoa bien the RAC: khong co ca mau lan size (khong bao gio ban duoc,
         nhung van hien ra bang bien the voi ton = 0). */
DELETE FROM [dbo].[ProductVariants]
WHERE ISNULL([Size], N'') = N''
  AND ISNULL([ColorName], N'') = N''
  AND NOT EXISTS (SELECT 1 FROM [dbo].[OrderDetails] od
                  WHERE od.[ProductVariantID] = [dbo].[ProductVariants].[ProductVariantID]);
GO

/* 2.2 - GOP BIEN THE TRUNG (cung ProductID + Mau + Size).
         Backend cu khong gui ChildSKU nen moi lan bam Luu lai INSERT them
         mot dong moi -> dong cu giu ton kho that, dong moi ton = 0.
         Giu lai dong CO ID NHO NHAT, cong don ton kho cua cac dong trung. */
;WITH g AS (
    SELECT MIN([ProductVariantID]) AS KeepID,
           [ProductID],
           ISNULL([ColorName], N'') AS C,
           ISNULL([Size], N'')      AS S,
           SUM([StockQuantity])     AS TotalStock,
           COUNT(*)                 AS N
    FROM [dbo].[ProductVariants]
    GROUP BY [ProductID], ISNULL([ColorName], N''), ISNULL([Size], N'')
    HAVING COUNT(*) > 1
)
UPDATE v SET v.[StockQuantity] = g.TotalStock
FROM [dbo].[ProductVariants] v
JOIN g ON g.KeepID = v.[ProductVariantID];
GO

-- Chuyen OrderDetails dang tro vao ban trung sang ban duoc giu lai
;WITH keeper AS (
    SELECT [ProductVariantID],
           MIN([ProductVariantID]) OVER (
               PARTITION BY [ProductID], ISNULL([ColorName], N''), ISNULL([Size], N'')
           ) AS KeepID
    FROM [dbo].[ProductVariants]
)
UPDATE od
SET od.[ProductVariantID] = k.KeepID
FROM [dbo].[OrderDetails] od
JOIN keeper k ON k.[ProductVariantID] = od.[ProductVariantID]
WHERE k.KeepID <> od.[ProductVariantID];
GO

-- Xoa cac ban trung con lai
;WITH dup AS (
    SELECT [ProductVariantID],
           ROW_NUMBER() OVER (
               PARTITION BY [ProductID], ISNULL([ColorName], N''), ISNULL([Size], N'')
               ORDER BY [ProductVariantID]
           ) AS rn
    FROM [dbo].[ProductVariants]
)
DELETE FROM [dbo].[ProductVariants]
WHERE [ProductVariantID] IN (SELECT [ProductVariantID] FROM dup WHERE rn > 1);
GO

/* 2.3 - CHAN LOI TAI PHAT: bat buoc (ProductID + Mau + Size) la duy nhat.
         Tu nay backend co gui lap cung khong the tao them ban trung. */
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'UQ_ProductVariants_Product_Color_Size'
                 AND object_id = OBJECT_ID('dbo.ProductVariants'))
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_ProductVariants_Product_Color_Size]
        ON [dbo].[ProductVariants]([ProductID], [ColorName], [Size]);
GO

/* 2.4 - StockQuantity: chan gia tri am + dat gia tri mac dinh la 0 */
UPDATE [dbo].[ProductVariants] SET [StockQuantity] = 0 WHERE [StockQuantity] < 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints
               WHERE [parent_object_id] = OBJECT_ID('dbo.ProductVariants')
                 AND [name] = 'CK_ProductVariants_Stock_NonNegative')
    ALTER TABLE [dbo].[ProductVariants] WITH CHECK
        ADD CONSTRAINT [CK_ProductVariants_Stock_NonNegative] CHECK ([StockQuantity] >= 0);
GO

/* LUU Y: phai kiem tra theo COT chu khong theo TEN rang buoc.
   Cac DEFAULT co san trong DB deu mang ten tu sinh kieu DF__ProductVa__Stock__1A2B3C4D
   nen kiem tra theo ten se luon "khong thay" roi bao loi 1781. */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns c
    WHERE c.[object_id] = OBJECT_ID('dbo.ProductVariants')
      AND c.[name] = 'StockQuantity'
      AND c.[default_object_id] <> 0)
    ALTER TABLE [dbo].[ProductVariants]
        ADD CONSTRAINT [DF_ProductVariants_StockQuantity] DEFAULT ((0)) FOR [StockQuantity];
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns c
    WHERE c.[object_id] = OBJECT_ID('dbo.ProductVariants')
      AND c.[name] = 'IsActive'
      AND c.[default_object_id] <> 0)
    ALTER TABLE [dbo].[ProductVariants]
        ADD CONSTRAINT [DF_ProductVariants_IsActive] DEFAULT ((1)) FOR [IsActive];
GO

UPDATE [dbo].[ProductVariants] SET [IsActive] = 1 WHERE [IsActive] IS NULL;
GO

/* 2.5 - Sinh ChildSKU cho bien the con thieu.
         Backend doi chieu ban ghi cu theo SKU; SKU NULL -> luon tao ban moi. */
UPDATE v
SET v.[ChildSKU] = LEFT(
        'SKU-' + CAST(v.[ProductID] AS varchar(10)) + '-'
              + CAST(v.[ProductVariantID] AS varchar(10)), 60)
FROM [dbo].[ProductVariants] v
WHERE ISNULL(v.[ChildSKU], '') = '';
GO

/* =====================================================================
   PHAN 3 - SIZE SAI CHUAN (shop GIAY nhung dang co size AO)
   ---------------------------------------------------------------------
   Bang Sizes chi khai bao 38..45 (EU) nhung ProductVariants dang chua
   N'M', N'L', N'XL' va N'36'. Frontend loc theo danh sach size giay nen
   nhung bien the nay khong bao gio hien ra -> nhin nhu "khong co bien the".
   ===================================================================== */

-- 3.1 Bo sung size con thieu vao bang Sizes (36, 37, 46)
SET IDENTITY_INSERT [dbo].[Sizes] ON;
INSERT INTO [dbo].[Sizes] ([SizeID], [SizeName], [SizeStandard], [IsActive], [SortOrder])
SELECT s.SizeID, s.SizeName, N'EU', 1, s.SortOrder
FROM (VALUES (20, N'36', 0), (21, N'37', 1), (22, N'46', 9)) AS s(SizeID, SizeName, SortOrder)
WHERE NOT EXISTS (SELECT 1 FROM [dbo].[Sizes] z WHERE z.[SizeName] = s.SizeName);
SET IDENTITY_INSERT [dbo].[Sizes] OFF;
GO

-- 3.2 Xem truoc cac bien the dang deo size ao (chay de kiem tra, khong sua gi)
SELECT v.[ProductVariantID], v.[ProductID], p.[ProductName], v.[ColorName],
       v.[Size], v.[StockQuantity]
FROM [dbo].[ProductVariants] v
LEFT JOIN [dbo].[Products] p ON p.[ProductID] = v.[ProductID]
WHERE v.[Size] IN (N'S', N'M', N'L', N'XL', N'XXL');
GO

-- 3.3 Vo hieu hoa (khong xoa - van giu lich su don hang cu)
UPDATE [dbo].[ProductVariants]
SET [IsActive] = 0
WHERE [Size] IN (N'S', N'M', N'L', N'XL', N'XXL');
GO

/* 3.4 - Noi ProductVariants voi Sizes / Colors.
         Hien 87/89 dong co SizeID = NULL nen khong the loc theo bang Sizes. */
UPDATE v
SET v.[SizeID] = s.[SizeID]
FROM [dbo].[ProductVariants] v
JOIN [dbo].[Sizes] s ON s.[SizeName] = v.[Size]
WHERE v.[SizeID] IS NULL;
GO

UPDATE v
SET v.[ColorID] = c.[ColorID]
FROM [dbo].[ProductVariants] v
JOIN [dbo].[Colors] c ON c.[ColorName] = v.[ColorName]
WHERE v.[ColorID] IS NULL;
GO

-- Bo sung mau con thieu trong bang Colors roi noi lai
INSERT INTO [dbo].[Colors] ([ColorName], [ColorHex], [IsActive], [SortOrder])
SELECT DISTINCT v.[ColorName], ISNULL(MAX(v.[ColorHex]), ''), 1, 99
FROM [dbo].[ProductVariants] v
WHERE ISNULL(v.[ColorName], N'') <> N''
  AND NOT EXISTS (SELECT 1 FROM [dbo].[Colors] c WHERE c.[ColorName] = v.[ColorName])
GROUP BY v.[ColorName];
GO

UPDATE v
SET v.[ColorID] = c.[ColorID]
FROM [dbo].[ProductVariants] v
JOIN [dbo].[Colors] c ON c.[ColorName] = v.[ColorName]
WHERE v.[ColorID] IS NULL;
GO

/* =====================================================================
   PHAN 4 - DU LIEU FIX CUNG TRONG RANG BUOC MAC DINH (nguy hiem nhat)
   ---------------------------------------------------------------------
   OrderDetails dang co: DEFAULT ('42') FOR [Size]
                         DEFAULT (N'Mac dinh') FOR [Color]
   => Don hang khong gui size se AM THAM duoc ghi la size 42.
      Day la ly do trong kho tru sai va bao cao size bi lech.
   ===================================================================== */
DECLARE @df sysname;

SELECT @df = d.name FROM sys.default_constraints d
JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id
WHERE d.parent_object_id = OBJECT_ID('dbo.OrderDetails') AND c.name = 'Size';
IF @df IS NOT NULL EXEC('ALTER TABLE [dbo].[OrderDetails] DROP CONSTRAINT [' + @df + ']');

SET @df = NULL;
SELECT @df = d.name FROM sys.default_constraints d
JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id
WHERE d.parent_object_id = OBJECT_ID('dbo.OrderDetails') AND c.name = 'Color';
IF @df IS NOT NULL EXEC('ALTER TABLE [dbo].[OrderDetails] DROP CONSTRAINT [' + @df + ']');
GO

-- Products.ImageURL dang mac dinh bang mot anh Unsplash co dinh -> bo di
DECLARE @df2 sysname;
SELECT @df2 = d.name FROM sys.default_constraints d
JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id
WHERE d.parent_object_id = OBJECT_ID('dbo.Products') AND c.name = 'ImageURL';
IF @df2 IS NOT NULL EXEC('ALTER TABLE [dbo].[Products] DROP CONSTRAINT [' + @df2 + ']');
GO

/* =====================================================================
   PHAN 5 - DON HANG: THIEU DU LIEU DE PHAN LOAI VA SAP XEP
   ===================================================================== */

-- 5.1 PaymentStatus NULL (2 don) -> frontend hien o trong
UPDATE [dbo].[Orders]
SET [PaymentStatus] = CASE
        WHEN [Status] IN (N'Da giao hang thanh cong', N'Đã giao hàng thành công',
                          N'Da nhan hang', N'Đã nhận hàng') THEN N'Đã thanh toán'
        ELSE N'Chưa thanh toán' END
WHERE [PaymentStatus] IS NULL;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns c
    WHERE c.[object_id] = OBJECT_ID('dbo.Orders')
      AND c.[name] = 'PaymentStatus'
      AND c.[default_object_id] <> 0)
    ALTER TABLE [dbo].[Orders]
        ADD CONSTRAINT [DF_Orders_PaymentStatus] DEFAULT (N'Chưa thanh toán') FOR [PaymentStatus];
GO

/* 5.2 - HandledBy NULL o 11/13 don.
         Frontend dung HandledBy de phan biet don TAI QUAY vs ONLINE.
         NULL het -> tab Offline/Online chia sai. Suy nguoc tu du lieu cu:
         khong co UserID va khong co dia chi giao = don ban tai quay. */
UPDATE [dbo].[Orders]
SET [HandledBy] = N'POS'
WHERE [HandledBy] IS NULL
  AND [UserID] IS NULL
  AND ISNULL([ShippingAddress], N'') IN (N'', N'Chua cap nhat dia chi', N'Chưa cập nhật');
GO

UPDATE [dbo].[Orders] SET [HandledBy] = N'ONLINE' WHERE [HandledBy] IS NULL;
GO

-- 5.3 OrderDate NULL -> new Date() ra Invalid Date -> khong sap xep duoc
UPDATE [dbo].[Orders] SET [OrderDate] = GETDATE() WHERE [OrderDate] IS NULL;
GO

-- 5.4 Sap xep "moi nhat len dau" dang quet toan bang vi thieu chi muc
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_Orders_OrderDate' AND object_id = OBJECT_ID('dbo.Orders'))
    CREATE NONCLUSTERED INDEX [IX_Orders_OrderDate]
        ON [dbo].[Orders]([OrderDate] DESC, [OrderID] DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_OrderDetails_Order' AND object_id = OBJECT_ID('dbo.OrderDetails'))
    CREATE NONCLUSTERED INDEX [IX_OrderDetails_Order]
        ON [dbo].[OrderDetails]([OrderID]) INCLUDE ([ProductID], [ProductVariantID], [Quantity]);
GO

/* =====================================================================
   PHAN 6 - OrderDetails.ProductVariantID BI NULL (8/11 dong)
   ---------------------------------------------------------------------
   Khong biet don da ban bien the nao -> backend khong tru duoc ton kho
   -> ton kho khong bao gio ve 0 -> Thong ke khong the bao "het hang".
   Doi chieu nguoc theo ProductID + Size + Color de va lai.
   ===================================================================== */
UPDATE od
SET od.[ProductVariantID] = v.[ProductVariantID]
FROM [dbo].[OrderDetails] od
CROSS APPLY (
    SELECT TOP 1 x.[ProductVariantID]
    FROM [dbo].[ProductVariants] x
    WHERE x.[ProductID] = od.[ProductID]
      AND (ISNULL(od.[Size], N'')  = N'' OR ISNULL(x.[Size], N'')      = od.[Size])
      AND (ISNULL(od.[Color], N'') = N'' OR ISNULL(x.[ColorName], N'') = od.[Color])
    ORDER BY x.[ProductVariantID]
) v
WHERE od.[ProductVariantID] IS NULL
  AND od.[ProductID] IS NOT NULL;
GO

-- Con dong nao chua va duoc thi liet ke ra de sua tay
SELECT [OrderDetailID], [OrderID], [ProductID], [Size], [Color], [ProductNameSnapshot]
FROM [dbo].[OrderDetails]
WHERE [ProductVariantID] IS NULL;
GO

/* =====================================================================
   PHAN 7 - BANG SAO LUU TAM CON SOT LAI
   ---------------------------------------------------------------------
   5 bang bak_*_20260804 lam nang DB va de bi JOIN nham. Sau khi da
   kiem tra du lieu that on dinh thi BO COMMENT de xoa.
   ===================================================================== */
-- DROP TABLE IF EXISTS [dbo].[bak_Categories_20260804];
-- DROP TABLE IF EXISTS [dbo].[bak_OrderDetails_20260804];
-- DROP TABLE IF EXISTS [dbo].[bak_Orders_20260804];
-- DROP TABLE IF EXISTS [dbo].[bak_Products_SoleCushion_20260804];
-- DROP TABLE IF EXISTS [dbo].[bak_ProductVariants_20260804];
GO

/* =====================================================================
   PHAN 8 - KIEM TRA LAI SAU KHI CHAY
   ===================================================================== */
SELECT N'Bien the trung con lai' AS KiemTra, COUNT(*) AS SoDong
FROM (
    SELECT [ProductID], ISNULL([ColorName], N'') C, ISNULL([Size], N'') S
    FROM [dbo].[ProductVariants]
    GROUP BY [ProductID], ISNULL([ColorName], N''), ISNULL([Size], N'')
    HAVING COUNT(*) > 1
) t
UNION ALL SELECT N'Bien the ton = 0', COUNT(*) FROM [dbo].[ProductVariants]
          WHERE [StockQuantity] = 0 AND ISNULL([IsActive], 1) = 1
UNION ALL SELECT N'Bien the chua noi Sizes', COUNT(*) FROM [dbo].[ProductVariants]
          WHERE [SizeID] IS NULL AND ISNULL([IsActive], 1) = 1
UNION ALL SELECT N'San pham khong co bien the', COUNT(*) FROM [dbo].[Products] p
          WHERE NOT EXISTS (SELECT 1 FROM [dbo].[ProductVariants] v WHERE v.[ProductID] = p.[ProductID])
UNION ALL SELECT N'Don thieu OrderDate', COUNT(*) FROM [dbo].[Orders] WHERE [OrderDate] IS NULL
UNION ALL SELECT N'Don thieu HandledBy', COUNT(*) FROM [dbo].[Orders] WHERE [HandledBy] IS NULL
UNION ALL SELECT N'OrderDetails thieu bien the', COUNT(*) FROM [dbo].[OrderDetails] WHERE [ProductVariantID] IS NULL
UNION ALL SELECT N'Tai khoan sai RoleID', COUNT(*) FROM [dbo].[Users] u
          WHERE NOT EXISTS (SELECT 1 FROM [dbo].[Roles] r WHERE r.[RoleID] = u.[RoleID]);
GO

-- Danh sach dang HET HANG (dung de doi chieu voi trang Thong ke)
SELECT p.[ProductName], v.[ColorName], v.[Size], v.[StockQuantity]
FROM [dbo].[ProductVariants] v
JOIN [dbo].[Products] p ON p.[ProductID] = v.[ProductID]
WHERE ISNULL(v.[IsActive], 1) = 1 AND v.[StockQuantity] <= 0
ORDER BY p.[ProductName], v.[ColorName], v.[Size];
GO
