const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const validation = require('../src/validation');

// Execute the real route handlers in isolation. SQL is a scripted test double;
// these tests verify HTTP/domain behavior, not SQL Server locking semantics.
function harness(answer = () => ({ recordset: [], rowsAffected: [1] })) {
  const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const routes = new Map();
  const calls = [];
  class Request {
    constructor() { this.values = {}; }
    input(name, _type, value) { this.values[name] = value; return this; }
    async query(query) {
      const call = { query, values: { ...this.values } };
      calls.push(call);
      return answer(call, calls) || { recordset: [], rowsAffected: [1] };
    }
  }
  const sql = {
    Request, Transaction: class {
      async begin() {} async commit() {} async rollback() {}
    },
    ISOLATION_LEVEL: { SERIALIZABLE: 4 }, Int: 'int', Bit: 'bit',
    Decimal: () => 'decimal', NVarChar: () => 'nvarchar', VarChar: () => 'varchar',
  };
  const context = vm.createContext({
    ...validation, sql, pool: { request: () => new Request() }, poolConnect: Promise.resolve(),
    app: Object.fromEntries(['get', 'post', 'put'].map(method => [method, (url, handler) => routes.set(`${method} ${url}`, handler)])),
    cleanAddressText: (value, max = 255) => String(value ?? '').trim().slice(0, max),
    normalizeOrderStatus: value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim(),
    insertOrderHistory: async () => {}, console, Date,
  });
  const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
  vm.runInContext(section('const PAYMENT_STATUSES =', 'async function insertOrderHistory'), context);
  vm.runInContext(section('app.put("/api/orders/:id/payment"', '// ================= CAC API SAN PHAM'), context);
  vm.runInContext(section('const RETURN_STATUS_ALIASES =', '// ================= API MAU SAC'), context);
  return {
    calls, context,
    async request(route, req) {
      const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
      await routes.get(route)({ params: {}, query: {}, body: {}, ...req }, res);
      return res;
    },
  };
}

const unpaidOrder = { OrderID: 1, UserID: 2, PaymentMethod: 'Chuyển khoản ngân hàng', PaymentStatus: 'Chưa thanh toán', Status: 'Chờ xác nhận', TotalAmount: 500000 };

test('payment: customer declaration never becomes collected money or successful payment', async () => {
  const h = harness(({ query }) => query.includes('SELECT OrderID, UserID') ? { recordset: [{ ...unpaidOrder }] } : undefined);
  const res = await h.request('put /api/orders/:id/payment', { params: { id: '1' }, auth: { sub: 2, role: 'Customer' }, body: { payment_status: 'Đã thanh toán', amount: 1 } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.payment_status, 'Chờ thanh toán');
  assert.equal(h.calls.some(c => /VALUES.*SUCCESS/s.test(c.query)), false);
  assert.equal(vm.runInContext('isPaidPaymentStatus("Chờ thanh toán")', h.context), false);
});

test('payment: customer cannot declare a cancelled order paid', async () => {
  const h = harness(({ query }) => query.includes('SELECT OrderID, UserID') ? { recordset: [{ ...unpaidOrder, Status: 'Đã hủy' }] } : undefined);
  const res = await h.request('put /api/orders/:id/payment', { params: { id: '1' }, auth: { sub: 2, role: 'Customer' }, body: { payment_status: 'Đã thanh toán' } });
  assert.equal(res.statusCode, 409);
  assert.equal(h.calls.length, 1);
});

test('payment: ownership is checked before a mutation', async () => {
  const h = harness(() => ({ recordset: [{ ...unpaidOrder }] }));
  const res = await h.request('put /api/orders/:id/payment', { params: { id: '1' }, auth: { sub: 3, role: 'Customer' }, body: { payment_status: 'Đã thanh toán' } });
  assert.equal(res.statusCode, 403);
  assert.equal(h.calls.length, 1);
});

test('payment: admin cannot mark a paid order refunded without a refund transaction', async () => {
  const h = harness(() => ({ recordset: [{ ...unpaidOrder, PaymentStatus: 'Đã thanh toán' }] }));
  const res = await h.request('put /api/orders/:id/payment', { params: { id: '1' }, auth: { sub: 1, role: 'Admin' }, body: { payment_status: 'Hoàn tiền' } });
  assert.equal(res.statusCode, 409);
  assert.equal(h.calls.length, 1);
});

test('returns: repeated completion is immutable and cannot cancel an already refunded payment', async () => {
  const h = harness(({ query }) => {
    if (query.includes('SELECT OrderID FROM Returns')) return { recordset: [{ OrderID: 1 }] };
    if (query.includes('SELECT r.ReturnID, r.OrderID')) return { recordset: [{ ReturnID: 4, OrderID: 1, Status: 'Đã hoàn tất', RefundAmount: 500000, RefundedAt: new Date(), OrderStatus: 'Đã hoàn tất trả hàng', ReturnType: 'CUSTOMER' }] };
    if (query.includes('SELECT UserID, PaymentMethod')) return { recordset: [{ ...unpaidOrder, PaymentStatus: 'Hoàn tiền' }] };
    if (query.includes('SELECT RestockedAt')) return { recordset: [{ RestockedAt: new Date() }] };
    return { recordset: [], rowsAffected: [1] };
  });
  const res = await h.request('put /api/returns/:id/status', { params: { id: '4' }, auth: { sub: 1, role: 'Admin' }, body: { status: 'Đã hoàn tất', refund_amount: 1 } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.refund_amount, 500000);
  assert.equal(h.calls.some(c => /UPDATE|INSERT/.test(c.query)), false);
});

test('wallet: sub-cent withdrawal must not create a zero-value transaction', async () => {
  const h = harness(({ query }) => query.includes('SELECT Balance') ? { recordset: [{ Balance: 100000 }] } : { recordset: [{ WithdrawalID: 1 }], rowsAffected: [1] });
  const res = await h.request('post /api/wallet/withdrawals', { auth: { sub: 2, role: 'Customer' }, body: { method: 'MOMO', amount: 0.001, destination: '0901234567' } });
  assert.equal(res.statusCode, 400);
  assert.equal(h.calls.length, 0);
});

test('wallet: Visa destination is fully masked except its last four digits', async () => {
  const h = harness(({ query }) => query.includes('FROM ShoeGroupWalletWithdrawals') ? { recordset: [{ method: 'VISA', destination: '4111111111111111' }] } : { recordset: [] });
  const res = await h.request('get /api/wallet/transactions', { auth: { sub: 2, role: 'Customer' } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.withdrawals[0].destination, '••••••••••••1111');
});

module.exports = { harness, unpaidOrder };
