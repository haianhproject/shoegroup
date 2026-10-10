// Muc dich: Kiem thu schema toi uu, gia bien the, khuyen mai, POS nhieu gio va chong trung don tren SQL rieng.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
process.env.AUDIT_DB_NAME=`ShoegroupAudit_Catalog_${Date.now()}`;
process.env.AUDIT_PORT='5194';
const {setup,connection,api,admin,users,DATABASE,runBatches}=require('../legacy-express/test/helpers/audit-db.cjs');
const {migrate}=require('./catalog-migration.cjs');
const config=require('../legacy-express/src/security/env');
const root=path.resolve(__dirname,'../..');
let pool,server,log='',checks=0;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function check(name,fn){await fn();console.log(`PASS ${++checks}: ${name}`);}
const request=(route,method='GET',body,user=admin)=>api(route,{method,body,user});
function ok(r,status=200){assert.equal(r.status,status,JSON.stringify(r));return r.data;}
async function main(){
  await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(5194,()=>s.close(resolve));});
  await setup(); pool=await connection().connect();
  for(const n of ['20260923_variant_discount_order_tracking.sql','20260923_variant_discount_scope.sql','20261004_pos_cart_stock.sql','20261004_revenue_history.sql','20261001_remove_unused_schema.sql']) await runBatches(pool,fs.readFileSync(path.join(root,'database/migrations',n),'utf8'));
  await pool.request().query("UPDATE ProductVariants SET Size=CASE Size WHEN N'M' THEN N'40' WHEN N'L' THEN N'41' WHEN N'S' THEN N'39' ELSE Size END");
  await migrate(pool); await migrate(pool);
  const location=config.db.options.instanceName?`${config.db.server};instanceName=${config.db.options.instanceName}`:`${config.db.server}:${config.db.port||1433}`;
  const url=`jdbc:sqlserver://${location};databaseName=${DATABASE};encrypt=${config.db.options.encrypt};trustServerCertificate=${config.db.options.trustServerCertificate}`;
  const java=path.join(process.env.JAVA_HOME||'C:/Program Files/Java/jdk-21','bin/java.exe');
  server=spawn(java,['-jar',path.join(root,'backend/target/shoegroup-api-2.0.0.jar')],{windowsHide:true,cwd:root,env:{...process.env,SPRING_DB_URL:url,DB_NAME:DATABASE,SPRING_PORT:'5194',DB_USER:config.db.user,DB_PASS:config.db.password,JWT_SECRET:config.jwt.secret,SHOEGROUP_JOBS_ENABLED:'false',EMAIL_USER:'',EMAIL_PASS:''},stdio:['ignore','pipe','pipe']});
  server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
  let ready=false;for(let i=0;i<180;i++){if(server.exitCode!==null)throw Error(log.slice(-5000));try{if((await request('/health')).status===200){ready=true;break;}}catch{}await pause(250);}
  if(!ready)throw Error(log.slice(-5000));
  await check('all affected read APIs work after removing duplicate columns',async()=>{for(const r of ['/products','/v2/products?page=1&limit=2','/v2/products?sort=price_asc','/v2/products/featured','/inventory','/inventory/alerts','/variantDiscounts','/orders','/revenue-by-product','/chart-data'])ok(await request(r));});
  await check('size systems and duplicates validated on the server',async()=>{
    ok(await request('/sizes','POST',{name:'40',standard:'EU',active:true}),409);
    ok(await request('/sizes','POST',{name:'7.5',standard:'US',active:true}));
    ok(await request('/sizes','POST',{name:'7.50',standard:'US',active:true}),409);
    ok(await request('/sizes','POST',{name:'7.5',standard:'UK',active:true}));
    ok(await request('/sizes','POST',{name:'40',standard:'abc',active:true}),400);
    ok(await request('/sizes','POST',{name:'',standard:'EU',active:true}),400);
  });
  const colors=ok(await request('/colors')),sizes=ok(await request('/sizes'));
  const cid=colors.find(c=>c.name==='Black').id,s40=sizes.find(s=>s.name==='40').id,s41=sizes.find(s=>s.name==='41').id;
  const productBody={name:'Catalog audit shoe',active:true,variants:[{color_id:cid,size_id:s40,color:'Black',size:'40',price:200000,stock:10,sku:'AUDIT-40'},{color_id:cid,size_id:s41,color:'Black',size:'41',price:350000,stock:10,sku:'AUDIT-41'}],colors:[{id:cid,name:'Black',image:'https://example.test/black.png'}]};
  const product=ok(await request('/products','POST',productBody)).ProductID;
  let variants=ok(await request('/products')).find(p=>p.id===product).variants;const v1=variants.find(v=>v.size==='40'),v2=variants.find(v=>v.size==='41');
  await check('individual prices and catalog references persisted',async()=>{assert.equal(v1.price,200000);assert.equal(v2.price,350000);assert.equal(v1.color_id,cid);assert.equal(v1.size_id,s40);});
  await check('automatic SKUs do not collide for products with the same name',async()=>{
    const b={name:'Same name shoe',active:true,variants:[{color_id:cid,size_id:s40,price:200000,stock:0}]};
    const one=ok(await request('/products','POST',b)).ProductID,two=ok(await request('/products','POST',b)).ProductID;
    const rows=ok(await request('/products'));
    assert.notEqual(rows.find(p=>p.id===one).variants[0].sku,rows.find(p=>p.id===two).variants[0].sku);
  });
  let discount;
  await check('color promotion covers all sizes and blocks overlaps',async()=>{
    discount=ok(await request('/variantDiscounts','POST',{ProductID:product,ColorID:cid,ApplyScope:'color',DiscountValue:10,IsActive:true}),201).id;
    ok(await request('/variantDiscounts','POST',{ProductID:product,ProductVariantID:v1.id,ApplyScope:'variant',DiscountValue:15,IsActive:true}),409);
    const rows=ok(await request('/products')).find(p=>p.id===product).variants;assert.equal(rows.find(v=>v.id===v1.id).sale_price,180000);assert.equal(rows.find(v=>v.id===v2.id).sale_price,315000);
    ok(await request('/variantDiscounts/'+discount,'PUT',{active:false}));ok(await request('/variantDiscounts/'+discount,'PUT',{active:true}));
  });
  await check('renaming catalog color preserves images and promotion matching',async()=>{
    ok(await request('/colors/'+cid,'PUT',{name:'Black renamed',hex:'#000000',active:true}));
    const p=ok(await request('/products')).find(p=>p.id===product);assert.equal(p.variants[0].color,'Black renamed');assert.equal(p.variants[0].sale_price,180000);assert.equal(p.colors[0].image,'https://example.test/black.png');
  });
  let c1=ok(await request('/pos/cart')),c2=ok(await request('/pos/carts','POST'));
  await check('each pending invoice holds its own items and revision',async()=>{
    c1=ok(await request('/pos/cart/items/'+v1.id,'PUT',{cart_id:c1.cart_id,revision:c1.revision,quantity:2}));
    c2=ok(await request('/pos/cart/items/'+v2.id,'PUT',{cart_id:c2.cart_id,revision:c2.revision,quantity:3}));
    assert.equal(c1.items[0].variant_id,v1.id);assert.equal(c2.items[0].variant_id,v2.id);
    ok(await request('/pos/cart/items/'+v1.id,'PUT',{cart_id:c1.cart_id,revision:0,quantity:4}),409);
    ok(await request('/pos/cart?cart_id='+c1.cart_id,'GET',undefined,users[0]),403);
  });
  const checkout={pos_cart_id:c1.cart_id,pos_cart_revision:c1.revision,customer_name:'Audit buyer',customer_phone:'0901234567',payment_method:'Tiền mặt',payment_status:'Đã thanh toán',status:'Đã nhận hàng',total:360000,products:[{product_id:product,product_variant_id:v1.id,quantity:2,price:1}]};
  let oid;
  await check('checkout uses server variant price and clears only selected invoice',async()=>{
    ok(await request('/orders','POST',{...checkout,total:2}),409);
    const first=ok(await api('/orders',{user:admin,method:'POST',body:checkout,headers:{'Idempotency-Key':'catalog-pos-audit'}}));
    const again=ok(await api('/orders',{user:admin,method:'POST',body:checkout,headers:{'Idempotency-Key':'catalog-pos-audit'}}));assert.equal(first.orderId,again.orderId);oid=first.orderId;
    const saved=(await pool.request().query(`SELECT UnitPrice FROM OrderDetails WHERE OrderID=${Number(oid)}`)).recordset;assert.equal(saved[0].UnitPrice,180000);
    const other=ok(await request('/pos/cart?cart_id='+c2.cart_id));assert.equal(other.items[0].quantity,3);
  });
  await check('expired pending invoice restores inventory once',async()=>{
    await pool.request().query(`UPDATE PosCarts SET ExpiresAt=DATEADD(day,-1,SYSDATETIME()) WHERE PosCartID=${Number(c2.cart_id)}`);
    ok(await request('/pos/cart'));ok(await request('/pos/cart'));
    assert.equal((await pool.request().query(`SELECT StockQuantity FROM ProductVariants WHERE ProductVariantID=${Number(v2.id)}`)).recordset[0].StockQuantity,10);
  });
  await check('parent inactive disables children, history price remains',async()=>{
    ok(await request('/products/'+product+'/status','PUT',{active:false}));
    assert.equal((await pool.request().query(`SELECT COUNT(*) AS n FROM ProductVariants WHERE ProductID=${Number(product)} AND IsActive=1`)).recordset[0].n,0);
    assert.equal((await pool.request().query(`SELECT UnitPrice FROM OrderDetails WHERE OrderID=${Number(oid)}`)).recordset[0].UnitPrice,180000);
    ok(await request('/products/'+product+'/variants/'+v2.id+'/status','PUT',{active:true,version:0}),409);
    ok(await request('/variantDiscounts/'+discount,'PUT',{active:false}));
    assert.equal((await pool.request().query(`SELECT DiscountValue,IsActive FROM VariantDiscounts WHERE VariantDiscountID=${Number(discount)}`)).recordset[0].DiscountValue,10);
  });
  await check('employee has real POS access but no catalog/account/report administration',async()=>{
    ok(await request('/accounts','POST',{username:'employee-audit@example.test',name:'Employee audit',password:'employee-audit-password',role_id:3}));
    const employee={id:(await pool.request().query("SELECT UserID FROM Users WHERE Email='employee-audit@example.test'")).recordset[0].UserID,email:'employee-audit@example.test',role:'Employee'};
    ok(await request('/orders','GET',undefined,employee));ok(await request('/inventory','GET',undefined,employee));
    ok(await request('/accounts','GET',undefined,employee),403);
    ok(await request('/v2/dashboard/summary','GET',undefined,employee),403);
    ok(await request('/products','POST',productBody,employee),403);
    ok(await request('/accounts/'+employee.id,'PUT',{role_id:1},employee),403);
    const owned=ok(await request('/pos/carts','POST'));
    ok(await request('/pos/cart?cart_id='+owned.cart_id,'GET',undefined,employee),409);
    ok(await request('/products/'+product+'/restore','PUT'));
    const row=ok(await request('/products')).find(p=>p.id===product).variants.find(v=>v.id===v2.id);
    ok(await request('/products/'+product+'/variants/'+v2.id+'/status','PUT',{active:true,version:row.version}));
    ok(await request('/variantDiscounts/'+discount,'PUT',{active:true}));
    let cart=ok(await request('/pos/cart','GET',undefined,employee));
    cart=ok(await request('/pos/cart/items/'+v2.id,'PUT',{cart_id:cart.cart_id,revision:cart.revision,quantity:1},employee));
    const body={pos_cart_id:cart.cart_id,pos_cart_revision:cart.revision,customer_name:'Staff buyer',customer_phone:'0901234567',payment_method:'Tiền mặt',payment_status:'Đã thanh toán',status:'Đã nhận hàng',total:315000,products:[{product_id:product,product_variant_id:v2.id,quantity:1,price:1}]};
    const first=ok(await api('/orders',{user:employee,method:'POST',body,headers:{'Idempotency-Key':'employee-pos-audit'}}));
    const again=ok(await api('/orders',{user:employee,method:'POST',body,headers:{'Idempotency-Key':'employee-pos-audit'}}));assert.equal(first.orderId,again.orderId);
    const saved=(await pool.request().query(`SELECT o.HandledBy,d.UnitPrice FROM Orders o JOIN OrderDetails d ON d.OrderID=o.OrderID WHERE o.OrderID=${Number(first.orderId)}`)).recordset[0];
    assert.equal(saved.UnitPrice,315000);assert.ok(String(saved.HandledBy).includes('Employee audit'));
    ok(await request('/orders/'+first.orderId+'/payment','PUT',{payment_status:'Đã thanh toán',amount:315000,currency:'VND'},employee));
    ok(await request('/orders/'+first.orderId+'/status','PUT',{status:'Đã nhận hàng'},employee));
    assert.equal((await pool.request().query(`SELECT StockQuantity FROM ProductVariants WHERE ProductVariantID=${Number(v2.id)}`)).recordset[0].StockQuantity,9);
  });
  await check('coupon toggles preserve amounts and expired coupons are immutable',async()=>{
    const body={code:'MERGE-AUDIT',name:'Coupon audit',discount_type:'Phần trăm',value:10,quantity:5,start_date:'2099-01-01',expiry:'2099-01-01',active:true};
    ok(await request('/discounts','POST',body));
    const row=ok(await request('/discounts')).find(d=>(d.code||d.CouponCode)==='MERGE-AUDIT');const id=row.id||row.CouponID;
    ok(await request('/discounts/'+id,'PUT',{active:false}));
    const saved=(await pool.request().query(`SELECT DiscountValue,UsageLimit,IsActive,DATEPART(hour,ExpiryDate) AS EndHour FROM Coupons WHERE CouponID=${Number(id)}`)).recordset[0];
    assert.equal(saved.DiscountValue,10);assert.equal(saved.UsageLimit,5);assert.equal(saved.IsActive,false);assert.equal(saved.EndHour,23);
    ok(await request('/discounts/'+id,'DELETE'));
    assert.equal((await pool.request().query(`SELECT COUNT(*) AS n FROM Coupons WHERE CouponID=${Number(id)}`)).recordset[0].n,1);
    await pool.request().query(`UPDATE Coupons SET ExpiryDate=DATEADD(day,-1,GETDATE()) WHERE CouponID=${Number(id)}`);
    ok(await request('/discounts/'+id,'PUT',{active:true}),409);ok(await request('/discounts/'+id,'PUT',body),409);
    ok(await request('/discounts/'+id,'DELETE'),409);
  });
  await check('catalog delete compatibility only disables records and product hard delete is forbidden',async()=>{
    const category=ok(await request('/categories'))[0];ok(await request('/categories/'+category.id,'DELETE'));
    assert.equal((await pool.request().query(`SELECT COUNT(*) AS n FROM Categories WHERE CategoryID=${Number(category.id)} AND IsActive=0`)).recordset[0].n,1);
    ok(await request('/products/'+product+'?hard=1','DELETE'),409);
    assert.equal((await pool.request().query(`SELECT COUNT(*) AS n FROM Products WHERE ProductID=${Number(product)}`)).recordset[0].n,1);
  });
  console.log(`PASS: ${checks} optimized catalog/POS integration scenarios.`);
}
main().catch(e=>{console.error(e);console.error(log.slice(-4500));process.exitCode=1;}).finally(async()=>{
  if(server&&server.exitCode===null){const done=new Promise(r=>server.once('exit',r));spawnSync('taskkill',['/pid',String(server.pid),'/t','/f'],{stdio:'ignore'});await done;}
  if(pool)await pool.close();
  if(!/^ShoegroupAudit_Catalog_\d+$/.test(DATABASE))throw Error('Unsafe test database');
  const master=await connection('master').connect();try{await master.request().query(`IF DB_ID(N'${DATABASE}') IS NOT NULL BEGIN ALTER DATABASE [${DATABASE}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${DATABASE}]; END`);}finally{await master.close();}
});
