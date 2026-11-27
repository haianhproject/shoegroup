// Mục đích: Kiểm thử frontend POS giữ/hoàn tồn, phiên bản giỏ và trường hợp hết hàng.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const vue = require('vue');
const { transformSync } = require('esbuild');
const { parse } = require('@vue/compiler-sfc');
const orderCodes = { exports: {} };
vm.runInNewContext(transformSync(fs.readFileSync(path.resolve(__dirname, '../src/services/orderCode.js'), 'utf8'), { format: 'cjs' }).code, {
  module: orderCodes, exports: orderCodes.exports,
});
const orderQueue = { exports: {} };
vm.runInNewContext(transformSync(fs.readFileSync(path.resolve(__dirname, '../src/services/orderQueue.js'), 'utf8'), { format: 'cjs' }).code, {
  module: orderQueue, exports: orderQueue.exports,
});

function store(fetch, sessionStorage = {getItem(){return null},setItem(){}}) {
  const module = { exports: {} };
  const mocks = {
    vue,
    '@/services/checkoutAttempt': { getCheckoutAttempt: () => ({ key: 'pos-test-key' }), clearCheckoutAttempt() {} },
    '@/services/revenue': { recognizedOrderRevenue: () => 0 },
    '@/services/vietQr': {},
    '@/services/posCustomer': { validatePosCustomer: () => ({ ok: true, name: 'Khách thử', phone: '0901234567' }) },
    '@/services/orderCode': orderCodes.exports,
    '@/services/orderQueue': orderQueue.exports,
    '@/stores/authStore': { currentUser: vue.ref({ id: 1, name: 'Quầy' }), logout() {} },
    '../../services/apiClient': { API_BASE_URL: '/api', getToken: () => 'test' },
    '@/stores/orderStore': { normalizeStatusText: value => String(value || '') },
  };
  const source = fs.readFileSync(path.resolve(__dirname, '../src/views/admin/adminStore.js'), 'utf8');
  vm.runInNewContext(transformSync(source, { format: 'cjs' }).code, {
    module, exports: module.exports, require: name => { if (!(name in mocks)) throw Error(name); return mocks[name]; },
    console, fetch, AbortController, sessionStorage, setTimeout() {}, clearTimeout() {},
  });
  const state = module.exports;
  state.db.products = [{ id: 1, name: 'Giày', price: 300000, active: true }];
  state.db.inventory = [{ id: 11, product_id: 1, product_name: 'Giày', color: 'Đen', size: '40', stock: 3, version: 0 }];
  return state;
}
const json = (body, status = 200) => ({ ok: status === 200, status, headers: { get: () => 'application/json' }, json: async () => body });
const snapshot = (quantity = 0, revision = 0) => ({ success: true, revision, items: quantity ? [{
  variant_id: 11, product_id: 1, quantity, name: 'Giày', color: 'Đen', size: '40', base_price: 300000,
  stock: 3 - quantity, version: revision,
}] : [], stockUpdates: [{ id: 11, stock: 3 - quantity, version: revision }] });

test('POS combines size/color/search, preserves size standards, and moves sold-out variants last', () => {
  const state = store(async () => json([]));
  state.db.inventory = [
    { id: 11, product_id: 1, product_name: 'Giày', color: 'Đen', standard: 'EU', size: '40', sku: 'EU40-DEN', stock: 0 },
    { id: 12, product_id: 1, product_name: 'Giày', color: 'Trắng', standard: 'EU', size: '40', sku: 'EU40-TRANG', stock: 3 },
    { id: 13, product_id: 1, product_name: 'Giày', color: 'Đen', standard: 'US', size: '40', sku: 'US40-DEN', stock: 1 },
    { id: 14, product_id: 1, product_name: 'Giày', color: 'Đen', standard: 'EU', size: '40', sku: 'EU40-DEN2', stock: 2 },
    { id: 15, product_id: 1, color: 'Đỏ', size: '50', active: false, stock: 10 },
  ];
  assert.equal(state.posVariants.value.map(v => v.id).join(','), '12,13,14,11');
  assert.equal(state.posSizeOptions.value.map(v => v.value).join(','), 'EU|40,US|40');
  state.posColorFilter.value = 'Đen'; state.posSizeFilter.value = 'EU|40';
  assert.equal(state.posVariants.value.map(v => v.id).join(','), '14,11');
  state.posSearch.value = 'den2';
  assert.equal(state.posVariants.value[0].id, 14);
  assert.equal(state.posColorOptions.value.length, 2);
  state.db.inventory.find(v => v.id === 14).stock = 0;
  state.posSearch.value = '';
  assert.equal(state.posVariants.value.every(v => v.stock === 0), true);
});

test('POS waits for server reservation and blocks a double add; available stock is not subtracted twice', async () => {
  let complete, writes = 0;
  const state = store(async (url, options) => {
    if (options?.method === 'PUT') { writes++; return new Promise(resolve => { complete = resolve; }); }
    return json(snapshot());
  });
  await state.loadPosCart();
  const variant = state.posVariants.value[0];
  const pending = state.addToCart(variant, 2);
  await state.addToCart(variant, 2);
  assert.equal(writes, 1);
  assert.equal(state.activePosOrder.value.cart.length, 0);
  assert.equal(state.posCartBusy.value, true);
  complete(json(snapshot(2, 1)));
  await pending;
  assert.equal(state.activePosOrder.value.cart[0].quantity, 2);
  assert.equal(state.posVariants.value[0].stock, 1);
  assert.equal(state.posCartItemMax(state.activePosOrder.value.cart[0]), 3);
});

test('POS rejects invalid adds and caps cart edits at held quantity plus available stock', async () => {
  let write;
  const state = store(async (url, options) => {
    if (options?.method === 'PUT') { write = JSON.parse(options.body); return json(snapshot(write.quantity, 2)); }
    return json(snapshot(2, 1));
  });
  await state.loadPosCart();
  for (const quantity of [0, -1, 1.5, NaN, 2]) await state.addToCart(state.posVariants.value[0], quantity);
  assert.equal(write, undefined);
  await state.validateCartItemQty(state.activePosOrder.value.cart[0], 99);
  assert.equal(write.quantity, 3);
  assert.equal(state.activePosOrder.value.cart[0].quantity, 3);
  assert.equal(state.posVariants.value[0].stock, 0);
});

test('lost mutation response reloads the committed cart instead of reverting or reserving twice', async () => {
  let writes = 0, reads = 0;
  const state = store(async (url, options) => {
    if (options?.method === 'PUT') { writes++; throw Error('response lost'); }
    if (url === '/api/inventory') return json([{ id: 11, stock: 1, version: 1 }]);
    return json(++reads === 1 ? snapshot() : snapshot(2, 1));
  });
  await state.loadPosCart();
  assert.equal(await state.addToCart(state.posVariants.value[0], 2), false);
  assert.equal(writes, 1);
  assert.equal(state.activePosOrder.value.cart[0].quantity, 2);
  assert.equal(state.posVariants.value[0].stock, 1);
});

test('failed reset keeps held cart; successful reset restores stock and clears customer form', async () => {
  let reject = true;
  const state = store(async (url, options) => {
    if (options?.method === 'DELETE') return reject ? json({ message: 'conflict' }, 409) : json(snapshot(0, 2));
    if (url === '/api/inventory') return json([{ id: 11, stock: 1, version: 1 }]);
    return json(snapshot(2, 1));
  });
  await state.loadPosCart();
  state.activePosOrder.value.customer_name = 'Khách thử';
  await state.resetPosOrder();
  assert.equal(state.activePosOrder.value.cart[0].quantity, 2);
  assert.equal(state.activePosOrder.value.customer_name, 'Khách thử');
  reject = false;
  await state.resetPosOrder();
  assert.equal(state.activePosOrder.value.cart.length, 0);
  assert.equal(state.activePosOrder.value.customer_name, '');
  assert.equal(state.posVariants.value[0].stock, 3);
});

test('POS checkout sends the reservation revision and never deducts local stock again', async () => {
  let payload, completed = false;
  const state = store(async (url, options) => {
    if (url === '/api/orders') {
      payload = JSON.parse(options.body);
      completed = true;
      return json({ orderId: 88, totalAmount: 600000 });
    }
    return json(completed ? { success: true, revision: 2, items: [] } : snapshot(2, 1));
  });
  await state.loadPosCart();
  state.activePosOrder.value.customer_id = 2;
  state.activePosOrder.value.cash_given = 700000;
  await state.checkoutPos();
  assert.equal(payload,undefined);assert.equal(state.posConfirmModal.open,true);
  await state.confirmPosCheckout();
  assert.equal(payload.pos_cart_revision, 1);
  assert.equal(payload.products[0].quantity, 2);
  assert.equal(state.db.inventory[0].stock, 1);
  assert.equal(state.activePosOrder.value.cart.length, 0);
  assert.equal(state.posInvoiceModal.orderId, 88);
  assert.equal(state.posInvoiceModal.change,100000);
});

test('older stock events cannot overwrite a newer reservation response', () => {
  const state = store(() => {});
  state.applyPosStockUpdates([{ id: 11, stock: 0, version: 4 }]);
  state.applyPosStockUpdates([{ id: 11, stock: 2, version: 3 }]);
  assert.equal(state.posVariants.value[0].stock, 0);
});

test('POS rejects insufficient or invalid cash and confirmation cancel does not create an order',async()=>{
  let writes=0;
  const state=store(async(url,options)=>{if(options?.method==='POST') writes++;return json(snapshot(2,1));});
  await state.loadPosCart();
  for(const cash of ['',null,-1,599999,Infinity,700000.5]) {
    state.activePosOrder.value.cash_given=cash;await state.checkoutPos();assert.equal(state.posConfirmModal.open,false);
  }
  state.activePosOrder.value.cash_given=700000;await state.checkoutPos();
  assert.equal(state.posConfirmModal.open,true);assert.equal(writes,0);
  state.posConfirmModal.open=false;await state.confirmPosCheckout();assert.equal(writes,0);
});

test('POS keeps each pending invoice customer and cash draft through switching and reload',async()=>{
  const values=new Map(),ss={getItem:k=>values.get(k) || null,setItem:(k,v)=>values.set(k,v)};
  let first=true;
  const fetch=async url=>json({...snapshot(),cart_id:first?1:Number(new URL(url,'http://localhost').searchParams.get('cart_id') || 2),carts:[{id:1},{id:2}]});
  const state=store(fetch,ss);await state.loadPosCart();first=false;
  Object.assign(state.activePosOrder.value,{customer_name:'Khách A',cash_given:500000});await vue.nextTick();
  await state.switchPosCart(2);Object.assign(state.activePosOrder.value,{customer_name:'Khách B',cash_given:900000});await vue.nextTick();
  await state.switchPosCart(1);assert.equal(state.activePosOrder.value.customer_name,'Khách A');assert.equal(state.activePosOrder.value.cash_given,500000);
  await vue.nextTick();const reload=store(fetch,ss);await reload.loadPosCart();assert.equal(reload.activePosOrder.value.customer_name,'Khách B');assert.equal(reload.activePosOrder.value.cash_given,900000);
});

test('cash defaults to the total, follows quantities/coupons, and preserves a cashier override', async () => {
  let quantity=2, revision=1;
  const state=store(async (url, options) => {
    if(options?.method==='PUT') { quantity=JSON.parse(options.body).quantity;revision++; }
    return json(snapshot(quantity,revision));
  });
  await state.loadPosCart();
  assert.equal(state.activePosOrder.value.cash_given,600000);
  assert.equal(state.posChange.value,0);
  await state.validateCartItemQty(state.activePosOrder.value.cart[0],3);
  assert.equal(state.activePosOrder.value.cash_given,900000);
  state.db.discounts=[{id:1,code:'TEN',active:true,discount_type:'Phần trăm',value:10}];
  state.activePosOrder.value.coupon_code='TEN';
  assert.equal(state.posGrandTotal.value,810000);assert.equal(state.activePosOrder.value.cash_given,810000);
  state.activePosOrder.value.cash_given=1000000;
  await state.validateCartItemQty(state.activePosOrder.value.cart[0],2);
  assert.equal(state.activePosOrder.value.cash_given,1000000);assert.equal(state.posChange.value,460000);
  state.usePosExactCash();assert.equal(state.activePosOrder.value.cash_given,540000);
  state.clearPosCoupon();assert.equal(state.activePosOrder.value.cash_given,600000);
});

test('automatic and manually edited cash stay independent across invoice switches', async () => {
  const state=store(async url => {
    const id=Number(new URL(url,'http://localhost').searchParams.get('cart_id') || 10);
    return json({...snapshot(id===10?1:2,1),cart_id:id,carts:[{id:10,revision:1},{id:11,revision:1}]});
  });
  await state.loadPosCart();assert.equal(state.activePosOrder.value.cash_given,300000);
  await state.switchPosCart(11);assert.equal(state.activePosOrder.value.cash_given,600000);
  state.activePosOrder.value.cash_given=700000;
  await state.switchPosCart(10);assert.equal(state.activePosOrder.value.cash_given,300000);
  await state.switchPosCart(11);assert.equal(state.activePosOrder.value.cash_given,700000);
});

test('closing an inactive invoice uses its revision and keeps the selected customer/cash draft', async () => {
  let payload, writes=0;
  const state=store(async (url, options) => {
    if(options?.method==='DELETE') { payload=JSON.parse(options.body);writes++;return json({...snapshot(1,4),cart_id:10,carts:[{id:10,revision:4}],stockUpdates:[{id:11,stock:2,version:5}]}); }
    return json({...snapshot(1,4),cart_id:10,carts:[{id:10,revision:4},{id:11,revision:7,item_count:1}]});
  });
  await state.loadPosCart();Object.assign(state.activePosOrder.value,{customer_name:'Khách A',cash_given:500000});
  assert.equal(await state.closePendingPosCart(11),true);
  assert.equal(writes,1);assert.equal(payload.revision,7);assert.equal(payload.current_cart_id,10);
  assert.equal(state.posCartId.value,10);assert.equal(state.activePosOrder.value.customer_name,'Khách A');
  assert.equal(state.activePosOrder.value.cash_given,500000);assert.equal(state.db.inventory[0].stock,2);
  assert.equal(await state.closePendingPosCart(11),false);assert.equal(writes,1);
});

test('a lost close response reloads the remaining invoice and stock without repeating the deletion', async () => {
  let reads=0,writes=0;
  const state=store(async (url, options) => {
    if(options?.method==='DELETE') { writes++;throw Error('response lost'); }
    if(url==='/api/inventory')return json([{id:11,stock:3,version:3}]);
    reads++;
    if(reads===1)return json({...snapshot(1,2),cart_id:10,carts:[{id:10,revision:2}]});
    if(url.includes('cart_id=10'))return json({message:'Hóa đơn đã đóng'},409);
    return json({...snapshot(0,0),cart_id:11,carts:[{id:11,revision:0}]});
  });
  await state.loadPosCart();
  assert.equal(await state.closePendingPosCart(10),false);
  assert.equal(writes,1);assert.equal(state.posCartId.value,11);assert.equal(state.activePosOrder.value.cart.length,0);
  assert.equal(state.activePosOrder.value.cash_given,0);assert.equal(state.db.inventory[0].stock,3);
  assert.equal(state.posCartBusy.value,false);assert.equal(state.posCartReady.value,true);
});

test('payment list has aligned header/cell counts and customer details remain in order detail', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/views/admin/pages/PaymentsPage.vue'), 'utf8');
  const template = parse(source).descriptor.template.content;
  const table = template.slice(template.indexOf('<table'), template.indexOf('</table>'));
  assert.equal((table.match(/<th\s/g) || []).length, 7);
  assert.equal((table.match(/<td(?:\s|>)/g) || []).length, 7);
  assert.doesNotMatch(table, /ord\.customer_phone|order-customer-name/);
  assert.match(template, /orderDetail\.order\.customer_name/);
  assert.match(template, /orderDetail\.order\.customer_phone/);
});
