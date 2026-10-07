const fs = require('node:fs');
const path = require('node:path');
const { parse } = require(require.resolve('@babel/parser', { paths: [path.resolve(__dirname, '../../frontend')] }));
const root = path.resolve(__dirname, '../..');
const files = ['backend/legacy-express/server.js', 'backend/legacy-express/src/routes/optimized.routes.js', 'backend/legacy-express/src/pos-cart.js'];
const native = new Set(['POST /api/login', 'POST /api/register', 'POST /api/auth/forgot-password', 'POST /api/auth/reset-password',
  'GET /api/health', 'POST /api/log-error', 'GET /api/admin/events', 'GET /api/pos/payment-config', 'GET /api/pos/cart',
  'PUT /api/pos/cart/items/:variantId', 'DELETE /api/pos/cart',
  'GET /api/addresses', 'POST /api/addresses', 'PUT /api/addresses/:id', 'DELETE /api/addresses/:id',
  'POST /api/cart/items', 'PUT /api/cart/items/:variantId', 'DELETE /api/cart/items/:variantId', 'DELETE /api/cart']);
for (const route of ['/api/products', '/api/v2/products', '/api/v2/products/featured', '/api/inventory', '/api/inventory/alerts', '/api/discounts', '/api/variantDiscounts']) native.add(`GET ${route}`);
for (const route of ['GET /api/accounts', 'POST /api/accounts', 'PUT /api/accounts/:id', 'DELETE /api/accounts/:id']) native.add(route);
native.add('GET /api/shippingmethods'); native.add('POST /api/shipping/quote');
for (const type of ['categories', 'brands', 'materials', 'colors', 'sizes']) {
  native.add(`GET /api/${type}`); native.add(`POST /api/${type}`);
  native.add(`PUT /api/${type}/:id`); native.add(`DELETE /api/${type}/:id`);
}
function visit(node, file, result) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' &&
      ['app', 'router'].includes(node.callee.object.name) && ['get', 'post', 'put', 'patch', 'delete'].includes(node.callee.property.name) &&
      node.arguments[0]?.type === 'StringLiteral') {
    const route = `${node.callee.property.name.toUpperCase()} ${node.arguments[0].value}`;
    result.push({ route, implementation: native.has(route) ? 'spring' : 'express-transition', file, line: node.loc.start.line });
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => visit(child, file, result));
    else if (value && typeof value === 'object' && value.type) visit(value, file, result);
  }
}
function inventory() {
  const result = [];
  for (const file of files) visit(parse(fs.readFileSync(path.join(root, file), 'utf8')), file, result);
  return result;
}
if (require.main === module) {
  const routes = inventory();
  const report = JSON.stringify({ total: routes.length, spring: routes.filter(r => r.implementation === 'spring').length, routes }, null, 2) + '\n';
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'backend/API-INVENTORY.json'), report);
  console.log(report);
}
module.exports = { inventory };
