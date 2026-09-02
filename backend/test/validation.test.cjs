const test = require("node:test");
const assert = require("node:assert/strict");

const {
  positiveInt,
  booleanValue,
  validateCatalogPayload,
  validateProductPayload,
  validateCouponPayload,
  validateVariantDiscountPayload,
} = require("../src/validation");

test("primitive validators reject ambiguous IDs and booleans", () => {
  assert.equal(positiveInt("12abc"), null);
  assert.equal(positiveInt("0"), null);
  assert.equal(positiveInt("12"), 12);
  assert.equal(booleanValue("false"), false);
  assert.equal(booleanValue("unexpected"), null);
});

test("catalog payload requires a bounded name and valid state", () => {
  assert.equal(validateCatalogPayload({ name: "   " }).ok, false);
  assert.equal(validateCatalogPayload({ name: "Sneaker", active: "unexpected" }).ok, false);
  const valid = validateCatalogPayload({ name: " Sneaker ", active: "false" });
  assert.equal(valid.ok, true);
  assert.deepEqual(valid.value, { name: "Sneaker", active: false, sortOrder: 0 });
});

test("product payload validates prices, variants and duplicate combinations", () => {
  assert.equal(validateProductPayload({ name: "Shoe", price: 100, sale_price: 120 }).ok, false);
  assert.equal(validateProductPayload({
    name: "Shoe", price: 100, variants: [
      { color: "Black", size: "42", stock: 3 },
      { color: "Black", size: "42", stock: 1 },
    ],
  }).ok, false);
  const valid = validateProductPayload({
    name: "Shoe", price: "100", sale_price: "80",
    variants: [{ color: "Black", size: "42", stock: "3" }],
  }, { requireVariants: true });
  assert.equal(valid.ok, true);
  assert.equal(valid.value.price, 100);
  assert.equal(valid.value.variants.length, 1);
});

test("coupon and variant discount payloads enforce business ranges", () => {
  assert.equal(validateCouponPayload({ code: "x", name: "Sale", type: "percent", value: 10, expiry: "2026-01-01" }).ok, false);
  assert.equal(validateCouponPayload({ code: "SALE10", name: "Sale", type: "percent", value: 101, expiry: "2026-09-01" }).ok, false);
  const coupon = validateCouponPayload({ code: "sale10", name: "Sale", type: "percent", value: 10, expiry: "2026-09-01" });
  assert.equal(coupon.ok, true);
  assert.equal(coupon.value.code, "SALE10");

  assert.equal(validateVariantDiscountPayload({ ProductVariantID: 1, ProductID: 1, DiscountType: "Theo phần trăm", DiscountValue: 101 }).ok, false);
  const variant = validateVariantDiscountPayload({ ProductVariantID: 1, ProductID: 1, DiscountType: "Cố định", DiscountValue: 50000 });
  assert.equal(variant.ok, true);
  assert.equal(variant.value.type, "fixed");
  assert.equal(validateVariantDiscountPayload({ ProductVariantID: 1, ProductID: 1, DiscountType: "Cố định", DiscountValue: 50000, StartDate: "2026-08-01" }).ok, true);
});
