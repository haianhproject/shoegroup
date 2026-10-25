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
  let user,identity;
  try {
    user=(await pool.request().query('SELECT TOP 1 UserID,FullName,Email FROM Users WHERE RoleID=1 AND IsActive=1 ORDER BY UserID')).recordset[0];
    const mapping=(await pool.request().query("SELECT CAST(value AS nvarchar(4000)) payload FROM sys.extended_properties WHERE major_id=OBJECT_ID('dbo.AppMigrations') AND name=N'ShoeGroup.CatalogIdentity'")).recordset[0];
    identity=mapping?JSON.parse(mapping.payload):null;
  }
  finally { await pool.close(); }
  assert.ok(user,'An active admin is required for UI verification.');
  const token=jwt.sign({sub:user.UserID,email:user.Email,role:'Admin',roleId:1},'10m');
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  const errors=[];
  try {
    const context=await browser.newContext();
    await context.addInitScript(({user,token,identity})=>{
      let h=0;const raw=[navigator.userAgent,navigator.platform,navigator.language,navigator.hardwareConcurrency,navigator.vendor || ''].join('|');
      for(let i=0;i<raw.length;i++) h=(Math.imul(31,h)+raw.charCodeAt(i))|0;
      document.cookie='sg_bsig=b'+(h>>>0).toString(36)+'; path=/';document.cookie='sg_session=1; path=/';
      localStorage.setItem('shoegroup_token',token);
      localStorage.setItem('shoegroup_current_user',JSON.stringify({id:user.UserID,id_user:user.UserID,full_name:user.FullName,email:user.Email,role:'Admin',role_id:1,token}));
      if(identity && !localStorage.getItem('shoegroup_identity_audit_seeded')) {
        const [pid]=identity.maps.Products[0],[vid]=identity.maps.ProductVariants[0];
        localStorage.setItem('shoegroup_carts_v4',JSON.stringify({__guest__:[{id_product:pid,variant_id:vid,id_product_detail:pid+'_variant_'+vid,quantity:2,unitPrice:123456,product:{id_product:pid,product_name:'Identity UI fixture'}}]}));
        sessionStorage.setItem('shoegroup_checkout_attempt_v1',JSON.stringify({key:'identity-ui-preserved-key',fingerprint:JSON.stringify({items:[{productId:pid,productVariantId:vid,quantity:2}]})}));
        localStorage.setItem('shoegroup_identity_audit_seeded','1');
      }
    },{user,token,identity});
    const page=await context.newPage();
    let storeUrl;
    page.on('request',r=>{if(!storeUrl && /^\/src\/views\/admin\/adminStore(?:\.js)?$/.test(new URL(r.url()).pathname)) storeUrl=r.url();});
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error') { errors.push(m.text());console.error(m.text()); }});
    page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=400) errors.push(r.status()+' '+new URL(r.url()).pathname);});
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:900});
      for(const name of ['sizes','products','variant-discounts','pos','payments','brands','categories','colors','materials','accounts','discounts']) {
        if(!storeUrl) await page.goto(base+'/admin/panel/'+name);
        else {
          await page.evaluate(()=>{
            const s=window.auditStore;s.closeProductForm();s.formModal.open=false;s.discountModal.open=false;s.discountDetail.open=false;s.variantDiscountModal.open=false;s.confirmModal.open=false;s.posConfirmModal.open=false;
          });
          const menu=page.getByRole('button',{name:'Mở menu quản lý',exact:true});if(await menu.count()) await menu.click();
          await page.locator('.admin-nav-link[href="/admin/panel/'+name+'"]').click();
          await page.waitForURL('**/admin/panel/'+name);
        }
        await page.waitForFunction(()=>document.querySelector('#admin-content'));
        assert.ok(storeUrl,'The page must load the admin store.');
        await page.evaluate(async url=>{window.auditStore=await import(url);},storeUrl);
        await page.waitForFunction(()=>!window.auditStore.isLoading.value && window.auditStore.db.products.length>0 && window.auditStore.db.colors.length>0);
        if(identity) {
          const migrated=await page.evaluate(()=>({cart:JSON.parse(localStorage.getItem('shoegroup_carts_v4')).__guest__[0],attempt:JSON.parse(sessionStorage.getItem('shoegroup_checkout_attempt_v1'))}));
          assert.equal(migrated.cart.id_product,identity.maps.Products[0][1]);assert.equal(migrated.cart.variant_id,identity.maps.ProductVariants[0][1]);
          assert.equal(migrated.cart.quantity,2);assert.equal(migrated.cart.unitPrice,123456);assert.equal(migrated.attempt.key,'identity-ui-preserved-key');
          assert.equal(JSON.parse(migrated.attempt.fingerprint).items[0].productId,identity.maps.Products[0][1]);
        }
        if(name==='pos') await page.waitForFunction(()=>window.auditStore.posCartReady.value && !window.auditStore.posCartBusy.value && document.querySelector('button[aria-label="Thêm hóa đơn chờ"]')?.disabled===false && !document.querySelector('.admin-loading'));
        await page.waitForTimeout(350);
        console.log('UI',name,width);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${name} overflow at ${width}`);
        if(['sizes','products','brands','categories','colors','materials'].includes(name)) {
          const table=page.locator('.admin-catalog-table');
          const ids=await table.locator('tbody tr').evaluateAll(rows=>rows.filter(row=>row.querySelector('input[role="switch"]')).map(row=>Number(row.cells[0].textContent.replace('#','').trim())));
          assert.deepEqual(ids,[...ids].sort((a,b)=>a-b),`${name} IDs must be ascending`);
          const badgeStyles=await table.locator('.admin-activity-status').evaluateAll(els=>els.map(el=>{const s=getComputedStyle(el);return {width:s.width,height:s.height,fontSize:s.fontSize,borderRadius:s.borderRadius};}));
          assert.ok(badgeStyles.length,`${name} needs status labels`);
          assert.ok(badgeStyles.every(s=>s.width==='136px'&&s.height==='28px'&&s.fontSize==='11px'&&s.borderRadius==='6px'),`${name} inconsistent activity badges`);
          const switchStyles=await table.locator('input[role="switch"]').evaluateAll(els=>els.map(el=>{const s=getComputedStyle(el);return {width:s.width,height:s.height,appearance:s.appearance};}));
          assert.ok(switchStyles.every(s=>s.width==='36px'&&s.height==='20px'&&s.appearance==='none'),`${name} inconsistent activity switches`);
          const actionSizes=await table.locator('.admin-row-actions button,.brand-actions button,.products-actions button,.action-buttons button').evaluateAll(els=>els.map(el=>({width:el.offsetWidth,height:el.offsetHeight})));
          assert.ok(actionSizes.every(s=>s.width===34&&s.height===34),`${name} inconsistent action buttons`);
          const fieldHeights=await page.locator('.admin-catalog-page .sg-input,.admin-catalog-page .search-input').evaluateAll(els=>els.map(el=>el.offsetHeight));
          assert.ok(fieldHeights.every(height=>height===40),`${name} inconsistent filter fields`);
          const addHeights=await page.locator('.admin-catalog-page > :is(.page-header,.page-heading,.brands-toolbar,.products-page-head) > button').evaluateAll(els=>els.map(el=>el.offsetHeight));
          assert.deepEqual(addHeights,[40],`${name} inconsistent add button`);
        }
        await page.screenshot({path:path.join(out,`${name}-${width}.png`),fullPage:true});
        assert.equal(await page.getByText('```',{exact:true}).count(),0,`${name}: stray code fence`);
        if(['categories','brands','materials','colors'].includes(name)) {
          const existing=await page.evaluate(type=>window.auditStore.db[type][0],name);
          assert.ok(existing,'Catalog fixture: '+name);
          await page.evaluate(type=>window.auditStore.openForm(type),name);
          const input=page.locator('#admin-field-name');
          for(const value of [' '+existing.name.toUpperCase()+' ',Array.from(existing.name).join(' \t')]) {
            await input.fill(value);
            assert.match(await page.locator('#admin-error-name').textContent(),/đã tồn tại/);
            await page.getByRole('button',{name:'Lưu',exact:true}).click();
            assert.equal(await input.inputValue(),value);
          }
          assert.equal(await input.getAttribute('aria-invalid'),'true');
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
          await page.screenshot({path:path.join(out,`catalog-duplicate-${name}-${width}.png`),fullPage:true});
          await page.evaluate(({type,row})=>window.auditStore.openForm(type,row),{type:name,row:existing});
          await input.fill(' '+existing.name.toUpperCase()+' ');
          assert.equal(await page.locator('#admin-error-name').count(),0);
          await page.evaluate(()=>window.auditStore.formModal.open=false);
        }
        if(name==='pos') {
          const old=await page.evaluate(()=>JSON.parse(JSON.stringify(window.auditStore.activePosOrder.value)));
          await page.evaluate(()=>{const s=window.auditStore;Object.assign(s.activePosOrder.value,{customer_type:'Khách lẻ',customer_name:'Khách thử',customer_phone:'0901234567',payment_method:'Tiền mặt',cash_given:500000,coupon_code:'',cart:[{key:999,variant_id:999,product_id:1,name:'Giày kiểm thử',sku:'SG-TEST-40',color:'Đen',size:'40',quantity:1,price:250000}]});});
          await page.getByRole('button',{name:'Tạo đơn / Thanh toán'}).click();
          assert.equal(await page.getByRole('dialog',{name:'Xác nhận thanh toán',exact:true}).count(),1);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
          await page.screenshot({path:path.join(out,`pos-confirm-${width}.png`),fullPage:true});
          await page.getByRole('button',{name:'Quay lại',exact:true}).click();
          await page.evaluate(old=>Object.assign(window.auditStore.activePosOrder.value,old),old);
        }
        if(name==='brands') {
          assert.equal(await page.locator('.brand-grid').count(),0);
          const state=await page.evaluate(()=>{
            const s=window.auditStore;return {brands:s.db.brands.map(b=>({id:b.id,active:b.active})),search:s.brandSearch.value,status:s.brandStatusFilter.value};
          });
          await page.getByRole('searchbox',{name:'Tìm thương hiệu'}).fill('');
          for(const status of ['active','inactive']) {
            await page.getByRole('combobox',{name:'Lọc trạng thái thương hiệu'}).selectOption(status);
            const count=state.brands.filter(b=>b.active===(status==='active')).length;
            assert.equal(await page.locator('tbody tr').count(),count || 1);
            const switches=await page.locator('tbody input[role="switch"]').evaluateAll(els=>els.map(el=>el.checked));
            assert.ok(switches.every(active=>active===(status==='active')));
          }
          await page.getByRole('combobox',{name:'Lọc trạng thái thương hiệu'}).selectOption('');
          await page.getByRole('searchbox',{name:'Tìm thương hiệu'}).fill('#'+state.brands[0].id);
          assert.equal(await page.locator('tbody tr input[role="switch"]').count(),state.brands.filter(b=>String(b.id).includes(String(state.brands[0].id))).length);
          await page.getByRole('searchbox',{name:'Tìm thương hiệu'}).fill('no-such-brand');
          assert.equal(await page.locator('tbody tr').count(),1);
          await page.evaluate(state=>{window.auditStore.brandSearch.value=state.search;window.auditStore.brandStatusFilter.value=state.status;},state);
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
          assert.equal(await page.locator('#admin-field-sort_order').count(),0);
          await page.locator('#admin-field-name').fill('40.00');
          assert.match(await page.locator('#admin-error-name').textContent(),/đã tồn tại/);
          await page.getByRole('button',{name:'Lưu',exact:true}).click();
          assert.equal(await page.locator('#admin-field-name').inputValue(),'40.00');
          await page.locator('.custom-modal-overlay').click({position:{x:5,y:5}});
          await page.mouse.wheel(0,500);
          assert.equal(await page.locator('#admin-field-name').inputValue(),'40.00');
          await page.getByRole('button',{name:'Đóng hộp thoại',exact:true}).click();
          assert.equal(await page.getByRole('button',{name:'Tiếp tục nhập',exact:true}).count(),1);
          await page.getByRole('button',{name:'Tiếp tục nhập',exact:true}).click();
          await page.locator('#admin-field-name').fill('7,25');
          await page.locator('#admin-field-standard').selectOption('US');
          assert.match(await page.locator('#admin-error-name').textContent(),/bước/);
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
          assert.deepEqual(await page.locator('.products-table thead th').allTextContents(),['Mã sản phẩm','Ảnh sản phẩm','Tên giày','Thương hiệu','Khoảng giá','Tồn kho','Trạng thái','Thao tác']);
          assert.ok((await page.locator('.products-table tbody tr').first().locator('td').count())===8);
          assert.equal(await page.locator('.products-page .products-description').count(),0);
          const ids=await page.evaluate(()=>window.auditStore.filteredProducts.value.map(p=>p.id));assert.deepEqual(ids,[...ids].sort((a,b)=>a-b));
          if(width===1440) {
            for(const laptopWidth of [1366,1440]) {
              await page.setViewportSize({width:laptopWidth,height:900});await page.waitForTimeout(350);
              const fits=await page.locator('.products-table-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1);
              assert.equal(fits,true,`Product actions need horizontal scrolling at ${laptopWidth}`);
              await page.screenshot({path:path.join(out,`products-fit-${laptopWidth}.png`),fullPage:true});
            }
          }
          await page.locator('button[title="Xem chi tiết sản phẩm"]').first().click();
          const detail=page.locator('.product-detail-dialog');
          assert.equal(await detail.locator('input,select,textarea').count(),0);
          assert.equal(await detail.getByRole('button',{name:'Chỉnh sửa sản phẩm',exact:true}).count(),0);
          assert.equal(await detail.getByText(/SKU cha/).count(),0);
          await page.screenshot({path:path.join(out,`product-detail-${width}.png`),fullPage:true});
          await page.getByRole('button',{name:'Đóng',exact:true}).click();
          await page.evaluate(productId=>{const s=window.auditStore;s.openProductForm(s.db.products.find(p=>p.id===productId) || s.db.products.find(p=>p.variants.length>0));},identity?identity.maps.Products[0][1]:22);
          await page.waitForTimeout(150);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`product form overflow at ${width}`);
          await page.screenshot({path:path.join(out,`product-form-${width}.png`),fullPage:true});
          assert.equal(await page.evaluate(()=>window.auditStore.productForm.colors.flatMap(c=>c.variants || []).every(v=>v.price>0)),true);
          await page.evaluate(()=>window.auditStore.productForm.active=true);
          const color=page.locator('.color-editor').first();
          const savedRows=await page.evaluate(()=>JSON.parse(JSON.stringify(window.auditStore.productForm.colors[0].variants)));
          const savedVariants=await page.evaluate(()=>JSON.parse(JSON.stringify(window.auditStore.productForm.colors.flatMap(c=>c.variants || []))));
          await color.locator('summary').click();
          assert.equal(await page.getByRole('button',{name:/Chọn tất cả|Bỏ chọn tất cả|Hoàn tác chọn kích cỡ/}).count(),0);
          assert.equal(await color.locator('.variant-remove').count(),0);
          const choices=color.locator('.variant-add-sizes input');
          assert.ok(await choices.count()>=3,'The edited product needs three unused sizes for the batch audit.');
          const firstSize=await choices.first().getAttribute('aria-label');
          const secondSize=await choices.nth(1).getAttribute('aria-label');
          await choices.first().check();await choices.first().uncheck();
          assert.deepEqual(await page.evaluate(()=>JSON.parse(JSON.stringify(window.auditStore.productForm.colors[0].variants))),savedRows);
          await color.getByRole('spinbutton',{name:/Giá biến thể thêm mới/}).fill('250000');
          await color.getByRole('spinbutton',{name:/Tồn biến thể thêm mới/}).fill('3');
          await color.getByRole('checkbox',{name:firstSize,exact:true}).check();
          await color.getByRole('checkbox',{name:secondSize,exact:true}).check();
          assert.equal(await color.locator('.variant-editor-table tbody tr').count(),savedRows.length);
          await color.getByRole('button',{name:'Thêm biến thể (2)',exact:true}).click();
          assert.equal(await color.locator('.variant-new-badge').count(),2);
          assert.equal(await color.locator('.variant-add-sizes input:checked').count(),0);
          assert.deepEqual(await page.evaluate(()=>JSON.parse(JSON.stringify(window.auditStore.productForm.colors[0].variants.filter(v=>v.id)))),savedRows);
          await color.getByRole('spinbutton',{name:/Giá biến thể thêm mới/}).fill('350000');
          await color.getByRole('spinbutton',{name:/Tồn biến thể thêm mới/}).fill('7');
          assert.equal(await page.evaluate(()=>window.auditStore.productForm.colors[0].variants.filter(v=>!v.id).every(v=>v.price===250000&&v.stock===3)),true);
          await color.locator('.variant-remove').first().click();
          assert.equal(await color.locator('.variant-new-badge').count(),1);
          await color.getByRole('checkbox',{name:firstSize,exact:true}).check();
          await color.getByRole('button',{name:'Thêm biến thể (1)',exact:true}).click();
          assert.deepEqual(await page.evaluate(()=>window.auditStore.productForm.colors[0].variants.filter(v=>!v.id).map(v=>({price:v.price,stock:v.stock}))),[{price:250000,stock:3},{price:350000,stock:7}]);
          assert.deepEqual(await page.evaluate(()=>JSON.parse(JSON.stringify(window.auditStore.productForm.colors[0].variants.filter(v=>v.id)))),savedRows);
          await choices.first().check();
          await page.getByRole('button',{name:'Lưu sản phẩm',exact:true}).click();
          assert.match(await color.locator('.variant-size-picker > .variant-field-error').textContent(),/Thêm biến thể/);
          assert.equal(await page.evaluate(()=>window.auditStore.confirmModal.open),false);
          await color.locator('.variant-add-sizes input:checked').uncheck();
          await color.getByRole('switch',{name:/Hoạt động màu/}).check();
          assert.equal(await page.evaluate(()=>window.auditStore.productForm.colors[0].variants.every(v=>v.active)),true);
          await color.getByRole('switch',{name:/Hoạt động biến thể/}).first().uncheck();
          if(await color.getByRole('switch',{name:/Hoạt động biến thể/}).count()>1) {
            assert.equal(await color.getByRole('switch',{name:/Hoạt động màu/}).evaluate(el=>el.indeterminate),true);
            await color.getByRole('switch',{name:/Hoạt động màu/}).check();
            assert.equal(await page.evaluate(()=>window.auditStore.productForm.colors[0].variants.every(v=>v.active)),true);
          }
          await color.getByRole('switch',{name:/Hoạt động màu/}).uncheck();
          assert.equal(await page.evaluate(()=>window.auditStore.productForm.colors[0].variants.every(v=>!v.active)),true);
          await color.locator('.variant-editor-table tbody tr').first().scrollIntoViewIfNeeded();
          const overflow=await color.evaluate(el=>[el,...el.querySelectorAll('.variant-editor-table,.variant-editor-table td')].filter(node=>node.scrollWidth>node.clientWidth+1).map(node=>({tag:node.tagName,cls:node.className,scroll:node.scrollWidth,width:node.clientWidth})));
          assert.deepEqual(overflow,[],`Variant editor overflow at ${width}`);
          assert.equal(await color.locator('.variant-state-cell input').first().isVisible(),true);
          await page.screenshot({path:path.join(out,`existing-variants-${width}.png`),fullPage:true});
          let submitted;
          const productWrite=/\/api\/products\/\d+$/;
          const capture=async route=>{
            assert.equal(route.request().method(),'PUT');submitted=route.request().postDataJSON();
            await route.fulfill({status:200,contentType:'application/json',body:'{"success":true}'});
          };
          await page.route(productWrite,capture);
          try {
            await page.getByRole('button',{name:'Lưu sản phẩm',exact:true}).click();
            await page.getByRole('alertdialog',{name:'Xác nhận lưu sản phẩm',exact:true}).getByRole('button',{name:'Lưu',exact:true}).click();
            await page.waitForFunction(()=>!window.auditStore.productFormOpen.value && !window.auditStore.isLoading.value);
            assert.ok(submitted,'The confirmed form must send its variants.');
            for(const saved of savedVariants) {
              const sent=submitted.variants.find(v=>v.id===saved.id);assert.ok(sent,'Missing saved variant '+saved.id);
              for(const key of ['stock','price','sku','version','size_id']) assert.equal(sent[key],saved[key],`Saved ${saved.id}: ${key}`);
            }
            assert.equal(submitted.variants.length,savedVariants.length+2);
            assert.equal(submitted.colors.some(c=>'addition' in c),false);
          } finally { await page.unroute(productWrite,capture); }
          await page.evaluate(()=>{const s=window.auditStore;s.closeProductForm();s.openProductForm();s.colorDraft.value=s.db.colors.find(c=>c.active).id;s.addColor();});
          await page.locator('#product-name').fill('Bản nháp kiểm thử');
          const draft=page.locator('.color-editor').first();
          await draft.getByRole('button',{name:'Thêm biến thể',exact:true}).click();
          assert.match(await draft.locator('.variant-size-picker > .variant-field-error').textContent(),/chọn ít nhất/);
          await draft.getByRole('spinbutton',{name:/Giá biến thể thêm mới/}).fill('0');
          assert.match(await draft.locator('[role="alert"]').first().textContent(),/lớn hơn 0/);
          await draft.getByRole('spinbutton',{name:/Giá biến thể thêm mới/}).fill('250000');
          await draft.getByRole('spinbutton',{name:/Tồn biến thể thêm mới/}).fill('0');
          await draft.locator('.variant-add-sizes input').nth(0).check();
          await draft.locator('.variant-add-sizes input').nth(1).check();
          await draft.getByRole('button',{name:'Thêm biến thể (2)',exact:true}).click();
          await page.waitForTimeout(150);
          await page.screenshot({path:path.join(out,`bulk-form-${width}.png`),fullPage:true});
          await draft.locator('.variant-editor-table tbody tr').first().scrollIntoViewIfNeeded();
          await page.screenshot({path:path.join(out,`bulk-variants-${width}.png`),fullPage:true});
          assert.equal(await page.evaluate(()=>window.auditStore.productForm.colors[0].variants.every(v=>v.price===250000)),true);
          assert.equal(await draft.locator('.variant-stock-note').count(),2);
          assert.equal(await draft.getByRole('switch',{name:/Hoạt động biến thể/}).first().isChecked(),true);
          await draft.locator('.variant-editor-table input[aria-label^="Giá "]').first().fill('170000');
          await draft.locator('summary').click();
          await draft.getByRole('spinbutton',{name:/Giá biến thể thêm mới/}).fill('350000');
          assert.equal(await draft.locator('.variant-editor-table input[aria-label^="Giá "]').first().inputValue(),'170000');
          for(const narrowWidth of [320,768,1024,1366,1920]) {
            await page.setViewportSize({width:narrowWidth,height:900});
            await page.waitForTimeout(350);
            const overflowing=await draft.evaluate(el=>[el,...el.querySelectorAll('.variant-editor-table,.variant-editor-table td')].filter(node=>node.scrollWidth>node.clientWidth+1).map(node=>({tag:node.tagName,cls:node.className,scroll:node.scrollWidth,width:node.clientWidth})));
            await page.screenshot({path:path.join(out,`variant-responsive-${narrowWidth}.png`),fullPage:true});
            assert.deepEqual(overflowing,[],`Variant editor overflow at ${narrowWidth}`);
            assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`Product form page overflow at ${narrowWidth}`);
          }
          await page.setViewportSize({width,height:900});
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
main().catch(e=>{console.error(e.stack || e.message);process.exitCode=1;});
