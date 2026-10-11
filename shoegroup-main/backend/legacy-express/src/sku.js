// Mục đích: Đối chiếu Express: chuẩn hóa mã sản phẩm và mã biến thể.
"use strict";

// SKU được lưu trong varchar: dùng ASCII để không mất chữ Đ/dấu tiếng Việt.
function normalizeSku(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "D").toUpperCase().trim()
    .replace(/[^A-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function variantSku(value, productId, color, size) {
  const supplied = String(value ?? "").trim();
  if (supplied && !/[?\uFFFD]/.test(supplied)) return normalizeSku(supplied).slice(0, 60);
  const prefix = supplied ? normalizeSku(supplied.split("-")[0]) : `SKU-${productId}`;
  return `${prefix || `SKU-${productId}`}-${normalizeSku(color)}-${normalizeSku(size)}`.slice(0, 60);
}

module.exports = { normalizeSku, variantSku };
