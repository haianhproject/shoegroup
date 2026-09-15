/* ShoeGroup - avatar tai khoan
   Chay an toan tren CSDL dang co, khong xoa hay tao lai bang Users. */
IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.Users', 'AvatarURL') IS NULL
  ALTER TABLE dbo.Users ADD AvatarURL nvarchar(max) NULL;
ELSE IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
  PRINT N'Bo qua migration avatar: khong tim thay dbo.Users. Hay chon dung database ShoeGroupDB.';
GO
