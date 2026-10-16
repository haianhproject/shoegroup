// Muc dich: Thu doi ID va API checkout/SKU tren ban sao DB that, khong ghi DB dang dung.
const assert=require('node:assert/strict');
const path=require('node:path');
const net=require('node:net');
const crypto=require('node:crypto');
const {spawn,spawnSync}=require('node:child_process');
const sql=require('../legacy-express/node_modules/mssql');
const config=require('../legacy-express/src/security/env');
const jwt=require('../legacy-express/src/security/jwt');
const {backup,rehearse}=require('./renumber-catalog-ids.cjs');
const root=path.resolve(__dirname,'../..'),port=5198;
let server,log='',checks=0;
const stable=value=>Array.isArray(value)?'['+value.map(stable).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}':JSON.stringify(value);
const hash=value=>crypto.createHash('sha256').update(stable(value)).digest('hex');
async function check(name,fn){await fn();console.log('PASS '+(++checks)+': '+name);}
async function main() {
  await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,()=>s.close(resolve));});
  const master=await new sql.ConnectionPool({...config.db,database:'master',requestTimeout:120000}).connect();
  try {
    const saved=path.join(root,'database/catalog-id-map-20261016.json');
    const file=process.argv[2] || (require('node:fs').existsSync(saved)?JSON.parse(require('node:fs').readFileSync(saved,'utf8')).backup:await backup(master));
    await rehearse(master,file,{
      prepare:async pool=>{
        const user=(await pool.request().query('SELECT TOP 1 UserID,Email FROM Users WHERE RoleID=1 AND IsActive=1 ORDER BY UserID')).recordset[0];
        const variant=(await pool.request().query('SELECT TOP 1 ProductID,ProductVariantID FROM ProductVariants ORDER BY ProductVariantID')).recordset[0];
        const order=(await pool.request().query('SELECT TOP 1 o.OrderID FROM Orders o WHERE NOT EXISTS(SELECT 1 FROM CheckoutRequests r WHERE r.OrderID=o.OrderID) ORDER BY o.OrderID')).recordset[0].OrderID;
        const body={items:[{productId:variant.ProductID,productVariantId:variant.ProductVariantID,quantity:1,price:100000}],userId:user.UserID,total:100000};
        await pool.request().input('uid',sql.Int,user.UserID).input('hash',sql.Char(64),hash(body)).input('oid',sql.Int,order).input('json',sql.NVarChar,JSON.stringify({success:true,orderId:order})).query("INSERT CheckoutRequests(UserID,IdempotencyKey,RequestHash,OrderID,ResponseJson) VALUES(@uid,'identity-legacy-replay',@hash,@oid,@json)");
        return {user,variant,order,body};
      },
      verify:async(pool,meta,context,database)=>{
        const location=config.db.options.instanceName?`${config.db.server};instanceName=${config.db.options.instanceName}`:`${config.db.server}:${config.db.port||1433}`;
        const url=`jdbc:sqlserver://${location};databaseName=${database};encrypt=${config.db.options.encrypt};trustServerCertificate=${config.db.options.trustServerCertificate}`;
        server=spawn(path.join(process.env.JAVA_HOME||'C:/Program Files/Java/jdk-21','bin/java.exe'),['-jar',path.join(root,'backend/target/shoegroup-api-2.0.0.jar')],{windowsHide:true,cwd:root,env:{...process.env,SPRING_DB_URL:url,DB_NAME:database,SPRING_PORT:String(port),DB_USER:config.db.user,DB_PASS:config.db.password,JWT_SECRET:config.jwt.secret,SHOEGROUP_JOBS_ENABLED:'false',EMAIL_USER:'',EMAIL_PASS:''},stdio:['ignore','pipe','pipe']});
        server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
        const token=jwt.sign({sub:context.user.UserID,email:context.user.Email,role:'Admin',roleId:1},'10m');
        const call=async(route,method='GET',body,extra={})=>{const r=await fetch(`http://127.0.0.1:${port}/api${route}`,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','X-Catalog-Identity':meta.revision,...extra},body:body==null?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
        try {
          let ready=false;for(let i=0;i<180;i++){if(server.exitCode!==null)throw Error(log.slice(-3000));try{if((await call('/health')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(ready,'Spring startup');
          await check('health mapping and all affected read APIs',async()=>{
            assert.equal((await call('/health')).data.catalogIdentity.revision,meta.revision);
            for(const route of ['/products','/categories','/brands','/materials','/colors','/sizes','/inventory','/orders','/variantDiscounts']) assert.equal((await call(route)).status,200,route);
          });
          await check('stale/missing revision cannot write to a reused ID',async()=>{
            for(const revision of ['', 'old-revision']) {const r=await call('/products/1','PUT',{name:'Must not write'},{'X-Catalog-Identity':revision});assert.equal(r.status,409);assert.equal(r.data.code,'CATALOG_IDENTITY_CHANGED');}
          });
          const map=(table,old)=>new Map(meta.maps[table]).get(old);
          const body={...context.body,items:context.body.items.map(i=>({...i,productId:map('Products',i.productId),productVariantId:map('ProductVariants',i.productVariantId)}))};
          const before=(await pool.request().query('SELECT (SELECT COUNT(*) FROM Orders) orders,(SELECT SUM(StockQuantity) FROM ProductVariants) stock')).recordset;
          await check('legacy checkout retry returns the original order once with mapped IDs',async()=>{
            for(let i=0;i<2;i++){const r=await call('/orders','POST',body,{'Idempotency-Key':'identity-legacy-replay'});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.orderId,context.order);}
            const changed=await call('/orders','POST',{...body,items:body.items.map(i=>({...i,quantity:2}))},{'Idempotency-Key':'identity-legacy-replay'});assert.equal(changed.status,409);
            assert.deepEqual((await pool.request().query('SELECT (SELECT COUNT(*) FROM Orders) orders,(SELECT SUM(StockQuantity) FROM ProductVariants) stock')).recordset,before);
          });
          await check('legacy compatibility never relaxes hashes of new checkout attempts',async()=>{
            const unusedOrder=(await pool.request().query('SELECT TOP 1 o.OrderID FROM Orders o WHERE NOT EXISTS(SELECT 1 FROM CheckoutRequests r WHERE r.OrderID=o.OrderID) ORDER BY o.OrderID')).recordset[0].OrderID;
            await pool.request().input('uid',sql.Int,context.user.UserID).input('hash',sql.Char(64),hash(context.body)).input('oid',sql.Int,unusedOrder).input('cutoff',sql.NVarChar,meta.legacyCheckoutCutoff).query("INSERT CheckoutRequests(UserID,IdempotencyKey,RequestHash,OrderID,ResponseJson,CreatedAt) VALUES(@uid,'identity-new-attempt',@hash,@oid,N'{\"success\":true}',DATEADD(second,1,CONVERT(datetime2,@cutoff,127)))");
            const r=await call('/orders','POST',body,{'Idempotency-Key':'identity-new-attempt'});assert.equal(r.status,409);assert.equal(r.data.code,'IDEMPOTENCY_CONFLICT');
          });
          await check('new product/variant IDs continue after the last row and automatic SKU avoids old codes',async()=>{
            const dim=(await pool.request().query('SELECT TOP 1 ProductVariantID,ColorID,SizeID FROM ProductVariants ORDER BY ProductVariantID')).recordset[0];
            const expected=meta.maps.Products.length+1,sku=`SKU-${expected}-C${dim.ColorID}-S${dim.SizeID}`;
            await pool.request().input('sku',sql.VarChar,sku).input('vid',sql.Int,dim.ProductVariantID).query('UPDATE ProductVariants SET ChildSKU=@sku WHERE ProductVariantID=@vid');
            const r=await call('/products','POST',{name:'Identity API test',category_id:1,active:true,variants:[{color_id:dim.ColorID,size_id:dim.SizeID,price:100000,stock:0}]});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.ProductID,expected);
            const created=(await pool.request().input('pid',sql.Int,expected).query('SELECT ProductVariantID,ChildSKU FROM ProductVariants WHERE ProductID=@pid')).recordset[0];assert.equal(created.ProductVariantID,meta.maps.ProductVariants.length+1);assert.equal(created.ChildSKU,sku+'-2');
          });
          console.log(`PASS ${checks} identity API scenarios on migrated copy.`);
        } finally {if(server&&server.exitCode===null){const done=new Promise(r=>server.once('exit',r));spawnSync('taskkill',['/pid',String(server.pid),'/t','/f'],{stdio:'ignore'});await done;}server=null;}
      }
    });
  } finally {await master.close();}
}
main().catch(e=>{console.error(e);console.error(log.slice(-3000));process.exitCode=1;});
