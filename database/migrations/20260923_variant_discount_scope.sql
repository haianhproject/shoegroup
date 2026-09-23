/* Cho phep chon giam gia theo ca mau hoac theo dung mot bien the mau + size.
   Ban ghi cu mac dinh la color de giu nguyen hanh vi truoc day. */
IF OBJECT_ID(N'dbo.VariantDiscounts', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH('dbo.VariantDiscounts', 'ApplyScope') IS NULL
    EXEC(N'ALTER TABLE dbo.VariantDiscounts
      ADD ApplyScope varchar(20) NOT NULL
      CONSTRAINT DF_VariantDiscounts_ApplyScope DEFAULT (''color'') WITH VALUES;');

  EXEC(N'UPDATE dbo.VariantDiscounts
    SET ApplyScope=''color''
    WHERE ApplyScope IS NULL OR ApplyScope NOT IN (''color'',''variant'');');

  EXEC(N'ALTER TABLE dbo.VariantDiscounts ALTER COLUMN ApplyScope varchar(20) NOT NULL;');

  IF NOT EXISTS (
    SELECT 1
    FROM sys.default_constraints dc
    JOIN sys.columns c
      ON c.object_id=dc.parent_object_id AND c.column_id=dc.parent_column_id
    WHERE dc.parent_object_id=OBJECT_ID(N'dbo.VariantDiscounts')
      AND c.name=N'ApplyScope'
  )
    EXEC(N'ALTER TABLE dbo.VariantDiscounts
      ADD CONSTRAINT DF_VariantDiscounts_ApplyScope DEFAULT (''color'') FOR ApplyScope;');

  IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id=OBJECT_ID(N'dbo.VariantDiscounts')
      AND name=N'CK_VariantDiscounts_ApplyScope'
  )
    EXEC(N'ALTER TABLE dbo.VariantDiscounts WITH CHECK
      ADD CONSTRAINT CK_VariantDiscounts_ApplyScope
      CHECK (ApplyScope IN (''color'',''variant''));');
END;
