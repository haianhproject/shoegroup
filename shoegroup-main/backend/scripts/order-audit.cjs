// Mục đích: Kiểm thử chống trùng đơn, rollback, thanh toán, giao hàng, tác vụ tự động và SSE của Spring.
const assert = require('node:assert/strict');
const { token } = require('../legacy-express/test/helpers/audit-db.cjs');

module.exports = async function orderAudit({ api, pool, admin, users, check, fixture, stock, stopLegacy }) {
  const create = (item, extra = {}, key, port = 5194) => api('/orders', { port, method: 'POST', body: { addressId: users[0].addressId, paymentMethod: 'COD', items: [item], ...extra }, headers: key ? { 'Idempotency-Key': key } : {} });
  const change = (id, status, reason = 'Audit status') => api(`/orders/${id}/status`, { user: admin, method: 'PUT', body: { status, reason } });
  const rows = async query => (await pool.request().query(query)).recordset;
  const state = async id => (await rows(`SELECT * FROM Orders WHERE OrderID=${Number(id)}`))[0];
  const ok = response => { assert.equal(response.status, 200, JSON.stringify(response)); return response.data; };
  const waitFor = async predicate => { const until = Date.now() + 15000; do { if (await predicate()) return; await new Promise(r => setTimeout(r, 150)); } while (Date.now() < until); throw Error('Native scheduler did not complete'); };
  await check('native concurrent checkout key and legacy replay create exactly one order', async () => {
    const item = await fixture(10), key = `native-concurrent-${Date.now()}`;
    const responses = await Promise.all(Array.from({ length: 8 }, () => create(item, {}, key)));
    responses.forEach(ok); assert.equal(new Set(responses.map(r => r.data.orderId)).size, 1);
    assert.equal(await stock(item), 10);
    const replay = ok(await create(item, {}, key, 5195)); assert.equal(replay.orderId, responses[0].data.orderId);
    const oldKey = `legacy-first-${Date.now()}`, original = ok(await create(item, {}, oldKey, 5195));
    assert.equal(ok(await create(item, {}, oldKey)).orderId, original.orderId);
    assert.equal((await create(item, { note: 'changed' }, key)).status, 409);
  });
  await check('native checkout rolls back order details and replay record after SQL failure', async () => {
    const item = await fixture(5), key = `native-rollback-${Date.now()}`;
    await rows(`CREATE TRIGGER dbo.NativeAuditReject ON dbo.OrderDetails AFTER INSERT AS BEGIN IF EXISTS(SELECT 1 FROM inserted WHERE ProductID=${Number(item.product_id)}) THROW 51000,'Audit rollback',1; END`);
    try {
      assert.equal((await create(item, {}, key)).status, 500);
      assert.equal((await rows(`SELECT COUNT(*) AS n FROM OrderDetails WHERE ProductID=${Number(item.product_id)}`))[0].n, 0);
      assert.equal((await rows(`SELECT COUNT(*) AS n FROM CheckoutRequests WHERE IdempotencyKey='${key}'`))[0].n, 0);
      assert.equal(await stock(item), 5);
    } finally { await rows('DROP TRIGGER dbo.NativeAuditReject'); }
    ok(await create(item, {}, key));
  });
  await check('native COD lifecycle collects once and recognizes revenue only after hold', async () => {
    const item = await fixture(5), id = ok(await create(item)).orderId;
    assert.equal(await stock(item), 5);
    ok(await change(id, 'Đã xác nhận')); ok(await change(id, 'Đã xác nhận')); assert.equal(await stock(item), 4);
    ok(await change(id, 'Đang vận chuyển')); ok(await change(id, 'Đã giao hàng thành công'));
    assert.equal((await state(id)).PaymentStatus, 'Đã thanh toán');
    assert.equal((await rows(`SELECT COUNT(*) AS n FROM PaymentTransactions WHERE OrderID=${id} AND Provider='COD_COLLECTION'`))[0].n, 1);
    ok(await api(`/orders/${id}/receive`, { method: 'PUT', body: {} }));
    assert.equal((await state(id)).IsCountedAsRevenue, false);
    await rows(`UPDATE Orders SET RevenueEligibleDate=DATEADD(day,-1,GETDATE()) WHERE OrderID=${id}`);
    await waitFor(async () => (await state(id)).IsCountedAsRevenue);
    assert.equal((await change(id, 'Đã hủy')).status, 409); assert.equal(await stock(item), 4);
  });
  await check('native transfer ownership and cancellation request a refund without inventing payout', async () => {
    const item = await fixture(4), id = ok(await create(item, { paymentMethod: 'BANK' })).orderId;
    assert.equal((await change(id, 'Đã xác nhận')).status, 409);
    assert.equal((await api(`/orders/${id}/payment`, { user: users[1], method: 'PUT', body: { payment_status: 'Đã thanh toán' } })).status, 403);
    ok(await api(`/orders/${id}/payment`, { method: 'PUT', body: { payment_status: 'Chờ thanh toán' } }));
    ok(await change(id, 'Đã xác nhận')); assert.equal(await stock(item), 3);
    ok(await change(id, 'Đã hủy', 'Customer cancellation')); ok(await change(id, 'Đã hủy'));
    assert.equal(await stock(item), 4); assert.equal((await state(id)).PaymentStatus, 'Chờ hoàn tiền');
    const refunds = await rows(`SELECT Status,SignatureValid FROM PaymentTransactions WHERE OrderID=${id} AND Provider='MANUAL_REFUND'`);
    assert.equal(refunds.length, 1); assert.equal(refunds[0].Status, 'PENDING'); assert.equal(refunds[0].SignatureValid, false);
    assert.equal((await api(`/orders/${id}/payment`, { user: admin, method: 'PUT', body: { payment_status: 'Hoàn tiền' } })).status, 409);
  });
  await check('native failed delivery restores on warehouse return but never on lost shipment', async () => {
    const item = await fixture(4), id = ok(await create(item)).orderId;
    ok(await change(id, 'Đã xác nhận')); ok(await change(id, 'Đang vận chuyển'));
    ok(await change(id, 'Về kho', 'Tai nạn vận chuyển')); ok(await change(id, 'Về kho', 'Tai nạn vận chuyển'));
    assert.equal(await stock(item), 4);
    ok(await change(id, 'Đang vận chuyển')); assert.equal(await stock(item), 3);
    ok(await change(id, 'Đã hủy', 'Thất lạc hàng trong vận chuyển')); assert.equal(await stock(item), 3);
    assert.equal((await state(id)).StockIssueStatus, 'LOST_IN_TRANSIT');
    assert.equal((await change(id, 'Về kho')).status, 409);
    assert.equal((await rows(`SELECT COUNT(*) AS n FROM Notifications WHERE RelatedID=${id}`))[0].n, 3);
  });
  await check('native order address can change once and identical replay stays unchanged', async () => {
    const item = await fixture(), id = ok(await create(item)).orderId;
    const add = async line => (await api('/addresses', { method: 'POST', body: { recipient: 'Audit customer', phone: '0912345678', province: 'Hà Nội', district: 'Hai Bà Trưng', ward: 'Bạch Mai', line } })).data.id;
    const a = await add('Native address A'), b = await add('Native address B');
    const update = aid => api(`/orders/${id}/address`, { method: 'PUT', body: { addressId: aid } });
    assert.equal(ok(await update(a)).addressChanged, true); assert.equal(ok(await update(a)).unchanged, true);
    const rejected = await update(b); assert.equal(rejected.status, 409); assert.equal(rejected.data.code, 'ADDRESS_CHANGE_LIMIT_REACHED');
    assert.equal((await state(id)).AddressID, a);
  });
  await check('native scheduler cancels overdue reserved orders exactly once', async () => {
    const item = await fixture(3), id = ok(await create(item)).orderId;
    ok(await change(id, 'Đã xác nhận')); assert.equal(await stock(item), 2);
    await rows(`UPDATE Orders SET AutoCancelDeadline=DATEADD(minute,-1,GETDATE()) WHERE OrderID=${id}`);
    await waitFor(async () => (await state(id)).Status === 'Đã hủy');
    await new Promise(r => setTimeout(r, 1300)); assert.equal(await stock(item), 3);
    assert.equal((await rows(`SELECT COUNT(*) AS n FROM OrderStatusHistory WHERE OrderID=${id} AND NewStatus=N'Đã hủy'`))[0].n, 1);
  });
  await check('native coupon redemption serializes last use and promotion quota restores once', async () => {
    const item = await fixture(10), code = `NATIVE${Date.now()}`;
    await rows(`INSERT Coupons(CouponCode,CouponName,DiscountType,DiscountValue,DiscountPercent,UsageLimit,UsedCount,ExpiryDate,IsActive) VALUES('${code}',N'Audit',N'Phần trăm',10,10,1,0,'2099-01-01',1)`);
    const responses = await Promise.all([create(item, { couponCode: code }), create(item, { couponCode: code })]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200,409], JSON.stringify(responses));
    assert.equal((await rows(`SELECT UsedCount FROM Coupons WHERE CouponCode='${code}'`))[0].UsedCount, 1);
    const promo = await api('/variantDiscounts', { user: admin, method: 'POST', body: { product_id: item.product_id, variant_id: item.product_variant_id, type: 'percent', value: 10, quantity: 2 } });
    assert.equal(promo.status, 201, JSON.stringify(promo));
    const id = ok(await create(item)).orderId;
    assert.equal((await rows(`SELECT UsedCount FROM VariantDiscounts WHERE VariantDiscountID=${promo.data.id}`))[0].UsedCount, 1);
    ok(await change(id, 'Đã hủy')); ok(await change(id, 'Đã hủy'));
    assert.equal((await rows(`SELECT UsedCount FROM VariantDiscounts WHERE VariantDiscountID=${promo.data.id}`))[0].UsedCount, 0);
  });
  await check('Spring checkout and events remain available after Express is stopped', async () => {
    await stopLegacy();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const stream = await fetch('http://127.0.0.1:5194/api/admin/events', { headers: { Authorization: `Bearer ${token(admin)}` }, signal: controller.signal });
      assert.equal(stream.status, 200);
      const reader = stream.body.getReader(), decoder = new TextDecoder();
      const item = await fixture(2), id = ok(await create(item, {}, `standalone-${Date.now()}`)).orderId;
      ok(await change(id, 'Đã xác nhận')); assert.equal(await stock(item), 1);
      let events = '';
      while (!events.includes('event:order.updated') || !events.includes(`"orderId":${id}`)) {
        const next = await reader.read(); assert.equal(next.done, false); events += decoder.decode(next.value, { stream: true });
      }
      ok(await api('/orders', { user: admin })); ok(await api('/health', { user: null }));
      assert.equal((await api('/no-such-api', { user: admin })).status, 404);
    } finally { clearTimeout(timeout); controller.abort(); }
  });
};
