"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  initializeDatabase,
  migrationFiles,
  verifyRequiredSchema,
} = require("../src/database/initialize");

test("danh sách khởi tạo luôn chứa migration tạo ApplyScope", () => {
  assert.ok(migrationFiles.includes("20260923_variant_discount_scope.sql"));
  for (const filename of migrationFiles) {
    assert.equal(
      fs.existsSync(path.resolve(__dirname, "../../database/migrations", filename)),
      true,
      `Thiếu migration ${filename}`,
    );
  }
});

test("khởi tạo chạy migration trước rồi mới xác nhận schema", async () => {
  const calls = [];
  const pool = {
    request() {
      return {
        async batch(source) {
          calls.push({ type: "batch", source });
          return {};
        },
        async query() {
          calls.push({ type: "verify" });
          return {
            recordset: [{
              DatabaseName: "TestDb",
              HasVariantDiscounts: 1,
              HasApplyScope: 1,
              HasOrderVariantDiscount: 1,
              HasDiscountRestoreMarker: 1,
            }],
          };
        },
      };
    },
  };

  await initializeDatabase(pool, { logger: { info() {} } });
  assert.equal(calls.filter((call) => call.type === "batch").length, migrationFiles.length);
  assert.equal(calls.at(-1).type, "verify");
});

test("schema thiếu ApplyScope bị chặn trước khi route có thể query", async () => {
  const pool = {
    request() {
      return {
        async query() {
          return {
            recordset: [{
              DatabaseName: "OldDb",
              HasVariantDiscounts: 1,
              HasApplyScope: 0,
              HasOrderVariantDiscount: 1,
              HasDiscountRestoreMarker: 1,
            }],
          };
        },
      };
    },
  };

  await assert.rejects(
    verifyRequiredSchema(pool),
    (error) => error.code === "DB_SCHEMA_MISMATCH" && error.message.includes("ApplyScope"),
  );
});
