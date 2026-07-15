const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const multer = require("multer");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const dbConfig = {
  user: "sa",
  password: "123", // Đổi thành mật khẩu SQL của bạn nếu cần
  server: "localhost",
  database: "ShoegroupDB",
  options: { encrypt: false, trustServerCertificate: true },
};

const pool = new sql.ConnectionPool(dbConfig);
const poolConnect = pool.connect();

poolConnect
  .then(() => {
    console.log("✅ Đã kết nối thành công với CSDL SQL Server (ShoegroupDB)!");
  })
  .catch((err) => console.error("❌ Lỗi kết nối DB:", err));

// ================= API XÁC THỰC =================
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
        .json({ success: false, message: "Sai email hoặc mật khẩu" });
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
        .json({ success: false, message: "Email này đã được sử dụng." });

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
      message: "Đăng ký thành công",
      user: { ...r.recordset[0], role: "Customer" },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ================= API QUẢN LÝ ĐƠN HÀNG VÀ THANH TOÁN =================

app.post("/api/orders", async (req, res) => {
  try {
    await poolConnect;
    const {
      userId,
      totalAmount,
      shippingAddress,
      customerName,
      customerPhone,
      shippingFee,
      discountAmount,
      paymentMethod,
      note,
      items,
      couponCode,
    } = req.body;

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = new sql.Request(transaction);

      // B1: Lưu vào bảng Orders
      let orderResult = await request
        .input("uid", sql.Int, userId)
        .input("tot", sql.Decimal, totalAmount)
        .input("cname", sql.NVarChar, customerName)
        .input("cphone", sql.VarChar, customerPhone)
        .input("addr", sql.NVarChar, shippingAddress)
        .input("pay", sql.NVarChar, paymentMethod)
        .input("sfee", sql.Decimal, shippingFee)
        .input("disc", sql.Decimal, discountAmount)
        .input("note", sql.NVarChar, note).query(`
          INSERT INTO Orders (UserID, TotalAmount, OrderDate, Status, ShippingAddress, CustomerName, CustomerPhone, PaymentMethod, ShippingFee, DiscountAmount, OrderNote) 
          OUTPUT INSERTED.OrderID 
          VALUES (@uid, @tot, GETDATE(), N'Chờ xác nhận', @addr, @cname, @cphone, @pay, @sfee, @disc, @note)
        `);

      const orderId = orderResult.recordset[0].OrderID;

      // B2: Lưu từng sản phẩm vào bảng OrderDetails
      for (let item of items) {
        const detailReq = new sql.Request(transaction);
        await detailReq
          .input("oid", sql.Int, orderId)
          .input("pid", sql.Int, item.productId)
          .input("qty", sql.Int, item.quantity)
          .input("price", sql.Decimal, item.price)
          .input("sz", sql.NVarChar, item.size)
          .input("clr", sql.NVarChar, item.color).query(`
            INSERT INTO OrderDetails (OrderID, ProductID, Quantity, UnitPrice, Size, Color)
            VALUES (@oid, @pid, @qty, @price, @sz, @clr)
          `);
      }

      // B3: Cập nhật lượt dùng Mã giảm giá (nếu có)
      if (couponCode) {
        const couponReq = new sql.Request(transaction);
        await couponReq
          .input("code", sql.VarChar, couponCode)
          .query(
            "UPDATE Coupons SET UsedCount = ISNULL(UsedCount, 0) + 1 WHERE CouponCode = @code",
          );
      }

      await transaction.commit();
      res.json({ success: true, orderId });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    await poolConnect;

    let rOrders = await pool.request().query(`
      SELECT o.OrderID as id, o.UserID as user_id, 
             ISNULL(o.CustomerName, u.FullName) as customer_name, 
             ISNULL(o.CustomerPhone, u.Phone) as customer_phone, 
             ISNULL(o.ShippingAddress, ISNULL(u.Address, N'Chưa cập nhật địa chỉ')) as customer_address,
             o.TotalAmount as total, o.ShippingFee as shippingFee, o.DiscountAmount as discount,
             o.PaymentMethod as paymentMethod, o.OrderNote as note,
             CONVERT(varchar, o.OrderDate, 103) + ' ' + CONVERT(varchar, o.OrderDate, 108) as date, 
             ISNULL(o.Status, N'Chờ xác nhận') as status, ISNULL(o.CancelReason, '') as cancel_reason
      FROM Orders o LEFT JOIN Users u ON o.UserID = u.UserID ORDER BY o.OrderID DESC
    `);

    let details = [];
    try {
      let rDetails = await pool.request().query(`
          SELECT od.OrderID, p.ProductName as name, p.ImageURL as image, od.Quantity as quantity, od.UnitPrice as price, ISNULL(od.Size, '42') as size, ISNULL(od.Color, N'Mặc định') as color
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

app.put("/api/orders/:id/status", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("s", sql.NVarChar, req.body.status)
      .input("r", sql.NVarChar, req.body.reason || "")
      .query(
        `UPDATE Orders SET Status = @s, CancelReason = CASE WHEN @s = N'Đã hủy' THEN @r ELSE CancelReason END WHERE OrderID = @id`,
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= API SẢN PHẨM =================
app.get("/api/products", async (req, res) => {
  try {
    await poolConnect;
    let rProducts = await pool.request().query(
      "SELECT p.ProductID as id, p.ProductName as name, p.BasePrice as price, p.CategoryID as category_id, p.BrandID as brand_id, p.ImageURL as image_url, p.IsActive as active FROM Products p"
    );
    let rColors = await pool.request().query("SELECT ProductID, ColorName as color_name, ImageURL as image_url FROM ProductColors");
    
    let products = rProducts.recordset.map(p => {
      p.colors = rColors.recordset.filter(c => c.ProductID === p.id);
      return p;
    });
    res.json(products);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/products", async (req, res) => {
  try {
    await poolConnect;
    const { product_name, price, id_brand, id_category, image_url, active, colors } = req.body;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const productReq = new sql.Request(transaction);
      let resProd = await productReq
        .input("n", sql.NVarChar, product_name).input("p", sql.Decimal, price)
        .input("c", sql.Int, id_category).input("b", sql.Int, id_brand || 1)
        .input("img", sql.VarChar(sql.MAX), image_url).input("a", sql.Bit, active)
        .query("INSERT INTO Products (ProductName, BasePrice, CategoryID, BrandID, ImageURL, IsActive) OUTPUT INSERTED.ProductID VALUES (@n, @p, @c, @b, @img, @a)");
      
      const pid = resProd.recordset[0].ProductID;
      if (colors) {
        for (let col of colors) {
          await new sql.Request(transaction)
            .input("pid", sql.Int, pid).input("name", sql.NVarChar, col.color_name)
            .input("img", sql.VarChar(sql.MAX), col.image_url)
            .query("INSERT INTO ProductColors (ProductID, ColorName, ImageURL) VALUES (@pid, @name, @img)");
        }
      }
      await transaction.commit();
      res.json({ success: true });
    } catch (err) { await transaction.rollback(); throw err; }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    await poolConnect;
    const productId = req.params.id;
    const { product_name, price, id_brand, id_category, image_url, active, colors } = req.body;

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Cập nhật thông tin gốc của sản phẩm
      const updateReq = new sql.Request(transaction);
      await updateReq
        .input("id", sql.Int, productId)
        .input("n", sql.NVarChar, product_name)
        .input("p", sql.Decimal, price)
        .input("c", sql.Int, id_category)
        .input("b", sql.Int, id_brand || 1)
        .input("img", sql.VarChar(sql.MAX), image_url || "")
        .input("a", sql.Bit, active !== undefined ? active : 1)
        .query(
          "UPDATE Products SET ProductName=@n, BasePrice=@p, CategoryID=@c, BrandID=@b, ImageURL=@img, IsActive=@a WHERE ProductID=@id",
        );

      // 2. Xóa toàn bộ màu cũ của sản phẩm này
      const deleteColorReq = new sql.Request(transaction);
      await deleteColorReq.input("id", sql.Int, productId).query("DELETE FROM ProductColors WHERE ProductID=@id");

      // 3. Thêm lại danh sách màu mới
      if (colors && Array.isArray(colors) && colors.length > 0) {
        for (let color of colors) {
          const insertColorReq = new sql.Request(transaction);
          await insertColorReq
            .input("pid", sql.Int, productId)
            .input("cname", sql.NVarChar, color.color_name)
            .input("cimg", sql.VarChar(sql.MAX), color.image_url)
            .query("INSERT INTO ProductColors (ProductID, ColorName, ImageURL) VALUES (@pid, @cname, @cimg)");
        }
      }

      await transaction.commit();
      res.json({ success: true });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    await poolConnect;
    const productId = req.params.id;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Xóa các màu phụ thuộc trước (Tránh lỗi Ràng buộc khóa ngoại FK)
      await new sql.Request(transaction)
        .input("id", sql.Int, productId)
        .query("DELETE FROM ProductColors WHERE ProductID=@id");

      // Xóa sản phẩm gốc
      await new sql.Request(transaction)
        .input("id", sql.Int, productId)
        .query("DELETE FROM Products WHERE ProductID=@id");

      await transaction.commit();
      res.json({ success: true });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= API QUẢN LÝ TÀI KHOẢN, DANH MỤC, KHUYẾN MÃI =================

app.get("/api/accounts", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool
      .request()
      .query(
        "SELECT UserID as id, Email as username, FullName as name, RoleID as role_id FROM Users ORDER BY UserID DESC",
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
      .input("r", sql.Int, req.body.role_id)
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
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("e", sql.VarChar, req.body.username)
      .input("n", sql.NVarChar, req.body.name)
      .input("p", sql.VarChar, req.body.phone || "")
      .input("a", sql.NVarChar, req.body.address || "")
      .input("r", sql.Int, req.body.role_id)
      .query(
        "UPDATE Users SET Email=@e, FullName=@n, Phone=@p, Address=@a, RoleID=@r WHERE UserID=@id",
      );
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
        "SELECT CategoryID as id, CategoryName as name, IsActive as active FROM Categories ORDER BY CategoryID DESC",
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
      .input("a", sql.Bit, req.body.active)
      .query("INSERT INTO Categories (CategoryName, IsActive) VALUES (@n, @a)");
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
      .input("a", sql.Bit, req.body.active)
      .query(
        "UPDATE Categories SET CategoryName=@n, IsActive=@a WHERE CategoryID=@id",
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

app.get("/api/discounts", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool
      .request()
      .query(
        "SELECT CouponID as id, CouponCode as code, DiscountPercent as [percent], UsageLimit as [limit], UsedCount as used, CONVERT(varchar, ExpiryDate, 23) as expiry, IsActive as active FROM Coupons ORDER BY CouponID DESC",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/discounts", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("c", sql.VarChar, req.body.code)
      .input("p", sql.Int, req.body.percent)
      .input("l", sql.Int, req.body.limit)
      .input("e", sql.DateTime, req.body.expiry)
      .input("a", sql.Bit, req.body.active)
      .query(
        "INSERT INTO Coupons (CouponCode, DiscountPercent, UsageLimit, ExpiryDate, IsActive) VALUES (@c, @p, @l, @e, @a)",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/discounts/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("c", sql.VarChar, req.body.code)
      .input("p", sql.Int, req.body.percent)
      .input("l", sql.Int, req.body.limit)
      .input("e", sql.DateTime, req.body.expiry)
      .input("a", sql.Bit, req.body.active)
      .query(
        "UPDATE Coupons SET CouponCode=@c, DiscountPercent=@p, UsageLimit=@l, ExpiryDate=@e, IsActive=@a WHERE CouponID=@id",
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

// ================= API KHÁCH HÀNG & THỐNG KÊ DOANH THU =================
app.get("/api/customers", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool.request().query(`
      SELECT u.UserID as id, u.FullName as name, u.Phone as phone, 
             COALESCE(SUM(CASE WHEN o.Status = N'Đã giao hàng thành công' THEN o.TotalAmount ELSE 0 END), 0) as spent 
      FROM Users u LEFT JOIN Orders o ON u.UserID = o.UserID 
      WHERE u.RoleID = 2 GROUP BY u.UserID, u.FullName, u.Phone ORDER BY spent DESC
    `);
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/customers/:id/orders", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query(
        "SELECT OrderID as id, TotalAmount as total, CONVERT(varchar, OrderDate, 103) as date, ISNULL(Status, N'Chờ xác nhận') as status FROM Orders WHERE UserID = @id ORDER BY OrderID DESC",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json([]);
  }
});

app.get("/api/chart-data", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool
      .request()
      .query(
        "SELECT MONTH(OrderDate) as month, SUM(TotalAmount) as total FROM Orders WHERE ISNULL(Status, N'Chờ xác nhận') = N'Đã giao hàng thành công' GROUP BY MONTH(OrderDate) ORDER BY month",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json([]);
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));