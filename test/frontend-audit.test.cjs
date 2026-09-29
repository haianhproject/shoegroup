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

test('cart refresh persists items and current color-variant sale price', async () => {
  const localStorage = storage();
  const discounted = product(7, 600000);
  discounted.variants[0].price = 600000;
  discounted.variants[0].sale_price = 550000;
  const cart = loadCart([discounted], localStorage);
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

test('adding to cart is local-only while quantity remains capped by current stock', async () => {
  const cart = loadCart([product(3)]);
  const payload = {
    product: { id_product: 1, product_name: 'Shoe', price: 500000 },
    variantId: 11,
    size: { size_name: 'M' },
    color: { color_label: 'Black' },
    stockQuantity: 3,
  };
  assert.equal((await cart.addToCart({ ...payload, quantity: 2 })).ok, true);
  assert.equal(cart.cartState.items[0].quantity, 2);
  assert.equal(cart.cartState.items[0].stockReserved, false);
  assert.equal((await cart.addToCart({ ...payload, quantity: 2 })).ok, false);
  assert.equal(cart.cartState.items[0].quantity, 2);
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
  assert.equal(orders.mapStatusToKey('Đang vận chuyển'), 'SHIPPING');
  assert.equal(orders.mapStatusToKey('Đã hủy'), 'CANCELLED');
  assert.equal(orders.mapStatusToKey('RETURN_TO_WAREHOUSE'), 'WAREHOUSE_RETURN');
  assert.equal(orders.mapStatusToKey('returned to warehouse'), 'WAREHOUSE_RETURN');
  const mapped = orders.mapServerOrder({ id: 4, total: 570000, shippingFee: 30000, discount: 10000, products: [{ name: 'Shoe', price: 550000, quantity: 1 }] });
  assert.equal(mapped.subtotal, 550000);
});

test('customer sees three distinct delivery failure outcomes', () => {
  const orders = load('src/stores/orderStore.js', { './authStore': { getCurrentUser: () => ({ id_user: 1 }) }, '../services/apiClient': { API_BASE_URL: 'http://localhost:5000/api' } });
  const unreachable = { status: 'WAREHOUSE_RETURN', stockIssueStatus: 'RETURNED_TO_WAREHOUSE' };
  const accident = { status: 'WAREHOUSE_RETURN', stockIssueStatus: 'DELIVERY_ACCIDENT' };
  const lost = { status: 'CANCELLED', stockIssueStatus: 'LOST_IN_TRANSIT' };

  assert.equal(orders.getDeliveryIssueType(unreachable), 'UNREACHABLE');
  assert.equal(orders.getDeliveryIssueType(accident), 'ACCIDENT');
  assert.equal(orders.getDeliveryIssueType(lost), 'LOST');
  assert.equal(orders.getCustomerOrderStatusLabel(unreachable), 'Chưa liên hệ được');
  assert.equal(orders.getCustomerOrderStatusLabel(accident), 'Sự cố vận chuyển');
  assert.equal(orders.getCustomerOrderStatusLabel(lost), 'Hàng bị thất lạc');
});

test('local order keeps the image of the purchased color variant', () => {
  const orders = load('src/stores/orderStore.js', { './authStore': { getCurrentUser: () => ({ id_user: 1 }) }, '../services/apiClient': { API_BASE_URL: 'http://localhost:5000/api' } });
  const result = orders.createOrder({
    customer: { fullName: 'Test', phone: '0901234567', email: 'test@example.com', country: 'Việt Nam', address: 'A', province: 'B' },
    items: [{
      id_product_detail: '1_variant_11',
      variant_id: 11,
      product: { id_product: 1, product_name: 'Shoe', image_url: 'cover-black.png' },
      color: { color_label: 'Xanh lá', image: 'variant-green.png' },
      size: { size_name: '39' },
      quantity: 1,
      unitPrice: 100000,
    }],
    subtotal: 100000,
    shippingFee: 0,
    discount: 0,
    total: 100000,
    shippingMethod: {},
    paymentMethod: {},
  });
  assert.equal(result.ok, true);
  assert.equal(result.order.items[0].image_url, 'variant-green.png');
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

test('server re-delivery replaces a stale local cancellation and removes its duplicate', () => {
  const orders = load('src/stores/orderStore.js', { './authStore': { getCurrentUser: () => ({ id_user: 4 }) }, '../services/apiClient': { API_BASE_URL: 'http://localhost:5000/api' } });
  const createdAt = new Date('2026-09-19T22:09:00').getTime();
  const serverOrder = {
    id: 119,
    user_id: 4,
    created_at: '2026-09-19T22:09:00',
    status: 'Đang vận chuyển',
    total: 475000,
    customer_phone: '0901234567',
    products: [
      { product_id: 10, name: 'Giày A', size: '40', color: 'Đen', quantity: 1, price: 200000 },
      { product_id: 11, name: 'Giày B', size: '39', color: 'Trắng', quantity: 1, price: 200000 },
    ],
    history: [
      { status: 'Giao hàng thất bại' },
      { status: 'Về kho' },
      { status: 'Đang vận chuyển' },
    ],
  };
  orders.orderState.orders.push({
    id: 'SG597916',
    userId: 4,
    createdAt,
    status: 'CANCELLED',
    cancelReason: 'Đơn bị hủy.',
    total: 475000,
    customer: { phone: '0901234567' },
    items: [
      { id_product: 10, size: { size_name: '40' }, color: { color_label: 'Đen' }, quantity: 1 },
      { id_product: 11, size: { size_name: '39' }, color: { color_label: 'Trắng' }, quantity: 1 },
    ],
  });
  orders.orderState.orders.push(orders.mapServerOrder(serverOrder));

  assert.equal(orders.reconcileOrdersFromServer([serverOrder]), true);
  assert.equal(orders.orderState.orders.length, 1);
  assert.equal(orders.orderState.orders[0].id, 'SG597916');
  assert.equal(orders.orderState.orders[0].serverId, 119);
  assert.equal(orders.orderState.orders[0].status, 'SHIPPING');
  assert.equal(orders.getOrderDisplayStatus(orders.orderState.orders[0]), 'SHIPPING');
  assert.equal(orders.orderState.orders[0].cancelReason, '');
});

test('bank transfer is completed at checkout and is not deferred from the orders page', () => {
  const checkout = fs.readFileSync(path.join(root, 'src/views/CheckoutView.vue'), 'utf8');
  const orders = fs.readFileSync(path.join(root, 'src/views/MyOrders.vue'), 'utf8');
  assert.match(checkout, /TÔI ĐÃ THANH TOÁN/);
  assert.doesNotMatch(checkout, /Thanh toán sau|24 giờ|24h/i);
  assert.match(orders, /Thanh toán thành công\. Cửa hàng đang xử lý đơn/);
  assert.doesNotMatch(orders, /isWaitingTransfer|Thanh toán ngay|Payment QR Modal/);
});

test('delivered orders use a green thin-icon treatment and expanded details scroll into view', () => {
  const orders = fs.readFileSync(path.join(root, 'src/views/MyOrders.vue'), 'utf8');
  assert.match(orders, /DELIVERED:\s*\{\s*color:\s*'green',\s*icon:\s*'delivered'/);
  assert.match(orders, /\.stat-badge\.green\s*\{[^}]*#f0fdf4[^}]*#15803d/);
  assert.doesNotMatch(orders, /\.stat-badge\.green\s*\{[^}]*#D4001A/);
  assert.match(orders, /<OrderStatusIcon[^>]*:name="statusMeta\[o\.status\]\?\.icon"/);
  assert.match(orders, /@after-enter="scrollExpandedIntoView"/);
  assert.match(orders, /scrollIntoView\(\{\s*behavior:\s*'smooth',\s*block:\s*'start'\s*\}\)/);
});

test('checkout uses the project monochrome palette and has no redundant cart shortcut', () => {
  const checkout = fs.readFileSync(path.join(root, 'src/views/CheckoutView.vue'), 'utf8');
  assert.doesNotMatch(checkout, /#16a34a|#15803d|#f0fdf4|(?:text|bg|border)-emerald/i);
  assert.doesNotMatch(checkout, /to="\/cart"/);
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
    '@/services/vietQr': {},
    '@/services/posCustomer': { validatePosCustomer: () => ({ ok: true, name: '', phone: '', message: '' }) },
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

function loadAdminRealtime(globals = {}, getToken = () => 'admin-token') {
  return load('src/views/admin/adminStore.js', {
    '@/services/checkoutAttempt': {},
    '@/services/revenue': { recognizedOrderRevenue: () => 0 },
    '@/services/vietQr': {},
    '@/services/posCustomer': { validatePosCustomer: () => ({ ok: true, name: '', phone: '', message: '' }) },
    '@/stores/authStore': { currentUser: vue.ref(null), logout() {} },
    '../../services/apiClient': { API_BASE_URL: 'http://localhost:5000/api', getToken },
    '@/stores/orderStore': { normalizeStatusText: value => String(value || '') },
  }, {
    setTimeout,
    clearTimeout,
    AbortController,
    TextDecoder,
    ...globals,
  });
}

test('lost delivery cancels permanently while the other failures can be reshipped', () => {
  const admin = loadAdminImages();
  const options = admin.getDeliveryFailureOptions();
  const unreachable = options.find(option => option.key === 'return_warehouse');
  const accident = options.find(option => option.key === 'delivery_accident');
  const lost = options.find(option => option.key === 'lost_delivery_cancel');

  assert.equal(unreachable.next, 'Về kho');
  assert.equal(accident.next, 'Về kho');
  assert.equal(lost.next, 'Đã hủy');
  assert.equal(lost.issueStatus, 'LOST_IN_TRANSIT');
  assert.equal(admin.getOrderActions({ status: 'Về kho', payment_method: 'COD' })[0].key, 'reship');
  assert.equal(admin.getOrderActions({
    status: 'Giao hàng thất bại',
    payment_method: 'COD',
    stock_issue_reason: 'Mất hàng khi vận chuyển',
  }).length, 0);
});

test('printed invoice uses ShoeGroup data, accurate totals, and no decorative tracking QR', () => {
  const admin = loadAdminImages();
  const mapped = admin.mapOrder({
    id: 9,
    total: 3075000,
    shippingFee: 75000,
    discount: 0,
    products: [],
  });
  assert.equal(mapped.shipping_fee, 75000);
  assert.equal(mapped.discount, 0);

  const source = fs.readFileSync(path.join(root, 'src/views/admin/adminStore.js'), 'utf8');
  const invoiceSource = source.slice(source.indexOf('export const SHOP_INFO'), source.indexOf('/* ---------------- RETURNS'));
  assert.match(invoiceSource, /name:\s*"SHOEGROUP"/);
  assert.doesNotMatch(invoiceSource, /DVTD BASEBALL CAP SHOP|benmnhat@gmail\.com|160 Cao Lỗ|api\.qrserver\.com|alt='QR'/);
  assert.doesNotMatch(invoiceSource, /<th class='c'>Trạng thái<\/th>/);
});

test('admin background merge updates order address in place for an open detail view', () => {
  const admin = loadAdminRealtime();
  const oldOrder = {
    id: 7,
    customer_address: 'Địa chỉ cũ',
    address_id: 11,
    customer_name: 'Tên cũ',
    customer_phone: '0901000000',
    address_changed: false,
    products: [],
    _history: [],
    isExpanded: true,
  };
  const freshOrder = {
    ...oldOrder,
    customer_address: 'Địa chỉ mới',
    address_id: 22,
    customer_name: 'Tên mới',
    customer_phone: '0902000000',
    address_changed: true,
    _history: [{ status: 'Chờ xác nhận', note: '[ADDRESS_CHANGED]' }],
    isExpanded: false,
  };

  const merged = admin.mergeOrders([oldOrder], [freshOrder]);
  assert.equal(merged[0], oldOrder);
  assert.equal(merged[0].customer_address, 'Địa chỉ mới');
  assert.equal(merged[0].address_id, 22);
  assert.equal(merged[0].customer_name, 'Tên mới');
  assert.equal(merged[0].customer_phone, '0902000000');
  assert.equal(merged[0].address_changed, true);
  assert.equal(merged[0].isExpanded, true);
});

test('refreshOrders fetches only orders and keeps the open detail reference live', async () => {
  const requests = [];
  const fetch = async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      status: 200,
      headers: { get: name => name.toLowerCase() === 'content-type' ? 'application/json' : '' },
      json: async () => [{
        id: 7,
        created_at: '2026-09-29T09:00:00',
        status: 'Chờ xác nhận',
        total: 500000,
        customer_name: 'Tên mới',
        customer_phone: '0902000000',
        customer_address: 'Địa chỉ mới',
        address_id: 22,
        address_changed: true,
        products: [],
        history: [{ status: 'Chờ xác nhận', note: '[ADDRESS_CHANGED]' }],
      }],
    };
  };
  const admin = loadAdminRealtime({ fetch });
  admin.db.orders = [admin.mapOrder({
    id: 7,
    created_at: '2026-09-29T09:00:00',
    status: 'Chờ xác nhận',
    total: 500000,
    customer_name: 'Tên cũ',
    customer_phone: '0901000000',
    customer_address: 'Địa chỉ cũ',
    address_id: 11,
    address_changed: false,
    products: [],
    history: [],
  })];
  const detailReference = admin.db.orders[0];
  admin.openOrderDetail(detailReference);

  await admin.refreshOrders();

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'http://localhost:5000/api/orders');
  assert.equal(requests[0].options.cache, 'no-store');
  assert.equal(admin.db.orders[0], detailReference);
  assert.equal(admin.orderDetail.order, detailReference);
  assert.equal(detailReference.customer_address, 'Địa chỉ mới');
  assert.equal(detailReference.address_id, 22);
  assert.equal(detailReference.customer_name, 'Tên mới');
  assert.equal(detailReference.customer_phone, '0902000000');
});

test('admin SSE subscription sends bearer auth, parses order.updated, and aborts cleanly', async () => {
  const bytes = new TextEncoder().encode(
    ': keepalive\r\nevent: connected\r\ndata: {}\r\n\r\n' +
    'event: order.updated\r\ndata: {"orderId":7,"reason":"address_changed"}\r\n\r\n',
  );
  let readCount = 0;
  let request = null;
  const never = new Promise(() => {});
  const fetchStream = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: () => readCount++ === 0 ? Promise.resolve({ done: false, value: bytes }) : never,
        }),
      },
    };
  };
  const admin = loadAdminRealtime();
  let resolveOrderEvent;
  const orderEvent = new Promise(resolve => { resolveOrderEvent = resolve; });
  const unsubscribe = admin.subscribeAdminEvents((event) => {
    if (event.type === 'order.updated') resolveOrderEvent(event);
  }, { fetch: fetchStream });

  const event = await orderEvent;
  assert.equal(request.url, 'http://localhost:5000/api/admin/events');
  assert.equal(request.options.headers.Authorization, 'Bearer admin-token');
  assert.equal(request.options.headers.Accept, 'text/event-stream');
  assert.equal(request.options.cache, 'no-store');
  assert.equal(event.data.orderId, 7);
  assert.equal(event.data.reason, 'address_changed');
  unsubscribe();
  assert.equal(request.options.signal.aborted, true);
});

test('admin layout subscribes to order events while retaining polling cleanup', () => {
  const layout = fs.readFileSync(path.join(root, 'src/views/admin/AdminLayout.vue'), 'utf8');
  assert.match(layout, /subscribeAdminEvents\(onAdminEvent\)/);
  assert.match(layout, /event\?\.type !== "order\.updated"/);
  assert.match(layout, /async function refresh\(\)[\s\S]*?await fetchAllData\(true\)/);
  assert.match(layout, /async function syncOrdersFromEvent\(\)[\s\S]*?await refreshOrders\(\)/);
  assert.match(layout, /function onAdminEvent\(event\)[\s\S]*?syncOrdersFromEvent\(\)/);
  assert.match(layout, /const POLL_INTERVAL = 30_000/);
  assert.match(layout, /setInterval\(refresh, POLL_INTERVAL\)/);
  assert.match(layout, /unsubscribeAdminEvents\?\.\(\)/);
});

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

test('fixed customer navbar has a matching content offset and one global chat widget', () => {
  const app = fs.readFileSync(path.join(root, 'src/App.vue'), 'utf8');
  const navbar = fs.readFileSync(path.join(root, 'src/components/figma/layout/FigmaNavbar.vue'), 'utf8');
  const home = fs.readFileSync(path.join(root, 'src/views/HomeDisplay.vue'), 'utf8');
  assert.match(navbar, /<header[^>]+\bfixed\b[^>]+\btop-0\b/);
  assert.match(app, /<main[^>]+pt-\[69px\][^>]*>/);
  assert.equal((app.match(/<ZaloChat\s*\/>/g) || []).length, 1);
  assert.equal((home.match(/<ZaloChat\s*\/>/g) || []).length, 0);
});

test('product detail uses the archived Figma layout without Bootstrap utilities', () => {
  const detail = fs.readFileSync(path.join(root, 'src/views/ProductDetail.vue'), 'utf8');
  assert.match(detail, /lg:grid-cols-2/);
  assert.match(detail, /Sản phẩm liên quan/);
  assert.match(detail, /Chọn size \(UK\)/);
  assert.doesNotMatch(detail, /\b(container-fluid|spinner-border|d-flex|flex-column|col-lg-\d+|row g-\d+|w-100|text-danger|text-muted|bi bi-)\b/);
});

test('login password visibility uses an accessible inline eye icon', () => {
  const login = fs.readFileSync(path.join(root, 'src/views/LoginView.vue'), 'utf8');
  assert.match(login, /<button\s+[\s\S]*?type="button"[\s\S]*?class="eye"/);
  assert.match(login, /:aria-label="showPwd \? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"/);
  assert.match(login, /:aria-pressed="showPwd"/);
  assert.match(login, /:title="showPwd \? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"/);
  assert.match(login, /<svg\s+v-if="!showPwd"[^>]+class="eye-icon"/);
  assert.match(login, /<svg\s+v-else[^>]+class="eye-icon"/);
  assert.doesNotMatch(login, /icon-eye(?:-slash)?/);
});

test('registration password visibility uses an accessible inline eye icon', () => {
  const register = fs.readFileSync(path.join(root, 'src/views/RegisterView.vue'), 'utf8');
  assert.match(register, /<button\s+[\s\S]*?type="button"[\s\S]*?class="eye"/);
  assert.match(register, /:aria-label="showPwd \? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"/);
  assert.match(register, /:aria-pressed="showPwd"/);
  assert.match(register, /<svg\s+v-if="!showPwd"[^>]+class="eye-icon"/);
  assert.match(register, /<svg\s+v-else[^>]+class="eye-icon"/);
  assert.doesNotMatch(register, /icon-eye(?:-slash)?/);
});

test('reset-password interface uses consistent inline SVG icons', () => {
  const reset = fs.readFileSync(path.join(root, 'src/views/ResetPasswordView.vue'), 'utf8');
  assert.match(reset, /class="fp-ic"[\s\S]*?<svg[^>]+class="auth-icon auth-icon-lg"/);
  assert.match(reset, /<svg\s+v-if="!showPwd"[^>]+class="auth-icon eye-icon"/);
  assert.match(reset, /<svg\s+v-else[^>]+class="auth-icon eye-icon"/);
  assert.match(reset, /:aria-label="showPwd \? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"/);
  assert.match(reset, /class="fp-back"[\s\S]*?<svg[^>]+class="auth-icon back-icon"/);
  assert.doesNotMatch(reset, /<i\s+class="icon/);
});

test('account lock controls preserve an active administrator', () => {
  const accountDb = vue.reactive({ accounts: [] });
  const signedIn = vue.ref({ id_user: 1, role_id: 1 });
  const accounts = load('src/views/admin/pages/AccountsPage.vue', {
    '../adminStore': {
      db: accountDb,
      openForm() {},
      getRoleBadgeClass() { return ''; },
      roleName() { return ''; },
      toggleAccountLock() {},
      apiWrite: async () => ({ ok: true }),
    },
    '../../../stores/authStore': { currentUser: signedIn },
  }, {}, ['activeAdminCount', 'canToggleAccountLock']);

  const primaryAdmin = { id: 1, role_id: 1, active: true };
  const otherAdmin = { id: 2, role_id: 1, active: true };
  const customer = { id: 3, role_id: 2, active: true };

  accountDb.accounts = [primaryAdmin, customer];
  assert.equal(accounts.activeAdminCount.value, 1);
  assert.equal(accounts.canToggleAccountLock(primaryAdmin), false);
  assert.equal(accounts.canToggleAccountLock(customer), true);

  accountDb.accounts = [primaryAdmin, otherAdmin, customer];
  assert.equal(accounts.activeAdminCount.value, 2);
  assert.equal(accounts.canToggleAccountLock(primaryAdmin), false);
  assert.equal(accounts.canToggleAccountLock(otherAdmin), true);

  const lockedAdmin = { ...otherAdmin, active: false };
  accountDb.accounts = [primaryAdmin, lockedAdmin, customer];
  assert.equal(accounts.activeAdminCount.value, 1);
  assert.equal(accounts.canToggleAccountLock(lockedAdmin), true);

  const source = fs.readFileSync(path.join(root, 'src/views/admin/pages/AccountsPage.vue'), 'utf8');
  assert.match(source, /v-if="canToggleAccountLock\(a\)"/);
});

test('POS walk-in customers never become synthetic login accounts', () => {
  const server = fs.readFileSync(path.join(root, 'backend/server.js'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'src/views/admin/adminStore.js'), 'utf8');
  assert.doesNotMatch(server, /@walkin\.local/);
  assert.match(server, /UserID:\s*null[\s\S]*is_walkin:\s*true/);
  assert.match(admin, /o\.customer_id = c\.is_walkin/);
  assert.match(admin, /is_walkin:\s*Boolean\(c\.IsWalkIn \?\? c\.is_walkin\)/);
});

test('home hero serializes rapid navigation and resets clones without animation', () => {
  const home = fs.readFileSync(path.join(root, 'src/views/HomeDisplay.vue'), 'utf8');
  assert.match(home, /const isHeroAnimating = ref\(false\)/);
  assert.match(home, /const queuedHeroSteps = ref\(0\)/);
  assert.match(home, /if \(isHeroAnimating\.value \|\| !isTransitioning\.value\)/);
  assert.match(home, /isTransitioning\.value = false[\s\S]*currentIndex\.value \+=/);
  assert.match(home, /slide\.type === 'video' && i === currentIndex/);
  assert.doesNotMatch(home, /currentIndex\.value\+\+|currentIndex\.value--/);
});
