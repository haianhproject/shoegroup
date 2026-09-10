const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('esbuild');
const vue = require('vue');
const { parse } = require('@vue/compiler-sfc');

const root = path.resolve(__dirname, '..');
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
};
function load(relative, mocks = {}, globals = {}, expose = []) {
  const file = path.join(root, relative);
  let source = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.vue')) source = parse(source).descriptor.scriptSetup.content;
  if (expose.length) source += `\nexport { ${expose.join(', ')} };`;
  const code = transformSync(source, { format: 'cjs', target: 'node22' }).code;
  const module = { exports: {} };
  const sandbox = {
    module, exports: module.exports, console, URL, Headers, Request, FormData,
    setInterval: () => ({ unref() {} }), clearInterval() {},
    localStorage: storage(), sessionStorage: storage(),
    crypto: require('node:crypto').webcrypto,
    require: name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === 'vue') return { ...vue, onMounted() {}, onUnmounted() {} };
      throw new Error(`Unexpected dependency ${name} in ${relative}`);
    },
    ...globals,
  };
  vm.runInNewContext(code, sandbox, { filename: file });
  return { ...module.exports, globals: sandbox };
}
function loadCart(products, localStorage = storage()) {
  return load('src/stores/cartStore.js', {
    './authStore': { currentUser: vue.ref({ id_user: 1 }) },
    '../services/apiClient': { api: { get: async () => products } },
  }, { localStorage });
}
const product = (stock = 7, price = 500000, active = true) => ({ id: 1, price, active, variants: [{ id: 11, size: 'M', color: 'Black', stock, active: true }] });
const cartLine = (quantity = 1) => ({ id_product: 1, id_product_detail: '1_variant_11', variant_id: 11, product: { id_product: 1, product_name: 'Shoe' }, size: { size_name: 'M' }, color: { color_label: 'Black' }, unitPrice: 500000, quantity });

test('checkout retry retains its key through reload and rotates after success', () => {
  const sessionStorage=storage(), payload={items:[{productId:1,quantity:2}],addressId:1};
  const before=load('src/services/checkoutAttempt.js',{}, {sessionStorage});
  const first=before.getCheckoutAttempt(payload);
  const after=load('src/services/checkoutAttempt.js',{}, {sessionStorage});
  assert.equal(after.getCheckoutAttempt(payload).key,first.key);
  after.clearCheckoutAttempt();
  assert.notEqual(after.getCheckoutAttempt(payload).key,first.key);
});

test('dashboard revenue excludes unpaid/cancelled orders and deducts only completed refunds', () => {
  const {recognizedOrderRevenue}=load('src/services/revenue.js');
  const paid={id:1,status:'Đã nhận hàng',payment_status:'Đã thanh toán',is_counted_as_revenue:1,total:575000};
  const refunds=[{order_id:1,refund_amount:100000,refunded_at:'2026-09-09'}, {order_id:1,refund_amount:500000}, {order_id:2,refund_amount:500000,refunded_at:'2026-09-09'}];
  assert.equal(recognizedOrderRevenue(paid,refunds),475000);
  assert.equal(recognizedOrderRevenue({...paid,status:'Đã hủy'},refunds),0);
  assert.equal(recognizedOrderRevenue({...paid,payment_status:'Chờ thanh toán'},refunds),0);
  assert.equal(recognizedOrderRevenue({...paid,is_counted_as_revenue:0},refunds),0);
});

test('cart checks exact variant, preserves requested quantity, and flags stale stock', async () => {
  const cart = loadCart([product(7)]);
  cart.cartState.items.push(cartLine(10));
  const result = await cart.refreshCartAvailability();
  assert.equal(result.ok, true);
  assert.equal(result.insufficient.length, 1);
  assert.equal(cart.cartState.items[0].quantity, 10);
  assert.equal(cart.cartState.items[0].stockQuantity, 7);
});

test('cart refresh persists items and current sale price', async () => {
  const localStorage = storage();
  const cart = loadCart([{ ...product(7, 600000), sale_price: 550000 }], localStorage);
  cart.cartState.items.push(cartLine(1));
  await vue.nextTick();
  const result = await cart.refreshCartAvailability();
  assert.equal(result.ok, true);
  assert.equal(cart.cartState.items[0].unitPrice, 550000);
  assert.equal(result.priceChanged.length, 1);
  assert.equal(JSON.parse(localStorage.getItem('shoegroup_carts_v4')).user_1.length, 1);
});

test('cart rejects disabled, deleted, and missing exact variant', async () => {
  for (const products of [[], [product(7, 500000, false)], [{ ...product(), variants: [{ id: 12, size: 'L', color: 'Black', stock: 9 }] }]]) {
    const cart = loadCart(products);
    cart.cartState.items.push(cartLine());
    assert.equal((await cart.refreshCartAvailability()).outOfStock.length, 1);
  }
});

test('HTTP transport never retries a mutation automatically on network failure', async () => {
  let calls = 0;
  const win = { fetch: async () => { calls++; throw new TypeError('Response lost after commit'); } };
  const interceptor = load('src/services/httpInterceptor.js', { './apiClient': { API_BASE_URL: 'http://localhost:5000/api', getToken: () => 'token', clearToken() {} } }, { window: win });
  interceptor.installHttpInterceptor();
  await assert.rejects(win.fetch('http://localhost:5000/api/orders', { method: 'POST', body: '{}' }));
  assert.equal(calls, 1);
});

test('HTTP interceptor preserves Request method and body', async () => {
  let request;
  const win = { fetch: async (input, init) => { request = new Request(input, init); return { status: 200 }; } };
  const interceptor = load('src/services/httpInterceptor.js', { './apiClient': { API_BASE_URL: 'http://localhost:5000/api', getToken: () => 'token', clearToken() {} } }, { window: win });
  interceptor.installHttpInterceptor();
  await win.fetch(new Request('http://localhost:5000/api/orders', { method: 'POST', body: '{"quantity":1}' }));
  assert.equal(request.method, 'POST');
  assert.equal(await request.text(), '{"quantity":1}');
  assert.equal(request.headers.get('Authorization'), 'Bearer token');
});

test('order mappings use warehouse state and server item subtotal', () => {
  const orders = load('src/stores/orderStore.js', { './authStore': { getCurrentUser: () => ({ id_user: 1 }) }, '../services/apiClient': { API_BASE_URL: 'http://localhost:5000/api' } });
  assert.equal(orders.mapStatusToKey('RETURN_TO_WAREHOUSE'), 'WAREHOUSE_RETURN');
  assert.equal(orders.mapStatusToKey('returned to warehouse'), 'WAREHOUSE_RETURN');
  const mapped = orders.mapServerOrder({ id: 4, total: 570000, shippingFee: 30000, discount: 10000, products: [{ name: 'Shoe', price: 550000, quantity: 1 }] });
  assert.equal(mapped.subtotal, 550000);
});

test('customer cancellation does not claim an unverified payment was refunded', () => {
  const orders = load('src/stores/orderStore.js', { './authStore': { getCurrentUser: () => ({ id_user: 1 }) }, '../services/apiClient': { API_BASE_URL: 'http://localhost:5000/api' } });
  orders.orderState.orders.push({ id: 'SG1', status: 'PENDING', payment_status: 'Chờ thanh toán' });
  orders.cancelOrder('SG1', 'change of mind');
  assert.equal(orders.orderState.orders[0].payment_status, 'Đã hủy');
});

test('browser expiry never changes an authoritative server order', () => {
  const orders = load('src/stores/orderStore.js', { './authStore': { getCurrentUser: () => ({ id_user: 1 }) }, '../services/apiClient': { API_BASE_URL: 'http://localhost:5000/api' } });
  orders.orderState.orders.push({ id: 'SG1', serverId: 1, status: 'PENDING', autoCancelDeadline: Date.now() - 1 });
  orders.runAutoCancel();
  assert.equal(orders.orderState.orders[0].status, 'PENDING');
});

test('checkout blocks double click before stock preflight resolves', async () => {
  let resolveStock, stockCalls = 0;
  const stock = new Promise(resolve => { resolveStock = resolve; });
  const checkout = load('src/views/CheckoutView.vue', {
    'vue-router': { useRouter: () => ({ push() {}, replace() {} }) },
    '../stores/cartStore': { cartItems: vue.ref([]), cartCount: vue.ref(0), cartSubtotal: vue.ref(0), formatCurrency: String, clearCart() {}, refreshCartAvailability: () => { stockCalls++; return stock; }, cartHasUnavailableItems: vue.ref(false) },
    '../stores/orderStore': {}, '../stores/authStore': { currentUser: vue.ref({ id_user: 1 }) },
    '../stores/uiStore': { notify() {} }, '../services/apiClient': { api: { get: async () => [] } },
    '../services/addressService': { addressBookApi: {}, formatAddress: () => '', vietnamAddressApi: {} },
    '../services/shippingService': { shippingApi: {} },
    '../services/checkoutAttempt': { getCheckoutAttempt: () => ({ key: 'key' }), clearCheckoutAttempt() {} },
  }, {}, ['placeOrder', 'placing']);
  const first = checkout.placeOrder();
  const second = checkout.placeOrder();
  resolveStock({ ok: false });
  await Promise.all([first, second]);
  assert.equal(stockCalls, 1);
  assert.equal(checkout.placing.value, false);
});

function loadAdminImages() {
  return load('src/views/admin/adminStore.js', {
    '@/services/checkoutAttempt': {},
    '@/services/revenue': { recognizedOrderRevenue: () => 0 },
    '@/stores/authStore': { currentUser: vue.ref(null), logout() {} },
    '../../services/apiClient': { API_BASE_URL: 'http://localhost:5000/api', getToken: () => null },
    '@/stores/orderStore': { normalizeStatusText: value => String(value || '') },
  }, {
    setTimeout() {},
    FileReader: class {
      readAsDataURL(file) { this.result = file.data; this.onload(); }
    },
  });
}

const imageProduct = () => ({
  id: 1, name: 'Giày thử ảnh', image_url: 'cover-original.png',
  colors: [{ name: 'Đen', image: 'black-original.png' }, { name: 'Trắng', image: 'white-original.png' }],
  variants: [{ id: 11, color: 'Đen', size: '40', stock: 5 }, { id: 12, color: 'Trắng', size: '40', stock: 5 }],
});

test('first variant image updates cover, while cover edits and other variants stay independent', () => {
  const admin = loadAdminImages();
  const saved = imageProduct();
  admin.openProductForm(saved);
  assert.equal(admin.productForm.image_url, 'cover-original.png');
  admin.setColorImage(0, 'black-new.png');
  assert.equal(admin.productForm.image_url, 'black-new.png');
  admin.productForm.image_url = 'cover-custom.png';
  assert.equal(admin.productForm.colors[0].image, 'black-new.png');
  admin.setColorImage(1, 'white-new.png');
  assert.equal(admin.productForm.image_url, 'cover-custom.png');
  admin.openProductForm(JSON.parse(JSON.stringify(admin.productForm)));
  assert.equal(admin.productForm.image_url, 'cover-custom.png');
  assert.equal(admin.productForm.colors[0].image, 'black-new.png');
  assert.equal(saved.colors[0].image, 'black-original.png');
});

test('device uploads obey the same one-way image rule', async () => {
  const admin = loadAdminImages();
  admin.openProductForm(imageProduct());
  const upload = data => ({ target: { files: [{ type: 'image/png', size: 100, data }] } });
  await admin.onColorImageFile(upload('data:image/png;base64,variant'), 0);
  assert.equal(admin.productForm.image_url, 'data:image/png;base64,variant');
  await admin.onProductImageFile(upload('data:image/png;base64,cover'));
  assert.equal(admin.productForm.image_url, 'data:image/png;base64,cover');
  assert.equal(admin.productForm.colors[0].image, 'data:image/png;base64,variant');
});

test('adding the first color with an image supplies a cover, later colors do not overwrite it', () => {
  const admin = loadAdminImages();
  admin.db.colors = [{ id: 1, name: 'Đen' }, { id: 2, name: 'Trắng' }];
  admin.openProductForm();
  admin.colorDraft.value = 1;
  admin.colorImageDraft.value = 'first.png';
  admin.addColor();
  assert.equal(admin.productForm.image_url, 'first.png');
  admin.colorDraft.value = 2;
  admin.colorImageDraft.value = 'second.png';
  admin.addColor();
  assert.equal(admin.productForm.image_url, 'first.png');
});
