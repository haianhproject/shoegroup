// Integration smoke test on a restored, disposable backup only.
// DB_NAME=ShoegroupAudit_Cleanup_... node backend/legacy-express/tools/verify-schema-cleanup.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const net = require('node:net');
const sql = require('mssql');
const config = require('../src/security/env');
const jwt = require('../src/security/jwt');

async function main() {
  assert.match(config.db.database, /^ShoegroupAudit_Cleanup_[A-Za-z0-9_]+$/,
    'This test writes data: a disposable cleanup audit database is required.');
  // Refuse to address an unrelated process already serving the audit port.
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(5198, () => probe.close(resolve));
  });
  const pool = await new sql.ConnectionPool(config.db).connect();
  const results = [];
  let child;
  let logs = '';
  try {
    const admin = (await pool.request().query('SELECT TOP 1 UserID FROM Users WHERE RoleID=1 AND IsActive=1')).recordset[0];
    assert.ok(admin, 'An active admin fixture is required');
    const token = jwt.sign({ sub: admin.UserID, role: 'Admin', roleId: 1 });
    // Disable outgoing email before the child loads .env.
    child = spawn(process.execPath, ['server.js'], {
      cwd: path.resolve(__dirname, '..'), windowsHide: true,
      env: { ...process.env, PORT: '5198', DB_NAME: config.db.database,
        EMAIL_USER: '', EMAIL_PASS: '', EMAIL_FROM_ADDRESS: '', AUTH_MODE: 'enforce' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', data => { logs += data; });
    child.stderr.on('data', data => { logs += data; });
    async function api(route, method = 'GET', body) {
      const response = await fetch(`http://127.0.0.1:5198/api${route}`, {
        method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      assert.ok(response.ok, `${method} ${route}: ${response.status} ${JSON.stringify(data)}`);
      results.push({ route, method, status: response.status });
      return data;
    }
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        const response = await fetch('http://127.0.0.1:5198/api/health', { signal: AbortSignal.timeout(1000) });
        if (response.ok && logs.includes('Server dang chay tai http://localhost:5198')) { ready = true; break; }
      } catch {}
      if (child.exitCode !== null) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'API did not start');
    for (const route of ['/health', '/products', '/v2/products', '/v2/products?sort=popular',
      '/v2/products/featured', '/orders', `/v2/orders?userId=${admin.UserID}`,
      '/v2/dashboard/summary', '/accounts', '/categories', '/brands', '/materials',
      '/colors', '/sizes', '/collections', '/inventory', '/inventory/alerts',
      '/variantDiscounts', '/discounts', '/customers', '/chart-data', '/revenue-by-product',
      '/returns', '/wallet', '/wallet/transactions', '/postoffices', '/shippingmethods',
      '/addresses', `/customers/${admin.UserID}/orders`, `/customers/${admin.UserID}/notifications`]) {
      await api(route);
    }
    const stamp = Date.now();
    const product = { name: `Schema cleanup fixture ${stamp}`, price: 123000,
      parent_sku: `CLEANUP-${stamp}`, active: true, variants: [
        { color: 'Black', size: '42', sku: `CLEANUP-V-${stamp}`, stock: 5, price: 123000 },
      ], colors: [] };
    const created = await api('/products', 'POST', product);
    assert.ok(created.ProductID);
    await api(`/products/${created.ProductID}`, 'PUT', { ...product, name: `${product.name} updated` });
    const variant = (await pool.request().input('id', sql.Int, created.ProductID)
      .query('SELECT ProductVariantID,StockQuantity FROM ProductVariants WHERE ProductID=@id')).recordset[0];
    const order = await api('/orders', 'POST', {
      customerName: 'Khách kiểm thử', customerPhone: '0900000000',
      paymentMethod: 'Tiền mặt', paymentStatus: 'Đã thanh toán', status: 'Đã nhận hàng',
      totalAmount: 123000, handledBy: 'Quầy',
      items: [{ productId: created.ProductID, productVariantId: variant.ProductVariantID,
        quantity: 1, price: 123000, color: 'Black', size: '42' }],
    });
    assert.ok(order.orderId);
    const stock = (await pool.request().input('id', sql.Int, variant.ProductVariantID)
      .query('SELECT StockQuantity FROM ProductVariants WHERE ProductVariantID=@id')).recordset[0].StockQuantity;
    assert.equal(stock, 4, 'POS confirmation must deduct inventory exactly once');
    const payment = (await pool.request().input('id', sql.Int, order.orderId)
      .query("SELECT COUNT(*) n FROM PaymentTransactions WHERE OrderID=@id AND Status=N'SUCCESS'"))
      .recordset[0].n;
    assert.equal(payment, 1, 'Cash payment is recorded without PaymentMethods');
    const check = await pool.request().query('DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS');
    assert.equal(check.recordset?.length || 0, 0);
    const root = path.resolve(__dirname, '../../../tools/.work/db-cleanup');
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'smoke-results.json'), JSON.stringify({
      database: config.db.database, checks: results, stockDeduction: true, payment: true,
      constraints: true,
    }, null, 2));
    console.log(JSON.stringify({ requests: results.length, stockDeduction: true, payment: true, constraints: true }));
  } catch (error) {
    // Logs contain SQL diagnostics, never token/header values.
    console.error(logs);
    throw error;
  } finally {
    if (child && child.exitCode === null) {
      const closed = new Promise(resolve => child.once('exit', resolve));
      child.kill();
      await closed;
    }
    await pool.close();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
