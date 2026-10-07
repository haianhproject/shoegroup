const { createHash } = require('node:crypto');

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function checkoutIdentity(req) {
  const key = req.get('Idempotency-Key');
  if (key === undefined) return null; // Compatibility for existing API clients.
  if (typeof key !== 'string' || !/^[A-Za-z0-9._:-]{8,128}$/.test(key)) {
    throw Object.assign(new Error('Idempotency-Key phải gồm 8–128 ký tự hợp lệ.'), { statusCode: 400 });
  }
  return { key, hash: createHash('sha256').update(stableJson(req.body || {})).digest('hex') };
}

async function claimCheckout(transaction, sql, userId, identity) {
  if (!identity) return null;
  // Transaction-owned application lock serializes one checkout intent across
  // API processes without locking unrelated checkout keys or all orders.
  const lock = await new sql.Request(transaction)
    .input('resource', sql.NVarChar(255), `checkout:${userId}:${identity.key}`)
    .query(`DECLARE @result int;
      EXEC @result=sys.sp_getapplock @Resource=@resource, @LockMode='Exclusive',
        @LockOwner='Transaction', @LockTimeout=15000;
      SELECT @result AS result;`);
  if (lock.recordset[0].result < 0) {
    throw Object.assign(new Error('Giao dịch đang được xử lý. Vui lòng thử lại với cùng Idempotency-Key.'), { statusCode: 409 });
  }
  const existing = await new sql.Request(transaction)
    .input('uid', sql.Int, userId).input('key', sql.VarChar(128), identity.key)
    .query('SELECT RequestHash, ResponseJson FROM CheckoutRequests WHERE UserID=@uid AND IdempotencyKey=@key');
  if (!existing.recordset.length) return null;
  if (existing.recordset[0].RequestHash !== identity.hash) {
    throw Object.assign(new Error('Idempotency-Key đã được dùng cho nội dung đặt hàng khác.'), { statusCode: 409, code: 'IDEMPOTENCY_CONFLICT' });
  }
  return JSON.parse(existing.recordset[0].ResponseJson);
}

async function completeCheckout(transaction, sql, userId, identity, response) {
  if (!identity) return;
  await new sql.Request(transaction)
    .input('uid', sql.Int, userId).input('key', sql.VarChar(128), identity.key)
    .input('hash', sql.Char(64), identity.hash).input('oid', sql.Int, response.orderId)
    .input('response', sql.NVarChar(sql.MAX), JSON.stringify(response))
    .query(`INSERT INTO CheckoutRequests (UserID,IdempotencyKey,RequestHash,OrderID,ResponseJson)
      VALUES (@uid,@key,@hash,@oid,@response)`);
}

module.exports = { checkoutIdentity, claimCheckout, completeCheckout };
