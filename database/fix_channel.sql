/* =====================================================================
   FIX BO SUNG - PHAN LOAI DON ONLINE / TAI QUAY (OFFLINE)
   File nay VA LOI DO CHINH SCRIPT fix_dbnew.sql TRUOC DO GAY RA.

   Nguyen nhan: Phan 5.2 cua script cu da dien HandledBy = N'ONLINE'
   cho 11 don hang web. Nhung frontend lai coi "HandledBy co gia tri"
   dong nghia voi "don ban tai quay", nen ca 13 don bi don het sang
   tab Offline, tab Online con 0 don.

   Cach xu ly: HandledBy chi duoc dien khi don THUC SU ban tai quay.
   Don online phai de NULL.

   Chay toan bo file. An toan, chay lai nhieu lan khong sao.
   ===================================================================== */
USE [ShoegroupDB];
GO

/* ---------------------------------------------------------------------
   BUOC 0 - XEM TINH TRANG HIEN TAI TRUOC KHI SUA
   --------------------------------------------------------------------- */
SELECT
    [OrderID],
    [HandledBy],
    [UserID],
    LEFT(ISNULL([ShippingAddress], N''), 40) AS [DiaChiGiao],
    [PaymentMethod],
    [Status]
FROM [dbo].[Orders]
ORDER BY [OrderID];
GO

/* ---------------------------------------------------------------------
   BUOC 1 - TRA LAI NULL CHO CAC DON ONLINE BI DIEN NHAM

   Khong chi xoa nhan 'ONLINE' ma con don dep cac nhan rac khac
   ('WEB', 'WEBSITE', 'SYSTEM', chuoi rong) - tat ca deu khong phai
   ten nhan vien ban hang that.
   --------------------------------------------------------------------- */
UPDATE [dbo].[Orders]
SET [HandledBy] = NULL
WHERE [HandledBy] IS NOT NULL
  AND UPPER(LTRIM(RTRIM([HandledBy]))) IN (N'ONLINE', N'WEB', N'WEBSITE', N'SYSTEM', N'HE THONG', N'HỆ THỐNG', N'');
GO

PRINT N'Buoc 1: da tra ve NULL cho cac don online bi dien nham nhan.';
GO

/* ---------------------------------------------------------------------
   BUOC 2 - DANH DAU DUNG CAC DON BAN TAI QUAY

   Dac diem nhan dang don tai quay:
     - KHONG co tai khoan khach (UserID IS NULL), VA
     - KHONG co dia chi giao hang thuc te, VA
     - Da thanh toan xong ngay tai cho
   Nhung don nay duoc gan nhan N'Quay' de hien o tab Offline.
   --------------------------------------------------------------------- */
UPDATE [dbo].[Orders]
SET [HandledBy] = N'Quầy'
WHERE [HandledBy] IS NULL
  AND [UserID] IS NULL
  AND (
        [ShippingAddress] IS NULL
     OR LTRIM(RTRIM([ShippingAddress])) = N''
     OR [ShippingAddress] LIKE N'Chưa cập nhật%'
     OR [ShippingAddress] LIKE N'Chua cap nhat%'
  );
GO

PRINT N'Buoc 2: da gan nhan Quay cho cac don ban truc tiep.';
GO

/* ---------------------------------------------------------------------
   BUOC 3 - DON ONLINE PHAI CO DIA CHI GIAO HANG

   Neu don co tai khoan khach nhung dia chi bi trong, lay dia chi
   trong ho so nguoi dung de tranh bi nham thanh don tai quay.
   --------------------------------------------------------------------- */
UPDATE o
SET o.[ShippingAddress] = u.[Address]
FROM [dbo].[Orders] o
INNER JOIN [dbo].[Users] u ON u.[UserID] = o.[UserID]
WHERE o.[UserID] IS NOT NULL
  AND u.[Address] IS NOT NULL
  AND LTRIM(RTRIM(u.[Address])) <> N''
  AND (
        o.[ShippingAddress] IS NULL
     OR LTRIM(RTRIM(o.[ShippingAddress])) = N''
     OR o.[ShippingAddress] LIKE N'Chưa cập nhật%'
     OR o.[ShippingAddress] LIKE N'Chua cap nhat%'
  );
GO

PRINT N'Buoc 3: da bo sung dia chi giao cho don online thieu dia chi.';
GO

/* ---------------------------------------------------------------------
   BUOC 4 - KIEM TRA LAI KET QUA

   Cot [KenhBan] duoi day dung DUNG cong thuc ma backend su dung,
   nen ket qua o day se khop chinh xac voi giao dien admin.
   --------------------------------------------------------------------- */
SELECT
    CASE
        WHEN [HandledBy] IS NULL OR LTRIM(RTRIM([HandledBy])) = N''
             OR UPPER(LTRIM(RTRIM([HandledBy]))) IN (N'ONLINE', N'WEB', N'WEBSITE')
            THEN N'Online'
        ELSE N'Offline (Tai quay)'
    END AS [KenhBan],
    COUNT(*) AS [SoDon]
FROM [dbo].[Orders]
GROUP BY
    CASE
        WHEN [HandledBy] IS NULL OR LTRIM(RTRIM([HandledBy])) = N''
             OR UPPER(LTRIM(RTRIM([HandledBy]))) IN (N'ONLINE', N'WEB', N'WEBSITE')
            THEN N'Online'
        ELSE N'Offline (Tai quay)'
    END;
GO

/* Chi tiet tung don de doi chieu voi man hinh Xac Nhan Thanh Toan */
SELECT
    [OrderID],
    ISNULL([HandledBy], N'(NULL - don online)') AS [NguoiXuLy],
    CASE
        WHEN [HandledBy] IS NULL OR LTRIM(RTRIM([HandledBy])) = N''
             OR UPPER(LTRIM(RTRIM([HandledBy]))) IN (N'ONLINE', N'WEB', N'WEBSITE')
            THEN N'Online'
        ELSE N'Offline'
    END AS [KenhBan],
    [CustomerName],
    [Status],
    [OrderDate]
FROM [dbo].[Orders]
ORDER BY [OrderDate] DESC, [OrderID] DESC;
GO
