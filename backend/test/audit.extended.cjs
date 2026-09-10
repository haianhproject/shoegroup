const assert = require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const sql=require('mssql');
const {connection,api,users,admin}=require('./helpers/audit-db.cjs');
const {fixture,order,status,stockOf,coupon,rows,check,results,setPool}=require('./audit.integration.cjs');
let pool;
async function delivered(item,extra={}) {
  const created=await order(item,{extra});assert.equal(created.status,200,JSON.stringify(created));const id=created.data.orderId;
  for(const s of ['Đã xác nhận','Đang vận chuyển','Đã giao hàng thành công']) {const r=await status(id,s,admin);assert.equal(r.status,200,JSON.stringify(r));}
  const received=await api(`/orders/${id}/receive`,{method:'PUT'});assert.equal(received.status,200,JSON.stringify(received));
  const details=await rows(`SELECT OrderDetailID,Quantity FROM OrderDetails WHERE OrderID=${id}`);
  return {id,details,total:created.data.totalAmount,shipping:created.data.shippingFee};
}
async function requestReturn(o,quantity=1,extra={},user=users[0]) {
  return api('/returns',{method:'POST',user,body:{order_id:o.id,return_type:'CUSTOMER',reason:'Audit defective shoe',items:[{order_detail_id:o.details[0].OrderDetailID,quantity,...extra}]}});
}
async function advance(rid,conditions) {
  for(const s of ['Đã tiếp nhận','Đang kiểm tra','Chấp nhận hoàn tiền']) {
    const r=await api(`/returns/${rid}/status`,{method:'PUT',user:admin,body:{status:s,...(s==='Chấp nhận hoàn tiền'&&conditions?{conditions}:{})}});assert.equal(r.status,200,JSON.stringify(r));
  }
}
const finalize=rid=>api(`/returns/${rid}/status`,{method:'PUT',user:admin,body:{status:'Đã hoàn tiền'}});
async function main(){
  pool=await connection().connect();setPool(pool);assert.match((await rows('SELECT DB_NAME() AS db'))[0].db,/^ShoegroupAudit_/);
  await check('R01','Full coupon refund uses paid goods value','450000 refund, no shipping',async()=>{
    const item=await fixture();const code=await coupon(100);const o=await delivered(item,{couponCode:code});const r=await requestReturn(o);assert.equal(r.status,201,JSON.stringify(r));assert.equal(r.data.RefundAmount,450000);return r;
  });
  await check('R02','Discounted partial return missing allocation','409 BUSINESS RULE REQUIRED',async()=>{
    const item=await fixture();const code=await coupon(100);const o=await delivered({...item,quantity:2},{couponCode:code});const r=await requestReturn(o,1);assert.equal(r.status,409,JSON.stringify(r));assert.match(r.data.message,/BUSINESS RULE REQUIRED/);return r;
  });
  await check('R03','Partial quantity return then second return','paid order stays received; 2 separate wallet credits within paid amount',async()=>{
    const item=await fixture();const o=await delivered({...item,quantity:3});const first=await requestReturn(o,1);assert.equal(first.status,201,JSON.stringify(first));
    await advance(first.data.ReturnID);assert.equal((await finalize(first.data.ReturnID)).status,200);
    const mid=(await rows(`SELECT Status,PaymentStatus FROM Orders WHERE OrderID=${o.id}`))[0];assert.equal(mid.Status,'Đã nhận hàng');assert.equal(mid.PaymentStatus,'Đã thanh toán');
    const second=await requestReturn(o,2);assert.equal(second.status,201,JSON.stringify(second));await advance(second.data.ReturnID);assert.equal((await finalize(second.data.ReturnID)).status,200);
    const credits=await rows(`SELECT SUM(Amount) AS amount,COUNT(*) AS count FROM ShoeGroupWalletTransactions WHERE ReturnID IN (${first.data.ReturnID},${second.data.ReturnID})`);
    assert.equal(credits[0].amount,1500000);assert.equal(credits[0].count,2);return {mid,credits};
  });
  await check('R04','Customer marks damaged/unknown return as unopened','no sellable restock without admin inspection',async()=>{
    const item=await fixture();const o=await delivered(item);const r=await requestReturn(o,1,{condition:'UNOPENED'});assert.equal(r.status,201,JSON.stringify(r));await advance(r.data.ReturnID);const done=await finalize(r.data.ReturnID);assert.equal(done.status,200,JSON.stringify(done));assert.equal(await stockOf(item),9);return done;
  });
  await check('R05','Inspected saleable return and duplicate concurrent finalization','restore once, credit once, immutable refund',async()=>{
    const item=await fixture();const o=await delivered({...item,quantity:3});const r=await requestReturn(o);assert.equal(r.status,201,JSON.stringify(r));
    await advance(r.data.ReturnID,[{order_detail_id:o.details[0].OrderDetailID,condition:'SALEABLE'}]);const done=await Promise.all([finalize(r.data.ReturnID),finalize(r.data.ReturnID)]);
    assert.ok(done.every(x=>x.status===200),JSON.stringify(done));assert.equal(await stockOf(item),8);
    const credits=await rows(`SELECT COUNT(*) AS n,SUM(Amount) AS amount FROM ShoeGroupWalletTransactions WHERE ReturnID=${r.data.ReturnID}`);assert.deepEqual(credits[0],{n:1,amount:500000});
    await api(`/returns/${r.data.ReturnID}/status`,{method:'PUT',user:admin,body:{status:'Đã hoàn tiền',refund_amount:1}});
    assert.equal((await rows(`SELECT RefundAmount FROM Returns WHERE ReturnID=${r.data.ReturnID}`))[0].RefundAmount,500000);return done;
  });
  await check('R06','Wallet credit failure rolls back refund/order/inventory','500; no wallet credit; request stays approved; stock stays deducted',async()=>{
    const item=await fixture();const o=await delivered(item);const r=await requestReturn(o);assert.equal(r.status,201,JSON.stringify(r));await advance(r.data.ReturnID,[{order_detail_id:o.details[0].OrderDetailID,condition:'SALEABLE'}]);
    await pool.request().batch(`CREATE OR ALTER TRIGGER dbo.AuditFailWallet ON dbo.ShoeGroupWalletTransactions AFTER INSERT AS BEGIN THROW 51000,'Audit injected wallet failure',1; END`);
    let failed;try{failed=await finalize(r.data.ReturnID);}finally{await pool.request().query('DROP TRIGGER dbo.AuditFailWallet');}
    assert.equal(failed.status,500,JSON.stringify(failed));assert.equal(await stockOf(item),9);
    const state=await rows(`SELECT Status,RefundedAt,RestockedAt FROM Returns WHERE ReturnID=${r.data.ReturnID}`);assert.equal(state[0].Status,'Chấp nhận hoàn tiền');assert.equal(state[0].RefundedAt,null);assert.equal(state[0].RestockedAt,null);
    assert.equal((await rows(`SELECT COUNT(*) AS n FROM ShoeGroupWalletTransactions WHERE ReturnID=${r.data.ReturnID}`))[0].n,0);return state;
  });
  await check('R07','Return more than purchased and wrong owner','409/403, no return created',async()=>{const item=await fixture();const o=await delivered(item);const a=await requestReturn(o,2);const b=await requestReturn(o,1,{},users[1]);assert.equal(a.status,409);assert.equal(b.status,403);return[a,b];});
  await check('R08','Return outside existing 14-day window','409',async()=>{const item=await fixture();const o=await delivered(item);await pool.request().query(`UPDATE Orders SET DeliveredDate=DATEADD(day,-15,GETDATE()),ReceivedConfirmedDate=DATEADD(day,-15,GETDATE()) WHERE OrderID=${o.id}`);const r=await requestReturn(o);assert.equal(r.status,409);return r;});
  await check('R09','Failed COD delivery warehouse/reship repeated','no payment collected; restore/deduct exactly once',async()=>{
    const item=await fixture();const r=await order(item);const id=r.data.orderId;await status(id,'Đã xác nhận',admin);await status(id,'Đang vận chuyển',admin);
    const a=await status(id,'Về kho',admin);const b=await status(id,'Về kho',admin);assert.equal(a.status,200);assert.equal(b.status,200);assert.equal(await stockOf(item),10);
    assert.equal((await rows(`SELECT PaymentStatus FROM Orders WHERE OrderID=${id}`))[0].PaymentStatus,'Chưa thanh toán');const c=await status(id,'Đang vận chuyển',admin);assert.equal(c.status,200);assert.equal(await stockOf(item),9);return [a,b,c];
  });
  await check('R10','Recognized revenue ignores stale flags and subtracts partial refunds','dashboard/chart equal SQL expected, no pending/cancelled money',async()=>{
    const item=await fixture();const pending=await order(item);const o=await delivered({...item,quantity:2});await pool.request().query(`UPDATE Orders SET IsCountedAsRevenue=1 WHERE OrderID IN (${pending.data.orderId},${o.id})`);
    const r=await requestReturn(o,1);await advance(r.data.ReturnID);await finalize(r.data.ReturnID);
    const expected=(await rows(`SELECT ISNULL(SUM(CASE WHEN o.TotalAmount>ISNULL(r.amount,0) THEN o.TotalAmount-ISNULL(r.amount,0) ELSE 0 END),0) AS revenue
      FROM Orders o OUTER APPLY(SELECT SUM(RefundAmount) AS amount FROM Returns WHERE OrderID=o.OrderID AND RefundedAt IS NOT NULL)r
      WHERE o.IsCountedAsRevenue=1 AND o.Status=N'Đã nhận hàng' AND o.PaymentStatus=N'Đã thanh toán'`))[0].revenue;
    const summary=await api('/v2/dashboard/summary',{user:admin});assert.equal(summary.status,200);assert.equal(summary.data.recognizedRevenue,expected,JSON.stringify(summary));return {expected,actual:summary.data};
  });
  await check('R11','Failed product image insert rolls back whole product','500 and no partially created product',async()=>{
    const name=`Atomic-${Date.now()}`;await pool.request().batch(`CREATE OR ALTER TRIGGER dbo.AuditFailImages ON dbo.ProductImages AFTER INSERT AS BEGIN THROW 51000,'Audit injected image failure',1; END`);
    let r;try{r=await api('/products',{method:'POST',user:admin,body:{name,price:500000,active:true,variants:[{size:'M',color:'Black',stock:10,sku:name}],colors:[{name:'Black',image:'https://example.test/image.png'}]}});}finally{await pool.request().query('DROP TRIGGER dbo.AuditFailImages');}
    assert.equal(r.status,500,JSON.stringify(r));const count=(await pool.request().input('name',sql.NVarChar,name).query('SELECT COUNT(*) AS n FROM Products WHERE ProductName=@name')).recordset[0].n;assert.equal(count,0);return r;
  });
  await check('R12','Disabled account cannot reuse existing JWT','401 after disable',async()=>{
    const user=users[11];await pool.request().query(`UPDATE Users SET IsActive=0 WHERE UserID=${user.id}`);let r;try{r=await api('/wallet',{user});}finally{await pool.request().query(`UPDATE Users SET IsActive=1 WHERE UserID=${user.id}`);}assert.equal(r.status,401,JSON.stringify(r));return r;
  });
  await check('R13','Legacy SQL negative purchase quantity','rejected; stock unchanged',async()=>{
    const item=await fixture();const r=await pool.request().input('vid',sql.Int,item.productVariantId).query(`DECLARE @ok bit; EXEC dbo.sp_ProcessOrderAtomic @UserID=2,@ProductVariantID=@vid,@Quantity=-1,@UnitPrice=1,@ShippingAddress=N'Audit',@CustomerName=N'Audit',@CustomerPhone='0900000001',@PaymentMethod=N'COD',@IsOrderSuccess=@ok OUTPUT; SELECT @ok AS ok;`);
    assert.equal(r.recordset[0].ok,false);assert.equal(await stockOf(item),10);return r.recordset;
  });
  await check('R14','Direct SQL quantity and payment transaction uniqueness constraints','invalid quantity and repeated provider reference rejected',async()=>{
    const item=await fixture();const r=await order(item);const id=r.data.orderId;let qty=false,unique=false;
    const tx=new sql.Transaction(pool);await tx.begin();try{await new sql.Request(tx).query(`UPDATE OrderDetails SET Quantity=0 WHERE OrderID=${id}`);}catch{qty=true;}finally{try{await tx.rollback();}catch{}}
    const ref=`AUDIT-${Date.now()}`;await pool.request().input('ref',sql.VarChar,ref).query(`INSERT PaymentTransactions(OrderID,Provider,ProviderTxnRef,Amount,Status) VALUES(${id},N'AUDIT',@ref,1,N'PENDING')`);
    try{await pool.request().input('ref',sql.VarChar,ref).query(`INSERT PaymentTransactions(OrderID,Provider,ProviderTxnRef,Amount,Status) VALUES(${id},N'AUDIT',@ref,1,N'PENDING')`);}catch{unique=true;}
    assert.equal(qty,true);assert.equal(unique,true);return {qty,unique};
  });
  await pool.close();const output=path.resolve(__dirname,'../../docs/audit',process.env.AUDIT_REPORT||'extended-results.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({time:new Date().toISOString(),port:process.env.AUDIT_PORT||5100,results},null,2));
  console.log(JSON.stringify({passed:results.filter(x=>x.result==='PASS').length,failed:results.filter(x=>x.result==='FAIL').length}));if(results.some(x=>x.result==='FAIL'))process.exitCode=1;
}
main().catch(async e=>{console.error(e);await pool?.close();process.exitCode=1;});
