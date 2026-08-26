/* ============================================================
 * guard.js - Lop bao mat dung chung cho toan bo API
 * ------------------------------------------------------------
 * Diem quan trong: KHONG phai sua 70 route cu.
 * Chi can 1 middleware duy nhat doc "bang chinh sach" (policy)
 * theo method + duong dan => tu dong chan cac API quan tri.
 *
 * - PUBLIC_ROUTES : ai cung goi duoc (login, register, xem san pham...)
 * - CUSTOMER      : phai dang nhap
 * - ADMIN         : phai la Admin (RoleID = 1)
 * - Mac dinh (khong khop) : yeu cau ADMIN (an toan mac dinh - fail closed)
 *
 * AUTH_MODE=warn trong .env => chi ghi log canh bao, khong chan.
 * Dung khi ban muon chay thu voi frontend cu chua gan token.
 * ============================================================ */
const config = require("./env");
const jwt = require("./jwt");

/* ---------- 1. Bang chinh sach ---------- */
// Moi phan tu: [method, regex duong dan, quyen]
// method "*" = moi method
const POLICIES = [
  // ===== Cong khai =====
  ["POST", /^\/api\/login$/, "PUBLIC"],
  ["POST", /^\/api\/register$/, "PUBLIC"],
  ["POST", /^\/api\/auth\/forgot-password$/, "PUBLIC"],
  ["POST", /^\/api\/auth\/reset-password$/, "PUBLIC"],
  ["POST", /^\/api\/log-error$/, "PUBLIC"],
  ["GET", /^\/api\/health$/, "PUBLIC"],

  // Cac endpoint v2 dung chung voi route cu: san pham cong khai, don hang theo tai khoan.
  ["GET", /^\/api\/v2\/products(\/|$)/, "PUBLIC"],
  ["GET", /^\/api\/v2\/orders(\/|$)/, "CUSTOMER"],
  ["GET", /^\/api\/v2\/dashboard\/summary$/, "ADMIN"],

  // Danh muc / du lieu tra cuu cho trang ban hang (chi doc)
  ["GET", /^\/api\/products(\/|$|\?)/, "PUBLIC"],
  ["GET", /^\/api\/categories/, "PUBLIC"],
  ["GET", /^\/api\/brands/, "PUBLIC"],
  ["GET", /^\/api\/collections/, "PUBLIC"],
  ["GET", /^\/api\/colors/, "PUBLIC"],
  ["GET", /^\/api\/sizes/, "PUBLIC"],
  ["GET", /^\/api\/materials/, "PUBLIC"],
  ["GET", /^\/api\/soles/, "PUBLIC"],
  ["GET", /^\/api\/cushionings/, "PUBLIC"],
  ["GET", /^\/api\/discounts/, "PUBLIC"],
  ["GET", /^\/api\/variantDiscounts/, "PUBLIC"],
  ["GET", /^\/api\/postoffices/, "PUBLIC"],
  ["GET", /^\/api\/shippingmethods/, "PUBLIC"],
  ["POST", /^\/api\/shipping\/quote$/, "PUBLIC"],

  // ===== Khach hang da dang nhap =====
  ["PUT", /^\/api\/orders\/\d+\/status$/, "CUSTOMER"], // khach tu huy don cua minh
  ["POST", /^\/api\/orders$/, "CUSTOMER"],
  ["PUT", /^\/api\/orders\/\d+\/payment$/, "CUSTOMER"],
  ["PUT", /^\/api\/orders\/\d+\/address$/, "CUSTOMER"],
  ["PUT", /^\/api\/orders\/\d+\/receive$/, "CUSTOMER"],
  ["GET", /^\/api\/addresses$/, "CUSTOMER"],
  ["POST", /^\/api\/addresses$/, "CUSTOMER"],
  ["PUT", /^\/api\/addresses\/\d+$/, "CUSTOMER"],
  ["DELETE", /^\/api\/addresses\/\d+$/, "CUSTOMER"],
  ["POST", /^\/api\/returns$/, "CUSTOMER"],
  ["GET", /^\/api\/customers\/\d+\/orders$/, "CUSTOMER"],
  ["GET", /^\/api\/customers\/\d+\/notifications$/, "CUSTOMER"],
  ["PUT", /^\/api\/accounts\/\d+$/, "CUSTOMER"], // tu cap nhat thong tin ca nhan
  ["GET", /^\/api\/returns$/, "CUSTOMER"],
  ["GET", /^\/api\/orders$/, "ADMIN"],

  // ===== Chi Admin =====
  ["*", /^\/api\/accounts/, "ADMIN"],
  ["*", /^\/api\/customers$/, "ADMIN"],
  ["*", /^\/api\/chart-data/, "ADMIN"],
  ["*", /^\/api\/revenue-by-product/, "ADMIN"],
  ["*", /^\/api\/inventory/, "ADMIN"],
  ["*", /^\/api\/returns\/\d+\/status$/, "ADMIN"],
  // Moi thao tac ghi tren du lieu danh muc / san pham deu la Admin
  ["POST", /^\/api\//, "ADMIN"],
  ["PUT", /^\/api\//, "ADMIN"],
  ["PATCH", /^\/api\//, "ADMIN"],
  ["DELETE", /^\/api\//, "ADMIN"],
];

function resolvePolicy(method, urlPath) {
  for (const [m, re, level] of POLICIES) {
    if ((m === "*" || m === method) && re.test(urlPath)) return level;
  }
  return "ADMIN"; // fail-closed: khong khai bao => coi nhu API quan tri
}

/* ---------- 2. Middleware xac thuc ---------- */
function attachUser(req, _res, next) {
  const token = jwt.readToken(req);
  req.auth = token ? jwt.verify(token) : null;
  next();
}

function deny(res, code, message) {
  return res.status(code).json({ success: false, message });
}

function policyGuard(req, res, next) {
  const urlPath = (req.originalUrl || req.url || "").split("?")[0];
  if (!urlPath.startsWith("/api/")) return next();

  const level = resolvePolicy(req.method.toUpperCase(), urlPath);
  if (level === "PUBLIC") return next();

  const warnOnly = config.authMode === "warn";
  const user = req.auth;

  if (!user) {
    if (warnOnly) {
      console.warn(`[AUTH-WARN] ${req.method} ${urlPath} khong co token (can ${level})`);
      return next();
    }
    return deny(res, 401, "Ban chua dang nhap hoac phien da het han.");
  }

  if (level === "ADMIN" && user.role !== "Admin") {
    if (warnOnly) {
      console.warn(`[AUTH-WARN] ${req.method} ${urlPath} khong du quyen Admin`);
      return next();
    }
    return deny(res, 403, "Ban khong co quyen thuc hien thao tac nay.");
  }

  // Chong xem du lieu nguoi khac: /api/customers/:id/... phai la chinh minh hoac Admin
  const own = /^\/api\/(customers|accounts)\/(\d+)/.exec(urlPath);
  if (own && user.role !== "Admin" && Number(own[2]) !== Number(user.sub)) {
    if (!warnOnly) return deny(res, 403, "Khong duoc truy cap du lieu cua nguoi khac.");
    console.warn(`[AUTH-WARN] IDOR: user ${user.sub} truy cap ${urlPath}`);
  }

  return next();
}

/* Dung truc tiep tren route rieng le neu muon (tuy chon) */
const authRequired = (req, res, next) =>
  req.auth ? next() : deny(res, 401, "Ban chua dang nhap.");
const adminRequired = (req, res, next) =>
  req.auth && req.auth.role === "Admin"
    ? next()
    : deny(res, 403, "Chi quan tri vien moi duoc thao tac.");

/* ---------- 3. Rate limit (khong can thu vien ngoai) ---------- */
function createRateLimiter({
  windowMs,
  max,
  key = "default",
  message,
  skipSuccessfulRequests = false,
}) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
  }, windowMs).unref?.();

  return function rateLimiter(req, res, next) {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket?.remoteAddress ||
      "unknown";
    const id = `${key}:${ip}`;
    const now = Date.now();
    let rec = hits.get(id);
    if (!rec || now > rec.reset) rec = { count: 0, reset: now + windowMs };
    rec.count += 1;
    hits.set(id, rec);
    if (skipSuccessfulRequests) {
      res.once("finish", () => {
        if (res.statusCode >= 400) return;
        const current = hits.get(id);
        if (!current) return;
        current.count = Math.max(0, current.count - 1);
        if (current.count === 0) hits.delete(id);
      });
    }
    if (rec.count > max) {
      res.setHeader("Retry-After", Math.ceil((rec.reset - now) / 1000));
      return res.status(429).json({
        success: false,
        message: message || "Ban thu qua nhieu lan. Vui long doi mot lat.",
      });
    }
    return next();
  };
}

/* ---------- 4. Header bao mat (thay helmet, khong can cai) ---------- */
function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.removeHeader("X-Powered-By");
  next();
}

/* ---------- 5. CORS gioi han theo whitelist ---------- */
const corsOptions = {
  origin(origin, cb) {
    // cho phep goi tu Postman/cURL (khong co Origin) va tu cac origin trong whitelist
    if (!origin) return cb(null, true);
    if (config.corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("CORS: origin khong duoc phep -> " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-access-token"],
};

/* ---------- 6. Xu ly loi tap trung (khong lo thong tin he thong) ---------- */
function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: "Khong tim thay API: " + req.originalUrl });
}

function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;
  console.error("[API ERROR]", err.message);
  res.status(status).json({
    success: false,
    message: config.isProd
      ? "Co loi xay ra o may chu. Vui long thu lai sau."
      : err.message,
  });
}

module.exports = {
  attachUser,
  policyGuard,
  authRequired,
  adminRequired,
  createRateLimiter,
  securityHeaders,
  corsOptions,
  notFoundHandler,
  errorHandler,
  resolvePolicy,
};
