// Muc dich: Sao luu va ap dung toi uu don hang/voucher, doi chieu so lieu truoc/sau.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const sql=require('../legacy-express/node_modules/mssql');
const config=require('../legacy-express/src/security/env');
const {exportErd}=require('./catalog-migration.cjs');
const file=path.resolve(__dirname,'../../database/migrations/20261015_order_coupon_hardening.sql');
async function migrate(pool) {
  for(const batch of fs.readFileSync(file,'utf8').split(/^\s*GO\s*$/mi)) if(batch.trim()) await pool.request().batch(batch);
}
async function main() {
  if(!process.argv.includes('--apply')) throw Error('Dung --apply de sao luu va ap dung migration.');
  const pool=await new sql.ConnectionPool(config.db).connect();
  try {
    const query=`SELECT (SELECT COUNT(*) FROM Orders) AS orders,(SELECT COUNT(*) FROM OrderDetails) AS details,(SELECT SUM(UnitPrice*Quantity) FROM OrderDetails) AS historical_total,(SELECT SUM(TotalAmount) FROM Orders) AS total,(SELECT SUM(StockQuantity) FROM ProductVariants) AS stock,(SELECT COUNT(*) FROM PaymentTransactions) AS payments,(SELECT COUNT(*) FROM OrderStatusHistory) AS history,(SELECT COUNT(*) FROM CouponRedemptions) AS redemptions`;
    const before=(await pool.request().query(query)).recordset;
    const dir=(await pool.request().query("SELECT CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultBackupPath')) AS dir")).recordset[0].dir;
    if(!dir) throw Error('Missing SQL backup directory');
    const backup=path.win32.join(dir,`${config.db.database}_before_orders_20261015_${Date.now()}.bak`);
    await pool.request().input('file',sql.NVarChar,backup).query(`BACKUP DATABASE [${config.db.database.replaceAll(']',']]')}] TO DISK=@file WITH COPY_ONLY,INIT,CHECKSUM; RESTORE VERIFYONLY FROM DISK=@file WITH CHECKSUM;`);
    console.log('Verified backup:',backup);
    await migrate(pool);await migrate(pool);
    const after=(await pool.request().query(query)).recordset;
    assert.deepEqual(after,before,'Business totals changed');
    console.log('Preserved:',JSON.stringify(after));
    await exportErd(pool);console.log('ERD synchronized.');
  } finally {await pool.close();}
}
module.exports={migrate};
if(require.main===module) main().catch(e=>{console.error(e.message);process.exitCode=1;});
