// Muc dich: Kiem tra trung ten catalog, sao luu va them rang buoc khong doi ID/du lieu nghiep vu.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const sql=require('../legacy-express/node_modules/mssql');
const config=require('../legacy-express/src/security/env');
const {exportErd}=require('./catalog-migration.cjs');
const file=path.resolve(__dirname,'../../database/migrations/20261016_catalog_name_uniqueness.sql');
const catalogs=[['Categories','CategoryID','CategoryName'],['Brands','BrandID','BrandName'],['Materials','MaterialID','MaterialName'],['Colors','ColorID','ColorName']];
async function snapshot(pool) {
  const rows=[];
  for(const [table,id,name] of catalogs) rows.push((await pool.request().query(`SELECT ${id} id,${name} name,IsActive active FROM dbo.${table} ORDER BY ${id}`)).recordset);
  rows.push((await pool.request().query(`SELECT (SELECT COUNT(*) FROM Products) products,(SELECT COUNT(*) FROM ProductVariants) variants,(SELECT SUM(StockQuantity) FROM ProductVariants) stock,(SELECT COUNT(*) FROM Orders) orders,(SELECT SUM(TotalAmount) FROM Orders) total,(SELECT SUM(UnitPrice*Quantity) FROM OrderDetails) historical_total`)).recordset);
  return rows;
}
async function migrate(pool) { await pool.request().batch(fs.readFileSync(file,'utf8')); }
async function main() {
  const pool=await new sql.ConnectionPool(config.db).connect();
  try {
    const before=await snapshot(pool),issues=[];
    before.slice(0,4).forEach((rows,i)=>{
      const seen=new Map();
      for(const row of rows) {
        const key=String(row.name ?? '').normalize('NFC').replace(/[\s\u200B]+/g,'').toLowerCase();
        if(!key || seen.has(key)) issues.push({table:catalogs[i][0],id:row.id,name:row.name,duplicateOf:seen.get(key)});
        seen.set(key,row.id);
      }
    });
    console.log('Existing duplicate/empty names:',JSON.stringify(issues));
    if(issues.length) throw Error('Review existing catalog references before adding uniqueness. No records deleted.');
    if(!process.argv.includes('--apply')) return;
    const dir=(await pool.request().query("SELECT CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultBackupPath')) dir")).recordset[0].dir;
    if(!dir) throw Error('Missing SQL backup directory');
    const backup=path.win32.join(dir,`${config.db.database}_before_catalog_names_20261016_${Date.now()}.bak`);
    await pool.request().input('file',sql.NVarChar,backup).query(`BACKUP DATABASE [${config.db.database.replaceAll(']',']]')}] TO DISK=@file WITH COPY_ONLY,INIT,CHECKSUM; RESTORE VERIFYONLY FROM DISK=@file WITH CHECKSUM;`);
    console.log('Verified backup:',backup);
    await migrate(pool);await migrate(pool);
    assert.deepEqual(await snapshot(pool),before,'Existing catalog or business data changed');
    await exportErd(pool);
    console.log('Catalog uniqueness applied; all names, IDs, counts and business totals preserved.');
  } finally { await pool.close(); }
}
module.exports={migrate};
if(require.main===module) main().catch(e=>{console.error(e.message);process.exitCode=1;});
