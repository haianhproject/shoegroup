const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const vue = require('vue');
const { transformSync } = require('esbuild');
const { parse } = require('@vue/compiler-sfc');

function store(fetch) {
  const module = { exports: {} };
  const mocks = {
    vue,
    '@/services/checkoutAttempt': { getCheckoutAttempt: () => ({ key: 'pos-test-key' }), clearCheckoutAttempt() {} },
    '@/services/revenue': { recognizedOrderRevenue: () => 0 },
    '@/services/vietQr': {},
    '@/services/posCustomer': { validatePosCustomer: () => ({ ok: true, name: 'Khách thử', phone: '0901234567' }) },
    '@/stores/authStore': { currentUser: vue.ref({ id: 1, name: 'Quầy' }), logout() {} },
    '../../services/apiClient': { API_BASE_URL: '/api', getToken: () => 'test' },
    '@/stores/orderStore': { normalizeStatusText: value => String(value || '') },
  };
  const source = fs.readFileSync(path.resolve(__dirname, '../src/views/admin/adminStore.js'), 'utf8');
  vm.runInNewContext(transformSync(source, { format: 'cjs' }).code, {
    module, exports: module.exports, require: name => { if (!(name in mocks)) throw Error(name); return mocks[name]; },
    console, fetch, setTimeout() {}, clearTimeout() {},
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
  await state.checkoutPos();
  assert.equal(payload.pos_cart_revision, 1);
  assert.equal(payload.products[0].quantity, 2);
  assert.equal(state.db.inventory[0].stock, 1);
  assert.equal(state.activePosOrder.value.cart.length, 0);
  assert.equal(state.posInvoiceModal.orderId, 88);
});

test('older stock events cannot overwrite a newer reservation response', () => {
  const state = store(() => {});
  state.applyPosStockUpdates([{ id: 11, stock: 0, version: 4 }]);
  state.applyPosStockUpdates([{ id: 11, stock: 2, version: 3 }]);
  assert.equal(state.posVariants.value[0].stock, 0);
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
