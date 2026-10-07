"use strict";

const sql = require("mssql");
const fail = (message, statusCode = 409, code = "POS_CART_CONFLICT") =>
  Object.assign(new Error(message), { statusCode, code });

function revisionNumber(value) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw fail("Vui lòng tải lại giỏ tại quầy trước khi tiếp tục.", 400);
  }
  return value;
}

async function lockCart(transaction, userId, expectedRevision) {
  const result = await new sql.Request(transaction).input("uid", sql.Int, userId).query(`
    IF NOT EXISTS (SELECT 1 FROM PosCarts WITH (UPDLOCK,HOLDLOCK) WHERE UserID=@uid)
      INSERT PosCarts(UserID) VALUES (@uid);
    SELECT Revision FROM PosCarts WITH (UPDLOCK,HOLDLOCK) WHERE UserID=@uid;
  `);
  const revision = result.recordset[0].Revision;
  if (expectedRevision !== undefined && revision !== revisionNumber(expectedRevision)) {
    throw fail("Giỏ tại quầy đã thay đổi ở lần thao tác trước hoặc tab khác. Đã tải lại giỏ, vui lòng kiểm tra.");
  }
  return revision;
}

async function snapshot(transaction, userId) {
  const result = await new sql.Request(transaction).input("uid", sql.Int, userId).query(`
    SELECT Revision AS revision FROM PosCarts WHERE UserID=@uid;
    SELECT ci.ProductVariantID AS variant_id, v.ProductID AS product_id, ci.Quantity AS quantity,
           p.ProductName AS name, v.Size AS size, v.ColorName AS color, v.ColorHex AS color_hex,
           v.ChildSKU AS sku, p.BasePrice AS base_price, ISNULL(v.PriceAdjustment,0) AS price_adjustment,
           ISNULL(v.StockQuantity,0) AS stock,ISNULL(v.Version,0) AS version,
           COALESCE(NULLIF(img.ImageURL,''),p.ImageURL,'') AS image
    FROM PosCartItems ci
    JOIN ProductVariants v ON v.ProductVariantID=ci.ProductVariantID
    JOIN Products p ON p.ProductID=v.ProductID
    OUTER APPLY (
      SELECT TOP 1 ImageURL FROM ProductImages pi
      WHERE pi.ProductID=v.ProductID AND ISNULL(pi.ColorName,N'')=ISNULL(v.ColorName,N'')
      ORDER BY pi.IsPrimary DESC, pi.SortOrder
    ) img
    WHERE ci.UserID=@uid ORDER BY ci.ProductVariantID;
  `);
  return { revision: result.recordsets[0][0].revision, items: result.recordsets[1] };
}

async function bumpRevision(transaction, userId) {
  await new sql.Request(transaction).input("uid", sql.Int, userId).query(`
    UPDATE PosCarts SET Revision=Revision+1,UpdatedAt=SYSDATETIME() WHERE UserID=@uid;
  `);
}

// Khóa giỏ trước, rồi biến thể; mọi thay đổi giỏ và kho cùng commit/rollback.
async function changeQuantity(transaction, userId, variantId, quantity) {
  const existing = await new sql.Request(transaction)
    .input("uid", sql.Int, userId).input("vid", sql.Int, variantId)
    .query("SELECT Quantity FROM PosCartItems WHERE UserID=@uid AND ProductVariantID=@vid");
  const delta = quantity - Number(existing.recordset[0]?.Quantity || 0);
  const updated = await new sql.Request(transaction)
    .input("vid", sql.Int, variantId).input("delta", sql.Int, delta).query(`
      UPDATE v WITH (UPDLOCK)
      SET StockQuantity=ISNULL(v.StockQuantity,0)-@delta,Version=ISNULL(v.Version,0)+1
      OUTPUT INSERTED.ProductVariantID AS id,INSERTED.StockQuantity AS stock,INSERTED.Version AS version
      FROM ProductVariants v
      WHERE v.ProductVariantID=@vid AND ISNULL(v.StockQuantity,0)>=@delta
        AND (@delta<=0 OR (ISNULL(v.IsActive,1)=1 AND EXISTS (
          SELECT 1 FROM Products p WHERE p.ProductID=v.ProductID AND ISNULL(p.IsActive,1)=1)));
    `);
  if (!updated.recordset.length) {
    throw fail("Kho không đủ hoặc sản phẩm đã ngừng bán. Vui lòng kiểm tra lại số lượng.", 409, "STOCK_UNAVAILABLE");
  }
  await new sql.Request(transaction).input("uid", sql.Int, userId)
    .input("vid", sql.Int, variantId).input("qty", sql.Int, quantity).query(`
      IF @qty=0 DELETE FROM PosCartItems WHERE UserID=@uid AND ProductVariantID=@vid;
      ELSE IF EXISTS (SELECT 1 FROM PosCartItems WHERE UserID=@uid AND ProductVariantID=@vid)
        UPDATE PosCartItems SET Quantity=@qty WHERE UserID=@uid AND ProductVariantID=@vid;
      ELSE INSERT PosCartItems(UserID,ProductVariantID,Quantity) VALUES (@uid,@vid,@qty);
    `);
  return updated.recordset[0];
}

// Đối chiếu chính xác giỏ đã giữ, không dùng lượng tồn còn lại để từ chối hàng này.
async function claimPosCart(transaction, userId, expectedRevision, items) {
  revisionNumber(expectedRevision);
  await lockCart(transaction, userId, expectedRevision);
  const held = await new sql.Request(transaction).input("uid", sql.Int, userId).query(`
    SELECT ci.ProductVariantID AS variantId,v.ProductID AS productId,ci.Quantity AS quantity
    FROM PosCartItems ci JOIN ProductVariants v ON v.ProductVariantID=ci.ProductVariantID
    WHERE ci.UserID=@uid;
  `);
  const requested = new Map();
  for (const item of items) {
    const variantId = Number(item.productVariantId ?? item.product_variant_id ?? item.variant_id);
    const productId = Number(item.productId ?? item.product_id);
    if (!variantId || requested.has(variantId)) throw fail("Sản phẩm trong đơn không khớp giỏ tại quầy.");
    requested.set(variantId, { productId, quantity: Number(item.quantity) });
  }
  if (!held.recordset.length || held.recordset.length !== requested.size || held.recordset.some(row => {
    const item = requested.get(row.variantId);
    return !item || item.productId !== row.productId || item.quantity !== row.quantity;
  })) throw fail("Số lượng trong đơn không khớp giỏ đã giữ hàng. Vui lòng tải lại giỏ tại quầy.");
}

async function consumePosCart(transaction, userId, orderId) {
  await new sql.Request(transaction).input("uid", sql.Int, userId).input("oid", sql.Int, orderId).query(`
    UPDATE Orders SET StockDeductedAt=GETDATE(),StockRestoredAt=NULL WHERE OrderID=@oid;
    DELETE FROM PosCartItems WHERE UserID=@uid;
  `);
  await bumpRevision(transaction, userId);
}

function registerPosCartRoutes(app, { pool, poolConnect, publishAdminEvent }) {
  async function handle(req, res, mutate) {
    let transaction;
    try {
      // Phòng thủ thêm: kể cả AUTH_MODE=warn cũng không cho khách giữ hàng quầy.
      if (req.auth?.role !== "Admin") throw fail("Chỉ nhân viên được sử dụng giỏ tại quầy.", 403);
      await poolConnect;
      const userId = Number(req.auth.sub);
      if (mutate) revisionNumber(req.body?.revision);
      transaction = new sql.Transaction(pool);
      await transaction.begin();
      await lockCart(transaction, userId, mutate ? req.body.revision : undefined);
      const stockUpdates = [];
      if (mutate === "item") {
        const variantId = Number(req.params.variantId);
        const quantity = req.body.quantity;
        if (!Number.isSafeInteger(variantId) || variantId <= 0 || typeof quantity !== "number" ||
            !Number.isInteger(quantity) || quantity < 0 || quantity > 1000000) {
          throw fail("Số lượng phải là số nguyên từ 0 đến 1.000.000.", 400, "INVALID_QUANTITY");
        }
        stockUpdates.push(await changeQuantity(transaction, userId, variantId, quantity));
      } else if (mutate === "clear") {
        const rows = await new sql.Request(transaction).input("uid", sql.Int, userId)
          .query("SELECT ProductVariantID FROM PosCartItems WHERE UserID=@uid ORDER BY ProductVariantID");
        for (const row of rows.recordset) {
          stockUpdates.push(await changeQuantity(transaction, userId, row.ProductVariantID, 0));
        }
      }
      if (mutate) await bumpRevision(transaction, userId);
      const cart = await snapshot(transaction, userId);
      await transaction.commit();
      if (mutate) publishAdminEvent("inventory.updated", { source: "pos", userId, stockUpdates });
      res.json({ success: true, ...cart, stockUpdates });
    } catch (error) {
      if (transaction && !transaction._aborted) { try { await transaction.rollback(); } catch (_) {} }
      const status = error.statusCode || 500;
      if (status === 500) console.error("[POS CART]", error.message);
      res.status(status).json({ success: false, code: error.code, message: status === 500
        ? "Không thể cập nhật giỏ tại quầy. Vui lòng thử lại." : error.message });
    }
  }
  app.get("/api/pos/cart", (req, res) => handle(req, res));
  app.put("/api/pos/cart/items/:variantId", (req, res) => handle(req, res, "item"));
  app.delete("/api/pos/cart", (req, res) => handle(req, res, "clear"));
}

module.exports = { registerPosCartRoutes, claimPosCart, consumePosCart };
