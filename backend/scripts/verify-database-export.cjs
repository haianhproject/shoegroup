// Muc dich: Thu phuc hoi ban SQL FULL vao DB rieng va doi chieu cau truc, du lieu.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sql = require('../legacy-express/node_modules/mssql');
const config = require('../legacy-express/src/security/env');
const folder = path.resolve(__dirname, '../../database');
const latest = fs.readdirSync(folder).filter(name => /_FULL_\d{8}\.sql$/.test(name)).sort().at(-1);
const file = path.resolve(process.argv[2] || path.join(folder,latest));
const database = `ShoegroupRestoreCheck_${Date.now()}_${process.pid}`;
const quote = name => '[' + name.replaceAll(']', ']]') + ']';
const literal = name => "N'" + name.replaceAll("'", "''") + "'";
const ordered = rows => rows.map(row => JSON.stringify(row)).sort();
let master, source, restored, created = false;
async function main() {
  assert.match(database, /^ShoegroupRestoreCheck_\d+_\d+$/);
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  assert.ok(text.includes(`DROP DATABASE ${quote(config.db.database)};`), 'Missing reset header');
  const batches = text.replaceAll(quote(config.db.database), quote(database))
    .replaceAll(literal(config.db.database), literal(database)).split(/^\s*GO\s*$/mi).filter(s => s.trim());
  assert.ok(batches[0].includes('USE [master]') && batches[2].includes(`CREATE DATABASE ${quote(database)}`));
  master = await new sql.ConnectionPool({...config.db,database:'master',requestTimeout:120000}).connect();
  for (const batch of batches.slice(0,3)) await master.request().batch(batch);
  created = true;
  restored = await new sql.ConnectionPool({...config.db,database,pool:{max:1,min:0},requestTimeout:120000}).connect();
  for (let i=3;i<batches.length;i++) {
    try { await restored.request().batch(batches[i]); }
    catch(e) { throw Error(`Restore batch ${i+1}: ${e.message}`); }
  }
  source = await new sql.ConnectionPool(config.db).connect();
  const tables = (await source.request().query('SELECT SCHEMA_NAME(schema_id) AS s,name AS t FROM sys.tables WHERE is_ms_shipped=0 ORDER BY s,t')).recordset;
  for (const table of tables) {
    const name=quote(table.s)+'.'+quote(table.t);
    const actual=(await restored.request().query(`SELECT * FROM ${name}`)).recordset;
    const expected=(await source.request().query(`SELECT * FROM ${name}`)).recordset;
    assert.deepEqual(ordered(actual),ordered(expected),`Data mismatch: ${name}`);
    console.log(`PASS ${name}: ${actual.length} rows`);
  }
  const queries = [
    "SELECT SCHEMA_NAME(schema_id) AS s,name,type FROM sys.objects WHERE is_ms_shipped=0 ORDER BY s,name,type",
    "SELECT SCHEMA_NAME(t.schema_id) AS s,t.name AS t,c.name,ty.name AS typ,c.max_length,c.precision,c.scale,c.is_nullable,c.is_identity FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE t.is_ms_shipped=0 ORDER BY s,t,c.column_id",
    "SELECT SCHEMA_NAME(t.schema_id) AS s,t.name AS t,i.name,i.type,i.is_unique,i.is_primary_key,i.filter_definition,ic.key_ordinal,ic.is_included_column,c.name AS col FROM sys.tables t JOIN sys.indexes i ON i.object_id=t.object_id JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE t.is_ms_shipped=0 ORDER BY s,t,i.name,ic.index_column_id",
    "SELECT OBJECT_NAME(parent_object_id) AS t,name,is_disabled,is_not_trusted,delete_referential_action,update_referential_action FROM sys.foreign_keys ORDER BY t,name",
    "SELECT OBJECT_NAME(parent_object_id) AS t,name,definition,is_disabled,is_not_trusted FROM sys.check_constraints ORDER BY t,name",
    "SELECT OBJECT_NAME(parent_object_id) AS t,name,definition FROM sys.default_constraints ORDER BY t,name",
    "SELECT t.name,c.name,CONVERT(varchar(40),c.last_value) AS last_value FROM sys.identity_columns c JOIN sys.tables t ON t.object_id=c.object_id WHERE t.is_ms_shipped=0 ORDER BY t.name,c.name"
  ];
  for (let i=0;i<queries.length;i++) {
    const expected=(await source.request().query(queries[i])).recordset;
    const actual=(await restored.request().query(queries[i])).recordset;
    assert.deepEqual(actual,expected,`Schema mismatch: group ${i+1}`);
  }
  const moduleQuery = "SELECT SCHEMA_NAME(o.schema_id) AS s,o.name,m.definition FROM sys.sql_modules m JOIN sys.objects o ON o.object_id=m.object_id WHERE o.is_ms_shipped=0 ORDER BY s,o.name";
  const modules = rows => rows.map(row => ({...row,definition:row.definition.replace(/\r\n/g,'\n').trim().replace(/\b(?:CREATE\s+(?:OR\s+ALTER\s+)?|ALTER\s+)(PROCEDURE|PROC|VIEW|FUNCTION|TRIGGER)\b/i, 'CREATE $1')}));
  assert.deepEqual(modules((await restored.request().query(moduleQuery)).recordset),modules((await source.request().query(moduleQuery)).recordset),'Module definitions mismatch');
  const violations=(await restored.request().query('DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS')).recordset || [];
  assert.equal(violations.length,0,'Constraint violations');
  console.log(`PASS FULL restore: ${tables.length} tables, exact rows, identities, objects, columns, indexes, constraints and module definitions.`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{
  if(source) await source.close();
  if(restored) await restored.close();
  if(master) {
    if(created) {
      assert.match(database,/^ShoegroupRestoreCheck_\d+_\d+$/);
      await master.request().batch(`ALTER DATABASE ${quote(database)} SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ${quote(database)};`);
    }
    await master.close();
  }
});
