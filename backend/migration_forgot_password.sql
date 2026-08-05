-- ============================================================
-- MIGRATION: Them cot phuc vu chuc nang "Quen mat khau" qua email
-- Chay file nay 1 lan tren CSDL ShoegroupDB (vi du bang SSMS,
-- Azure Data Studio, hoac sqlcmd) truoc khi dung tinh nang moi.
-- ============================================================

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Users') AND name = 'ResetToken'
)
BEGIN
    ALTER TABLE Users ADD ResetToken VARCHAR(255) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Users') AND name = 'ResetTokenExpiry'
)
BEGIN
    ALTER TABLE Users ADD ResetTokenExpiry DATETIME NULL;
END
GO
