/* ============================================================
 * password.js - Bam & kiem tra mat khau (KHONG can cai bcrypt)
 * ------------------------------------------------------------
 * - Mac dinh dung scrypt cua Node (module crypto co san) => manh,
 *   khong can `npm install`.
 * - Neu du an co cai bcrypt / bcryptjs thi tu dong ho tro luon
 *   (verify duoc ca hash bcrypt cu).
 * - TUONG THICH NGUOC: neu trong DB con mat khau THO (plaintext),
 *   ham verify() van cho dang nhap dung va bao "needsUpgrade"
 *   de server tu bam lai => KHONG lam hong tai khoan cu.
 * ============================================================ */
const crypto = require("crypto");

let bcrypt = null;
try {
  bcrypt = require("bcrypt");
} catch (_) {
  try {
    bcrypt = require("bcryptjs");
  } catch (_) {
    bcrypt = null;
  }
}

const SCRYPT_N = 16384;
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const KEYLEN = 64;

function hashSync(password) {
  const salt = crypto.randomBytes(16);
  const dk = crypto.scryptSync(String(password), salt, KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_r,
    p: SCRYPT_p,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_r}$${SCRYPT_p}$${salt.toString("hex")}$${dk.toString("hex")}`;
}

async function hash(password) {
  return hashSync(password);
}

function isHashed(stored) {
  if (!stored) return false;
  return (
    stored.startsWith("scrypt$") ||
    stored.startsWith("$2a$") ||
    stored.startsWith("$2b$") ||
    stored.startsWith("$2y$")
  );
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * @returns {{ ok: boolean, needsUpgrade: boolean, algo: string }}
 */
async function verify(password, stored) {
  const pwd = String(password == null ? "" : password);
  const hashText = String(stored == null ? "" : stored);

  if (hashText.startsWith("scrypt$")) {
    const [, N, r, p, saltHex, keyHex] = hashText.split("$");
    try {
      const dk = crypto.scryptSync(pwd, Buffer.from(saltHex, "hex"), KEYLEN, {
        N: Number(N),
        r: Number(r),
        p: Number(p),
      });
      return {
        ok: safeEqual(dk.toString("hex"), keyHex),
        needsUpgrade: false,
        algo: "scrypt",
      };
    } catch (_) {
      return { ok: false, needsUpgrade: false, algo: "scrypt" };
    }
  }

  if (/^\$2[aby]\$/.test(hashText)) {
    if (!bcrypt) return { ok: false, needsUpgrade: false, algo: "bcrypt" };
    const ok = await bcrypt.compare(pwd, hashText);
    // Bam lai sang scrypt de dong nhat (tuy chon, van chap nhan bcrypt)
    return { ok, needsUpgrade: false, algo: "bcrypt" };
  }

  // Mat khau cu luu dang tho -> van cho dang nhap, nhung danh dau can nang cap
  const ok = hashText.length > 0 && safeEqual(pwd, hashText);
  return { ok, needsUpgrade: ok, algo: "plain" };
}

function checkStrength(password) {
  const p = String(password || "");
  if (p.length < 6)
    return { ok: false, message: "Mat khau phai co it nhat 6 ky tu." };
  if (p.length > 128)
    return { ok: false, message: "Mat khau qua dai (toi da 128 ky tu)." };
  return { ok: true };
}

module.exports = { hash, hashSync, verify, isHashed, checkStrength };
