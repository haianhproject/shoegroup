// Mechanical extraction preserves the existing SQL pricing rules during the Java port.
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@babel/parser');
const root = path.resolve(__dirname, '../..');
const selected = new Set(['/api/products', '/api/v2/products', '/api/v2/products/featured', '/api/inventory', '/api/inventory/alerts', '/api/discounts', '/api/variantDiscounts']);
const queries = {};
let shippingDistances;
function children(node, callback) {
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => { if (child?.type) callback(child); });
    else if (value?.type) callback(value);
  }
}
function query(node, source, result) {
  if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && node.callee.property.name === 'query') {
    const value = node.arguments[0];
    if (value?.type === 'StringLiteral') result.push(value.value);
    else if (value?.type === 'TemplateLiteral') {
      let sql = '';
      value.quasis.forEach((part, index) => {
        sql += part.value.cooked;
        if (value.expressions[index]) sql += '${' + source.slice(value.expressions[index].start, value.expressions[index].end) + '}';
      }); result.push(sql);
    } else throw new Error('Selected read query is not a literal');
  }
  children(node, child => query(child, source, result));
}
function visit(node, source) {
  if (node.type === 'VariableDeclarator' && node.id.name === 'HANOI_DISTANCE') {
    if (node.init.type !== 'ObjectExpression') throw new Error('Shipping distances must be a literal');
    shippingDistances = Object.fromEntries(node.init.properties.map(property => {
      if (property.type !== 'ObjectProperty' || property.value.type !== 'NumericLiteral') throw new Error('Invalid distance rule');
      return [property.key.value ?? property.key.name, property.value.value];
    }));
  }
  if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && node.callee.property.name === 'get' && selected.has(node.arguments[0]?.value)) {
    const route = node.arguments[0].value;
    const result = []; query(node.arguments[1], source, result);
    queries[route] = result.map(sql => sql.replace(/@([a-zA-Z][a-zA-Z0-9_]*)/g, ':$1'));
    return;
  }
  children(node, child => visit(child, source));
}
for (const file of ['backend/server.js', 'backend/src/routes/optimized.routes.js']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8'); visit(parse(source), source);
}
if (Object.keys(queries).length !== selected.size) throw new Error('Missing selected read route');
fs.writeFileSync(path.join(root, 'backend-spring/src/main/resources/read-queries.json'), JSON.stringify(queries, null, 2) + '\n');
if (!shippingDistances) throw new Error('Missing shipping distances');
fs.writeFileSync(path.join(root, 'backend-spring/src/main/resources/shipping-distances.json'), JSON.stringify(shippingDistances, null, 2) + '\n');
console.log(`Exported SQL for ${selected.size} read routes.`);
