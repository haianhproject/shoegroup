const test = require("node:test");
const assert = require("node:assert/strict");

const { resolvePolicy, createRateLimiter } = require("../src/security/guard");
const password = require("../src/security/password");

test("API policy exposes only intended public/customer routes", () => {
  assert.equal(resolvePolicy("GET", "/api/v2/products"), "PUBLIC");
  assert.equal(resolvePolicy("GET", "/api/v2/orders"), "CUSTOMER");
  assert.equal(resolvePolicy("POST", "/api/returns"), "CUSTOMER");
  assert.equal(resolvePolicy("PUT", "/api/returns/12/status"), "ADMIN");
  assert.equal(resolvePolicy("DELETE", "/api/products/10"), "ADMIN");
  assert.equal(resolvePolicy("PATCH", "/api/unknown"), "ADMIN");
});

test('untrusted X-Forwarded-For rotation cannot bypass the write limit', () => {
  const limiter=createRateLimiter({windowMs:60000,max:1});
  const response=()=>({statusCode:200,setHeader(){},status(code){this.statusCode=code;return this;},json(){return this;}});
  let passed=0;
  for(const forwarded of ['fake-client-a','fake-client-b']) {
    const res=response();
    limiter({method:'POST',ip:'127.0.0.1',headers:{'x-forwarded-for':forwarded},socket:{remoteAddress:'127.0.0.1'}},res,()=>passed++);
    if(forwarded==='fake-client-b')assert.equal(res.statusCode,429);
  }
  assert.equal(passed,1);
});

test("passwords are hashed and verified without storing plaintext", async () => {
  const hash = await password.hash("student-password");
  assert.notEqual(hash, "student-password");
  assert.match(hash, /^scrypt\$/);
  assert.equal((await password.verify("student-password", hash)).ok, true);
  assert.equal((await password.verify("wrong-password", hash)).ok, false);
});

test("read polling can be skipped without disabling write rate limits", () => {
  const limiter = createRateLimiter({
    windowMs: 60_000,
    max: 1,
    skip: (req) => req.method === "GET",
  });
  const response = () => ({
    statusCode: 200,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  });
  let passed = 0;
  const next = () => { passed += 1; };
  const request = (method) => ({ method, headers: {}, socket: { remoteAddress: "test-client" } });

  limiter(request("GET"), response(), next);
  limiter(request("GET"), response(), next);
  limiter(request("PUT"), response(), next);
  const blocked = response();
  limiter(request("PUT"), blocked, next);

  assert.equal(passed, 3);
  assert.equal(blocked.statusCode, 429);
});
