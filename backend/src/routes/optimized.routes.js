/* ============================================================
 * optimized.routes.js - CAC API MOI, HIEU NANG CAO
 * ------------------------------------------------------------
 * QUAN TRONG: cac route cu KHONG bi sua doi. Day la route MOI
 * (them duong dan moi) nen frontend cu chay binh thuong;
 * frontend moi chuyen dan sang cac route nay de nhanh hon.
 *
 *  GET /api/health                 - kiem tra suc khoe he thong
 *  GET /api/v2/products            - phan trang + loc + sort bang SQL
 *  GET /api/v2/products/featured   - san pham noi bat cho trang chu (nhe)
 *  GET /api/v2/orders              - phan trang, JOIN san pham bang SQL
 *  GET /api/v2/dashboard/summary   - so lieu tong quan 1 truy vấn
 * ============================================================ */
const express = require("express");

module.exports = function createOptimizedRoutes({ pool, poolConnect, sql }) {
  const router = express.Router();

  const toInt = (v, def, min, max) => {
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) return def;
    return Math.min(Math.max(n, min), max);
  };

  router.get("/api/health", async (_req, res) => {
    try {
      await poolConnect;
      const r = await pool.request().query("SELECT 1 AS ok");
      res.json({
        success: true,
        db: r.recordset[0].ok === 1 ? "connected" : "unknown",
        uptimeSeconds: Math.round(process.uptime()),
        time: new Date().toISOString(),
      });
    } catch (e) {
      res.status(503).json({ success: false, db: "disconnected" });
    }
  });

  /* ---------- San pham co phan trang (thay cho viec tai toan bo bang) ---------- */
  router.get("/api/v2/products", async (req, res, next) => {
    try {
      await poolConnect;
      const page = toInt(req.query.page, 1, 1, 100000);
      const limit = toInt(req.query.limit, 12, 1, 100);
      const offset = (page - 1) * limit;
      const search = (req.query.q || "").toString().slice(0, 100);
      const categoryId = req.query.categoryId ? toInt(req.query.categoryId, 0, 0, 1e9) : null;
      const brandId = req.query.brandId ? toInt(req.query.brandId, 0, 0, 1e9) : null;
      const sortMap = {
        newest: "p.CreatedAt DESC, p.ProductID DESC",
        price_asc: "ISNULL(p.SalePrice, p.BasePrice) ASC",
        price_desc: "ISNULL(p.SalePrice, p.BasePrice) DESC",
        name: "p.ProductName ASC",
        popular: "ISNULL(p.ViewCount,0) DESC",
      };
      const orderBy = sortMap[req.query.sort] || sortMap.newest;

      const request = pool
        .request()
        .input("offset", sql.Int, offset)
        .input("limit", sql.Int, limit)
        .input("q", sql.NVarChar, search ? `%${search}%` : null)
        .input("cat", sql.Int, categoryId)
        .input("brand", sql.Int, brandId);

      const where = `
        WHERE ISNULL(p.IsActive, 1) = 1
          AND (@q IS NULL OR p.ProductName LIKE @q)
          AND (@cat IS NULL OR p.CategoryID = @cat)
          AND (@brand IS NULL OR p.BrandID = @brand)`;

      const r = await request.query(`
        SELECT COUNT(*) AS total FROM Products p ${where};

        SELECT p.ProductID AS id, p.ProductName AS name, p.BasePrice AS price,
               p.SalePrice AS sale_price, p.CategoryID AS category_id, c.CategoryName AS category,
               p.BrandID AS brand_id, b.BrandName AS brand, p.ImageURL AS image_url,
               p.IsFeatured AS is_featured, p.IsActive AS active,
               ISNULL(v.TotalStock, 0) AS stock
        FROM Products p
        LEFT JOIN Categories c ON c.CategoryID = p.CategoryID
        LEFT JOIN Brands b ON b.BrandID = p.BrandID
        OUTER APPLY (SELECT SUM(pv.StockQuantity) AS TotalStock
                     FROM ProductVariants pv WHERE pv.ProductID = p.ProductID) v
        ${where}
        ORDER BY ${orderBy}
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
      `);

      const total = r.recordsets[0][0].total;
      res.json({
        data: r.recordsets[1],
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (e) {
      next(e);
    }
  });

  /* ---------- San pham noi bat cho trang chu ---------- */
  router.get("/api/v2/products/featured", async (req, res, next) => {
    try {
      await poolConnect;
      const limit = toInt(req.query.limit, 8, 1, 40);
      const r = await pool.request().input("limit", sql.Int, limit).query(`
        SELECT TOP (@limit) p.ProductID AS id, p.ProductName AS name, p.BasePrice AS price,
               p.SalePrice AS sale_price, p.ImageURL AS image_url, b.BrandName AS brand
        FROM Products p LEFT JOIN Brands b ON b.BrandID = p.BrandID
        WHERE ISNULL(p.IsActive,1) = 1
        ORDER BY ISNULL(p.IsFeatured,0) DESC, ISNULL(p.ViewCount,0) DESC, p.ProductID DESC
      `);
      res.json({ data: r.recordset });
    } catch (e) {
      next(e);
    }
  });

  /* ---------- S7: So sanh san pham (Lay danh sach thong so qua IDs) ---------- */
  router.get("/api/v2/products/compare", async (req, res, next) => {
    try {
      await poolConnect;
      const idsParam = req.query.ids;
      
      if (!idsParam) {
        return res.json({ success: true, items: [] });
      }

      // Xử lý bảo mật: Chỉ giữ lại các ID là số nguyên hợp lệ
      const idList = idsParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      if (idList.length === 0) {
        return res.json({ success: true, items: [] });
      }

      const request = pool.request();
      
      // Tạo danh sách tham số động (@id_0, @id_1...) để chặn SQL Injection
      const paramNames = idList.map((id, index) => {
        const name = `id_${index}`;
        request.input(name, sql.Int, id);
        return `@${name}`;
      }).join(',');

      const query = `
        SELECT 
          p.ProductID AS id_product,
          p.ProductName AS product_name,
          p.BasePrice AS price,
          p.ImageURL AS image_url,
          b.BrandName AS brand_name,
          c.CategoryName AS category_name,
          c.Sport AS sport,
          m.MaterialName AS material_name,
          s.SoleName AS sole_name,
          cu.CushioningName AS cushioning_name,
          ISNULL(r.AvgRating, 5.0) AS AvgRating,
          ISNULL(r.ReviewCount, 0) AS ReviewCount
        FROM Products p
        LEFT JOIN Brands b ON p.BrandID = b.BrandID
        LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
        LEFT JOIN Materials m ON p.MaterialID = m.MaterialID
        LEFT JOIN Soles s ON p.SoleID = s.SoleID
        LEFT JOIN Cushionings cu ON p.CushioningID = cu.CushioningID
        LEFT JOIN vw_ProductRatings r ON p.ProductID = r.ProductID
        WHERE p.ProductID IN (${paramNames})
      `;

      const r = await request.query(query);
      res.json({ success: true, items: r.recordset });
    } catch (e) {
      next(e); // Đẩy lỗi cho errorHandler chung của express
    }
  });

  /* ---------- S6: Dang ky bao hang ve (Stock Alerts) ---------- */
  router.post("/api/v2/stock-alerts", async (req, res, next) => {
    try {
      await poolConnect;
      const { VariantID, Email } = req.body;

      // Validate email & ID an toàn
      if (!VariantID || !Email || !/^\S+@\S+\.\S+$/.test(Email.trim())) {
        return res.status(400).json({ success: false, message: 'Email hoặc biến thể không hợp lệ.' });
      }

      try {
        await pool.request()
          .input('VariantID', sql.Int, VariantID)
          .input('Email', sql.VarChar(100), Email.trim().toLowerCase())
          .query(`
            INSERT INTO StockAlerts (ProductVariantID, Email)
            VALUES (@VariantID, @Email)
          `);
        res.json({ success: true, message: 'Đăng ký thông báo thành công!' });
      } catch (err) {
        // SQL Error 2627 hoac 2601 la loi trung khoa UQ_SA_Variant_Email
        if (err.number === 2627 || err.number === 2601) {
          res.json({ success: true, message: 'Email này đã đăng ký nhận thông báo cho sản phẩm này rồi!' });
        } else {
          throw err;
        }
      }
    } catch (e) {
      next(e);
    }
  });

  /* ---------- Don hang co phan trang (khong tai het bang nhu truoc) ---------- */
  router.get("/api/v2/orders", async (req, res, next) => {
    try {
      await poolConnect;
      const page = toInt(req.query.page, 1, 1, 100000);
      const limit = toInt(req.query.limit, 20, 1, 100);
      const offset = (page - 1) * limit;
      const isAdmin = req.auth && req.auth.role === "Admin";
      // Khach hang chi thay don cua chinh minh
      const userId = isAdmin
        ? req.query.userId
          ? toInt(req.query.userId, 0, 0, 1e9)
          : null
        : Number(req.auth?.sub) || -1;
      const statusCode = (req.query.statusCode || "").toString().slice(0, 30) || null;

      const hasStatusCode = await pool.request().query(`
        SELECT COUNT(*) AS c FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.Orders') AND name = 'StatusCode'`);
      const useCode = hasStatusCode.recordset[0].c > 0;

      const where = `
        WHERE (@uid IS NULL OR o.UserID = @uid)
          AND (@st IS NULL OR ${useCode ? "o.StatusCode = @st" : "1 = 1"})`;

      const r = await pool
        .request()
        .input("uid", sql.Int, userId)
        .input("st", sql.VarChar, statusCode)
        .input("offset", sql.Int, offset)
        .input("limit", sql.Int, limit).query(`
        SELECT COUNT(*) AS total FROM Orders o ${where};

        SELECT o.OrderID AS id, o.UserID AS user_id,
               ISNULL(o.CustomerName, u.FullName) AS customer_name,
               ISNULL(o.CustomerPhone, u.Phone) AS customer_phone,
               ISNULL(o.ShippingAddress, u.Address) AS customer_address,
               o.TotalAmount AS total, o.ShippingFee AS shippingFee,
               o.DiscountAmount AS discount, o.PaymentMethod AS paymentMethod,
               ISNULL(o.PaymentStatus, N'Chua thanh toan') AS payment_status,
               ${useCode ? "o.StatusCode AS status_code," : ""}
               ISNULL(o.Status, N'Chờ xác nhận') AS status,
               ISNULL(o.CancelReason, '') AS cancel_reason,
               o.OrderDate AS order_date,
               CONVERT(varchar, o.OrderDate, 103) + ' ' + CONVERT(varchar, o.OrderDate, 108) AS date,
               (SELECT od.OrderDetailID AS id, COALESCE(p.ProductName, od.ProductNameSnapshot, N'San pham') AS name,
                       COALESCE(p.ImageURL, od.ImageURLSnapshot, '') AS image,
                       od.Quantity AS quantity, od.UnitPrice AS price,
                       ISNULL(od.Size,'') AS size, ISNULL(od.Color, N'') AS color
                FROM OrderDetails od LEFT JOIN Products p ON p.ProductID = od.ProductID
                WHERE od.OrderID = o.OrderID
                FOR JSON PATH) AS products_json
        FROM Orders o LEFT JOIN Users u ON u.UserID = o.UserID
        ${where}
        ORDER BY o.OrderID DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
      `);

      const total = r.recordsets[0][0].total;
      const data = r.recordsets[1].map((o) => {
        const { products_json, ...rest } = o;
        return { ...rest, products: products_json ? JSON.parse(products_json) : [] };
      });
      res.json({
        data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (e) {
      next(e);
    }
  });

  /* ---------- So lieu tong quan cho dashboard ---------- */
  router.get("/api/v2/dashboard/summary", async (_req, res, next) => {
    try {
      await poolConnect;
      const r = await pool.request().query(`
        SELECT
          (SELECT COUNT(*) FROM Orders) AS totalOrders,
          (SELECT COUNT(*) FROM Orders WHERE OrderDate >= CAST(GETDATE() AS date)) AS ordersToday,
          (SELECT ISNULL(SUM(TotalAmount),0) FROM Orders WHERE ISNULL(IsCountedAsRevenue,0) = 1) AS recognizedRevenue,
          (SELECT COUNT(*) FROM Products WHERE ISNULL(IsActive,1) = 1) AS activeProducts,
          (SELECT COUNT(*) FROM Users WHERE ISNULL(IsActive,1) = 1) AS activeUsers,
          (SELECT COUNT(*) FROM ProductVariants WHERE StockQuantity <= 5) AS lowStockVariants
      `);
      res.json(r.recordset[0]);
    } catch (e) {
      next(e);
    }
  });

  return router;
};