// Mục đích: Chạy một sản phẩm xuyên suốt từ quản trị, POS đến đặt hàng online trên SQL kiểm thử.
const assert = require('node:assert/strict');

module.exports = async function salesDemoAudit({ api, pool, admin, users, check }) {
  const customer = users[0];
  const request = (route, method = 'GET', body, user = admin, headers = {}) => api(route, { method, body, user, headers });
  const ok = (response, status = 200) => {
    assert.equal(response.status, status, JSON.stringify(response));
    return response.data;
  };
  const stock = async variant => (await pool.request().query(`SELECT StockQuantity AS n FROM ProductVariants WHERE ProductVariantID=${Number(variant.id)}`)).recordset[0].n;
  const order = async id => (await pool.request().query(`SELECT Status,PaymentStatus,IsCountedAsRevenue,StockDeductedAt,StockRestoredAt FROM Orders WHERE OrderID=${Number(id)}`)).recordset[0];
  const change = (id, status) => request(`/orders/${id}/status`, 'PUT', { status, reason: 'Sales demo audit' });
  const checkout = (variant, quantity, extra = {}, key) => request('/orders', 'POST', {
    addressId: customer.addressId, paymentMethod: 'COD',
    items: [{ product_id: productId, product_variant_id: variant.id, quantity, price: 1 }],
    ...extra,
  }, customer, key ? { 'Idempotency-Key': key } : {});
  const suffix = Date.now();
  let productId, firstVariant, secondVariant, onlineOrderId;

  await check('DEMO create one product with two sizes, prices, images and 20 units visible to customers', async () => {
    const colors = ok(await request('/colors'));
    const sizes = ok(await request('/sizes'));
    const category = ok(await request('/categories')).find(row => row.active);
    const brand = ok(await request('/brands')).find(row => row.active);
    const color = colors.find(row => row.active);
    const size40 = sizes.find(row => row.active && row.standard === 'EU' && row.name === '40');
    const size41 = sizes.find(row => row.active && row.standard === 'EU' && row.name === '41');
    assert.ok(category && brand && color && size40 && size41);
    const created = ok(await request('/products', 'POST', {
      name: `ShoeGroup Demo Street ${suffix}`, category_id: category.id, brand_id: brand.id, active: true,
      colors: [{ id: color.id, name: color.name, image: '/img/hero-street-crimson.png' }],
      variants: [
        { color_id: color.id, size_id: size40.id, price: 300000, stock: 12, sku: `DEMO-${suffix}-40` },
        { color_id: color.id, size_id: size41.id, price: 400000, stock: 8, sku: `DEMO-${suffix}-41` },
      ],
    }));
    productId = created.ProductID;
    const product = ok(await request('/products', 'GET', undefined, null)).find(row => row.id === productId);
    assert.ok(product);
    assert.equal(product.stock, 20);
    assert.equal(product.min_price, 300000);
    assert.equal(product.max_price, 400000);
    firstVariant = product.variants.find(row => row.size === '40');
    secondVariant = product.variants.find(row => row.size === '41');
    assert.equal(firstVariant.stock, 12);
    assert.equal(secondVariant.stock, 8);
    assert.equal(product.colors[0].image, '/img/hero-street-crimson.png');
  });

  await check('DEMO POS reserves two units, validates cash, returns change and handles checkout replay once', async () => {
    let cart = ok(await request('/pos/carts', 'POST'));
    cart = ok(await request(`/pos/cart/items/${firstVariant.id}`, 'PUT', { cart_id: cart.cart_id, revision: cart.revision, quantity: 2 }));
    assert.equal(await stock(firstVariant), 10);
    const body = {
      pos_cart_id: cart.cart_id, pos_cart_revision: cart.revision,
      customer_name: 'Demo POS buyer', customer_phone: '0901234567',
      payment_method: 'Tiền mặt', payment_status: 'Đã thanh toán', status: 'Đã nhận hàng',
      total: 600000, cash_given: 1000000,
      products: [{ product_id: productId, product_variant_id: firstVariant.id, quantity: 2, price: 300000 }],
    };
    ok(await request('/orders', 'POST', { ...body, cash_given: 500000 }), 400);
    assert.equal(await stock(firstVariant), 10);
    const headers = { 'Idempotency-Key': `demo-pos-${suffix}` };
    const sale = ok(await request('/orders', 'POST', body, admin, headers));
    assert.equal(sale.changeAmount, 400000);
    assert.equal(ok(await request('/orders', 'POST', body, admin, headers)).orderId, sale.orderId);
    assert.equal(await stock(firstVariant), 10);
    assert.equal(await stock(secondVariant), 8);
    const saved = await order(sale.orderId);
    assert.equal(saved.PaymentStatus, 'Đã thanh toán');
    assert.ok(saved.StockDeductedAt);
    const receipt = ok(await request('/orders')).find(row => row.id === sale.orderId);
    assert.equal(receipt.channel, 'Offline');
    assert.equal(receipt.products[0].quantity, 2);
    assert.equal(receipt.products[0].price, 300000);
    ok(await request(`/pos/cart?cart_id=${cart.cart_id}`), 409);
    const remaining = (await pool.request().query(`SELECT COUNT(*) AS n FROM PosCartItems WHERE PosCartID=${Number(cart.cart_id)}`)).recordset[0].n;
    assert.equal(remaining, 0);
  });

  await check('DEMO the same product sells online with shipping and coupon, using the server price', async () => {
    const code = `DEMO${suffix}`;
    ok(await request('/discounts', 'POST', { code, name: 'Demo 10%', type: 'percent', value: 10, quantity: 10, expiry: '2099-12-31', active: true }));
    const quote = ok(await request('/shipping/quote', 'POST', { province: 'Thành phố Hồ Chí Minh' }, customer));
    const key = `demo-online-${suffix}`;
    const sale = ok(await checkout(firstVariant, 3, { couponCode: code }, key));
    onlineOrderId = sale.orderId;
    assert.equal(sale.subtotalAmount, 900000);
    assert.equal(sale.discountAmount, 90000);
    assert.equal(sale.shippingFee, quote.fee);
    assert.equal(sale.totalAmount, 810000 + quote.fee);
    assert.equal(await stock(firstVariant), 10);
    assert.equal(ok(await checkout(firstVariant, 3, { couponCode: code }, key)).orderId, onlineOrderId);
    const saved = (await pool.request().query(`SELECT COUNT(*) AS n,SUM(Quantity) AS quantity,MIN(UnitPrice) AS price FROM OrderDetails WHERE OrderID=${Number(onlineOrderId)}`)).recordset[0];
    assert.equal(saved.n, 1);
    assert.equal(saved.quantity, 3);
    assert.equal(saved.price, 300000);
  });

  await check('DEMO admin confirmation deducts stock once and customer order status stays synchronized', async () => {
    ok(await change(onlineOrderId, 'Đã xác nhận'));
    ok(await change(onlineOrderId, 'Đã xác nhận'));
    assert.equal(await stock(firstVariant), 7);
    const orders = ok(await request(`/customers/${customer.id}/orders`, 'GET', undefined, customer));
    const saved = orders.find(row => row.id === onlineOrderId);
    assert.equal(saved.status, 'Đã xác nhận');
    assert.equal(saved.products[0].quantity, 3);
    ok(await request(`/customers/${customer.id}/orders`, 'GET', undefined, users[1]), 403);
  });

  await check('DEMO COD delivery collects once and receiving the order starts the revenue hold', async () => {
    ok(await change(onlineOrderId, 'Đang vận chuyển'));
    ok(await change(onlineOrderId, 'Đã giao hàng thành công'));
    ok(await change(onlineOrderId, 'Đã giao hàng thành công'));
    ok(await request(`/orders/${onlineOrderId}/receive`, 'PUT', {}, customer));
    const saved = await order(onlineOrderId);
    assert.equal(saved.Status, 'Đã nhận hàng');
    assert.equal(saved.PaymentStatus, 'Đã thanh toán');
    assert.equal(saved.IsCountedAsRevenue, false);
    assert.equal(await stock(firstVariant), 7);
    const collections = (await pool.request().query(`SELECT COUNT(*) AS n FROM PaymentTransactions WHERE OrderID=${Number(onlineOrderId)} AND Provider='COD_COLLECTION'`)).recordset[0].n;
    assert.equal(collections, 1);
  });

  await check('DEMO cancelling a confirmed COD order restores exactly its reserved size once', async () => {
    const id = ok(await checkout(secondVariant, 2)).orderId;
    ok(await change(id, 'Đã xác nhận'));
    assert.equal(await stock(secondVariant), 6);
    ok(await change(id, 'Đã hủy'));
    ok(await change(id, 'Đã hủy'));
    assert.equal(await stock(secondVariant), 8);
    assert.equal(await stock(firstVariant), 7);
    assert.ok((await order(id)).StockRestoredAt);
  });

  await check('DEMO transfer ownership, cancellation and one pending refund preserve stock', async () => {
    const id = ok(await checkout(secondVariant, 1, { paymentMethod: 'BANK' })).orderId;
    ok(await change(id, 'Đã xác nhận'), 409);
    ok(await request(`/orders/${id}/payment`, 'PUT', { payment_status: 'Đã thanh toán' }, users[1]), 403);
    ok(await request(`/orders/${id}/payment`, 'PUT', { payment_status: 'Đã thanh toán' }, customer));
    ok(await change(id, 'Đã xác nhận'));
    assert.equal(await stock(secondVariant), 7);
    ok(await change(id, 'Đã hủy'));
    ok(await change(id, 'Đã hủy'));
    assert.equal(await stock(secondVariant), 8);
    assert.equal((await order(id)).PaymentStatus, 'Chờ hoàn tiền');
    const refunds = (await pool.request().query(`SELECT Status FROM PaymentTransactions WHERE OrderID=${Number(id)} AND Provider='MANUAL_REFUND'`)).recordset;
    assert.equal(refunds.length, 1);
    assert.equal(refunds[0].Status, 'PENDING');
  });

  await check('DEMO invalid quantities and overselling reject the order with all stock intact', async () => {
    const before = (await pool.request().query('SELECT COUNT(*) AS n FROM Orders')).recordset[0].n;
    for (const quantity of [0, -1, 1.5]) ok(await checkout(firstVariant, quantity), 400);
    ok(await checkout(firstVariant, 8), 409);
    assert.equal(await stock(firstVariant), 7);
    assert.equal(await stock(secondVariant), 8);
    assert.equal((await pool.request().query('SELECT COUNT(*) AS n FROM Orders')).recordset[0].n, before);
  });
};
