// Mục đích: Tạo database kiểm thử riêng, chạy kiểm thử Spring/SQL Server và dọn database sau khi xong.
const sql = require('../../backend/legacy-express/node_modules/mssql');
const config = require('../../backend/legacy-express/src/security/env');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const database = `ShoegroupMigrationTest_${Date.now()}_${process.pid}`;
if (!/^ShoegroupMigrationTest_\d+_\d+$/.test(database)) throw new Error('Unsafe test database name');
let master, testPool, created = false;
async function main() {
  try {
    master = await new sql.ConnectionPool({ ...config.db, database: 'master' }).connect();
    await master.request().query(`CREATE DATABASE [${database}]`); created = true;
    testPool = await new sql.ConnectionPool({ ...config.db, database }).connect();
    await testPool.request().batch(fs.readFileSync(path.join(root, 'backend/src/test/resources/sqlserver-test-schema.sql'), 'utf8'));
    await testPool.close(); testPool = null;
    const host = config.db.server;
    const location = config.db.options.instanceName ? `${host};instanceName=${config.db.options.instanceName}` : `${host}:${config.db.port || 1433}`;
    const url = `jdbc:sqlserver://${location};databaseName=${database};encrypt=${config.db.options.encrypt};trustServerCertificate=${config.db.options.trustServerCertificate}`;
    console.log('Running Spring integration tests in an isolated SQL Server database.');
    const code = await new Promise((resolve, reject) => {
      const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'backend/scripts/maven.ps1', '-q', 'test'], {
        cwd: root, stdio: 'inherit', env: { ...process.env, SHOEGROUP_SQL_TEST_URL: url, DB_USER: config.db.user, DB_PASS: config.db.password, JWT_SECRET: 'migration-integration-secret-2026' },
      });
      child.on('error', reject); child.on('exit', resolve);
    });
    process.exitCode = code || 0;
  } finally {
    if (testPool) await testPool.close();
    if (master) {
      if (created) await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`);
      await master.close();
    }
  }
}
main().catch(error => { console.error('SQL integration tests failed:', error.message); process.exitCode = 1; });
