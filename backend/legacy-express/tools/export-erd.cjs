// Read the configured SQL Server catalog; generate an ERD without copying data.
const fs = require('node:fs');
const path = require('node:path');
const sql = require('mssql');
const config = require('../src/security/env');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function typeName(c) {
  if (['varchar', 'nvarchar', 'char', 'nchar', 'varbinary'].includes(c.type)) {
    const length = c.max_length === -1 ? 'max' : c.max_length / (c.type.startsWith('n') ? 2 : 1);
    return `${c.type}(${length})`;
  }
  return ['decimal', 'numeric'].includes(c.type) ? `${c.type}(${c.precision},${c.scale})` : c.type;
}
async function main() {
  let columns, keys, uniqueIndexes;
  const snapshotFlag = process.argv.indexOf('--schema');
  if (snapshotFlag !== -1) {
    const snapshot = JSON.parse(fs.readFileSync(path.resolve(process.argv[snapshotFlag + 1]), 'utf8'));
    ({columns, foreignKeys: keys, uniqueIndexes} = snapshot);
  } else {
    const pool = await new sql.ConnectionPool(config.db).connect();
    try {
    const result = await pool.request().query(`
      SELECT t.name tableName,c.name columnName,ty.name type,c.max_length,c.precision,c.scale,
        c.is_nullable,c.is_identity,c.column_id,
        CASE WHEN pk.column_id IS NOT NULL THEN 1 ELSE 0 END is_primary_key
      FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id
      JOIN sys.types ty ON ty.user_type_id=c.user_type_id
      LEFT JOIN (SELECT ic.object_id,ic.column_id FROM sys.index_columns ic JOIN sys.indexes i
        ON i.object_id=ic.object_id AND i.index_id=ic.index_id WHERE i.is_primary_key=1) pk
        ON pk.object_id=c.object_id AND pk.column_id=c.column_id
      WHERE t.schema_id=SCHEMA_ID('dbo') AND t.name<>'sysdiagrams'
      ORDER BY t.name,c.column_id;
      SELECT fk.name,OBJECT_NAME(fk.parent_object_id) tableName,
        COL_NAME(fc.parent_object_id,fc.parent_column_id) columnName,
        OBJECT_NAME(fk.referenced_object_id) refTable,
        COL_NAME(fc.referenced_object_id,fc.referenced_column_id) refColumn,
        fk.delete_referential_action_desc onDelete, fk.update_referential_action_desc onUpdate
      FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fc ON fc.constraint_object_id=fk.object_id
      ORDER BY fk.name,fc.constraint_column_id;
      SELECT OBJECT_NAME(i.object_id) tableName,i.name,c.name columnName,ic.key_ordinal,
        i.has_filter,i.filter_definition
      FROM sys.indexes i JOIN sys.index_columns ic ON i.object_id=ic.object_id AND i.index_id=ic.index_id
      JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
      WHERE i.is_unique=1 AND ic.key_ordinal>0 AND OBJECTPROPERTY(i.object_id,'IsUserTable')=1
      ORDER BY tableName,i.name,ic.key_ordinal;`);
    [columns, keys, uniqueIndexes] = result.recordsets;
    } finally { await pool.close(); }
  }
  const labels = JSON.parse(fs.readFileSync(path.join(__dirname, 'erd-labels.vi.json'), 'utf8'));
  for (const c of columns) {
    if (!labels[c.tableName] || !labels[`${c.tableName}-${c.columnName}-name`]) {
      throw new Error(`Missing Vietnamese label: ${c.tableName}.${c.columnName}`);
    }
  }
  const byTable = Object.groupBy(columns, c => c.tableName);
  const uniqueGroups = Object.values(Object.groupBy(uniqueIndexes, i => `${i.tableName}.${i.name}`));
  const singleUnique = new Set(uniqueGroups.filter(g => g.length === 1 && !g[0].has_filter)
    .map(g => `${g[0].tableName}.${g[0].columnName}`));
  const business = Object.keys(byTable).filter(t => t !== 'AppMigrations');
  const lanes = [
    ['Roles', 'Users', 'UserAddresses', 'Notifications', 'Carts', 'CartItems'],
    ['Brands', 'Categories', 'Materials', 'Colors', 'Sizes'],
    ['Products', 'ProductImages', 'ProductVariants', 'VariantDiscounts'],
    ['Orders', 'OrderDetails', 'OrderStatusHistory', 'CheckoutRequests'],
    ['ShippingMethods', 'PaymentTransactions', 'Coupons', 'CouponRedemptions'],
    ['PosCarts', 'PosCartItems', 'AppMigrations'],
  ];
  // A new business table must never silently disappear from the main ERD.
  for (const table of business) if (!lanes.flat().includes(table)) lanes.at(-1).push(table);
  const pages = [];
  function page(id, title, groups, note) {
    const cell = (id, value, style, geometry, parent = '1') =>
      `<mxCell id="${id}" value="${escape(value.replaceAll('\n', '<br>'))}" style="${style}" vertex="1" parent="${parent}"><mxGeometry ${geometry} as="geometry"/></mxCell>`;
    const width = 930, gap = 210, row = 28, top = 40;
    // Orthogonal connectors may extend past their waypoints by a small jetty.
    // Keep them inside the page; a negative bound creates an extra page in Draw.io.
    const left = 100, margin = 40;
    const positions = new Map();
    groups.forEach((group, lane) => {
      let y = 200;
      for (const table of group.filter(t => byTable[t])) {
        const h = top + byTable[table].length * row;
        positions.set(table, { x: left + lane * (width + gap), y, h, lane });
        y += h + 115;
      }
    });
    const pageWidth = left + (groups.length - 1) * (width + gap) + width + margin;
    const tableBottom = Math.max(...[...positions.values()].map(p => p.y + p.h));
    let pageHeight = tableBottom + 80;
    let longRouteCount = 0;
    const cells = ['<mxCell id="0"/><mxCell id="1" parent="0"/>'];
    const textStyle = 'text;html=1;align=left;verticalAlign=middle;fontFamily=Arial;fontColor=#000000;';
    cells.push(cell('title', title, `${textStyle}fontSize=26;fontStyle=1;`, `x="${left}" y="22" width="${pageWidth-left-margin}" height="40"`));
    cells.push(cell('note', note, `${textStyle}fontSize=14;whiteSpace=wrap;`, `x="${left}" y="78" width="${pageWidth-left-margin}" height="85"`));
    keys.forEach((fk, i) => {
      if (!positions.has(fk.tableName) || !positions.has(fk.refTable)) return;
      const col = byTable[fk.tableName].find(c => c.columnName === fk.columnName);
      const source = positions.get(fk.tableName), target = positions.get(fk.refTable);
      const sameLane = source.lane === target.lane;
      const exit = sameLane ? 0 : source.x < target.x ? 1 : 0;
      const entry = sameLane ? 0 : source.x < target.x ? 0 : 1;
      const sourceY = source.y + top + byTable[fk.tableName].findIndex(c => c.columnName === fk.columnName) * row + row / 2;
      const targetY = target.y + top + byTable[fk.refTable].findIndex(c => c.columnName === fk.refColumn) * row + row / 2;
      let points;
      if (sameLane) {
        const routeX = source.x - 32 - (i % 6) * 4;
        points = [[routeX, sourceY], [routeX, targetY]];
      } else if (Math.abs(source.lane - target.lane) === 1) {
        const routeX = Math.min(source.x, target.x) + width + gap / 2 + ((i % 7) - 3) * 12;
        points = [[routeX, sourceY], [routeX, targetY]];
      } else {
        const offset = ((i % 7) - 3) * 12;
        const sourceX = exit ? source.x + width + gap / 2 + offset : source.x - gap / 2 + offset;
        const targetX = entry ? target.x + width + gap / 2 + offset : target.x - gap / 2 + offset;
        const routeY = tableBottom + 45 + longRouteCount++ * 24;
        pageHeight = Math.max(pageHeight, routeY + 35);
        points = [[sourceX, sourceY], [sourceX, routeY], [targetX, routeY], [targetX, targetY]];
      }
      const geometry = `<Array as="points">${points.map(([x,y]) => `<mxPoint x="${x}" y="${y}"/>`).join('')}</Array>`;
      const childMarker = singleUnique.has(`${fk.tableName}.${fk.columnName}`) ? 'ERzeroToOne' : 'ERzeroToMany';
      cells.push(`<mxCell id="fk-${i}" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;jumpStyle=arc;jumpSize=6;strokeColor=#000000;strokeWidth=1;startArrow=${childMarker};endArrow=${col.is_nullable ? 'ERzeroToOne' : 'ERmandOne'};startFill=0;endFill=0;exitX=${exit};exitY=0.5;entryX=${entry};entryY=0.5;" edge="1" parent="1" source="${fk.tableName}-${fk.columnName}" target="${fk.refTable}-${fk.refColumn}"><mxGeometry relative="1" as="geometry">${geometry}</mxGeometry></mxCell>`);
    });
    for (const [table, p] of positions) {
      const color = '#ffffff';
      cells.push(cell(table, labels[table],
        `swimlane;html=1;startSize=${top};horizontal=1;collapsible=0;fontFamily=Arial;fontSize=16;fontStyle=1;fillColor=${color};swimlaneFillColor=#ffffff;strokeColor=#000000;`,
        `x="${p.x}" y="${p.y}" width="${width}" height="${p.h}"`));
      byTable[table].forEach((c, index) => {
        const fk = keys.some(k => k.tableName === table && k.columnName === c.columnName);
        const marker = [c.is_primary_key ? 'PK' : '', fk ? 'FK' : '', !c.is_primary_key && singleUnique.has(`${table}.${c.columnName}`) ? 'UQ' : ''].filter(Boolean).join(',');
        const rowId = `${table}-${c.columnName}`;
        cells.push(cell(rowId, '',
          'shape=partialRectangle;html=1;whiteSpace=wrap;top=0;bottom=1;left=1;right=1;align=left;verticalAlign=middle;spacingLeft=8;spacingRight=8;fillColor=#ffffff;strokeColor=#000000;',
          `x="0" y="${top+index*row}" width="${width}" height="${row}"`, table));
        cells.push(cell(`${rowId}-key`, marker, `${textStyle}fontSize=11;fontStyle=1;spacingLeft=8;`,
          `x="0" y="0" width="52" height="${row}"`, rowId));
        cells.push(cell(`${rowId}-name`, labels[`${rowId}-name`], `${textStyle}fontSize=13;`,
          `x="52" y="0" width="610" height="${row}"`, rowId));
        cells.push(cell(`${rowId}-type`, `${typeName(c)}${c.is_nullable ? ' NULL' : ' NOT NULL'}${c.is_identity ? ' AI' : ''}`,
          'text;html=1;align=right;verticalAlign=middle;fontFamily=Arial;fontSize=11;fontColor=#000000;spacingRight=8;',
          `x="662" y="0" width="268" height="${row}"`, rowId));
      });
    }
    pages.push(`<diagram id="${id}" name="${escape(title)}"><mxGraphModel grid="1" gridSize="10" page="1" pageScale="1" pageWidth="${pageWidth}" pageHeight="${pageHeight}" background="#ffffff"><root>${cells.join('\n')}</root></mxGraphModel></diagram>`);
  }
  const businessColumns = columns.filter(c => c.tableName !== 'AppMigrations').length;
  page('shoegroup-erd', 'ShoeGroup — Sơ đồ thực thể và quan hệ cơ sở dữ liệu', lanes,
    `${business.length} bảng nghiệp vụ và 1 bảng kỹ thuật · ${columns.length} thuộc tính · ${keys.length} khóa ngoại.\nPK: khóa chính; FK: khóa ngoại; UQ: duy nhất; AI: tự tăng; NULL / NOT NULL: được phép / không được phép bỏ trống.\nKý hiệu quan hệ: vòng tròn = 0; vạch = 1; chân quạ = nhiều. Tên tiếng Việt giải nghĩa tên bảng và thuộc tính.`);
  const directory = path.resolve(__dirname, '../../../docs/diagrams/erd');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'schema.json'), JSON.stringify({ database: config.db.database, columns, foreignKeys: keys, uniqueIndexes }, null, 2));
  const diagram = `<?xml version="1.0" encoding="UTF-8"?><mxfile host="app.diagrams.net" compressed="false">${pages.join('\n')}</mxfile>`;
  fs.writeFileSync(path.join(directory, 'ERD-ShoeGroup-Hoan-Chinh.drawio'), diagram);
  const relations = [`# Chi tiết ${keys.length} khóa ngoại trong ERD ShoeGroup`, '',
    'Đọc mũi tên: **cột FK ở bảng con → cột PK ở bảng cha**. Bội số là số dòng con tối đa/tối thiểu cho một dòng cha; FK đơn thuần không bắt buộc cha phải có con.', '',
    '| FK ở bảng con → PK ở bảng cha | Số dòng con / một dòng cha | FK được NULL | Khi xóa cha |',
    '| --- | --- | --- | --- |'];
  for (const fk of keys) {
    const c = byTable[fk.tableName].find(c => c.columnName === fk.columnName);
    relations.push(`| ${fk.tableName}.${fk.columnName} → ${fk.refTable}.${fk.refColumn} | ${singleUnique.has(`${fk.tableName}.${fk.columnName}`) ? '0..1 (UNIQUE)' : '0..N'} | ${c.is_nullable ? 'Có' : 'Không'} | ${fk.onDelete} |`);
  }
  relations.push('', '`NO_ACTION`: chặn xóa cha nếu còn con tham chiếu. `CASCADE`: SQL Server tự xóa dòng con liên quan, nhưng toàn lệnh vẫn có thể bị một FK khác chặn.',
    '', 'Mọi FK hiện tại đều có ON UPDATE NO_ACTION. Các UNIQUE ghép không có nghĩa từng cột riêng lẻ là duy nhất.', '',
    'UNIQUE ghép đáng chú ý: CartItems(CartID, ProductVariantID); PosCartItems(UserID, ProductVariantID); ProductVariants(ProductID, ColorName, Size). CheckoutRequests có PK ghép (UserID, IdempotencyKey).', '',
    'Các cột giống ID nhưng chưa có FK vật lý: OrderDetails.VariantDiscountID, OrderStatusHistory.ChangedBy, Notifications.RelatedID. Không tự suy diễn thành đường nối FK.', '',
    'PosCarts.UserID vừa là PK vừa là FK đến Users; mỗi tài khoản có tối đa một giỏ tại quầy.');
  fs.writeFileSync(path.join(directory, 'ERD-KhoaNgoai.md'), relations.join('\n'));
  console.log(JSON.stringify({ businessTables: business.length, businessColumns, foreignKeys: keys.length, pages: pages.length }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
