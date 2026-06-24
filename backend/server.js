const express = require("express");
const cors = require("cors");
const sql = require("mssql");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const dbConfig = {
  user: "sa",
  password: "123", // Nhớ sửa lại mật khẩu SQL của bạn ở đây nếu cần
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
  .then(async () => {
    console.log("✅ Đã kết nối thành công với CSDL SQL Server!");
    try {
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'Status')
        BEGIN
            ALTER TABLE Orders ADD Status NVARCHAR(50) DEFAULT N'Chờ xác nhận';
        END
      `);
    } catch (e) {
      console.log("Lỗi tạo cột Status", e);
    }
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
      .input("p", sql.VarChar, password).query(`
        SELECT UserID as id_user, Email as email, FullName as full_name, Phone as phone, Address as address, RoleID as role_id 
        FROM Users 
        WHERE Email=@e AND PasswordHash=@p AND IsActive=1
      `);

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
    res
      .status(500)
      .json({ success: false, message: "Lỗi Server: " + e.message });
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

    if (check.recordset.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "Email này đã được sử dụng." });
    }

    let r = await pool
      .request()
      .input("f", sql.NVarChar, fullName)
      .input("e", sql.VarChar, email)
      .input("p", sql.VarChar, password).query(`
        INSERT INTO Users (RoleID, FullName, Email, PasswordHash, IsActive) 
        OUTPUT INSERTED.UserID as id_user, INSERTED.Email as email, INSERTED.FullName as full_name, INSERTED.Phone as phone, INSERTED.Address as address, INSERTED.RoleID as role_id 
        VALUES (2, @f, @e, @p, 1)
      `);
    const user = r.recordset[0];
    user.role = "Customer";
    res.json({ success: true, message: "Đăng ký thành công", user });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi Server: " + e.message });
  }
});

// ================= API SẢN PHẨM =================
app.get("/api/products", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool.request().query(`
      SELECT p.ProductID as id, p.ProductName as name, p.BasePrice as price, 
             p.CategoryID as category_id, c.CategoryName as category, 
             p.ImageURL as image_url, p.IsActive as active 
      FROM Products p LEFT JOIN Categories c ON p.CategoryID = c.CategoryID ORDER BY p.ProductID DESC
    `);
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("n", sql.NVarChar, req.body.name)
      .input("p", sql.Decimal, req.body.price)
      .input("c", sql.Int, req.body.category_id)
      .input("img", sql.VarChar(sql.MAX), req.body.image_url || "")
      .input("a", sql.Bit, req.body.active)
      .query(
        "INSERT INTO Products (ProductName, BasePrice, CategoryID, BrandID, ImageURL, IsActive) VALUES (@n, @p, @c, 1, @img, @a)",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("n", sql.NVarChar, req.body.name)
      .input("p", sql.Decimal, req.body.price)
      .input("c", sql.Int, req.body.category_id)
      .input("img", sql.VarChar(sql.MAX), req.body.image_url || "")
      .input("a", sql.Bit, req.body.active)
      .query(
        "UPDATE Products SET ProductName=@n, BasePrice=@p, CategoryID=@c, ImageURL=@img, IsActive=@a WHERE ProductID=@id",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM Products WHERE ProductID=@id");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= API QUẢN LÝ TÀI KHOẢN =================
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
      .input("r", sql.Int, req.body.role_id)
      .query(
        "UPDATE Users SET Email=@e, FullName=@n, RoleID=@r WHERE UserID=@id",
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

// ================= API DANH MỤC =================
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

// ================= API MÃ KHUYẾN MÃI =================
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

// ================= API QUẢN LÝ ĐƠN HÀNG =================
app.get("/api/orders", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool.request().query(`
      SELECT o.OrderID as id, o.UserID as user_id, u.FullName as customer_name, u.Phone as customer_phone, 
             o.TotalAmount as total, CONVERT(varchar, o.OrderDate, 103) as date, 
             ISNULL(o.Status, N'Chờ xác nhận') as status 
      FROM Orders o 
      LEFT JOIN Users u ON o.UserID = u.UserID
      ORDER BY o.OrderID DESC
    `);
    res.json(r.recordset);
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
      .query("UPDATE Orders SET Status=@s WHERE OrderID=@id");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= API KHÁCH HÀNG & THỐNG KÊ (CHỈ TÍNH DOANH THU KHI ĐÃ GIAO) =================
app.get("/api/customers", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool.request().query(`
        SELECT u.UserID as id, u.FullName as name, u.Phone as phone, 
               COALESCE(SUM(CASE WHEN ISNULL(o.Status, N'Chờ xác nhận') = N'Đã giao hàng thành công' THEN o.TotalAmount ELSE 0 END), 0) as spent 
        FROM Users u 
        LEFT JOIN Orders o ON u.UserID = o.UserID 
        WHERE u.RoleID = 2 
        GROUP BY u.UserID, u.FullName, u.Phone 
        ORDER BY spent DESC
    `);
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/customers/:id/orders", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool.request().input("id", sql.Int, req.params.id).query(`
        SELECT OrderID as id, TotalAmount as total, CONVERT(varchar, OrderDate, 103) as date, 
               ISNULL(Status, N'Chờ xác nhận') as status 
        FROM Orders 
        WHERE UserID = @id 
        ORDER BY OrderID DESC
      `);
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json([]);
  }
});

app.get("/api/chart-data", async (req, res) => {
  try {
    await poolConnect;
    let r = await pool.request().query(`
        SELECT MONTH(OrderDate) as month, SUM(TotalAmount) as total 
        FROM Orders 
        WHERE ISNULL(Status, N'Chờ xác nhận') = N'Đã giao hàng thành công' 
        GROUP BY MONTH(OrderDate) 
        ORDER BY month
    `);
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json([]);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
