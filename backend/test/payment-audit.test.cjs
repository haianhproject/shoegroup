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

test('payment: customer bank confirmation completes payment immediately', async () => {
  const h = harness(({ query }) => query.includes('SELECT OrderID, UserID') ? { recordset: [{ ...unpaidOrder }] } : undefined);
  const res = await h.request('put /api/orders/:id/payment', { params: { id: '1' }, auth: { sub: 2, role: 'Customer' }, body: { payment_status: 'Đã thanh toán', amount: 1 } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.payment_status, 'Đã thanh toán');
  assert.equal(h.calls.some(c => /CUSTOMER_CONFIRMED[\s\S]*SUCCESS/s.test(c.query)), true);
  assert.equal(vm.runInContext('isPaidPaymentStatus("Đã thanh toán")', h.context), true);
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

module.exports = { harness, unpaidOrder };
