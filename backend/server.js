const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const nodemailer = require("nodemailer");

/* ===== [TOI UU] Lop cau hinh + bao mat (them moi, khong xoa code cu) ===== */
const config = require("./src/security/env");
const jwtHelper = require("./src/security/jwt");
const passwordHelper = require("./src/security/password");
const {
  attachUser,
  policyGuard,
  createRateLimiter,
  securityHeaders,
  corsOptions,
  notFoundHandler,
  errorHandler,
} = require("./src/security/guard");
const createOptimizedRoutes = require("./src/routes/optimized.routes");

const app = express();
app.disable("x-powered-by");
const PORT = config.port; // [TOI UU] doc tu bien moi truong PORT

app.use(cors(corsOptions)); // [TOI UU] chi cho phep origin trong CORS_ORIGINS
app.use(securityHeaders); // [TOI UU] header bao mat (thay helmet)
app.use(express.json({ limit: config.bodyLimit })); // [TOI UU] 50mb -> BODY_LIMIT (mac dinh 5mb)
app.use(
  createRateLimiter({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxApi,
    key: "api",
    // GET/HEAD/OPTIONS là các request đọc/tiền kiểm tra; không tính quota để
    // polling dữ liệu không làm khóa các thao tác xác nhận của quản trị viên.
    skip: (req) => ["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase()),
  }),
);
const loginLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxLogin,
  key: "login",
  skipSuccessfulRequests: true,
  message: "Ban dang nhap sai qua nhieu lan. Vui long thu lai sau 15 phut.",
});
app.use(attachUser); // [TOI UU] doc JWT tu header Authorization
app.use(policyGuard); // [TOI UU] phan quyen tap trung cho toan bo /api/*
app.post("/api/log-error", (req, res) => {
  console.log("[BROWSER ERROR]", req.body);
  res.sendStatus(200);
});
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/* [TOI UU] Khong hard-code mat khau DB nua - doc tu .env (co gia tri mac dinh
   giong cu de may dev cua ban van chay ngay khong can sua gi). */
const dbConfig = {
  user: config.db.user,
  password: config.db.password,
  server: config.db.server,
  database: config.db.database,
  options: config.db.options,
  pool: config.db.pool,
  requestTimeout: config.db.requestTimeout,
};

const pool = new sql.ConnectionPool(dbConfig);
// mssql phát sự kiện `error` khi kết nối rớt/được khôi phục. Nếu không có
// listener, EventEmitter có thể ném uncaught exception và làm tiến trình Node
// chết; concurrently sẽ chỉ còn Vite chạy nên người dùng tưởng API mất.
pool.on("error", (err) => {
  console.error("[DB POOL ERROR]", err && err.message ? err.message : err);
});
// Tu dong dong bo cac thay doi schema/chinh sach nho cho CSDL da tao tu schema cu.
// Cac lenh deu co dieu kien va idempotent, khong can xoa/tai lai bang.
const poolConnect = pool.connect().then(async () => {
  try {
    await pool.request().query(
      "IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL AND COL_LENGTH('dbo.Users', 'AvatarURL') IS NULL ALTER TABLE dbo.Users ADD AvatarURL nvarchar(max) NULL;",
    );
  } catch (err) {
    console.error("[DB MIGRATION] Khong cap nhat cot AvatarURL:", err?.message || err);
  }
  try {
    await pool.request().query(`
      IF OBJECT_ID(N'dbo.Orders', N'U') IS NOT NULL
      BEGIN
        IF COL_LENGTH('dbo.Orders', 'StockIssueStatus') IS NULL
          ALTER TABLE dbo.Orders ADD StockIssueStatus nvarchar(30) NULL;
        IF COL_LENGTH('dbo.Orders', 'StockIssueReason') IS NULL
          ALTER TABLE dbo.Orders ADD StockIssueReason nvarchar(500) NULL;
        IF COL_LENGTH('dbo.Orders', 'StockRestoredAt') IS NULL
          ALTER TABLE dbo.Orders ADD StockRestoredAt datetime NULL;
      END;
    `);
    await pool.request().query(`
      IF OBJECT_ID(N'dbo.Orders', N'U') IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM sys.indexes
           WHERE name=N'IX_Orders_StockIssueStatus'
             AND object_id=OBJECT_ID(N'dbo.Orders')
         )
        CREATE INDEX IX_Orders_StockIssueStatus ON dbo.Orders(StockIssueStatus, Status);
    `);
    await pool.request().query(`
      IF OBJECT_ID(N'dbo.ProductVariants', N'U') IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM sys.check_constraints
           WHERE name=N'CK_ProductVariants_Stock_NonNegative'
             AND parent_object_id=OBJECT_ID(N'dbo.ProductVariants')
         )
         AND NOT EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE ISNULL(StockQuantity,0)<0)
        ALTER TABLE dbo.ProductVariants WITH CHECK
          ADD CONSTRAINT CK_ProductVariants_Stock_NonNegative CHECK (StockQuantity>=0);
    `);
    // Đánh dấu các đơn cũ có chi tiết không thể đối soát (variant bị xóa,
    // sai ProductID/số lượng hoặc tồn kho âm). Đơn hợp lệ không bị suy đoán
    // là oversell vì số tồn hiện tại không chứa thông tin tồn ban đầu.
    await pool.request().query(`
      IF OBJECT_ID(N'dbo.Orders', N'U') IS NOT NULL
         AND OBJECT_ID(N'dbo.OrderDetails', N'U') IS NOT NULL
         AND OBJECT_ID(N'dbo.ProductVariants', N'U') IS NOT NULL
      BEGIN
        UPDATE o
        SET StockIssueStatus=N'NEEDS_REVIEW',
            StockIssueReason=COALESCE(NULLIF(o.StockIssueReason,N''), N'Dữ liệu tồn kho/biến thể cần quản lý kiểm tra.'),
            UpdatedAt=GETDATE()
        FROM dbo.Orders o
        WHERE ISNULL(o.StockIssueStatus,N'')=N''
          AND ISNULL(o.Status,N'') NOT IN (N'Đã hủy',N'Da huy',N'Đã nhận hàng',N'Da nhan hang',N'Đã hoàn tất trả hàng')
          AND EXISTS (
            SELECT 1
            FROM dbo.OrderDetails od
            LEFT JOIN dbo.ProductVariants v ON v.ProductVariantID=od.ProductVariantID
            OUTER APPLY (
              SELECT TOP 1 vv.ProductVariantID
              FROM dbo.ProductVariants vv
              WHERE vv.ProductID=od.ProductID
                AND ISNULL(vv.Size,N'')=ISNULL(od.Size,N'')
                AND ISNULL(vv.ColorName,N'')=ISNULL(od.Color,N'')
              ORDER BY vv.ProductVariantID
            ) matching
            WHERE od.OrderID=o.OrderID
              AND (
                ISNULL(od.Quantity,0)<=0
                OR (od.ProductVariantID IS NOT NULL AND (v.ProductVariantID IS NULL OR v.ProductID<>od.ProductID))
                OR (od.ProductVariantID IS NULL AND matching.ProductVariantID IS NULL)
                OR ISNULL(v.StockQuantity,0)<0
              )
          );
      END;
    `);
  } catch (err) {
    console.error("[DB MIGRATION] Khong cap nhat co che doi soat ton kho:", err?.message || err);
  }
  try {
    await pool.request().query(
      "IF OBJECT_ID(N'dbo.ShippingMethods', N'U') IS NOT NULL UPDATE dbo.ShippingMethods SET IsActive=0 WHERE UPPER(LTRIM(RTRIM(MethodCode)))='EXPRESS';",
    );
  } catch (err) {
    console.error("[DB MIGRATION] Khong tat phuong thuc EXPRESS:", err?.message || err);
  }
});

poolConnect
  .then(() => {
    console.log("OK Da ket noi thanh cong voi CSDL SQL Server (ShoegroupDB)!");
  })
  .catch((err) => console.error("Loi ket noi DB:", err));

// ================= CAU HINH EMAIL (nodemailer) =================
// Voi Gmail: bat xac thuc 2 buoc roi tao "App Password" tai:
//   https://myaccount.google.com/apppasswords
// Sau do dien EMAIL_USER = email cua ban, EMAIL_PASS = app password 16 ky tu.
// Nen dat qua bien moi truong khi deploy. Cai thu vien: npm install nodemailer
/* [TOI UU][BAO MAT] App password Gmail da bi go khoi ma nguon.
   Hay dat EMAIL_USER / EMAIL_PASS trong file .env va THU HOI app password cu. */
const FRONTEND_URL = config.frontendUrl;
const EMAIL_USER = config.mail.user;
const EMAIL_PASS = config.mail.pass;
const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});
// Kiem tra dang nhap SMTP NGAY khi khoi dong -> in ket qua ra terminal.
// Neu thay "[EMAIL] LOI" thi email/app-password sai (hoac chua bat 2FA).
if (!EMAIL_USER || !EMAIL_PASS) {
  console.warn(
    "[EMAIL] Chua cau hinh EMAIL_USER/EMAIL_PASS trong .env -> tinh nang gui mail se tam tat.",
  );
}
mailTransporter.verify((err) => {
  if (err) console.error("[EMAIL] LOI cau hinh gui mail:", err.message);
  else console.log("[EMAIL] San sang gui mail qua:", EMAIL_USER);
});

// ================= API XAC THUC =================
/* =========================================================================
 * [TOI UU][BAO MAT] Dang nhap
 *  - Khong so sanh mat khau tho trong SQL nua.
 *  - Ho tro NGUOC: tai khoan cu dang luu mat khau tho van dang nhap duoc,
 *    va se TU DONG duoc bam lai (scrypt) ngay sau lan dang nhap do.
 *  - Tra ve them `token` (JWT) de frontend gui kem moi request.
 * ========================================================================= */
app.post("/api/login", loginLimiter, async (req, res) => {
  try {
    // [TOI UU] Kiem tra du lieu TRUOC khi cho ket noi DB -> tra ve 400 dung chuan
    const { email, password } = req.body || {};
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Thieu email hoac mat khau" });
    await poolConnect;

    const r = await pool
      .request()
      .input("e", sql.VarChar, String(email).trim().toLowerCase())
      .query(
        "SELECT UserID as id_user, Email as email, FullName as full_name, Phone as phone, Address as address, AvatarURL as avatar_url, RoleID as role_id, PasswordHash as password_hash FROM Users WHERE LOWER(Email)=@e AND IsActive=1",
      );

    const row = r.recordset[0];
    const check = row
      ? await passwordHelper.verify(password, row.password_hash)
      : { ok: false, needsUpgrade: false };

    if (!row || !check.ok) {
      return res
        .status(401)
        .json({ success: false, message: "Sai email hoac mat khau" });
    }

    // Tu dong nang cap mat khau tho -> scrypt (chay am tham, khong anh huong nguoi dung)
    if (check.needsUpgrade) {
      try {
        const newHash = await passwordHelper.hash(password);
        await pool
          .request()
          .input("id", sql.Int, row.id_user)
          .input("h", sql.VarChar, newHash)
          .query(
            "UPDATE Users SET PasswordHash=@h, LastPasswordChangedAt=ISNULL(LastPasswordChangedAt, GETDATE()) WHERE UserID=@id",
          );
        try {
          await pool
            .request()
            .input("id", sql.Int, row.id_user)
            .query("UPDATE Users SET PasswordAlgo='scrypt' WHERE UserID=@id");
        } catch (_) {
          /* cot PasswordAlgo chua co -> bo qua */
        }
        console.log("[SECURITY] Da bam lai mat khau cho UserID", row.id_user);
      } catch (upErr) {
        console.warn("[SECURITY] Khong nang cap duoc mat khau:", upErr.message);
      }
    }

    delete row.password_hash;
    row.role = Number(row.role_id) === 1 ? "Admin" : "Customer";
    const token = jwtHelper.issueForUser(row);
    // Giu nguyen dinh dang cu (success + user) va BO SUNG token
    res.json({ success: true, user: { ...row, token }, token });
  } catch (e) {
    console.error("[LOGIN ERROR]", e.message);
    res
      .status(500)
      .json({ success: false, message: "Loi dang nhap, thu lai sau" });
  }
});

/* [TOI UU][BAO MAT] Dang ky: bam mat khau bang scrypt truoc khi luu. */
app.post("/api/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body || {};
    if (!fullName || !email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Vui long nhap day du thong tin." });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email)))
      return res
        .status(400)
        .json({ success: false, message: "Email khong hop le." });
    const strength = passwordHelper.checkStrength(password);
    if (!strength.ok)
      return res
        .status(400)
        .json({ success: false, message: strength.message });

    await poolConnect;
    const mail = String(email).trim().toLowerCase();
    const check = await pool
      .request()
      .input("e", sql.VarChar, mail)
      .query("SELECT UserID FROM Users WHERE LOWER(Email)=@e");
    if (check.recordset.length > 0)
      return res
        .status(400)
        .json({ success: false, message: "Email nay da duoc su dung." });

    const hashed = await passwordHelper.hash(password);
    const r = await pool
      .request()
      .input("f", sql.NVarChar, String(fullName).trim())
      .input("e", sql.VarChar, mail)
      .input("p", sql.VarChar, hashed)
      .query(
        "INSERT INTO Users (RoleID, FullName, Email, PasswordHash, IsActive) OUTPUT INSERTED.UserID as id_user, INSERTED.Email as email, INSERTED.FullName as full_name, INSERTED.Phone as phone, INSERTED.Address as address, INSERTED.AvatarURL as avatar_url, INSERTED.RoleID as role_id VALUES (2, @f, @e, @p, 1)",
      );

    const user = { ...r.recordset[0], role: "Customer" };
    const token = jwtHelper.issueForUser(user);
    res.json({
      success: true,
      message: "Dang ky thanh cong",
      user: { ...user, token },
      token,
    });
  } catch (e) {
    console.error("[REGISTER ERROR]", e.message);
    res
      .status(500)
      .json({ success: false, message: "Khong dang ky duoc, thu lai sau" });
  }
});

// ================= API SO DIA CHI THEO TAI KHOAN =================
const ADDRESS_SELECT = `
  SELECT AddressID as id, UserID as userId,
         RecipientName as recipient, ISNULL(Phone, '') as phone,
         ISNULL(Province, '') as province, ISNULL(District, '') as district,
         ISNULL(Ward, '') as ward, ISNULL(AddressLine, '') as line,
         ISNULL(FullAddress, '') as fullAddress,
         CAST(ISNULL(IsVerified, 0) AS bit) as isVerified,
         CAST(ISNULL(IsDefault, 0) AS bit) as isDefault
  FROM UserAddresses`;

const cleanAddressText = (value, maxLength) =>
  String(value ?? "")
    .trim()
    .slice(0, maxLength);

function buildAddressPayload(body = {}, current = {}) {
  const payload = {
    recipient: cleanAddressText(
      body.recipient ?? body.recipientName ?? current.recipient,
      100,
    ),
    phone: cleanAddressText(body.phone ?? current.phone, 20),
    province: cleanAddressText(
      body.province ?? body.provinceName ?? current.province,
      100,
    ),
    district: cleanAddressText(body.district ?? current.district, 100),
    ward: cleanAddressText(
      body.ward ?? body.communeName ?? current.ward,
      100,
    ),
    line: cleanAddressText(
      body.line ?? body.addressLine ?? current.line,
      255,
    ),
  };
  payload.fullAddress = [
    payload.line,
    payload.ward,
    payload.district,
    payload.province,
  ]
    .filter(Boolean)
    .join(", ")
    .slice(0, 500);
  return payload;
}

function validateAddressPayload(payload) {
  if (!payload.recipient || !payload.phone || !payload.province || !payload.ward || !payload.line) {
    return "Vui long nhap day du nguoi nhan, so dien thoai va dia chi.";
  }
  if (!/^0(?:3|5|7|8|9)\d{8}$/.test(payload.phone)) {
    return "So dien thoai nhan hang khong hop le.";
  }
  return null;
}

async function lockAddressesForUser(transaction, userId) {
  const result = await new sql.Request(transaction)
    .input("uid", sql.Int, userId)
    .query(`${ADDRESS_SELECT} WITH (UPDLOCK, HOLDLOCK) WHERE UserID=@uid ORDER BY AddressID`);
  return result.recordset;
}

async function keepOnlyDefaultAddress(transaction, userId, addressId) {
  await new sql.Request(transaction)
    .input("uid", sql.Int, userId)
    .input("aid", sql.Int, addressId)
    .query(`
      UPDATE UserAddresses
      SET IsDefault=CASE WHEN AddressID=@aid THEN 1 ELSE 0 END
      WHERE UserID=@uid
    `);
}

function preferredDefaultAddressId(addresses) {
  if (!addresses.length) return null;
  const defaults = addresses.filter((address) => address.isDefault);
  return (defaults[defaults.length - 1] || addresses[addresses.length - 1]).id;
}

function normalizeOrderStatus(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim()
    .toLowerCase();
}

const ORDER_STATUS_TRANSITIONS = {
  "cho xac nhan": new Set(["cho xac nhan", "da xac nhan", "da huy"]),
  "da xac nhan": new Set(["da xac nhan", "dang van chuyen", "da huy"]),
  "dang van chuyen": new Set(["dang van chuyen", "da giao hang thanh cong", "da huy"]),
  "da giao hang thanh cong": new Set(["da giao hang thanh cong", "da nhan hang", "yeu cau tra hang"]),
  "da nhan hang": new Set(["da nhan hang", "yeu cau tra hang"]),
  "yeu cau tra hang": new Set(["yeu cau tra hang", "da nhan hang"]),
  "da huy": new Set(["da huy"]),
  "cho xu ly": new Set(["cho xu ly", "cho xac nhan", "da xac nhan", "da huy"]),
  "pending": new Set(["pending", "cho xac nhan", "da xac nhan", "da huy"]),
  "dang giao": new Set(["dang giao", "da giao hang thanh cong", "da huy"]),
  "delivered": new Set(["delivered", "da nhan hang", "yeu cau tra hang"]),
  "received": new Set(["received", "yeu cau tra hang"]),
};

const ORDER_STATUS_ALIASES = {
  "cho xu ly": "Chờ xác nhận", "pending": "Chờ xác nhận", "cho xac nhan": "Chờ xác nhận",
  "confirmed": "Đã xác nhận", "da xac nhan": "Đã xác nhận", "dang lay hang": "Đã xác nhận",
  "dang chuan bi hang": "Đã xác nhận", "processing": "Đã xác nhận", "picking": "Đã xác nhận",
  "dang van chuyen": "Đang vận chuyển", "dang giao": "Đang vận chuyển", "shipped": "Đang vận chuyển",
  "da giao": "Đã giao hàng thành công", "da giao hang thanh cong": "Đã giao hàng thành công", "delivered": "Đã giao hàng thành công",
  "da nhan hang": "Đã nhận hàng", "received": "Đã nhận hàng", "yeu cau tra hang": "Yêu cầu trả hàng",
  "da hoan tat tra hang": "Đã hoàn tất trả hàng", "da huy": "Đã hủy", "cancelled": "Đã hủy", "canceled": "Đã hủy",
};

function canonicalOrderStatus(value) {
  return ORDER_STATUS_ALIASES[normalizeOrderStatus(value)] || cleanAddressText(value, 50);
}

const PAYMENT_STATUSES = new Set([
  "chua thanh toan",
  "cho thanh toan",
  "da thanh toan",
  "hoan tien",
  "da huy",
]);

// Các trạng thái này đều biểu thị tiền đã vào hệ thống ("Chờ thanh toán"
// là giá trị cũ được tạo khi khách đã bấm báo chuyển khoản).
const PAID_PAYMENT_STATUS_KEYS = new Set(["da thanh toan", "cho thanh toan"]);
const isPaidPaymentStatus = (value) => PAID_PAYMENT_STATUS_KEYS.has(normalizeOrderStatus(value));

const isBankPayment = (method) => {
  const normalized = normalizeOrderStatus(method);
  return normalized.includes("chuyen khoan") || normalized.includes("bank") || normalized.includes("momo") || normalized.includes("vnpay");
};

const isCodPayment = (method) => {
  const normalized = normalizeOrderStatus(method);
  return normalized.includes("cod") || normalized.includes("nhan hang") || normalized.includes("tien mat");
};

async function insertOrderHistory(transaction, orderId, oldStatus, newStatus, note, changedBy) {
  await new sql.Request(transaction)
    .input("oid", sql.Int, orderId)
    .input("old", sql.NVarChar, oldStatus || "")
    .input("next", sql.NVarChar, newStatus || "")
    .input("note", sql.NVarChar, cleanAddressText(note, 500))
    .input("uid", sql.Int, Number(changedBy) || null)
    .query(`
      INSERT INTO OrderStatusHistory (OrderID, OldStatus, NewStatus, Note, ChangedBy, ChangedAt)
      VALUES (@oid, @old, @next, @note, @uid, GETDATE())
    `);
}

// Lưu dấu vết hoàn tiền một lần cho cả hủy đơn và trả hàng. Trạng thái đơn
// vẫn được cập nhật ngay; bản ghi này giúp đối soát không bị mất giao dịch.
async function recordRefundTransaction(transaction, orderId, amount) {
  await new sql.Request(transaction)
    .input("oid", sql.Int, Number(orderId))
    .input("amt", sql.Decimal(18, 2), Number(amount) || 0)
    .query(`
      IF NOT EXISTS (
        SELECT 1 FROM PaymentTransactions
        WHERE OrderID=@oid AND Provider=N'MANUAL_REFUND' AND Status=N'REFUNDED'
      )
        INSERT INTO PaymentTransactions
          (OrderID, Provider, Amount, Status, SignatureValid, CreatedAt, CompletedAt)
        VALUES (@oid, N'MANUAL_REFUND', @amt, N'REFUNDED', 1, GETDATE(), GETDATE());
    `);
}

function transitionAllowed(currentStatus, nextStatus) {
  const current = normalizeOrderStatus(currentStatus);
  const next = normalizeOrderStatus(nextStatus);
  if (current === next) return true;
  return Boolean(ORDER_STATUS_TRANSITIONS[current] && ORDER_STATUS_TRANSITIONS[current].has(next));
}

async function restoreOrderStock(transaction, orderId) {
  // Khóa hàng đơn và dùng StockRestoredAt như idempotency key. Nhờ vậy retry
  // hoặc hai thao tác hủy đồng thời không bao giờ cộng kho hai lần.
  const restoreClaim = await new sql.Request(transaction)
    .input("oid", sql.Int, orderId)
    .query(`
      SELECT StockRestoredAt
      FROM Orders WITH (UPDLOCK, HOLDLOCK)
      WHERE OrderID=@oid
    `);
  const claimRow = restoreClaim.recordset[0];
  if (!claimRow || claimRow.StockRestoredAt) return false;

  const details = await new sql.Request(transaction)
    .input("oid", sql.Int, orderId)
    .query(`
      SELECT ProductID, ProductVariantID, Quantity, Size, Color
      FROM OrderDetails
      WHERE OrderID=@oid
    `);
  for (const row of details.recordset) {
    if (row.ProductVariantID) {
      await new sql.Request(transaction)
        .input("vid", sql.Int, row.ProductVariantID)
        .input("q", sql.Int, row.Quantity)
        .query(`
          UPDATE ProductVariants
          SET StockQuantity=ISNULL(StockQuantity, 0)+@q,
              Version=ISNULL(Version, 0)+1
          WHERE ProductVariantID=@vid
        `);
    } else if (row.ProductID && row.Size && row.Color) {
      const variant = await new sql.Request(transaction)
        .input("pid", sql.Int, row.ProductID)
        .input("sz", sql.NVarChar, row.Size)
        .input("clr", sql.NVarChar, row.Color)
        .query(`
          SELECT TOP 1 ProductVariantID as id
          FROM ProductVariants WITH (UPDLOCK, HOLDLOCK)
          WHERE ProductID=@pid AND ISNULL(Size, N'')=@sz AND ISNULL(ColorName, N'')=@clr
          ORDER BY ProductVariantID
        `);
      const variantId = variant.recordset[0] && variant.recordset[0].id;
      if (variantId) {
        await new sql.Request(transaction)
          .input("vid", sql.Int, variantId)
          .input("q", sql.Int, row.Quantity)
          .query(`
            UPDATE ProductVariants
            SET StockQuantity=ISNULL(StockQuantity, 0)+@q,
                Version=ISNULL(Version, 0)+1
            WHERE ProductVariantID=@vid
          `);
      }
    }
  }

  await new sql.Request(transaction)
    .input("oid", sql.Int, orderId)
    .query(`
      UPDATE Orders
      SET StockRestoredAt=GETDATE(),
          StockIssueStatus=CASE WHEN StockIssueStatus=N'NEEDS_REVIEW' THEN N'RESTORED' ELSE StockIssueStatus END,
          UpdatedAt=GETDATE()
      WHERE OrderID=@oid AND StockRestoredAt IS NULL
    `);
  return true;
}

app.get("/api/addresses", async (req, res) => {
  try {
    const userId = Number(req.auth && req.auth.sub);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Ban chua dang nhap." });
    }
    await poolConnect;
    const result = await pool
      .request()
      .input("uid", sql.Int, userId)
      .query(`${ADDRESS_SELECT} WHERE UserID=@uid ORDER BY IsDefault DESC, AddressID DESC`);
    res.json(result.recordset);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/addresses", async (req, res) => {
  const userId = Number(req.auth && req.auth.sub);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Ban chua dang nhap." });
  }

  const body = req.body || {};
  const payload = buildAddressPayload(body);
  const validationError = validateAddressPayload(payload);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  await poolConnect;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const lockedAddresses = await lockAddressesForUser(transaction, userId);
    const defaultCount = lockedAddresses.filter((address) => address.isDefault).length;
    const requestedDefault = body.isDefault === true || body.isDefault === 1;
    const shouldBeDefault = requestedDefault || lockedAddresses.length === 0 || defaultCount === 0;

    if (shouldBeDefault) {
      await new sql.Request(transaction)
        .input("uid", sql.Int, userId)
        .query("UPDATE UserAddresses SET IsDefault=0 WHERE UserID=@uid");
    } else if (defaultCount !== 1) {
      await keepOnlyDefaultAddress(
        transaction,
        userId,
        preferredDefaultAddressId(lockedAddresses),
      );
    }

    const inserted = await new sql.Request(transaction)
      .input("uid", sql.Int, userId)
      .input("recipient", sql.NVarChar, payload.recipient)
      .input("phone", sql.VarChar, payload.phone)
      .input("province", sql.NVarChar, payload.province)
      .input("district", sql.NVarChar, payload.district)
      .input("ward", sql.NVarChar, payload.ward)
      .input("line", sql.NVarChar, payload.line)
      .input("full", sql.NVarChar, payload.fullAddress)
      .input("isDefault", sql.Bit, shouldBeDefault).query(`
        INSERT INTO UserAddresses
          (UserID, RecipientName, Phone, Province, District, Ward, AddressLine, FullAddress, IsVerified, IsDefault, CreatedAt)
        OUTPUT INSERTED.AddressID as id
        VALUES (@uid, @recipient, @phone, @province, @district, @ward, @line, @full, 0, @isDefault, GETDATE())
      `);
    const addressId = inserted.recordset[0].id;
    const result = await new sql.Request(transaction)
      .input("uid", sql.Int, userId)
      .input("aid", sql.Int, addressId)
      .query(`${ADDRESS_SELECT} WHERE UserID=@uid AND AddressID=@aid`);
    await transaction.commit();
    res.status(201).json(result.recordset[0]);
  } catch (e) {
    if (transaction._aborted !== true) {
      try { await transaction.rollback(); } catch (_) {}
    }
    res.status(500).json({ success: false, message: e.message });
  }
});

app.put("/api/addresses/:id", async (req, res) => {
  const userId = Number(req.auth && req.auth.sub);
  const addressId = Number(req.params.id);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Ban chua dang nhap." });
  }
  if (!Number.isInteger(addressId) || addressId <= 0) {
    return res.status(400).json({ success: false, message: "Dia chi khong hop le." });
  }

  await poolConnect;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const lockedAddresses = await lockAddressesForUser(transaction, userId);
    const current = lockedAddresses.find((address) => Number(address.id) === addressId);
    if (!current) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Khong tim thay dia chi." });
    }

    const body = req.body || {};
    const payload = buildAddressPayload(body, current);
    const validationError = validateAddressPayload(payload);
    if (validationError) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: validationError });
    }

    // Khi da co dia chi, he thong luon duy tri chinh xac mot dia chi mac dinh.
    const defaultCount = lockedAddresses.filter((address) => address.isDefault).length;
    const requestedDefault = body.isDefault === true || body.isDefault === 1;
    const shouldBeDefault = requestedDefault || Boolean(current.isDefault) || defaultCount === 0;
    if (shouldBeDefault) {
      await new sql.Request(transaction)
        .input("uid", sql.Int, userId)
        .query("UPDATE UserAddresses SET IsDefault=0 WHERE UserID=@uid");
    } else if (defaultCount !== 1) {
      await keepOnlyDefaultAddress(
        transaction,
        userId,
        preferredDefaultAddressId(lockedAddresses),
      );
    }

    await new sql.Request(transaction)
      .input("uid", sql.Int, userId)
      .input("aid", sql.Int, addressId)
      .input("recipient", sql.NVarChar, payload.recipient)
      .input("phone", sql.VarChar, payload.phone)
      .input("province", sql.NVarChar, payload.province)
      .input("district", sql.NVarChar, payload.district)
      .input("ward", sql.NVarChar, payload.ward)
      .input("line", sql.NVarChar, payload.line)
      .input("full", sql.NVarChar, payload.fullAddress)
      .input("isDefault", sql.Bit, shouldBeDefault).query(`
        UPDATE UserAddresses
        SET RecipientName=@recipient, Phone=@phone, Province=@province,
            District=@district, Ward=@ward, AddressLine=@line,
            FullAddress=@full, IsVerified=0, IsDefault=@isDefault
        WHERE UserID=@uid AND AddressID=@aid
      `);

    const result = await new sql.Request(transaction)
      .input("uid", sql.Int, userId)
      .input("aid", sql.Int, addressId)
      .query(`${ADDRESS_SELECT} WHERE UserID=@uid AND AddressID=@aid`);
    await transaction.commit();
    res.json(result.recordset[0]);
  } catch (e) {
    if (transaction._aborted !== true) {
      try { await transaction.rollback(); } catch (_) {}
    }
    res.status(500).json({ success: false, message: e.message });
  }
});

app.delete("/api/addresses/:id", async (req, res) => {
  const userId = Number(req.auth && req.auth.sub);
  const addressId = Number(req.params.id);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Ban chua dang nhap." });
  }
  if (!Number.isInteger(addressId) || addressId <= 0) {
    return res.status(400).json({ success: false, message: "Dia chi khong hop le." });
  }

  await poolConnect;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const lockedAddresses = await lockAddressesForUser(transaction, userId);
    if (!lockedAddresses.some((address) => Number(address.id) === addressId)) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Khong tim thay dia chi." });
    }

    // Don hang da luu snapshot ShippingAddress, nen co the bo FK truoc khi xoa khoi so.
    await new sql.Request(transaction)
      .input("aid", sql.Int, addressId)
      .query("UPDATE Orders SET AddressID=NULL WHERE AddressID=@aid");
    await new sql.Request(transaction)
      .input("uid", sql.Int, userId)
      .input("aid", sql.Int, addressId)
      .query("DELETE FROM UserAddresses WHERE UserID=@uid AND AddressID=@aid");
    const remainingAddresses = lockedAddresses.filter(
      (address) => Number(address.id) !== addressId,
    );
    if (remainingAddresses.length) {
      await keepOnlyDefaultAddress(
        transaction,
        userId,
        preferredDefaultAddressId(remainingAddresses),
      );
    }
    await transaction.commit();
    res.json({ success: true });
  } catch (e) {
    if (transaction._aborted !== true) {
      try { await transaction.rollback(); } catch (_) {}
    }
    res.status(500).json({ success: false, message: e.message });
  }
});

// ================= API QUAN LY DON HANG VA THANH TOAN =================

// 1. TAO DON HANG (tu Checkout online VA tu Ban tai quay / POS)
//    -> Doc duoc CA hai dinh dang: camelCase (online) va snake_case (POS).
app.post("/api/orders", async (req, res) => {
  try {
    await poolConnect;
    const b = req.body || {};

    const isAdminOrder = req.auth && req.auth.role === "Admin";
    const authenticatedUserId = Number(req.auth && req.auth.sub) || null;
    const requestedUserId = b.userId ?? b.user_id ?? null;
    const userId =
      isAdminOrder
        ? (requestedUserId == null || requestedUserId === "" ? null : Number(requestedUserId))
        : authenticatedUserId;
    let totalAmount = Number(b.totalAmount ?? b.total ?? 0);
    let shippingAddress = b.shippingAddress ?? b.customer_address ?? "";
    let customerName = b.customerName ?? b.customer_name ?? "Khach le";
    let customerPhone = b.customerPhone ?? b.customer_phone ?? "";
    const rawAddressId = b.addressId ?? b.address_id ?? null;
    const addressId =
      rawAddressId == null || rawAddressId === "" ? null : Number(rawAddressId);
    let shippingFee = Number(b.shippingFee ?? b.shipping_fee ?? 0);
    let shippingMethodCode = cleanAddressText(
      b.shippingMethodCode ?? b.shipping_method_code ?? "STANDARD",
      20,
    ).toUpperCase();
    let shippingMethodId = null;
    let shippingDistanceKm = null;
    let shippingEta = null;
    let discountAmount = Number(b.discountAmount ?? b.discount_amount ?? 0);
    let paymentMethod = b.paymentMethod ?? b.payment_method ?? "COD";
    let paymentStatus =
      b.paymentStatus ?? b.payment_status ?? "Chua thanh toan";
    let status = b.status ?? "Chờ xác nhận";
    let handledBy = b.handledBy ?? b.handled_by ?? null;
    const note = cleanAddressText(b.note ?? b.order_note, 500);
    const couponCode = cleanAddressText(b.couponCode ?? b.coupon_code, 50) || null;
    const items = b.items ?? b.products ?? [];
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Don hang khong co san pham." });
    }
    if (userId !== null && (!Number.isInteger(userId) || userId <= 0)) {
      return res.status(400).json({ success: false, message: "Tai khoan dat hang khong hop le." });
    }
    if (addressId !== null && (!Number.isInteger(addressId) || addressId <= 0)) {
      return res.status(400).json({ success: false, message: "Dia chi dat hang khong hop le." });
    }
    if (!isAdminOrder && addressId === null) {
      return res.status(400).json({ success: false, message: "Vui long chon dia chi tu so dia chi." });
    }

    if (!isAdminOrder) {
      const normalizedPaymentMethod = normalizeOrderStatus(paymentMethod);
      if (["chuyen khoan", "bank"].some((token) => normalizedPaymentMethod.includes(token))) {
        paymentMethod = "Chuyển khoản ngân hàng";
      } else if (["cod", "nhan hang"].some((token) => normalizedPaymentMethod.includes(token))) {
        paymentMethod = "Thanh toán khi nhận hàng (COD)";
      } else {
        return res.status(400).json({ success: false, message: "Phuong thuc thanh toan khong hop le." });
      }
      if (shippingMethodCode !== "STANDARD") {
        return res.status(400).json({ success: false, message: "Phuong thuc van chuyen khong hop le." });
      }
      status = "Chờ xác nhận";
      paymentStatus = "Chưa thanh toán";
      handledBy = "Online";
    }

    const normalizedPaymentStatus = normalizeOrderStatus(paymentStatus);
    if (!PAYMENT_STATUSES.has(normalizedPaymentStatus)) {
      return res.status(400).json({ success: false, message: "Trang thai thanh toan khong hop le." });
    }
    paymentStatus = {
      "chua thanh toan": "Chưa thanh toán",
      "cho thanh toan": "Chờ thanh toán",
      "da thanh toan": "Đã thanh toán",
      "hoan tien": "Hoàn tiền",
      "da huy": "Đã hủy",
    }[normalizedPaymentStatus];
    const paymentDueAt = isBankPayment(paymentMethod) && !["Đã thanh toán", "Hoàn tiền", "Đã hủy"].includes(paymentStatus)
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : null;

    const transaction = new sql.Transaction(pool);
    // Một giao dịch serializable bao trùm cả xác thực variant, tạo chi tiết
    // và UPDATE tồn kho có điều kiện; hai checkout đồng thời không thể cùng
    // nhận một đơn vị cuối cùng.
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    try {
      let selectedAddressForShipping = null;
      if (addressId) {
        if (!userId) {
          const err = new Error("Can dang nhap de su dung dia chi da luu.");
          err.statusCode = 401;
          throw err;
        }
        const addressResult = await new sql.Request(transaction)
          .input("uid", sql.Int, userId)
          .input("aid", sql.Int, addressId)
          .query(`${ADDRESS_SELECT} WHERE UserID=@uid AND AddressID=@aid`);
        selectedAddressForShipping = addressResult.recordset[0];
        if (!selectedAddressForShipping) {
          const err = new Error("Dia chi khong thuoc tai khoan dang dat hang.");
          err.statusCode = 400;
          throw err;
        }
        if (validateAddressPayload(selectedAddressForShipping)) {
          const err = new Error("Dia chi da luu khong con hop le. Vui long cap nhat so dia chi.");
          err.statusCode = 409;
          throw err;
        }
        shippingAddress = selectedAddressForShipping.fullAddress || buildAddressPayload(selectedAddressForShipping).fullAddress;
        customerName = selectedAddressForShipping.recipient;
        customerPhone = selectedAddressForShipping.phone;
      }

      if (!isAdminOrder) {
        let canonicalSubtotal = 0;
        for (const item of items) {
          const quantity = Number(item.quantity ?? 1);
          const productId = Number(item.productId ?? item.product_id);
          const rawVariantId =
            item.productVariantId ??
            item.product_variant_id ??
            item.variant_id ??
            null;
          const variantId = rawVariantId === null ? null : Number(rawVariantId);
          const size = cleanAddressText(item.size, 10);
          const color = cleanAddressText(item.color, 50);
          if (!Number.isInteger(quantity) || quantity <= 0) {
            const err = new Error("So luong san pham trong don khong hop le.");
            err.statusCode = 400;
            throw err;
          }
          if (!Number.isInteger(productId) || productId <= 0) {
            const err = new Error("Ma san pham trong don khong hop le.");
            err.statusCode = 400;
            throw err;
          }
          if (variantId !== null && (!Number.isInteger(variantId) || variantId <= 0)) {
            const err = new Error("Ma bien the san pham khong hop le.");
            err.statusCode = 400;
            throw err;
          }
          if (variantId === null && (!size || !color)) {
            const err = new Error("San pham trong don thieu size hoac mau cua bien the.");
            err.statusCode = 400;
            throw err;
          }

          const priceRequest = new sql.Request(transaction)
            .input("pid", sql.Int, productId)
            .input("vid", sql.Int, variantId)
            .input("sz", sql.NVarChar, size)
            .input("clr", sql.NVarChar, color);
          const pricedVariant = await priceRequest.query(`
            SELECT TOP 1
                   p.ProductName as name,
                   CAST(CASE WHEN ISNULL(p.SalePrice, 0)>0 THEN p.SalePrice ELSE p.BasePrice END AS decimal(18,2)) as price,
                   v.ProductVariantID as variantId,
                   ISNULL(v.Size, N'') as size,
                   ISNULL(v.ColorName, N'') as color
            FROM Products p
            JOIN ProductVariants v ON v.ProductID=p.ProductID
            WHERE p.ProductID=@pid
              AND ISNULL(p.IsActive, 1)=1
              AND ISNULL(v.IsActive, 1)=1
              AND (
                (@vid IS NOT NULL AND v.ProductVariantID=@vid)
                OR
                (@vid IS NULL AND ISNULL(v.Size, N'')=@sz AND ISNULL(v.ColorName, N'')=@clr)
              )
            ORDER BY v.ProductVariantID
          `);
          const canonicalItem = pricedVariant.recordset[0];
          if (!canonicalItem) {
            const err = new Error("San pham hoac bien the khong con duoc kinh doanh.");
            err.statusCode = 409;
            throw err;
          }

          item.product_id = productId;
          item.variant_id = Number(canonicalItem.variantId);
          item.quantity = quantity;
          item.price = Number(canonicalItem.price || 0);
          item.name = canonicalItem.name || "San pham";
          item.size = canonicalItem.size || size;
          item.color = canonicalItem.color || color;
          canonicalSubtotal += item.price * quantity;
        }

        // Tính lại phí ở máy chủ từ địa chỉ đã lưu; không tin shippingFee do
        // trình duyệt gửi lên để tránh sửa giá bằng DevTools. Cùng helper này
        // được endpoint /shipping/quote sử dụng nên số tiền hiển thị và số
        // tiền lưu trong Orders luôn đồng nhất.
        const shippingQuote = await calculateShippingQuote({
          methodCode: shippingMethodCode,
          province: selectedAddressForShipping?.province || "",
          district: selectedAddressForShipping?.district || "",
          ward: selectedAddressForShipping?.ward || "",
          address: shippingAddress,
          transaction,
        });
        shippingFee = shippingQuote.fee;
        shippingMethodId = shippingQuote.methodId;
        shippingDistanceKm = shippingQuote.distanceKm;
        shippingEta = shippingQuote.eta;

        discountAmount = 0;
        if (couponCode) {
          const couponResult = await new sql.Request(transaction)
            .input("code", sql.VarChar, cleanAddressText(couponCode, 50))
            .query(`
              SELECT TOP 1 DiscountType, DiscountValue, DiscountPercent,
                     MinOrderAmount, MaxDiscountAmount, UsageLimit, ISNULL(UsedCount, 0) as UsedCount
              FROM Coupons WITH (UPDLOCK, HOLDLOCK)
              WHERE CouponCode=@code AND ISNULL(IsActive, 1)=1
                AND (StartDate IS NULL OR StartDate<=GETDATE())
                AND ExpiryDate>=GETDATE()
            `);
          const coupon = couponResult.recordset[0];
          if (!coupon || (Number(coupon.UsageLimit) > 0 && Number(coupon.UsedCount) >= Number(coupon.UsageLimit))) {
            const err = new Error("Ma giam gia khong hop le hoac da het luot su dung.");
            err.statusCode = 409;
            throw err;
          }
          if (canonicalSubtotal < Number(coupon.MinOrderAmount || 0)) {
            const err = new Error("Don hang chua dat gia tri toi thieu cua ma giam gia.");
            err.statusCode = 409;
            throw err;
          }

          const couponType = normalizeOrderStatus(coupon.DiscountType);
          const couponValue = Number(coupon.DiscountValue || coupon.DiscountPercent || 0);
          if (["co dinh", "fixed"].includes(couponType)) {
            discountAmount = couponValue;
          } else if (["phan tram", "percent"].includes(couponType)) {
            discountAmount = Math.round((canonicalSubtotal * couponValue) / 100);
          } else if (couponType === "freeship") {
            discountAmount = shippingFee;
          } else {
            const err = new Error("Loai ma giam gia khong duoc ho tro.");
            err.statusCode = 400;
            throw err;
          }
          if (couponType === "freeship") {
            discountAmount = Math.max(0, Math.min(discountAmount, shippingFee));
          } else {
            const maxDiscount = Number(coupon.MaxDiscountAmount || 0);
            if (maxDiscount > 0) discountAmount = Math.min(discountAmount, maxDiscount);
            discountAmount = Math.max(0, Math.min(discountAmount, canonicalSubtotal));
          }
        }
        totalAmount = Math.max(0, canonicalSubtotal + shippingFee - discountAmount);
      }

      const request = new sql.Request(transaction);

      // B1: Luu vao bang Orders (co PaymentStatus + HandledBy de phan biet Online/Offline)
      let orderResult = await request
        .input("uid", sql.Int, userId)
        .input("addressId", sql.Int, addressId)
        .input("tot", sql.Decimal(18, 2), totalAmount)
        .input("cname", sql.NVarChar, customerName)
        .input("cphone", sql.VarChar, customerPhone)
        .input("addr", sql.NVarChar, shippingAddress)
        .input("pay", sql.NVarChar, paymentMethod)
        .input("pstat", sql.NVarChar, paymentStatus)
        .input("stt", sql.NVarChar, status)
        .input("hb", sql.NVarChar, handledBy)
        .input("sfee", sql.Decimal(18, 2), shippingFee)
        .input("smid", sql.Int, shippingMethodId)
        .input("dist", sql.Decimal(10, 2), shippingDistanceKm)
        .input("eta", sql.NVarChar, shippingEta)
        .input("disc", sql.Decimal(18, 2), discountAmount)
        .input("note", sql.NVarChar, note)
        .input("due", sql.DateTime, paymentDueAt).query(`
          INSERT INTO Orders (UserID, AddressID, TotalAmount, OrderDate, Status, ShippingAddress, CustomerName, CustomerPhone, PaymentMethod, PaymentStatus, HandledBy, ShippingFee, ShippingMethodID, DeliveryDistanceKm, EstimatedDeliveryText, DiscountAmount, OrderNote, AutoCancelDeadline, PaymentDueAt)
          OUTPUT INSERTED.OrderID
          VALUES (@uid, @addressId, @tot, GETDATE(), @stt, @addr, @cname, @cphone, @pay, @pstat, @hb, @sfee, @smid, @dist, @eta, @disc, @note, DATEADD(day, 7, GETDATE()), @due)
        `);

      const orderId = orderResult.recordset[0].OrderID;

      // B2: Luu tung san pham vao bang OrderDetails (ho tro ca ProductID lan bien the)
      for (let item of items) {
        const quantity = Number(item.quantity ?? 1);
        if (!Number.isInteger(quantity) || quantity <= 0) {
          const err = new Error("So luong san pham trong don khong hop le.");
          err.statusCode = 400;
          throw err;
        }
        const productId = Number(item.productId ?? item.product_id);
        const rawVariantId =
          item.productVariantId ??
          item.product_variant_id ??
          item.variant_id ??
          null;
        const variantId = rawVariantId === null ? null : Number(rawVariantId);
        if (!Number.isInteger(productId) || productId <= 0) {
          const err = new Error("Ma san pham trong don khong hop le.");
          err.statusCode = 400;
          throw err;
        }
        if (variantId !== null && (!Number.isInteger(variantId) || variantId <= 0)) {
          const err = new Error("Ma bien the san pham khong hop le.");
          err.statusCode = 400;
          throw err;
        }
        if (variantId === null && (!item.size || !item.color)) {
          const err = new Error("San pham trong don thieu size hoac mau cua bien the.");
          err.statusCode = 400;
          throw err;
        }
        const detailReq = new sql.Request(transaction);
        await detailReq
          .input("oid", sql.Int, orderId)
          .input("pid", sql.Int, productId)
          .input("vid", sql.Int, variantId)
          .input("qty", sql.Int, quantity)
          .input("price", sql.Decimal(18, 2), item.price ?? 0)
          .input("sz", sql.NVarChar, item.size ?? "")
          .input("clr", sql.NVarChar, item.color ?? "")
          .input("nm", sql.NVarChar, item.name ?? "").query(`
            INSERT INTO OrderDetails (OrderID, ProductID, ProductVariantID, Quantity, UnitPrice, Size, Color, ProductNameSnapshot)
            VALUES (@oid, @pid, @vid, @qty, @price, @sz, @clr, @nm)
          `);
      }

      // B3: TRU TON KHO (FIX) - truoc day ban tai quay khong he tru StockQuantity
      // nen ton kho khong bao gio ve 0 va trang Thong ke khong the bao "het hang".
      for (let item of items) {
        const qty = Number(item.quantity ?? 1);
        const rawVariantId =
          item.productVariantId ??
          item.product_variant_id ??
          item.variant_id ??
          null;
        const variantId = rawVariantId === null ? null : Number(rawVariantId);
        const productId = Number(item.productId ?? item.product_id);
        const stockReq = new sql.Request(transaction);
        if (variantId) {
          const stockResult = await stockReq
            .input("vid", sql.Int, variantId)
            .input("pid", sql.Int, productId)
            .input("q", sql.Int, qty)
            .query(
              `UPDATE ProductVariants
               SET StockQuantity = ISNULL(StockQuantity, 0) - @q,
                   Version = ISNULL(Version, 0) + 1
               WHERE ProductVariantID = @vid
                 AND (@pid IS NULL OR ProductID = @pid)
                 AND ISNULL(IsActive, 1) = 1
                 AND ISNULL(StockQuantity, 0) >= @q`,
            );
          if (Number(stockResult.rowsAffected[0] || 0) !== 1) {
            const err = new Error("Biến thể vừa hết hàng hoặc không đủ số lượng.");
            err.statusCode = 409;
            err.code = "STOCK_UNAVAILABLE";
            throw err;
          }
        } else if (productId && item.size && item.color) {
          const foundVariant = await stockReq
            .input("pid", sql.Int, productId)
            .input("sz", sql.NVarChar, item.size ?? "")
            .input("clr", sql.NVarChar, item.color ?? "")
            .query(
              `SELECT TOP 1 ProductVariantID as id
               FROM ProductVariants WITH (UPDLOCK, HOLDLOCK)
               WHERE ProductID = @pid AND ISNULL(IsActive, 1) = 1
                 AND (@sz = N'' OR ISNULL(Size, N'') = @sz)
                 AND (@clr = N'' OR ISNULL(ColorName, N'') = @clr)
               ORDER BY ProductVariantID`,
            );
          const fallbackVariantId = foundVariant.recordset[0] && foundVariant.recordset[0].id;
          if (!fallbackVariantId) {
            const err = new Error("Khong tim thay bien the san pham da chon.");
            err.statusCode = 409;
            throw err;
          }
          const stockResult = await new sql.Request(transaction)
            .input("vid", sql.Int, fallbackVariantId)
            .input("q", sql.Int, qty).query(`
              UPDATE ProductVariants
              SET StockQuantity=ISNULL(StockQuantity, 0)-@q,
                  Version=ISNULL(Version, 0)+1
              WHERE ProductVariantID=@vid AND ISNULL(StockQuantity, 0)>=@q
            `);
          if (Number(stockResult.rowsAffected[0] || 0) !== 1) {
            const err = new Error("Biến thể vừa hết hàng hoặc không đủ số lượng.");
            err.statusCode = 409;
            err.code = "STOCK_UNAVAILABLE";
            throw err;
          }
        } else {
          const err = new Error("Khong co du thong tin de cap nhat ton kho san pham.");
          err.statusCode = 400;
          throw err;
        }
      }

      // Lớp bảo vệ cuối: kể cả khi CSDL cũ chưa có CHECK constraint, không
      // được commit giao dịch nếu bất kỳ biến thể nào rơi vào tồn âm.
      const negativeStock = await new sql.Request(transaction).query(`
        SELECT TOP 1 ProductVariantID
        FROM ProductVariants WITH (HOLDLOCK)
        WHERE ISNULL(StockQuantity, 0) < 0
      `);
      if (negativeStock.recordset.length) {
        const err = new Error("Phat hien ton kho am; don hang da duoc rollback de quan ly kiem tra.");
        err.statusCode = 409;
        throw err;
      }

      // B4: Cap nhat luot dung Ma giam gia (neu co)
      if (couponCode) {
        const couponReq = new sql.Request(transaction);
        await couponReq
          .input("code", sql.VarChar, couponCode)
          .query(
            "UPDATE Coupons SET UsedCount = ISNULL(UsedCount, 0) + 1 WHERE CouponCode = @code",
          );
      }

      await transaction.commit();
      res.json({
        success: true,
        orderId,
        OrderID: orderId,
        subtotalAmount: Math.max(0, Number(totalAmount) - Number(shippingFee) + Number(discountAmount)),
        shippingFee: Number(shippingFee),
        discountAmount: Number(discountAmount),
        totalAmount: Number(totalAmount),
        shippingMethodCode,
        shippingMethodId,
        distanceKm: shippingDistanceKm,
        eta: shippingEta,
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (e) {
    const payload = { success: false, message: e.message };
    if (e.code) payload.code = e.code;
    res.status(e.statusCode || 500).json(payload);
  }
});

// Khach chi duoc doi dia chi cua chinh minh truoc khi don bat dau giao.
app.put("/api/orders/:id/address", async (req, res) => {
  const authenticatedUserId = Number(req.auth && req.auth.sub);
  const orderId = Number(req.params.id);
  const addressId = Number(req.body && req.body.addressId);
  if (!authenticatedUserId) {
    return res.status(401).json({ success: false, message: "Ban chua dang nhap." });
  }
  if (!Number.isInteger(orderId) || orderId <= 0 || !Number.isInteger(addressId) || addressId <= 0) {
    return res.status(400).json({ success: false, message: "Don hang hoac dia chi khong hop le." });
  }

  await poolConnect;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    // Moi luong sua/xoa dia chi deu khoa Address truoc Order de tranh deadlock.
    const addressResult = await new sql.Request(transaction)
      .input("aid", sql.Int, addressId)
      .query(`${ADDRESS_SELECT} WITH (UPDLOCK, HOLDLOCK) WHERE AddressID=@aid`);
    const address = addressResult.recordset[0];
    if (!address) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Dia chi khong hop le." });
    }

    const orderResult = await new sql.Request(transaction)
      .input("oid", sql.Int, orderId)
      .query(`
        SELECT OrderID, UserID, AddressID, Status,
               ISNULL(ShippingAddress, '') as ShippingAddress,
               ISNULL(CustomerName, '') as CustomerName,
               ISNULL(CustomerPhone, '') as CustomerPhone
        FROM Orders WITH (UPDLOCK, HOLDLOCK)
        WHERE OrderID=@oid
      `);
    const order = orderResult.recordset[0];
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Khong tim thay don hang." });
    }
    if (req.auth.role !== "Admin" && Number(order.UserID) !== authenticatedUserId) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: "Ban khong duoc doi dia chi don hang nay." });
    }

    const editableStatuses = new Set([
      "cho xac nhan",
      "cho xu ly",
      "pending",
      "da xac nhan",
      "confirmed",
      "dang lay hang",
      "dang chuan bi hang",
      "processing",
      "picking",
    ]);
    const normalizedStatus = normalizeOrderStatus(order.Status);
    if (!editableStatuses.has(normalizedStatus)) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: "Don hang da bat dau giao hoac da ket thuc, khong the doi dia chi.",
      });
    }

    if (Number(address.userId) !== Number(order.UserID)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Dia chi khong thuoc tai khoan dat hang." });
    }
    const addressValidationError = validateAddressPayload(address);
    if (addressValidationError) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: "Dia chi da luu khong con hop le. Vui long cap nhat so dia chi." });
    }

    const updatedAddress = String(
      address.fullAddress || buildAddressPayload(address).fullAddress,
    ).slice(0, 500);
    const hasSameSnapshot =
      Number(order.AddressID) === addressId &&
      String(order.ShippingAddress || "") === updatedAddress &&
      String(order.CustomerName || "") === String(address.recipient || "") &&
      String(order.CustomerPhone || "") === String(address.phone || "");
    if (hasSameSnapshot) {
      await transaction.commit();
      return res.json({
        success: true,
        unchanged: true,
        orderId,
        addressId,
        shippingAddress: updatedAddress,
        customerName: address.recipient,
        customerPhone: address.phone,
      });
    }

    // Moi don chi duoc DOI THAT SU dia chi mot lan. Order dang duoc khoa
    // UPDLOCK/HOLDLOCK nen hai request song song se xep hang; request thu hai
    // se thay marker cua request dau va bi tu choi.
    const previousAddressChange = await new sql.Request(transaction)
      .input("oid", sql.Int, orderId)
      .query(`
        SELECT TOP (1) HistoryID
        FROM OrderStatusHistory WITH (UPDLOCK, HOLDLOCK)
        WHERE OrderID=@oid
          AND LEFT(ISNULL(Note, N''), 17)=N'[ADDRESS_CHANGED]'
        ORDER BY HistoryID
      `);
    if (previousAddressChange.recordset.length > 0) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        code: "ADDRESS_CHANGE_LIMIT_REACHED",
        addressChanged: true,
        message: "Moi don hang chi duoc doi dia chi nhan hang mot lan.",
      });
    }

    await new sql.Request(transaction)
      .input("oid", sql.Int, orderId)
      .input("uid", sql.Int, order.UserID)
      .input("aid", sql.Int, addressId)
      .input("address", sql.NVarChar, updatedAddress)
      .input("name", sql.NVarChar, address.recipient)
      .input("phone", sql.VarChar, address.phone).query(`
        UPDATE Orders
        SET AddressID=@aid, ShippingAddress=@address, CustomerName=@name,
            CustomerPhone=@phone, UpdatedAt=GETDATE()
        WHERE OrderID=@oid AND UserID=@uid
      `);
    const historyNote = `[ADDRESS_CHANGED] ${order.ShippingAddress || ""} => ${updatedAddress}`.slice(0, 500);
    await new sql.Request(transaction)
      .input("oid", sql.Int, orderId)
      .input("status", sql.NVarChar, order.Status || "")
      .input("note", sql.NVarChar, historyNote)
      .input("uid", sql.Int, authenticatedUserId).query(`
        INSERT INTO OrderStatusHistory (OrderID, OldStatus, NewStatus, Note, ChangedBy, ChangedAt)
        VALUES (@oid, @status, @status, @note, @uid, GETDATE())
      `);
    await transaction.commit();
    res.json({
      success: true,
      orderId,
      addressId,
      shippingAddress: updatedAddress,
      customerName: address.recipient,
      customerPhone: address.phone,
      addressChanged: true,
    });
  } catch (e) {
    if (transaction._aborted !== true) {
      try { await transaction.rollback(); } catch (_) {}
    }
    res.status(500).json({ success: false, message: e.message });
  }
});

// 2. Lay Danh Sach Don Hang (Cho Admin va MyOrders)
app.get("/api/orders", async (req, res) => {
  try {
    await poolConnect;

    let rOrders = await pool.request().query(`
      SELECT o.OrderID as id, o.UserID as user_id,
             ISNULL(o.CustomerName, u.FullName) as customer_name,
             ISNULL(o.CustomerPhone, u.Phone) as customer_phone,
             ISNULL(o.ShippingAddress, ISNULL(u.Address, N'Chua cap nhat dia chi')) as customer_address,
             ISNULL(o.ShippingAddress, ISNULL(u.Address, N'Chua cap nhat dia chi')) as shipping_address,
             o.AddressID as address_id,
             CAST(CASE WHEN EXISTS (
               SELECT 1 FROM OrderStatusHistory ach
               WHERE ach.OrderID=o.OrderID AND LEFT(ISNULL(ach.Note, N''), 17)=N'[ADDRESS_CHANGED]'
             ) THEN 1 ELSE 0 END AS bit) as address_changed,
              o.TotalAmount as total, o.ShippingFee as shippingFee, o.DiscountAmount as discount,
              o.DeliveryDistanceKm as shipping_distance_km,
              sm.MethodCode as shipping_method_code,
              o.EstimatedDeliveryText as estimated_delivery_text,
             o.PaymentMethod as payment_method,
             o.PaymentDueAt as payment_due_at,
             o.PaymentConfirmedAt as payment_confirmed_at,
             o.DeliveredDate as delivered_date,
             o.ReceivedConfirmedDate as received_confirmed_date,
             o.RevenueEligibleDate as revenue_eligible_date,
             o.IsCountedAsRevenue as is_counted_as_revenue,
             o.StockIssueStatus as stock_issue_status,
             o.StockIssueReason as stock_issue_reason,
             o.StockRestoredAt as stock_restored_at,
             ISNULL(o.PaymentStatus, N'Chua thanh toan') as payment_status,
             ISNULL(o.HandledBy, '') as handled_by,
             -- FIX KENH BAN: backend tu quyet dinh Online/Offline.
             -- Frontend KHONG duoc doan nua.
             CASE
               WHEN o.HandledBy IS NULL OR LTRIM(RTRIM(o.HandledBy)) = ''
                    OR UPPER(LTRIM(RTRIM(o.HandledBy))) IN ('ONLINE', 'WEB', 'WEBSITE')
                 THEN 'Online'
               ELSE 'Offline'
             END as channel,
             ISNULL(o.TrackingNumber, '') as tracking_code,
             o.OrderNote as note,
             CONVERT(varchar, o.OrderDate, 103) + ' ' + CONVERT(varchar, o.OrderDate, 108) as date,
             -- FIX: bo sung moc thoi gian chuan ISO-8601 de frontend sap xep duoc.
             -- Truoc day chi co chuoi 'dd/mm/yyyy hh:mm:ss' -> new Date() tra ve Invalid Date
             -- nen don hang tai quay vua hoan thanh khong nhay len dau danh sach.
             CONVERT(varchar(33), o.OrderDate, 126) as created_at,
             CONVERT(varchar(33), o.OrderDate, 126) as order_date_iso,
             ISNULL(o.Status, N'Chờ xác nhận') as status, ISNULL(o.CancelReason, '') as cancel_reason
       FROM Orders o LEFT JOIN Users u ON o.UserID = u.UserID
       LEFT JOIN ShippingMethods sm ON o.ShippingMethodID = sm.ShippingMethodID
      ORDER BY o.OrderDate DESC, o.OrderID DESC
    `);

    let details = [];
    try {
      let rDetails = await pool.request().query(`
          SELECT od.OrderID, od.OrderDetailID as order_detail_id, od.ProductID as product_id, od.ProductVariantID as variant_id,
                 COALESCE(p.ProductName, od.ProductNameSnapshot, N'San pham') as name,
                 COALESCE(p.ImageURL, od.ImageURLSnapshot, '') as image,
                 od.Quantity as quantity, od.UnitPrice as price,
                 ISNULL(od.Size, '') as size, ISNULL(od.Color, N'') as color
          FROM OrderDetails od LEFT JOIN Products p ON od.ProductID = p.ProductID
        `);
      details = rDetails.recordset;
    } catch (e) {
      console.log(e.message);
    }

    let orders = rOrders.recordset.map((o) => {
      o.products = details.filter((d) => d.OrderID === o.id);
      return o;
    });

    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin cap nhat luong don; khach hang chi duoc huy don cua chinh minh.
app.put("/api/orders/:id/status", async (req, res) => {
  const authenticatedUserId = Number(req.auth && req.auth.sub);
  const orderId = Number(req.params.id);
  const newStatus = cleanAddressText(req.body && req.body.status, 50);
  const reason = cleanAddressText(req.body && req.body.reason, 500);
  if (!authenticatedUserId) {
    return res.status(401).json({ success: false, message: "Ban chua dang nhap." });
  }
  if (!Number.isInteger(orderId) || orderId <= 0 || !newStatus) {
    return res.status(400).json({ success: false, message: "Don hang hoac trang thai khong hop le." });
  }

  await poolConnect;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const currentResult = await new sql.Request(transaction)
      .input("oid", sql.Int, orderId)
      .query(`
        SELECT OrderID, UserID, Status, PaymentMethod, PaymentStatus, TotalAmount
        FROM Orders WITH (UPDLOCK, HOLDLOCK)
        WHERE OrderID=@oid
      `);
    const currentOrder = currentResult.recordset[0];
    if (!currentOrder) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Khong tim thay don hang." });
    }

    const isAdmin = req.auth.role === "Admin";
    const normalizedNewStatus = normalizeOrderStatus(newStatus);
    const normalizedCurrentStatus = normalizeOrderStatus(currentOrder.Status);
    const isCancel = ["da huy", "cancelled", "canceled"].includes(normalizedNewStatus);
    const alreadyCancelled = ["da huy", "cancelled", "canceled"].includes(normalizedCurrentStatus);
    const wasPaid = isPaidPaymentStatus(currentOrder.PaymentStatus);
    const statusToSave = isCancel ? "Đã hủy" : canonicalOrderStatus(newStatus);

    if (!isCancel && !transitionAllowed(currentOrder.Status, statusToSave)) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: `Khong the chuyen don tu '${currentOrder.Status}' sang '${statusToSave}'.` });
    }
    if (isAdmin && !isCancel && ["da xac nhan", "dang van chuyen"].includes(normalizeOrderStatus(statusToSave)) && isBankPayment(currentOrder.PaymentMethod) && !["da thanh toan", "cho thanh toan"].includes(normalizeOrderStatus(currentOrder.PaymentStatus))) {
      await transaction.rollback();
      return res.status(409).json({ success: false, code: "PAYMENT_REQUIRED", message: "Don chuyen khoan phai duoc xac nhan da thanh toan truoc khi xac nhan hoac giao hang." });
    }

    // Hủy sau khi đơn đã giao/đã nhận phải đi qua quy trình trả hàng để
    // tránh cộng lại tồn kho sai và hoàn tiền ngoài kiểm soát.
    if (isAdmin && isCancel && !alreadyCancelled) {
      const cancellableByAdmin = new Set([
        "cho xac nhan", "cho xu ly", "pending", "da xac nhan", "confirmed",
        "dang lay hang", "dang chuan bi hang", "processing", "picking",
        "dang van chuyen", "dang giao", "shipped",
      ]);
      if (!cancellableByAdmin.has(normalizedCurrentStatus)) {
        await transaction.rollback();
        return res.status(409).json({ success: false, message: "Đơn đã giao/đã nhận không thể hủy trực tiếp; hãy tạo yêu cầu trả hàng." });
      }
    }

    if (alreadyCancelled && !isCancel) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: "Don hang da huy khong the mo lai." });
    }

    if (!isAdmin) {
      if (Number(currentOrder.UserID) !== authenticatedUserId) {
        await transaction.rollback();
        return res.status(403).json({ success: false, message: "Ban khong duoc cap nhat don hang nay." });
      }
      if (!isCancel) {
        await transaction.rollback();
        return res.status(403).json({ success: false, message: "Khach hang chi co the huy don qua API nay." });
      }
      const cancellableStatuses = new Set([
        "cho xac nhan", "cho xu ly", "pending", "da xac nhan", "confirmed",
        "dang lay hang", "dang chuan bi hang", "processing", "picking",
      ]);
      if (!cancellableStatuses.has(normalizedCurrentStatus)) {
        await transaction.rollback();
        return res.status(409).json({ success: false, message: "Don hang khong con o trang thai co the huy." });
      }
    }

    if (isCancel && !alreadyCancelled) {
      await restoreOrderStock(transaction, orderId);
    }

    await new sql.Request(transaction)
      .input("id", sql.Int, orderId)
      .input("s", sql.NVarChar, statusToSave)
      .input("r", sql.NVarChar, reason)
      .query(
        `UPDATE Orders SET Status = @s,
          CancelReason = CASE WHEN @s IN (N'Đã hủy', N'Da huy') THEN @r ELSE CancelReason END,
          PaymentStatus = CASE
            WHEN @s IN (N'Đã hủy', N'Da huy') THEN (CASE WHEN ISNULL(PaymentStatus,N'Chưa thanh toán') IN (N'Đã thanh toán',N'Da thanh toan',N'Chờ thanh toán',N'Cho thanh toan') THEN N'Hoàn tiền' ELSE N'Đã hủy' END)
            WHEN @s = N'Đã giao hàng thành công' AND (PaymentMethod LIKE '%COD%' OR PaymentMethod LIKE N'%nhận hàng%' OR PaymentMethod LIKE N'%Tiền mặt%') THEN N'Đã thanh toán'
            ELSE PaymentStatus END,
          PaymentConfirmedAt = CASE WHEN @s = N'Đã giao hàng thành công' AND (PaymentMethod LIKE '%COD%' OR PaymentMethod LIKE N'%nhận hàng%' OR PaymentMethod LIKE N'%Tiền mặt%') THEN ISNULL(PaymentConfirmedAt,GETDATE()) ELSE PaymentConfirmedAt END,
          DeliveredDate = CASE WHEN @s=N'Đã giao hàng thành công' THEN ISNULL(DeliveredDate,GETDATE()) ELSE DeliveredDate END,
          RevenueEligibleDate = CASE WHEN @s=N'Đã giao hàng thành công' THEN ISNULL(RevenueEligibleDate,DATEADD(day,14,GETDATE())) ELSE RevenueEligibleDate END,
          AutoCancelDeadline = CASE WHEN @s IN (N'Đã giao hàng thành công', N'Đã hủy', N'Đã nhận hàng', N'Đã hoàn tất trả hàng') THEN NULL ELSE AutoCancelDeadline END,
          UpdatedAt=GETDATE()
        WHERE OrderID = @id`,
      );
    if (isCancel && wasPaid) {
      await recordRefundTransaction(transaction, orderId, currentOrder.TotalAmount);
    }
    await insertOrderHistory(transaction, orderId, currentOrder.Status, statusToSave, reason || "Cập nhật trạng thái đơn hàng", authenticatedUserId);
    await transaction.commit();
    res.json({ success: true });
  } catch (e) {
    if (transaction._aborted !== true) {
      try { await transaction.rollback(); } catch (_) {}
    }
    res.status(500).json({ error: e.message });
  }
});

// Cập nhật trạng thái thanh toán từ khu quản trị.
app.put("/api/orders/:id/payment", async (req, res) => {
  const authenticatedUserId = Number(req.auth && req.auth.sub);
  const orderId = Number(req.params.id);
  const requestedPaymentStatus = cleanAddressText(req.body && req.body.payment_status, 30) || "Chưa thanh toán";
  if (!authenticatedUserId) {
    return res.status(401).json({ success: false, message: "Ban chua dang nhap." });
  }
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ success: false, message: "Don hang khong hop le." });
  }

  const normalizedRequested = normalizeOrderStatus(requestedPaymentStatus);
  if (!PAYMENT_STATUSES.has(normalizedRequested)) return res.status(400).json({ success: false, message: "Trang thai thanh toan khong hop le." });
  let paymentStatus = { "chua thanh toan": "Chưa thanh toán", "cho thanh toan": "Chờ thanh toán", "da thanh toan": "Đã thanh toán", "hoan tien": "Hoàn tiền", "da huy": "Đã hủy" }[normalizedRequested];
  const transaction = new sql.Transaction(pool);
  try {
    await poolConnect;
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const orderResult = await new sql.Request(transaction).input("id", sql.Int, orderId).query(`
      SELECT OrderID, UserID, PaymentMethod, PaymentStatus, Status, TotalAmount
      FROM Orders WITH (UPDLOCK, HOLDLOCK) WHERE OrderID=@id
    `);
    const order = orderResult.recordset[0];
    if (!order) throw Object.assign(new Error("Khong tim thay don hang."), { statusCode: 404 });
    const currentPayment = normalizeOrderStatus(order.PaymentStatus);
    let customerTransferConfirmation = false;
    if (req.auth.role !== "Admin") {
      if (Number(order.UserID) !== authenticatedUserId) throw Object.assign(new Error("Ban khong duoc cap nhat don hang nay."), { statusCode: 403 });
      if (!isBankPayment(order.PaymentMethod) || !["cho thanh toan", "da thanh toan"].includes(normalizedRequested)) throw Object.assign(new Error("Khach hang chi co the xac nhan thanh toan chuyen khoan cho don online."), { statusCode: 403 });
      if (["da thanh toan", "hoan tien", "da huy"].includes(currentPayment)) throw Object.assign(new Error("Trang thai thanh toan khong the thay doi."), { statusCode: 409 });
      // Với chuyển khoản online, thao tác "Tôi đã thanh toán" là tín hiệu
      // hoàn tất thanh toán của khách. Không bắt nhân viên bấm xác nhận lần 2.
      customerTransferConfirmation = true;
    } else {
      if (["da huy", "hoan tien"].includes(normalizeOrderStatus(order.Status)) && normalizedRequested === "da thanh toan") throw Object.assign(new Error("Don da ket thuc khong the ghi nhan thanh toan moi."), { statusCode: 409 });
      if (isCodPayment(order.PaymentMethod) && normalizedRequested === "da thanh toan" && !["da giao hang thanh cong", "da nhan hang", "da hoan tat tra hang"].includes(normalizeOrderStatus(order.Status))) {
        throw Object.assign(new Error("COD chi duoc xac nhan da thanh toan khi da giao hang."), { statusCode: 409 });
      }
    }
    if (customerTransferConfirmation) {
      paymentStatus = "Đã thanh toán";
    }
    await new sql.Request(transaction).input("id", sql.Int, orderId).input("ps", sql.NVarChar, paymentStatus).query(`
      UPDATE Orders SET PaymentStatus=@ps,
        PaymentConfirmedAt=CASE WHEN @ps=N'Đã thanh toán' THEN GETDATE() ELSE PaymentConfirmedAt END,
        UpdatedAt=GETDATE() WHERE OrderID=@id
    `);
    if (customerTransferConfirmation || normalizedRequested === "da thanh toan") {
      const provider = customerTransferConfirmation ? "CUSTOMER_CONFIRMED" : "MANUAL_CONFIRM";
      await new sql.Request(transaction).input("oid", sql.Int, orderId).input("amt", sql.Decimal(18, 2), order.TotalAmount).input("provider", sql.NVarChar(30), provider).query(`
        IF NOT EXISTS (SELECT 1 FROM PaymentTransactions WHERE OrderID=@oid AND Provider IN (N'MANUAL_CONFIRM',N'CUSTOMER_DECLARED',N'CUSTOMER_CONFIRMED') AND Status=N'SUCCESS')
          INSERT INTO PaymentTransactions (OrderID, Provider, Amount, Status, SignatureValid, CreatedAt, CompletedAt)
          VALUES (@oid, @provider, @amt, N'SUCCESS', 1, GETDATE(), GETDATE())
      `);
    }
    await transaction.commit();
    res.json({ success: true, payment_status: paymentStatus });
  } catch (e) {
    if (transaction._aborted !== true) { try { await transaction.rollback(); } catch (_) {} }
    res.status(e.statusCode || 500).json({ success: false, message: e.statusCode ? e.message : "Khong cap nhat duoc thanh toan." });
  }
});

// ================= CAC API SAN PHAM, TAI KHOAN, DANH MUC, KHUYEN MAI =================
app.get("/api/products", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool.request().query(
      `SELECT p.ProductID as id, p.ProductName as name, p.BasePrice as price,
              p.SalePrice as sale_price,
              p.CategoryID as category_id, c.CategoryName as category,
              p.BrandID as brand_id, b.BrandName as brand,
              p.CollectionID as collection_id, p.MaterialID as material_id,
              p.ImageURL as image_url, p.IsActive as active,
              p.Description as description, p.ImageGallery as image_gallery,
              p.ParentSKU as parent_sku, p.IsFeatured as is_featured
       FROM Products p
       LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
       LEFT JOIN Brands b ON p.BrandID = b.BrandID
       ORDER BY p.ProductID DESC`,
    );
    const products = r.recordset;
    // FIX: ep kieu StockQuantity ve INT va bo qua bien the da tat (IsActive = 0)
    // Truoc day tra ve NULL -> frontend doc thanh 0 nen san pham nao cung "het hang".
    const vr = await pool.request().query(
      `SELECT ProductVariantID as id, ProductID as product_id, Size as size,
              ColorName as color, ColorHex as hex, ChildSKU as sku,
              CAST(ISNULL(StockQuantity, 0) AS INT) as stock,
              CAST(ISNULL(IsActive, 1) AS BIT) as active
       FROM ProductVariants
       WHERE ISNULL(IsActive, 1) = 1
       ORDER BY ProductVariantID`,
    );
    const ir = await pool.request().query(
      `SELECT ProductID as product_id, ColorName as color, ImageURL as image, IsPrimary as is_primary
       FROM ProductImages`,
    );
    const imgByKey = {};
    for (const img of ir.recordset) {
      const key = img.product_id + "::" + (img.color || "");
      if (!imgByKey[key] || img.is_primary) imgByKey[key] = img.image;
    }
    for (const p of products) {
      const vs = vr.recordset.filter((v) => v.product_id === p.id);
      p.variants = vs;
      p.sizes = [...new Set(vs.map((v) => v.size).filter(Boolean))];
      // FIX: tra ve tong ton kho de trang POS / Thong ke khong con hien so luong = 0
      p.total_stock = vs.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
      p.stock = p.total_stock;
      p.variant_count = vs.length;
      p.in_stock = p.total_stock > 0;
      // Ton kho theo tung size (de bang "San pham sap het hang" biet size nao dang het)
      p.stock_by_size = p.sizes.map((sz) => ({
        size: sz,
        stock: vs
          .filter((v) => v.size === sz)
          .reduce((sum, v) => sum + (Number(v.stock) || 0), 0),
      }));
      const colorMap = {};
      for (const v of vs) {
        if (!v.color) continue;
        if (!colorMap[v.color])
          colorMap[v.color] = { name: v.color, hex: v.hex || "", image: "" };
      }
      for (const img of ir.recordset) {
        if (img.product_id !== p.id || !img.color) continue;
        if (!colorMap[img.color])
          colorMap[img.color] = { name: img.color, hex: "", image: "" };
      }
      for (const cn of Object.keys(colorMap)) {
        const key = p.id + "::" + cn;
        if (imgByKey[key]) colorMap[cn].image = imgByKey[key];
      }
      p.colors = Object.values(colorMap);
    }
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Tao/cap nhat bien the (ProductVariants) theo (ProductID + ChildSKU) -> khong xoa du lieu cu
async function upsertVariants(productId, variants) {
  if (!Array.isArray(variants)) return;
  const keptVariantIds = [];

  for (let v of variants) {
    const sku = v.sku ?? v.ChildSKU ?? null;
    const color = v.color ?? v.ColorName ?? "";
    const hex = v.hex ?? v.color_hex ?? v.ColorHex ?? "";
    const size = v.size ?? v.Size ?? "";
    let stock = Number(v.stock ?? v.StockQuantity ?? 0);
    if (isNaN(stock) || stock < 0) stock = 0;
    // FIX: bo qua ban ghi rac (khong co ca mau lan size) de khong tao bien the trong voi ton = 0
    if (!color && !size) continue;
    let found = { recordset: [] };
    const variantId = v.id ?? v.ProductVariantID ?? null;
    if (variantId) {
      found = await pool
        .request()
        .input("id", sql.Int, variantId)
        .query(
          "SELECT ProductVariantID FROM ProductVariants WHERE ProductVariantID=@id",
        );
    } else if (sku) {
      found = await pool
        .request()
        .input("pid", sql.Int, productId)
        .input("sku", sql.VarChar, sku)
        .query(
          "SELECT ProductVariantID FROM ProductVariants WHERE ProductID=@pid AND ChildSKU=@sku",
        );
    }
    // FIX QUAN TRONG: frontend khong gui ChildSKU nen truoc day moi lan luu lai tao
    // them mot dong bien the MOI (trung mau + size) -> danh sach day bien the rac,
    // ban cu bi ghi de ton kho = 0. Gio doi chieu them theo (ProductID + Mau + Size).
    if (found.recordset.length === 0) {
      found = await pool
        .request()
        .input("pid", sql.Int, productId)
        .input("cn", sql.NVarChar, color)
        .input("sz", sql.NVarChar, size)
        .query(
          `SELECT TOP 1 ProductVariantID FROM ProductVariants
           WHERE ProductID=@pid AND ISNULL(ColorName, N'')=@cn AND ISNULL(Size, N'')=@sz
           ORDER BY ProductVariantID`,
        );
    }
    if (found.recordset.length > 0) {
      const vid = found.recordset[0].ProductVariantID;
      keptVariantIds.push(vid);
      await pool
        .request()
        .input("id", sql.Int, vid)
        .input("st", sql.Int, stock)
        .input("cn", sql.NVarChar, color)
        .input("ch", sql.VarChar, hex)
        .input("sz", sql.NVarChar, size)
        .input("sku", sql.VarChar, sku)
        .query(
          "UPDATE ProductVariants SET StockQuantity=@st, ColorName=@cn, ColorHex=@ch, Size=@sz, ChildSKU=@sku, IsActive=1 WHERE ProductVariantID=@id",
        );
    } else {
      const insertRes = await pool
        .request()
        .input("pid", sql.Int, productId)
        .input("sz", sql.NVarChar, size)
        .input("cn", sql.NVarChar, color)
        .input("ch", sql.VarChar, hex)
        .input("sku", sql.VarChar, sku)
        .input("st", sql.Int, stock)
        .query(
          `INSERT INTO ProductVariants (ProductID, Size, ColorName, ColorHex, ChildSKU, StockQuantity, PriceAdjustment, IsActive)
           OUTPUT inserted.ProductVariantID
           VALUES (@pid, @sz, @cn, @ch, ISNULL(@sku, CONCAT('SKU-', @pid, '-', @cn, '-', @sz)), @st, 0, 1)`,
        );
      if (insertRes.recordset && insertRes.recordset.length > 0) {
        keptVariantIds.push(insertRes.recordset[0].ProductVariantID);
      }
    }
  }

  // Deactivate deleted variants (the ones not sent by frontend)
  if (keptVariantIds.length > 0) {
    const ids = keptVariantIds.join(",");
    await pool
      .request()
      .input("pid", sql.Int, productId)
      .query(`UPDATE ProductVariants SET StockQuantity = 0, IsActive = 0 WHERE ProductID = @pid AND ProductVariantID NOT IN (${ids})`);
  } else {
    await pool
      .request()
      .input("pid", sql.Int, productId)
      .query(`UPDATE ProductVariants SET StockQuantity = 0, IsActive = 0 WHERE ProductID = @pid`);
  }
}

// Luu anh theo tung mau vao bang ProductImages (ProductID + ColorName)
// De cua hang doi mau -> doi anh tuong ung
async function upsertProductImages(productId, colors) {
  if (!Array.isArray(colors)) return;
  await pool
    .request()
    .input("pid", sql.Int, productId)
    .query(
      "DELETE FROM ProductImages WHERE ProductID=@pid AND ColorName IS NOT NULL",
    );
  let sort = 0;
  for (const c of colors) {
    const name = c.name ?? c.ColorName ?? "";
    const image = c.image ?? c.ImageURL ?? "";
    if (!name || !image) continue;
    await pool
      .request()
      .input("pid", sql.Int, productId)
      .input("cn", sql.NVarChar, name)
      .input("img", sql.VarChar(sql.MAX), image)
      .input("so", sql.Int, sort++)
      .query(
        "INSERT INTO ProductImages (ProductID, ColorName, ImageURL, IsPrimary, SortOrder) VALUES (@pid, @cn, @img, 0, @so)",
      );
  }
}

function bindProduct(request, b) {
  let imgUrl = b.image_url || "";
  if (!imgUrl && Array.isArray(b.colors) && b.colors.length > 0) {
    const firstColor = b.colors.find(c => c.image || c.ImageURL);
    if (firstColor) imgUrl = firstColor.image || firstColor.ImageURL;
  }

  return request
    .input("n", sql.NVarChar, b.name)
    .input("p", sql.Decimal(18, 0), b.price || 0)
    .input("sp", sql.Decimal(18, 0), b.sale_price || 0)
    .input("c", sql.Int, b.category_id || null)
    .input("br", sql.Int, b.brand_id || null)
    .input("col", sql.Int, b.collection_id || null)
    .input("mid", sql.Int, b.material_id || null)
    .input("img", sql.VarChar(sql.MAX), imgUrl)
    .input("desc", sql.NVarChar(sql.MAX), b.description || "")
    .input("psku", sql.VarChar, b.parent_sku || "")
    .input("feat", sql.Bit, !!b.is_featured)
    .input("a", sql.Bit, b.active !== false);
}

app.post("/api/products", async (req, res) => {
  try {
    await poolConnect;
    const b = req.body || {};
    let r = await bindProduct(pool.request(), b).query(`
      INSERT INTO Products (ProductName, BasePrice, SalePrice, CategoryID, BrandID, CollectionID, MaterialID, ImageURL, Description, ParentSKU, IsFeatured, IsActive)
      OUTPUT INSERTED.ProductID
      VALUES (@n, @p, @sp, @c, @br, @col, @mid, @img, @desc, @psku, @feat, @a)
    `);
    const newId = r.recordset[0].ProductID;
    await upsertVariants(newId, b.variants);
    await upsertProductImages(newId, b.colors);
    res.json({ success: true, ProductID: newId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    await poolConnect;
    const b = req.body || {};
    await bindProduct(pool.request().input("id", sql.Int, req.params.id), b)
      .query(`
      UPDATE Products SET ProductName=@n, BasePrice=@p, SalePrice=@sp, CategoryID=@c, BrandID=@br, CollectionID=@col,
        MaterialID=@mid, ImageURL=@img, Description=@desc,
        ParentSKU=@psku, IsFeatured=@feat, IsActive=@a WHERE ProductID=@id
    `);
    await upsertVariants(Number(req.params.id), b.variants);
    await upsertProductImages(Number(req.params.id), b.colors);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/api/products/:id", async (req, res) => {
  // Luon xoa mem mac dinh; xoa cung phai gui ?hard=1 de khong lam mat lich su don hang.
  const hard = req.query.hard === "1" || req.query.hard === "true";
  const soft = !hard;
  try {
    await poolConnect;
    const id = Number(req.params.id);
    if (soft) {
      // XOA MEM: chi an san pham, giu nguyen toan bo du lieu
      await pool
        .request()
        .input("id", sql.Int, id)
        .query("UPDATE Products SET IsActive = 0 WHERE ProductID=@id");
      return res.json({ success: true, mode: "soft" });
    }
    // XOA CUNG: xoa that su khoi CSDL, an toan khoa ngoai (CO THE ANH HUONG DOANH THU)
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const run = (query) =>
        new sql.Request(tx).input("id", sql.Int, id).query(query);
      await run(
        "DELETE FROM ReturnDetails WHERE OrderDetailID IN (SELECT OrderDetailID FROM OrderDetails WHERE ProductID=@id)",
      );
      await run("DELETE FROM OrderDetails WHERE ProductID=@id");
      await run(
        "DELETE FROM VariantDiscounts WHERE ProductID=@id OR ProductVariantID IN (SELECT ProductVariantID FROM ProductVariants WHERE ProductID=@id)",
      );
      await run("DELETE FROM ProductImages WHERE ProductID=@id");
      await run("DELETE FROM ProductVariants WHERE ProductID=@id");
      await run("DELETE FROM Products WHERE ProductID=@id");
      await tx.commit();
      res.json({ success: true, mode: "hard" });
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/api/products/:id/restore", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("UPDATE Products SET IsActive = 1 WHERE ProductID=@id");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/api/revenue-by-product", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool.request().query(`
      SELECT
          p.ProductID as id,
          p.ProductName as name,
          p.ImageURL as image,
          p.IsActive as active,
          SUM(od.Quantity * od.UnitPrice) as revenue,
          SUM(od.Quantity) as sold
      FROM OrderDetails od
      JOIN Orders o ON od.OrderID = o.OrderID
      JOIN Products p ON od.ProductID = p.ProductID
      WHERE ISNULL(o.Status, N'Cho xac nhan') = N'Da giao hang thanh cong'
      GROUP BY p.ProductID, p.ProductName, p.ImageURL, p.IsActive
      ORDER BY revenue DESC
    `);
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/accounts", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool
      .request()
      .query(
        "SELECT UserID as id, Email as username, Email as email, FullName as name, RoleID as role_id, ISNULL(IsActive,1) as active, ISNULL(Phone,'') as phone, ISNULL(Address,'') as address FROM Users WHERE RoleID IN (1,2,3) ORDER BY RoleID, UserID DESC",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/accounts", async (req, res) => {
  try {
    await poolConnect;
    const email = String(req.body.username ?? req.body.email ?? "").trim().toLowerCase();
    const name = cleanAddressText(req.body.name, 100);
    const plainPassword = String(req.body.password ?? "");
    const roleId = Number(req.body.role_id);
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name || plainPassword.length < 6 || ![1, 2, 3].includes(roleId)) {
      return res.status(400).json({ success: false, message: "Email, ho ten, mat khau (toi thieu 6 ky tu) hoac vai tro khong hop le." });
    }
    const passwordHash = await passwordHelper.hash(plainPassword);
    await pool
      .request()
      .input("e", sql.VarChar, email)
      .input("p", sql.VarChar, passwordHash)
      .input("n", sql.NVarChar, name)
      .input("r", sql.Int, roleId)
      .query(
        "INSERT INTO Users (Email, PasswordHash, FullName, RoleID, IsActive) VALUES (@e, @p, @n, @r, 1)",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/accounts/:id", async (req, res) => {
  try {
    await poolConnect;
    const b = req.body || {};
    const isAdmin = req.auth && req.auth.role === "Admin";
    if (!isAdmin && (b.role_id !== undefined || b.active !== undefined)) {
      return res.status(403).json({ success: false, message: "Khach hang khong duoc thay doi vai tro hoac trang thai tai khoan." });
    }
    // Chi cap nhat nhung truong duoc gui len -> tranh ghi de/xoa nham
    // (vi du doi vai tro thi khong lam mat Phone/Address/Email cu).
    let rq = pool.request().input("id", sql.Int, req.params.id);
    const sets = [];
    if (b.username !== undefined) {
      const email = String(b.username || "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ success: false, message: "Email khong hop le." });
      rq = rq.input("e", sql.VarChar, email);
      sets.push("Email=@e");
    }
    if (b.name !== undefined) {
      rq = rq.input("n", sql.NVarChar, b.name);
      sets.push("FullName=@n");
    }
    if (b.phone !== undefined) {
      rq = rq.input("ph", sql.VarChar, b.phone || "");
      sets.push("Phone=@ph");
    }
    if (b.address !== undefined) {
      rq = rq.input("ad", sql.NVarChar, b.address || "");
      sets.push("Address=@ad");
    }
    if (b.avatar_url !== undefined || b.avatarUrl !== undefined) {
      const avatar = b.avatar_url ?? b.avatarUrl;
      const value = avatar == null ? "" : String(avatar).trim();
      // Avatar duoc gui dang data URL tu trinh duyet. Gioi han ca kich thuoc
      // va dinh dang de tranh luu noi dung khong phai anh vao CSDL.
      if (value.length > 2200000) {
        return res.status(413).json({ success: false, message: "Anh dai qua 2 MB, vui long chon anh nho hon." });
      }
      if (value && !/^data:image\/(?:jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(value)) {
        return res.status(400).json({ success: false, message: "Dinh dang anh khong hop le." });
      }
      rq = rq.input("avatar", sql.NVarChar(sql.MAX), value || null);
      sets.push("AvatarURL=@avatar");
    }
    if (b.role_id !== undefined && b.role_id !== null && b.role_id !== "") {
      rq = rq.input("r", sql.Int, parseInt(b.role_id) || 1);
      sets.push("RoleID=@r");
    }
    if (b.active !== undefined) {
      rq = rq.input("act", sql.Bit, b.active === false ? 0 : 1);
      sets.push("IsActive=@act");
    }
    if (
      b.password !== undefined &&
      b.password !== null &&
      String(b.password).trim() !== ""
    ) {
      if (String(b.password).length < 6) return res.status(400).json({ success: false, message: "Mat khau moi phai co it nhat 6 ky tu." });
      rq = rq.input("pw", sql.VarChar, await passwordHelper.hash(String(b.password)));
      sets.push("PasswordHash=@pw");
      sets.push("LastPasswordChangedAt=GETDATE()");
    }
    if (sets.length === 0) return res.json({ success: true });
    await rq.query("UPDATE Users SET " + sets.join(", ") + ", UpdatedAt=GETDATE() WHERE UserID=@id");
    const updated = await pool.request()
      .input("uid", sql.Int, req.params.id)
      .query("SELECT UserID as id_user, Email as email, FullName as full_name, Phone as phone, Address as address, AvatarURL as avatar_url, RoleID as role_id FROM Users WHERE UserID=@uid");
    res.json({ success: true, user: updated.recordset[0] || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/accounts/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("UPDATE Users SET IsActive=0, UpdatedAt=GETDATE() WHERE UserID=@id");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool
      .request()
      .query(
        "SELECT CategoryID as id, CategoryName as name, Sport as sport, IsActive as active FROM Categories ORDER BY Sport, CategoryName",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("n", sql.NVarChar, req.body.name)
      .input("sp", sql.NVarChar, req.body.sport || null)
      .input("a", sql.Bit, req.body.active)
      .query(
        "INSERT INTO Categories (CategoryName, Sport, IsActive) VALUES (@n, @sp, @a)",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/categories/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("n", sql.NVarChar, req.body.name)
      .input("sp", sql.NVarChar, req.body.sport || null)
      .input("a", sql.Bit, req.body.active)
      .query(
        "UPDATE Categories SET CategoryName=@n, Sport=@sp, IsActive=@a WHERE CategoryID=@id",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/categories/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM Categories WHERE CategoryID=@id");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= API THUONG HIEU (Brands) =================
app.get("/api/brands", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool
      .request()
      .query(
        "SELECT BrandID as id, BrandName as name, LogoURL as logo_url, SortOrder as sort_order, IsActive as active FROM Brands ORDER BY ISNULL(SortOrder, 999), BrandID",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/brands", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("n", sql.NVarChar, req.body.name)
      .input("l", sql.VarChar(sql.MAX), req.body.logo_url || "")
      .input("so", sql.Int, req.body.sort_order || 0)
      .input("a", sql.Bit, req.body.active !== false)
      .query(
        "INSERT INTO Brands (BrandName, LogoURL, SortOrder, IsActive) VALUES (@n, @l, @so, @a)",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/api/brands/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("n", sql.NVarChar, req.body.name)
      .input("l", sql.VarChar(sql.MAX), req.body.logo_url || "")
      .input("so", sql.Int, req.body.sort_order || 0)
      .input("a", sql.Bit, req.body.active !== false)
      .query(
        "UPDATE Brands SET BrandName=@n, LogoURL=@l, SortOrder=@so, IsActive=@a WHERE BrandID=@id",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/api/brands/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("UPDATE Brands SET IsActive = 0 WHERE BrandID=@id");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= API CHAT LIEU (Materials) =================
app.get("/api/materials", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool
      .request()
      .query(
        "SELECT MaterialID as id, MaterialName as name, IsActive as active FROM Materials ORDER BY MaterialID",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/materials", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("n", sql.NVarChar, req.body.name)
      .input("a", sql.Bit, req.body.active !== false)
      .query("INSERT INTO Materials (MaterialName, IsActive) VALUES (@n, @a)");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/api/materials/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("n", sql.NVarChar, req.body.name)
      .input("a", sql.Bit, req.body.active !== false)
      .query(
        "UPDATE Materials SET MaterialName=@n, IsActive=@a WHERE MaterialID=@id",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/api/materials/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("UPDATE Materials SET IsActive = 0 WHERE MaterialID=@id");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= API TRA HANG (Returns) =================
const RETURN_STATUS_ALIASES = {
  "cho xu ly": "Chờ xử lý",
  "da tiep nhan": "Đã tiếp nhận",
  "dang kiem tra": "Đang kiểm tra",
  "da duyet": "Chấp nhận hoàn tiền",
  "chap nhan hoan tien": "Chấp nhận hoàn tiền",
  "cho hoan tien": "Chấp nhận hoàn tiền",
  "da hoan tien": "Đã hoàn tiền",
  "hoan tat": "Đã hoàn tất",
  "da hoan tat": "Đã hoàn tất",
  "tu choi": "Từ chối",
  "su co": "Sự cố",
  "huy": "Hủy",
  "da huy": "Hủy",
};
const RETURN_TRANSITIONS = {
  "cho xu ly": new Set(["cho xu ly", "da tiep nhan", "dang kiem tra", "tu choi", "huy"]),
  "da tiep nhan": new Set(["da tiep nhan", "dang kiem tra", "tu choi", "su co"]),
  "dang kiem tra": new Set(["dang kiem tra", "chap nhan hoan tien", "tu choi", "su co"]),
  "chap nhan hoan tien": new Set(["chap nhan hoan tien", "da hoan tien", "su co"]),
  "da hoan tien": new Set(["da hoan tien", "da hoan tat"]),
  "da hoan tat": new Set(["da hoan tat"]),
  "tu choi": new Set(["tu choi"]),
  "su co": new Set(["su co", "dang kiem tra", "tu choi"]),
  "huy": new Set(["huy"]),
  "da duyet": new Set(["da duyet", "hoan tat"]),
  "hoan tat": new Set(["hoan tat"]),
};

function normalizeReturnType(value) {
  return normalizeOrderStatus(value).replace(/[\s_-]+/g, " ").trim();
}

function isNotReceivedReturn(value) {
  return new Set([
    "not received",
    "chua nhan duoc hang",
    "khong nhan duoc hang",
    "delivery issue",
    "delivery failed",
  ]).has(normalizeReturnType(value));
}

// Khi yêu cầu trả hàng bị từ chối/hủy, đơn phải quay về đúng mốc trước khi
// tạo yêu cầu.  Không thể mặc định "Đã nhận hàng": khách có thể chưa bấm
// xác nhận nhận hàng, hoặc chỉ đang báo kiện thất lạc trong lúc vận chuyển.
// Các mốc ngày là nguồn tin cậy nhất; trạng thái hiện tại thường đã là
// "Yêu cầu trả hàng" nên chỉ dùng trạng thái để dự phòng cho dữ liệu cũ.
function restoreStatusAfterReturn(row) {
  const status = normalizeOrderStatus(row && (row.ReturnOriginStatus || row.OrderStatus));
  const received = Boolean(row && row.ReceivedConfirmedDate)
    || ["da nhan hang", "received"].includes(status);
  if (received) return "Đã nhận hàng";

  const delivered = Boolean(row && row.DeliveredDate)
    || ["da giao", "da giao hang thanh cong", "delivered"].includes(status);
  if (delivered) return "Đã giao hàng thành công";

  const shipping = ["dang van chuyen", "dang giao", "shipped", "shipping"].includes(status);
  if (shipping || isNotReceivedReturn(row && row.ReturnType)) return "Đang vận chuyển";

  // Yêu cầu trả hàng thường chỉ được tạo từ đơn đã giao; chọn mốc giao
  // hàng thay vì đánh dấu khách đã nhận khi DB cũ thiếu timestamp.
  return "Đã giao hàng thành công";
}

function canonicalReturnStatus(value) {
  const key = normalizeOrderStatus(value);
  return RETURN_STATUS_ALIASES[key] || null;
}

function returnTransitionAllowed(current, next) {
  const c = normalizeOrderStatus(current);
  const n = normalizeOrderStatus(next);
  return c === n || Boolean(RETURN_TRANSITIONS[c] && RETURN_TRANSITIONS[c].has(n));
}

async function restockReturnItems(transaction, returnId) {
  const existing = await new sql.Request(transaction)
    .input("rid", sql.Int, returnId)
    .query("SELECT RestockedAt FROM Returns WITH (UPDLOCK, HOLDLOCK) WHERE ReturnID=@rid");
  if (!existing.recordset[0]) throw new Error("Khong tim thay yeu cau tra hang.");
  if (existing.recordset[0].RestockedAt) return false;
  const details = await new sql.Request(transaction)
    .input("rid", sql.Int, returnId)
    .query(`
      SELECT od.ProductID, od.ProductVariantID, od.Size, od.Color, rd.Quantity, rd.Condition
      FROM ReturnDetails rd
      JOIN OrderDetails od ON od.OrderDetailID=rd.OrderDetailID
      WHERE rd.ReturnID=@rid
    `);
  for (const row of details.recordset) {
    const quantity = Number(row.Quantity) || 0;
    if (quantity <= 0) continue;
    // Hàng hư hỏng/tai nạn không được cộng lại vào tồn bán được.
    // Vẫn giữ ReturnDetails.Condition để quản lý xử lý kho hỏng riêng nếu cần.
    if (normalizeOrderStatus(row.Condition) === "damaged") continue;
    if (row.ProductVariantID) {
      const updateResult = await new sql.Request(transaction)
        .input("vid", sql.Int, row.ProductVariantID)
        .input("q", sql.Int, quantity)
        .query("UPDATE ProductVariants SET StockQuantity=ISNULL(StockQuantity,0)+@q, Version=Version+1 WHERE ProductVariantID=@vid");
      if (!updateResult.rowsAffected?.[0]) throw new Error("Khong tim thay bien the de nhap lai kho.");
    } else if (row.ProductID && row.Size && row.Color) {
      const updateResult = await new sql.Request(transaction)
        .input("pid", sql.Int, row.ProductID)
        .input("sz", sql.NVarChar, row.Size)
        .input("clr", sql.NVarChar, row.Color)
        .input("q", sql.Int, quantity)
        .query(`
          UPDATE v SET StockQuantity=ISNULL(v.StockQuantity,0)+@q, Version=v.Version+1
          FROM ProductVariants v
          WHERE v.ProductVariantID=(SELECT TOP 1 ProductVariantID FROM ProductVariants WITH (UPDLOCK, HOLDLOCK) WHERE ProductID=@pid AND ISNULL(Size,N'')=@sz AND ISNULL(ColorName,N'')=@clr ORDER BY ProductVariantID)
        `);
      if (!updateResult.rowsAffected?.[0]) throw new Error("Khong tim thay bien the de nhap lai kho.");
    }
  }
  await new sql.Request(transaction)
    .input("rid", sql.Int, returnId)
    .query("UPDATE Returns SET RestockedAt=GETDATE() WHERE ReturnID=@rid");
  return true;
}

async function finalizeReturn(transaction, returnRow, changedBy, resolutionNote) {
  // Case "chưa nhận được hàng" là sự cố giao vận: khách không có hàng để
  // gửi lại, vì vậy tuyệt đối không cộng lại tồn kho như một đơn trả thường.
  const notReceived = isNotReceivedReturn(returnRow.ReturnType ?? returnRow.return_type);
  const restocked = notReceived
    ? false
    : await restockReturnItems(transaction, returnRow.ReturnID);
  await new sql.Request(transaction)
    .input("rid", sql.Int, returnRow.ReturnID)
    .input("oid", sql.Int, returnRow.OrderID)
    .input("note", sql.NVarChar, cleanAddressText(resolutionNote, 1000))
    .input("uid", sql.Int, Number(changedBy) || null)
    .query(`
      UPDATE Returns
      SET Status=N'Đã hoàn tất',
          RefundedAt=CASE WHEN EXISTS (
            SELECT 1 FROM Orders
            WHERE OrderID=@oid
              AND ISNULL(PaymentStatus,N'Chưa thanh toán') IN
                (N'Đã thanh toán',N'Da thanh toan',N'Chờ thanh toán',N'Cho thanh toan')
          ) THEN ISNULL(RefundedAt, GETDATE()) ELSE RefundedAt END,
          ResolutionNote=COALESCE(NULLIF(@note,N''), ResolutionNote), UpdatedBy=@uid, UpdatedAt=GETDATE()
      WHERE ReturnID=@rid
    `);
  await new sql.Request(transaction)
    .input("oid", sql.Int, returnRow.OrderID)
    .input("amt", sql.Decimal(18, 2), Number(returnRow.RefundAmount) || 0)
    .input("uid", sql.Int, Number(changedBy) || null)
    .query(`
      DECLARE @wasPaid bit = CASE WHEN EXISTS (
        SELECT 1 FROM Orders WHERE OrderID=@oid
          AND ISNULL(PaymentStatus,N'Chưa thanh toán') IN (N'Đã thanh toán',N'Da thanh toan',N'Chờ thanh toán',N'Cho thanh toan')
      ) THEN 1 ELSE 0 END;
      UPDATE Orders
      SET Status=N'Đã hoàn tất trả hàng',
          PaymentStatus=CASE WHEN @wasPaid=1 THEN N'Hoàn tiền' ELSE N'Đã hủy' END,
          PaymentConfirmedAt=CASE WHEN @wasPaid=1 THEN ISNULL(PaymentConfirmedAt, GETDATE()) ELSE PaymentConfirmedAt END,
          UpdatedAt=GETDATE()
      WHERE OrderID=@oid;
      IF @wasPaid=1 AND NOT EXISTS (SELECT 1 FROM PaymentTransactions WHERE OrderID=@oid AND Provider=N'MANUAL_REFUND' AND Status=N'REFUNDED')
        INSERT INTO PaymentTransactions (OrderID, Provider, Amount, Status, SignatureValid, CreatedAt, CompletedAt)
        VALUES (@oid, N'MANUAL_REFUND', @amt, N'REFUNDED', 1, GETDATE(), GETDATE());
    `);
  return restocked;
}

app.get("/api/returns", async (req, res) => {
  try {
    await poolConnect;
    const request = pool.request();
    let ownerFilter = "";
    if (req.auth.role !== "Admin") {
      const userId = Number(req.auth && req.auth.sub);
      if (!userId) return res.status(401).json({ success: false, message: "Ban chua dang nhap." });
      request.input("uid", sql.Int, userId);
      ownerFilter = "WHERE o.UserID=@uid";
    }
    const returnsResult = await request.query(`
      SELECT r.ReturnID, r.OrderID, r.ReturnType, r.TrackingNumber, r.PostOfficeID,
             r.ReturnAddress, r.Reason, r.Status, r.RefundAmount, r.CreatedAt, r.UpdatedAt,
             r.InspectionNote, r.ResolutionNote, r.ApprovedAt, r.RefundedAt, r.RestockedAt,
             r.UpdatedBy, o.UserID, o.CustomerName, o.CustomerPhone, o.PaymentMethod,
             o.PaymentStatus, o.Status AS OrderStatus
      FROM Returns r JOIN Orders o ON o.OrderID=r.OrderID
      ${ownerFilter}
      ORDER BY CASE WHEN r.Status IN (N'Chờ xử lý',N'Đã tiếp nhận',N'Đang kiểm tra') THEN 0 ELSE 1 END,
               r.CreatedAt ASC, r.ReturnID ASC
    `);
    const ids = returnsResult.recordset.map((row) => row.ReturnID);
    let details = [];
    if (ids.length) {
      const detailsResult = await pool.request().query(`
        SELECT rd.ReturnID, rd.ReturnDetailID, rd.OrderDetailID, rd.Quantity, rd.Reason, rd.Condition,
               od.ProductID, od.ProductVariantID, od.ProductNameSnapshot AS ProductName,
               od.Size, od.Color, od.UnitPrice
        FROM ReturnDetails rd JOIN OrderDetails od ON od.OrderDetailID=rd.OrderDetailID
        WHERE rd.ReturnID IN (${ids.map((id) => Number(id)).filter((id) => id > 0).join(",") || "0"})
      `);
      details = detailsResult.recordset;
    }
    res.json(returnsResult.recordset.map((row) => ({ ...row, Details: details.filter((d) => d.ReturnID === row.ReturnID) })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/returns", async (req, res) => {
  const authenticatedUserId = Number(req.auth && req.auth.sub);
  const isAdmin = req.auth && req.auth.role === "Admin";
  const b = req.body || {};
  const orderId = Number(b.order_id ?? b.orderId);
  if (!authenticatedUserId) return res.status(401).json({ success: false, message: "Ban chua dang nhap." });
  if (!Number.isInteger(orderId) || orderId <= 0) return res.status(400).json({ success: false, message: "Don hang khong hop le." });
  const returnType = cleanAddressText(b.return_type ?? b.returnType, 20) || "CUSTOMER";
  const notReceived = isNotReceivedReturn(returnType);
  const items = Array.isArray(b.items) ? b.items : [];
  // Báo chưa nhận được hàng áp dụng cho cả kiện, nên API không bắt buộc
  // client phải gửi danh sách sản phẩm (frontend sẽ tự điền nếu có).
  if (!items.length && !notReceived) return res.status(400).json({ success: false, message: "Vui long chon san pham va so luong can tra." });
  const trackingNumber = notReceived ? "" : cleanAddressText(b.tracking_number ?? b.trackingCode, 60);
  const reason = cleanAddressText(b.reason, 500) || (notReceived ? "[Chưa nhận được hàng] Khách hàng chưa nhận được kiện hàng." : "");
  if (!reason) return res.status(400).json({ success: false, message: "Vui long nhap ly do tra hang." });
  const requestedStatus = canonicalReturnStatus(b.status || "Chờ xử lý");
  const initialStatus = isAdmin && requestedStatus ? requestedStatus : "Chờ xử lý";
  const requestedRefund = Number(b.refund_amount ?? b.refundAmount);
  const postOfficeId = notReceived ? null : (Number(b.post_office_id ?? b.postOfficeId) || null);
  let returnAddress = notReceived ? "" : cleanAddressText(b.return_address, 500);
  if (["post_office", "post office"].includes(normalizeReturnType(returnType)) && !postOfficeId) return res.status(400).json({ success: false, message: "Vui long chon buu cuc gui tra." });

  await poolConnect;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const orderResult = await new sql.Request(transaction).input("oid", sql.Int, orderId).query(`
      SELECT OrderID, UserID, Status, PaymentMethod, PaymentStatus, TotalAmount, ShippingAddress,
             DeliveredDate, ReceivedConfirmedDate, RevenueEligibleDate
      FROM Orders WITH (UPDLOCK, HOLDLOCK) WHERE OrderID=@oid
    `);
    const order = orderResult.recordset[0];
    if (!order) throw Object.assign(new Error("Khong tim thay don hang."), { statusCode: 404 });
    if (!isAdmin && Number(order.UserID) !== authenticatedUserId) throw Object.assign(new Error("Ban khong duoc tra don hang nay."), { statusCode: 403 });
    const normalizedOrderStatus = normalizeOrderStatus(order.Status);
    const deliveredStatuses = new Set(["da giao", "da giao hang thanh cong", "delivered", "da nhan hang", "received"]);
    const notReceivedStatuses = new Set([...deliveredStatuses, "dang van chuyen", "dang giao", "shipped", "shipping"]);
    if (notReceived ? !notReceivedStatuses.has(normalizedOrderStatus) : !deliveredStatuses.has(normalizedOrderStatus)) {
      throw Object.assign(new Error(notReceived
        ? "Don hang chua o trang thai co the bao chua nhan duoc hang."
        : "Don hang khong o trang thai co the tra hang."), { statusCode: 409 });
    }
    const returnWindowStart = order.ReceivedConfirmedDate || order.DeliveredDate;
    if (returnWindowStart && Date.now() > new Date(returnWindowStart).getTime() + 14 * 24 * 60 * 60 * 1000) {
      throw Object.assign(new Error("Don hang da qua thoi han doi tra 14 ngay."), { statusCode: 409 });
    }
    if (!returnAddress && normalizeReturnType(returnType) === "shipper") returnAddress = cleanAddressText(order.ShippingAddress, 500);
    if (postOfficeId) {
      const postOffice = await new sql.Request(transaction).input("po", sql.Int, postOfficeId).query("SELECT PostOfficeID FROM PostOffices WHERE PostOfficeID=@po AND ISNULL(IsActive,1)=1");
      if (!postOffice.recordset.length) throw Object.assign(new Error("Buu cuc gui tra khong hop le."), { statusCode: 400 });
    }
    const duplicate = await new sql.Request(transaction).input("oid", sql.Int, orderId).query(`
      SELECT TOP 1 ReturnID FROM Returns WITH (UPDLOCK, HOLDLOCK)
      WHERE OrderID=@oid AND ISNULL(Status,N'Chờ xử lý') NOT IN (
        N'Từ chối',N'Tu choi',N'Rejected',
        N'Hủy',N'Huy',N'Cancelled',N'Canceled',N'Đã hủy',N'Da huy'
      )
    `);
    if (duplicate.recordset.length) throw Object.assign(new Error("Don hang da co yeu cau tra hang dang xu ly."), { statusCode: 409 });
    const detailResult = await new sql.Request(transaction).input("oid", sql.Int, orderId).query(`
      SELECT od.OrderDetailID, od.ProductID, od.ProductVariantID, od.Size, od.Color,
             od.Quantity, od.UnitPrice, COALESCE(od.ProductNameSnapshot,p.ProductName,N'San pham') AS ProductName
      FROM OrderDetails od LEFT JOIN Products p ON p.ProductID=od.ProductID
      WHERE od.OrderID=@oid
    `);
    // Nếu client không gửi items cho case chưa nhận hàng, coi toàn bộ dòng
    // hàng của đơn là một kiện thất lạc để vẫn tính đúng khoản cần hoàn (nếu
    // khách đã thanh toán) và hiển thị đầy đủ chi tiết cho quản trị viên.
    const effectiveItems = notReceived && !items.length
      ? detailResult.recordset.map((detail) => ({
        order_detail_id: detail.OrderDetailID,
        quantity: detail.Quantity,
        reason,
      }))
      : items;
    const detailsById = new Map(detailResult.recordset.map((row) => [Number(row.OrderDetailID), row]));
    const activeReturnResult = await new sql.Request(transaction).input("oid", sql.Int, orderId).query(`
      SELECT rd.OrderDetailID, SUM(ISNULL(rd.Quantity,0)) AS Quantity
      FROM ReturnDetails rd JOIN Returns r ON r.ReturnID=rd.ReturnID
      WHERE r.OrderID=@oid AND ISNULL(r.Status,N'Chờ xử lý') NOT IN (
        N'Từ chối',N'Tu choi',N'Rejected',
        N'Hủy',N'Huy',N'Cancelled',N'Canceled',N'Đã hủy',N'Da huy'
      )
      GROUP BY rd.OrderDetailID
    `);
    const alreadyReturned = new Map(activeReturnResult.recordset.map((row) => [Number(row.OrderDetailID), Number(row.Quantity) || 0]));
    const selected = new Map();
    const selectedMeta = new Map();
    for (const item of effectiveItems) {
      const quantity = Number(item.quantity ?? item.return_qty);
      if (!Number.isInteger(quantity) || quantity <= 0) continue;
      let detail = detailsById.get(Number(item.order_detail_id ?? item.orderDetailId));
      if (!detail) {
        detail = detailResult.recordset.find((candidate) =>
          Number(candidate.ProductID) === Number(item.product_id ?? item.productId) &&
          String(candidate.Size || "") === String(item.size || "") &&
          String(candidate.Color || "") === String(item.color || ""));
      }
      if (!detail) throw Object.assign(new Error("San pham tra hang khong thuoc don hang."), { statusCode: 400 });
      const max = Number(detail.Quantity || 0) - (alreadyReturned.get(Number(detail.OrderDetailID)) || 0);
      const next = (selected.get(Number(detail.OrderDetailID)) || 0) + quantity;
      if (next > max) throw Object.assign(new Error(`So luong tra vuot qua so luong da mua (${detail.ProductName}).`), { statusCode: 409 });
      selected.set(Number(detail.OrderDetailID), next);
      selectedMeta.set(Number(detail.OrderDetailID), item);
    }
    if (!selected.size && !notReceived) throw Object.assign(new Error("Vui long chon it nhat mot san pham de tra."), { statusCode: 400 });
    const canonicalRefund = [...selected.entries()].reduce((sum, [detailId, quantity]) => sum + Number(detailsById.get(detailId).UnitPrice || 0) * quantity, 0);
    const refundAmount = isAdmin && Number.isFinite(requestedRefund) && requestedRefund >= 0
      ? Math.min(requestedRefund, canonicalRefund)
      : canonicalRefund;
    const insertResult = await new sql.Request(transaction)
      .input("oid", sql.Int, orderId).input("rt", sql.VarChar(20), returnType)
      .input("trk", sql.VarChar(60), trackingNumber || null).input("po", sql.Int, postOfficeId)
      .input("ra", sql.NVarChar(500), returnAddress || null).input("rs", sql.NVarChar(500), reason)
      .input("st", sql.NVarChar(50), initialStatus).input("amt", sql.Decimal(18, 2), refundAmount)
      .input("uid", sql.Int, authenticatedUserId)
      .query(`
        INSERT INTO Returns (OrderID, ReturnType, TrackingNumber, PostOfficeID, ReturnAddress, Reason, Status, RefundAmount, CreatedAt, UpdatedAt, UpdatedBy)
        OUTPUT INSERTED.ReturnID
        VALUES (@oid,@rt,@trk,@po,@ra,@rs,@st,@amt,GETDATE(),GETDATE(),@uid)
      `);
    const returnId = insertResult.recordset[0].ReturnID;
    for (const [detailId, quantity] of selected.entries()) {
      const item = selectedMeta.get(detailId) || {};
      await new sql.Request(transaction).input("rid", sql.Int, returnId).input("odid", sql.Int, detailId)
        .input("q", sql.Int, quantity).input("rsn", sql.NVarChar(500), cleanAddressText(item.reason || reason, 500))
        .input("cond", sql.NVarChar(30), cleanAddressText(item.condition, 30) || null)
        .query("INSERT INTO ReturnDetails (ReturnID, OrderDetailID, Quantity, Reason, Condition) VALUES (@rid,@odid,@q,@rsn,@cond)");
    }
    await new sql.Request(transaction).input("oid", sql.Int, orderId).input("uid", sql.Int, authenticatedUserId).query(`
      UPDATE Orders SET Status=N'Yêu cầu trả hàng', UpdatedAt=GETDATE() WHERE OrderID=@oid;
    `);
    await insertOrderHistory(transaction, orderId, order.Status, "Yêu cầu trả hàng", `[RETURN_CREATED] #${returnId} ${reason}`, authenticatedUserId);
    const insertedReturn = { ReturnID: returnId, OrderID: orderId, ReturnType: returnType, RefundAmount: refundAmount, Status: initialStatus };
    if (isAdmin && ["Đã hoàn tiền", "Đã hoàn tất"].includes(initialStatus)) {
      await finalizeReturn(transaction, insertedReturn, authenticatedUserId, b.resolution_note);
    }
    await transaction.commit();
    res.status(201).json({ success: true, ...insertedReturn });
  } catch (e) {
    if (transaction._aborted !== true) { try { await transaction.rollback(); } catch (_) {} }
    res.status(e.statusCode || 500).json({ success: false, message: e.statusCode ? e.message : "Khong tao duoc yeu cau tra hang." });
  }
});

app.put("/api/returns/:id/status", async (req, res) => {
  const returnId = Number(req.params.id);
  const changedBy = Number(req.auth && req.auth.sub);
  const requestedStatus = canonicalReturnStatus(req.body && req.body.status);
  if (!Number.isInteger(returnId) || returnId <= 0 || !requestedStatus) return res.status(400).json({ success: false, message: "Yeu cau hoac trang thai tra hang khong hop le." });
  await poolConnect;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const result = await new sql.Request(transaction).input("rid", sql.Int, returnId).query(`
      SELECT r.ReturnID, r.OrderID, r.ReturnType, r.Status, r.RefundAmount, r.RefundedAt, r.RestockedAt,
             o.Status AS OrderStatus, o.DeliveredDate, o.ReceivedConfirmedDate
      FROM Returns r JOIN Orders o WITH (UPDLOCK, HOLDLOCK) ON o.OrderID=r.OrderID
      WHERE r.ReturnID=@rid
    `);
    const row = result.recordset[0];
    if (!row) throw Object.assign(new Error("Khong tim thay yeu cau tra hang."), { statusCode: 404 });
    // Lấy trạng thái ngay trước khi tạo yêu cầu để xử lý đúng cả dữ liệu cũ
    // không có DeliveredDate/ReceivedConfirmedDate. Marker được ghi cùng
    // transaction lúc POST /returns nên không bị nhầm với lịch sử khác.
    const originResult = await new sql.Request(transaction)
      .input("oid", sql.Int, row.OrderID)
      .input("rid", sql.Int, returnId)
      .query(`
        SELECT TOP 1 OldStatus AS ReturnOriginStatus
        FROM OrderStatusHistory WITH (UPDLOCK, HOLDLOCK)
        WHERE OrderID=@oid
          AND CHARINDEX(N'[RETURN_CREATED] #' + CONVERT(nvarchar(20), @rid), ISNULL(Note,N'')) = 1
        ORDER BY HistoryID DESC
      `);
    row.ReturnOriginStatus = originResult.recordset[0]?.ReturnOriginStatus || null;
    if (!row.ReturnOriginStatus) {
      // Tương thích các yêu cầu trả hàng được tạo trước khi có marker
      // [RETURN_CREATED]. Chỉ lấy lịch sử chuyển sang trạng thái yêu cầu trả.
      const fallbackOrigin = await new sql.Request(transaction)
        .input("oid", sql.Int, row.OrderID)
        .query(`
          SELECT TOP 1 OldStatus AS ReturnOriginStatus
          FROM OrderStatusHistory WITH (UPDLOCK, HOLDLOCK)
          WHERE OrderID=@oid
            AND NewStatus IN (N'Yêu cầu trả hàng',N'Yeu cau tra hang')
          ORDER BY HistoryID DESC
        `);
      row.ReturnOriginStatus = fallbackOrigin.recordset[0]?.ReturnOriginStatus || null;
    }
    if (!returnTransitionAllowed(row.Status, requestedStatus)) throw Object.assign(new Error(`Khong the chuyen tu '${row.Status}' sang '${requestedStatus}'.`), { statusCode: 409 });
    const inspectionNote = cleanAddressText(req.body && req.body.inspection_note, 1000);
    const resolutionNote = cleanAddressText(req.body && req.body.resolution_note, 1000);
    const requestedRefund = Number(req.body && req.body.refund_amount);
    if (Number.isFinite(requestedRefund) && requestedRefund >= 0) row.RefundAmount = Math.min(requestedRefund, Number(row.RefundAmount) || 0);
    await new sql.Request(transaction).input("rid", sql.Int, returnId).input("st", sql.NVarChar(50), requestedStatus)
      .input("ins", sql.NVarChar(1000), inspectionNote || null).input("res", sql.NVarChar(1000), resolutionNote || null)
      .input("amt", sql.Decimal(18, 2), Number(row.RefundAmount) || 0).input("uid", sql.Int, changedBy)
      .query(`
        UPDATE Returns SET Status=@st, RefundAmount=@amt,
          InspectionNote=COALESCE(@ins,InspectionNote), ResolutionNote=COALESCE(@res,ResolutionNote),
          ApprovedAt=CASE WHEN @st=N'Chấp nhận hoàn tiền' THEN ISNULL(ApprovedAt,GETDATE()) ELSE ApprovedAt END,
          UpdatedAt=GETDATE(), UpdatedBy=@uid WHERE ReturnID=@rid
      `);
    let finalStatus = requestedStatus;
    let orderStatusAfter = row.OrderStatus;
    if (["Đã hoàn tiền", "Đã hoàn tất"].includes(requestedStatus)) {
      await finalizeReturn(transaction, { ...row, ReturnID: returnId, RefundAmount: Number(row.RefundAmount) || 0 }, changedBy, resolutionNote);
      finalStatus = "Đã hoàn tất";
      orderStatusAfter = "Đã hoàn tất trả hàng";
    } else if (["Từ chối", "Hủy"].includes(requestedStatus)) {
      const restoreStatus = restoreStatusAfterReturn(row);
      await new sql.Request(transaction).input("oid", sql.Int, row.OrderID).input("st", sql.NVarChar(50), restoreStatus)
        .query("UPDATE Orders SET Status=@st, UpdatedAt=GETDATE() WHERE OrderID=@oid");
      orderStatusAfter = restoreStatus;
    }
    await insertOrderHistory(transaction, row.OrderID, row.OrderStatus, orderStatusAfter, `[RETURN_STATUS] #${returnId}: ${row.Status} -> ${requestedStatus}${inspectionNote ? `; ${inspectionNote}` : ""}`, changedBy);
    await transaction.commit();
    res.json({ success: true, ReturnID: returnId, status: finalStatus, refund_amount: row.RefundAmount });
  } catch (e) {
    if (transaction._aborted !== true) { try { await transaction.rollback(); } catch (_) {} }
    res.status(e.statusCode || 500).json({ success: false, message: e.statusCode ? e.message : "Khong cap nhat duoc yeu cau tra hang." });
  }
});

// ================= API MAU SAC (Colors) =================
app.get("/api/colors", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool
      .request()
      .query(
        "SELECT ColorID as id, ColorName as name, ColorHex as hex, SortOrder as sort_order, IsActive as active FROM Colors ORDER BY ISNULL(SortOrder, 999), ColorID",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/colors", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("n", sql.NVarChar, req.body.name)
      .input("h", sql.VarChar, req.body.hex || "#000000")
      .input("so", sql.Int, req.body.sort_order || 0)
      .input("a", sql.Bit, req.body.active !== false)
      .query(
        "INSERT INTO Colors (ColorName, ColorHex, SortOrder, IsActive) VALUES (@n, @h, @so, @a)",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/api/colors/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("n", sql.NVarChar, req.body.name)
      .input("h", sql.VarChar, req.body.hex || "#000000")
      .input("so", sql.Int, req.body.sort_order || 0)
      .input("a", sql.Bit, req.body.active !== false)
      .query(
        "UPDATE Colors SET ColorName=@n, ColorHex=@h, SortOrder=@so, IsActive=@a WHERE ColorID=@id",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/api/colors/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("UPDATE Colors SET IsActive = 0 WHERE ColorID=@id");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= API KICH THUOC (Sizes) =================
app.get("/api/sizes", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool
      .request()
      .query(
        "SELECT SizeID as id, SizeName as name, SizeStandard as standard, SortOrder as sort_order, IsActive as active FROM Sizes ORDER BY ISNULL(SortOrder, 999), SizeID",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/sizes", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("n", sql.NVarChar, req.body.name)
      .input("s", sql.VarChar, req.body.standard || "")
      .input("so", sql.Int, req.body.sort_order || 0)
      .input("a", sql.Bit, req.body.active !== false)
      .query(
        "INSERT INTO Sizes (SizeName, SizeStandard, SortOrder, IsActive) VALUES (@n, @s, @so, @a)",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/api/sizes/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("n", sql.NVarChar, req.body.name)
      .input("s", sql.VarChar, req.body.standard || "")
      .input("so", sql.Int, req.body.sort_order || 0)
      .input("a", sql.Bit, req.body.active !== false)
      .query(
        "UPDATE Sizes SET SizeName=@n, SizeStandard=@s, SortOrder=@so, IsActive=@a WHERE SizeID=@id",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/api/sizes/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("UPDATE Sizes SET IsActive = 0 WHERE SizeID=@id");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= API BO SUU TAP (Collections) =================
app.get("/api/collections", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool
      .request()
      .query(
        "SELECT CollectionID as id, CollectionName as name, BrandID as brand_id, Slug as slug, IsActive as active FROM Collections ORDER BY CollectionID DESC",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/collections", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("n", sql.NVarChar, req.body.name)
      .input("b", sql.Int, req.body.brand_id || null)
      .input("s", sql.VarChar, req.body.slug || "")
      .input("a", sql.Bit, req.body.active !== false)
      .query(
        "INSERT INTO Collections (CollectionName, BrandID, Slug, IsActive) VALUES (@n, @b, @s, @a)",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/api/collections/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("n", sql.NVarChar, req.body.name)
      .input("b", sql.Int, req.body.brand_id || null)
      .input("s", sql.VarChar, req.body.slug || "")
      .input("a", sql.Bit, req.body.active !== false)
      .query(
        "UPDATE Collections SET CollectionName=@n, BrandID=@b, Slug=@s, IsActive=@a WHERE CollectionID=@id",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/api/collections/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("UPDATE Collections SET IsActive = 0 WHERE CollectionID=@id");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= API KHO HANG (ProductVariants) =================
app.get("/api/inventory", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool.request().query(`
      SELECT v.ProductVariantID as id, v.ProductID as product_id,
             p.ProductName as product_name, ISNULL(v.Size, N'') as size,
             ISNULL(v.ColorName, N'') as color, ISNULL(v.ColorHex, '') as color_hex,
             ISNULL(v.ChildSKU, '') as sku,
             CAST(ISNULL(v.StockQuantity, 0) AS INT) as stock,
             ISNULL(v.PriceAdjustment, 0) as price_adjustment,
             -- LOI GOC DA SUA: cau lenh cu doc v.ImageURL nhung bang
             -- ProductVariants KHONG HE CO cot ImageURL. SQL Server bao loi
             -- 207 Invalid column name -> API tra ve 500 -> frontend nhan null
             -- -> db.inventory = [] -> MOI O TON KHO HIEN SO 0 VA KHONG SUA DUOC.
             -- Lay anh theo mau tu ProductImages, khong co thi lay anh san pham.
             ISNULL((
               SELECT TOP 1 pi.ImageURL FROM ProductImages pi
               WHERE pi.ProductID = v.ProductID
                 AND pi.ColorName = v.ColorName
               ORDER BY pi.IsPrimary DESC, pi.SortOrder
             ), ISNULL(p.ImageURL, '')) as image_url
      FROM ProductVariants v LEFT JOIN Products p ON v.ProductID = p.ProductID
      WHERE ISNULL(v.IsActive, 1) = 1
      ORDER BY p.ProductName, v.ColorName, v.Size
    `);
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/api/inventory/:id", async (req, res) => {
  try {
    await poolConnect;
    let stock = Number(req.body.stock);
    if (isNaN(stock) || stock < 0) stock = 0; // khong cho ton kho am
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("s", sql.Int, stock)
      .query(
        "UPDATE ProductVariants SET StockQuantity=@s WHERE ProductVariantID=@id",
      );
    res.json({ success: true, stock });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= CANH BAO TON KHO (FIX) =================
// Truoc day khong co API nao bao "het hang", nen trang Thong ke im lang khi ton ve 0.
// GET /api/inventory/alerts?threshold=10
app.get("/api/inventory/alerts", async (req, res) => {
  try {
    await poolConnect;
    let threshold = Number(req.query.threshold);
    if (isNaN(threshold) || threshold < 0) threshold = 10;

    const r = await pool.request().input("th", sql.Int, threshold).query(`
      SELECT v.ProductVariantID as id, v.ProductID as product_id,
             p.ProductName as product_name, p.ImageURL as image_url,
             b.BrandName as brand,
             ISNULL(v.Size, N'') as size,
             ISNULL(v.ColorName, N'') as color, ISNULL(v.ColorHex, '') as color_hex,
             v.ChildSKU as sku,
             CAST(ISNULL(v.StockQuantity, 0) AS INT) as stock
      FROM ProductVariants v
      LEFT JOIN Products p ON v.ProductID = p.ProductID
      LEFT JOIN Brands b ON p.BrandID = b.BrandID
      WHERE ISNULL(v.IsActive, 1) = 1
        AND ISNULL(p.IsActive, 1) = 1
        AND ISNULL(v.StockQuantity, 0) <= @th
      ORDER BY CAST(ISNULL(v.StockQuantity, 0) AS INT) ASC, p.ProductName, v.ColorName, v.Size
    `);

    const rows = r.recordset;
    const outOfStock = rows.filter((v) => Number(v.stock) <= 0);
    const lowStock = rows.filter((v) => Number(v.stock) > 0);

    res.json({
      threshold,
      out_of_stock_count: outOfStock.length,
      low_stock_count: lowStock.length,
      out_of_stock_product_count: new Set(outOfStock.map((v) => v.product_id))
        .size,
      out_of_stock: outOfStock,
      low_stock: lowStock,
      items: rows,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= API GIAM GIA BIEN THE (an toan - tra rong neu chua co bang) =================
app.get("/api/variantDiscounts", async (req, res) => {
  res.json([]);
});

// ---------------- KHUYEN MAI (Coupons) ----------------
// Doc CA PascalCase (frontend hien tai) lan lowercase (ban cu) de khong con lech ten truong.
function readCoupon(b) {
  b = b || {};
  return {
    code: b.CouponCode ?? b.code ?? null,
    name: b.CouponName ?? b.name ?? "",
    dtype: b.DiscountType ?? b.discount_type ?? "Phan tram",
    dvalue: b.DiscountValue ?? b.value ?? 0,
    percent: b.DiscountPercent ?? b.percent ?? 0,
    minOrder: b.MinOrderAmount ?? b.min_order ?? 0,
    maxDisc: b.MaxDiscountAmount ?? b.max_discount ?? 0,
    limit: b.UsageLimit ?? b.limit ?? 0,
    startDate: b.StartDate ?? b.start_date ?? null,
    expiry: b.ExpiryDate ?? b.expiry ?? null,
    desc: b.Description ?? b.description ?? "",
    active: (b.IsActive ?? b.active) !== false,
  };
}

app.get("/api/discounts", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool.request().query(
      `SELECT CouponID as id, CouponCode as code, CouponName as name,
              DiscountType as discount_type, DiscountValue as value,
              DiscountPercent as [percent], MinOrderAmount as min_order,
              MaxDiscountAmount as max_discount, UsageLimit as [limit],
              UsedCount as used,
              CONVERT(varchar, StartDate, 23) as start_date,
              CONVERT(varchar, ExpiryDate, 23) as expiry,
              Description as [description], IsActive as active
       FROM Coupons ORDER BY CouponID DESC`,
    );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/discounts", async (req, res) => {
  try {
    await poolConnect;
    const c = readCoupon(req.body);
    await pool
      .request()
      .input("c", sql.VarChar, c.code)
      .input("nm", sql.NVarChar, c.name)
      .input("dt", sql.NVarChar, c.dtype)
      .input("dv", sql.Decimal(18, 0), c.dvalue)
      .input("p", sql.Int, c.percent)
      .input("mo", sql.Decimal(18, 0), c.minOrder)
      .input("md", sql.Decimal(18, 0), c.maxDisc)
      .input("l", sql.Int, c.limit)
      .input("sd", sql.DateTime, c.startDate)
      .input("e", sql.DateTime, c.expiry)
      .input("desc", sql.NVarChar, c.desc)
      .input("a", sql.Bit, c.active)
      .query(
        `INSERT INTO Coupons (CouponCode, CouponName, DiscountType, DiscountValue, DiscountPercent, MinOrderAmount, MaxDiscountAmount, UsageLimit, StartDate, ExpiryDate, Description, IsActive)
         VALUES (@c, @nm, @dt, @dv, @p, @mo, @md, @l, @sd, @e, @desc, @a)`,
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/discounts/:id", async (req, res) => {
  try {
    await poolConnect;
    const c = readCoupon(req.body);
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("c", sql.VarChar, c.code)
      .input("nm", sql.NVarChar, c.name)
      .input("dt", sql.NVarChar, c.dtype)
      .input("dv", sql.Decimal(18, 0), c.dvalue)
      .input("p", sql.Int, c.percent)
      .input("mo", sql.Decimal(18, 0), c.minOrder)
      .input("md", sql.Decimal(18, 0), c.maxDisc)
      .input("l", sql.Int, c.limit)
      .input("sd", sql.DateTime, c.startDate)
      .input("e", sql.DateTime, c.expiry)
      .input("desc", sql.NVarChar, c.desc)
      .input("a", sql.Bit, c.active)
      .query(
        `UPDATE Coupons SET CouponCode=@c, CouponName=@nm, DiscountType=@dt, DiscountValue=@dv,
           DiscountPercent=@p, MinOrderAmount=@mo, MaxDiscountAmount=@md, UsageLimit=@l,
           StartDate=@sd, ExpiryDate=@e, Description=@desc, IsActive=@a WHERE CouponID=@id`,
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/discounts/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM Coupons WHERE CouponID=@id");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= API KHACH HANG & THONG KE DOANH THU =================
app.get("/api/customers", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool.request().query(`
      SELECT CAST(u.UserID AS VARCHAR(40)) as id, u.FullName as name, u.Phone as phone,
             u.Email as email, u.Address as address, ISNULL(u.Source, N'Thành viên') as source,
             CONVERT(varchar, u.CreatedAt, 120) as created_at,
             COUNT(o.OrderID) as order_count,
             COALESCE(SUM(CASE WHEN o.Status = N'Đã giao hàng thành công' THEN o.TotalAmount ELSE 0 END), 0) as spent,
             0 as is_walkin
      FROM Users u LEFT JOIN Orders o ON u.UserID = o.UserID
      WHERE u.RoleID = 2
      GROUP BY u.UserID, u.FullName, u.Phone, u.Email, u.Address, u.Source, u.CreatedAt
      UNION ALL
      SELECT 'walkin:' + ISNULL(o.CustomerPhone, '') as id, MAX(o.CustomerName) as name,
             o.CustomerPhone as phone, '' as email, MAX(ISNULL(o.ShippingAddress, N'')) as address,
             N'Vãng lai' as source, CONVERT(varchar, MIN(o.OrderDate), 120) as created_at,
             COUNT(o.OrderID) as order_count,
             COALESCE(SUM(CASE WHEN o.Status = N'Đã giao hàng thành công' THEN o.TotalAmount ELSE 0 END), 0) as spent,
             1 as is_walkin
      FROM Orders o
      WHERE o.UserID IS NULL AND ISNULL(o.CustomerPhone, '') <> ''
        AND NOT EXISTS (SELECT 1 FROM Users u2 WHERE u2.RoleID = 2 AND u2.Phone = o.CustomerPhone)
      GROUP BY o.CustomerPhone
      ORDER BY spent DESC
    `);
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// TAO KHACH VANG LAI (tu Ban tai quay) -> luu vao Users (RoleID = 2)
app.post("/api/customers", async (req, res) => {
  try {
    await poolConnect;
    const b = req.body || {};
    const fullName = b.FullName ?? b.name ?? b.full_name ?? "Khach le";
    const phone = b.Phone ?? b.phone ?? "";
    const email =
      b.Email ?? b.email ?? "pos" + (phone || Date.now()) + "@walkin.local";
    const password = b.PasswordHash ?? b.password ?? "POS_WALK_IN";
    const address = b.Address ?? b.address ?? "";
    const source = b.Source ?? b.source ?? "POS";

    // Neu email da ton tai -> tra lai UserID cu, khong tao trung
    let check = await pool
      .request()
      .input("e", sql.VarChar, email)
      .query("SELECT UserID FROM Users WHERE Email=@e");
    if (check.recordset.length > 0) {
      return res.json({
        success: true,
        UserID: check.recordset[0].UserID,
        message: "Khach da ton tai",
      });
    }

    const passwordHash = await passwordHelper.hash(String(password));
    let r = await pool
      .request()
      .input("f", sql.NVarChar, fullName)
      .input("ph", sql.VarChar, phone)
      .input("e", sql.VarChar, email)
      .input("p", sql.VarChar, passwordHash)
      .input("a", sql.NVarChar, address)
      .input("s", sql.NVarChar, source)
      .query(
        "INSERT INTO Users (RoleID, FullName, Phone, Email, PasswordHash, Address, Source, IsActive, CreatedAt) OUTPUT INSERTED.UserID VALUES (2, @f, @ph, @e, @p, @a, @s, 1, GETDATE())",
      );
    res.json({ success: true, UserID: r.recordset[0].UserID });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get("/api/customers/:id/orders", async (req, res) => {
  try {
    await poolConnect;
    let rOrders = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query(
        `SELECT OrderID as id, UserID as user_id, TotalAmount as total,
                CONVERT(varchar, OrderDate, 103) + ' ' + CONVERT(varchar, OrderDate, 108) as date,
                CONVERT(varchar(33), OrderDate, 126) as created_at,
                ISNULL(Status, N'Cho xac nhan') as status,
                ISNULL(PaymentStatus, N'Chua thanh toan') as payment_status,
                ISNULL(PaymentMethod, 'COD') as payment_method,
                PaymentDueAt as payment_due_at,
                PaymentConfirmedAt as payment_confirmed_at,
                DeliveredDate as delivered_date,
                ReceivedConfirmedDate as received_confirmed_date,
                RevenueEligibleDate as revenue_eligible_date,
                IsCountedAsRevenue as is_counted_as_revenue,
                AutoCancelDeadline as auto_cancel_deadline,
                ISNULL(TrackingNumber, '') as tracking_code,
                ISNULL(HandledBy, '') as handled_by,
                ISNULL(CustomerName, '') as customer_name,
                ISNULL(CustomerPhone, '') as customer_phone,
                ISNULL(ShippingAddress, '') as customer_address,
                ISNULL(ShippingAddress, '') as shipping_address,
                AddressID as address_id,
                CAST(CASE WHEN EXISTS (
                  SELECT 1 FROM OrderStatusHistory ach
                  WHERE ach.OrderID=Orders.OrderID AND LEFT(ISNULL(ach.Note, N''), 17)=N'[ADDRESS_CHANGED]'
                ) THEN 1 ELSE 0 END AS bit) as address_changed,
                ISNULL(ShippingFee, 0) as shippingFee,
                ISNULL(DiscountAmount, 0) as discount,
                ISNULL(OrderNote, '') as note,
                ISNULL(CancelReason, '') as cancel_reason
         FROM Orders WHERE UserID = @id ORDER BY OrderID DESC`,
      );

    let details = [];
    try {
      let rDetails = await pool
        .request()
        .input("id", sql.Int, req.params.id)
        .query(
          `SELECT od.OrderID, od.OrderDetailID as order_detail_id, od.ProductID as product_id, od.ProductVariantID as variant_id,
                  COALESCE(p.ProductName, od.ProductNameSnapshot, N'San pham') as name,
                  COALESCE(p.ImageURL, od.ImageURLSnapshot, '') as image,
                  od.Quantity as quantity, od.UnitPrice as price,
                  ISNULL(od.Size, '') as size, ISNULL(od.Color, N'') as color
           FROM OrderDetails od LEFT JOIN Products p ON od.ProductID = p.ProductID
           WHERE od.OrderID IN (SELECT OrderID FROM Orders WHERE UserID = @id)`,
        );
      details = rDetails.recordset;
    } catch (e) {
      console.log(e.message);
    }

    let orders = rOrders.recordset.map((o) => {
      o.products = details.filter((d) => d.OrderID === o.id);
      return o;
    });
    res.json(orders);
  } catch (e) {
    res.status(500).json([]);
  }
});

app.get("/api/customers/:id/notifications", async (req, res) => {
  try {
    await poolConnect;
    let rNotifs = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query(
        `SELECT NotificationID as id, Title as title, Message as message, Type as type, RelatedID as related_id, IsRead as is_read, CreatedAt as created_at
         FROM Notifications 
         WHERE UserID = @id 
         ORDER BY CreatedAt DESC`,
      );
    res.json(rNotifs.recordset);
  } catch (e) {
    res.status(500).json([]);
  }
});

app.get("/api/chart-data", async (req, res) => {
  try {
    await poolConnect;

    const year = req.query.year
      ? parseInt(req.query.year)
      : new Date().getFullYear();
    const month = req.query.month
      ? parseInt(req.query.month)
      : new Date().getMonth() + 1;

    let r = await pool
      .request()
      .input("y", sql.Int, year)
      .input("m", sql.Int, month).query(`
        SELECT DAY(OrderDate) as day, SUM(TotalAmount) as total
        FROM Orders
        WHERE ISNULL(Status, N'Cho xac nhan') = N'Da giao hang thanh cong'
          AND YEAR(OrderDate) = @y
          AND MONTH(OrderDate) = @m
        GROUP BY DAY(OrderDate)
        ORDER BY day
      `);
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json([]);
  }
});

// ============================================================
//  API BO SUNG (ShoeGroup - cap nhat nghiep vu khach hang)
// ============================================================
const crypto = require("crypto");

// Khoang cach uoc luong tu kho Hai Ba Trung, Ha Noi (km) theo tinh/thanh
const HANOI_DISTANCE = {
  "hai ba trung": 5,
  "ha noi": 8,
  hanoi: 8,
  "bac ninh": 35,
  "hung yen": 40,
  "hai duong": 60,
  "vinh phuc": 55,
  "thai nguyen": 80,
  "nam dinh": 90,
  "hai phong": 120,
  "quang ninh": 175,
  "thanh hoa": 160,
  "nghe an": 300,
  vinh: 300,
  "ha tinh": 340,
  hue: 660,
  "da nang": 770,
  "quang nam": 820,
  "quy nhon": 1060,
  "nha trang": 1280,
  "khanh hoa": 1280,
  "da lat": 1480,
  "lam dong": 1480,
  "vung tau": 1780,
  "binh duong": 1700,
  "dong nai": 1680,
  "ho chi minh": 1720,
  "tp hcm": 1720,
  tphcm: 1720,
  "sai gon": 1720,
  "can tho": 1880,
  // Các tỉnh còn lại (khoảng cách ước tính từ kho Hà Nội). Bảng này chỉ
  // dùng để báo giá sơ bộ khi chưa kết nối hãng vận chuyển thật; tên đã được
  // chuẩn hoá không dấu để khớp cả dữ liệu địa chỉ có dấu/không dấu.
  "cao bang": 280,
  "bac kan": 160,
  "lang son": 155,
  "tuyen quang": 150,
  "lao cai": 300,
  "yen bai": 180,
  "phu tho": 105,
  "hoa binh": 85,
  "lai chau": 500,
  "dien bien": 520,
  "son la": 320,
  "thai binh": 110,
  "ha nam": 70,
  "ninh binh": 100,
  "quang binh": 500,
  "quang tri": 590,
  "binh dinh": 1040,
  "phu yen": 1150,
  "binh thuan": 1550,
  "dak lak": 1400,
  "dak nong": 1500,
  "gia lai": 1250,
  "kon tum": 1100,
  "binh phuoc": 1650,
  "tay ninh": 1750,
  "long an": 1800,
  "tien giang": 1850,
  "ben tre": 1950,
  "tra vinh": 2000,
  "vinh long": 1950,
  "dong thap": 1930,
  "an giang": 2000,
  "kien giang": 2200,
  "bac lieu": 2200,
  "ca mau": 2300,
  "soc trang": 2150,
  "hau giang": 2100,
};

const SHIPPING_METHOD_FALLBACKS = [
  {
    ShippingMethodID: null,
    MethodCode: "STANDARD",
    MethodName: "Giao hàng tiêu chuẩn",
    BasePrice: 30000,
    PricePerKm: 0,
    OriginCity: "Hai Bà Trưng, Hà Nội",
    EstimatedTimeText: "2 - 3 ngày",
  },
];

function getStandardShippingFee(distanceKm) {
  const d = Number(distanceKm) || 0;
  if (d <= 20) return 30000;
  if (d <= 50) return 35000;
  if (d <= 120) return 40000;
  if (d <= 300) return 45000;
  if (d <= 600) return 55000;
  if (d <= 1000) return 65000;
  return 75000;
}

function getStandardEta(distanceKm) {
  const d = Number(distanceKm) || 0;
  if (d <= 30) return "1 ngày";
  if (d <= 100) return "1-2 ngày";
  if (d <= 300) return "2 ngày";
  if (d <= 600) return "2-3 ngày";
  if (d <= 1200) return "3-4 ngày";
  return "4-5 ngày";
}

const normalizeShippingText = (value) =>
  normalizeOrderStatus(value)
    .replace(/[.,;:/]+/g, " ")
    .replace(/[()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function estimateShippingDistance({ province = "", district = "", ward = "", address = "" } = {}) {
  const provinceKey = normalizeShippingText(province);
  const locationKey = normalizeShippingText([address, ward, district, province].filter(Boolean).join(" "));
  // Ưu tiên khớp tên tỉnh đầy đủ; tránh việc tên quận/phường có chữ "vinh"
  // làm nhầm khoảng cách của tỉnh khác.
  const rules = Object.entries(HANOI_DISTANCE).sort((a, b) => b[0].length - a[0].length);
  const matched = rules.find(([name]) =>
    provinceKey === name || provinceKey.includes(name) || (!provinceKey && locationKey.includes(name)),
  );
  const distanceKm = matched ? Number(matched[1]) : 150;
  return {
    distanceKm,
    matchedProvince: matched ? matched[0] : null,
    estimated: !matched,
  };
}

async function loadShippingMethod(methodCode, transaction = null) {
  const normalizedCode = String(methodCode || "STANDARD").trim().toUpperCase();
  const fallback = SHIPPING_METHOD_FALLBACKS.find((item) => item.MethodCode === normalizedCode)
    || SHIPPING_METHOD_FALLBACKS[0];
  try {
    const request = transaction ? new sql.Request(transaction) : pool.request();
    const result = await request
      .input("code", sql.VarChar(20), normalizedCode)
      .query(`
        SELECT TOP 1 ShippingMethodID, MethodCode, MethodName, BasePrice,
               PricePerKm, OriginCity, EstimatedTimeText
        FROM ShippingMethods
        WHERE UPPER(MethodCode)=@code AND ISNULL(IsActive,1)=1
        ORDER BY ShippingMethodID
      `);
    const row = result.recordset[0];
    if (row) return row;
  } catch (_) {
    // CSDL cũ có thể chưa có bảng/cột này; vẫn trả về bảng giá dự phòng.
  }
  return fallback;
}

async function calculateShippingQuote({ methodCode = "STANDARD", province = "", district = "", ward = "", address = "", transaction = null } = {}) {
  const method = await loadShippingMethod(methodCode, transaction);
  const code = String(method.MethodCode || methodCode || "STANDARD").trim().toUpperCase();
  const distance = estimateShippingDistance({ province, district, ward, address });
  const basePrice = Math.max(0, Number(method.BasePrice) || 0);
  const pricePerKm = Math.max(0, Number(method.PricePerKm) || 0);
  // Giao tiêu chuẩn: phí và ETA tính theo khoảng cách từ kho Hai Bà Trưng, Hà Nội
  let fee;
  let eta;
  if (code === "STANDARD") {
    fee = getStandardShippingFee(distance.distanceKm);
    eta = getStandardEta(distance.distanceKm);
  } else {
    throw new Error("Phương thức vận chuyển không hợp lệ.");
  }
  return {
    methodId: method.ShippingMethodID == null ? null : Number(method.ShippingMethodID),
    methodCode: code,
    methodName: method.MethodName || "Giao hàng tiêu chuẩn",
    basePrice,
    pricePerKm,
    distanceKm: distance.distanceKm,
    estimatedDistance: distance.estimated,
    matchedProvince: distance.matchedProvince,
    fee,
    eta,
    originCity: method.OriginCity || "Hai Bà Trưng, Hà Nội",
  };
}

// 1) Danh sach buu cuc (cho trang tra hang)
app.get("/api/postoffices", async (req, res) => {
  try {
    await poolConnect;
    const r = await pool.request().query(
      `SELECT PostOfficeID as id, Name as name, Address as address, ISNULL(Phone,'') as phone, ISNULL(Province,'') as province
       FROM PostOffices WHERE ISNULL(IsActive,1) = 1 ORDER BY PostOfficeID`,
    );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2) Danh sách phương thức vận chuyển đang bật. Frontend dùng endpoint này
// thay vì phải hard-code bảng giá trong bundle.
app.get("/api/shippingmethods", async (_req, res) => {
  try {
    await poolConnect;
    let rows = [];
    try {
      const result = await pool.request().query(`
        SELECT ShippingMethodID, MethodCode, MethodName, BasePrice, PricePerKm,
               OriginCity, EstimatedTimeText
        FROM ShippingMethods
        WHERE ISNULL(IsActive,1)=1 AND UPPER(MethodCode)='STANDARD'
        ORDER BY ShippingMethodID
      `);
      rows = result.recordset || [];
      rows = rows.filter((r) => String(r.MethodCode || "").trim().toUpperCase() === "STANDARD");
    } catch (_) {
      rows = [];
    }
    if (!rows.length) rows = SHIPPING_METHOD_FALLBACKS;
    res.json(rows.map((row) => ({
      id: row.ShippingMethodID == null ? null : Number(row.ShippingMethodID),
      code: String(row.MethodCode || "STANDARD").trim().toUpperCase(),
      name: row.MethodName || "Giao hàng tiêu chuẩn",
      basePrice: Number(row.BasePrice) || 0,
      pricePerKm: Number(row.PricePerKm) || 0,
      originCity: row.OriginCity || "Hai Bà Trưng, Hà Nội",
      eta: row.EstimatedTimeText || "2 - 3 ngày",
      desc: "Tính theo khoảng cách từ kho Hai Bà Trưng, Hà Nội.",
    })));
  } catch (e) {
    // Endpoint đọc giá vẫn hữu ích khi DB tạm thời lỗi (ví dụ lúc dev chưa
    // chạy SQL), nên trả bảng dự phòng thay vì làm checkout trắng trang.
    res.json(SHIPPING_METHOD_FALLBACKS.map((row) => ({
      id: null,
      code: row.MethodCode,
      name: row.MethodName,
      basePrice: Number(row.BasePrice) || 0,
      pricePerKm: Number(row.PricePerKm) || 0,
      originCity: row.OriginCity,
      eta: row.EstimatedTimeText,
      desc: "Tính theo khoảng cách từ kho Hai Bà Trưng, Hà Nội.",
    })));
  }
});

// 3) Tính phí giao hàng theo địa điểm + phương thức. Payload nhận cả tên
// tỉnh/quận/phường và địa chỉ chi tiết để dùng được với sổ địa chỉ hiện tại.
app.post("/api/shipping/quote", async (req, res) => {
  try {
    // Không cần chặn báo giá nếu DB đang khởi động; calculateShippingQuote sẽ
    // tự dùng bảng giá dự phòng khi chưa truy cập được ShippingMethods.
    try { await poolConnect; } catch (_) {}
    const body = req.body || {};
    const methodCode = String(body.methodCode ?? body.method_code ?? "STANDARD").trim().toUpperCase();
    if (methodCode !== "STANDARD") {
      return res.status(400).json({ success: false, message: "Phương thức vận chuyển không hợp lệ." });
    }
    const quote = await calculateShippingQuote({
      methodCode,
      province: body.province ?? body.provinceName ?? body.city ?? "",
      district: body.district ?? "",
      ward: body.ward ?? body.commune ?? body.communeName ?? "",
      address: body.address ?? body.addressLine ?? body.shippingAddress ?? "",
    });
    res.json({ success: true, ...quote });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 3) Khach xac nhan "Da nhan hang" (giong Shopee) - giu 14 ngay truoc khi tinh doanh thu
app.put("/api/orders/:id/receive", async (req, res) => {
  const authenticatedUserId = Number(req.auth && req.auth.sub);
  const orderId = Number(req.params.id);
  if (!authenticatedUserId) {
    return res.status(401).json({ success: false, message: "Ban chua dang nhap." });
  }
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ success: false, message: "Don hang khong hop le." });
  }

  await poolConnect;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const currentResult = await new sql.Request(transaction)
      .input("id", sql.Int, orderId)
      .query(`
        SELECT OrderID, UserID, Status, PaymentMethod, PaymentStatus
        FROM Orders WITH (UPDLOCK, HOLDLOCK)
        WHERE OrderID=@id
      `);
    const currentOrder = currentResult.recordset[0];
    if (!currentOrder) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Khong tim thay don hang." });
    }
    if (req.auth.role !== "Admin" && Number(currentOrder.UserID) !== authenticatedUserId) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: "Ban khong duoc cap nhat don hang nay." });
    }
    if (!["da giao", "da giao hang thanh cong", "delivered"].includes(normalizeOrderStatus(currentOrder.Status))) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: "Don hang chua o trang thai da giao." });
    }

    await new sql.Request(transaction)
      .input("id", sql.Int, orderId)
      .input("hold", sql.Int, 14).query(`
        UPDATE Orders
        SET Status = N'Đã nhận hàng',
            ReceivedConfirmedDate = GETDATE(),
            RevenueEligibleDate = DATEADD(day, @hold, GETDATE()),
            IsCountedAsRevenue = 0,
            PaymentStatus = CASE WHEN PaymentMethod LIKE '%COD%' OR PaymentMethod LIKE N'%nhận hàng%' OR PaymentMethod LIKE N'%Tiền mặt%' THEN N'Đã thanh toán' ELSE PaymentStatus END,
            PaymentConfirmedAt = CASE WHEN PaymentMethod LIKE '%COD%' OR PaymentMethod LIKE N'%nhận hàng%' OR PaymentMethod LIKE N'%Tiền mặt%' THEN ISNULL(PaymentConfirmedAt,GETDATE()) ELSE PaymentConfirmedAt END,
            UpdatedAt=GETDATE()
        WHERE OrderID = @id
      `);
    await insertOrderHistory(transaction, orderId, currentOrder.Status, "Đã nhận hàng", "Khách xác nhận đã nhận hàng", authenticatedUserId);
    await transaction.commit();
    res.json({ success: true });
  } catch (e) {
    if (transaction._aborted !== true) {
      try { await transaction.rollback(); } catch (_) {}
    }
    res.status(500).json({ error: e.message });
  }
});

// 4) Job: tu dong huy don qua han nhan hang + tinh doanh thu sau 14 ngay
async function runAutoCancelJob() {
  try {
    await poolConnect;
    
    // Tìm các đơn sẽ bị hủy
    const expiredOrders = await pool.request().query(`
      SELECT OrderID, Status, PaymentDueAt, PaymentMethod, PaymentStatus, TotalAmount
      FROM Orders
      WHERE Status IN (N'Chờ xác nhận', N'Đã xác nhận', N'Cho xac nhan', N'Da xac nhan')
        AND (
          (AutoCancelDeadline IS NOT NULL AND AutoCancelDeadline < GETDATE())
          OR (
            PaymentDueAt IS NOT NULL AND PaymentDueAt < GETDATE()
            AND (PaymentMethod LIKE N'%chuyển khoản%' OR PaymentMethod LIKE N'%bank%' OR PaymentMethod LIKE N'%momo%' OR PaymentMethod LIKE N'%vnpay%')
            AND ISNULL(PaymentStatus,N'Chưa thanh toán') NOT IN (
              N'Đã thanh toán',N'Da thanh toan',N'Chờ thanh toán',N'Cho thanh toan',
              N'Hoàn tiền',N'Hoan tien',N'Đã hủy',N'Da huy'
            )
          )
        )
    `);
    
    // Moi don duoc khoa, hoan kho va doi trang thai trong cung mot transaction.
    for (const row of expiredOrders.recordset) {
      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
        const claimed = await new sql.Request(transaction)
          .input("id", sql.Int, row.OrderID)
          .query(`
            SELECT OrderID, Status, PaymentDueAt, PaymentMethod, PaymentStatus, TotalAmount
            FROM Orders WITH (UPDLOCK, HOLDLOCK)
            WHERE OrderID=@id
              AND Status IN (N'Chờ xác nhận', N'Đã xác nhận', N'Cho xac nhan', N'Da xac nhan')
              AND (
                (AutoCancelDeadline IS NOT NULL AND AutoCancelDeadline<GETDATE())
                OR (
                  PaymentDueAt IS NOT NULL AND PaymentDueAt<GETDATE()
                  AND (PaymentMethod LIKE N'%chuyển khoản%' OR PaymentMethod LIKE N'%bank%' OR PaymentMethod LIKE N'%momo%' OR PaymentMethod LIKE N'%vnpay%')
                  AND ISNULL(PaymentStatus,N'Chưa thanh toán') NOT IN (
                    N'Đã thanh toán',N'Da thanh toan',N'Chờ thanh toán',N'Cho thanh toan',
                    N'Hoàn tiền',N'Hoan tien',N'Đã hủy',N'Da huy'
                  )
                )
              )
          `);
        if (!claimed.recordset.length) {
          await transaction.commit();
          continue;
        }

        await restoreOrderStock(transaction, row.OrderID);
        const claimedOrder = claimed.recordset[0];
        const paymentExpired = claimedOrder.PaymentDueAt && new Date(claimedOrder.PaymentDueAt).getTime() < Date.now()
          && isBankPayment(claimedOrder.PaymentMethod)
          && !["da thanh toan", "cho thanh toan", "hoan tien", "da huy"].includes(normalizeOrderStatus(claimedOrder.PaymentStatus));
        const cancelReason = paymentExpired
          ? "Đơn chuyển khoản đã quá hạn thanh toán 24 giờ nên được tự động hủy."
          : "Shop chưa chuẩn bị hàng cho khách. Xin lỗi quý khách, vui lòng đặt lại đơn hàng.";
        await new sql.Request(transaction)
          .input("id", sql.Int, row.OrderID)
          .input(
            "reason",
            sql.NVarChar,
            cancelReason,
          )
          .query(`
            UPDATE Orders
            SET Status=N'Đã hủy', CancelReason=@reason,
                PaymentStatus=CASE
                  WHEN ISNULL(PaymentStatus,N'Chưa thanh toán') IN (N'Đã thanh toán',N'Da thanh toan',N'Chờ thanh toán',N'Cho thanh toan') THEN N'Hoàn tiền'
                  ELSE N'Đã hủy'
                END,
                AutoCancelDeadline=NULL, UpdatedAt=GETDATE()
            WHERE OrderID=@id
          `);
        if (isPaidPaymentStatus(claimedOrder.PaymentStatus)) {
          await recordRefundTransaction(transaction, claimedOrder.OrderID, claimedOrder.TotalAmount);
        }
        await insertOrderHistory(transaction, row.OrderID, claimedOrder.Status, "Đã hủy", cancelReason, null);
        await transaction.commit();
      } catch (orderError) {
        if (transaction._aborted !== true) {
          try { await transaction.rollback(); } catch (_) {}
        }
        console.log(`AutoCancel order ${row.OrderID}:`, orderError.message);
      }
    }

    await pool.request().query(`
      UPDATE Orders SET IsCountedAsRevenue = 1
      WHERE RevenueEligibleDate IS NOT NULL AND RevenueEligibleDate <= GETDATE()
        AND Status IN (N'Đã nhận hàng', N'Da nhan hang') AND ISNULL(IsCountedAsRevenue, 0) = 0
    `);
  } catch (e) {
    console.log("AutoCancel job:", e.message);
  }
}
setInterval(runAutoCancelJob, 60 * 60 * 1000);
setTimeout(runAutoCancelJob, 5000);

// 5) Quen mat khau - tao token, gui email (xem huong dan trong tai lieu)
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    await poolConnect;
    const email = (req.body && req.body.email) || "";
    const r = await pool
      .request()
      .input("e", sql.VarChar, email)
      .query("SELECT UserID FROM Users WHERE Email=@e AND IsActive=1");
    if (r.recordset.length === 0) return res.json({ success: true }); // khong lo email ton tai
    const token = crypto.randomBytes(32).toString("hex");
    await pool
      .request()
      .input("e", sql.VarChar, email)
      .input("t", sql.VarChar, token).query(`
        UPDATE Users
        SET PasswordResetToken = @t, PasswordResetTokenExpiry = DATEADD(hour, 1, GETDATE())
        WHERE Email = @e
      `);
    const resetLink = FRONTEND_URL + "/reset-password?token=" + token;
    console.log(
      "[ForgotPassword] Link doi mat khau cho",
      email,
      ":",
      resetLink,
    );
    // Gui email that bang nodemailer (co nut dan toi trang doi mat khau)
    try {
      await mailTransporter.sendMail({
        from: '"ShoeGroup" <' + EMAIL_USER + ">",
        to: email,
        subject: "Đặt lại mật khẩu ShoeGroup",
        text:
          "Ban vua yeu cau dat lai mat khau ShoeGroup. Mo lien ket sau (hieu luc 1 gio): " +
          resetLink,
        replyTo: EMAIL_USER,
        headers: {
          "X-Entity-Ref-ID": token,
          "List-Unsubscribe": "<mailto:" + EMAIL_USER + "?subject=unsubscribe>",
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        html: `
          <div style="max-width:480px;margin:0 auto;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
            <div style="background:linear-gradient(135deg,#2563eb,#1e40af);padding:24px;border-radius:16px 16px 0 0;text-align:center;">
              <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:.3px;">⚡ ShoeGroup</span>
            </div>
            <div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 16px 16px;padding:28px 26px;">
              <h2 style="margin:0 0 10px;font-size:20px;">Đặt lại mật khẩu</h2>
              <p style="color:#475569;line-height:1.6;margin:0 0 8px;">Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản ShoeGroup. Nhấn nút bên dưới để tạo mật khẩu mới. Liên kết có hiệu lực trong <b>1 giờ</b>.</p>
              <div style="text-align:center;margin:26px 0;">
                <a href="${resetLink}" style="background:linear-gradient(135deg,#2563eb,#1e40af);color:#fff;text-decoration:none;font-weight:700;padding:14px 32px;border-radius:12px;display:inline-block;">Đổi mật khẩu ngay</a>
              </div>
              <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:18px 0 0;">Nếu nút không hoạt động, sao chép liên kết sau vào trình duyệt:<br><span style="color:#2563eb;word-break:break-all;">${resetLink}</span></p>
              <p style="color:#94a3b8;font-size:13px;margin:14px 0 0;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
            </div>
          </div>`,
      });
    } catch (mailErr) {
      console.error("Loi gui email:", mailErr.message);
      return res.status(500).json({
        success: false,
        message:
          "Khong gui duoc email. Kiem tra lai EMAIL_USER / EMAIL_PASS trong server.js.",
      });
    }
    res.json({
      success: true,
      message: "Da gui email dat lai mat khau. Vui long kiem tra hop thu.",
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 6) Dat lai mat khau bang token
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    await poolConnect;
    const token = (req.body && req.body.token) || "";
    const newPassword = (req.body && req.body.newPassword) || "";
    const r = await pool
      .request()
      .input("t", sql.VarChar, token)
      .query(
        "SELECT UserID FROM Users WHERE PasswordResetToken=@t AND PasswordResetTokenExpiry > GETDATE()",
      );
    if (r.recordset.length === 0)
      return res.status(400).json({
        success: false,
        message: "Token khong hop le hoac da het han.",
      });
    const strength = passwordHelper.checkStrength(newPassword);
    if (!strength.ok)
      return res
        .status(400)
        .json({ success: false, message: strength.message });
    // [TOI UU][BAO MAT] luu mat khau DA BAM, khong luu van ban tho
    const hashedNewPassword = await passwordHelper.hash(newPassword);
    await pool
      .request()
      .input("t", sql.VarChar, token)
      .input("p", sql.VarChar, hashedNewPassword).query(`
        UPDATE Users
        SET PasswordHash = @p, PasswordResetToken = NULL,
            PasswordResetTokenExpiry = NULL, LastPasswordChangedAt = GETDATE()
        WHERE PasswordResetToken = @t
      `);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/* ===== [TOI UU] Cac API moi (phan trang, dashboard, health) - route cu giu nguyen ===== */
app.use(createOptimizedRoutes({ pool, poolConnect, sql }));

/* ===== [TOI UU] 404 + xu ly loi tap trung (khong lo thong tin he thong) ===== */
app.use(notFoundHandler);
app.use(errorHandler);

process.on("unhandledRejection", (err) =>
  console.error("[unhandledRejection]", err && err.message),
);

const server = app.listen(PORT, () => {
  console.log(`Server dang chay tai http://localhost:${PORT}`);
  console.log(`   - Che do phan quyen : ${config.authMode.toUpperCase()}`);
  console.log(`   - CORS cho phep     : ${config.corsOrigins.join(", ")}`);
  console.log(`   - Kiem tra suc khoe : http://localhost:${PORT}/api/health`);
});

/* Tat may chu "muot" khi nhan Ctrl+C / khi deploy lai */
const shutdown = (signal) => {
  console.log(`\n[${signal}] Dang dong may chu...`);
  server.close(() => {
    pool.close().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 8000).unref();
};
["SIGINT", "SIGTERM"].forEach((s) => process.on(s, () => shutdown(s)));
