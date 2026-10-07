const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const routesSource = fs.readFileSync(
  path.resolve(__dirname, '../src/routes/optimized.routes.js'),
  'utf8',
);

test('product pricing aggregates do not mix outer product columns with variant columns', () => {
  assert.doesNotMatch(routesSource, /MIN\(CAST\(p\.BasePrice\s*\+\s*ISNULL\(pv\.PriceAdjustment/);
  assert.match(routesSource, /JOIN Products priceProduct ON priceProduct\.ProductID=pv\.ProductID/);
  assert.match(routesSource, /MIN\(CAST\(priceProduct\.BasePrice\s*\+\s*ISNULL\(pv\.PriceAdjustment/);
});

test('optimized product pricing respects color-wide and exact-size discount scopes', () => {
  assert.match(routesSource, /ApplyScope,'color'\)='variant' AND vd\.ProductVariantID=pv\.ProductVariantID/);
  assert.match(routesSource, /ApplyScope,'color'\)='color' AND ISNULL\(vd\.ColorName/);
});
