// Kiểm thử hậu mãi và chatbot trên SQL + Spring riêng, không chạm dữ liệu cửa hàng.
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const net=require('node:net');const {spawn}=require('node:child_process');const {randomUUID}=require('node:crypto');
process.env.AUDIT_DB_NAME=`ShoegroupAudit_AfterSales_${Date.now()}`;process.env.AUDIT_PORT='5197';process.env.JWT_SECRET='after-sales-isolated-integration-secret-20261127';
const {setup,connection,api,admin,users,DATABASE,runBatches}=require('../legacy-express/test/helpers/audit-db.cjs');
const {migrate}=require('./catalog-migration.cjs');const config=require('../legacy-express/src/security/env');
const root=path.resolve(__dirname,'../..');let pool,server,log='',checks=0,sequence=0;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const request=(url,method='GET',body,user=admin,headers={})=>api(url,{method,body,user,headers});
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r));return r.data;};
const rows=async sql=>(await pool.request().query(sql)).recordset;
const detail=id=>request(`/orders/${id}/after-sales`,'GET',undefined,users[0]).then(ok);
const state=id=>rows(`SELECT * FROM Orders WHERE OrderID=${Number(id)}`).then(r=>r[0]);
const inventory=id=>rows(`SELECT StockQuantity stock,DamagedQuantity damaged,Version version FROM ProductVariants WHERE ProductVariantID=${Number(id)}`).then(r=>r[0]);
const change=(id,status)=>request(`/orders/${id}/status`,'PUT',{status,reason:'Kiểm thử giao hàng và hậu mãi'}).then(ok);
async function check(name,fn){await fn();console.log(`PASS ${++checks}: ${name}`);}
let sizes,color,category,brand;
async function fixture({quantity=3,coupon=false,bank=false,delivered=true,two=false}={}){
  const serial=++sequence,name=`AfterSales Audit ${Date.now()} ${serial}`;
  const created=ok(await request('/products','POST',{name,category_id:category.id,brand_id:brand.id,active:true,
    colors:[{id:color.id,name:color.name,image:'https://example.test/audit-shoe.jpg'}],
    variants:[{color_id:color.id,size_id:sizes[0].id,price:300000,stock:10,sku:`AFTER-${Date.now()}-${serial}-40`},...(two?[{color_id:color.id,size_id:sizes[1].id,price:400000,stock:8,sku:`AFTER-${Date.now()}-${serial}-41`}]:[])]}));
  const product=ok(await request('/products')).find(p=>p.id===created.ProductID);
  const variants=product.variants;
  const createdOrder=ok(await request('/orders','POST',{addressId:users[0].addressId,paymentMethod:bank?'BANK':'COD',...(coupon?{couponCode:'AUDIT-MULTI'}:{}),items:variants.map(v=>({product_id:product.id,product_variant_id:v.id,quantity}))},users[0]));
  const id=createdOrder.orderId;
  if(bank)ok(await request(`/orders/${id}/payment`,'PUT',{payment_status:'Đã thanh toán'},users[0]));
  if(delivered){await change(id,'Đã xác nhận');await change(id,'Đang vận chuyển');await change(id,'Đã giao hàng thành công');}
  return {id,name,product:product.id,variants,lines:(await detail(id)).items,order:await state(id)};
}
const ask=(f,quantities,extra={})=>({request_key:randomUUID(),reason:'Không vừa kích cỡ, đề nghị cửa hàng kiểm tra nhận lại.',items:f.lines.map((line,index)=>({order_detail_id:line.order_detail_id,quantity:quantities[index]||0})).filter(i=>i.quantity>0),...extra});
async function createReturn(f,quantities,extra={}){return ok(await request(`/orders/${f.id}/returns`,'POST',ask(f,quantities,extra),users[0])).id;}
const approve=id=>request(`/returns/${id}/review`,'POST',{decision:'APPROVE',note:'Đồng ý nhận hàng để kiểm tra.'}).then(ok);
async function receipt(f,id,good,damaged,extra={}){const r=(await detail(f.id)).returns.find(r=>r.id===id);return request(`/returns/${id}/receive`,'POST',{items:r.items.map((i,index)=>({return_item_id:i.id,good_quantity:good[index]||0,damaged_quantity:damaged[index]||0})),note:'Đã nhận kiện thực tế và kiểm tra từng sản phẩm.',confirm_received:true,...extra});}
const confirm=(f,tx,reference,extra={})=>request(`/orders/${f.id}/refunds/${tx}/confirm`,'POST',{reference,note:'Đã đối chiếu chứng từ hoàn tiền thực tế.',confirm_paid:true,...extra});
async function main(){
  await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(5197,'127.0.0.1',()=>s.close(resolve));});
  await setup();pool=await connection().connect();
  for(const n of ['20260923_variant_discount_order_tracking.sql','20260923_variant_discount_scope.sql','20261004_pos_cart_stock.sql','20261004_revenue_history.sql','20261001_remove_unused_schema.sql'])await runBatches(pool,fs.readFileSync(path.join(root,'database/migrations',n),'utf8'));
  await pool.request().query("UPDATE ProductVariants SET Size=CASE Size WHEN N'M' THEN N'40' WHEN N'L' THEN N'41' WHEN N'S' THEN N'39' ELSE Size END");await migrate(pool);
  const location=config.db.options.instanceName?`${config.db.server};instanceName=${config.db.options.instanceName}`:`${config.db.server}:${config.db.port||1433}`;
  const url=`jdbc:sqlserver://${location};databaseName=${DATABASE};encrypt=${config.db.options.encrypt};trustServerCertificate=${config.db.options.trustServerCertificate}`;
  server=spawn(path.join(process.env.JAVA_HOME||'C:/Program Files/Java/jdk-21','bin/java.exe'),['-jar',path.join(root,'backend/target/shoegroup-api-2.0.0.jar')],{windowsHide:true,cwd:root,env:{...process.env,SPRING_DB_URL:url,DB_NAME:DATABASE,SPRING_PORT:'5197',DB_USER:config.db.user,DB_PASS:config.db.password,JWT_SECRET:process.env.JWT_SECRET,SHOEGROUP_JOBS_ENABLED:'false',RATE_LIMIT_MAX_API:'10000',EMAIL_USER:'',EMAIL_PASS:''},stdio:['ignore','pipe','pipe']});
  server.stdout.on('data',d=>log=(log+d).slice(-18000));server.stderr.on('data',d=>log=(log+d).slice(-18000));
  let ready=false;for(let i=0;i<180;i++){if(server.exitCode!==null)throw Error(log);try{if((await request('/health')).status===200){ready=true;break;}}catch{}await pause(250);}if(!ready)throw Error(log);
  sizes=ok(await request('/sizes')).filter(s=>s.active&&s.standard==='EU'&&['40','41'].includes(s.name)).sort((a,b)=>a.name.localeCompare(b.name));
  color=ok(await request('/colors')).find(c=>c.active);category=ok(await request('/categories')).find(c=>c.active);brand=ok(await request('/brands')).find(c=>c.active);
  await check('schema migration is replayable and all extended report routes remain valid',async()=>{
    await runBatches(pool,fs.readFileSync(path.join(root,'database/migrations/20261127_after_sales.sql'),'utf8'));
    for(const route of ['/orders','/returns','/inventory/damaged','/v2/dashboard/summary','/chart-data','/revenue-by-product'])ok(await request(route));
    const catalog=ok(await request('/products'));const variant=catalog.find(p=>p.id===1).variants.find(v=>v.id===1);
    assert.equal(variant.size,'40');assert.equal(variant.standard,'EU');assert.equal(variant.color,'Black');assert.equal(variant.hex,'#000000');
  });
  const f=await fixture({coupon:true});let returnId,tx;
  await check('only the owner can see or request returns; customer cannot review or receive',async()=>{
    ok(await request(`/orders/${f.id}/after-sales`,'GET',undefined,users[1]),403);
    ok(await request(`/orders/${f.id}/returns`,'POST',ask(f,[1]),users[1]),403);
    ok(await request('/returns','GET',undefined,users[0]),403);ok(await request('/inventory/damaged','GET',undefined,users[0]),403);
  });
  await check('pending orders cannot be returned and invalid return quantities leave no requests',async()=>{
    const pending=await fixture({delivered:false});ok(await request(`/orders/${pending.id}/returns`,'POST',ask(pending,[1]),users[0]),409);
    for(const q of [0,-1,1.5,4]){const body=ask(f,[1]);body.items[0].quantity=q;assert.ok([400,409].includes((await request(`/orders/${f.id}/returns`,'POST',body,users[0])).status));}
    const duplicate=ask(f,[1]);duplicate.items.push({...duplicate.items[0]});ok(await request(`/orders/${f.id}/returns`,'POST',duplicate,users[0]),400);
    ok(await request(`/orders/${f.id}/returns`,'POST',ask(f,[1],{request_key:'bad-key'}),users[0]),400);
    const foreign=ask(f,[1]);foreign.items[0].order_detail_id=pending.lines[0].order_detail_id;ok(await request(`/orders/${f.id}/returns`,'POST',foreign,users[0]),409);
    assert.equal((await detail(f.id)).returns.length,0);
  });
  await check('request replay is idempotent, changed payload conflicts, and stock is untouched',async()=>{
    const body=ask(f,[2],{refund_amount:999999999});returnId=ok(await request(`/orders/${f.id}/returns`,'POST',body,users[0])).id;
    assert.equal(ok(await request(`/orders/${f.id}/returns`,'POST',body,users[0])).unchanged,true);
    ok(await request(`/orders/${f.id}/returns`,'POST',{...body,reason:'Nội dung khác với yêu cầu cũ'},users[0]),409);
    ok(await request(`/orders/${f.id}/returns`,'POST',ask(f,[1]),users[0]),409);
    assert.equal((await detail(f.id)).returns.length,1);assert.equal((await inventory(f.variants[0].id)).stock,7);
  });
  await check('receipt requires approval, explicit inspection and correct counts',async()=>{
    ok(await receipt(f,returnId,[2],[0]),409);
    ok(await request(`/returns/${returnId}/review`,'POST',{decision:'APPROVE'},users[0]),403);
    await approve(returnId);ok(await receipt(f,returnId,[2],[0],{confirm_received:false}),400);
    ok(await receipt(f,returnId,[3],[0]),409);ok(await receipt(f,returnId,[0],[0]),400);
    assert.equal((await inventory(f.variants[0].id)).stock,7);assert.equal((await state(f.id)).ReturnAdjustmentAmount,0);
  });
  await check('partial inspection separates good and damaged stock and allocates the original discount',async()=>{
    const accepted=ok(await receipt(f,returnId,[1],[1]));tx=accepted.refund_transaction_id;
    assert.equal(accepted.refund_amount,540000);assert.deepEqual(await inventory(f.variants[0].id),{stock:8,damaged:1,version:2});
    assert.equal((await state(f.id)).ReturnAdjustmentAmount,540000);
    const d=await detail(f.id);assert.equal(d.returns[0].status,'REFUND_PENDING');assert.equal(d.can_request,false);assert.equal(d.items[0].remaining_quantity,1);
    const orders=ok(await request('/orders'));const row=orders.find(o=>o.id===f.id);assert.equal(row.active_return_count,1);assert.equal(row.pending_refund_amount,540000);assert.equal(row.return_adjustment_amount,540000);
    const products=ok(await request('/revenue-by-product'));assert.equal(products.find(p=>p.id===f.product).sold,1);
  });
  await check('duplicate receiving never adds stock or refunds twice',async()=>{
    const before=await inventory(f.variants[0].id);assert.equal(ok(await receipt(f,returnId,[1],[1])).unchanged,true);assert.deepEqual(await inventory(f.variants[0].id),before);
    assert.equal((await rows(`SELECT COUNT(*) n FROM PaymentTransactions WHERE OrderID=${f.id} AND Provider='AFTERSALES_REFUND'`))[0].n,1);
  });
  await check('refund requires an actual-payment acknowledgement, authority and auditable proof',async()=>{
    ok(await confirm(f,tx,'BANK-ONE',{confirm_paid:false}),400);ok(await confirm(f,tx,'x'),400);
    ok(await request(`/orders/${f.id}/refunds/${tx}/confirm`,'POST',{reference:'BANK-ONE',note:'Đã hoàn tiền thật',confirm_paid:true},users[0]),403);
    ok(await confirm(f,tx,'BANK-ONE'));assert.equal(ok(await confirm(f,tx,'BANK-ONE')).unchanged,true);ok(await confirm(f,tx,'DIFFERENT-REFERENCE'),409);
    assert.equal((await detail(f.id)).returns[0].status,'COMPLETED');assert.equal((await detail(f.id)).can_request,true);
  });
  await check('the final partial return preserves rounding, refunds shipping only once and zeroes net revenue',async()=>{
    const id=await createReturn(f,[1]);await approve(id);const r=ok(await receipt(f,id,[0],[1],{refund_shipping:true}));
    assert.equal(r.refund_amount,270000+Number(f.order.ShippingFee));assert.equal((await state(f.id)).ReturnAdjustmentAmount,f.order.TotalAmount);
    ok(await confirm(f,r.refund_transaction_id,'BANK-FINAL'));assert.equal((await state(f.id)).PaymentStatus,'Hoàn tiền');
    assert.equal((await detail(f.id)).items[0].remaining_quantity,0);assert.equal((await detail(f.id)).can_request,false);
    ok(await request(`/orders/${f.id}/returns`,'POST',ask(f,[1]),users[0]),409);
    assert.equal((await inventory(f.variants[0].id)).stock,8);assert.equal((await inventory(f.variants[0].id)).damaged,2);
  });
  await check('repair and write-off change only their intended stock buckets and preserve replay safety',async()=>{
    const variant=f.variants[0].id;const body={request_key:randomUUID(),action:'REPAIR',quantity:1,note:'Đã sửa và kiểm tra đạt để bán lại.',confirm_checked:true};
    ok(await request(`/inventory/damaged/${variant}/resolve`,'POST',{...body,quantity:3}),409);
    ok(await request(`/inventory/damaged/${variant}/resolve`,'POST',body));const before=await inventory(variant);assert.equal(before.stock,9);assert.equal(before.damaged,1);
    assert.equal(ok(await request(`/inventory/damaged/${variant}/resolve`,'POST',body)).unchanged,true);assert.deepEqual(await inventory(variant),before);
    ok(await request(`/inventory/damaged/${variant}/resolve`,'POST',{...body,quantity:2}),409);
    ok(await request(`/inventory/damaged/${variant}/resolve`,'POST',{...body,request_key:randomUUID(),action:'WRITE_OFF',note:'Hỏng không sửa được, đã phê duyệt ghi giảm.'}));
    assert.equal((await inventory(variant)).stock,9);assert.equal((await inventory(variant)).damaged,0);
    const damaged=ok(await request('/inventory/damaged'));assert.ok(damaged.history.some(i=>i.kind==='DAMAGE_WRITEOFF'));assert.equal(damaged.items.some(i=>i.id===variant),false);
  });
  await check('two concurrent requests serialize into exactly one open case',async()=>{
    const order=await fixture();const result=await Promise.all([ask(order,[1]),ask(order,[2])].map(body=>request(`/orders/${order.id}/returns`,'POST',body,users[0])));
    assert.deepEqual(result.map(r=>r.status).sort(),[200,409]);assert.equal((await detail(order.id)).returns.length,1);
  });
  await check('a duplicate refund reference cannot be applied to a different payout',async()=>{
    const order=await fixture();const id=await createReturn(order,[1]);await approve(id);const r=ok(await receipt(order,id,[1],[0]));
    ok(await confirm(order,r.refund_transaction_id,'BANK-ONE'),409);assert.equal((await detail(order.id)).returns[0].status,'REFUND_PENDING');
  });
  await check('a bad second receipt line rolls back the first stock movement and adjustment',async()=>{
    const order=await fixture({two:true});const id=await createReturn(order,[1,1]);await approve(id);
    const before=await Promise.all(order.variants.map(v=>inventory(v.id)));ok(await receipt(order,id,[1,2],[0,0]),409);
    assert.deepEqual(await Promise.all(order.variants.map(v=>inventory(v.id))),before);assert.equal((await state(order.id)).ReturnAdjustmentAmount,0);
    assert.equal((await detail(order.id)).returns[0].status,'APPROVED');
  });
  await check('rejection records the reason without inventory or money effects',async()=>{
    const order=await fixture();const id=await createReturn(order,[1]);ok(await request(`/returns/${id}/review`,'POST',{decision:'REJECT',note:''}),400);
    ok(await request(`/returns/${id}/review`,'POST',{decision:'REJECT',note:'Khách chọn nhầm đơn, đã liên hệ xác minh.'}));
    assert.equal((await detail(order.id)).can_request,true);assert.equal((await inventory(order.variants[0].id)).stock,7);assert.equal((await state(order.id)).ReturnAdjustmentAmount,0);
  });
  const warehouse=async(bank=false)=>{const order=await fixture({bank,delivered:false});await change(order.id,'Đã xác nhận');await change(order.id,'Đang vận chuyển');await change(order.id,'Về kho');return order;};
  const warehouseBody=(order,good=2,bad=1)=>({confirm_received:true,reason:'Khách từ chối nhận, kiện đã về và được kiểm nhận.',items:order.lines.map(i=>({order_detail_id:i.order_detail_id,good_quantity:good,damaged_quantity:bad}))});
  await check('refused COD stays reserved until inspection and closes with good-only restock',async()=>{
    const order=await warehouse();assert.equal((await inventory(order.variants[0].id)).stock,7);
    ok(await request(`/orders/${order.id}/warehouse-return`,'POST',{...warehouseBody(order),confirm_received:false}),400);
    ok(await request(`/orders/${order.id}/warehouse-return`,'POST',warehouseBody(order,1,1)),409);
    ok(await request(`/orders/${order.id}/warehouse-return`,'POST',warehouseBody(order)));const before=await inventory(order.variants[0].id);
    assert.equal(before.stock,9);assert.equal(before.damaged,1);assert.equal((await state(order.id)).Status,'Đã hủy');assert.equal((await state(order.id)).IsCountedAsRevenue,false);
    assert.equal(ok(await request(`/orders/${order.id}/warehouse-return`,'POST',warehouseBody(order))).unchanged,true);assert.deepEqual(await inventory(order.variants[0].id),before);assert.equal((await detail(order.id)).refunds.length,0);
  });
  await check('warehouse reship keeps the existing reservation and never deducts a second time',async()=>{
    const order=await warehouse();await change(order.id,'Đang vận chuyển');assert.equal((await inventory(order.variants[0].id)).stock,7);
    await change(order.id,'Về kho');ok(await request(`/orders/${order.id}/warehouse-return`,'POST',warehouseBody(order,3,0)));assert.equal((await inventory(order.variants[0].id)).stock,10);
    ok(await request(`/orders/${order.id}/status`,'PUT',{status:'Đang vận chuyển'}),409);
  });
  await check('prepaid refused delivery opens a refund obligation and can be settled once',async()=>{
    const order=await warehouse(true);ok(await request(`/orders/${order.id}/warehouse-return`,'POST',warehouseBody(order,3,0)));
    const d=await detail(order.id);assert.equal(d.refunds[0].amount,order.order.TotalAmount);assert.equal((await state(order.id)).PaymentStatus,'Chờ hoàn tiền');
    ok(await confirm(order,d.refunds[0].id,'BANK-WAREHOUSE'));assert.equal((await state(order.id)).PaymentStatus,'Hoàn tiền');
  });
  await check('historical warehouse orders already restocked are not restocked again',async()=>{
    const order=await warehouse();await rows(`UPDATE ProductVariants SET StockQuantity=StockQuantity+3 WHERE ProductVariantID=${order.variants[0].id};UPDATE Orders SET StockRestoredAt=GETDATE() WHERE OrderID=${order.id}`);
    ok(await request(`/orders/${order.id}/warehouse-return`,'POST',warehouseBody(order)));assert.equal((await inventory(order.variants[0].id)).stock,9);assert.equal((await inventory(order.variants[0].id)).damaged,1);
  });
  await check('delivered and lost orders cannot be restocked through failed-delivery flow',async()=>{
    ok(await request(`/orders/${f.id}/warehouse-return`,'POST',warehouseBody(f)),409);
    const order=await fixture({delivered:false});await change(order.id,'Đã xác nhận');await change(order.id,'Đang vận chuyển');
    ok(await request(`/orders/${order.id}/status`,'PUT',{status:'Đã hủy',reason:'Thất lạc hàng trong quá trình vận chuyển'}));
    ok(await request(`/orders/${order.id}/warehouse-return`,'POST',warehouseBody(order)),409);
    assert.equal((await inventory(order.variants[0].id)).stock,7);
  });
  await check('guest chatbot guides login and product filters use real saleable inventory',async()=>{
    const login=ok(await request('/chat','POST',{message:'Tra đơn hàng'},null));assert.equal(login.intent,'LOGIN');assert.equal(login.orders.length,0);
    const found=ok(await request('/chat','POST',{message:`Tìm giày ${f.name} size 40 dưới 1 triệu`},null));assert.equal(found.intent,'PRODUCTS');assert.ok(found.products.length,JSON.stringify({found,product:ok(await request('/products')).find(p=>p.id===f.product)}));assert.equal(found.products[0].id,f.product);assert.equal(found.products[0].stock,9);
    const none=ok(await request('/chat','POST',{message:'dưới 200k',context:found.context},null));assert.equal(none.products.length,0);
  });
  await check('inspection can reject an approved case before taking stock or creating a refund',async()=>{
    const order=await fixture();const id=await createReturn(order,[1]);await approve(id);
    ok(await request(`/returns/${id}/review`,'POST',{decision:'REJECT',note:'Kiểm tra không đủ điều kiện, cửa hàng không nhận lại hàng.'}));
    ok(await receipt(order,id,[1],[0]),409);assert.equal((await inventory(order.variants[0].id)).stock,7);assert.equal((await detail(order.id)).refunds.length,0);assert.equal((await detail(order.id)).can_request,true);
  });
  await check('employees can read order after-sales but cannot approve warehouse or financial changes',async()=>{
    const staffId=(await rows("INSERT Users(RoleID,Email,PasswordHash,FullName,Phone,IsActive) OUTPUT INSERTED.UserID VALUES(3,'after-sales-staff@example.test','test-only',N'Audit employee','0907777777',1)"))[0].UserID;
    const staff={id:staffId,role:'Employee',email:'after-sales-staff@example.test'};
    ok(await request(`/orders/${f.id}/after-sales`,'GET',undefined,staff));ok(await request('/returns','GET',undefined,staff),403);
    ok(await request(`/returns/${returnId}/review`,'POST',{decision:'APPROVE'},staff),403);
    ok(await request(`/orders/${f.id}/warehouse-return`,'POST',warehouseBody(f),staff),403);
    ok(await request(`/orders/${f.id}/refunds/${tx}/confirm`,'POST',{reference:'STAFF-FORBIDDEN',note:'Không được ghi nhận',confirm_paid:true},staff),403);
  });
  await check('a walk-in POS purchase supports an admin-created partial return and cash refund record',async()=>{
    let cart=ok(await request('/pos/carts','POST'));const variant=f.variants[0];
    cart=ok(await request(`/pos/cart/items/${variant.id}`,'PUT',{cart_id:cart.cart_id,revision:cart.revision,quantity:1}));
    const sold=ok(await request('/orders','POST',{pos_cart_id:cart.cart_id,pos_cart_revision:cart.revision,customer_name:'Khách quầy kiểm thử',customer_phone:'0902223333',payment_method:'Tiền mặt',payment_status:'Đã thanh toán',status:'Đã nhận hàng',total:300000,cash_given:500000,products:[{product_id:f.product,product_variant_id:variant.id,quantity:1,price:300000}]},admin,{'Idempotency-Key':`after-pos-${randomUUID()}`}));
    const d=ok(await request(`/orders/${sold.orderId}/after-sales`));
    const id=ok(await request(`/orders/${sold.orderId}/returns`,'POST',{request_key:randomUUID(),reason:'Khách tại quầy muốn trả lại vì không vừa kích cỡ.',items:[{order_detail_id:d.items[0].order_detail_id,quantity:1}]})).id;
    await approve(id);const r=ok(await request(`/orders/${sold.orderId}/after-sales`)).returns[0];
    const accepted=ok(await request(`/returns/${id}/receive`,'POST',{confirm_received:true,note:'Đã nhận lại hàng tốt từ khách tại quầy.',items:[{return_item_id:r.items[0].id,good_quantity:1,damaged_quantity:0}]}));
    assert.equal(accepted.refund_amount,300000);ok(await confirm({id:sold.orderId},accepted.refund_transaction_id,'CASH-POS-RETURN'));
    assert.equal((await state(sold.orderId)).PaymentStatus,'Hoàn tiền');assert.equal((await inventory(variant.id)).stock,9);
  });
  await check('chatbot cannot leak another account order or private identity data',async()=>{
    const own=ok(await request('/chat','POST',{message:`Tra đơn ${f.id}`},users[0]));assert.equal(own.orders.length,1);
    const foreign=ok(await request('/chat','POST',{message:`Tra đơn ${f.id}`,userId:users[0].id},users[1]));assert.equal(foreign.orders.length,0);
    assert.doesNotMatch(JSON.stringify(own),/customer_phone|shipping_address|password|token|@example/);
    const coded=ok(await request('/chat','POST',{message:own.orders[0].code},users[0]));assert.equal(coded.orders[0].code,own.orders[0].code);
  });
  await check('chatbot explains returns and human handoff without executing a financial action',async()=>{
    assert.equal(ok(await request('/chat','POST',{message:'Sản phẩm có lỗi, tôi muốn trả hàng'},null)).intent,'RETURNS');
    const handoff=ok(await request('/chat','POST',{message:'Gặp nhân viên'},null));assert.equal(handoff.intent,'HANDOFF');assert.equal(handoff.links[0].href,'https://zalo.me/0375990871');
    ok(await request('/chat','POST',{message:'x'.repeat(501)},null),400);ok(await request('/chat','POST',{message:''},null),400);
  });
  await check('net dashboard revenue agrees with SQL after returns and pending payouts',async()=>{
    const expected=(await rows("SELECT ISNULL(SUM(CASE WHEN TotalAmount>HistoricalRefundAmount+ReturnAdjustmentAmount THEN TotalAmount-HistoricalRefundAmount-ReturnAdjustmentAmount ELSE 0 END),0) n FROM Orders WHERE IsCountedAsRevenue=1 AND Status IN(N'Đã giao hàng thành công',N'Đã nhận hàng') AND PaymentStatus=N'Đã thanh toán'"))[0].n;
    assert.equal(ok(await request('/v2/dashboard/summary')).recognizedRevenue,expected);
  });
  await check('chat has a separate rate cap while order reads stay available',async()=>{
    let limited=false;for(let i=0;i<31;i++){const r=await request('/chat','POST',{message:'Xin chào'},null);if(r.status===429){limited=true;break;}ok(r);}assert.equal(limited,true);ok(await request('/orders'));
  });
  console.log(`PASS: ${checks} after-sales/chat integration scenarios.`);
}
main().catch(e=>{console.error(e);console.error(log.slice(-10000));process.exitCode=1;}).finally(async()=>{
  if(server&&server.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done;}
  if(pool)await pool.close();
  if(!/^ShoegroupAudit_AfterSales_\d+$/.test(DATABASE))throw Error('Unsafe test database');
  const master=await connection('master').connect();try{await master.request().query(`IF DB_ID(N'${DATABASE}') IS NOT NULL BEGIN ALTER DATABASE [${DATABASE}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;DROP DATABASE [${DATABASE}];END`);}finally{await master.close();}
});
