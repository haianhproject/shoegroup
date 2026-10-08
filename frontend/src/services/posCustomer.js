// Mục đích: Kiểm tra tên và số điện thoại khách trước khi thanh toán tại quầy.
const VIETNAM_MOBILE_PATTERN = /^0(?:3|5|7|8|9)\d{8}$/;

export function validatePosCustomer(customer = {}) {
  const name = String(customer.customer_name || "")
    .trim()
    .replace(/\s+/g, " ");
  const phone = String(customer.customer_phone || "").replace(/\D/g, "");

  if (!name) {
    return {
      ok: false,
      name,
      phone,
      message: "Vui lòng nhập tên khách hàng trước khi thanh toán.",
    };
  }
  if (!phone) {
    return {
      ok: false,
      name,
      phone,
      message: "Vui lòng nhập số điện thoại khách hàng trước khi thanh toán.",
    };
  }
  if (!VIETNAM_MOBILE_PATTERN.test(phone)) {
    return {
      ok: false,
      name,
      phone,
      message: "Số điện thoại phải có 10 số và bắt đầu bằng 03, 05, 07, 08 hoặc 09.",
    };
  }

  return { ok: true, name, phone, message: "" };
}
