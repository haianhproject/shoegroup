const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const app = express();
const PORT = 5000;

// ================= CAU HINH BAO MAT & EMAIL =================
// QUAN TRONG: Khi trien khai that, hay doi JWT_SECRET va dung bien moi truong (process.env)
// thay vi de thang trong code.
const JWT_SECRET =
  process.env.JWT_SECRET || "shoegroup_super_secret_key_doi_lai_khi_deploy";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
// Dung de gui email quen mat khau. Voi Gmail, KHONG dung mat khau Gmail thuong,
// ma phai tao "App Password" tai: https://myaccount.google.com/apppasswords
const EMAIL_USER = process.env.EMAIL_USER || "vietdth005598@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS || "rttdadqhmbxddlmf";
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});

// Doc cookie tu header ma khong can them thu vien cookie-parser
function parseCookies(req) {
  const header = req.headers.cookie;
  const list = {};
  if (!header) return list;
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx < 0) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      list[key] = decodeURIComponent(val);
    } catch {
      list[key] = val;
    }
  });
  return list;
}

// CORS phai cho phep dung 1 origin cu the (khong duoc dung "*") va bat credentials
// thi trinh duyet moi gui/nhan duoc cookie httpOnly giua frontend (5173) va backend (5000).
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const dbConfig = {
  user: "sa",
  password: "123456", // Doi thanh mat khau SQL cua ban neu can
  server: "localhost",
  database: "ShoegroupDB",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const pool = new sql.ConnectionPool(dbConfig);
const poolConnect = pool.connect();

poolConnect
  .then(() => {
    console.log("OK Da ket noi thanh cong voi CSDL SQL Server (ShoegroupDB)!");
  })
  .catch((err) => console.error("Loi ket noi DB:", err));

// ================= API XAC THUC =================
app.post("/api/login", async (req, res) => {
  try {
    await poolConnect;
    const { email, password, remember } = req.body;
    let r = await pool
      .request()
      .input("e", sql.VarChar, email)
      .input("p", sql.VarChar, password)
      .query(
        "SELECT UserID as id_user, Email as email, FullName as full_name, Phone as phone, Address as address, RoleID as role_id FROM Users WHERE Email=@e AND PasswordHash=@p AND IsActive=1",
      );

    if (r.recordset.length > 0) {
      const user = r.recordset[0];
      user.role = Number(user.role_id) === 1 ? "Admin" : "Customer";

      // Tao phien dang nhap that su tren server (JWT ky bang JWT_SECRET) va luu
      // vao cookie httpOnly. Cookie nay JS phia trinh duyet KHONG doc/sua duoc,
      // nen khong the gia mao tai khoan bang cach sua cookie nhu truoc.
      // - remember = true  -> cookie song 30 ngay (con luu ngay ca khi tat trinh duyet)
      // - remember = false -> cookie la "session cookie", tu mat khi dong het trinh duyet
      const token = jwt.sign(
        { id_user: user.id_user, email: user.email, role_id: user.role_id },
        JWT_SECRET,
        { expiresIn: remember ? "30d" : "1d" },
      );

      res.cookie("access_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false, // Doi thanh true khi deploy that voi HTTPS
        ...(remember ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
      });

      res.json({ success: true, user });
    } else {
      res
        .status(401)
        .json({ success: false, message: "Sai email hoac mat khau" });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    await poolConnect;
    const { fullName, email, password } = req.body;
    let check = await pool
      .request()
      .input("e", sql.VarChar, email)
      .query("SELECT UserID FROM Users WHERE Email=@e");
    if (check.recordset.length > 0)
      return res
        .status(400)
        .json({ success: false, message: "Email nay da duoc su dung." });

    let r = await pool
      .request()
      .input("f", sql.NVarChar, fullName)
      .input("e", sql.VarChar, email)
      .input("p", sql.VarChar, password)
      .query(
        "INSERT INTO Users (RoleID, FullName, Email, PasswordHash, IsActive) OUTPUT INSERTED.UserID as id_user, INSERTED.Email as email, INSERTED.FullName as full_name, INSERTED.Phone as phone, INSERTED.Address as address, INSERTED.RoleID as role_id VALUES (2, @f, @e, @p, 1)",
      );

    const user = { ...r.recordset[0], role: "Customer" };

    const token = jwt.sign(
      { id_user: user.id_user, email: user.email, role_id: user.role_id },
      JWT_SECRET,
      { expiresIn: "1d" },
    );
    res.cookie("access_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });

    res.json({
      success: true,
      message: "Dang ky thanh cong",
      user,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// KIEM TRA PHIEN DANG NHAP (dua tren cookie httpOnly access_token, KHONG doc tu
// localStorage/cookie thuong). Trinh duyet/thiet bi khac se khong co cookie nay
// nen se luon tra ve 401 -> frontend tu dong dang xuat, dung yeu cau de bai.
app.get("/api/session", async (req, res) => {
  try {
    const cookies = parseCookies(req);
    const token = cookies["access_token"];
    if (!token) return res.status(401).json({ success: false });

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false });
    }

    await poolConnect;
    const r = await pool
      .request()
      .input("id", sql.Int, payload.id_user)
      .query(
        "SELECT UserID as id_user, Email as email, FullName as full_name, Phone as phone, Address as address, RoleID as role_id FROM Users WHERE UserID=@id AND IsActive=1",
      );

    if (r.recordset.length === 0) return res.status(401).json({ success: false });

    const user = r.recordset[0];
    user.role = Number(user.role_id) === 1 ? "Admin" : "Customer";
    res.json({ success: true, user });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("access_token", { httpOnly: true, sameSite: "lax" });
  res.json({ success: true });
});

// QUEN MAT KHAU: gui email chua link dat lai mat khau (co hieu luc 1 gio)
app.post("/api/forgot-password", async (req, res) => {
  try {
    await poolConnect;
    const { email } = req.body || {};
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Vui long nhap email." });
    }

    const check = await pool
      .request()
      .input("e", sql.VarChar, email)
      .query("SELECT UserID, FullName FROM Users WHERE Email=@e AND IsActive=1");

    if (check.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Email khong ton tai trong he thong." });
    }

    const user = check.recordset[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 gio

    await pool
      .request()
      .input("t", sql.VarChar, token)
      .input("exp", sql.DateTime, expiry)
      .input("id", sql.Int, user.UserID)
      .query("UPDATE Users SET PasswordResetToken=@t, PasswordResetTokenExpiry=@exp WHERE UserID=@id");

    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

    try {
      await transporter.sendMail({
        from: `"Shoegroup" <${EMAIL_USER}>`,
        to: email,
        subject: "Dat lai mat khau - Shoegroup",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;line-height:1.6;">
            <h2>Xin chao ${user.FullName || ""},</h2>
            <p>Ban vua yeu cau dat lai mat khau cho tai khoan Shoegroup cua minh.</p>
            <p>Nhan vao nut ben duoi de dat lai mat khau (lien ket co hieu luc trong 1 gio):</p>
            <p>
              <a href="${resetLink}"
                 style="background:#000;color:#fff;padding:12px 24px;border-radius:8px;
                        text-decoration:none;display:inline-block;">
                Dat lai mat khau
              </a>
            </p>
            <p>Neu ban khong yeu cau, hay bo qua email nay.</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.error("Loi gui email:", mailErr.message);
      return res.status(500).json({
        success: false,
        message:
          "Khong gui duoc email. Kiem tra lai cau hinh EMAIL_USER/EMAIL_PASS trong server.js.",
      });
    }

    res.json({
      success: true,
      message: "Link dat lai mat khau da duoc gui den email cua ban.",
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DAT LAI MAT KHAU bang token nhan tu email
app.post("/api/reset-password", async (req, res) => {
  try {
    await poolConnect;
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: "Thieu du lieu." });
    }

    const check = await pool
      .request()
      .input("t", sql.VarChar, token)
      .query("SELECT UserID, PasswordResetTokenExpiry FROM Users WHERE PasswordResetToken=@t");

    if (check.recordset.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Token khong hop le hoac da het han." });
    }

    const row = check.recordset[0];
    if (!row.PasswordResetTokenExpiry || new Date(row.PasswordResetTokenExpiry) < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "Token da het han. Vui long yeu cau lai." });
    }

    await pool
      .request()
      .input("p", sql.VarChar, newPassword)
      .input("id", sql.Int, row.UserID)
      .query(
        "UPDATE Users SET PasswordHash=@p, PasswordResetToken=NULL, PasswordResetTokenExpiry=NULL WHERE UserID=@id",
      );

    res.json({ success: true, message: "Dat lai mat khau thanh cong." });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DOI MAT KHAU khi dang dang nhap (can nhap dung email + mat khau cu)
app.post("/api/change-password", async (req, res) => {
  try {
    await poolConnect;
    const { email, oldPassword, newPassword } = req.body || {};
    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Thieu du lieu." });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ success: false, message: "Mat khau moi phai co it nhat 6 ky tu." });
    }

    const check = await pool
      .request()
      .input("e", sql.VarChar, email)
      .input("p", sql.VarChar, oldPassword)
      .query("SELECT UserID FROM Users WHERE Email=@e AND PasswordHash=@p AND IsActive=1");

    if (check.recordset.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Mat khau cu khong dung." });
    }

    await pool
      .request()
      .input("p", sql.VarChar, newPassword)
      .input("id", sql.Int, check.recordset[0].UserID)
      .query("UPDATE Users SET PasswordHash=@p WHERE UserID=@id");

    res.json({ success: true, message: "Doi mat khau thanh cong." });
  } catch (e) {
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

    const userId = b.userId ?? b.user_id ?? null;
    const totalAmount = b.totalAmount ?? b.total ?? 0;
    const shippingAddress = b.shippingAddress ?? b.customer_address ?? "";
    const customerName = b.customerName ?? b.customer_name ?? "Khach le";
    const customerPhone = b.customerPhone ?? b.customer_phone ?? "";
    const shippingFee = b.shippingFee ?? b.shipping_fee ?? 0;
    const discountAmount = b.discountAmount ?? b.discount_amount ?? 0;
    const paymentMethod = b.paymentMethod ?? b.payment_method ?? "COD";
    const paymentStatus =
      b.paymentStatus ?? b.payment_status ?? "Chua thanh toan";
    const status = b.status ?? "Cho xac nhan";
    const handledBy = b.handledBy ?? b.handled_by ?? null;
    const note = b.note ?? b.order_note ?? "";
    const couponCode = b.couponCode ?? b.coupon_code ?? null;
    const items = b.items ?? b.products ?? [];

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = new sql.Request(transaction);

      // B1: Luu vao bang Orders (co PaymentStatus + HandledBy de phan biet Online/Offline)
      let orderResult = await request
        .input("uid", sql.Int, userId)
        .input("tot", sql.Decimal(18, 2), totalAmount)
        .input("cname", sql.NVarChar, customerName)
        .input("cphone", sql.VarChar, customerPhone)
        .input("addr", sql.NVarChar, shippingAddress)
        .input("pay", sql.NVarChar, paymentMethod)
        .input("pstat", sql.NVarChar, paymentStatus)
        .input("stt", sql.NVarChar, status)
        .input("hb", sql.NVarChar, handledBy)
        .input("sfee", sql.Decimal(18, 2), shippingFee)
        .input("disc", sql.Decimal(18, 2), discountAmount)
        .input("note", sql.NVarChar, note).query(`
          INSERT INTO Orders (UserID, TotalAmount, OrderDate, Status, ShippingAddress, CustomerName, CustomerPhone, PaymentMethod, PaymentStatus, HandledBy, ShippingFee, DiscountAmount, OrderNote)
          OUTPUT INSERTED.OrderID
          VALUES (@uid, @tot, GETDATE(), @stt, @addr, @cname, @cphone, @pay, @pstat, @hb, @sfee, @disc, @note)
        `);

      const orderId = orderResult.recordset[0].OrderID;

      // B2: Luu tung san pham vao bang OrderDetails (ho tro ca ProductID lan bien the)
      for (let item of items) {
        const productId = item.productId ?? item.product_id ?? null;
        const variantId =
          item.productVariantId ??
          item.product_variant_id ??
          item.variant_id ??
          null;
        const detailReq = new sql.Request(transaction);
        await detailReq
          .input("oid", sql.Int, orderId)
          .input("pid", sql.Int, productId)
          .input("vid", sql.Int, variantId)
          .input("qty", sql.Int, item.quantity ?? 1)
          .input("price", sql.Decimal(18, 2), item.price ?? 0)
          .input("sz", sql.NVarChar, item.size ?? "")
          .input("clr", sql.NVarChar, item.color ?? "")
          .input("nm", sql.NVarChar, item.name ?? "").query(`
            INSERT INTO OrderDetails (OrderID, ProductID, ProductVariantID, Quantity, UnitPrice, Size, Color, ProductNameSnapshot)
            VALUES (@oid, @pid, @vid, @qty, @price, @sz, @clr, @nm)
          `);
      }

      // B3: Cap nhat luot dung Ma giam gia (neu co)
      if (couponCode) {
        const couponReq = new sql.Request(transaction);
        await couponReq
          .input("code", sql.VarChar, couponCode)
          .query(
            "UPDATE Coupons SET UsedCount = ISNULL(UsedCount, 0) + 1 WHERE CouponCode = @code",
          );
      }

      await transaction.commit();
      res.json({ success: true, orderId, OrderID: orderId });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (e) {
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
             o.TotalAmount as total, o.ShippingFee as shippingFee, o.DiscountAmount as discount,
             o.PaymentMethod as paymentMethod,
             ISNULL(o.PaymentStatus, N'Chua thanh toan') as payment_status,
             ISNULL(o.HandledBy, '') as handled_by,
             ISNULL(o.TrackingNumber, '') as tracking_code,
             o.OrderNote as note,
             CONVERT(varchar, o.OrderDate, 103) + ' ' + CONVERT(varchar, o.OrderDate, 108) as date,
             ISNULL(o.Status, N'Cho xac nhan') as status, ISNULL(o.CancelReason, '') as cancel_reason
      FROM Orders o LEFT JOIN Users u ON o.UserID = u.UserID ORDER BY o.OrderID DESC
    `);

    let details = [];
    try {
      let rDetails = await pool.request().query(`
          SELECT od.OrderID,
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

// Cap nhat trang thai don hang (Admin)
app.put("/api/orders/:id/status", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("s", sql.NVarChar, req.body.status)
      .input("r", sql.NVarChar, req.body.reason || "")
      .query(
        `UPDATE Orders SET Status = @s, CancelReason = CASE WHEN @s = N'Da huy' THEN @r ELSE CancelReason END WHERE OrderID = @id`,
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
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
              p.SoleID as sole_id, p.CushioningID as cushioning_id,
              p.ImageURL as image_url, p.IsActive as active,
              p.Description as description, p.ImageGallery as image_gallery,
              p.ParentSKU as parent_sku, p.IsFeatured as is_featured
       FROM Products p
       LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
       LEFT JOIN Brands b ON p.BrandID = b.BrandID
       ORDER BY p.ProductID DESC`,
    );
    const products = r.recordset;
    const vr = await pool.request().query(
      `SELECT ProductVariantID as id, ProductID as product_id, Size as size,
              ColorName as color, ColorHex as hex, ChildSKU as sku, StockQuantity as stock
       FROM ProductVariants ORDER BY ProductVariantID`,
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
  for (let v of variants) {
    const sku = v.sku ?? v.ChildSKU ?? null;
    const color = v.color ?? v.ColorName ?? "";
    const hex = v.hex ?? v.color_hex ?? v.ColorHex ?? "";
    const size = v.size ?? v.Size ?? "";
    let stock = Number(v.stock ?? v.StockQuantity ?? 0);
    if (isNaN(stock) || stock < 0) stock = 0;
    let found = { recordset: [] };
    if (sku) {
      found = await pool
        .request()
        .input("pid", sql.Int, productId)
        .input("sku", sql.VarChar, sku)
        .query(
          "SELECT ProductVariantID FROM ProductVariants WHERE ProductID=@pid AND ChildSKU=@sku",
        );
    }
    if (found.recordset.length > 0) {
      await pool
        .request()
        .input("id", sql.Int, found.recordset[0].ProductVariantID)
        .input("st", sql.Int, stock)
        .input("cn", sql.NVarChar, color)
        .input("ch", sql.VarChar, hex)
        .input("sz", sql.NVarChar, size)
        .query(
          "UPDATE ProductVariants SET StockQuantity=@st, ColorName=@cn, ColorHex=@ch, Size=@sz WHERE ProductVariantID=@id",
        );
    } else {
      await pool
        .request()
        .input("pid", sql.Int, productId)
        .input("sz", sql.NVarChar, size)
        .input("cn", sql.NVarChar, color)
        .input("ch", sql.VarChar, hex)
        .input("sku", sql.VarChar, sku)
        .input("st", sql.Int, stock)
        .query(
          "INSERT INTO ProductVariants (ProductID, Size, ColorName, ColorHex, ChildSKU, StockQuantity, PriceAdjustment, IsActive) VALUES (@pid, @sz, @cn, @ch, @sku, @st, 0, 1)",
        );
    }
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
  return request
    .input("n", sql.NVarChar, b.name)
    .input("p", sql.Decimal(18, 0), b.price || 0)
    .input("sp", sql.Decimal(18, 0), b.sale_price || 0)
    .input("c", sql.Int, b.category_id || null)
    .input("br", sql.Int, b.brand_id || null)
    .input("col", sql.Int, b.collection_id || null)
    .input("mid", sql.Int, b.material_id || null)
    .input("sole", sql.Int, b.sole_id || null)
    .input("cush", sql.Int, b.cushioning_id || null)
    .input("img", sql.VarChar(sql.MAX), b.image_url || "")
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
      INSERT INTO Products (ProductName, BasePrice, SalePrice, CategoryID, BrandID, CollectionID, MaterialID, SoleID, CushioningID, ImageURL, Description, ParentSKU, IsFeatured, IsActive)
      OUTPUT INSERTED.ProductID
      VALUES (@n, @p, @sp, @c, @br, @col, @mid, @sole, @cush, @img, @desc, @psku, @feat, @a)
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
        MaterialID=@mid, SoleID=@sole, CushioningID=@cush, ImageURL=@img, Description=@desc,
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
  // ?soft=1 => XOA MEM (chi an san pham). Mac dinh => XOA CUNG (xoa han khoi CSDL).
  const soft = req.query.soft === "1" || req.query.soft === "true";
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
    await pool
      .request()
      .input("e", sql.VarChar, req.body.username)
      .input("p", sql.VarChar, req.body.password)
      .input("n", sql.NVarChar, req.body.name)
      .input("r", sql.Int, parseInt(req.body.role_id) || 1)
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
    // Chi cap nhat nhung truong duoc gui len -> tranh ghi de/xoa nham
    // (vi du doi vai tro thi khong lam mat Phone/Address/Email cu).
    let rq = pool.request().input("id", sql.Int, req.params.id);
    const sets = [];
    if (b.username !== undefined) {
      rq = rq.input("e", sql.VarChar, b.username);
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
      rq = rq.input("pw", sql.VarChar, String(b.password));
      sets.push("PasswordHash=@pw");
    }
    if (sets.length === 0) return res.json({ success: true });
    await rq.query("UPDATE Users SET " + sets.join(", ") + " WHERE UserID=@id");
    res.json({ success: true });
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
      .query("DELETE FROM Users WHERE UserID=@id");
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

// ================= API DE GIAY (Soles) =================
app.get("/api/soles", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool
      .request()
      .query(
        "SELECT SoleID as id, SoleName as name, IsActive as active FROM Soles ORDER BY SoleID",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/soles", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("n", sql.NVarChar, req.body.name)
      .input("a", sql.Bit, req.body.active !== false)
      .query("INSERT INTO Soles (SoleName, IsActive) VALUES (@n, @a)");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/api/soles/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("n", sql.NVarChar, req.body.name)
      .input("a", sql.Bit, req.body.active !== false)
      .query("UPDATE Soles SET SoleName=@n, IsActive=@a WHERE SoleID=@id");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/api/soles/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("UPDATE Soles SET IsActive = 0 WHERE SoleID=@id");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= API DEM GIAY (Cushionings) =================
app.get("/api/cushionings", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool
      .request()
      .query(
        "SELECT CushioningID as id, CushioningName as name, IsActive as active FROM Cushionings ORDER BY CushioningID",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/cushionings", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("n", sql.NVarChar, req.body.name)
      .input("a", sql.Bit, req.body.active !== false)
      .query(
        "INSERT INTO Cushionings (CushioningName, IsActive) VALUES (@n, @a)",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/api/cushionings/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("n", sql.NVarChar, req.body.name)
      .input("a", sql.Bit, req.body.active !== false)
      .query(
        "UPDATE Cushionings SET CushioningName=@n, IsActive=@a WHERE CushioningID=@id",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/api/cushionings/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("UPDATE Cushionings SET IsActive = 0 WHERE CushioningID=@id");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= API TRA HANG (Returns) =================
app.get("/api/returns", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool
      .request()
      .query(
        "SELECT ReturnID, OrderID, ReturnType, TrackingNumber, Reason, Status, RefundAmount, CreatedAt FROM Returns ORDER BY ReturnID DESC",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/returns", async (req, res) => {
  try {
    await poolConnect;
    const b = req.body || {};
    let r = await pool
      .request()
      .input("oid", sql.Int, b.order_id || null)
      .input("rt", sql.VarChar(20), b.return_type || "CUSTOMER")
      .input("trk", sql.VarChar, b.tracking_number || "")
      .input("rs", sql.NVarChar(sql.MAX), b.reason || "")
      .input("st", sql.NVarChar, b.status || "Chờ xử lý")
      .input("amt", sql.Decimal(18, 0), b.refund_amount || 0)
      .query(
        "INSERT INTO Returns (OrderID, ReturnType, TrackingNumber, Reason, Status, RefundAmount, CreatedAt) OUTPUT INSERTED.ReturnID VALUES (@oid, @rt, @trk, @rs, @st, @amt, GETDATE())",
      );
    res.json({ success: true, ReturnID: r.recordset[0].ReturnID });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/api/returns/:id/status", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("st", sql.NVarChar, req.body.status)
      .query(
        "UPDATE Returns SET Status=@st, UpdatedAt=GETDATE() WHERE ReturnID=@id",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
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
             p.ProductName as product_name, v.Size as size,
             v.ColorName as color, v.ColorHex as color_hex,
             v.ChildSKU as sku, v.StockQuantity as stock,
             v.PriceAdjustment as price_adjustment
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

    let r = await pool
      .request()
      .input("f", sql.NVarChar, fullName)
      .input("ph", sql.VarChar, phone)
      .input("e", sql.VarChar, email)
      .input("p", sql.VarChar, password)
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
        `SELECT OrderID as id, TotalAmount as total,
                CONVERT(varchar, OrderDate, 103) + ' ' + CONVERT(varchar, OrderDate, 108) as date,
                ISNULL(Status, N'Cho xac nhan') as status,
                ISNULL(PaymentStatus, N'Chua thanh toan') as payment_status,
                ISNULL(PaymentMethod, 'COD') as paymentMethod,
                ISNULL(HandledBy, '') as handled_by
         FROM Orders WHERE UserID = @id ORDER BY OrderID DESC`,
      );

    let details = [];
    try {
      let rDetails = await pool
        .request()
        .input("id", sql.Int, req.params.id)
        .query(
          `SELECT od.OrderID,
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

app.listen(PORT, () => {
  console.log(`Server dang chay tai http://localhost:${PORT}`);
});