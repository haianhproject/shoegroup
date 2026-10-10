// Muc dich: Sao luu, ap dung migration va xuat ERD tu metadata SQL Server.
const fs = require('node:fs');
const path = require('node:path');
const sql = require('../legacy-express/node_modules/mssql');
const config = require('../legacy-express/src/security/env');
const root = path.resolve(__dirname, '../..');
const migration = path.join(root, 'database/migrations/20261010_catalog_optimization.sql');
async function migrate(pool) {
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    for (const batch of fs.readFileSync(migration,'utf8').split(/^\s*GO\s*$/mi)) if(batch.trim()) await new sql.Request(tx).batch(batch);
    await tx.commit();
  } catch(e) { try { await tx.rollback(); } catch {} throw e; }
}
const xml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
async function exportErd(pool) {
  const r = await pool.request().query(`SELECT t.name AS tbl,c.name AS col,ty.name AS typ,c.max_length,c.precision,c.scale,c.is_nullable,c.is_identity,
    CASE WHEN EXISTS(SELECT 1 FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id WHERE i.object_id=t.object_id AND i.is_primary_key=1 AND ic.column_id=c.column_id) THEN 1 ELSE 0 END AS pk
    FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id ORDER BY t.name,c.column_id;
    SELECT fk.name,OBJECT_NAME(fkc.parent_object_id) AS child,COL_NAME(fkc.parent_object_id,fkc.parent_column_id) AS col,OBJECT_NAME(fkc.referenced_object_id) AS parent FROM sys.foreign_key_columns fkc JOIN sys.foreign_keys fk ON fk.object_id=fkc.constraint_object_id ORDER BY fk.name;`);
  const tables = [...new Set(r.recordsets[0].map(c=>c.tbl))];
  const edges = r.recordsets[1];
  let cells = '<mxCell id="0"/><mxCell id="1" parent="0"/>';
  let mermaid = 'erDiagram\n';
  const columns = tables.map(t=>r.recordsets[0].filter(c=>c.tbl===t));
  const rowY=[];
  for(let i=0,y=0;i<tables.length;i+=4) { rowY.push(y); y+=Math.max(...columns.slice(i,i+4).map(c=>50+c.length*22))+100; }
  const columnType=c=>c.typ+(['varchar','nvarchar','char','nchar','varbinary'].includes(c.typ)
    ? `(${c.max_length===-1?'max':c.max_length/(c.typ.startsWith('n')?2:1)})`
    : ['decimal','numeric'].includes(c.typ)?`(${c.precision},${c.scale})`:'');
  tables.forEach((t,i)=>{
    const cols=columns[i];
    const rows=cols.map(c=>`${c.pk?'PK ':''}${edges.some(e=>e.child===t&&e.col===c.col)?'FK ':''}${c.col} : ${columnType(c)}${c.is_nullable?' NULL':' NOT NULL'}${c.is_identity?' IDENTITY':''}`);
    cells+=`<mxCell id="t${i}" value="${xml('<b>'+t+'</b><br>'+rows.join('<br>'))}" style="rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacing=8;fontSize=10;" vertex="1" parent="1"><mxGeometry x="${(i%4)*470}" y="${rowY[Math.floor(i/4)]}" width="430" height="${50+cols.length*22}" as="geometry"/></mxCell>`;
    mermaid+=`  ${t} {\n${cols.map(c=>`    ${c.typ} ${c.col}${c.pk?' PK':edges.some(e=>e.child===t&&e.col===c.col)?' FK':''}`).join('\n')}\n  }\n`;
  });
  edges.forEach((e,i)=>{
    cells+=`<mxCell id="e${i}" value="${xml(e.col)}" style="edgeStyle=orthogonalEdgeStyle;html=1;endArrow=ERmany;startArrow=ERone;" edge="1" parent="1" source="t${tables.indexOf(e.parent)}" target="t${tables.indexOf(e.child)}"><mxGeometry relative="1" as="geometry"/></mxCell>`;
    const optional=r.recordsets[0].find(c=>c.tbl===e.child&&c.col===e.col).is_nullable;
    mermaid+=`  ${e.parent} ${optional?'|o':'||'}--o{ ${e.child} : "${e.col}"\n`;
  });
  fs.writeFileSync(path.join(root,'database/ERD.drawio'),`<mxfile><diagram name="ShoeGroup"><mxGraphModel><root>${cells}</root></mxGraphModel></diagram></mxfile>`);
  fs.writeFileSync(path.join(root,'database/ERD.md'),'# ERD ShoeGroup\n\nDuoc tao tu database thuc te; AppMigrations la bang ky thuat.\n\n```mermaid\n'+mermaid+'```\n');
  fs.writeFileSync(path.join(root,'database/schema-current.json'),JSON.stringify(r.recordsets,null,2));
}
async function main() {
  const pool=await new sql.ConnectionPool(config.db).connect();
  try {
    if(process.argv.includes('--apply')) {
      const dirs=await pool.request().query("SELECT CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultBackupPath')) AS dir");
      const dir=dirs.recordset[0].dir;
      if(!dir) throw Error('Khong tim thay thu muc backup SQL Server; dung truoc khi sua DB.');
      const backup=path.win32.join(dir,`${config.db.database}_before_catalog_${Date.now()}.bak`);
      await pool.request().input('file',sql.NVarChar,backup).query(`BACKUP DATABASE [${config.db.database.replace(/]/g,']]')}] TO DISK=@file WITH COPY_ONLY,INIT`);
      console.log('Backup:',backup);
      await migrate(pool); console.log('Catalog migration applied.');
    }
    if(process.argv.includes('--erd')) { await exportErd(pool); console.log('ERD exported to database/ERD.drawio and ERD.md.'); }
  } finally { await pool.close(); }
}
module.exports={migrate,exportErd};
if(require.main===module) main().catch(e=>{console.error(e.message);process.exitCode=1;});
