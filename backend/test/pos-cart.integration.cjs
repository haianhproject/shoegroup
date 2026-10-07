// Explicit integration run: node backend/test/pos-cart.integration.cjs
// Uses a fresh isolated SQL database; never writes to the configured shop database.
"use strict";
const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");
const net = require("node:net");
process.env.AUDIT_DB_NAME = `ShoegroupAudit_Pos_${Date.now()}`;
process.env.AUDIT_PORT = "5194";
process.env.EMAIL_USER = "";
process.env.EMAIL_PASS = "";
const { setup, connection, api, admin, users, DATABASE } = require("./helpers/audit-db.cjs");
const sql = require("mssql");
let pool, server, springServer, serverOutput = "", checks = 0;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function startServer() {
  const spring = process.env.POS_AUDIT_BACKEND === "spring";
  // Refuse to send test writes to any pre-existing process on the audit port.
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(5194, () => probe.close(resolve));
  });
  if (spring) {
    await new Promise((resolve, reject) => {
      const probe = net.createServer(); probe.once("error", reject);
      probe.listen(5195, () => probe.close(resolve));
    });
  }
  server = spawn(process.execPath, [path.resolve(__dirname, "../server.js")], {
    windowsHide: true,
    env: { ...process.env, DB_NAME: DATABASE, PORT: spring ? "5195" : "5194", MIGRATION_BRIDGE: spring ? "true" : "false", AUTH_MODE: "enforce", EMAIL_USER: "", EMAIL_PASS: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", data => { serverOutput += data; });
  server.stderr.on("data", data => { serverOutput += data; });
  if (spring) {
    const jar = path.resolve(__dirname, "../../backend-spring/target/shoegroup-api-2.0.0.jar");
    if (!require("node:fs").existsSync(jar)) throw new Error("Build backend-spring with Maven package before the Spring POS audit.");
    const javaHome = process.env.JAVA_HOME || "C:/Program Files/Java/jdk-21";
    const javaCommand = process.platform === "win32" && require("node:fs").existsSync(path.join(javaHome, "bin/java.exe")) ? path.join(javaHome, "bin/java.exe") : "java";
    const config = require("../src/security/env");
    const location = config.db.options.instanceName ? `${config.db.server};instanceName=${config.db.options.instanceName}` : `${config.db.server}:${config.db.port || 1433}`;
    const jdbcUrl = `jdbc:sqlserver://${location};databaseName=${DATABASE};encrypt=${config.db.options.encrypt};trustServerCertificate=${config.db.options.trustServerCertificate}`;
    springServer = spawn(javaCommand, ["-jar", jar], {
      windowsHide: true, cwd: path.resolve(__dirname, "../.."),
      env: { ...process.env, DB_NAME: DATABASE, SPRING_DB_URL: jdbcUrl, DB_USER: config.db.user, DB_PASS: config.db.password, JWT_SECRET: config.jwt.secret, SPRING_PORT: "5194", LEGACY_API_URL: "http://127.0.0.1:5195", AUTH_MODE: "enforce", EMAIL_USER: "", EMAIL_PASS: "" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    springServer.stdout.on("data", data => { serverOutput += data; });
    springServer.stderr.on("data", data => { serverOutput += data; });
  }
  for (let i = 0; i < 300; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    if (springServer && springServer.exitCode !== null) throw new Error(serverOutput);
    try { if ((await api("/pos/cart", { user: admin })).status === 200) return; } catch (_) {}
    await sleep(150);
  }
  throw new Error(`Server did not become ready: ${serverOutput}`);
}
async function stopServer() {
  for (const child of [springServer, server]) {
    if (!child || child.exitCode !== null) continue;
    await new Promise(resolve => {
      child.once("exit", resolve);
      if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
      else child.kill();
    });
  }
}
async function fixture(stock = 3) {
  const sku = `POS-${Date.now()}-${checks}`;
  const result = await pool.request().input("sku", sql.VarChar, sku).input("stock", sql.Int, stock).query(`
    INSERT Products(ProductName,BasePrice,IsActive,ParentSKU) OUTPUT INSERTED.ProductID
      VALUES (@sku,300000,1,@sku);
    DECLARE @pid int=SCOPE_IDENTITY();
    INSERT ProductVariants(ProductID,Size,ColorName,ChildSKU,StockQuantity,IsActive)
      OUTPUT INSERTED.ProductVariantID VALUES (@pid,N'40',N'Đen',@sku,@stock,1);
  `);
  return { product_id: result.recordsets[0][0].ProductID, product_variant_id: result.recordsets[1][0].ProductVariantID, quantity: 1, price: 300000 };
}
async function stock(item) {
  const result = await pool.request().input("vid", sql.Int, item.product_variant_id)
    .query("SELECT StockQuantity AS stock FROM ProductVariants WHERE ProductVariantID=@vid");
  return result.recordset[0].stock;
}
const cart = async (user = admin) => (await api("/pos/cart", { user })).data;
const put = (item, quantity, revision, user = admin) => api(`/pos/cart/items/${item.product_variant_id}`, {
  user, method: "PUT", body: { quantity, revision },
});
async function clear(user = admin) {
  const current = await cart(user);
  const result = await api("/pos/cart", { user, method: "DELETE", body: { revision: current.revision } });
  assert.equal(result.status, 200, JSON.stringify(result));
}
function checkoutBody(item, revision, extra = {}) {
  return { customer_name: "Khách kiểm thử", customer_phone: "0901234567", payment_method: "Tiền mặt",
    payment_status: "Đã thanh toán", status: "Đã nhận hàng", handled_by: "Quầy",
    products: [item], total: item.quantity * item.price, pos_cart_revision: revision, ...extra };
}
async function check(name, fn) { await fn(); checks++; console.log(`PASS ${checks}: ${name}`); }

async function main() {
  await setup();
  pool = await connection().connect();
  assert.equal((await pool.request().query("SELECT DB_NAME() AS name")).recordset[0].name, DATABASE);
  await startServer();

  if (process.env.POS_AUDIT_BACKEND === "spring") await check("native product, inventory and discount reads match the Express JSON contract", async () => {
    for (const route of ["/products", "/v2/products?page=1&limit=2", "/v2/products?sort=price_asc", "/v2/products?categoryId=1&brandId=1&q=Audit", "/v2/products/featured?limit=2", "/inventory", "/inventory/alerts?threshold=10", "/discounts", "/variantDiscounts", "/accounts", "/shippingmethods"]) {
      const actual = await api(route, { user: admin });
      const expected = await api(route, { user: admin, port: 5195 });
      assert.equal(actual.status, 200, `${route}: ${JSON.stringify(actual)}`);
      assert.deepEqual(actual.data, expected.data, route);
    }
  });
  if (process.env.POS_AUDIT_BACKEND === "spring") await check("native shipping quotes match every original province rule and aliases", async () => {
    const distances = require("../../backend-spring/src/main/resources/shipping-distances.json");
    const bodies = Object.keys(distances).map(province => ({ province }));
    bodies.push({}, { province: "Unknown", address: "Ha Noi" }, { provinceName: "Đà Nẵng", district: "Vinh" }, { shippingAddress: "Hai Bà Trưng, Hà Nội" });
    for (const body of bodies) {
      const actual = await api("/shipping/quote", { method: "POST", body, user: admin });
      const expected = await api("/shipping/quote", { method: "POST", body, user: admin, port: 5195 });
      assert.equal(actual.status, 200, JSON.stringify(actual)); assert.deepEqual(actual.data, expected.data, JSON.stringify(body));
    }
  });

  await check("customer cannot reserve POS inventory; fractional/negative/oversized quantities rejected", async () => {
    const item = await fixture();
    assert.equal((await put(item, 1, 0, users[0])).status, 403);
    const initial = await cart();
    for (const quantity of [-1, 1.5, "2", null, 1000001]) assert.equal((await put(item, quantity, initial.revision)).status, 400);
    assert.equal((await put(item, 4, initial.revision)).status, 409);
    assert.equal(await stock(item), 3);
    assert.equal((await cart()).revision, initial.revision);
  });
  await check("add/decrease/remove/clear reserve and restore the exact stock; stale retries do not change stock", async () => {
    const item = await fixture();
    const initial = await cart();
    const added = await put(item, 2, initial.revision);
    assert.equal(added.status, 200, JSON.stringify(added));
    assert.equal(await stock(item), 1);
    assert.equal((await put(item, 2, initial.revision)).status, 409);
    assert.equal(await stock(item), 1);
    const decreased = await put(item, 1, added.data.revision);
    assert.equal(decreased.status, 200);
    assert.equal(await stock(item), 2);
    const removed = await put(item, 0, decreased.data.revision);
    assert.equal(removed.status, 200);
    assert.equal(await stock(item), 3);
    await put(item, 3, removed.data.revision);
    await clear();
    await clear();
    assert.equal(await stock(item), 3);
  });
  await check("held cart survives API restart and is returned on reload", async () => {
    const item = await fixture();
    const added = await put(item, 2, (await cart()).revision);
    await stopServer();
    await startServer();
    const restored = await cart();
    assert.equal(restored.revision, added.data.revision);
    assert.equal(restored.items[0].quantity, 2);
    assert.equal(await stock(item), 1);
    await clear();
  });
  for (const payment_method of ["Tiền mặt", "Chuyển khoản"]) await check(`${payment_method}: last held unit sells at stock zero; retry creates no duplicate/deduction`, async () => {
    const item = await fixture(1);
    const added = await put(item, 1, (await cart()).revision);
    assert.equal(await stock(item), 0);
    const body = checkoutBody(item, added.data.revision, { payment_method });
    const headers = { "Idempotency-Key": `pos-check-${Date.now()}` };
    const response = await api("/orders", { user: admin, method: "POST", body, headers });
    assert.equal(response.status, 200, JSON.stringify(response));
    const retry = await api("/orders", { user: admin, method: "POST", body, headers });
    assert.equal(retry.data.orderId, response.data.orderId);
    const conflict = await api("/orders", { user: admin, method: "POST", body: { ...body, note: "Changed payload" }, headers });
    assert.equal(conflict.status, 409, JSON.stringify(conflict));
    assert.equal(await stock(item), 0);
    assert.equal((await cart()).items.length, 0);
    const marker = await pool.request().input("oid", sql.Int, response.data.orderId)
      .query("SELECT StockDeductedAt FROM Orders WHERE OrderID=@oid");
    assert.ok(marker.recordset[0].StockDeductedAt);
    await clear();
    assert.equal(await stock(item), 0);
  });
  await check("online pending order cannot consume the last unit held at POS; POS still completes", async () => {
    const item = await fixture(1);
    const online = await api("/orders", { method: "POST", body: { addressId: users[0].addressId, paymentMethod: "COD", items: [item] } });
    assert.equal(online.status, 200, JSON.stringify(online));
    const added = await put(item, 1, (await cart()).revision);
    const confirmed = await api(`/orders/${online.data.orderId}/status`, { user: admin, method: "PUT", body: { status: "Đã xác nhận" } });
    assert.equal(confirmed.status, 409, JSON.stringify(confirmed));
    assert.equal((await api("/orders", { user: admin, method: "POST", body: checkoutBody(item, added.data.revision) })).status, 200);
    assert.equal(await stock(item), 0);
  });
  await check("online confirmation winning first prevents POS from overselling", async () => {
    const item = await fixture(1);
    const online = await api("/orders", { method: "POST", body: { addressId: users[0].addressId, paymentMethod: "COD", items: [item] } });
    assert.equal(online.status, 200, JSON.stringify(online));
    assert.equal((await api(`/orders/${online.data.orderId}/status`, { user: admin, method: "PUT", body: { status: "Đã xác nhận" } })).status, 200);
    assert.equal((await put(item, 1, (await cart()).revision)).status, 409);
    assert.equal(await stock(item), 0);
  });
  await check("two cashiers race for the last unit: exactly one reservation succeeds", async () => {
    const result = await pool.request().query(`INSERT Users(RoleID,Email,PasswordHash,FullName,IsActive)
      OUTPUT INSERTED.UserID VALUES (1,'pos-second@example.test','test-only',N'Quầy 2',1)`);
    const second = { id: result.recordset[0].UserID, email: "pos-second@example.test", role: "Admin" };
    const item = await fixture(1);
    const [a, b] = await Promise.all([cart(), cart(second)]);
    const responses = await Promise.all([put(item, 1, a.revision), put(item, 1, b.revision, second)]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 409], JSON.stringify(responses));
    assert.equal(await stock(item), 0);
    await clear(); await clear(second);
    assert.equal(await stock(item), 1);
  });
  await check("concurrent writes with the same revision reserve once", async () => {
    const item = await fixture(3);
    const initial = await cart();
    const responses = await Promise.all([put(item, 2, initial.revision), put(item, 2, initial.revision)]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
    assert.equal(await stock(item), 1);
    await clear();
  });
  await check("tampered checkout rolls back and keeps the held cart for retry", async () => {
    const item = await fixture(2);
    const added = await put(item, 2, (await cart()).revision);
    const held = { ...item, quantity: 2 };
    for (const body of [checkoutBody(item, added.data.revision), checkoutBody(held, added.data.revision, { total: 1 }),
      checkoutBody(held, added.data.revision, { products: [item, item] }), checkoutBody(held, undefined)]) {
      const result = await api("/orders", { user: admin, method: "POST", body });
      assert.ok([400, 409].includes(result.status), JSON.stringify(result));
      assert.equal(await stock(item), 0);
      assert.equal((await cart()).items[0].quantity, 2);
    }
    await clear();
    assert.equal(await stock(item), 2);
  });
  await check("releasing disabled product still restores stock", async () => {
    const item = await fixture();
    await put(item, 2, (await cart()).revision);
    await pool.request().input("pid", sql.Int, item.product_id).query("UPDATE Products SET IsActive=0 WHERE ProductID=@pid");
    await clear();
    assert.equal(await stock(item), 3);
  });
  await check("cancelling a reserved unpaid POS order restores stock once", async () => {
    const item = await fixture(1);
    const added = await put(item, 1, (await cart()).revision);
    const created = await api("/orders", { user: admin, method: "POST", body: checkoutBody(item, added.data.revision, { status: "Đã xác nhận", payment_status: "Chưa thanh toán" }) });
    assert.equal(created.status, 200, JSON.stringify(created));
    for (let i = 0; i < 2; i++) {
      const result = await api(`/orders/${created.data.orderId}/status`, { user: admin, method: "PUT", body: { status: "Đã hủy", reason: "Kiểm thử hoàn kho" } });
      assert.equal(result.status, 200, JSON.stringify(result));
      assert.equal(await stock(item), 1);
    }
  });
  console.log(`PASS: ${checks} POS integration scenarios (${DATABASE})`);
}

main().catch(error => { console.error(error); console.error(serverOutput.slice(-6000)); process.exitCode = 1; }).finally(async () => {
  await stopServer();
  if (pool) await pool.close();
  if (process.env.POS_AUDIT_KEEP_DB === "1") { console.log(`Kept isolated test database: ${DATABASE}`); return; }
  if (!/^ShoegroupAudit_Pos_\d+$/.test(DATABASE)) throw new Error("Unsafe audit database name");
  const master = await connection("master").connect();
  try { await master.request().query(`IF DB_ID(N'${DATABASE}') IS NOT NULL BEGIN ALTER DATABASE [${DATABASE}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${DATABASE}]; END`); }
  finally { await master.close(); }
});
