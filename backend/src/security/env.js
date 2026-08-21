/* ============================================================
 * env.js - Doc cau hinh tu file .env (KHONG can cai them thu vien)
 * ------------------------------------------------------------
 * Neu du an da cai `dotenv` thi module nay tu dong dung dotenv.
 * Neu chua cai, no tu doc va parse file .env => chay duoc ngay.
 * ============================================================ */
const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  try {
    // Uu tien dotenv neu co
    require("dotenv").config();
    return;
  } catch (_) {
    /* khong co dotenv -> tu parse */
  }
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const i = s.indexOf("=");
    if (i < 0) continue;
    const key = s.slice(0, i).trim();
    let val = s.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile();

const bool = (v, def = false) =>
  v === undefined ? def : /^(1|true|yes|on)$/i.test(String(v));

const config = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: (process.env.NODE_ENV || "") === "production",

  db: {
    user: process.env.DB_USER || "sa",
    password: process.env.DB_PASS || "123",
    server: process.env.DB_SERVER || "127.0.0.1",
    database: process.env.DB_NAME || "ShoegroupDB",
    options: {
      // Production nen bat encrypt=true
      encrypt: bool(process.env.DB_ENCRYPT, false),
      trustServerCertificate: bool(process.env.DB_TRUST_CERT, true),
      enableArithAbort: true,
    },
    pool: { max: 20, min: 0, idleTimeoutMillis: 30000 },
    requestTimeout: 30000,
  },

  jwt: {
    secret:
      process.env.JWT_SECRET ||
      "shoegroup-dev-secret-doi-ngay-khi-len-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  // enforce = chan that su | warn = chi ghi log canh bao (dung khi dang chuyen doi)
  authMode: (process.env.AUTH_MODE || "enforce").toLowerCase(),

  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  corsOrigins: (
    process.env.CORS_ORIGINS ||
    "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  bodyLimit: process.env.BODY_LIMIT || "5mb",

  mail: {
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    maxLogin: Number(
      process.env.RATE_LIMIT_MAX_LOGIN || process.env.LOGIN_RATE_LIMIT_MAX || 10,
    ),
    maxApi: Number(
      process.env.RATE_LIMIT_MAX_API || process.env.RATE_LIMIT_MAX || 600,
    ),
  },
};

module.exports = config;
