"use strict";

// Chạy toàn bộ migration bắt buộc và chỉ cho API dùng CSDL sau khi schema đã
// được kiểm chứng. Nhờ đó code mới không thể truy vấn một cột chưa được tạo.
const fs = require("node:fs");
const path = require("node:path");

const migrationsDirectory = path.resolve(__dirname, "../../../database/migrations");

const migrationFiles = Object.freeze([
  "20260909_checkout_idempotency.sql",
  "20260909_coupon_redemptions.sql",
  "20260919_confirmation_stock_deduction.sql",
  "20260920_legacy_order_confirmation_stock.sql",
  "20260920_order_variant_image_snapshot.sql",
  "20260923_variant_discount_order_tracking.sql",
  "20260923_variant_discount_scope.sql",
]);

const schemaVerificationSql = `
  SELECT
    DB_NAME() AS DatabaseName,
    CASE WHEN OBJECT_ID(N'dbo.VariantDiscounts', N'U') IS NOT NULL THEN 1 ELSE 0 END AS HasVariantDiscounts,
    CASE WHEN COL_LENGTH(N'dbo.VariantDiscounts', N'ApplyScope') IS NOT NULL THEN 1 ELSE 0 END AS HasApplyScope,
    CASE WHEN COL_LENGTH(N'dbo.OrderDetails', N'VariantDiscountID') IS NOT NULL THEN 1 ELSE 0 END AS HasOrderVariantDiscount,
    CASE WHEN COL_LENGTH(N'dbo.Orders', N'VariantDiscountRestoredAt') IS NOT NULL THEN 1 ELSE 0 END AS HasDiscountRestoreMarker;
`;

function readMigration(filename) {
  const fullPath = path.join(migrationsDirectory, filename);
  if (!fs.existsSync(fullPath)) {
    const error = new Error(`Không tìm thấy migration bắt buộc: ${filename}`);
    error.code = "DB_MIGRATION_FILE_MISSING";
    throw error;
  }
  return fs.readFileSync(fullPath, "utf8").replace(/^\uFEFF/, "");
}

async function verifyRequiredSchema(pool) {
  const result = await pool.request().query(schemaVerificationSql);
  const row = result.recordset?.[0] || {};
  const missing = [];

  if (Number(row.HasVariantDiscounts) !== 1) missing.push("dbo.VariantDiscounts");
  if (Number(row.HasApplyScope) !== 1) missing.push("dbo.VariantDiscounts.ApplyScope");
  if (Number(row.HasOrderVariantDiscount) !== 1) missing.push("dbo.OrderDetails.VariantDiscountID");
  if (Number(row.HasDiscountRestoreMarker) !== 1) missing.push("dbo.Orders.VariantDiscountRestoredAt");

  if (missing.length) {
    const databaseName = row.DatabaseName || "không xác định";
    const error = new Error(
      `Schema CSDL ${databaseName} chưa tương thích; còn thiếu: ${missing.join(", ")}. ` +
      "API đã dừng truy vấn để tránh phát sinh lỗi SQL lặp lại.",
    );
    error.code = "DB_SCHEMA_MISMATCH";
    error.missingSchema = missing;
    throw error;
  }

  return row;
}

async function initializeDatabase(pool, { logger = console } = {}) {
  for (const filename of migrationFiles) {
    try {
      await pool.request().batch(readMigration(filename));
    } catch (cause) {
      const error = new Error(`Migration ${filename} thất bại: ${cause.message}`);
      error.code = "DB_MIGRATION_FAILED";
      error.migration = filename;
      error.cause = cause;
      throw error;
    }
  }

  const schema = await verifyRequiredSchema(pool);
  logger.info?.(
    `[DB MIGRATION] Đã đồng bộ ${migrationFiles.length} migration và kiểm tra schema ${schema.DatabaseName}.`,
  );
  return schema;
}

module.exports = {
  initializeDatabase,
  migrationFiles,
  readMigration,
  schemaVerificationSql,
  verifyRequiredSchema,
};
