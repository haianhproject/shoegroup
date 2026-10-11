-- Mục đích: Script thủ công dọn schema cũ; không tự chạy lúc ứng dụng khởi động.
/* Dọn schema theo các API hiện hành, đã đối chiếu ngày 01/10/2026.
   Chạy thủ công SAU KHI backup và triển khai backend cùng phiên bản.
   Không tự chạy migration phá huỷ dữ liệu này khi API khởi động.
   Giữ nguyên các cột nullable đang phục vụ nghiệp vụ.
   Giữ bản sao database trước khi chạy để có thể khôi phục. */
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @lockResult int;
  EXEC @lockResult = sys.sp_getapplock
    @Resource=N'ShoeGroup.SchemaCleanup.20261001', @LockMode='Exclusive',
    @LockOwner='Transaction', @LockTimeout=15000;
  IF @lockResult < 0 THROW 51000, N'Không lấy được khóa dọn schema.', 1;

  IF EXISTS (SELECT 1 FROM dbo.AppMigrations WHERE MigrationKey=N'20261001_REMOVE_UNUSED_SCHEMA')
  BEGIN
    COMMIT;
    RETURN;
  END;

  DECLARE @tables TABLE (Name sysname PRIMARY KEY);
  INSERT @tables VALUES
    (N'bak_Categories_20260804'), (N'bak_OrderDetails_20260804'),
    (N'bak_Orders_20260804'), (N'bak_Products_SoleCushion_20260804'),
    (N'bak_ProductVariants_20260804'), (N'MemberTiers'),
    (N'PointTransactions'), (N'ProductQuestions'), (N'ReviewImages'),
    (N'Reviews'), (N'SearchLogs'), (N'SizeCharts'), (N'StockAlerts'),
    (N'UserSessions'), (N'Wishlists'), (N'PaymentMethods');

  DECLARE @columns TABLE (TableName sysname, ColumnName sysname,
    PRIMARY KEY (TableName, ColumnName));
  INSERT @columns VALUES
    (N'Coupons', N'IsFlashSale'),
    (N'Products', N'WishlistCount'), (N'Products', N'ImageGallery'),
    (N'Products', N'SalePrice'), (N'Products', N'UpdatedAt'),
    (N'Users', N'EmailVerified'), (N'Users', N'EmailVerifyToken'),
    (N'Users', N'EmailVerifyExpiry'), (N'Users', N'PointBalance'),
    (N'Users', N'TierID'),
    (N'Orders', N'PaymentMethodID'), (N'Orders', N'RecipientLatitude'),
    (N'Orders', N'RecipientLongitude'), (N'Orders', N'IsAddressVerified'),
    (N'PaymentTransactions', N'RawResponse'),
    (N'UserAddresses', N'Latitude'), (N'UserAddresses', N'Longitude'),
    (N'PostOffices', N'Latitude'), (N'PostOffices', N'Longitude'),
    (N'ShoeGroupWalletWithdrawals', N'ProcessedBy');

  -- Các bảng nghiệp vụ chưa triển khai phải vẫn rỗng. Dừng nếu có dữ liệu mới.
  DECLARE @name sysname, @statement nvarchar(max);
  DECLARE empty_tables CURSOR LOCAL FAST_FORWARD FOR
    SELECT Name FROM @tables WHERE Name NOT LIKE N'bak[_]%'
      AND Name NOT IN (N'MemberTiers', N'PaymentMethods');
  OPEN empty_tables;
  FETCH NEXT FROM empty_tables INTO @name;
  WHILE @@FETCH_STATUS=0
  BEGIN
    IF OBJECT_ID(N'dbo.'+QUOTENAME(@name), N'U') IS NOT NULL
    BEGIN
      SET @statement=N'IF EXISTS (SELECT 1 FROM dbo.'+QUOTENAME(@name)+N')
        THROW 51001, N''Bảng '+@name+N' đã có dữ liệu; cần rà soát lại trước khi xóa.'', 1;';
      EXEC sys.sp_executesql @statement;
    END;
    FETCH NEXT FROM empty_tables INTO @name;
  END;
  CLOSE empty_tables;
  DEALLOCATE empty_tables;

  DROP VIEW IF EXISTS dbo.vw_ProductRatings;
  DROP VIEW IF EXISTS dbo.vw_TopSearchKeywords;
  DROP PROCEDURE IF EXISTS dbo.sp_ProcessOrderAtomic;

  -- Chỉ gỡ FK của đúng các đối tượng đã duyệt; không đụng các FK khác.
  SET @statement=N'';
  SELECT @statement=@statement+N'ALTER TABLE '+QUOTENAME(OBJECT_SCHEMA_NAME(f.parent_object_id))
    +N'.'+QUOTENAME(OBJECT_NAME(f.parent_object_id))+N' DROP CONSTRAINT '+QUOTENAME(f.name)+N';'
  FROM sys.foreign_keys f
  WHERE EXISTS (SELECT 1 FROM @tables t WHERE OBJECT_ID(N'dbo.'+QUOTENAME(t.Name))
      IN (f.parent_object_id, f.referenced_object_id))
    OR EXISTS (SELECT 1 FROM sys.foreign_key_columns fc JOIN @columns c
      ON fc.parent_object_id=OBJECT_ID(N'dbo.'+QUOTENAME(c.TableName))
      AND COL_NAME(fc.parent_object_id,fc.parent_column_id)=c.ColumnName
      WHERE fc.constraint_object_id=f.object_id);
  EXEC sys.sp_executesql @statement;

  SET @statement=N'';
  SELECT @statement=@statement+N'ALTER TABLE dbo.'+QUOTENAME(c.TableName)
    +N' DROP CONSTRAINT '+QUOTENAME(d.name)+N';'
  FROM @columns c JOIN sys.default_constraints d
    ON d.parent_object_id=OBJECT_ID(N'dbo.'+QUOTENAME(c.TableName))
    AND COL_NAME(d.parent_object_id,d.parent_column_id)=c.ColumnName;
  EXEC sys.sp_executesql @statement;

  IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Users') AND name=N'IX_Users_TierID')
    DROP INDEX IX_Users_TierID ON dbo.Users;

  SET @statement=N'';
  SELECT @statement=@statement+N'ALTER TABLE dbo.'+QUOTENAME(TableName)
    +N' DROP COLUMN '+QUOTENAME(ColumnName)+N';'
  FROM @columns WHERE COL_LENGTH(N'dbo.'+QUOTENAME(TableName), ColumnName) IS NOT NULL;
  EXEC sys.sp_executesql @statement;

  SET @statement=N'';
  SELECT @statement=@statement+N'DROP TABLE dbo.'+QUOTENAME(Name)+N';'
  FROM @tables WHERE OBJECT_ID(N'dbo.'+QUOTENAME(Name),N'U') IS NOT NULL;
  EXEC sys.sp_executesql @statement;

  -- Bốn FK trùng hoàn toàn về cột và chính sách; vẫn giữ một FK mỗi quan hệ.
  -- Chỉ xóa bản trùng khi có bản còn lại tương đương trong catalog.
  SET @statement=N'';
  SELECT @statement=@statement+N'ALTER TABLE dbo.'+QUOTENAME(OBJECT_NAME(f.parent_object_id))
    +N' DROP CONSTRAINT '+QUOTENAME(f.name)+N';'
  FROM sys.foreign_keys f
  WHERE f.name IN (N'FK__Users__RoleID__1D7B6025', N'FK__Products__Catego__05A3D694',
    N'FK__Products__BrandI__03BB8E22', N'FK__Orders__UserID__7755B73D')
  AND EXISTS (
    SELECT 1 FROM sys.foreign_keys other
    WHERE other.object_id<>f.object_id AND other.parent_object_id=f.parent_object_id
      AND other.referenced_object_id=f.referenced_object_id
      AND other.delete_referential_action=f.delete_referential_action
      AND other.update_referential_action=f.update_referential_action
      AND other.is_disabled=0 AND other.is_not_trusted=0
      AND other.is_not_for_replication=f.is_not_for_replication
      AND NOT EXISTS (
        SELECT parent_column_id,referenced_column_id FROM sys.foreign_key_columns WHERE constraint_object_id=f.object_id
        EXCEPT SELECT parent_column_id,referenced_column_id FROM sys.foreign_key_columns WHERE constraint_object_id=other.object_id)
      AND NOT EXISTS (
        SELECT parent_column_id,referenced_column_id FROM sys.foreign_key_columns WHERE constraint_object_id=other.object_id
        EXCEPT SELECT parent_column_id,referenced_column_id FROM sys.foreign_key_columns WHERE constraint_object_id=f.object_id)
  );
  EXEC sys.sp_executesql @statement;

  INSERT dbo.AppMigrations(MigrationKey,AppliedAt)
    VALUES (N'20261001_REMOVE_UNUSED_SCHEMA',GETDATE());
  COMMIT;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK;
  THROW;
END CATCH;
