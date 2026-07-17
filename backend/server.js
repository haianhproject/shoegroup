const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const nodemailer = require("nodemailer");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const dbConfig = {
  user: "sa",
  password: "123", // Doi thanh mat khau SQL cua ban neu can
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

// ================= CAU HINH EMAIL (nodemailer) =================
// Voi Gmail: bat xac thuc 2 buoc roi tao "App Password" tai:
//   https://myaccount.google.com/apppasswords
// Sau do dien EMAIL_USER = email cua ban, EMAIL_PASS = app password 16 ky tu.
// Nen dat qua bien moi truong khi deploy. Cai thu vien: npm install nodemailer
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const EMAIL_USER = process.env.EMAIL_USER || "anhbhth05764@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS || "labw adqs zelc mcen";
const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});
// Kiem tra dang nhap SMTP NGAY khi khoi dong -> in ket qua ra terminal.
// Neu thay "[EMAIL] LOI" thi email/app-password sai (hoac chua bat 2FA).
mailTransporter.verify((err) => {
  if (err) console.error("[EMAIL] LOI cau hinh gui mail:", err.message);
  else console.log("[EMAIL] San sang gui mail qua:", EMAIL_USER);
});

// ================= API XAC THUC =================
app.post("/api/login", async (req, res) => {
  try {
    await poolConnect;
    const { email, password } = req.body;
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

    res.json({
      success: true,
      message: "Dang ky thanh cong",
      user: { ...r.recordset[0], role: "Customer" },
    });
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
    const status = b.status ?? "Chờ xác nhận";
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
          INSERT INTO Orders (UserID, TotalAmount, OrderDate, Status, ShippingAddress, CustomerName, CustomerPhone, PaymentMethod, PaymentStatus, HandledBy, ShippingFee, DiscountAmount, OrderNote, AutoCancelDeadline)
          OUTPUT INSERTED.OrderID
          VALUES (@uid, @tot, GETDATE(), @stt, @addr, @cname, @cphone, @pay, @pstat, @hb, @sfee, @disc, @note, DATEADD(day, 7, GETDATE()))
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
             ISNULL(o.Status, N'Chờ xác nhận') as status, ISNULL(o.CancelReason, '') as cancel_reason
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
        `UPDATE Orders SET Status = @s, CancelReason = CASE WHEN @s IN (N'Đã hủy', N'Da huy') THEN @r ELSE CancelReason END, AutoCancelDeadline = CASE WHEN @s IN (N'Đã giao hàng thành công', N'Đã hủy', N'Đã nhận hàng') THEN NULL ELSE AutoCancelDeadline END WHERE OrderID = @id`,
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Cập nhật trạng thái thanh toán từ khu quản trị.
app.put("/api/orders/:id/payment", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("ps", sql.NVarChar, req.body.payment_status || "Chưa thanh toán")
      .query("UPDATE Orders SET PaymentStatus=@ps WHERE OrderID=@id");
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
    if (b.order_id) {
      await pool
        .request()
        .input("oid", sql.Int, b.order_id)
        .query(
          "UPDATE Orders SET Status=N'Yêu cầu trả hàng' WHERE OrderID=@oid",
        );
    }
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

// ============================================================
//  API BO SUNG (ShoeGroup - cap nhat nghiep vu khach hang)
// ============================================================
const crypto = require("crypto");

// Khoang cach uoc luong tu kho Ha Noi (km) theo tinh/thanh
const HANOI_DISTANCE = {
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
};

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

// 2) Tinh phi giao hang theo khoang cach (hoa toc) / co dinh (thuong)
app.post("/api/shipping/quote", async (req, res) => {
  try {
    await poolConnect;
    const methodCode = (req.body && req.body.methodCode) || "STANDARD";
    const province = (req.body && req.body.province) || "";
    let method = null;
    try {
      const r = await pool
        .request()
        .input("c", sql.VarChar, methodCode)
        .query(
          "SELECT MethodCode, MethodName, BasePrice, PricePerKm, EstimatedTimeText FROM ShippingMethods WHERE MethodCode=@c AND ISNULL(IsActive,1)=1",
        );
      method = r.recordset[0] || null;
    } catch (err) {
      method = null;
    }
    if (!method) {
      method =
        methodCode === "EXPRESS"
          ? {
              MethodCode: "EXPRESS",
              MethodName: "Giao hoa toc",
              BasePrice: 40000,
              PricePerKm: 5000,
              EstimatedTimeText: "~24 gio",
            }
          : {
              MethodCode: "STANDARD",
              MethodName: "Giao tieu chuan",
              BasePrice: 30000,
              PricePerKm: 0,
              EstimatedTimeText: "2 - 3 ngay",
            };
    }
    const key = String(province).toLowerCase();
    let km = 0;
    for (const k in HANOI_DISTANCE) {
      if (key.indexOf(k) !== -1) {
        km = HANOI_DISTANCE[k];
        break;
      }
    }
    if (method.MethodCode === "EXPRESS" && !km) km = 150;
    const fee =
      Number(method.BasePrice) +
      (method.MethodCode === "EXPRESS" ? km * Number(method.PricePerKm) : 0);
    res.json({
      methodCode: method.MethodCode,
      methodName: method.MethodName,
      distanceKm: km,
      fee,
      eta: method.EstimatedTimeText,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3) Khach xac nhan "Da nhan hang" (giong Shopee) - giu 14 ngay truoc khi tinh doanh thu
app.put("/api/orders/:id/receive", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("hold", sql.Int, 14).query(`
        UPDATE Orders
        SET Status = N'Đã nhận hàng',
            ReceivedConfirmedDate = GETDATE(),
            RevenueEligibleDate = DATEADD(day, @hold, GETDATE()),
            IsCountedAsRevenue = 0
        WHERE OrderID = @id
      `);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 4) Job: tu dong huy don qua han nhan hang + tinh doanh thu sau 14 ngay
async function runAutoCancelJob() {
  try {
    await poolConnect;
    await pool
      .request()
      .input(
        "reason",
        sql.NVarChar,
        "Shop chua chuan bi hang cho khach. Xin loi quy khach, vui long dat lai don hang.",
      ).query(`
        UPDATE Orders
        SET Status = N'Đã hủy', CancelReason = @reason
        WHERE AutoCancelDeadline IS NOT NULL
          AND AutoCancelDeadline < GETDATE()
          AND Status IN (N'Chờ xác nhận', N'Đã xác nhận', N'Cho xac nhan', N'Da xac nhan')
      `);
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
        from: '"ShoeGroup" <' + EMAIL_USER + '>',
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
    await pool
      .request()
      .input("t", sql.VarChar, token)
      .input("p", sql.VarChar, newPassword).query(`
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

app.listen(PORT, () => {
  console.log(`Server dang chay tai http://localhost:${PORT}`);
});
