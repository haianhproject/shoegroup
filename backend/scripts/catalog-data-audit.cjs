// Muc dich: Ra soat du lieu catalog, chi don sau sao luu; khong xoa san pham/lich su/ton kho.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const sql=require('../legacy-express/node_modules/mssql');
const config=require('../legacy-express/src/security/env');
const file=path.resolve(__dirname,'../../database/migrations/20261016_catalog_data_hardening.sql');
async function migrate(pool) { await pool.request().batch(fs.readFileSync(file,'utf8')); }
async function audit(pool) {
  const result=await pool.request().query(`
    DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS;
    SELECT s.SizeID,s.SizeName,s.SizeStandard FROM Sizes s WHERE SizeStandard NOT IN('EU','US','UK') OR SizeStandard IS NULL
      OR TRY_CONVERT(decimal(18,8),SizeName) IS NULL OR TRY_CONVERT(decimal(18,8),SizeName)*2<>FLOOR(TRY_CONVERT(decimal(18,8),SizeName)*2)
      OR TRY_CONVERT(decimal(18,8),SizeName)<CASE WHEN SizeStandard='EU' THEN 14 ELSE 0 END
      OR TRY_CONVERT(decimal(18,8),SizeName)>CASE WHEN SizeStandard='EU' THEN 60 ELSE 22 END;
    SELECT SizeStandard,TRY_CONVERT(decimal(18,8),SizeName) AS value,COUNT(*) AS n FROM Sizes GROUP BY SizeStandard,TRY_CONVERT(decimal(18,8),SizeName) HAVING COUNT(*)>1;
    SELECT ProductVariantID,ProductID,ChildSKU FROM ProductVariants WHERE NULLIF(LTRIM(RTRIM(ChildSKU)),'') IS NULL OR ChildSKU COLLATE Latin1_General_100_BIN2 LIKE '%[^A-Z0-9_-]%';
    SELECT ChildSKU,COUNT(*) AS n FROM ProductVariants GROUP BY ChildSKU HAVING COUNT(*)>1;
    SELECT v.ProductVariantID,v.ProductID FROM ProductVariants v JOIN Products p ON p.ProductID=v.ProductID WHERE p.IsActive=0 AND v.IsActive=1;
    SELECT ProductVariantID FROM ProductVariants WHERE SalePrice<=0 OR StockQuantity<0;
    SELECT ProductID FROM Products WHERE NULLIF(LTRIM(RTRIM(ProductName)),N'') IS NULL;
  `);
  return result.recordsets.filter(rows=>rows.length);
}
async function main() {
  const pool=await new sql.ConnectionPool(config.db).connect();
  try {
    console.log('Issues before:',JSON.stringify(await audit(pool)));
    if(!process.argv.includes('--apply')) return;
    const totals=`SELECT (SELECT COUNT(*) FROM Products) products,(SELECT COUNT(*) FROM ProductVariants) variants,(SELECT COUNT(*) FROM Orders) orders,(SELECT COUNT(*) FROM OrderDetails) details,(SELECT SUM(UnitPrice*Quantity) FROM OrderDetails) historical_total,(SELECT SUM(TotalAmount) FROM Orders) total,(SELECT SUM(StockQuantity) FROM ProductVariants) stock,(SELECT COUNT(*) FROM PaymentTransactions) payments,(SELECT COUNT(*) FROM OrderStatusHistory) history`;
    const before=(await pool.request().query(totals)).recordset;
    const dir=(await pool.request().query("SELECT CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultBackupPath')) dir")).recordset[0].dir;
    if(!dir) throw Error('Missing SQL backup directory');
    const backup=path.win32.join(dir,`${config.db.database}_before_catalog_cleanup_20261016_${Date.now()}.bak`);
    await pool.request().input('file',sql.NVarChar,backup).query(`BACKUP DATABASE [${config.db.database.replaceAll(']',']]')}] TO DISK=@file WITH COPY_ONLY,INIT,CHECKSUM; RESTORE VERIFYONLY FROM DISK=@file WITH CHECKSUM;`);
    console.log('Verified backup:',backup);
    await migrate(pool);await migrate(pool);
    assert.deepEqual((await pool.request().query(totals)).recordset,before,'Business totals changed');
    const after=await audit(pool);console.log('Issues after:',JSON.stringify(after));console.log('Preserved:',JSON.stringify(before));
    assert.deepEqual(after,[],'Some data issues remain; review instead of deleting business data.');
  } finally { await pool.close(); }
}
module.exports={migrate,audit};
if(require.main===module) main().catch(e=>{console.error(e.message);process.exitCode=1;});
