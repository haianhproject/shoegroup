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
  await pool.request().query("INSERT Sizes(SizeName,SizeStandard,IsActive,SortOrder) VALUES('36','ABC',0,123); UPDATE ProductVariants SET ChildSKU='AUDIT-A-M' WHERE ProductVariantID=3;");
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
  await check('every named catalog rejects case, whitespace and Unicode duplicates on create/update and in SQL',async()=>{
    for(const [type,table,column] of [['categories','Categories','CategoryName'],['brands','Brands','BrandName'],['materials','Materials','MaterialName'],['colors','Colors','ColorName']]) {
      const body={name:'  Da \t thật\u00a0',active:true,sport:'Chạy Bộ',hex:'#123456'};
      ok(await request('/'+type,'POST',body));
      const row=ok(await request('/'+type)).find(r=>r.name==='Da thật');assert.ok(row,type);
      for(const name of ['DA THẬT',' da   thật ','d a t h ậ t','Da\u00a0thật','Da\u200bthật','Da thật'.normalize('NFD')]) {
        const duplicate=await request('/'+type,'POST',{...body,name});ok(duplicate,409);assert.equal(duplicate.data.code,'DUPLICATE_CATALOG_NAME');
      }
      ok(await request('/'+type+'/'+row.id,'PUT',{...body,name:' DA   THẬT ',active:false}));
      ok(await request('/'+type,'POST',{...body,name:'da thật'}),409);
      ok(await request('/'+type,'POST',{...body,name:'Đá thật'}));
      const other=ok(await request('/'+type)).find(r=>r.name==='Đá thật');assert.ok(other);
      ok(await request('/'+type+'/'+other.id,'PUT',{...body,name:'da thật'}),409);
      assert.equal(ok(await request('/'+type)).find(r=>r.id===other.id).name,'Đá thật');
      for(const name of ['d a thật','\t \u200b']) {
        let rejected=false;
        try { await pool.request().input('name',name).query(`INSERT dbo.${table}(${column},IsActive${['brands','colors'].includes(type)?',SortOrder':''}) VALUES(@name,1${['brands','colors'].includes(type)?',0':''})`); } catch { rejected=true; }
        assert.equal(rejected,true,type+': direct SQL '+name);
      }
      const concurrent=await Promise.all([' New Catalog ','newcatalog'].map(name=>request('/'+type,'POST',{...body,name})));
      assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409],type+' concurrent create');
    }
  });
  await check('catalog cleanup removes only invalid unused sizes and DB rejects duplicate/noncanonical sizes and SKUs',async()=>{
    assert.equal((await pool.request().query("SELECT COUNT(*) n FROM Sizes WHERE SizeStandard='ABC'")).recordset[0].n,0);
    assert.equal((await pool.request().query("SELECT COUNT(*) n FROM ProductVariants WHERE ProductID=3 AND IsActive=1")).recordset[0].n,0);
    for(const query of ["INSERT Sizes(SizeName,SizeStandard,IsActive,SortOrder) VALUES('40','EU',0,0)","INSERT Sizes(SizeName,SizeStandard,IsActive,SortOrder) VALUES('40.00','EU',1,0)","INSERT Sizes(SizeName,SizeStandard,IsActive,SortOrder) VALUES('1','ABC',0,0)","UPDATE ProductVariants SET ChildSKU='AUDIT-A-M' WHERE ProductVariantID=3"]) {
      let rejected=false;try{await pool.request().query(query);}catch{rejected=true;}assert.equal(rejected,true,query);
    }
    await pool.request().query("UPDATE Sizes SET SortOrder=17 WHERE SizeName='40' AND SizeStandard='EU'");
    const row=ok(await request('/sizes')).find(s=>s.name==='40'&&s.standard==='EU');
    ok(await request('/sizes/'+row.id,'PUT',{name:'40',standard:'EU',active:false}));
    ok(await request('/sizes','POST',{name:'40.00',standard:'EU',active:true}),409);
    assert.equal((await pool.request().query('SELECT SortOrder FROM Sizes WHERE SizeID='+Number(row.id))).recordset[0].SortOrder,17);
    ok(await request('/sizes/'+row.id,'PUT',{name:'40',standard:'EU',active:true}));
  });
  const colors=ok(await request('/colors')),sizes=ok(await request('/sizes'));
  const cid=colors.find(c=>c.name==='Black').id,s40=sizes.find(s=>s.name==='40').id,s41=sizes.find(s=>s.name==='41').id;
  const productBody={name:'Catalog audit shoe',active:true,variants:[{color_id:cid,size_id:s40,color:'Black',size:'40',price:200000,stock:10,sku:'AUDIT-40'},{color_id:cid,size_id:s41,color:'Black',size:'41',price:350000,stock:10,sku:'AUDIT-41'}],colors:[{id:cid,name:'Black',image:'https://example.test/black.png'}]};
  const product=ok(await request('/products','POST',productBody)).ProductID;
  let variants=ok(await request('/products')).find(p=>p.id===product).variants;const v1=variants.find(v=>v.size==='40'),v2=variants.find(v=>v.size==='41');
  await check('individual prices and catalog references persisted',async()=>{assert.equal(v1.price,200000);assert.equal(v2.price,350000);assert.equal(v1.color_id,cid);assert.equal(v1.size_id,s40);});
  await check('duplicate SKU returns a conflict and rolls back the entire new product',async()=>{
    const before=(await pool.request().query('SELECT COUNT(*) n FROM Products')).recordset[0].n;
    const duplicate=await request('/products','POST',{name:'Duplicate SKU',active:true,variants:[{color_id:cid,size_id:s40,price:200000,stock:1,sku:'AUDIT-40'}]});
    ok(duplicate,409);assert.equal(duplicate.data.code,'DUPLICATE_DATA');
    assert.equal((await pool.request().query('SELECT COUNT(*) n FROM Products')).recordset[0].n,before);
  });
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
  const checkout={pos_cart_id:c1.cart_id,pos_cart_revision:c1.revision,customer_name:'Audit buyer',customer_phone:'0901234567',payment_method:'Tiền mặt',cash_given:500000,payment_status:'Đã thanh toán',status:'Đã nhận hàng',total:360000,products:[{product_id:product,product_variant_id:v1.id,quantity:2,price:1}]};
  let oid;
  await check('checkout uses server variant price and clears only selected invoice',async()=>{
    ok(await request('/orders','POST',{...checkout,cash_given:null}),400);
    ok(await request('/orders','POST',{...checkout,cash_given:100000}),400);
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
    const body={pos_cart_id:cart.cart_id,pos_cart_revision:cart.revision,customer_name:'Staff buyer',customer_phone:'0901234567',payment_method:'Tiền mặt',cash_given:500000,payment_status:'Đã thanh toán',status:'Đã nhận hàng',total:315000,products:[{product_id:product,product_variant_id:v2.id,quantity:1,price:1}]};
    const first=ok(await api('/orders',{user:employee,method:'POST',body,headers:{'Idempotency-Key':'employee-pos-audit'}}));
    const again=ok(await api('/orders',{user:employee,method:'POST',body,headers:{'Idempotency-Key':'employee-pos-audit'}}));assert.equal(first.orderId,again.orderId);
    const saved=(await pool.request().query(`SELECT o.HandledBy,d.UnitPrice FROM Orders o JOIN OrderDetails d ON d.OrderID=o.OrderID WHERE o.OrderID=${Number(first.orderId)}`)).recordset[0];
    assert.equal(saved.UnitPrice,315000);assert.ok(String(saved.HandledBy).includes('Employee audit'));
    assert.equal(first.cashGiven,500000);assert.equal(first.changeAmount,185000);
    const receipt=ok(await request('/orders','GET',undefined,employee)).find(o=>o.id===first.orderId);
    assert.equal(receipt.cash_given,500000);assert.equal(receipt.handled_by_user_id,employee.id);assert.equal(receipt.products[0].sku,v2.sku);
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
    await pool.request().query(`UPDATE Coupons SET StartDate=DATEADD(day,-2,GETDATE()),ExpiryDate=DATEADD(day,-1,GETDATE()) WHERE CouponID=${Number(id)}`);
    ok(await request('/discounts/'+id,'PUT',{active:true}),409);ok(await request('/discounts/'+id,'PUT',body),409);
    ok(await request('/discounts/'+id,'DELETE'),409);
  });
  await check('catalog delete compatibility only disables records and product hard delete is forbidden',async()=>{
    const category=ok(await request('/categories'))[0];ok(await request('/categories/'+category.id,'DELETE'));
    assert.equal((await pool.request().query(`SELECT COUNT(*) AS n FROM Categories WHERE CategoryID=${Number(category.id)} AND IsActive=0`)).recordset[0].n,1);
    ok(await request('/products/'+product+'?hard=1','DELETE'),409);
    assert.equal((await pool.request().query(`SELECT COUNT(*) AS n FROM Products WHERE ProductID=${Number(product)}`)).recordset[0].n,1);
  });
  await check('optimized coupons remove duplicate percent, accept unlimited explicitly and enforce zero exhausted',async()=>{
    assert.equal((await pool.request().query("SELECT COL_LENGTH('Coupons','DiscountPercent') AS n")).recordset[0].n,null);
    for(const quantity of [0,null]) ok(await request('/discounts','POST',{code:quantity===0?'ZERO-AUDIT':'UNLIMIT-AUDIT',name:'Voucher limit',discount_type:'Phần trăm',value:10,quantity,expiry:'2099-12-31',active:true}));
    const coupons=ok(await request('/discounts'));assert.equal(coupons.find(c=>c.code==='ZERO-AUDIT').limit,0);assert.equal(coupons.find(c=>c.code==='UNLIMIT-AUDIT').limit,null);
    const item={product_id:product,product_variant_id:v2.id,quantity:1};
    const zero=await api('/orders',{user:users[0],method:'POST',body:{addressId:users[0].addressId,paymentMethod:'COD',items:[item],coupon_code:'ZERO-AUDIT'}});ok(zero,409);
    let failed=false;try{await pool.request().query("INSERT OrderStatusHistory(OrderID,ChangedBy,NewStatus) VALUES("+Number(oid)+",2147483647,N'Đã xác nhận')");}catch{failed=true;}assert.equal(failed,true);
    ok(await request('/orders','DELETE'),405);
  });
  await check('only one concurrent checkout can redeem the last voucher and order snapshots stay immutable',async()=>{
    ok(await request('/discounts','POST',{code:'LAST-ONE',name:'One voucher',discount_type:'Phần trăm',value:10,quantity:1,expiry:'2099-12-31',active:true}));
    const results=await Promise.all([1,2].map(n=>api('/orders',{user:users[0],method:'POST',headers:{'Idempotency-Key':'last-voucher-'+n},body:{addressId:users[0].addressId,paymentMethod:'COD',items:[{product_id:product,product_variant_id:v2.id,quantity:1}],coupon_code:'LAST-ONE'}})));
    assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
    const used=(await pool.request().query("SELECT UsedCount,(SELECT COUNT(*) FROM CouponRedemptions r WHERE r.CouponID=c.CouponID) AS n FROM Coupons c WHERE CouponCode='LAST-ONE'")).recordset[0];assert.equal(used.UsedCount,1);assert.equal(used.n,1);
    const order=ok(await request('/orders')).find(o=>o.id===oid),name=order.products[0].name,sku=order.products[0].sku;
    await pool.request().query(`UPDATE Products SET ProductName=N'Renamed after payment' WHERE ProductID=${Number(product)}; UPDATE ProductVariants SET ChildSKU='RENAMED-AFTER-PAYMENT' WHERE ProductVariantID=${Number(v1.id)}`);
    const again=ok(await request('/orders')).find(o=>o.id===oid);assert.equal(again.products[0].name,name);assert.equal(again.products[0].sku,sku);
  });
  await check('color disable saves without zeroing prices or stock; size edits are blocked while reserved',async()=>{
    const body={...productBody,variants:productBody.variants.map(v=>({...v,sku:''}))};
    const id=ok(await request('/products','POST',body)).ProductID;
    const read=()=>request('/products').then(r=>ok(r).find(p=>p.id===id));
    let p=await read();const before=p.variants.map(v=>({id:v.id,stock:v.stock,price:v.price,sku:v.sku}));
    ok(await request('/products/'+id,'PUT',{...p,variants:p.variants.map(v=>({...v,active:false}))}));
    p=await read();assert.ok(p.variants.every(v=>!v.active));
    assert.deepEqual(p.variants.map(v=>({id:v.id,stock:v.stock,price:v.price,sku:v.sku})),before);
    assert.equal(p.min_price,200000);assert.equal(p.max_price,350000);
    assert.equal(p.colors.length,1);
    const publicProduct=ok(await request('/products','GET',undefined,null)).find(p=>p.id===id);
    assert.deepEqual(publicProduct.variants,[]);assert.deepEqual(publicProduct.colors,[]);
    ok(await request('/products/'+id,'PUT',{...p,variants:p.variants.map(v=>({...v,active:true}))}));
    assert.equal(ok(await request('/products','GET',undefined,null)).find(p=>p.id===id).colors.length,1);
    p=await read();let cart=ok(await request('/pos/carts','POST'));
    cart=ok(await request('/pos/cart/items/'+p.variants[0].id,'PUT',{cart_id:cart.cart_id,revision:cart.revision,quantity:1}));
    p=await read();const target=sizes.find(s=>s.standard==='US' && s.name==='7.5');
    const edit=()=>({...p,variants:p.variants.map((v,i)=>i===0?{...v,size_id:target.id,size:target.name,standard:target.standard}:v)});
    const blocked=await request('/products/'+id,'PUT',edit());ok(blocked,409);assert.equal(blocked.data.code,'VARIANT_IN_USE');
    ok(await request('/pos/cart','DELETE',{cart_id:cart.cart_id,revision:cart.revision}));
    p=await read();ok(await request('/products/'+id,'PUT',edit()));
    const changed=(await read()).variants[0];assert.equal(changed.size_id,target.id);assert.equal(changed.sku,before[0].sku);assert.equal(changed.stock,before[0].stock);
  });
  console.log(`PASS: ${checks} optimized catalog/POS integration scenarios.`);
}
main().catch(e=>{console.error(e);console.error(log.slice(-4500));process.exitCode=1;}).finally(async()=>{
  if(server&&server.exitCode===null){const done=new Promise(r=>server.once('exit',r));spawnSync('taskkill',['/pid',String(server.pid),'/t','/f'],{stdio:'ignore'});await done;}
  if(pool)await pool.close();
  if(!/^ShoegroupAudit_Catalog_\d+$/.test(DATABASE))throw Error('Unsafe test database');
  const master=await connection('master').connect();try{await master.request().query(`IF DB_ID(N'${DATABASE}') IS NOT NULL BEGIN ALTER DATABASE [${DATABASE}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${DATABASE}]; END`);}finally{await master.close();}
});
