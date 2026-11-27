// Mục đích: Kiểm thử luồng frontend, quyền truy cập, giá tiền, đơn hàng và tương thích API.
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

test('inspection rejects fractional, negative, empty and over-received quantities', () => {
  const { validateInspection } = load('src/services/afterSales.js', { './apiClient': { api: {} } });
  const line = { expected_quantity: 3, good_quantity: 1, damaged_quantity: 1 };
  assert.equal(validateInspection([line]), true);
  assert.equal(validateInspection([line], true), false);
  assert.equal(validateInspection([{ ...line, good_quantity: 2 }], true), true);
  for (const change of [{ good_quantity: 1.5 }, { damaged_quantity: -1 }, { good_quantity: 3 }, { good_quantity: 0, damaged_quantity: 0 }]) assert.equal(validateInspection([{ ...line, ...change }]), false);
});

test('return submission blocks a double click and retains a failed customer draft', async () => {
  const dto = { items: [{ order_detail_id: 1, quantity: 3, remaining_quantity: 3 }], returns: [], refunds: [], can_request: true };
  let finish, fail = false, calls = 0;
  const helpers = load('src/services/afterSales.js', { './apiClient': { api: {} } });
  const page = load('src/components/AfterSalesPanel.vue', {
    'lucide-vue-next': {}, '../services/afterSales': { ...helpers, afterSalesApi: { detail: async () => dto, request: () => { calls++; return fail ? Promise.reject(new Error('Đơn đang được xử lý ở phiên khác')) : new Promise(resolve => finish = resolve); } } },
  }, { defineProps: () => ({ orderId: 7, admin: false }), defineEmits: () => () => {} }, ['data', 'request', 'submitRequest', 'busy', 'error', 'close']);
  page.data.value = dto; page.request.reason = 'Cần đổi kích cỡ'; page.request.quantities[1] = 1; page.request.key = 'test-request';
  const pending = page.submitRequest(); await page.submitRequest(); page.close();
  assert.equal(calls, 1); assert.equal(page.busy.value, true); assert.equal(page.request.reason, 'Cần đổi kích cỡ');
  finish({ success: true }); await pending;
  assert.equal(page.busy.value, false); assert.equal(page.request.reason, '');
  fail = true; page.request.reason = 'Giữ lại nội dung này'; page.request.quantities[1] = 1; await page.submitRequest();
  assert.equal(page.busy.value, false); assert.equal(page.request.reason, 'Giữ lại nội dung này'); assert.match(page.error.value, /phiên khác/);
});

test('chat clears account-specific responses when identity changes during a request', async () => {
  const user = vue.ref({ id_user: 1 }); let finish;
  const page = load('src/components/ChatWidget.vue', {
    'lucide-vue-next': {}, '../services/apiClient': { API_BASE_URL: '/api', api: { post: () => new Promise(resolve => finish = resolve) } }, '../stores/authStore': { currentUser: user },
  }, {}, ['messages', 'send', 'pending']);
  const pending = page.send('Tra đơn hàng'); await new Promise(resolve => setImmediate(resolve));
  user.value = { id_user: 2 }; await vue.nextTick();
  finish({ intent: 'ORDERS', message: 'Private order from user 1', orders: [{ code: 'PRIVATE' }], addresses: [{ label: 'PRIVATE ADDRESS' }], quick_replies: [] }); await pending;
  assert.equal(page.messages.value.length, 1); assert.doesNotMatch(JSON.stringify(page.messages.value), /PRIVATE|Private order/); assert.equal(page.pending.value, false);
});

test('chat retry reuses its message and keeps one active send', async () => {
  let fail = true, calls = 0;
  const page = load('src/components/ChatWidget.vue', {
    'lucide-vue-next': {}, '../services/apiClient': { API_BASE_URL: '/api', api: { post: async () => { calls++; if (fail) throw new Error('offline'); return { intent: 'WELCOME', message: 'Đã kết nối', quick_replies: [], context: {} }; } } }, '../stores/authStore': { currentUser: vue.ref(null) },
  }, {}, ['messages', 'send', 'pending']);
  await page.send('Xin chào'); const entry = page.messages.value.find(m => m.role === 'user'); assert.equal(entry.failed, true);
  fail = false; await page.send(entry.message, entry);
  assert.equal(calls, 2); assert.equal(page.messages.value.filter(m => m.role === 'user').length, 1); assert.equal(entry.failed, false); assert.equal(page.pending.value, false);
});
test('chat carries a shipping followup context and resets it when returning to product search', async () => {
  const requests=[];
  const page=load('src/components/ChatWidget.vue', {
    'lucide-vue-next':{}, '../services/apiClient':{API_BASE_URL:'/api',api:{post:async(_,body)=>{requests.push(body);return body.message==='Phí giao hàng'?{intent:'SHIPPING',message:'Nhận ở đâu?',context:{shipping_requested:true,size:'40'}}:body.message==='Hà Nội'?{intent:'SHIPPING_QUOTE',message:'Đã báo phí',context:{shipping_requested:true,size:'40'},shipping_quote:{fee:30000}}:{intent:'PRODUCTS',message:'Giày',context:{size:'41'}};}}}, '../stores/authStore':{currentUser:vue.ref(null)},
  },{},['send','context']);
  await page.send('Phí giao hàng');await page.send('Hà Nội');assert.equal(requests[1].context.shipping_requested,true);
  await page.send('size 41');assert.equal(page.context.value.size,'41');assert.equal(page.context.value.shipping_requested,undefined);
});

test('chat retries a saved address quote with its original address id', async () => {
  let fail=true;const requests=[];
  const page=load('src/components/ChatWidget.vue', {
    'lucide-vue-next':{}, '../services/apiClient':{API_BASE_URL:'/api',api:{post:async(_,body)=>{requests.push(body);if(fail)throw new Error('offline');return {intent:'SHIPPING_QUOTE',message:'Đã báo phí',context:{shipping_requested:true}};}}}, '../stores/authStore':{currentUser:vue.ref({id_user:7})},
  },{},['quoteAddress','send','messages']);
  await page.quoteAddress({id:12,label:'Địa chỉ riêng'});const entry=page.messages.value.find(m=>m.role==='user');assert.equal(entry.failed,true);
  fail=false;await page.send(entry.message,entry);assert.deepEqual(requests.map(r=>r.shipping_address_id),[12,12]);assert.equal(page.messages.value.filter(m=>m.role==='user').length,1);
});

function load(relative, mocks = {}, globals = {}, expose = []) {
  const file = path.join(root, relative);
  let source = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.vue')) source = parse(source).descriptor.scriptSetup.content;
  if (expose.length) source += `\nexport { ${expose.join(', ')} };`;
  const code = transformSync(source, { format: 'cjs', target: 'node22' }).code;
  const module = { exports: {} };
  const sandbox = {
    module, exports: module.exports, console, URL, URLSearchParams, Headers, Request, FormData,
    setInterval: () => ({ unref() {} }), clearInterval() {},
    AbortController, setTimeout, clearTimeout,
    localStorage: storage(), sessionStorage: storage(),
    crypto: require('node:crypto').webcrypto,
    defineExpose() {},
    require: name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === '@/services/orderCode' || name === '../services/orderCode') return load('src/services/orderCode.js');
      if (name === '@/services/orderQueue') return load('src/services/orderQueue.js');
      if (name === '../services/vietQr') return load('src/services/vietQr.js');
      if (name === '../directives/dialogFocus') return load('src/directives/dialogFocus.js');
      if (name === 'vue') return { ...vue, onMounted() {}, onUnmounted() {}, onBeforeUnmount() {} };
      if (name.endsWith('.vue') && fs.existsSync(path.resolve(path.dirname(file), name))) return {};
      if (name === '../../../stores/authStore') return { isEmployee: vue.ref(false) };
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

test('cart suggestions exclude inactive products before limiting the results', async () => {
  const products = [
    { id: 1, active: false }, { id: 2, active: 0 }, { id: 3, active: '0' },
    { id: 4, IsActive: false }, { id: 5, active: true, name: 'Available' },
    { id: 6, active: 1 }, { id: 7 }, { id: 8, active: true },
  ];
  const drawer = load('src/components/CartDrawer.vue', {
    './StoreIllustration.vue': {},
    '../directives/dialogFocus': {},
    'vue-router': { useRoute: () => ({ fullPath: '/' }), useRouter: () => ({ push() {} }) },
    '../stores/cartStore': { cartState: vue.reactive({ isDrawerOpen: false }) },
    '../stores/uiStore': { notify() {} },
    '../stores/authStore': { isAuthenticated: vue.ref(false) },
    '../services/apiClient': { api: { get: async () => products } },
  }, {}, ['suggestions', 'fetchSuggestions']);
  await drawer.fetchSuggestions();
  assert.deepEqual(Array.from(drawer.suggestions.value, row => row.id), [5, 6, 7]);
});

test('customer and admin show the same order code while local IDs remain usable', () => {
  const orders = load('src/stores/orderStore.js', {
    './authStore': { getCurrentUser: () => ({ id_user: 1 }) },
    '../services/apiClient': { API_BASE_URL: '/api' },
  });
  const admin = loadAdminImages();
  const original = { id: 'SG-LOCAL', serverId: null, createdAt: new Date('2026-11-17T23:59:59').getTime() };
  orders.orderState.orders = [original];
  assert.equal(orders.getCustomerOrderCode(original), 'SG-LOCAL');
  orders.setServerId(original.id, 1, '2026-11-18T00:00:01');
  const expected = admin.getTrackingCode({ id: 1, date: '2026-11-18T00:00:01' });
  assert.equal(expected, 'SGVN26111800001K0');
  assert.equal(orders.getCustomerOrderCode(original), expected);
  assert.equal(original.id, 'SG-LOCAL');
  assert.equal(orders.getCustomerOrderCode(orders.mapServerOrder({ id: 1, created_at: '2026-11-18T00:00:01' })), expected);
  orders.reconcileOrdersFromServer([{ id: 1, created_at: '2026-11-19T00:00:01', status: 'Chờ xác nhận' }]);
  assert.equal(orders.getCustomerOrderCode(original), admin.getTrackingCode({ id: 1, date: '2026-11-19T00:00:01' }));
  assert.equal(orders.getCustomerOrderCode({ ...original, tracking_code: 'CARRIER-EXISTING' }), 'CARRIER-EXISTING');
});

test('checkout retry retains its key through reload and rotates after success', () => {
  const sessionStorage=storage(), payload={items:[{productId:1,quantity:2}],addressId:1};
  const before=load('src/services/checkoutAttempt.js',{}, {sessionStorage});
  const first=before.getCheckoutAttempt(payload);
  const after=load('src/services/checkoutAttempt.js',{}, {sessionStorage});
  assert.equal(after.getCheckoutAttempt(payload).key,first.key);
  after.clearCheckoutAttempt();
  assert.notEqual(after.getCheckoutAttempt(payload).key,first.key);
});

test('dashboard revenue excludes unpaid/cancelled orders and preserves historical refund deductions', () => {
  const {recognizedOrderRevenue}=load('src/services/revenue.js');
  const paid={id:1,status:'Đã nhận hàng',payment_status:'Đã thanh toán',is_counted_as_revenue:1,total:575000,historical_refund_amount:100000};
  assert.equal(recognizedOrderRevenue(paid),475000);
  for (const status of ['Đã giao hàng thành công', 'Delivered', 'Hoàn thành', 'COMPLETED']) {
    assert.equal(recognizedOrderRevenue({...paid,status}),475000);
  }
  assert.equal(recognizedOrderRevenue({...paid,status:'Đã hủy'}),0);
  assert.equal(recognizedOrderRevenue({...paid,payment_status:'Chờ thanh toán'}),0);
  assert.equal(recognizedOrderRevenue({...paid,is_counted_as_revenue:0}),0);
  assert.equal(recognizedOrderRevenue({...paid,return_adjustment_amount:270000}),205000);
  assert.equal(recognizedOrderRevenue({...paid,return_adjustment_amount:600000}),0);
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
  const interceptor = load('src/services/httpInterceptor.js', { './apiClient': { API_BASE_URL: 'http://localhost:5000/api', getToken: () => 'token', clearToken() {} }, './catalogIdentity': {catalogIdentityRevision:()=>''} }, { window: win });
  interceptor.installHttpInterceptor();
  await assert.rejects(win.fetch('http://localhost:5000/api/orders', { method: 'POST', body: '{}' }));
  assert.equal(calls, 1);
});

test('HTTP interceptor preserves Request method and body', async () => {
  let request;
  const win = { fetch: async (input, init) => { request = new Request(input, init); return { status: 200 }; } };
  const interceptor = load('src/services/httpInterceptor.js', { './apiClient': { API_BASE_URL: 'http://localhost:5000/api', getToken: () => 'token', clearToken() {} }, './catalogIdentity': {catalogIdentityRevision:()=> 'catalog-v1'} }, { window: win });
  interceptor.installHttpInterceptor();
  await win.fetch(new Request('http://localhost:5000/api/orders', { method: 'POST', body: '{"quantity":1}' }));
  assert.equal(request.method, 'POST');
  assert.equal(await request.text(), '{"quantity":1}');
  assert.equal(request.headers.get('Authorization'), 'Bearer token');
  assert.equal(request.headers.get('X-Catalog-Identity'),'catalog-v1');
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

test('customer distinguishes refusal, unreachable recipient, transport accident and lost shipment', () => {
  const orders = load('src/stores/orderStore.js', { './authStore': { getCurrentUser: () => ({ id_user: 1 }) }, '../services/apiClient': { API_BASE_URL: 'http://localhost:5000/api' } });
  const unreachable = { status: 'WAREHOUSE_RETURN', stockIssueStatus: 'RETURNED_TO_WAREHOUSE' };
  const accident = { status: 'WAREHOUSE_RETURN', stockIssueStatus: 'DELIVERY_ACCIDENT' };
  const lost = { status: 'CANCELLED', stockIssueStatus: 'LOST_IN_TRANSIT' };
  const refused = { status: 'WAREHOUSE_RETURN', stockIssueStatus: 'RETURNED_TO_WAREHOUSE', stockIssueReason: 'Khách từ chối nhận vì hàng có vấn đề' };

  assert.equal(orders.getDeliveryIssueType(unreachable), 'UNREACHABLE');
  assert.equal(orders.getDeliveryIssueType(accident), 'ACCIDENT');
  assert.equal(orders.getDeliveryIssueType(lost), 'LOST');
  assert.equal(orders.getDeliveryIssueType(refused), 'REFUSED');
  assert.equal(orders.getCustomerOrderStatusLabel(unreachable), 'Chưa liên hệ được');
  assert.equal(orders.getCustomerOrderStatusLabel(accident), 'Sự cố vận chuyển');
  assert.equal(orders.getCustomerOrderStatusLabel(lost), 'Hàng bị thất lạc');
  assert.equal(orders.getCustomerOrderStatusLabel(refused), 'Chờ kiểm nhận');
  assert.equal(orders.getCustomerOrderStatusLabel({ ...refused, status: 'SHIPPING' }), 'Đang giao');
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
  assert.match(checkout, /TÔI ĐÃ CHUYỂN KHOẢN/);
  assert.doesNotMatch(checkout, /QR_code_for_mobile_English_Wikipedia/);
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
    '../components/StoreIllustration.vue': {},
    '../components/BrandLogo.vue': {},
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

function loadCheckoutPayment(apiClient, orders, notices = [], navigation = []) {
  return load('src/views/CheckoutView.vue', {
    '../components/StoreIllustration.vue': {}, '../components/BrandLogo.vue': {},
    'vue-router': { useRouter: () => ({ push: value => navigation.push(value), replace() {} }) },
    '../stores/cartStore': { cartItems: vue.ref([]), cartCount: vue.ref(0), cartSubtotal: vue.ref(0) },
    '../stores/orderStore': orders,
    '../stores/authStore': { currentUser: vue.ref({ id_user: 1 }) },
    '../stores/uiStore': { notify: value => notices.push(value) },
    '../services/apiClient': { api: apiClient },
    '../services/addressService': { addressBookApi: {}, vietnamAddressApi: {} },
    '../services/shippingService': { shippingApi: {} }, '../services/checkoutAttempt': {},
  }, {}, ['loadBankConfig', 'bankConfig', 'bankLoading', 'paymentQrUrl', 'transferContent', 'payModal', 'confirmPaid', 'viewPlacedOrder']);
}

test('checkout builds VietQR from the configured merchant, server total and shared order code', async () => {
  const orders = load('src/stores/orderStore.js', {
    './authStore': { getCurrentUser: () => ({ id_user: 1 }) }, '../services/apiClient': { API_BASE_URL: '/api' },
  });
  orders.orderState.orders = [{ id: 'LOCAL-1', serverId: 1, createdAt: new Date('2026-11-18T00:29:00').getTime() }];
  const requests = [];
  const page = loadCheckoutPayment({ get: async url => {
    requests.push(url);
    return { bankId: '970415', bankName: 'Audit bank', accountNo: '123456789', accountName: 'AUDIT SHOP' };
  } }, orders);
  Object.assign(page.payModal, { orderId: 'LOCAL-1', serverId: 1, total: 525000 });
  await page.loadBankConfig();
  const qr = new URL(page.paymentQrUrl.value);
  assert.equal(qr.hostname, 'img.vietqr.io');
  assert.match(qr.pathname, /970415-123456789-compact2\.png$/);
  assert.equal(qr.searchParams.get('amount'), '525000');
  assert.equal(qr.searchParams.get('addInfo'), 'SG SGVN26111800001K0');
  assert.equal(qr.searchParams.get('accountName'), 'AUDIT SHOP');
  assert.ok(requests.includes('/payment-config'));
  assert.equal(page.bankLoading.value, false);
});

test('checkout handles missing bank configuration and failed payment confirmation without losing the order', async () => {
  const orders = { orderState: vue.reactive({ orders: [{ id: 'LOCAL-1', serverId: 1, payment_status: 'Chưa thanh toán' }] }), getCustomerOrderCode: () => 'SGVN26111800001K0' };
  const navigation = [], notices = [];
  const page = loadCheckoutPayment({ get: async () => { throw new Error('Unavailable'); }, put: async () => { throw new Error('Try again'); } }, orders, notices, navigation);
  Object.assign(page.payModal, { open: true, orderId: 'LOCAL-1', serverId: 1, total: 525000 });
  await page.loadBankConfig();
  assert.equal(page.bankConfig.value.configured, false);
  assert.equal(page.paymentQrUrl.value, '');
  await page.confirmPaid();
  assert.equal(page.payModal.open, true);
  assert.equal(page.payModal.confirming, false);
  assert.equal(orders.orderState.orders[0].payment_status, 'Chưa thanh toán');
  assert.equal(navigation.length, 0);
  assert.equal(notices.at(-1).message, 'Try again');
});

test('checkout confirms a transfer once and waits for the API before closing', async () => {
  let finish, writes = 0, saves = 0;
  const order = { id: 'LOCAL-1', serverId: 1, payment_status: 'Chưa thanh toán' };
  const orders = { orderState: vue.reactive({ orders: [order] }), getCustomerOrderCode: () => 'SGVN26111800001K0', saveOrders: () => saves++ };
  const navigation = [];
  const page = loadCheckoutPayment({ get: async () => [], put: url => {
    assert.equal(url, '/orders/1/payment'); writes++;
    return new Promise(resolve => { finish = resolve; });
  } }, orders, [], navigation);
  Object.assign(page.payModal, { open: true, orderId: 'LOCAL-1', serverId: 1, total: 525000 });
  const first = page.confirmPaid(); await page.confirmPaid(); page.viewPlacedOrder();
  assert.equal(writes, 1); assert.equal(page.payModal.open, true); assert.equal(navigation.length, 0);
  assert.equal(order.payment_status, 'Chưa thanh toán');
  finish({ payment_status: 'Đã thanh toán' }); await first;
  assert.equal(page.payModal.open, false); assert.equal(page.payModal.confirming, false);
  assert.equal(order.payment_status, 'Đã thanh toán'); assert.equal(saves, 1);
  assert.equal(navigation[0].query.orderId, 'LOCAL-1');
});

function loadAdminImages(employee = vue.ref(false)) {
  return load('src/views/admin/adminStore.js', {
    '@/services/checkoutAttempt': {},
    '@/services/revenue': { recognizedOrderRevenue: () => 0 },
    '@/services/vietQr': {},
    '@/services/posCustomer': { validatePosCustomer: () => ({ ok: true, name: '', phone: '', message: '' }) },
    '@/stores/authStore': { currentUser: vue.ref(null), isEmployee:employee, logout() {} },
    '../../services/apiClient': { API_BASE_URL: 'http://localhost:5000/api', getToken: () => null },
    '@/stores/orderStore': { normalizeStatusText: value => String(value || '') },
  }, {
    setTimeout() {},
    FileReader: class {
      readAsDataURL(file) { this.result = file.data; this.onload(); }
    },
  });
}

test('color edit preserves the saved name until a HEX is explicitly entered or picked', async () => {
  const admin=loadAdminImages();
  admin.openForm('colors',{id:7,name:'Đen tuyền',hex:'#000000',active:true});
  await vue.nextTick();
  assert.equal(admin.formModal.data.name,'Đen tuyền');
  assert.equal(admin.formFields.value.some(f=>f.key==='sort_order'),false);
  admin.handleColorHexChange('#00ff00');
  assert.equal(admin.formModal.data.name,'Xanh lá');
  assert.equal(admin.formModal.data.hex,'#00FF00');
  admin.handleColorHexChange('#abc');
  assert.equal(admin.formModal.data.hex,'#ABC'); // Allow typing the rest of a six-digit value.
  admin.handleColorHexChange('#abc',true);
  assert.equal(admin.formModal.data.hex,'#AABBCC');
  const inferred=admin.formModal.data.name;
  admin.handleColorHexChange('#QQQQQQ');
  assert.equal(admin.formModal.data.name,inferred);
  admin.formModal.submitted=true;
  assert.ok(admin.formFieldError('hex'));
});

test('product price ranges sort valid variant prices and also normalize reversed API bounds', () => {
  const admin=loadAdminImages();
  admin.db.products=[{id:1,active:true,variants:[{id:11,price:500000,active:true},{id:12,price:200000,active:true},{id:13,price:'bad',active:true}]}];
  assert.equal(admin.productPriceLabel(admin.db.products[0]),admin.formatPrice(200000)+' - '+admin.formatPrice(500000));
  assert.equal(admin.productPriceLabel({id:2,min_price:500000,max_price:200000}),admin.formatPrice(200000)+' - '+admin.formatPrice(500000));
  assert.equal(admin.productPriceLabel({id:3,min_price:0,max_price:0,price:0}),'Chưa có giá');
});

test('coupon editor preserves time precision, prevents duplicate writes, and unlocks after a failed save', async () => {
  let writes=0,finish;
  const admin=loadAdminRealtime({fetch:async(url,options)=>{
    if(options?.method==='POST'){
      writes++;
      return await new Promise(resolve=>{finish=resolve;});
    }
    return {ok:true,headers:{get:()=> 'application/json'},json:async()=>[]};
  }});
  admin.openDiscountForm({code:'TIME10',name:'Theo giờ',discount_type:'Phần trăm',value:10,quantity:null,min_order:0,max_discount:0,start_date:'2040-11-02T09:15:32',expiry:'2040-11-02T18:45:10.123',active:true});
  assert.equal(admin.discountModal.data.start_date,'2040-11-02T09:15:32');
  assert.equal(admin.discountModal.data.expiry,'2040-11-02T18:45:10.123');
  const pending=admin.saveDiscount();
  await admin.saveDiscount();
  admin.closeDiscountForm();
  assert.equal(writes,1); assert.equal(admin.discountModal.open,true); assert.equal(admin.discountModal.saving,true);
  finish({ok:false,status:409,headers:{get:()=> 'application/json'},json:async()=>({message:'Mã đã tồn tại'})});
  await pending;
  assert.equal(admin.discountModal.saving,false); assert.equal(admin.discountModal.open,true);
  assert.equal(admin.discountModal.error,'Mã đã tồn tại');
  admin.discountModal.data.expiry='invalid';
  await admin.saveDiscount();assert.equal(writes,1);
  assert.equal(admin.promotionDateInput('2040-11-02',true),'2040-11-02T23:59:59.997');
});

test('new product promotions use every size of a color while detail mode cannot write or broaden old scopes', async () => {
  const writes=[];
  const admin=loadAdminRealtime({fetch:async(url,options)=>{
    if(options?.method==='POST') writes.push(JSON.parse(options.body));
    return {ok:true,headers:{get:()=> 'application/json'},json:async()=>options?.method ? {success:true} : []};
  }});
  admin.db.products=[{id:1,name:'Giày',active:true}];
  admin.db.inventory=[{id:11,product_id:1,color_id:2,color:'Đen',size:'40',price:300000,active:true},{id:12,product_id:1,color_id:2,color:'Đen',size:'41',price:400000,active:true}];
  admin.openVariantDiscountForm();
  assert.equal(admin.variantDiscountModal.data.apply_scope,'color');
  Object.assign(admin.variantDiscountModal.data,{variant_id:11,product_id:1,color_id:2,value:10});
  await admin.saveVariantDiscount();
  assert.equal(writes.length,1);assert.equal(writes[0].ApplyScope,'color');assert.equal(writes[0].ColorID,2);
  const old={id:5,variant_id:11,product_id:1,apply_scope:'variant',value:10,end_date:'2040-11-02'};
  admin.openVariantDiscountDetail(old);
  await admin.saveVariantDiscount();
  assert.equal(writes.length,1);assert.equal(admin.variantDiscountModal.mode,'view');
  admin.openVariantDiscountForm(old);
  assert.equal(admin.variantDiscountModal.data.apply_scope,'variant');
  assert.equal(old.apply_scope,'variant');
});

test('employee role is 3 and customers cannot enter the staff workspace',()=>{
  const auth=load('src/stores/authStore.js',{'../services/apiClient':{api:{},setToken(){},clearToken(){}}});
  auth.authState.currentUser={role_id:2,role:'Customer'};
  assert.equal(auth.isEmployee.value,false);assert.equal(auth.canUseStaffWorkspace.value,false);
  auth.authState.currentUser={role_id:3,role:'Employee'};
  assert.equal(auth.isEmployee.value,true);assert.equal(auth.canUseStaffWorkspace.value,true);assert.equal(auth.canManageProducts.value,false);
  auth.authState.currentUser={role_id:1,role:'Admin'};
  assert.equal(auth.canManageProducts.value,true);
});

test('coupon lifecycle separates scheduled, exhausted, inactive and ended',()=>{
  const admin=loadAdminImages(),future=new Date(Date.now()+86400000).toISOString(),past=new Date(Date.now()-86400000).toISOString();
  const coupon={active:true,quantity:5,used:0,expiry:future,start_date:past};
  assert.equal(admin.getDiscountStatus(coupon).label,'Đang diễn ra');
  assert.equal(admin.getDiscountStatus({...coupon,start_date:future}).label,'Sắp diễn ra');
  assert.equal(admin.getDiscountStatus({...coupon,used:5}).label,'Hết mã');
  assert.equal(admin.getDiscountStatus({...coupon,active:false}).label,'Ngừng hoạt động');
  assert.equal(admin.getDiscountStatus({...coupon,expiry:past}).label,'Đã kết thúc');
  assert.equal(admin.getDiscountStatus({...coupon,quantity:0,used:0}).label,'Hết mã');
  assert.equal(admin.getDiscountStatus({...coupon,quantity:null,used:10}).label,'Đang diễn ra');
  admin.openDiscountForm({...coupon,expiry:past});assert.equal(admin.discountModal.open,false);
  admin.openDiscountForm(coupon);assert.equal(new Date(admin.discountModal.data.expiry).getTime(),new Date(coupon.expiry).getTime());
});

test('product status uses a dedicated update without resending variants or stock',async()=>{
  const calls=[];
  const admin=loadAdminRealtime({fetch:async(url,options)=>{calls.push({url,options});return {ok:true,headers:{get:()=> 'application/json'},json:async()=>options?.method==='PUT'?{success:true}:[]};}});
  admin.db.products=[{id:1,name:'Shoe',active:true,variants:[{id:11,stock:99}]}];
  admin.toggleProductStatus(admin.db.products[0]);await admin.executeConfirm();
  const write=calls.find(c=>c.options?.method==='PUT');
  assert.ok(write.url.endsWith('/products/1/status'));assert.deepEqual(JSON.parse(write.options.body),{active:false});
  assert.equal(calls.some(c=>c.options?.method==='DELETE'),false);
});

test('required catalog fields reject whitespace before making an API request',async()=>{
  let writes=0;
  const admin=loadAdminRealtime({fetch:async()=>{writes++;return {ok:true,json:async()=>({success:true})};}});
  admin.openForm('brands');admin.formModal.data.name='   ';await admin.saveForm();assert.equal(writes,0);
  admin.openForm('sizes');admin.formModal.data.name='40';admin.formModal.data.standard='';await admin.saveForm();assert.equal(writes,0);
});

test('all named catalogs reject case and whitespace duplicates, including inactive rows and Unicode forms',async()=>{
  let writes=0;
  const admin=loadAdminRealtime({fetch:async()=>{writes++;return {ok:true,json:async()=>({success:true})};}});
  for(const type of ['categories','brands','materials','colors']) {
    const row={id:1,name:'Da thật',active:false,sport:'Chạy Bộ'};admin.db[type]=[row];
    admin.openForm(type);admin.formModal.data.sport='Chạy Bộ';
    for(const value of [' DA THẬT ','da   thật','d a t h ậ t','Da\u00a0\tthật','Da\u200bthật','Da thật'.normalize('NFD')]) {
      admin.formModal.data.name=value;admin.touchFormField('name');
      assert.match(admin.formFieldError('name'),/đã tồn tại/,type+': '+value);
      await admin.saveForm();assert.equal(admin.formModal.open,true);
    }
    admin.formModal.data.name='Đá thật';assert.equal(admin.formFieldError('name'),'');
    admin.formModal.data.name='\u200b \t';assert.match(admin.formFieldError('name'),/Vui lòng/);
    admin.openForm(type,row);admin.formModal.data.name=' DA  THẬT ';admin.touchFormField('name');assert.equal(admin.formFieldError('name'),'');
  }
  assert.equal(writes,0);
});

test('a stale catalog list still renders server duplicate errors under the name and keeps the draft',async()=>{
  const admin=loadAdminRealtime({fetch:async()=>({ok:false,status:409,headers:{get:()=> 'application/json'},json:async()=>({code:'DUPLICATE_CATALOG_NAME',message:'Tên này đã tồn tại.'})})});
  admin.openForm('materials');admin.formModal.data.name=' Da ';
  await admin.saveForm();assert.equal(admin.formModal.open,true);assert.equal(admin.formModal.data.name,' Da ');assert.match(admin.formFieldError('name'),/đã tồn tại/);assert.equal(admin.formModal.saving,false);
});

test('product confirmation requires a category and finite per-variant prices',()=>{
  const admin=loadAdminImages();admin.openProductForm();admin.productForm.name='Shoe';
  admin.productForm.colors=[{name:'Black',variants:[{price:100000,stock:1}]}];
  admin.requestSaveProduct();assert.equal(admin.confirmModal.open,false);
  admin.productForm.category_id=1;admin.productForm.colors[0].variants[0].price=Infinity;
  admin.requestSaveProduct();assert.equal(admin.confirmModal.open,false);
  admin.productForm.colors[0].variants[0].price=100000;admin.requestSaveProduct();assert.equal(admin.confirmModal.mode,'save-product');
});

test('pending sizes add only on confirmation and preserve saved variants in every status',()=>{
  const admin=loadAdminImages();
  admin.db.sizes=[{id:1,name:'40',standard:'EU',active:true},{id:2,name:'40',standard:'US',active:true},{id:3,name:'41',standard:'EU',active:true}];
  admin.openProductForm();admin.productForm.colors=[{id:1,name:'Black',variants:[{id:11,size_id:1,size:'40',standard:'EU',stock:3,price:100000,active:false,sku:'STABLE',version:7}]}];
  const color=admin.productForm.colors[0],saved=JSON.stringify(color.variants[0]),addition=admin.variantAddition(color);
  assert.deepEqual(Array.from(admin.availableSizesForColor(color),s=>s.id),[3]);
  addition.size_ids=[3];addition.price=250000;addition.stock=2;
  assert.equal(color.variants.length,1);addition.size_ids=[];assert.equal(JSON.stringify(color.variants[0]),saved);
  addition.size_ids=[3];assert.equal(admin.addPendingVariants(0),true);
  assert.equal(color.variants.length,2);assert.equal(JSON.stringify(color.variants[0]),saved);
  assert.equal(admin.removeDraftVariant(0,color.variants[0]),false);
  assert.equal(admin.addPendingVariants(0),false);assert.equal(color.variants.length,2);
  addition.standard='US';addition.size_ids=[2];assert.equal(admin.addPendingVariants(0),true);
  assert.equal(color.variants[2].standard,'US');assert.equal(color.variants[2].size,'40');assert.equal(JSON.stringify(color.variants[0]),saved);
});

test('size filters preserve ascending IDs and distinguish same names in different systems',()=>{
  const admin=loadAdminImages();admin.db.sizes=[{id:3,name:'40',standard:'US',active:true},{id:1,name:'40',standard:'EU',active:true},{id:2,name:'41',standard:'EU',active:false}];
  admin.sizeSearch.value='40';admin.sizeStandardFilter.value='EU';assert.equal(admin.filteredSizes.value.length,1);assert.equal(admin.filteredSizes.value[0].id,1);
  admin.sizeSearch.value='';admin.sizeStandardFilter.value='';assert.equal(admin.filteredSizes.value[0].id,1);
  admin.sizeStatusFilter.value='inactive';assert.equal(admin.filteredSizes.value[0].id,2);
});

test('brand search and status filters work together and keep ascending IDs',()=>{
  const admin=loadAdminImages();
  admin.db.brands=[{id:9,name:'Nike',active:true},{id:2,name:'Adidas',active:false},{id:1,name:'Nike Kids',active:false}];
  assert.deepEqual(Array.from(admin.filteredBrands.value,b=>b.id),[1,2,9]);
  admin.brandSearch.value=' nike ';admin.brandStatusFilter.value='inactive';
  assert.deepEqual(Array.from(admin.filteredBrands.value,b=>b.id),[1]);
  admin.brandStatusFilter.value='active';assert.deepEqual(Array.from(admin.filteredBrands.value,b=>b.id),[9]);
  admin.brandSearch.value='#2';assert.equal(admin.filteredBrands.value.length,0);
  admin.brandStatusFilter.value='';assert.deepEqual(Array.from(admin.filteredBrands.value,b=>b.id),[2]);
  admin.brandSearch.value='no-such-brand';assert.equal(admin.filteredBrands.value.length,0);
});

test('products sort ascending IDs and edits keep each record in place',()=>{
  const admin=loadAdminImages();admin.db.products=[{id:1,name:'Old'},{id:22,name:'Shoe'},{id:35,name:'New'}];
  assert.deepEqual(Array.from(admin.filteredProducts.value,p=>p.id),[1,22,35]);
  admin.db.products[0].name='Updated';assert.deepEqual(Array.from(admin.filteredProducts.value,p=>p.id),[1,22,35]);
  assert.deepEqual(Array.from(admin.db.products,p=>p.id),[1,22,35]);
  admin.productSearch.value='#22';assert.deepEqual(Array.from(admin.filteredProducts.value,p=>p.id),[22]);
});

test('catalog forms validate sizes inline, including inactive duplicates and normalized half sizes',async()=>{
  const admin=loadAdminImages();admin.db.sizes=[{id:1,name:'40',standard:'EU',active:false},{id:2,name:'7.5',standard:'US',active:true}];
  admin.openForm('sizes');assert.equal(admin.formFields.value.some(f=>f.key==='sort_order'),false);
  admin.formModal.data.name='40.00';admin.touchFormField('name');assert.match(admin.formFieldError('name'),/đã tồn tại/);
  admin.formModal.data.name='7,50';admin.formModal.data.standard='US';assert.match(admin.formFieldError('name'),/đã tồn tại/);
  admin.formModal.data.name='7.25';assert.match(admin.formFieldError('name'),/bước/);
  admin.formModal.data.name='8';assert.equal(admin.formFieldError('name'),'');
  admin.formModal.data.name='';await admin.saveForm();assert.match(admin.formFieldError('name'),/Vui lòng/);assert.equal(admin.formModal.open,true);
  admin.openForm('sizes',admin.db.sizes[0]);admin.touchFormField('name');assert.equal(admin.formFieldError('name'),'');
  admin.requestCloseForm();assert.equal(admin.formModal.open,false);
  admin.openForm('sizes');admin.formModal.data.name='41';admin.requestCloseForm();assert.equal(admin.formModal.open,true);assert.equal(admin.formModal.discardConfirm,true);assert.equal(admin.formModal.data.name,'41');
});

test('batch price and stock affect only new rows and remain independent across additions',()=>{
  const admin=loadAdminImages();admin.openProductForm();admin.db.sizes=[{id:3,name:'42',standard:'EU',active:true},{id:4,name:'43',standard:'EU',active:true}];
  admin.productForm.colors=[{id:1,name:'Black',variants:[{id:11,size_id:1,price:100000,stock:2,active:true},{id:12,size_id:2,price:200000,stock:3,active:true}]}];
  const color=admin.productForm.colors[0],rows=color.variants,addition=admin.variantAddition(color);
  assert.equal(addition.price,'');Object.assign(addition,{size_ids:[3],price:300000,stock:4});assert.equal(admin.addPendingVariants(0),true);
  rows[2].price=350000;Object.assign(addition,{size_ids:[4],price:400000,stock:5});assert.equal(admin.addPendingVariants(0),true);
  addition.price=900000;addition.stock=99;
  assert.deepEqual(Array.from(rows,v=>v.price),[100000,200000,350000,400000]);
  assert.deepEqual(Array.from(rows,v=>v.stock),[2,3,4,5]);
  assert.equal(admin.removeDraftVariant(0,rows[2]),true);assert.equal(rows.length,3);
  assert.deepEqual(Array.from(admin.availableSizesForColor(color),s=>s.id),[3]);
  assert.equal(rows[2].price,400000);assert.equal(rows[2].stock,5);
});

test('invalid batch fields and stale sizes reject the entire addition without changing saved rows',()=>{
  const admin=loadAdminImages();admin.openProductForm();admin.db.sizes=[{id:1,name:'40',standard:'EU',active:true},{id:2,name:'41',standard:'EU',active:true}];
  admin.productForm.colors=[{id:1,name:'Black',variants:[{id:11,size_id:1,size:'40',price:100000,stock:4,active:false}]}];
  const color=admin.productForm.colors[0],saved=JSON.stringify(color.variants),addition=admin.variantAddition(color);
  addition.size_ids=[2];
  for(const [key,values] of Object.entries({price:['',0,-1,Infinity,1e12+1],stock:['',-1,1.5,1e6+1]})) {
    for(const value of values) {
      Object.assign(addition,{price:200000,stock:0,[key]:value});assert.equal(admin.addPendingVariants(0),false);
      assert.ok(admin.variantAdditionFieldError(color,key));assert.equal(JSON.stringify(color.variants),saved);
    }
  }
  Object.assign(addition,{price:200000,stock:0,size_ids:[1,2]});assert.equal(admin.addPendingVariants(0),false);
  assert.match(admin.variantAdditionFieldError(color,'sizes'),/đã có/);assert.equal(JSON.stringify(color.variants),saved);
  assert.deepEqual(Array.from(addition.size_ids),[2]);
  addition.size_ids=[2];admin.db.sizes[1].active=false;assert.equal(admin.addPendingVariants(0),false);assert.equal(JSON.stringify(color.variants),saved);
  assert.equal(addition.size_ids.length,0);
  admin.db.sizes[1].active=true;addition.size_ids=[2];assert.equal(admin.addPendingVariants(0),true);assert.equal(color.variants[1].stock,0);assert.equal(color.variants[1].active,true);
});

test('pending sizes must be added before saving and parent state stays separate from stock',()=>{
  const admin=loadAdminImages();admin.db.sizes=[{id:1,name:'40',standard:'EU',active:true}];
  admin.openProductForm();admin.productForm.name='Shoe';admin.productForm.category_id=1;admin.productForm.colors=[{name:'Black',variants:[]}];
  const color=admin.productForm.colors[0],addition=admin.variantAddition(color);
  Object.assign(addition,{size_ids:[1],price:200000,stock:0});admin.requestSaveProduct();
  assert.equal(admin.confirmModal.open,false);assert.match(admin.variantAdditionFieldError(color,'sizes'),/Thêm biến thể/);
  admin.productForm.active=false;assert.equal(admin.addPendingVariants(0),true);assert.equal(color.variants[0].active,false);
  admin.requestSaveProduct();assert.equal(admin.confirmModal.mode,'save-product');
  admin.setColorActive(0,false);assert.ok(admin.productForm.colors[0].variants.every(v=>!v.active));
  admin.productForm.active=true;
  admin.setColorActive(0,true);assert.ok(admin.productForm.colors[0].variants.every(v=>v.active));
  assert.equal(color.variants[0].stock,0);
});

test('variant size edit prevents duplicates and changes only the selected row',()=>{
  const admin=loadAdminImages();admin.db.sizes=[{id:1,name:'40',standard:'EU',active:true},{id:2,name:'41',standard:'EU',active:true},{id:3,name:'7.5',standard:'UK',active:true}];
  admin.openProductForm();admin.productForm.colors=[{name:'Black',variants:[{id:11,size_id:1,size:'40',standard:'EU',sku:'STABLE',stock:8,price:400000},{id:12,size_id:2,size:'41',standard:'EU',stock:2,price:500000}]}];
  const row=admin.productForm.colors[0].variants[0];admin.changeVariantSize(0,row,2);assert.equal(row.size_id,1);
  admin.changeVariantSize(0,row,3);assert.equal(row.size_id,3);assert.equal(row.standard,'UK');assert.equal(row.size,'7.5');assert.equal(row.sku,'STABLE');assert.equal(row.stock,8);assert.equal(row.price,400000);assert.equal(admin.productForm.colors[0].variants[1].size_id,2);
});

test('inactive variants retain prices in edit and detail and batch defaults do not change them',()=>{
  const admin=loadAdminImages();admin.db.colors=[{id:1,name:'Black'}];
  const p={id:22,name:'Shoe',price:0,active:true,colors:[{id:1,name:'Black'}],variants:[{id:11,color_id:1,color:'Black',size_id:1,size:'40',price:400000,stock:8,active:false}]};
  admin.db.products=[p];admin.openProductForm(p);assert.equal(admin.productForm.colors[0].variants[0].price,400000);assert.equal(admin.productForm.colors[0].addition.stock,0);assert.equal(admin.productForm.colors[0].addition.price,400000);
  assert.equal(admin.productPriceLabel(p),admin.formatPrice(400000));
  admin.productForm.colors[0].addition.price='';assert.equal(admin.productForm.colors[0].variants[0].price,400000);
});

test('product eye dialog has no editable controls, parent SKU placeholder or edit action',()=>{
  const source=fs.readFileSync(path.join(root,'src/views/admin/pages/ProductsPage.vue'),'utf8');
  const detail=source.slice(source.indexOf('v-if="productDetailModal.open"'),source.indexOf('</template>'));
  assert.doesNotMatch(detail,/<input|<select|<textarea|openProductForm|toggleVariantStatus|SKU cha|Chưa thiết lập/);
  assert.match(detail,/productPriceLabel\(productDetailModal.product\)/);
  assert.doesNotMatch(source,/Bỏ chọn tất cả|Chọn tất cả|Hoàn tác chọn kích cỡ|same_price/);
  assert.match(source,/Tồn mỗi biến thể mới/);
});

test('product list displays real IDs and preserves the current vietdo catalog columns',()=>{
  const source=fs.readFileSync(path.join(root,'src/views/admin/pages/ProductsPage.vue'),'utf8');
  const {descriptor}=parse(source);
  const list=descriptor.template.content.split('<!-- FORM THÊM/SỬA -->')[0];
  const headings=Array.from(list.matchAll(/<th\b[^>]*>([^<]+)<\/th>/g),m=>m[1].trim());
  assert.deepEqual(headings,['Mã sản phẩm','Hình ảnh','Tên giày','Khoảng giá','Tồn kho','Trạng thái','Thao tác']);
  assert.equal(list.includes('p.description'),false);
  assert.match(list,/colspan="7"/);
  assert.doesNotMatch(list,/catalog-sequence|index \+ 1/);assert.match(list,/p\.id/);
  assert.match(source,/productDetailModal\.product\.description/);
});

test('POS displays the individual variant price and omits inactive variants',()=>{
  const admin=loadAdminImages();admin.db.products=[{id:1,name:'Shoe',price:100000,active:true}];
  admin.db.inventory=[{id:11,product_id:1,color:'Black',size:'40',price:250000,stock:2,active:true},{id:12,product_id:1,color:'Black',size:'41',price:350000,stock:3,active:false}];
  assert.equal(admin.posVariants.value.length,1);assert.equal(admin.posVariants.value[0].price,250000);
});

test('revenue uses recognition dates, local whole-day bounds, all orders, and consistent channel totals', () => {
  const admin = loadAdminRealtime({}, undefined, load('src/services/revenue.js'));
  const paid = { status: 'Đã nhận hàng', payment_status: 'Đã thanh toán', is_counted_as_revenue: 1, total: 100000, date: '2026-09-01T12:00:00' };
  admin.db.orders = Array.from({ length: 125 }, (_, id) => admin.mapOrder({ ...paid, id, channel: 'Offline', payment_confirmed_at: '2026-10-01T00:15:00' }));
  admin.db.orders.push(admin.mapOrder({ ...paid, id: 126, channel: 'Online', revenue_eligible_date: '2026-10-01T23:59:59.999', historical_refund_amount: 20000 }));
  admin.db.orders.push(admin.mapOrder({ ...paid, id: 127, channel: 'Online', revenue_eligible_date: '2026-10-02T00:00:00' }));
  admin.db.orders.push(admin.mapOrder({ ...paid, id: 128, channel: 'Offline', payment_confirmed_at: '2026-10-01T12:00:00', is_counted_as_revenue: '0' }));
  admin.db.orders.push(admin.mapOrder({ ...paid, id: 129, channel: 'Offline', payment_confirmed_at: '2026-10-01T12:00:00', status: 'Đã hủy' }));
  admin.dateRange.value = 'custom';
  admin.customRange.from = admin.customRange.to = '2026-10-01';
  assert.equal(admin.ordersInRange.value.length, 0);
  assert.equal(admin.statRevenue.value, 12580000);
  assert.equal(admin.paymentRevenueSummary.value.pos, 12500000);
  assert.equal(admin.paymentRevenueSummary.value.online, 80000);
  assert.equal(admin.paymentRevenueSummary.value.total, admin.statRevenue.value);
  for (const [mode, key] of [['day', '2026-10-01'], ['month', '2026-10'], ['year', '2026']]) {
    admin.revenuePeriod.value = mode;
    assert.equal(admin.revenueByPeriod.value[0].period, key);
    assert.equal(admin.revenueByPeriod.value[0].total, admin.statRevenue.value);
  }
  assert.equal(admin.localDateKey(new Date(2026, 9, 1, 0, 15)), '2026-10-01');
});

test('best sellers have independent day/month/year filters, product IDs and net fulfilled quantities', () => {
  const admin = loadAdminRealtime();
  admin.db.products = [{ id: 1, name: 'Cùng tên', brand: 'Nike' }, { id: 2, name: 'Cùng tên', brand: 'Adidas' }];
  const order = (id, date, status, productId, quantity, returned = 0) => admin.mapOrder({ id, date, status, products: [{ product_id: productId, name: 'Cùng tên', quantity, historical_returned_quantity: returned }] });
  admin.db.orders = [order(1, '2026-10-01T09:00:00', 'Đã nhận hàng', 1, 6, 2), order(2, '2026-10-02T09:00:00', 'Đã giao hàng thành công', 2, 3), order(3, '2026-09-01T09:00:00', 'Đã nhận hàng', 1, 2), order(4, '2026-10-01T09:00:00', 'Chờ xác nhận', 1, 99), order(5, '2026-10-01T09:00:00', 'Đã hủy', 1, 99)];
  admin.dateRange.value = 'custom';
  admin.customRange.from = admin.customRange.to = '2020-01-01';
  admin.topProductsPeriod.value = 'day'; admin.topProductsDate.value = '2026-10-01';
  assert.equal(admin.topProductsList.value.length, 1); assert.equal(admin.topProductsList.value[0].quantity, 4);
  admin.topProductsPeriod.value = 'month'; admin.topProductsMonth.value = '2026-10';
  assert.equal(admin.topProductsList.value.length, 2);
  assert.equal(admin.topProductsList.value[0].brand, 'Nike'); assert.equal(admin.topProductsList.value[1].brand, 'Adidas');
  admin.topProductsPeriod.value = 'year'; admin.topProductsYear.value = 2026;
  assert.equal(admin.topProductsList.value[0].quantity, 6);
});

test('fresh orders update revenue even when a catalog API fails; failed order reads keep the previous snapshot', async () => {
  let failOrders = false;
  const admin = loadAdminRealtime({ fetch: async url => ({
    ok: !String(url).endsWith('/brands') && !(failOrders && String(url).endsWith('/orders')),
    status: 503, headers: { get: () => 'application/json' },
    json: async () => String(url).endsWith('/orders') && !failOrders ? [{ id: 1, date: '2026-10-01T10:00:00', status: 'Đã nhận hàng', payment_status: 'Đã thanh toán', channel: 'Offline', is_counted_as_revenue: 1, total: 200000 }] : [],
  }) }, undefined, load('src/services/revenue.js'));
  await admin.fetchAllData();
  assert.equal(admin.statRevenue.value, 200000);
  assert.equal(admin.ordersLoadError.value, '');
  const old = admin.db.orders;
  failOrders = true; await admin.refreshOrders();
  assert.equal(admin.db.orders, old);
  assert.ok(admin.ordersLoadError.value);
});

test('direct POS entry releases the shared initial loading overlay even when its background load starts first', async () => {
  const admin = loadAdminRealtime({ fetch: async () => ({ ok: true, headers: { get: () => 'application/json' }, json: async () => [] }) });
  const background = admin.fetchAllData(true);
  const layout = admin.fetchAllData();
  assert.equal(background, layout);
  await layout;
  assert.equal(admin.isLoading.value, false);
});

test('an older full refresh cannot overwrite orders from a newer event refresh', async () => {
  const pending = [];
  const admin = loadAdminRealtime({ fetch: async url => String(url).endsWith('/orders')
    ? new Promise(resolve => pending.push(resolve))
    : { ok: true, headers: { get: () => 'application/json' }, json: async () => [] } });
  const response = total => ({ ok: true, headers: { get: () => 'application/json' }, json: async () => [{ id: 1, date: '2026-10-01T10:00:00', total }] });
  const old = admin.fetchAllData(true);
  const recent = admin.refreshOrders();
  pending[1](response(500000)); await recent;
  pending[0](response(100000)); await old;
  assert.equal(admin.db.orders[0].total, 500000);
});

test('customer cancellation blocks repeated submits, updates immediately after success, and retains failed drafts', async () => {
  const orders = load('src/stores/orderStore.js', { './authStore': { getCurrentUser: () => ({ id_user: 1 }) }, '../services/apiClient': { API_BASE_URL: '/api' } });
  orders.orderState.orders = [{ id: 'SV1', serverId: 1, userId: 1, status: 'CONFIRMED', payment_status: 'Đã thanh toán' }];
  let finish, requests = 0, reject = false;
  const page = load('src/views/MyOrders.vue', {
    '../components/StoreIllustration.vue': {},
    'vue-router': { useRouter: () => ({ currentRoute: vue.ref({ query: {} }) }) },
    '../stores/orderStore': { ...orders, loadOrders: async () => [] },
    '../stores/uiStore': { notify() {} },
    '../services/apiClient': { api: { put: () => { requests++; return reject ? Promise.reject(new Error('Đơn đã chuyển sang giao hàng')) : new Promise(resolve => { finish = resolve; }); } } },
    '../services/addressService': { addressBookApi: {}, vietnamAddressApi: {} },
    '../components/OrderStatusIcon.vue': {},
  }, { document: { activeElement: { focus() {} } } }, ['handleCancel', 'submitCancel', 'closeCancelModal', 'cancelModal']);
  page.handleCancel(orders.orderState.orders[0]); page.cancelModal.reason = 'Đổi kích cỡ';
  const pending = page.submitCancel(); await page.submitCancel(); page.closeCancelModal();
  assert.equal(requests, 1); assert.equal(page.cancelModal.open, true); assert.equal(orders.orderState.orders[0].status, 'CONFIRMED');
  finish({ success: true }); await pending;
  assert.equal(page.cancelModal.open, false); assert.equal(orders.orderState.orders[0].status, 'CANCELLED');
  assert.equal(orders.orderState.orders[0].payment_status, 'Chờ hoàn tiền');
  orders.orderState.orders[0].status = 'CONFIRMED'; reject = true;
  page.handleCancel(orders.orderState.orders[0]); page.cancelModal.reason = 'Giữ lý do này'; await page.submitCancel();
  assert.equal(page.cancelModal.open, true); assert.equal(page.cancelModal.submitting, false);
  assert.equal(page.cancelModal.reason, 'Giữ lý do này'); assert.ok(page.cancelModal.error);
  assert.equal(orders.orderState.orders[0].status, 'CONFIRMED');
});

test('order queue partitions all nonterminal orders from completed and cancelled history', () => {
  const { isOrderInProgress } = load('src/services/orderQueue.js');
  const active = ['Chờ xác nhận', 'Đã xác nhận', 'Đang vận chuyển', 'Giao hàng thất bại', 'Về kho', 'Yêu cầu trả hàng', 'unknown'];
  const closed = ['Đã giao hàng thành công', 'Đã nhận hàng', 'Hoàn tất', 'COMPLETED', 'Đã hủy', 'cancelled', 'Đã hoàn tất trả hàng'];
  for (const status of active) assert.equal(isOrderInProgress({ status }), true, status);
  for (const status of closed) assert.equal(isOrderInProgress({ status }), false, status);
  assert.equal(isOrderInProgress({ status: 'Đã giao hàng thành công', active_return_count: 1 }), true);
  assert.equal(isOrderInProgress({ status: 'Đã hủy', pending_refund_amount: 500000 }), true);
  const admin = loadAdminRealtime();
  admin.db.orders = [...active, ...closed].map((status, i) => ({ id: i + 1, status, created_at: new Date(2026, 10, i + 1).toISOString() }));
  assert.equal(admin.incompleteOrdersCount.value, active.length);
  const page = load('src/views/admin/pages/PaymentsPage.vue', {
    '../adminStore': { ...admin, paymentChannelOrders: vue.computed(() => admin.db.orders) },
  }, {}, ['displayedOrders', 'queueView']);
  assert.deepEqual(Array.from(page.displayedOrders.value, order => order.status), active);
  page.queueView.value = 'ALL';
  assert.deepEqual(Array.from(page.displayedOrders.value, order => order.status), closed);
  admin.db.orders[0].status = 'Đã giao hàng thành công';
  assert.equal(page.displayedOrders.value.length, closed.length + 1);
  assert.equal(admin.incompleteOrdersCount.value, active.length - 1);
});

test('customer delivery and historical received orders synchronize without a receipt action', () => {
  const store = load('src/stores/orderStore.js', {
    './authStore': { getCurrentUser: () => ({ id_user: 1 }) }, '../services/apiClient': { API_BASE_URL: '/api' },
  });
  store.reconcileOrdersFromServer([
    { id: 7, user_id: 1, status: 'Đã giao hàng thành công', payment_status: 'Đã thanh toán', is_counted_as_revenue: true },
    { id: 8, user_id: 1, status: 'Đã nhận hàng', payment_status: 'Đã thanh toán', is_counted_as_revenue: true },
  ]);
  const delivered = store.orderState.orders.find(order => order.serverId === 7);
  const historical = store.orderState.orders.find(order => order.serverId === 8);
  assert.equal(store.getOrderDisplayStatus(delivered), 'DELIVERED');
  assert.equal(store.getOrderDisplayStatus(historical), 'RECEIVED');
  assert.equal(delivered.isCountedAsRevenue, true);
  assert.equal(store.getCustomerOrderDisplayStatus(historical), 'DELIVERED');
  assert.equal(store.getCustomerOrderStatusLabel(historical), 'Đã giao');
  assert.equal('confirmReceived' in store, false);
  const page = load('src/views/MyOrders.vue', {
    '../components/StoreIllustration.vue': {}, '../components/OrderStatusIcon.vue': {},
    'vue-router': { useRouter: () => ({ currentRoute: vue.ref({ query: {} }) }) },
    '../stores/orderStore': { ...store, loadOrders: async () => [] },
    '../stores/uiStore': { notify() {} },
    '../services/apiClient': { api: {} }, '../services/addressService': { addressBookApi: {}, vietnamAddressApi: {} },
  }, {}, ['filtered', 'statusFilter', 'customerStatuses']);
  page.statusFilter.value = 'DELIVERED';
  assert.equal(page.filtered.value.length, 2);
  assert.ok(page.customerStatuses.every(status => !['RECEIVED', 'COMPLETED'].includes(status.key)));
  const source = fs.readFileSync(path.join(root, 'src/views/MyOrders.vue'), 'utf8');
  assert.doesNotMatch(source, /receiveModal|submitReceive|REVENUE_HOLD_DAYS|daysUntilRevenue/);
});

test('completed payment orders use the same green badge for API codes and Vietnamese labels', () => {
  const admin = loadAdminRealtime();
  for (const status of ['COMPLETED', 'completed', ' Hoàn thành ', 'Hoàn tất', 'Đã nhận hàng', 'RECEIVED']) {
    const order = admin.mapOrder({ id: 1, status });
    assert.equal(order.status, 'Đã nhận hàng');
    assert.equal(admin.getOrderStatusPill(order).label, 'Hoàn thành');
    assert.match(admin.getOrderStatusPill(order).cls, /\bbg-success\b/);
    assert.match(admin.getOrderStatusPill({ status }).cls, /\bbg-success\b/);
    assert.equal(admin.getOrderActions(order).some(action => action.next === 'Đang vận chuyển'), false);
  }
  assert.equal(admin.getOrderStatusPill({ status: 'Đã giao hàng thành công' }).label, 'Hoàn thành');
  assert.match(admin.getOrderStatusPill({ status: 'Đã giao hàng thành công' }).cls, /\bbg-success\b/);
  for (const status of ['Chờ xác nhận', 'Đã xác nhận', 'Đang vận chuyển', 'Đã hủy', 'Yêu cầu trả hàng']) {
    assert.doesNotMatch(admin.getOrderStatusPill({ status }).cls, /\bbg-success\b/);
  }
});

function loadAdminRealtime(globals = {}, getToken = () => 'admin-token', revenue = { recognizedOrderRevenue: () => 0 }) {
  return load('src/views/admin/adminStore.js', {
    '@/services/checkoutAttempt': {},
    '@/services/revenue': revenue,
    '@/services/vietQr': {},
    '@/services/posCustomer': { validatePosCustomer: () => ({ ok: true, name: '', phone: '', message: '' }) },
    '@/stores/authStore': { currentUser: vue.ref(null), isEmployee:vue.ref(false), logout() {} },
    '../../services/apiClient': { API_BASE_URL: 'http://localhost:5000/api', getToken },
    '@/stores/orderStore': load('src/stores/orderStore.js', {
      './authStore': { getCurrentUser: () => null },
      '../services/apiClient': { API_BASE_URL: '/api' },
    }),
  }, {
    setTimeout,
    clearTimeout,
    AbortController,
    TextDecoder,
    ...globals,
  });
}

test('a POS connection failure keeps the selected pending invoice and customer draft', async () => {
  const calls=[];
  const admin=loadAdminRealtime({fetch:async url=>{calls.push(url);throw Error('offline');}});
  admin.posCartId.value=123;
  admin.activePosOrder.value.customer_name='Draft customer';
  assert.equal(await admin.loadPosCart(),false);
  assert.equal(admin.posCartId.value,123);
  assert.equal(admin.activePosOrder.value.customer_name,'Draft customer');
  assert.equal(calls.length,1);
});

test('inventory fallback keeps variant prices and inactive state from products',async()=>{
  const admin=loadAdminRealtime({fetch:async url=>({ok:true,headers:{get:()=> 'application/json'},json:async()=>String(url).endsWith('/products')?[{id:1,name:'Shoe',active:true,price:100000,variants:[{id:11,size:'7.5',standard:'UK',color:'Black',price:350000,stock:3,active:false,version:2}]}]:[]})});
  await admin.fetchAllData();
  assert.equal(admin.db.inventory[0].price,350000);
  assert.equal(admin.db.inventory[0].standard,'UK');
  assert.equal(admin.db.inventory[0].active,false);
  assert.equal(admin.posVariants.value.length,0);
});

test('admin read timeout releases loading and preserves the last complete snapshot', async () => {
  const timers = [];
  const requests = [];
  const admin = loadAdminRealtime({
    setTimeout(callback, delay) { timers.push({ callback, delay }); return timers.length; },
    clearTimeout() {},
    fetch(url, options) {
      requests.push(url);
      if (url.endsWith('/orders')) return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      });
      return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: async () => [] });
    },
  });
  const oldOrders = [{ id: 7, customer_name: 'Existing order' }];
  admin.db.orders = oldOrders;
  const preservedOrders = admin.db.orders;
  const pending = admin.fetchAllData();
  assert.equal(admin.isLoading.value, true);
  assert.equal(timers[0].delay, 15000);
  timers[0].callback();
  await pending;
  assert.equal(admin.isLoading.value, false);
  assert.equal(admin.db.orders, preservedOrders);
  assert.match(admin.apiErrors.value.find(error => error.path === '/orders').message, /phản hồi quá lâu/);
  assert.equal(requests.filter(url => url.endsWith('/orders')).length, 1);
});

test('admin read honors caller cancellation and clears its timeout', async () => {
  let cleared = false;
  const caller = new AbortController();
  const admin = loadAdminRealtime({
    setTimeout() { return 123; },
    clearTimeout(id) { cleared = id === 123; },
    fetch(url, options) {
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      });
    },
  });
  const pending = admin.api('/orders', { signal: caller.signal });
  caller.abort();
  assert.equal(await pending, null);
  assert.equal(cleared, true);
});

test('lost delivery cancels permanently while the other failures can be reshipped', () => {
  const admin = loadAdminImages();
  const options = admin.getDeliveryFailureOptions();
  const unreachable = options.find(option => option.key === 'return_warehouse');
  const accident = options.find(option => option.key === 'delivery_accident');
  const refused = options.find(option => option.key === 'delivery_refused');
  const lost = options.find(option => option.key === 'lost_delivery_cancel');

  assert.equal(unreachable.next, 'Về kho');
  assert.equal(accident.next, 'Về kho');
  assert.equal(refused.next, 'Về kho');
  assert.match(refused.reason, /từ chối nhận/);
  assert.equal(lost.next, 'Đã hủy');
  assert.equal(lost.issueStatus, 'LOST_IN_TRANSIT');
  assert.equal(admin.getOrderActions({ status: 'Về kho', payment_method: 'COD' })[0].key, 'reship');
  assert.equal(admin.getOrderActions({ status: 'Về kho', payment_method: 'COD' }).some(a=>a.afterSales), true);
  assert.equal(admin.getOrderActions({ status: 'Về kho', payment_method: 'BANK', payment_status: 'Chưa thanh toán' }).some(a=>a.afterSales), true);
  assert.equal(loadAdminImages(vue.ref(true)).getOrderActions({ status: 'Về kho', payment_method: 'COD' }).some(a=>a.afterSales), false);
  assert.equal(admin.getOrderActions({
    status: 'Giao hàng thất bại',
    payment_method: 'COD',
    stock_issue_reason: 'Mất hàng khi vận chuyển',
  }).length, 0);
});

test('failed delivery opens the existing inspection panel without writing an order status or return request', () => {
  let opened=0,writes=0;
  const page=load('src/views/admin/pages/PaymentsPage.vue',{'../adminStore':{paymentChannelOrders:vue.ref([]),runOrderAction:()=>writes++}}, {},['afterSalesPanel','requestOrderAction','transitionConfirm']);
  page.afterSalesPanel.value={open:()=>opened++};
  page.requestOrderAction({id:9,status:'Về kho'},{key:'warehouse_inspection',afterSales:true});
  assert.equal(opened,1);assert.equal(writes,0);assert.equal(page.transitionConfirm.open,false);
});

test('marking a parcel as warehouse-bound does not claim stock was already restored', async () => {
  const admin=loadAdminRealtime({fetch:async()=>({ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>({success:true,stock_deducted:false})})});
  const order={id:9,status:'Đang vận chuyển',payment_method:'COD',products:[],stock_restored_at:null};
  await admin.runOrderAction(order,admin.getDeliveryFailureOptions().find(a=>a.key==='delivery_refused'));
  assert.equal(order.status,'Về kho');assert.equal(order.stock_restored_at,null);assert.match(order.stock_issue_reason,/từ chối nhận/);
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

test('editing a product restores the selected color id from its saved color name', () => {
  const admin = loadAdminImages();
  admin.db.colors = [
    { id: 7, name: 'Đen', hex: '#000000' },
    { id: 8, name: 'Trắng', hex: '#ffffff' },
  ];

  admin.openProductForm(imageProduct());

  assert.equal(admin.productForm.colors[0].id, 7);
  assert.equal(admin.productForm.colors[0].name, 'Đen');
  assert.equal(admin.productForm.colors[0].hex, '#000000');
  assert.equal(admin.productForm.colors[1].id, 8);
});

test('product variant editor omits variant descriptions and keeps the color selector', () => {
  const source = fs.readFileSync(path.join(root, 'src/views/admin/pages/ProductsPage.vue'), 'utf8');
  assert.doesNotMatch(source, /Mô tả biến thể|Chú thích \(không bắt buộc\)|colorNoteDraft/);
  assert.match(source, /<i class="icon icon-palette mr-1"><\/i>Đổi màu/);
  assert.match(source, /<select\s+:value="c\.id"\s+@change="changeColor/);
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
  const storefrontCss = fs.readFileSync(path.join(root, 'src/assets/storefront.css'), 'utf8');
  const mainCss = fs.readFileSync(path.join(root, 'src/assets/main.css'), 'utf8');
  assert.match(navbar, /<header[^>]+\bfixed\b[^>]+\btop-0\b/);
  assert.match(app, /<main[^>]+store-main[^>]*>/);
  assert.match(storefrontCss, /\.storefront \.store-main\s*\{\s*padding-top:\s*var\(--sg-header-height\)/);
  assert.match(mainCss, /--sg-header-height:\s*104px/);
  assert.equal((app.match(/<ZaloChat\s*\/>/g) || []).length, 1);
  assert.equal((home.match(/<ZaloChat\s*\/>/g) || []).length, 0);
});

test('product detail uses the archived Figma layout without Bootstrap utilities', () => {
  const detail = fs.readFileSync(path.join(root, 'src/views/ProductDetail.vue'), 'utf8');
  assert.match(detail, /lg:grid-cols-2/);
  assert.match(detail, /Sản phẩm liên quan/);
  assert.match(detail, /Chọn kích cỡ/);
  assert.doesNotMatch(detail,/Chọn size \(UK\)/);
  assert.doesNotMatch(detail, /\b(container-fluid|spinner-border|d-flex|flex-column|col-lg-\d+|row g-\d+|w-100|text-danger|text-muted|bi bi-)\b/);
});

test('customer size selection separates US and UK and keeps the raw size and exact variant in checkout',()=>{
  const sizeLabels=load('src/services/variantSize.js');
  const detail=load('src/views/ProductDetail.vue',{
    'vue-router':{useRoute:()=>({params:{id:1}}),useRouter:()=>({push(){}})},
    '../components/figma/product/FigmaProductCard.vue':{},
    '../components/figma/product/FigmaProductGrid.vue':{},
    '../services/apiClient':{api:{}},
    '../services/variantSize':sizeLabels,
    '../stores/cartStore':{addToCart(){},formatCurrency(){},showDrawer(){}},
    '../stores/uiStore':{notify(){}},
    '../../img/hero-sneakers.jpg':'image.jpg',
  },{},['product','selectedColor','selectedSize','availableSizes','selectedVariant','sizeStock','buildCartPayload']);
  detail.product.value={id:1,price:100000,variants:[{id:11,color:'Black',size:'7.5',standard:'US',price:200000,stock:2},{id:12,color:'Black',size:'7.5',standard:'UK',price:350000,stock:3}]};
  detail.selectedColor.value={name:'Black'};
  assert.deepEqual(Array.from(detail.availableSizes.value),['US 7.5','UK 7.5']);
  detail.selectedSize.value='UK 7.5';
  assert.equal(detail.selectedVariant.value.id,12);
  assert.equal(detail.sizeStock('UK 7.5'),3);
  const payload=detail.buildCartPayload();
  assert.equal(payload.variantId,12);assert.equal(payload.size.size_name,'7.5');assert.equal(payload.product.price,350000);
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
    '../components/ActivityStatus.vue': {},
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
  assert.match(source, /v-if="canToggleAccountLock\(account\)"/);
});

test('POS walk-in customers never become synthetic login accounts', () => {
  const server = fs.readFileSync(path.join(root, '../backend/legacy-express/server.js'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'src/views/admin/adminStore.js'), 'utf8');
  assert.doesNotMatch(server, /@walkin\.local/);
  assert.match(server, /UserID:\s*null[\s\S]*is_walkin:\s*true/);
  assert.match(admin, /o\.customer_id = c\.is_walkin/);
  assert.match(admin, /is_walkin:\s*Boolean\(c\.IsWalkIn \?\? c\.is_walkin\)/);
});

test('home hero serializes rapid navigation and resets clones without animation', () => {
  const home = fs.readFileSync(path.join(root, 'src/views/HomeDisplay.vue'), 'utf8');
  assert.match(home, /const isHeroAnimating = ref\(false\)/);
  assert.match(home, /if \(isHeroAnimating\.value \|\| !isTransitioning\.value\)/);
  assert.match(home, /isTransitioning\.value = false[\s\S]*currentIndex\.value \+=/);
  assert.match(home, /slide\.type === 'video' && \(i === currentIndex \|\| i === outgoingHeroIndex\)/);
  assert.doesNotMatch(home, /:inert="i !== currentIndex"/);
  assert.match(home, /:tabindex="i === currentIndex \? 0 : -1"/);
  assert.doesNotMatch(home, /currentIndex\.value\+\+|currentIndex\.value--/);
});

function loadHome(notify = () => {}, { globals = {}, expose = [], router = { push() {} }, apiClient = {} } = {}) {
  return load('src/views/HomeDisplay.vue', {
    '../../img/hero-sneaker-crimson.png': 'hero-sneaker-crimson.png',
    '../../img/hero-runner-crimson.png': 'hero-runner-crimson.png',
    '../../img/hero-court-crimson.png': 'hero-court-crimson.png',
    '../../img/hero-street-crimson.png': 'hero-street-crimson.png',
    '../components/StoreIllustration.vue': {},
    'lucide-vue-next': {},
    'vue-router': { useRouter: () => router },
    '../components/figma/product/FigmaProductCard.vue': {},
    '../components/figma/product/FigmaProductGrid.vue': {},
    '../services/apiClient': { api: apiClient },
    '../stores/uiStore': { notify },
    '../data/homeMedia': { homeMedia: { videos: ['video'], hero: {}, promo: {}, categories: [] } },
  }, globals, ['categoryCards', 'categoriesFromApi', 'allProducts', 'email', 'subscribe', 'subscribing', ...expose]);
}

test('admin avatar uses name initials and excludes role suffixes and punctuation', () => {
  const name = vue.ref('Hải Anh (Admin)');
  const layout = load('src/views/admin/AdminLayout.vue', {
    'vue-router': { useRoute: () => ({ path: '/admin/panel/products', fullPath: '/admin/panel/products', meta: {} }), useRouter: () => ({}) },
    './components/AdminIcon.vue': {}, './components/AdminLogoutModal.vue': {},
    '../../components/BrandLogo.vue': {}, '../../directives/dialogFocus': {},
    '../../stores/authStore': { isEmployee: vue.ref(false) },
    '../../utils/brandLogos': {},
    './adminStore': { getDisplayName: name, isNavOpen: vue.ref(true) },
  }, { window: { innerWidth: 1366 } }, ['initials']);
  for (const [value, expected] of [
    ['Hải Anh (Admin)', 'HA'], ['Nguyễn Hải Anh [Quản trị viên]', 'HA'],
    ['Đỗ Ánh (Admin)', 'ĐÁ'], ['haianh@example.test', 'H'], ['  (Admin)  ', 'SG'],
  ]) {
    name.value = value;
    assert.equal(layout.initials.value, expected, value);
  }
});

function loadHero() {
  const timeouts = new Map(), intervals = new Map(), frames = new Map(), routes = [], captures = new Set();
  let nextTimer = 0, renderedOffset = null;
  const home = loadHome(() => {}, {
    router: { push: route => routes.push(route) },
    globals: {
      document: { hidden: false },
      window: { getComputedStyle: () => ({ transform: renderedOffset == null ? 'none' : `matrix(1,0,0,1,${renderedOffset},0)` }) },
      DOMMatrixReadOnly: class { constructor(value) { this.m41 = Number(value.slice(7, -1).split(',')[4]); } },
      setTimeout: callback => { const id = ++nextTimer; timeouts.set(id, callback); return id; },
      clearTimeout: id => timeouts.delete(id),
      setInterval: callback => { const id = ++nextTimer; intervals.set(id, callback); return id; },
      clearInterval: id => intervals.delete(id),
      requestAnimationFrame: callback => { const id = ++nextTimer; frames.set(id, callback); return id; },
      cancelAnimationFrame: id => frames.delete(id),
    },
    expose: ['heroSlides', 'currentIndex', 'activeSlide', 'isHeroAnimating', 'isTransitioning', 'isDragging', 'dragMoved', 'trackOffset', 'heroTrack', 'heroViewport', 'slideWidth', 'heroGap', 'onPointerDown', 'onPointerMove', 'onPointerUp', 'onPointerCancel', 'onHeroClickCapture', 'handleSlideClick', 'nextSlide', 'prevSlide', 'handleTransitionComplete', 'heroMotionPaused', 'onHeroEnter', 'onHeroFocusIn', 'toggleHeroMotion', 'outgoingHeroIndex'],
  });
  home.heroViewport.value = {
    querySelectorAll: () => [],
    setPointerCapture: id => captures.add(id),
    hasPointerCapture: id => captures.has(id),
    releasePointerCapture: id => captures.delete(id),
  };
  home.heroTrack.value = { offsetHeight: 560 };
  const pointer = (x, extra = {}) => ({
    button: 0, isPrimary: true, pointerId: 1, pointerType: 'mouse', clientX: x, clientY: 200,
    target: { closest: () => null }, cancelable: true, preventDefault() {}, ...extra,
  });
  const flushFrames = () => {
    const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback());
  };
  return { home, pointer, captures, routes, frames, timeouts, intervals, flushFrames, setRenderedOffset: value => { renderedOffset = value; } };
}

test('hero play control resumes autoplay while that control has keyboard focus', () => {
  const { home, intervals } = loadHero();
  home.heroMotionPaused.value = true;
  home.onHeroEnter();
  home.onHeroFocusIn();
  home.toggleHeroMotion();
  assert.equal(home.heroMotionPaused.value, false);
  assert.equal(intervals.size, 1);
  home.toggleHeroMotion();
  assert.equal(home.heroMotionPaused.value, true);
  assert.equal(intervals.size, 0);
});

test('hero retains its outgoing slide through transition completion and interrupted dragging', async () => {
  const { home, pointer } = loadHero();
  home.currentIndex.value = 5;
  home.nextSlide(true);
  assert.equal(home.outgoingHeroIndex.value, 5);
  assert.equal(home.currentIndex.value, 6);
  home.onPointerDown(pointer(600));
  home.onPointerMove(pointer(400));
  home.onPointerUp(pointer(400));
  assert.equal(home.outgoingHeroIndex.value, 5);
  await home.handleTransitionComplete();
  assert.equal(home.outgoingHeroIndex.value, null);
});

test('hero mouse drag follows the pointer, changes one slide and suppresses its release click', () => {
  const { home, pointer, captures, routes } = loadHero();
  const initialOffset = home.trackOffset.value;
  home.onPointerDown(pointer(600));
  assert.equal(captures.size, 0);
  home.onPointerMove(pointer(430));
  assert.equal(home.trackOffset.value, initialOffset - 170);
  assert.equal(captures.has(1), true);
  home.onPointerUp(pointer(430));
  assert.equal(home.currentIndex.value, 5);
  assert.equal(home.isDragging.value, false);
  assert.equal(home.isHeroAnimating.value, true);
  assert.equal(captures.size, 0);
  home.nextSlide(true);
  assert.equal(home.currentIndex.value, 5);
  let blocked = false;
  home.onHeroClickCapture({ preventDefault() { blocked = true; }, stopPropagation() {} });
  home.handleSlideClick(5, home.heroSlides[1]);
  assert.equal(blocked, true);
  assert.equal(routes.length, 0);
});

test('hero click still navigates and a touch scroll or cancelled drag keeps the current slide', () => {
  const { home, pointer, routes, captures } = loadHero();
  home.onPointerDown(pointer(600));
  home.onPointerUp(pointer(600));
  home.handleSlideClick(4, home.heroSlides[0]);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].path, '/products');
  home.onPointerDown(pointer(600, { pointerType: 'touch' }));
  home.onPointerMove(pointer(610, { pointerType: 'touch', clientY: 360 }));
  assert.equal(captures.size, 0);
  home.onPointerCancel(pointer(610));
  assert.equal(home.currentIndex.value, 4);
  assert.equal(home.isHeroAnimating.value, false);
  home.onPointerDown(pointer(600));
  home.onPointerMove(pointer(400));
  home.onPointerCancel(pointer(400));
  assert.equal(home.currentIndex.value, 4);
  assert.equal(home.isDragging.value, false);
});

test('hero grabs the rendered position during a transition and ignores other pointer ids', () => {
  const { home, pointer, setRenderedOffset } = loadHero();
  home.nextSlide(true);
  const halfway = home.trackOffset.value + 300;
  setRenderedOffset(halfway);
  home.onPointerDown(pointer(600));
  assert.equal(home.trackOffset.value, halfway);
  assert.equal(home.isHeroAnimating.value, false);
  home.onPointerMove(pointer(200, { pointerId: 2 }));
  home.onPointerUp(pointer(200, { pointerId: 2 }));
  assert.equal(home.isDragging.value, true);
  assert.equal(home.trackOffset.value, halfway);
  home.onPointerMove(pointer(520));
  assert.equal(home.trackOffset.value, halfway - 80);
  home.onPointerUp(pointer(520));
  assert.equal(home.currentIndex.value, 6);
});

test('hero clone reset flushes the non-animated position before enabling transitions again', async () => {
  const { home, frames, flushFrames } = loadHero();
  home.currentIndex.value = 8;
  home.isHeroAnimating.value = true;
  let measuredAfterUpdate = false;
  home.heroTrack.value = { get offsetHeight() {
    measuredAfterUpdate = home.currentIndex.value === 4 && home.isTransitioning.value === false;
    return 560;
  } };
  const finished = home.handleTransitionComplete();
  assert.equal(home.currentIndex.value, 4);
  assert.equal(home.isTransitioning.value, false);
  assert.equal(frames.size, 0);
  await finished;
  assert.equal(measuredAfterUpdate, true);
  assert.equal(frames.size, 1);
  assert.equal(home.isHeroAnimating.value, true);
  flushFrames();
  assert.equal(home.isHeroAnimating.value, false);
  assert.equal(home.isTransitioning.value, true);
  home.prevSlide(true);
  await home.handleTransitionComplete();
  flushFrames();
  assert.equal(home.currentIndex.value, 7);
});

test('auth input focus uses its wrapper ring and admin primary actions share the red accent', () => {
  const storefront = fs.readFileSync(path.join(root, 'src/assets/storefront.css'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'src/views/admin/admin-theme.css'), 'utf8');
  assert.match(storefront, /\.in-wrap \.auth-input:focus-visible\s*\{\s*outline: none;\s*box-shadow: none;/);
  assert.match(storefront, /\.in-wrap:focus-within\s*\{\s*border-color: var\(--sg-red\)/);
  assert.match(admin, /:is\(\.btn-dark, \.btn-primary\)\s*\{\s*background: var\(--admin-accent\)/);
});

test('promotion tables fit their workspace and label every field on narrow screens', () => {
  const css = fs.readFileSync(path.join(root, 'src/views/admin/admin-theme.css'), 'utf8');
  assert.match(css, /\.promotion-table\s*\{\s*width: 100%;\s*min-width: 0;\s*table-layout: fixed;/);
  assert.match(css, /\.promotion-time\s*\{\s*min-width: 0;/);
  assert.doesNotMatch(css, /\.promotion-table\s*\{[^}]*overflow(?:-x)?:\s*hidden/);
  const pages = [
    ['DiscountsPage.vue', ['Mã', 'Tên chương trình', 'Giá trị', 'Thời gian', 'Trạng thái', 'Thao tác']],
    ['VariantDiscountsPage.vue', ['Hình ảnh', 'Sản phẩm', 'Màu áp dụng', 'Giá trị', 'Thời gian', 'Trạng thái', 'Thao tác']],
  ];
  for (const [filename, labels] of pages) {
    const source = fs.readFileSync(path.join(root, 'src/views/admin/pages', filename), 'utf8');
    const template = parse(source).descriptor.template.content;
    assert.equal((template.match(/<col(?:\s[^>]*)?>/g) || []).length, labels.length);
    for (const label of labels) assert.ok(template.includes(`data-label="${label}"`), `${filename} labels ${label}`);
    assert.match(template, /class="promotion-actions"/);
    assert.match(template, /role="switch"/);
  }
});
test('home category counts stay numeric when categories are missing or empty', () => {
  const home = loadHome();
  const training = () => home.categoryCards.value.find(card => card.key === 'training');
  assert.equal(training().count, '0 sản phẩm');
  home.allProducts.value = [{ id_category: null, category_name: 'Other' }];
  assert.equal(training().count, '0 sản phẩm');
  home.allProducts.value = [{ id_category: 9, sport: 'Training' }];
  assert.equal(training().count, '1 sản phẩm');
  home.categoriesFromApi.value = [{ id_category: 9, category_name: 'Training' }];
  home.allProducts.value = [{ id_category: 9 }, { id_category: 9 }];
  assert.equal(training().count, '2 sản phẩm');
});
test('newsletter preserves the email when the server cannot accept its request', async () => {
  const notices = [];
  const home = loadHome(notice => notices.push(notice), { apiClient: { post: async () => { throw new Error('Email unavailable'); } } });
  home.email.value = 'invalid'; await home.subscribe();
  assert.equal(notices.at(-1).type, 'warning');
  home.email.value = 'test@example.com'; await home.subscribe();
  assert.equal(notices.at(-1).type, 'error');
  assert.equal(home.email.value, 'test@example.com');
  assert.equal(home.subscribing.value, false);
  assert.equal(notices.some(notice => notice.type === 'success'), false);
});

test('newsletter submits once and clears its field after server acceptance', async () => {
  const notices = [], requests = [];
  let accept;
  const home = loadHome(notice => notices.push(notice), { apiClient: { post: (url, body) => {
    requests.push({ url, email: body.email });
    return new Promise(resolve => { accept = resolve; });
  } } });
  home.email.value = ' member@example.test ';
  const first = home.subscribe();
  await home.subscribe();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/newsletter');
  assert.equal(requests[0].email, 'member@example.test');
  assert.equal(home.subscribing.value, true);
  accept({ success: true, message: 'Request accepted' });
  await first;
  assert.equal(home.email.value, '');
  assert.equal(home.subscribing.value, false);
  assert.equal(notices.at(-1).type, 'success');
});

function loadContact(api, notices) {
  return load('src/views/ContactView.vue', {
    '../services/apiClient': { api },
    '../stores/uiStore': { notify: notice => notices.push(notice) },
  }, {}, ['form', 'submitting', 'handleSubmit']);
}

test('contact form keeps its message on rejection and validates its contact information', async () => {
  const notices = [], requests = [];
  const contact = loadContact({ post: async (url, body) => { requests.push(url); return { success: false, message: 'Email unavailable' }; } }, notices);
  Object.assign(contact.form, { name: 'Customer', contact: 'invalid', message: 'Please help with sizing.' });
  await contact.handleSubmit();
  assert.equal(requests.length, 0);
  assert.equal(notices.at(-1).type, 'warning');
  contact.form.contact = 'customer@example.test';
  await contact.handleSubmit();
  assert.equal(requests[0], '/contact');
  assert.equal(notices.at(-1).type, 'error');
  assert.equal(contact.form.message, 'Please help with sizing.');
  assert.equal(contact.submitting.value, false);
});

test('contact form waits for a real response and prevents duplicate submissions', async () => {
  const notices = [], requests = [];
  let accept;
  const contact = loadContact({ post: (url, body) => {
    requests.push({ url, ...body });
    return new Promise(resolve => { accept = resolve; });
  } }, notices);
  Object.assign(contact.form, { name: ' Customer ', contact: ' 0901234567 ', message: ' Help with sizing. ' });
  const first = contact.handleSubmit();
  await contact.handleSubmit();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].message, 'Help with sizing.');
  assert.equal(contact.submitting.value, true);
  assert.equal(notices.length, 0);
  accept({ success: true, message: 'Accepted' });
  await first;
  assert.equal(contact.form.name, '');
  assert.equal(contact.form.contact, '');
  assert.equal(contact.form.message, '');
  assert.equal(contact.submitting.value, false);
  assert.equal(notices.at(-1).type, 'success');
});
