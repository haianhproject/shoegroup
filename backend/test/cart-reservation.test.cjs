const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('cart mutations never change inventory and checkout only validates stock', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');
  const cartStart = source.indexOf('// ================= API GIO HANG =================');
  const cartEnd = source.indexOf('// ================= API QUAN LY DON HANG VA THANH TOAN =================', cartStart);
  assert.ok(cartStart >= 0 && cartEnd > cartStart, 'Không tìm thấy khối API giỏ hàng.');
  const cartBlock = source.slice(cartStart, cartEnd);
  assert.doesNotMatch(cartBlock, /SET\s+StockQuantity\s*=/i);

  const checkoutStart = source.indexOf('// B3: Đặt đơn chỉ kiểm tra kho');
  const checkoutEnd = source.indexOf('// B4: Cap nhat luot dung Ma giam gia', checkoutStart);
  assert.ok(checkoutStart >= 0 && checkoutEnd > checkoutStart, 'Không tìm thấy khối kiểm tra tồn khi checkout.');
  const checkoutBlock = source.slice(checkoutStart, checkoutEnd);
  assert.match(checkoutBlock, /validateOrderStock\(transaction, orderId\)/);
  assert.doesNotMatch(checkoutBlock, /CART_RESERVATION_REQUIRED/);
});

test('inventory is deducted atomically when management confirms the order', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');
  assert.match(source, /const confirmingOrder =[\s\S]*statusToSave\) === "da xac nhan"/);
  assert.match(source, /if \(confirmingOrder\) \{\s*stockDeducted = await reserveOrderStock\(transaction, orderId\);/);
  assert.match(source, /SELECT StockDeductedAt, StockRestoredAt[\s\S]*if \(deductionRow\.StockDeductedAt && !deductionRow\.StockRestoredAt\) return false/);
});

test('legacy order procedure validates stock without reserving it', () => {
  for (const filename of [
    '20260909_audit_constraints.sql',
    '20260920_legacy_order_confirmation_stock.sql',
  ]) {
    const source = fs.readFileSync(path.resolve(__dirname, '../../database/migrations', filename), 'utf8');
    assert.match(source, /IF ISNULL\(@stock,0\)<@Quantity THROW 50002,'Insufficient stock',1/);
    assert.doesNotMatch(source, /SET\s+StockQuantity\s*=\s*StockQuantity\s*-\s*@Quantity/i);
    assert.doesNotMatch(source, /DATEADD\(hour\s*,\s*24/i);
  }
});

test('order APIs and snapshots prefer the purchased variant image over the product cover', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');
  assert.match(source, /COALESCE\(NULLIF\(od\.ImageURLSnapshot, ''\), variantImage\.ImageURL, NULLIF\(p\.ImageURL, ''\), ''\) as image/g);
  assert.match(source, /INSERT INTO OrderDetails[\s\S]*ProductNameSnapshot, SKUSnapshot, ColorHex, ImageURLSnapshot/);
  assert.match(source, /item\.image_url = canonicalItem\.imageUrl \|\| ""/);
  assert.doesNotMatch(source, /COALESCE\(p\.ImageURL, od\.ImageURLSnapshot, ''\) as image/);
});
