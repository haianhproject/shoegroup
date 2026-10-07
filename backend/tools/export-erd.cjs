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
  const pool = await new sql.ConnectionPool(config.db).connect();
  let columns, keys, uniqueIndexes;
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
    ['PosCarts', 'PosCartItems'],
  ];
  // A new business table must never silently disappear from the main ERD.
  for (const table of business) if (!lanes.flat().includes(table)) lanes.at(-1).push(table);
  const pages = [];
  function page(id, title, groups, note) {
    const cell = (id, value, style, geometry, parent = '1') =>
      `<mxCell id="${id}" value="${escape(value)}" style="${style}" vertex="1" parent="${parent}"><mxGeometry ${geometry} as="geometry"/></mxCell>`;
    const width = 560, gap = 130, row = 24, top = 36;
    const positions = new Map();
    groups.forEach((group, lane) => {
      let y = 160;
      for (const table of group.filter(t => byTable[t])) {
        const h = top + byTable[table].length * row;
        positions.set(table, { x: 55 + lane * (width + gap), y, h, lane });
        y += h + 105;
      }
    });
    const pageWidth = groups.length * (width + gap) + 10;
    const pageHeight = Math.max(...[...positions.values()].map(p => p.y + p.h)) + 80;
    const cells = ['<mxCell id="0"/><mxCell id="1" parent="0"/>'];
    const textStyle = 'text;html=1;align=left;verticalAlign=middle;fontFamily=Arial;fontColor=#000000;';
    cells.push(cell('title', title, `${textStyle}fontSize=26;fontStyle=1;`, `x="55" y="22" width="${pageWidth-110}" height="40"`));
    cells.push(cell('note', note, `${textStyle}fontSize=13;`, `x="55" y="70" width="${pageWidth-110}" height="55"`));
    keys.forEach((fk, i) => {
      if (!positions.has(fk.tableName) || !positions.has(fk.refTable)) return;
      const col = byTable[fk.tableName].find(c => c.columnName === fk.columnName);
      const source = positions.get(fk.tableName), target = positions.get(fk.refTable);
      const sameLane = source.lane === target.lane;
      const exit = sameLane ? 0 : source.x < target.x ? 1 : 0;
      const entry = sameLane ? 0 : source.x < target.x ? 0 : 1;
      const childMarker = singleUnique.has(`${fk.tableName}.${fk.columnName}`) ? 'ERzeroToOne' : 'ERzeroToMany';
      cells.push(`<mxCell id="fk-${i}" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;jumpStyle=arc;jumpSize=6;strokeColor=#000000;strokeWidth=1;startArrow=${childMarker};endArrow=${col.is_nullable ? 'ERzeroToOne' : 'ERmandOne'};startFill=0;endFill=0;exitX=${exit};exitY=0.5;entryX=${entry};entryY=0.5;" edge="1" parent="1" source="${fk.tableName}-${fk.columnName}" target="${fk.refTable}-${fk.refColumn}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
    });
    for (const [table, p] of positions) {
      const color = '#ffffff';
      cells.push(cell(table, table,
        `swimlane;html=1;startSize=${top};horizontal=1;collapsible=0;fontFamily=Arial;fontSize=16;fontStyle=1;fillColor=${color};swimlaneFillColor=#ffffff;strokeColor=#000000;`,
        `x="${p.x}" y="${p.y}" width="${width}" height="${p.h}"`));
      byTable[table].forEach((c, index) => {
        const fk = keys.some(k => k.tableName === table && k.columnName === c.columnName);
        const marker = [c.is_primary_key ? 'PK' : '', fk ? 'FK' : '', !c.is_primary_key && singleUnique.has(`${table}.${c.columnName}`) ? 'UQ' : ''].filter(Boolean).join(',');
        const rowId = `${table}-${c.columnName}`;
        cells.push(cell(rowId, '',
          'shape=partialRectangle;html=1;whiteSpace=wrap;top=0;bottom=1;left=0;right=0;align=left;verticalAlign=middle;spacingLeft=8;spacingRight=8;fillColor=#ffffff;strokeColor=#000000;',
          `x="0" y="${top+index*row}" width="${width}" height="${row}"`, table));
        cells.push(cell(`${rowId}-key`, marker, `${textStyle}fontSize=11;fontStyle=1;spacingLeft=8;`,
          `x="0" y="0" width="52" height="${row}"`, rowId));
        cells.push(cell(`${rowId}-name`, c.columnName, `${textStyle}fontSize=12;`,
          `x="52" y="0" width="290" height="${row}"`, rowId));
        cells.push(cell(`${rowId}-type`, `${typeName(c)}${c.is_nullable ? ' NULL' : ''}${c.is_identity ? ' ID' : ''}`,
          'text;html=1;align=right;verticalAlign=middle;fontFamily=Arial;fontSize=11;fontColor=#000000;spacingRight=8;',
          `x="342" y="0" width="218" height="${row}"`, rowId));
      });
    }
    pages.push(`<diagram id="${id}" name="${escape(title)}"><mxGraphModel grid="1" gridSize="10" page="1" pageScale="1" pageWidth="${pageWidth}" pageHeight="${pageHeight}" background="#ffffff"><root>${cells.join('\n')}</root></mxGraphModel></diagram>`);
  }
  const businessColumns = columns.filter(c => c.tableName !== 'AppMigrations').length;
  page('overview', 'ShoeGroup — ERD thực tế sau rà soát 04/10/2026', lanes,
    `${business.length} bảng nghiệp vụ · ${businessColumns} thuộc tính · ${keys.length} khóa ngoại. PK: khóa chính; FK: khóa ngoại; UQ: duy nhất; NULL: được phép bỏ trống; ID: tự tăng.\nVòng tròn: có thể không có; chân quạ: nhiều; vạch: một. Bội số xét cả UNIQUE. AppMigrations ở trang kỹ thuật; sysdiagrams là hạ tầng SSMS.`);
  page('accounts', '01 — Tài khoản và giỏ hàng', [
    ['Roles', 'Users'], ['UserAddresses', 'Notifications'], ['Carts', 'CartItems', 'ProductVariants'],
  ], 'Chi tiết thuộc tính. Chỉ vẽ FK giữa các bảng trên trang; xem trang tổng để đối chiếu đầy đủ.');
  page('products', '02 — Sản phẩm và thuộc tính', [lanes[1], lanes[2]],
    'Giá bán lấy từ BasePrice + PriceAdjustment; ưu đãi dùng VariantDiscounts. Ảnh theo màu dùng ProductImages.');
  page('orders', '03 — Đơn hàng và thanh toán', [
    ['Users', 'UserAddresses', 'ShippingMethods'], lanes[3], ['ProductVariants', 'PaymentTransactions', 'Coupons', 'CouponRedemptions'],
  ], 'PaymentMethod lưu trên Orders. VariantDiscountID trong OrderDetails là dấu vết ưu đãi, hiện không có ràng buộc FK.');
  page('pos', '04 — Giỏ bán hàng tại quầy', [
    ['Users', 'PosCarts'], ['PosCartItems', 'ProductVariants', 'Products'],
  ], 'Thêm vào giỏ tại quầy trừ tồn kho ngay; bỏ hàng hoàn kho. Thanh toán tiêu thụ giỏ, không trừ kho lần hai.');
  page('technical', '05 — Hạ tầng migration', [['AppMigrations']],
    'Bảng kỹ thuật ghi nhận migration đã chạy, không phải chức năng nghiệp vụ.\nKhông đưa sysdiagrams và các thủ tục SSMS vào ERD nghiệp vụ.');
  const directory = path.resolve(__dirname, '../../diagrams/erd');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'schema-20261004.json'), JSON.stringify({ database: config.db.database, columns, foreignKeys: keys, uniqueIndexes }, null, 2));
  const diagram = `<?xml version="1.0" encoding="UTF-8"?><mxfile host="app.diagrams.net" compressed="false">${pages.join('\n')}</mxfile>`;
  for (const destination of [path.join(directory, 'ERD-ShoeGroup-20261004.drawio'),
    path.join(directory, 'ERD-SD64-ShoeGroup-Hoan-Chinh.drawio'),
    path.resolve(directory, '../../diagram/ERD-ShoeGroup.drawio')]) fs.writeFileSync(destination, diagram);
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
  fs.writeFileSync(path.resolve(directory, '../../diagram/ERD-KhoaNgoai.md'), relations.join('\n'));
  console.log(JSON.stringify({ businessTables: business.length, businessColumns, foreignKeys: keys.length, pages: pages.length }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
