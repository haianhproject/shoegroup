// Real HTTP + real SQL Server audit. Run explicitly; all writes require audit DB.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { connection, api, users, admin } = require('./helpers/audit-db.cjs');
const sql = require('mssql');
const results = [];
let pool;
const run = Date.now().toString(36);
let sequence = 0;
async function check(id, scenario, expected, fn) {
  try { const actual = await fn(); results.push({ id, scenario, expected, actual, result: 'PASS' }); }
  catch (error) { results.push({ id, scenario, expected, actual: error.message, result: 'FAIL' }); }
  console.log(`${results.at(-1).result} ${id} ${scenario}: ${JSON.stringify(results.at(-1).actual)}`);
}
async function rows(query) { return (await pool.request().query(query)).recordset; }
async function fixture(stock = 10, price = 500000, active = 1) {
  const sku = `AT-${run}-${++sequence}`;
  const r = await pool.request().input('sku', sql.VarChar, sku).input('stock', sql.Int, stock)
    .input('price', sql.Decimal(18, 0), price).input('active', sql.Bit, active).query(`
    INSERT Products(ProductName,BasePrice,SalePrice,IsActive,ParentSKU)
      OUTPUT INSERTED.ProductID VALUES (@sku,@price,0,@active,@sku);
    DECLARE @pid int=SCOPE_IDENTITY();
    INSERT ProductVariants(ProductID,Size,ColorName,ChildSKU,StockQuantity,IsActive)
      OUTPUT INSERTED.ProductVariantID VALUES (@pid,N'M',N'Black',@sku,@stock,1);`);
  return { productId: r.recordsets[0][0].ProductID, productVariantId: r.recordsets[1][0].ProductVariantID, quantity: 1 };
}
const bodyFor = (item, user = users[0], extra = {}) => ({ addressId: user.addressId, paymentMethod: 'COD', items: Array.isArray(item) ? item : [item], ...extra });
const order = (item, { user = users[0], extra = {}, key } = {}) => api('/orders', { method: 'POST', user, body: bodyFor(item, user, extra), headers: key ? { 'Idempotency-Key': key } : {} });
const status = (id, value, user = users[0]) => api(`/orders/${id}/status`, { method: 'PUT', user, body: { status: value, reason: 'Audit cancellation' } });
async function stockOf(item) { return (await rows(`SELECT StockQuantity AS stock FROM ProductVariants WHERE ProductVariantID=${item.productVariantId}`))[0].stock; }
async function coupon(limit = 1, perUser = 1, extra = '') {
  const code = `C-${run}-${++sequence}`;
  await pool.request().input('code', sql.VarChar, code).input('lim', sql.Int, limit).input('per', sql.Int, perUser).query(`
    INSERT Coupons(CouponCode,DiscountPercent,DiscountType,DiscountValue,UsageLimit,UsedCount,ExpiryDate,StartDate,IsActive,PerUserLimit)
      VALUES (@code,10,N'Phần trăm',10,@lim,0,DATEADD(day,1,GETDATE()),DATEADD(day,-1,GETDATE()),1,@per); ${extra}`);
  return code;
}
async function main() {
  pool = await connection().connect();
  const info = (await rows('SELECT DB_NAME() AS db'))[0];
  assert.match(info.db, /^ShoegroupAudit_/);
  await check('T01', 'Stock 7, quantity 10, transaction rollback', '409; stock 7; no order details', async () => {
    const item = await fixture(7); const response = await order({ ...item, quantity: 10 });
    assert.equal(response.status, 409, JSON.stringify(response)); assert.equal(await stockOf(item), 7);
    const counts = await rows(`SELECT COUNT(*) AS n FROM OrderDetails WHERE ProductID=${item.productId}`); assert.equal(counts[0].n, 0);
    return response;
  });
  for (const quantity of [1, 10]) await check(`T02-${quantity}`, `Buy ${quantity} from stock 10`, '200; deducted exactly once', async () => {
    const item = await fixture(); const r = await order({ ...item, quantity }); assert.equal(r.status, 200, JSON.stringify(r));
    assert.equal(await stockOf(item), 10 - quantity); return r.data;
  });
  for (const quantity of [0, -1, 999999, 1.5]) await check(`T03-${quantity}`, `Direct API quantity ${quantity}`, '400/409; stock unchanged', async () => {
    const item = await fixture(); const r = await order({ ...item, quantity }); assert.ok([400,409].includes(r.status), JSON.stringify(r));
    assert.equal(await stockOf(item), 10); return r;
  });
  await check('T04', 'Unknown product and empty order', '409/400', async () => {
    const a = await order({ productId: 2147483647, productVariantId: 2147483647, quantity: 1 });
    const b = await order([]); assert.equal(a.status, 409); assert.equal(b.status, 400); return [a,b];
  });
  await check('T05', 'Disabled product or variant', '409', async () => {
    const item = await fixture(10, 500000, 0); const a = await order(item); assert.equal(a.status, 409);
    await pool.request().query(`UPDATE Products SET IsActive=1 WHERE ProductID=${item.productId}; UPDATE ProductVariants SET IsActive=0 WHERE ProductVariantID=${item.productVariantId}`);
    const b = await order(item); assert.equal(b.status, 409); return [a,b];
  });
  await check('T06', 'Client price/total/discount/shipping tampering', '500k item plus server shipping', async () => {
    const item = await fixture(); const r = await order({ ...item, price: 1 }, { extra: { totalAmount: 1, discountAmount: 999999, shippingFee: 0 } });
    assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(r.data.subtotalAmount, 500000); assert.equal(r.data.discountAmount, 0);
    assert.ok(r.data.shippingFee > 0); return r.data;
  });
  await check('T07', 'Price snapshot survives price edit/sale end', 'UnitPrice at order creation stays 500k', async () => {
    const item = await fixture(10, 600000); await pool.request().query(`UPDATE Products SET SalePrice=500000 WHERE ProductID=${item.productId}`);
    const r = await order(item); assert.equal(r.status, 200, JSON.stringify(r));
    await pool.request().query(`UPDATE Products SET SalePrice=0,BasePrice=700000 WHERE ProductID=${item.productId}`);
    const d = await rows(`SELECT UnitPrice FROM OrderDetails WHERE OrderID=${r.data.orderId}`); assert.equal(d[0].UnitPrice, 500000); return d;
  });
  for (const count of [2,5,10]) await check(`T08-${count}`, `${count} different users buy last SKU`, 'one success, others 409, stock zero, one item', async () => {
    const item = await fixture(1); const r = await Promise.all(users.slice(0,count).map(user => order(item,{user})));
    assert.equal(r.filter(x => x.status === 200).length, 1, JSON.stringify(r));
    assert.ok(r.every(x => [200,409].includes(x.status)), JSON.stringify(r)); assert.equal(await stockOf(item), 0);
    assert.equal((await rows(`SELECT SUM(Quantity) AS q FROM OrderDetails WHERE ProductID=${item.productId}`))[0].q,1); return r.map(x=>x.status);
  });
  await check('T09', 'Repeated same checkout key', 'same order ID; inventory decremented once', async () => {
    const item = await fixture(); const key = `repeat-${run}`; const a = await order(item,{key}); const b = await order(item,{key});
    assert.equal(a.status,200,JSON.stringify(a)); assert.equal(b.status,200,JSON.stringify(b)); assert.equal(a.data.orderId,b.data.orderId);
    assert.equal(await stockOf(item),9); return [a.data.orderId,b.data.orderId];
  });
  await check('T10', '10 parallel retries same checkout key', 'all same order ID, stock decremented once', async () => {
    const item=await fixture(20); const r=await Promise.all(Array.from({length:10},()=>order(item,{key:`parallel-${run}`})));
    assert.ok(r.every(x=>x.status===200),JSON.stringify(r)); assert.equal(new Set(r.map(x=>x.data.orderId)).size,1); assert.equal(await stockOf(item),19); return r.map(x=>x.data.orderId);
  });
  await check('T11', 'Same key different payload', '409 conflict', async()=>{
    const item=await fixture(); const key=`conflict-${run}`; await order(item,{key}); const r=await order({...item,quantity:2},{key}); assert.equal(r.status,409,JSON.stringify(r)); return r;
  });
  await check('T12', 'Two users campaign one-time coupon', 'one success, one 409, counter 1', async()=>{
    const item=await fixture(); const code=await coupon(); const r=await Promise.all(users.slice(0,2).map(user=>order(item,{user,extra:{couponCode:code}})));
    assert.equal(r.filter(x=>x.status===200).length,1,JSON.stringify(r)); assert.ok(r.every(x=>[200,409].includes(x.status)),JSON.stringify(r));
    assert.equal((await pool.request().input('c',sql.VarChar,code).query('SELECT UsedCount FROM Coupons WHERE CouponCode=@c')).recordset[0].UsedCount,1);return r.map(x=>x.status);
  });
  await check('T13', 'Same user concurrent PerUserLimit=1 coupon', 'one success, one 409', async()=>{
    const item=await fixture(); const code=await coupon(100,1); const r=await Promise.all([order(item,{extra:{couponCode:code}}),order(item,{extra:{couponCode:code}})]);
    assert.equal(r.filter(x=>x.status===200).length,1,JSON.stringify(r));assert.ok(r.every(x=>[200,409].includes(x.status)),JSON.stringify(r));return r.map(x=>x.status);
  });
  await check('T14', 'Invalid/expired coupon', '409 stock unchanged', async()=>{
    const item=await fixture(); const r=await Promise.all(['MISSING-COUPON','AUDIT-EXPIRED'].map(code=>order(item,{extra:{couponCode:code}})));
    assert.ok(r.every(x=>x.status===409),JSON.stringify(r));assert.equal(await stockOf(item),10);return r;
  });
  await check('T15', 'Cancel and duplicate cancel', 'stock restored once; repeated cancel succeeds unchanged', async()=>{
    const item=await fixture();const r=await order(item); assert.equal(r.status,200,JSON.stringify(r)); const a=await status(r.data.orderId,'Đã hủy'); const b=await status(r.data.orderId,'Đã hủy');
    assert.equal(a.status,200,JSON.stringify(a));assert.equal(b.status,200,JSON.stringify(b));assert.equal(await stockOf(item),10);return[a,b];
  });
  await check('T16', 'Order ownership and admin authorization', '403/401, owner unaffected', async()=>{
    const item=await fixture();const r=await order(item); const id=r.data.orderId; const denied=await Promise.all([
      status(id,'Đã hủy',users[1]), api(`/orders/${id}/payment`,{method:'PUT',user:users[1],body:{payment_status:'Đã thanh toán'}}),
      api(`/orders/${id}/address`,{method:'PUT',user:users[1],body:{addressId:users[1].addressId}}), api('/orders',{user:users[1]}),
      api('/inventory',{user:users[1]}),api('/inventory',{user:null}),api(`/customers/${users[0].id}/orders`,{user:users[1]})]);
    assert.ok(denied.every(x=>[401,403].includes(x.status)),JSON.stringify(denied));assert.equal(await stockOf(item),9);return denied.map(x=>x.status);
  });
  await check('T17', 'Customer transfer declaration cannot create paid money', 'pending declaration; no SUCCESS or valid signature', async()=>{
    const item=await fixture();const r=await order(item,{extra:{paymentMethod:'BANK'}});const id=r.data.orderId;
    const declared=await api(`/orders/${id}/payment`,{method:'PUT',body:{payment_status:'Đã thanh toán'}});assert.equal(declared.status,200,JSON.stringify(declared));
    const o=(await rows(`SELECT PaymentStatus FROM Orders WHERE OrderID=${id}`))[0];assert.equal(o.PaymentStatus,'Chờ thanh toán');
    const p=await rows(`SELECT Status,SignatureValid FROM PaymentTransactions WHERE OrderID=${id}`);assert.ok(p.every(x=>x.Status!=='SUCCESS'&&!x.SignatureValid),JSON.stringify(p));
    const confirmed=await status(id,'Đã xác nhận',admin);assert.equal(confirmed.status,409,JSON.stringify(confirmed));return {declared,o,p,confirmed};
  });
  await check('T18', 'Cancelled cannot become shipped/paid', '409', async()=>{
    const item=await fixture();const r=await order(item,{extra:{paymentMethod:'BANK'}});const id=r.data.orderId;await status(id,'Đã hủy');
    const a=await status(id,'Đang vận chuyển',admin);const b=await api(`/orders/${id}/payment`,{method:'PUT',body:{payment_status:'Đã thanh toán'}});
    assert.equal(a.status,409,JSON.stringify(a));assert.equal(b.status,409,JSON.stringify(b));return[a,b];
  });
  await check('T19', 'Duplicate admin paid confirmation then paid cancellation', 'one SUCCESS; refund pending, never fake refunded', async()=>{
    const item=await fixture();const r=await order(item,{extra:{paymentMethod:'BANK'}});const id=r.data.orderId;
    const a=await api(`/orders/${id}/payment`,{method:'PUT',user:admin,body:{payment_status:'Đã thanh toán'}});
    const b=await api(`/orders/${id}/payment`,{method:'PUT',user:admin,body:{payment_status:'Đã thanh toán'}});assert.equal(a.status,200,JSON.stringify(a));assert.equal(b.status,200,JSON.stringify(b));
    await status(id,'Đã hủy'); const p=await rows(`SELECT Provider,Status FROM PaymentTransactions WHERE OrderID=${id}`);
    assert.equal(p.filter(x=>x.Status==='SUCCESS').length,1);assert.equal(p.filter(x=>x.Status==='REFUNDED').length,0);
    assert.equal((await rows(`SELECT PaymentStatus FROM Orders WHERE OrderID=${id}`))[0].PaymentStatus,'Chờ hoàn tiền');return p;
  });
  await check('T20', 'POS tampered amount and stale item price', '409 until cashier confirms canonical 500k; no stock change on rejection', async()=>{
    const item=await fixture();const r=await order({...item,price:1},{user:admin,extra:{addressId:null,payment_method:'Tiền mặt',paymentMethod:'COD',payment_status:'Đã thanh toán',status:'Đã nhận hàng',total:1,shipping_fee:1}});
    assert.equal(r.status,409,JSON.stringify(r));assert.equal(await stockOf(item),10);
    const confirmed=await order({...item,price:1},{user:admin,extra:{addressId:null,payment_status:'Đã thanh toán',status:'Đã nhận hàng',total:500000}});
    assert.equal(confirmed.status,200,JSON.stringify(confirmed));assert.equal(confirmed.data.totalAmount,500000);return {rejected:r,confirmed};
  });
  await check('T21', 'POS cannot create cancelled order consuming stock', '400/409', async()=>{
    const item=await fixture();const r=await order({...item,price:500000},{user:admin,extra:{addressId:null,status:'Đã hủy',total:500000}});assert.ok([400,409].includes(r.status),JSON.stringify(r));assert.equal(await stockOf(item),10);return r;
  });
  await check('T22', 'Hard product deletion preserves order history', '409, order detail remains', async()=>{
    const item=await fixture();const r=await order(item);const deleted=await api(`/products/${item.productId}?hard=1`,{method:'DELETE',user:admin});assert.equal(deleted.status,409,JSON.stringify(deleted));
    assert.equal((await rows(`SELECT COUNT(*) AS n FROM OrderDetails WHERE OrderID=${r.data.orderId}`))[0].n,1);return deleted;
  });
  await check('T23', 'Public paginated products without optional filters', '200', async()=>{const r=await api('/v2/products',{user:null});assert.equal(r.status,200,JSON.stringify(r));return {status:r.status,count:r.data.data.length};});
  await check('T24', 'SQL consistency after API tests', 'no orphan/empty orders; no negative stock', async()=>{
    const r=await rows(`SELECT (SELECT COUNT(*) FROM ProductVariants WHERE StockQuantity<0) AS negative,
      (SELECT COUNT(*) FROM Orders o WHERE NOT EXISTS(SELECT 1 FROM OrderDetails d WHERE d.OrderID=o.OrderID)) AS emptyOrders,
      (SELECT COUNT(*) FROM OrderDetails d LEFT JOIN Orders o ON d.OrderID=o.OrderID WHERE o.OrderID IS NULL) AS orphanItems`);
    assert.deepEqual(r[0],{negative:0,emptyOrders:0,orphanItems:0});return r;
  });
  await pool.close();
  const output=path.resolve(__dirname, '../../docs/audit',process.env.AUDIT_REPORT || 'runtime-results.json');fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify({database:info.db,time:new Date().toISOString(),port:process.env.AUDIT_PORT||5100,results},null,2));
  console.log(JSON.stringify({passed:results.filter(x=>x.result==='PASS').length,failed:results.filter(x=>x.result==='FAIL').length,report:output}));
  if(results.some(x=>x.result==='FAIL'))process.exitCode=1;
}
module.exports = { fixture, bodyFor, order, status, stockOf, coupon, rows, check, results, setPool: value => { pool=value; } };
if (require.main === module) main().catch(async error=>{console.error(error);await pool?.close();process.exitCode=1});
