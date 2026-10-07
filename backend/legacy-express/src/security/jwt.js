/* ============================================================
 * jwt.js - Phat hanh & xac thuc JWT
 * ------------------------------------------------------------
 * Dung thu vien `jsonwebtoken` neu co (da co san trong node_modules).
 * Neu khong co -> tu ky HS256 bang crypto (khong can cai them).
 * ============================================================ */
const crypto = require("crypto");
const config = require("./env");

let jwtLib = null;
try {
  jwtLib = require("jsonwebtoken");
} catch (_) {
  jwtLib = null;
}

const b64url = (buf) =>
  Buffer.from(buf)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const fromB64url = (str) =>
  Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function ttlToSeconds(ttl) {
  const m = /^(\d+)([smhd])?$/.exec(String(ttl || "7d"));
  if (!m) return 7 * 24 * 3600;
  const n = Number(m[1]);
  const unit = m[2] || "s";
  return n * { s: 1, m: 60, h: 3600, d: 86400 }[unit];
}

function sign(payload, ttl) {
  const expiresIn = ttl || config.jwt.expiresIn;
  if (jwtLib) return jwtLib.sign(payload, config.jwt.secret, { expiresIn });

  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlToSeconds(expiresIn) };
  const p1 = b64url(JSON.stringify(header));
  const p2 = b64url(JSON.stringify(body));
  const sig = b64url(
    crypto.createHmac("sha256", config.jwt.secret).update(`${p1}.${p2}`).digest(),
  );
  return `${p1}.${p2}.${sig}`;
}

function verify(token) {
  if (!token) return null;
  if (jwtLib) {
    try {
      return jwtLib.verify(token, config.jwt.secret);
    } catch (_) {
      return null;
    }
  }
  const parts = String(token).split(".");
  if (parts.length !== 3) return null;
  const [p1, p2, sig] = parts;
  const expected = b64url(
    crypto.createHmac("sha256", config.jwt.secret).update(`${p1}.${p2}`).digest(),
  );
  if (
    expected.length !== sig.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  )
    return null;
  try {
    const body = JSON.parse(fromB64url(p2).toString("utf8"));
    if (body.exp && Math.floor(Date.now() / 1000) > body.exp) return null;
    return body;
  } catch (_) {
    return null;
  }
}

function issueForUser(user) {
  return sign({
    sub: Number(user.id_user ?? user.UserID ?? user.id),
    email: user.email ?? user.Email,
    role: user.role ?? (Number(user.role_id) === 1 ? "Admin" : "Customer"),
    roleId: Number(user.role_id ?? user.RoleID ?? 2),
    name: user.full_name ?? user.FullName ?? "",
  });
}

function readToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7).trim();
  if (req.headers["x-access-token"]) return String(req.headers["x-access-token"]);
  return null;
}

module.exports = { sign, verify, issueForUser, readToken };
