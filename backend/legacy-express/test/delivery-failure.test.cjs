const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const serverSource = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

test('lost delivery is terminal and cannot be reshipped through the API', () => {
  const routeStart = serverSource.indexOf('app.put("/api/orders/:id/status"');
  const routeEnd = serverSource.indexOf('app.put("/api/orders/:id/payment"', routeStart);
  assert.ok(routeStart >= 0 && routeEnd > routeStart, 'Không tìm thấy route cập nhật trạng thái đơn.');
  const route = serverSource.slice(routeStart, routeEnd);

  assert.match(route, /StockIssueStatus, StockIssueReason, CancelReason/);
  assert.match(route, /currentOrderWasLost[\s\S]*LOST_IN_TRANSIT/);
  assert.match(route, /if \(currentOrderWasLost && !isCancel\)/);
  assert.match(route, /code: "LOST_ORDER_TERMINAL"/);
  assert.match(route, /lostDeliveryCancellation[\s\S]*!lostDeliveryCancellation[\s\S]*restoreOrderStock/);
});

test('delivery failure notifications describe each outcome separately', () => {
  assert.match(serverSource, /"Sự cố vận chuyển"[\s\S]*"Đơn gặp sự cố vận chuyển\. Shop sẽ giao lại sớm\."/);
  assert.match(serverSource, /"Chưa liên hệ được người nhận"[\s\S]*"Đơn chưa giao được vì chưa liên hệ được người nhận\. Shop sẽ giao lại sớm\."/);
  assert.match(serverSource, /"Hàng bị thất lạc"[\s\S]*"Hàng bị thất lạc trong quá trình vận chuyển nên đơn đã hủy\."/);
});
