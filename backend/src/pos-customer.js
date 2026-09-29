const VIETNAM_MOBILE_PATTERN = /^0(?:3|5|7|8|9)\d{8}$/;

function validatePosCustomerDetails(input = {}) {
  const name = String(input.customerName ?? input.customer_name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 100);
  const phone = String(input.customerPhone ?? input.customer_phone ?? "")
    .replace(/\s+/g, "")
    .trim();

  if (!name) {
    return { ok: false, message: "Vui lòng nhập tên khách hàng trước khi thanh toán." };
  }
  if (!phone) {
    return { ok: false, message: "Vui lòng nhập số điện thoại khách hàng trước khi thanh toán." };
  }
  if (!VIETNAM_MOBILE_PATTERN.test(phone)) {
    return {
      ok: false,
      message: "Số điện thoại phải có 10 số và bắt đầu bằng 03, 05, 07, 08 hoặc 09.",
    };
  }

  return { ok: true, name, phone };
}

module.exports = { validatePosCustomerDetails };
