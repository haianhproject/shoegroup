const express = require("express");
const sql = require("mssql");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
  user: "sa",
  password: "123",
  server: "localhost",
  database: "ShoegroupDB",
  options: { encrypt: true, trustServerCertificate: true },
};
let pool;

async function startServer() {
  try {
    pool = await sql.connect(dbConfig);
    console.log(`✅ [THÀNH CÔNG] Backend đã kết nối SQL Server!`);
    app.listen(5000, () => console.log(`🚀 API túc trực tại cổng 5000`));
  } catch (e) {
    console.log(`❌ LỖI DB:`, e.message);
  }
}
startServer();

// --- 1. SẢN PHẨM (THÊM, SỬA, XÓA) ---
app.get("/api/products", async (req, res) => {
  try {
    let r = await pool
      .request()
      .query(
        "SELECT p.ProductID as id, p.ProductName as name, p.BasePrice as price, c.CategoryName as category, p.IsActive as active FROM Products p JOIN Categories c ON p.CategoryID = c.CategoryID ORDER BY p.ProductID DESC",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json([]);
  }
});
app.post("/api/products", async (req, res) => {
  try {
    await pool
      .request()
      .input("n", sql.NVarChar, req.body.name)
      .input("p", sql.Decimal, req.body.price)
      .input("a", sql.Bit, req.body.active)
      .query(
        "INSERT INTO Products (ProductName, BasePrice, CategoryID, BrandID, IsActive) VALUES (@n, @p, 1, 1, @a)",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/api/products/:id", async (req, res) => {
  try {
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("n", sql.NVarChar, req.body.name)
      .input("p", sql.Decimal, req.body.price)
      .input("a", sql.Bit, req.body.active)
      .query(
        "UPDATE Products SET ProductName=@n, BasePrice=@p, IsActive=@a WHERE ProductID=@id",
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/api/products/:id", async (req, res) => {
  try {
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM Products WHERE ProductID=@id");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- 2. DANH MỤC (THÊM, SỬA, XÓA) ---
app.get("/api/categories", async (req, res) => {
  try {
    let r = await pool
      .request()
      .query(
        "SELECT CategoryID as id, CategoryName as name, IsActive as active FROM Categories ORDER BY CategoryID DESC",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json([]);
  }
});
app.post("/api/categories", async (req, res) => {
  try {
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
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM Categories WHERE CategoryID=@id");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- 3. MÃ GIẢM GIÁ (THÊM, SỬA, XÓA) ---
// --- 3. MÃ GIẢM GIÁ (THÊM, SỬA, XÓA) ---
app.get("/api/discounts", async (req, res) => {
  try {
    // Đã bọc [percent] và [limit] vào ngoặc vuông để tránh đụng độ từ khóa hệ thống của SQL
    let r = await pool
      .request()
      .query(
        "SELECT CouponID as id, CouponCode as code, DiscountPercent as [percent], UsageLimit as [limit], UsedCount as used, CONVERT(varchar, ExpiryDate, 23) as expiry, IsActive as active FROM Coupons ORDER BY CouponID DESC",
      );
    res.json(r.recordset);
  } catch (e) {
    console.log("Lỗi load Mã giảm giá:", e.message);
    res.status(500).json([]);
  }
});

app.post("/api/discounts", async (req, res) => {
  try {
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
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM Coupons WHERE CouponID=@id");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- BỔ SUNG NHỎ: API LẤY SỐ LƯỢNG ĐƠN HÀNG ---
// (Tôi bổ sung thêm hàm này để thẻ "Đơn Hàng Mới" ở màn hình Tổng quan đếm được số liệu thật thay vì hiển thị 0)
app.get("/api/orders", async (req, res) => {
  try {
    let r = await pool.request().query("SELECT OrderID as id FROM Orders");
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json([]);
  }
});

// --- 4. CRM VÀ API BIỂU ĐỒ SÓNG ---
app.get("/api/customers", async (req, res) => {
  try {
    let r = await pool
      .request()
      .query(
        "SELECT UserID as id, FullName as name, Phone as phone, ISNULL((SELECT SUM(TotalAmount) FROM Orders o WHERE o.UserID = u.UserID), 0) as spent FROM Users u WHERE RoleID = 2",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json([]);
  }
});
app.get("/api/accounts", async (req, res) => {
  try {
    let r = await pool
      .request()
      .query(
        "SELECT UserID as id, Email as username, FullName as name FROM Users WHERE RoleID = 1",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json([]);
  }
});
app.get("/api/chart-data", async (req, res) => {
  try {
    let r = await pool
      .request()
      .query(
        "SELECT MONTH(OrderDate) as month, SUM(TotalAmount) as total FROM Orders GROUP BY MONTH(OrderDate) ORDER BY month",
      );
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json([]);
  }
});
