-- Muc dich: Them vai tro nhan vien; khong doi quyen tai khoan hien co.
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;
  IF EXISTS (SELECT 1 FROM dbo.Roles WITH(UPDLOCK,HOLDLOCK) WHERE RoleID=3 AND RoleName NOT IN ('Employee','Staff','Nhan vien'))
    THROW 51000, 'RoleID 3 already belongs to a different role.', 1;
  IF NOT EXISTS (SELECT 1 FROM dbo.Roles WITH(UPDLOCK,HOLDLOCK) WHERE RoleID=3)
  BEGIN
    SET IDENTITY_INSERT dbo.Roles ON;
    INSERT dbo.Roles(RoleID,RoleName) VALUES(3,'Employee');
    SET IDENTITY_INSERT dbo.Roles OFF;
  END;
  IF NOT EXISTS (SELECT 1 FROM dbo.AppMigrations WHERE MigrationKey='20261010_STAFF_ROLE')
    INSERT dbo.AppMigrations(MigrationKey,AppliedAt) VALUES('20261010_STAFF_ROLE',GETDATE());
  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET IDENTITY_INSERT dbo.Roles OFF;
  THROW;
END CATCH;
