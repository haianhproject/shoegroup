// Muc dich: Doi ID catalog mot lan, thu tren DB rieng va doi chieu tung dong truoc commit.
const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const assert=require('node:assert/strict');
const sql=require('../legacy-express/node_modules/mssql');
const config=require('../legacy-express/src/security/env');
const marker='20261016_CATALOG_ID_RENUMBER';
const property='ShoeGroup.CatalogIdentity';
const targets={Brands:'BrandID',Categories:'CategoryID',Colors:'ColorID',Materials:'MaterialID',Sizes:'SizeID',Products:'ProductID',ProductVariants:'ProductVariantID'};
const q=name=>'['+name.replaceAll(']',']]')+']';
const literal=value=>"N'"+String(value).replaceAll("'","''")+"'";
const request=connection=>new sql.Request(connection);
const ordered=rows=>rows.map(row=>JSON.stringify(row)).sort();
async function snapshot(connection) {
  const metadata=await request(connection).query(`SELECT t.name tbl,c.name col,ty.name typ,c.is_identity,c.is_computed FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE t.is_ms_shipped=0 AND SCHEMA_NAME(t.schema_id)='dbo' ORDER BY t.name,c.column_id;
    SELECT t.name tbl,c.name col,CONVERT(varchar(40),c.last_value) last_value FROM sys.identity_columns c JOIN sys.tables t ON t.object_id=c.object_id WHERE t.is_ms_shipped=0 ORDER BY t.name;
    SELECT name,OBJECT_NAME(parent_object_id) tbl,OBJECT_NAME(referenced_object_id) ref_tbl,is_disabled,is_not_trusted FROM sys.foreign_keys ORDER BY name;
    SELECT OBJECT_NAME(object_id) tbl,name,type,is_unique,is_primary_key,filter_definition FROM sys.indexes WHERE object_id IN(SELECT object_id FROM sys.tables WHERE is_ms_shipped=0) AND name IS NOT NULL ORDER BY tbl,name;
    SELECT OBJECT_NAME(parent_id) tbl,name,is_disabled FROM sys.triggers WHERE is_ms_shipped=0 ORDER BY name;`);
  const tables={};
  for(const name of [...new Set(metadata.recordsets[0].map(c=>c.tbl))]) tables[name]=(await request(connection).query(`SELECT * FROM dbo.${q(name)}`)).recordset;
  return {columns:metadata.recordsets[0],identities:metadata.recordsets[1],foreignKeys:metadata.recordsets[2],indexes:metadata.recordsets[3],triggers:metadata.recordsets[4],tables};
}
function mapping(before) {
  const maps={};
  for(const [table,column] of Object.entries(targets)) {
    assert.ok(before.tables[table],`Missing ${table}`);
    maps[table]=before.tables[table].map(row=>row[column]).sort((a,b)=>a-b).map((old,index)=>[old,index+1]);
  }
  return {revision:'catalog-ids-20261016-v1',maps};
}
function references(before) {
  const columns=[];
  for(const col of before.columns) {
    const target=Object.entries(targets).find(([,pk])=>col.col===pk);
    if(target) { assert.equal(col.typ,'int');columns.push({...col,target:target[0]}); }
  }
  return columns;
}
function validate(before) {
  assert.ok(before.foreignKeys.every(f=>!f.is_disabled&&!f.is_not_trusted),'Fix untrusted/disabled foreign keys before renumbering');
  const ref=references(before),affected=new Set(ref.map(c=>c.tbl));
  assert.ok(before.triggers.every(t=>!affected.has(t.tbl)),'Affected tables have triggers; review before renumbering');
  for(const c of ref) {
    const ids=new Set(before.tables[c.target].map(r=>r[targets[c.target]]));
    for(const row of before.tables[c.tbl]) assert.ok(row[c.col]==null||ids.has(row[c.col]),`Orphan ${c.tbl}.${c.col}`);
  }
  for(const notification of before.tables.Notifications || []) assert.ok(['Order','ORDER_STATUS'].includes(notification.Type),'Review notification RelatedID before renumbering');
  const idKeys=new Set(ref.map(c=>c.col).concat(['productId','product_id','productVariantId','product_variant_id','variant_id']));
  const checkJson=value=>{if(Array.isArray(value)) value.forEach(checkJson);else if(value&&typeof value==='object') for(const [key,child] of Object.entries(value)) {assert.ok(!idKeys.has(key),'Review catalog reference embedded in checkout JSON');checkJson(child);}};
  for(const row of before.tables.CheckoutRequests || []) checkJson(JSON.parse(row.ResponseJson));
  return ref;
}
function statements(before,meta) {
  const ref=validate(before),affected=[...new Set(ref.map(c=>c.tbl))];
  const affectedSet=new Set(affected);
  const foreignKeys=before.foreignKeys.filter(f=>affectedSet.has(f.tbl)||affectedSet.has(f.ref_tbl));
  const statements=[`SET XACT_ABORT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET CONCAT_NULL_YIELDS_NULL ON; SET ARITHABORT ON; SET NUMERIC_ROUNDABORT OFF;`];
  for(const [table,pairs] of Object.entries(meta.maps)) {
    statements.push(`CREATE TABLE #map_${table}(OldID int PRIMARY KEY,NewID int NOT NULL UNIQUE);`);
    if(pairs.length) statements.push(`INSERT #map_${table} VALUES ${pairs.map(pair=>'('+pair.join(',')+')').join(',')};`);
  }
  for(const table of affected) {
    const cols=before.columns.filter(c=>c.tbl===table&&!c.is_computed),refs=ref.filter(c=>c.tbl===table);
    const expressions=cols.map(c=>{const idx=refs.findIndex(r=>r.col===c.col);return (idx<0?'t.'+q(c.col):`m${idx}.NewID`)+` AS ${q(c.col)}`;});
    const joins=refs.map((r,i)=>`LEFT JOIN #map_${r.target} m${i} ON m${i}.OldID=t.${q(r.col)}`);
    statements.push(`SELECT ${expressions.join(',')} INTO #stage_${table} FROM dbo.${q(table)} t ${joins.join(' ')};`);
  }
  for(const fk of foreignKeys) statements.push(`ALTER TABLE dbo.${q(fk.tbl)} NOCHECK CONSTRAINT ${q(fk.name)};`);
  for(const table of affected) statements.push(`DELETE FROM dbo.${q(table)};`);
  for(const table of affected) {
    const cols=before.columns.filter(c=>c.tbl===table&&!c.is_computed),columns=cols.map(c=>q(c.col)).join(',');
    const identity=cols.some(c=>c.is_identity);
    if(identity) statements.push(`SET IDENTITY_INSERT dbo.${q(table)} ON;`);
    statements.push(`INSERT dbo.${q(table)}(${columns}) SELECT ${columns} FROM #stage_${table};`);
    if(identity) statements.push(`SET IDENTITY_INSERT dbo.${q(table)} OFF;`);
    const original=before.identities.find(i=>i.tbl===table)?.last_value;
    const counter=targets[table]?meta.maps[table].length:original;
    if(identity&&counter!=null) statements.push(`DBCC CHECKIDENT (${literal('dbo.'+q(table))},RESEED,${Number(counter)}) WITH NO_INFOMSGS;`);
  }
  for(const fk of foreignKeys) statements.push(`ALTER TABLE dbo.${q(fk.tbl)} WITH CHECK CHECK CONSTRAINT ${q(fk.name)};`);
  const json=JSON.stringify(meta);assert.ok(Buffer.byteLength(json,'utf16le')<7500,'Identity mapping exceeds SQL extended property size');
  statements.push(`EXEC sys.sp_addextendedproperty @name=${literal(property)},@value=${literal(json)},@level0type=N'SCHEMA',@level0name=N'dbo',@level1type=N'TABLE',@level1name=N'AppMigrations';`);
  statements.push(`INSERT dbo.AppMigrations(MigrationKey,AppliedAt) VALUES(${literal(marker)},GETDATE());`);
  return statements.join('\n');
}
function assertPreserved(before,after,meta) {
  const ref=references(before),maps=Object.fromEntries(Object.entries(meta.maps).map(([name,pairs])=>[name,new Map(pairs)]));
  for(const [table,rows] of Object.entries(before.tables)) {
    const expected=rows.map(row=>{
      const next={...row};
      for(const c of ref.filter(c=>c.tbl===table)) if(next[c.col]!=null) next[c.col]=maps[c.target].get(next[c.col]);
      return next;
    });
    const actual=table==='AppMigrations'?after.tables[table].filter(r=>r.MigrationKey!==marker):after.tables[table];
    assert.deepEqual(ordered(actual),ordered(expected),`Row mismatch: ${table}`);
  }
  assert.deepEqual(after.columns,before.columns,'Columns changed');
  assert.deepEqual(after.foreignKeys,before.foreignKeys,'Foreign keys changed');
  assert.deepEqual(after.indexes,before.indexes,'Indexes changed');
  assert.deepEqual(after.triggers,before.triggers,'Triggers changed');
  for(const identity of after.identities) {
    const expected=targets[identity.tbl]?String(meta.maps[identity.tbl].length):before.identities.find(i=>i.tbl===identity.tbl).last_value;
    assert.equal(identity.last_value,expected,`Identity mismatch: ${identity.tbl}`);
  }
}
async function migrate(pool,{failBeforeCommit=false}={}) {
  const already=(await pool.request().input('key',sql.NVarChar,marker).query('SELECT 1 ok FROM AppMigrations WHERE MigrationKey=@key')).recordset.length;
  if(already) return {already:true};
  const transaction=new sql.Transaction(pool);await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const names=(await request(transaction).query("SELECT name FROM sys.tables WHERE is_ms_shipped=0 ORDER BY name")).recordset;
    for(const {name} of names) await request(transaction).query(`SELECT COUNT_BIG(*) n FROM dbo.${q(name)} WITH(TABLOCKX,HOLDLOCK)`);
    const before=await snapshot(transaction),meta=mapping(before);
    meta.legacyCheckoutCutoff=(await request(transaction).query("SELECT CONVERT(varchar(33),SYSUTCDATETIME(),126)+'Z' value")).recordset[0].value;
    await request(transaction).batch(statements(before,meta));
    const violations=(await request(transaction).query('DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS')).recordset || [];
    assert.deepEqual(violations,[],'Constraint violations');
    assertPreserved(before,await snapshot(transaction),meta);
    if(failBeforeCommit) throw Error('INJECTED_ROLLBACK');
    await transaction.commit();
    return {meta,before};
  } catch(error) {try{await transaction.rollback();}catch{}throw error;}
}
async function backup(master) {
  const dir=(await master.request().query("SELECT CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultBackupPath')) dir")).recordset[0].dir;
  assert.ok(dir);const file=path.win32.join(dir,`${config.db.database}_before_id_renumber_${Date.now()}.bak`);
  await master.request().input('file',sql.NVarChar,file).batch(`BACKUP DATABASE ${q(config.db.database)} TO DISK=@file WITH COPY_ONLY,INIT,CHECKSUM; RESTORE VERIFYONLY FROM DISK=@file WITH CHECKSUM;`);
  return file;
}
async function rehearse(master,file,hooks={}) {
  const database=`ShoegroupIdCheck_${Date.now()}_${process.pid}`;assert.match(database,/^ShoegroupIdCheck_\d+_\d+$/);
  const files=(await master.request().input('backup',sql.NVarChar,file).query('RESTORE FILELISTONLY FROM DISK=@backup')).recordset;
  const paths=(await master.request().query("SELECT CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultDataPath')) data_path,CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultLogPath')) log_path")).recordset[0];
  const moves=files.map((f,i)=>`MOVE ${literal(f.LogicalName)} TO ${literal(path.win32.join(f.Type==='L'?paths.log_path:paths.data_path,database+'_'+i+(f.Type==='L'?'.ldf':'.mdf')))}`).join(',');
  let pool,created=false;
  try {
    await master.request().input('backup',sql.NVarChar,file).query(`RESTORE DATABASE ${q(database)} FROM DISK=@backup WITH ${moves},RECOVERY,CHECKSUM;`);created=true;
    pool=await new sql.ConnectionPool({...config.db,database,pool:{max:2,min:0},requestTimeout:120000}).connect();
    const context=await hooks.prepare?.(pool);
    const original=await snapshot(pool);
    await assert.rejects(migrate(pool,{failBeforeCommit:true}),/INJECTED_ROLLBACK/);
    assert.deepEqual(await snapshot(pool),original,'Injected rollback changed data/schema/identity');
    const result=await migrate(pool);assertPreserved(original,await snapshot(pool),result.meta);
    assert.equal((await migrate(pool)).already,true,'Migration must run once');
    await hooks.verify?.(pool,result.meta,context,database);
    await pool.request().query(`DBCC CHECKDB (${literal(database)}) WITH NO_INFOMSGS;`);
    console.log('PASS rehearsal: exact rows, all references, identities, constraints, rollback and repeat run.');
    return {database,...result};
  } finally {
    if(pool) await pool.close();
    if(created) await master.request().batch(`ALTER DATABASE ${q(database)} SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ${q(database)};`);
  }
}
async function offline(port) {
  const listening=await new Promise(resolve=>{const socket=net.connect(port,'127.0.0.1');socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));});
  assert.equal(listening,false,`Stop ShoeGroup on port ${port} before applying IDs`);
}
async function main() {
  let source,master;
  try {
    source=await new sql.ConnectionPool({...config.db,requestTimeout:120000}).connect();
    const before=await snapshot(source);
    if(before.tables.AppMigrations.some(row=>row.MigrationKey===marker)) {console.log('Already applied; no IDs changed.');return;}
    const meta=mapping(before);validate(before);
    console.log(JSON.stringify({counts:Object.fromEntries(Object.keys(targets).map(t=>[t,before.tables[t].length])),mapping:meta}));
    if(!process.argv.includes('--apply')&&!process.argv.includes('--rehearse')) return;
    if(process.argv.includes('--apply')) {await offline(5000);await offline(3000);}
    master=await new sql.ConnectionPool({...config.db,database:'master',requestTimeout:120000}).connect();
    const file=await backup(master);console.log('Verified backup:',file);
    await rehearse(master,file);
    if(!process.argv.includes('--apply')) return;
    assert.deepEqual(await snapshot(source),before,'Source changed during rehearsal; rerun');
    const result=await migrate(source);assertPreserved(before,await snapshot(source),result.meta);
    await source.request().query(`DBCC CHECKDB (${literal(config.db.database)}) WITH NO_INFOMSGS;`);
    fs.writeFileSync(path.resolve(__dirname,'../../database/catalog-id-map-20261016.json'),JSON.stringify({...result.meta,backup:file},null,2)+'\n');
    console.log('APPLIED: all rows preserved; ID map saved to database/catalog-id-map-20261016.json');
  } finally {if(source) await source.close();if(master) await master.close();}
}
module.exports={marker,property,targets,snapshot,mapping,validate,migrate,assertPreserved,rehearse,backup};
if(require.main===module) main().catch(e=>{console.error(e.message);process.exitCode=1;});
