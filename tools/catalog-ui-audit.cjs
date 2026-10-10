// Muc dich: Kiem tra giao dien catalog o man hinh rong/hep; chi sua ban nhap, khong luu san pham.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const runtimeRequire=createRequire(path.join(process.env.CODEX_NODE_MODULES || path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'package.json'));
const {chromium}=runtimeRequire('playwright');
const sql=require('../backend/legacy-express/node_modules/mssql');
const config=require('../backend/legacy-express/src/security/env');
const jwt=require('../backend/legacy-express/src/security/jwt');
const base=process.env.UI_BASE_URL || 'http://localhost:3000';
const out=path.join(os.tmpdir(),'shoegroup-catalog-ui');
async function main() {
  fs.mkdirSync(out,{recursive:true});
  const pool=await new sql.ConnectionPool(config.db).connect();
  let user;
  try { user=(await pool.request().query('SELECT TOP 1 UserID,FullName,Email FROM Users WHERE RoleID=1 AND IsActive=1 ORDER BY UserID')).recordset[0]; }
  finally { await pool.close(); }
  assert.ok(user,'An active admin is required for UI verification.');
  const token=jwt.sign({sub:user.UserID,email:user.Email,role:'Admin',roleId:1},'10m');
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  const errors=[];
  try {
    const context=await browser.newContext();
    await context.addInitScript(({user,token})=>{
      let h=0;const raw=[navigator.userAgent,navigator.platform,navigator.language,navigator.hardwareConcurrency,navigator.vendor || ''].join('|');
      for(let i=0;i<raw.length;i++) h=(Math.imul(31,h)+raw.charCodeAt(i))|0;
      document.cookie='sg_bsig=b'+(h>>>0).toString(36)+'; path=/';document.cookie='sg_session=1; path=/';
      localStorage.setItem('shoegroup_token',token);
      localStorage.setItem('shoegroup_current_user',JSON.stringify({id:user.UserID,id_user:user.UserID,full_name:user.FullName,email:user.Email,role:'Admin',role_id:1,token}));
    },{user,token});
    const page=await context.newPage();
    let storeUrl;
    page.on('request',r=>{if(!storeUrl && /^\/src\/views\/admin\/adminStore(?:\.js)?$/.test(new URL(r.url()).pathname)) storeUrl=r.url();});
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error') { errors.push(m.text());console.error(m.text()); }});
    page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=400) errors.push(r.status()+' '+new URL(r.url()).pathname);});
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:900});
      for(const name of ['sizes','products','variant-discounts','pos','brands','categories','colors','materials','accounts','discounts']) {
        if(!storeUrl) await page.goto(base+'/admin/panel/'+name);
        else {
          await page.evaluate(()=>{
            const s=window.auditStore;s.closeProductForm();s.formModal.open=false;s.discountModal.open=false;s.discountDetail.open=false;s.variantDiscountModal.open=false;s.confirmModal.open=false;
          });
          const menu=page.getByRole('button',{name:'Mở menu quản lý',exact:true});if(await menu.count()) await menu.click();
          await page.locator('.admin-nav-link[href="/admin/panel/'+name+'"]').click();
          await page.waitForURL('**/admin/panel/'+name);
        }
        await page.waitForFunction(()=>document.querySelector('#admin-content'));
        assert.ok(storeUrl,'The page must load the admin store.');
        await page.evaluate(async url=>{window.auditStore=await import(url);},storeUrl);
        await page.waitForFunction(()=>!window.auditStore.isLoading.value && window.auditStore.db.products.length>0 && window.auditStore.db.colors.length>0);
        if(name==='pos') await page.waitForFunction(()=>window.auditStore.posCartReady.value && !window.auditStore.posCartBusy.value);
        await page.waitForTimeout(350);
        console.log('UI',name,width);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${name} overflow at ${width}`);
        await page.screenshot({path:path.join(out,`${name}-${width}.png`),fullPage:true});
        assert.equal(await page.getByText('```',{exact:true}).count(),0,`${name}: stray code fence`);
        if(name==='brands') {
          assert.equal(await page.locator('.brand-grid').count(),0);
          await page.getByRole('searchbox',{name:'Tìm thương hiệu'}).fill('no-such-brand');
          assert.equal(await page.locator('tbody tr').count(),1);
          await page.getByRole('button',{name:'Thêm thương hiệu'}).click();
          await page.screenshot({path:path.join(out,`brand-form-${width}.png`),fullPage:true});
        }
        if(name==='accounts') {
          await page.getByRole('button',{name:'Thêm tài khoản'}).click();
          assert.equal(await page.locator('#admin-field-role_id option[value="3"]').count(),1);
          await page.screenshot({path:path.join(out,`account-form-${width}.png`),fullPage:true});
        }
        if(name==='discounts') {
          assert.equal(await page.getByRole('columnheader',{name:'Loại',exact:true}).count(),0);
          await page.getByRole('button',{name:'Thêm mã giảm giá',exact:true}).click();
          await page.screenshot({path:path.join(out,`coupon-form-${width}.png`),fullPage:true});
        }
        if(name==='sizes') {
          await page.getByRole('searchbox',{name:'Tìm kích cỡ',exact:true}).fill('40');
          assert.equal(await page.locator('tbody tr').count(),1);
          await page.getByRole('button',{name:'Thêm kích cỡ'}).click();
          await page.screenshot({path:path.join(out,`size-form-${width}.png`),fullPage:true});
        }
        if(name==='variant-discounts') {
          await page.getByRole('button',{name:'Thêm khuyến mại',exact:true}).click();
          const modal=page.locator('.custom-modal-box');
          assert.equal(await modal.getByText('Loại giảm',{exact:true}).count(),0);
          assert.equal(await modal.locator('textarea').count(),0);
          await page.screenshot({path:path.join(out,`promotion-form-${width}.png`),fullPage:true});
        }
        if(name==='products') {
          await page.evaluate(()=>{const s=window.auditStore;s.openProductForm(s.db.products.find(p=>p.variants.length>0));});
          await page.waitForTimeout(150);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`product form overflow at ${width}`);
          await page.screenshot({path:path.join(out,`product-form-${width}.png`),fullPage:true});
          await page.evaluate(()=>{const s=window.auditStore;s.closeProductForm();s.openProductForm();s.colorDraft.value=s.db.colors.find(c=>c.active).id;s.addColor();});
          await page.locator('#product-name').fill('Bản nháp kiểm thử');
          await page.getByLabel('Cùng giá cho các biến thể',{exact:true}).check();
          await page.locator('#common-price').fill('250000');
          assert.equal(await page.locator('#common-price').evaluate(el=>el.checkValidity()),true);
          await page.getByRole('button',{name:'Chọn tất cả',exact:true}).click();
          await page.waitForTimeout(150);
          await page.screenshot({path:path.join(out,`bulk-form-${width}.png`),fullPage:true});
          await page.locator('th').filter({hasText:'SKU'}).first().scrollIntoViewIfNeeded();
          await page.screenshot({path:path.join(out,`bulk-variants-${width}.png`),fullPage:true});
          assert.equal(await page.evaluate(()=>window.auditStore.productForm.colors[0].variants.every(v=>v.price===250000)),true);
        }
      }
    }
    // This context checks presentation only; real employee API permissions are exercised against the isolated audit DB.
    const staffContext=await browser.newContext();
    await staffContext.addInitScript(({user,token})=>{
      let h=0;const raw=[navigator.userAgent,navigator.platform,navigator.language,navigator.hardwareConcurrency,navigator.vendor || ''].join('|');
      for(let i=0;i<raw.length;i++) h=(Math.imul(31,h)+raw.charCodeAt(i))|0;
      document.cookie='sg_bsig=b'+(h>>>0).toString(36)+'; path=/';document.cookie='sg_session=1; path=/';
      localStorage.setItem('shoegroup_token',token);
      localStorage.setItem('shoegroup_current_user',JSON.stringify({id_user:user.UserID,full_name:user.FullName,email:user.Email,role:'Employee',role_id:3,token}));
    },{user,token});
    const staffPage=await staffContext.newPage();
    for(const width of [1440,390]) {
      await staffPage.setViewportSize({width,height:900});
      await staffPage.goto(base+'/admin/panel/products');
      await staffPage.waitForSelector('.products-page');
      assert.equal(await staffPage.getByRole('button',{name:'Thêm sản phẩm',exact:true}).count(),0);
      assert.equal(await staffPage.locator('button[title="Chỉnh sửa sản phẩm"]').count(),0);
      assert.equal(await staffPage.getByRole('switch').count(),0);
      const eye=staffPage.locator('button[title="Xem chi tiết sản phẩm"]').first();
      if(await eye.count()) { await eye.click();assert.equal(await staffPage.getByRole('button',{name:'Chỉnh sửa sản phẩm',exact:true}).count(),0);await staffPage.getByRole('button',{name:'Đóng',exact:true}).click(); }
      assert.equal(await staffPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
      await staffPage.screenshot({path:path.join(out,`employee-products-${width}.png`),fullPage:true});
    }
    await staffPage.goto(base+'/admin/panel/accounts');
    await staffPage.waitForURL('**/admin/panel/pos');
    await staffContext.close();
    assert.deepEqual(errors,[]);
    console.log('UI verified at 1440px and 390px:',out);
  } finally { await browser.close(); }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
