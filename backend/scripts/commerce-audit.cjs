// Mục đích: Kiểm thử API sản phẩm, khuyến mãi, khách hàng và báo cáo Spring với dữ liệu SQL riêng.
const assert = require('node:assert/strict');

module.exports = async function commerceAudit({ api, pool, admin, users, check }) {
  let product, variant;
  const call = (route, method, body) => api(route, { user: admin, method, body });
  await check('native product CRUD preserves optimistic stock versions and rollback', async () => {
    const colors = (await call('/colors', 'GET')).data;
    const color = colors.find(row => row.name === 'Black' && row.active !== false);
    let sizes = (await call('/sizes', 'GET')).data;
    if (!sizes.some(row => row.name === '42' && row.standard === 'EU')) {
      assert.equal((await call('/sizes', 'POST', { name: '42', standard: 'EU', active: true })).status, 200);
      sizes = (await call('/sizes', 'GET')).data;
    }
    const size = sizes.find(row => row.name === '42' && row.standard === 'EU');
    assert.ok(color && size);
    const payload = { name: 'Native commerce shoe', price: 100000, active: true, category_id: 1, brand_id: 1,
      variants: [{ color_id: color.id, size_id: size.id, price: 100000, stock: 5 }],
      colors: [{ color_id: color.id, name: 'Black', image: 'https://example.test/black.png' }] };
    const created = await call('/products', 'POST', payload);
    assert.equal(created.status, 200, JSON.stringify(created)); product = created.data.ProductID;
    const read = (await call('/products', 'GET')).data.find(p => p.id === product);
    variant = read.variants[0].id;
    assert.equal(read.colors[0].image, payload.colors[0].image);
    const edit = { ...payload, name: 'Native updated', variants: [{ ...payload.variants[0], id: variant, stock: 6, version: read.variants[0].version }] };
    assert.equal((await call(`/products/${product}`, 'PUT', edit)).status, 200);
    assert.equal((await call(`/products/${product}`, 'PUT', { ...edit, name: 'Must rollback' })).status, 409);
    const updated = (await call('/products', 'GET')).data.find(p => p.id === product);
    assert.equal(updated.name, 'Native updated'); assert.equal(updated.stock, 6);
    assert.equal((await api('/products', { method: 'POST', body: payload })).status, 403);
    assert.equal((await call(`/products/${product}`, 'DELETE')).data.mode, 'soft');
    assert.equal((await call(`/products/${product}/restore`, 'PUT', {})).status, 200);
    const restored = (await call('/products', 'GET')).data.find(p => p.id === product).variants[0];
    assert.equal(restored.active, false);
    assert.equal((await call(`/products/${product}/variants/${variant}/status`, 'PUT', { active: true, version: restored.version })).status, 200);
  });
  await check('native discount scopes serialize overlaps and validate dates', async () => {
    const payload = { product_id: product, variant_id: variant, type: 'percent', value: 10, quantity: 20, start_date: '2026-01-01', end_date: '2099-01-01', scope: 'color' };
    const responses = await Promise.all([call('/variantDiscounts', 'POST', payload), call('/variantDiscounts', 'POST', payload)]);
    assert.deepEqual(responses.map(r => r.status).sort(), [201, 409], JSON.stringify(responses));
    const id = responses.find(r => r.status === 201).data.id;
    assert.equal((await call(`/variantDiscounts/${id}`, 'PUT', { ...payload, value: 20 })).status, 200);
    assert.equal((await call('/variantDiscounts', 'POST', { ...payload, end_date: '2026-02-30' })).status, 400);
    assert.equal((await call(`/variantDiscounts/${id}`, 'DELETE')).status, 200);
    const fixed = await call('/variantDiscounts', 'POST', { ...payload, type: 'fixed', value: 100000 });
    assert.equal(fixed.status, 400, JSON.stringify(fixed));
    assert.equal((await call(`/products/${product}?hard=1`, 'DELETE')).status, 409);
  });
  await check('native coupon writes preserve alias fields and reject invalid ranges', async () => {
    const coupon = { code: 'SPRING_NATIVE', name: 'Native coupon', type: 'percent', value: 10, limit: 10, start_date: '2026-01-01', expiry: '2099-01-01' };
    assert.equal((await call('/discounts', 'POST', coupon)).status, 200);
    const row = (await call('/discounts', 'GET')).data.find(c => c.code === coupon.code);
    assert.equal(row.value, 10);
    assert.equal((await call(`/discounts/${row.id}`, 'PUT', { ...coupon, value: 15 })).status, 200);
    assert.equal((await call('/discounts', 'POST', { ...coupon, value: 101 })).status, 400);
    assert.equal((await call(`/discounts/${row.id}`, 'DELETE')).status, 200);
  });
  await check('native customers keep walk-ins anonymous and email creates one account', async () => {
    const before = (await pool.request().query('SELECT COUNT(*) AS n FROM Users')).recordset[0].n;
    const walkin = await call('/customers', 'POST', { name: 'Native walk-in', phone: '0912345678' });
    assert.equal(walkin.status, 200); assert.equal(walkin.data.UserID, null); assert.equal(walkin.data.is_walkin, true);
    assert.equal((await pool.request().query('SELECT COUNT(*) AS n FROM Users')).recordset[0].n, before);
    const body = { name: 'Native member', phone: '0912345678', email: 'native-member@example.test', password: 'Native-password-2026' };
    const a = await call('/customers', 'POST', body), b = await call('/customers', 'POST', body);
    assert.equal(a.status, 200); assert.equal(b.data.UserID, a.data.UserID);
    const login = await api('/login', { user: null, method: 'POST', body: { email: body.email, password: body.password } });
    assert.equal(login.status, 200);
    assert.equal((await api(`/customers/${users[1].id}/orders`)).status, 403);
  });
  await check('native order/customer/report reads match SQL totals and ownership', async () => {
    for (const route of ['/orders', '/customers', `/customers/${users[0].id}/orders`, `/customers/${users[0].id}/notifications`, '/chart-data', '/revenue-by-product', '/v2/dashboard/summary', `/v2/orders?userId=${users[0].id}`]) {
      const native = await call(route, 'GET');
      assert.equal(native.status, 200, `${route}: ${JSON.stringify(native)}`);
    }
    const totals = (await pool.request().query('SELECT (SELECT COUNT(*) FROM Orders) AS totalOrders,(SELECT COUNT(*) FROM Products WHERE IsActive=1) AS activeProducts,(SELECT COUNT(*) FROM Users WHERE IsActive=1) AS activeUsers')).recordset[0];
    const summary = (await call('/v2/dashboard/summary', 'GET')).data;
    for (const [key, value] of Object.entries(totals)) assert.equal(summary[key], value, key);
    const orderIds = (await pool.request().query('SELECT OrderID FROM Orders ORDER BY OrderID')).recordset.map(row => row.OrderID);
    const orders = (await call('/orders', 'GET')).data;
    assert.deepEqual(orders.map(order => order.id).sort((a, b) => a - b), orderIds);
    const own = await api('/v2/orders');
    assert.equal(own.status, 200);
    assert.ok(own.data.data.every(order => order.user_id === users[0].id));
    const ownCount = (await pool.request().query('SELECT COUNT(*) AS n FROM Orders WHERE UserID=' + Number(users[0].id))).recordset[0].n;
    assert.equal(own.data.pagination.total, ownCount);
    assert.equal((await api(`/customers/${users[1].id}/orders`)).status, 403);
    assert.equal((await call('/v2/orders', 'GET')).status, 200);
  });
};
