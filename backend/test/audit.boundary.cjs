const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const sql=require('mssql');
const {connection,api,users,admin}=require('./helpers/audit-db.cjs');
const {fixture,order,stockOf,coupon,rows,check,results,setPool}=require('./audit.integration.cjs');
let pool;
async function main(){pool=await connection().connect();setPool(pool);
  await check('B01','Stale inventory editor after sale','409 and stock remains 9; refreshed edit succeeds',async()=>{
    const item=await fixture();const old=(await rows(`SELECT Version FROM ProductVariants WHERE ProductVariantID=${item.productVariantId}`))[0].Version||0;await order(item);
    const stale=await api(`/inventory/${item.productVariantId}`,{method:'PUT',user:admin,body:{stock:10,version:old}});assert.equal(stale.status,409,JSON.stringify(stale));assert.equal(await stockOf(item),9);
    const fresh=await api(`/inventory/${item.productVariantId}`,{method:'PUT',user:admin,body:{stock:11,version:old+1}});assert.equal(fresh.status,200,JSON.stringify(fresh));assert.equal(await stockOf(item),11);return [stale,fresh];
  });
  await check('B02','Stale product form cannot overwrite sold inventory','409; product and stock both unchanged',async()=>{
    const item=await fixture();const before=(await rows(`SELECT p.ProductName,v.Version FROM Products p JOIN ProductVariants v ON v.ProductID=p.ProductID WHERE v.ProductVariantID=${item.productVariantId}`))[0];await order(item);
    const r=await api(`/products/${item.productId}`,{method:'PUT',user:admin,body:{name:'Changed by stale form',price:500000,variants:[{id:item.productVariantId,size:'M',color:'Black',stock:10,version:before.Version||0}]}});
    assert.equal(r.status,409,JSON.stringify(r));assert.equal(await stockOf(item),9);assert.equal((await rows(`SELECT ProductName FROM Products WHERE ProductID=${item.productId}`))[0].ProductName,before.ProductName);return r;
  });
  await check('B03','Payment hold is 24 real hours, DB clock maps correctly','24 hours (+/- 5 seconds), DB time within 2s',async()=>{
    const item=await fixture();const r=await order(item,{extra:{paymentMethod:'BANK'}});const row=(await rows(`SELECT PaymentDueAt,GETDATE() AS localTime FROM Orders WHERE OrderID=${r.data.orderId}`))[0];
    const hours=(new Date(row.PaymentDueAt)-Date.now())/3600000;assert.ok(Math.abs(hours-24)<5/3600,JSON.stringify({hours,row}));assert.ok(Math.abs(new Date(row.localTime)-Date.now())<2000,JSON.stringify(row));return {hours,row};
  });
  await check('B04','Same SKU group requested in reverse order by 5 users','all success with sufficient stock; no deadlock',async()=>{
    const a=await fixture(10),b=await fixture(10);const r=await Promise.all(users.slice(0,5).map((user,i)=>order(i%2?[b,a]:[a,b],{user})));
    assert.ok(r.every(x=>x.status===200),JSON.stringify(r));assert.equal(await stockOf(a),5);assert.equal(await stockOf(b),5);return r.map(x=>x.status);
  });
  await check('B05','Failure after order/items/stock/coupon counter mutation','all changes rolled back; same idempotency key can retry',async()=>{
    const item=await fixture();const code=await coupon(100);const key=`rollback-${Date.now()}`;
    await pool.request().batch(`CREATE OR ALTER TRIGGER dbo.AuditFailCoupon ON dbo.CouponRedemptions AFTER INSERT AS BEGIN THROW 51000,'Audit injected coupon ledger failure',1; END`);
    let failed;try{failed=await order(item,{key,extra:{couponCode:code}});}finally{await pool.request().query('DROP TRIGGER dbo.AuditFailCoupon');}
    assert.equal(failed.status,500,JSON.stringify(failed));assert.equal(await stockOf(item),10);assert.equal((await rows(`SELECT COUNT(*) AS n FROM OrderDetails WHERE ProductID=${item.productId}`))[0].n,0);
    const used=(await pool.request().input('code',sql.VarChar,code).query('SELECT UsedCount FROM Coupons WHERE CouponCode=@code')).recordset[0].UsedCount;assert.equal(used,0);
    const retry=await order(item,{key,extra:{couponCode:code}});assert.equal(retry.status,200,JSON.stringify(retry));return {failed,retry};
  });
  await check('B06','Manual confirmation amount/currency mismatch','409, order remains unpaid',async()=>{
    const item=await fixture();const r=await order(item,{extra:{paymentMethod:'BANK'}});const id=r.data.orderId;
    const a=await api(`/orders/${id}/payment`,{method:'PUT',user:admin,body:{payment_status:'Đã thanh toán',amount:400000,currency:'VND'}});
    const b=await api(`/orders/${id}/payment`,{method:'PUT',user:admin,body:{payment_status:'Đã thanh toán',amount:r.data.totalAmount,currency:'USD'}});assert.equal(a.status,409,JSON.stringify(a));assert.equal(b.status,409,JSON.stringify(b));return[a,b];
  });
  await check('B07','Coupon start/end exact boundaries use persisted instants','before start false; start true; before end true; end true; after end false',async()=>{
    const code=await coupon();const start=new Date(Date.now()+3600000),end=new Date(start.getTime()+3600000);
    await pool.request().input('code',sql.VarChar,code).input('start',sql.DateTime,start).input('end',sql.DateTime,end).query('UPDATE Coupons SET StartDate=@start,ExpiryDate=@end WHERE CouponCode=@code');
    const times=[new Date(start.getTime()-1000),start,new Date(end.getTime()-1000),end,new Date(end.getTime()+1000)];const actual=[];
    for(const at of times){actual.push((await pool.request().input('code',sql.VarChar,code).input('at',sql.DateTime,at).query(`SELECT CASE WHEN StartDate<=@at AND ExpiryDate>=@at THEN 1 ELSE 0 END AS active FROM Coupons WHERE CouponCode=@code`)).recordset[0].active);}
    assert.deepEqual(actual,[0,1,1,1,0]);return actual;
  });
  await check('B08','Coupon minimum and maximum discount cap','below min 409, max discount 20000',async()=>{
    const item=await fixture();const code=await coupon(100);await pool.request().input('code',sql.VarChar,code).query('UPDATE Coupons SET MinOrderAmount=1000000,MaxDiscountAmount=20000 WHERE CouponCode=@code');
    const a=await order(item,{extra:{couponCode:code}});const b=await order({...item,quantity:2},{extra:{couponCode:code}});assert.equal(a.status,409);assert.equal(b.status,200,JSON.stringify(b));assert.equal(b.data.discountAmount,20000);return[a,b];
  });
  await check('B09','Old admin JWT after demotion','403 admin access',async()=>{
    const former={...users[10],role:'Admin'};const r=await api('/inventory',{user:former});assert.equal(r.status,403,JSON.stringify(r));return r;
  });
  await check('B10','POS creates real internal collection ledger and revenue deadline','one collection and 14-day eligibility',async()=>{
    const item=await fixture();const r=await order({...item,price:500000},{user:admin,extra:{addressId:null,payment_status:'Đã thanh toán',status:'Đã nhận hàng',total:500000}});assert.equal(r.status,200,JSON.stringify(r));
    const id=r.data.orderId;const records=await rows(`SELECT Provider,Amount,SignatureValid FROM PaymentTransactions WHERE OrderID=${id} AND Status=N'SUCCESS'`);assert.equal(records.length,1);assert.equal(records[0].Amount,r.data.totalAmount);assert.equal(records[0].SignatureValid,false);
    assert.ok((await rows(`SELECT RevenueEligibleDate FROM Orders WHERE OrderID=${id}`))[0].RevenueEligibleDate);return records;
  });
  await check('B11','Paid POS awaiting fulfillment has collection but no recognized revenue','one payment; no received/revenue date',async()=>{
    const item=await fixture();const r=await order({...item,price:500000},{user:admin,extra:{addressId:null,payment_status:'Đã thanh toán',status:'Đã xác nhận',total:500000}});assert.equal(r.status,200,JSON.stringify(r));
    const state=(await rows(`SELECT PaymentConfirmedAt,RevenueEligibleDate FROM Orders WHERE OrderID=${r.data.orderId}`))[0];assert.ok(state.PaymentConfirmedAt);assert.equal(state.RevenueEligibleDate,null);
    const tx=await rows(`SELECT Amount FROM PaymentTransactions WHERE OrderID=${r.data.orderId} AND Status=N'SUCCESS'`);assert.equal(tx.length,1);assert.equal(tx[0].Amount,500000);return {state,tx};
  });
  await check('B12','Generic order status cannot bypass return approval and refund','409, no refund',async()=>{
    const item=await fixture();const r=await order({...item,price:500000},{user:admin,extra:{addressId:null,payment_status:'Đã thanh toán',status:'Đã nhận hàng',total:500000}});assert.equal(r.status,200,JSON.stringify(r));
    const attempt=await api(`/orders/${r.data.orderId}/status`,{method:'PUT',user:admin,body:{status:'Đã hoàn tất trả hàng'}});assert.equal(attempt.status,409,JSON.stringify(attempt));return attempt;
  });
  await pool.close();const output=path.resolve(__dirname,'../../docs/audit',process.env.AUDIT_REPORT||'boundary-results.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({time:new Date().toISOString(),port:process.env.AUDIT_PORT||5100,results},null,2));console.log(JSON.stringify({passed:results.filter(x=>x.result==='PASS').length,failed:results.filter(x=>x.result==='FAIL').length}));if(results.some(x=>x.result==='FAIL'))process.exitCode=1;
}
main().catch(async e=>{console.error(e);await pool?.close();process.exitCode=1;});
