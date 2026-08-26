const test = require("node:test");
const assert = require("node:assert/strict");

const { resolvePolicy } = require("../src/security/guard");
const password = require("../src/security/password");

test("API policy exposes only intended public/customer routes", () => {
  assert.equal(resolvePolicy("GET", "/api/v2/products"), "PUBLIC");
  assert.equal(resolvePolicy("GET", "/api/v2/orders"), "CUSTOMER");
  assert.equal(resolvePolicy("DELETE", "/api/products/10"), "ADMIN");
  assert.equal(resolvePolicy("PATCH", "/api/unknown"), "ADMIN");
});

test("passwords are hashed and verified without storing plaintext", async () => {
  const hash = await password.hash("student-password");
  assert.notEqual(hash, "student-password");
  assert.match(hash, /^scrypt\$/);
  assert.equal((await password.verify("student-password", hash)).ok, true);
  assert.equal((await password.verify("wrong-password", hash)).ok, false);
});
