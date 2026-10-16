-- Muc dich: Chong trung ten catalog bat ke hoa/thuong va khoang trang, ke ca ban ghi da tat.
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
IF OBJECT_ID(N'dbo.AppMigrations',N'U') IS NULL
  CREATE TABLE dbo.AppMigrations(MigrationKey nvarchar(150) NOT NULL PRIMARY KEY,AppliedAt datetime NOT NULL DEFAULT GETDATE());
IF EXISTS(SELECT 1 FROM dbo.AppMigrations WHERE MigrationKey=N'20261016_CATALOG_NAME_UNIQUENESS') RETURN;
BEGIN TRANSACTION;
EXEC(N'CREATE OR ALTER FUNCTION dbo.CatalogNameKey(@name nvarchar(100))
RETURNS nvarchar(100) WITH SCHEMABINDING AS
BEGIN
  DECLARE @value nvarchar(100)=LOWER(@name COLLATE Vietnamese_100_CI_AS),@result nvarchar(100)=N'''',@i int=1,@code int;
  WHILE @i<=LEN(@value)
  BEGIN
    SET @code=UNICODE(SUBSTRING(@value,@i,1));
    IF @code NOT IN(9,10,11,12,13,32,133,160,5760,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8203,8232,8233,8239,8287,12288,65279)
      SET @result=@result+SUBSTRING(@value,@i,1);
    SET @i=@i+1;
  END;
  RETURN @result;
END');
DECLARE @table sysname,@column sysname,@query nvarchar(max);
DECLARE catalogs CURSOR LOCAL FAST_FORWARD FOR
  SELECT * FROM(VALUES(N'Categories',N'CategoryName'),(N'Brands',N'BrandName'),(N'Materials',N'MaterialName'),(N'Colors',N'ColorName')) c(tbl,col);
OPEN catalogs;
FETCH NEXT FROM catalogs INTO @table,@column;
WHILE @@FETCH_STATUS=0
BEGIN
  SET @query=N'IF EXISTS(SELECT 1 FROM dbo.'+QUOTENAME(@table)+N' GROUP BY dbo.CatalogNameKey('+QUOTENAME(@column)+N') COLLATE Vietnamese_100_CI_AS HAVING COUNT(*)>1)
    THROW 51000,N''Duplicate catalog names found in '+@table+N'. Resolve references before migration.'',1;
    IF EXISTS(SELECT 1 FROM dbo.'+QUOTENAME(@table)+N' WHERE NULLIF(dbo.CatalogNameKey('+QUOTENAME(@column)+N'),N'''') IS NULL)
    THROW 51000,N''Empty catalog name found in '+@table+N'. Correct it before migration.'',1;
    ALTER TABLE dbo.'+QUOTENAME(@table)+N' ADD CatalogNameKey AS (dbo.CatalogNameKey('+QUOTENAME(@column)+N') COLLATE Vietnamese_100_CI_AS) PERSISTED;';
  EXEC sys.sp_executesql @query;
  SET @query=N'ALTER TABLE dbo.'+QUOTENAME(@table)+N' WITH CHECK ADD CONSTRAINT '+QUOTENAME(N'CK_'+@table+N'_Name')+N' CHECK(CatalogNameKey IS NOT NULL AND LEN(CatalogNameKey)>0);
    CREATE UNIQUE INDEX '+QUOTENAME(N'UQ_'+@table+N'_NameKey')+N' ON dbo.'+QUOTENAME(@table)+N'(CatalogNameKey);';
  EXEC sys.sp_executesql @query;
  FETCH NEXT FROM catalogs INTO @table,@column;
END;
CLOSE catalogs;
DEALLOCATE catalogs;
INSERT dbo.AppMigrations(MigrationKey) VALUES(N'20261016_CATALOG_NAME_UNIQUENESS');
COMMIT TRANSACTION;
