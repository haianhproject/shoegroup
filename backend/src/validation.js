"use strict";

/*
 * Validation dùng chung cho các API ghi dữ liệu.
 * Các route vẫn phải kiểm tra quyền ở guard.js; module này chỉ kiểm tra
 * hình dạng, miền giá trị và giới hạn dữ liệu trước khi chạm vào SQL.
 */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^0(?:3|5|7|8|9)\d{8}$/;
const HEX_RE = /^#[0-9a-f]{3,8}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = (value, max) => {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, max);
};

function positiveInt(value, { max = 2147483647 } = {}) {
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 && n <= max ? n : null;
}

function nonNegativeInt(value, { max = 1000000, defaultValue = null } = {}) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return defaultValue;
  }
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= 0 && n <= max ? n : null;
}

function nonNegativeNumber(value, { max = 1e12, defaultValue = null } = {}) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return defaultValue;
  }
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
}

function booleanValue(value, defaultValue = true) {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (value === true || value === 1 || value === "1" || /^true$/i.test(String(value))) return true;
  if (value === false || value === 0 || value === "0" || /^false$/i.test(String(value))) return false;
  return null;
}

function dateValue(value, { required = false } = {}) {
  const raw = text(value, 40);
  if (!raw) return required ? null : null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date : null;
}

function validateEmail(value) {
  const email = text(value, 100).toLowerCase();
  return EMAIL_RE.test(email) ? email : null;
}

function validatePhone(value, { required = false } = {}) {
  const phone = text(value, 20).replace(/\s+/g, "");
  if (!phone && !required) return "";
  return PHONE_RE.test(phone) ? phone : null;
}

function validationError(message) {
  return { ok: false, message };
}

function validIdField(value, label, { nullable = true } = {}) {
  if ((value === undefined || value === null || value === "") && nullable) return null;
  return positiveInt(value) ? null : `${label} không hợp lệ.`;
}

function validateCatalogPayload(body = {}, { nameMax = 100, requireName = true } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return validationError("Dữ liệu gửi lên không hợp lệ.");
  }
  const name = text(body.name, nameMax);
  if (requireName && !name) return validationError("Tên không được để trống.");
  if (requireName && String(body.name ?? "").trim().length > nameMax) {
    return validationError(`Tên không được dài quá ${nameMax} ký tự.`);
  }
  const active = booleanValue(body.active, true);
  if (active === null) return validationError("Trạng thái hoạt động không hợp lệ.");
  const sortOrder = nonNegativeInt(body.sort_order, { max: 1000000, defaultValue: 0 });
  if (sortOrder === null) return validationError("Thứ tự phải là số nguyên không âm.");
  return { ok: true, value: { name, active, sortOrder } };
}

function validateProductPayload(body = {}, { requireVariants = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return validationError("Dữ liệu sản phẩm không hợp lệ.");
  }
  const name = text(body.name, 255);
  if (!name) return validationError("Tên sản phẩm không được để trống.");
  if (String(body.name ?? "").trim().length > 255) return validationError("Tên sản phẩm không được dài quá 255 ký tự.");
  const price = nonNegativeNumber(body.price, { max: 1e12 });
  const salePrice = nonNegativeNumber(body.sale_price, { max: 1e12, defaultValue: 0 });
  if (price === null || salePrice === null) return validationError("Giá sản phẩm phải là số không âm hợp lệ.");
  if (salePrice > 0 && salePrice > price) return validationError("Giá khuyến mãi không được lớn hơn giá bán.");
  for (const [field, label] of [["category_id", "Danh mục"], ["brand_id", "Thương hiệu"], ["collection_id", "Bộ sưu tập"], ["material_id", "Chất liệu"]]) {
    const error = validIdField(body[field], label);
    if (error) return validationError(error);
  }
  const active = booleanValue(body.active, true);
  const featured = booleanValue(body.is_featured, false);
  if (active === null || featured === null) return validationError("Trạng thái sản phẩm không hợp lệ.");
  const parentSku = text(body.parent_sku, 50);
  const description = text(body.description, 10000);
  const imageUrl = text(body.image_url, 2200000);
  if (String(body.parent_sku ?? "").trim().length > 50) return validationError("SKU cha không được dài quá 50 ký tự.");
  if (String(body.description ?? "").trim().length > 10000) return validationError("Mô tả không được dài quá 10.000 ký tự.");
  if (String(body.image_url ?? "").trim().length > 2200000) return validationError("Ảnh sản phẩm vượt quá giới hạn cho phép.");
  const variants = body.variants === undefined ? [] : body.variants;
  if (!Array.isArray(variants) || variants.length > 1000) return validationError("Danh sách biến thể không hợp lệ.");
  if (requireVariants && variants.length === 0) return validationError("Sản phẩm phải có ít nhất một biến thể.");
  const seen = new Set();
  for (const variant of variants) {
    if (!variant || typeof variant !== "object" || Array.isArray(variant)) return validationError("Biến thể sản phẩm không hợp lệ.");
    const color = text(variant.color ?? variant.ColorName, 50);
    const size = text(variant.size ?? variant.Size, 10);
    if (!color && !size) return validationError("Mỗi biến thể phải có màu hoặc size.");
    const stock = nonNegativeInt(variant.stock ?? variant.StockQuantity, { max: 1000000, defaultValue: 0 });
    if (stock === null) return validationError("Tồn kho biến thể phải là số nguyên không âm.");
    const key = `${color.toLocaleLowerCase()}\u0000${size.toLocaleLowerCase()}`;
    if (seen.has(key)) return validationError("Không được trùng màu và size trong các biến thể.");
    seen.add(key);
    if (String(variant.sku ?? variant.ChildSKU ?? "").trim().length > 60) return validationError("SKU biến thể không được dài quá 60 ký tự.");
  }
  const colors = body.colors === undefined ? [] : body.colors;
  if (!Array.isArray(colors) || colors.length > 100) return validationError("Danh sách ảnh theo màu không hợp lệ.");
  for (const color of colors) {
    if (!color || typeof color !== "object" || Array.isArray(color)) return validationError("Ảnh theo màu không hợp lệ.");
    if (String(color.name ?? color.ColorName ?? "").trim().length > 50) return validationError("Tên màu không được dài quá 50 ký tự.");
    if (String(color.image ?? color.ImageURL ?? "").trim().length > 2200000) return validationError("Ảnh theo màu vượt quá giới hạn cho phép.");
  }
  return { ok: true, value: { name, price, salePrice, active, featured, parentSku, description, imageUrl, variants, colors } };
}

function readCoupon(body = {}) {
  return {
    code: text(body.CouponCode ?? body.code, 50).toUpperCase(),
    name: text(body.CouponName ?? body.name, 200),
    type: text(body.DiscountType ?? body.discount_type ?? body.type ?? "Phần trăm", 20),
    value: body.DiscountValue ?? body.value,
    percent: body.DiscountPercent ?? body.percent,
    minOrder: body.MinOrderAmount ?? body.min_order,
    maxDiscount: body.MaxDiscountAmount ?? body.max_discount,
    limit: body.UsageLimit ?? body.limit ?? body.quantity,
    startDate: body.StartDate ?? body.start_date,
    expiry: body.ExpiryDate ?? body.expiry,
    description: text(body.Description ?? body.description, 500),
    active: body.IsActive ?? body.active,
  };
}

function validateCouponPayload(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return validationError("Dữ liệu mã giảm giá không hợp lệ.");
  const c = readCoupon(body);
  if (String(body.CouponCode ?? body.code ?? "").trim().length > 50) return validationError("Mã giảm giá không được dài quá 50 ký tự.");
  if (String(body.CouponName ?? body.name ?? "").trim().length > 200) return validationError("Tên chương trình không được dài quá 200 ký tự.");
  if (String(body.Description ?? body.description ?? "").trim().length > 500) return validationError("Mô tả mã giảm giá không được dài quá 500 ký tự.");
  if (!/^[A-Z0-9][A-Z0-9_-]{1,49}$/.test(c.code)) return validationError("Mã giảm giá chỉ gồm chữ, số, gạch ngang hoặc gạch dưới (2-50 ký tự).");
  if (!c.name) return validationError("Tên chương trình không được để trống.");
  const typeKey = c.type.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
  const type = typeKey.includes("freeship") ? "freeship" : typeKey.includes("co dinh") || typeKey === "fixed" ? "fixed" : typeKey.includes("phan tram") || typeKey === "percent" ? "percent" : null;
  if (!type) return validationError("Loại mã giảm giá không hợp lệ.");
  const value = nonNegativeNumber(c.value, { max: 1e12, defaultValue: 0 });
  const percent = nonNegativeInt(c.percent ?? (type === "percent" ? c.value : 0), { max: 100, defaultValue: 0 });
  const minOrder = nonNegativeNumber(c.minOrder, { max: 1e12, defaultValue: 0 });
  const maxDiscount = nonNegativeNumber(c.maxDiscount, { max: 1e12, defaultValue: 0 });
  const limit = nonNegativeInt(c.limit, { max: 2147483647, defaultValue: 0 });
  if ([value, percent, minOrder, maxDiscount, limit].some((v) => v === null)) return validationError("Giá trị mã giảm giá phải là số không âm hợp lệ.");
  if (type !== "freeship" && value <= 0) return validationError("Giá trị mã giảm giá phải lớn hơn 0.");
  if (type === "percent" && value > 100) return validationError("Phần trăm giảm giá phải từ 0 đến 100.");
  const startDate = dateValue(c.startDate);
  const expiry = dateValue(c.expiry, { required: true });
  if (!expiry) return validationError("Mã giảm giá phải có ngày hết hạn hợp lệ.");
  if (startDate && expiry <= startDate) return validationError("Ngày hết hạn phải sau ngày bắt đầu.");
  const active = booleanValue(c.active, true);
  if (active === null) return validationError("Trạng thái mã giảm giá không hợp lệ.");
  return { ok: true, value: { ...c, type, value, percent: type === "percent" ? value : 0, minOrder, maxDiscount, limit, startDate, expiry, active } };
}

function validateVariantDiscountPayload(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return validationError("Dữ liệu giảm giá biến thể không hợp lệ.");
  const variantId = positiveInt(body.ProductVariantID ?? body.variant_id);
  const productId = positiveInt(body.ProductID ?? body.product_id);
  if (!variantId || !productId) return validationError("Biến thể hoặc sản phẩm không hợp lệ.");
  const rawType = text(body.DiscountType ?? body.discount_type ?? body.type, 20);
  const typeKey = rawType.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
  const type = typeKey.includes("phan tram") || typeKey === "percent" ? "percent" : typeKey.includes("co dinh") || typeKey === "fixed" ? "fixed" : null;
  if (!type) return validationError("Loại giảm giá biến thể không hợp lệ.");
  const value = nonNegativeNumber(body.DiscountValue ?? body.value, { max: 1e12 });
  const maxDiscount = nonNegativeNumber(body.MaxDiscountAmount ?? body.max_discount, { max: 1e12, defaultValue: 0 });
  const quantity = nonNegativeInt(body.Quantity ?? body.quantity, { max: 2147483647, defaultValue: 0 });
  if (value === null || value <= 0 || maxDiscount === null || quantity === null) return validationError("Giá trị, số lượng giảm giá không hợp lệ.");
  if (type === "percent" && value > 100) return validationError("Phần trăm giảm giá phải từ 0 đến 100.");
  const startDate = dateValue(body.StartDate ?? body.start_date);
  const endDate = dateValue(body.EndDate ?? body.end_date);
  if ((body.EndDate ?? body.end_date) && !endDate) return validationError("Ngày kết thúc giảm giá biến thể không hợp lệ.");
  if (startDate && endDate && endDate <= startDate) return validationError("Ngày kết thúc phải sau ngày bắt đầu.");
  const active = booleanValue(body.IsActive ?? body.active, true);
  if (active === null) return validationError("Trạng thái giảm giá biến thể không hợp lệ.");
  if (String(body.Reason ?? body.reason ?? "").trim().length > 100) return validationError("Lý do không được dài quá 100 ký tự.");
  if (String(body.Description ?? body.description ?? "").trim().length > 500) return validationError("Mô tả giảm giá biến thể không được dài quá 500 ký tự.");
  if (String(body.ColorHex ?? body.color_hex ?? "").trim() && !HEX_RE.test(text(body.ColorHex ?? body.color_hex, 20))) {
    return validationError("Mã màu biến thể không hợp lệ.");
  }
  return {
    ok: true,
    value: {
      variantId, productId, colorName: text(body.ColorName ?? body.color, 50), colorHex: text(body.ColorHex ?? body.color_hex, 20),
      type, value, percent: type === "percent" ? value : 0, maxDiscount, quantity,
      startDate, endDate, reason: text(body.Reason ?? body.reason, 100), active,
      description: text(body.Description ?? body.description, 500),
    },
  };
}

module.exports = {
  text,
  positiveInt,
  nonNegativeInt,
  nonNegativeNumber,
  booleanValue,
  validateEmail,
  validatePhone,
  validateCatalogPayload,
  validateProductPayload,
  validateCouponPayload,
  validateVariantDiscountPayload,
  HEX_RE,
  SLUG_RE,
};
