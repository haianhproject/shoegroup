const crypto = require("crypto");
const nodemailer = require("nodemailer");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanHeader(value, fallback = "") {
  const cleaned = String(value ?? "").replace(/[\r\n]+/g, " ").trim();
  return cleaned || fallback;
}

function formatMoney(value) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(value) || 0)} đ`;
}

function textLine(label, value) {
  return `${label}: ${String(value ?? "").trim() || "—"}`;
}

function emailShell({ eyebrow, title, intro, content, actionUrl, actionLabel, footer }) {
  const safeUrl = escapeHtml(actionUrl);
  return `<!doctype html>
<html lang="vi">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#f5f5f5;color:#171717;font-family:Arial,'Segoe UI',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(intro)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#0e0e0e;color:#ffffff;padding:22px 28px;font-size:22px;font-weight:700;">ShoeGroup</td></tr>
          <tr><td style="padding:28px;">
            <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#737373;margin-bottom:8px;">${escapeHtml(eyebrow)}</div>
            <h1 style="font-size:24px;line-height:1.3;margin:0 0 12px;color:#0e0e0e;">${escapeHtml(title)}</h1>
            <p style="font-size:15px;line-height:1.7;margin:0 0 22px;color:#525252;">${escapeHtml(intro)}</p>
            ${content}
            ${actionUrl ? `<div style="margin-top:24px;"><a href="${safeUrl}" style="display:inline-block;background:#0e0e0e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 20px;border-radius:8px;">${escapeHtml(actionLabel)}</a></div>` : ""}
            ${actionUrl ? `<p style="font-size:12px;line-height:1.6;color:#737373;margin:20px 0 0;word-break:break-all;">Nếu nút không hoạt động, mở liên kết này:<br><a href="${safeUrl}" style="color:#262626;">${safeUrl}</a></p>` : ""}
          </td></tr>
          <tr><td style="border-top:1px solid #e5e5e5;padding:18px 28px;font-size:12px;line-height:1.6;color:#737373;">${escapeHtml(footer)}</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function createEmailService({ config, pool, sql, transporter: suppliedTransporter }) {
  const user = cleanHeader(config?.mail?.user);
  const pass = String(config?.mail?.pass || "").trim();
  const fromName = cleanHeader(config?.mail?.fromName, "ShoeGroup");
  // Gmail sẽ ghi đè From nếu địa chỉ này không phải tài khoản đăng nhập hoặc
  // một bí danh Send As đã được xác minh. Mặc định đồng nhất với EMAIL_USER.
  const fromAddress = cleanHeader(config?.mail?.fromAddress, user);
  const configuredReplyTo = cleanHeader(config?.mail?.replyTo, fromAddress);
  const replyTo = EMAIL_RE.test(configuredReplyTo) ? configuredReplyTo : fromAddress;
  const frontendUrl = String(config?.frontendUrl || "http://localhost:3000").replace(/\/+$/, "");
  const isConfigured = Boolean(user && pass && EMAIL_RE.test(user) && EMAIL_RE.test(fromAddress));
  const transporter = suppliedTransporter || (isConfigured
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
      })
    : null);

  function assertConfigured() {
    if (!isConfigured || !transporter) {
      const error = new Error("Dịch vụ email chưa được cấu hình.");
      error.code = "EMAIL_NOT_CONFIGURED";
      throw error;
    }
  }

  async function verify() {
    assertConfigured();
    return transporter.verify();
  }

  async function sendTransactional({ to, subject, text, html, reference }) {
    assertConfigured();
    const recipient = cleanHeader(to);
    if (!EMAIL_RE.test(recipient)) {
      const error = new Error("Địa chỉ nhận email không hợp lệ.");
      error.code = "EMAIL_RECIPIENT_INVALID";
      throw error;
    }
    const ref = crypto.createHash("sha256").update(String(reference || subject)).digest("hex").slice(0, 24);
    return transporter.sendMail({
      from: { name: fromName, address: fromAddress },
      to: recipient,
      replyTo,
      subject: cleanHeader(subject),
      text,
      html,
      headers: {
        "Auto-Submitted": "auto-generated",
        "X-Auto-Response-Suppress": "All",
        "X-Entity-Ref-ID": ref,
      },
    });
  }

  async function sendPasswordResetEmail({ to, resetLink, token }) {
    const title = "Đặt lại mật khẩu";
    const intro = "Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản ShoeGroup. Liên kết này có hiệu lực trong 1 giờ.";
    const text = [
      "ShoeGroup - Đặt lại mật khẩu",
      "",
      intro,
      "",
      `Mở liên kết: ${resetLink}`,
      "",
      "Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email. Mật khẩu hiện tại của bạn vẫn được giữ nguyên.",
    ].join("\n");
    const html = emailShell({
      eyebrow: "Bảo mật tài khoản",
      title,
      intro,
      content: '<div style="padding:14px 16px;background:#fafafa;border:1px solid #e5e5e5;border-radius:8px;font-size:13px;line-height:1.6;color:#525252;">Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email. Mật khẩu hiện tại của bạn vẫn được giữ nguyên.</div>',
      actionUrl: resetLink,
      actionLabel: "Đặt lại mật khẩu",
      footer: "Đây là email bảo mật tự động từ ShoeGroup, không phải email quảng cáo.",
    });
    return sendTransactional({ to, subject: `${title} | ShoeGroup`, text, html, reference: `password-reset:${token}` });
  }

  async function loadOrder(orderId) {
    if (!pool || !sql) throw new Error("Không có kết nối dữ liệu để tạo email đơn hàng.");
    const orderResult = await pool.request().input("oid", sql.Int, Number(orderId)).query(`
      SELECT TOP 1 o.OrderID, o.OrderDate, o.TotalAmount, ISNULL(o.ShippingFee, 0) AS ShippingFee,
             ISNULL(o.DiscountAmount, 0) AS DiscountAmount, o.ShippingAddress, o.CustomerName,
             o.CustomerPhone, o.PaymentMethod, o.PaymentStatus, o.EstimatedDeliveryText, u.Email
      FROM Orders o
      JOIN Users u ON u.UserID=o.UserID
      WHERE o.OrderID=@oid
    `);
    const order = orderResult.recordset[0];
    if (!order || !EMAIL_RE.test(String(order.Email || "").trim())) return null;
    const detailResult = await pool.request().input("oid", sql.Int, Number(orderId)).query(`
      SELECT COALESCE(NULLIF(ProductNameSnapshot, N''), N'Sản phẩm') AS ProductName,
             Quantity, UnitPrice, ISNULL(Size, N'') AS Size, ISNULL(Color, N'') AS Color
      FROM OrderDetails
      WHERE OrderID=@oid
      ORDER BY OrderDetailID
    `);
    return { order, items: detailResult.recordset || [] };
  }

  function orderSummaryContent(order, items) {
    const subtotal = Math.max(0, Number(order.TotalAmount) - Number(order.ShippingFee) + Number(order.DiscountAmount));
    const itemRows = items.map((item) => {
      const attributes = [item.Size && `Size ${item.Size}`, item.Color].filter(Boolean).join(" · ");
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eeeeee;font-size:14px;line-height:1.5;"><strong>${escapeHtml(item.ProductName)}</strong>${attributes ? `<br><span style="font-size:12px;color:#737373;">${escapeHtml(attributes)}</span>` : ""}</td>
        <td align="center" style="padding:10px 8px;border-bottom:1px solid #eeeeee;font-size:14px;">${Number(item.Quantity) || 0}</td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid #eeeeee;font-size:14px;white-space:nowrap;">${escapeHtml(formatMoney(Number(item.UnitPrice) * Number(item.Quantity)))}</td>
      </tr>`;
    }).join("");
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr><td colspan="3" style="font-size:14px;font-weight:700;padding-bottom:8px;">Sản phẩm</td></tr>
      ${itemRows}
      <tr><td colspan="2" style="padding-top:14px;font-size:13px;color:#737373;">Tạm tính</td><td align="right" style="padding-top:14px;font-size:13px;">${escapeHtml(formatMoney(subtotal))}</td></tr>
      <tr><td colspan="2" style="padding-top:7px;font-size:13px;color:#737373;">Phí vận chuyển</td><td align="right" style="padding-top:7px;font-size:13px;">${escapeHtml(formatMoney(order.ShippingFee))}</td></tr>
      ${Number(order.DiscountAmount) > 0 ? `<tr><td colspan="2" style="padding-top:7px;font-size:13px;color:#737373;">Giảm giá</td><td align="right" style="padding-top:7px;font-size:13px;">-${escapeHtml(formatMoney(order.DiscountAmount))}</td></tr>` : ""}
      <tr><td colspan="2" style="padding-top:10px;font-size:15px;font-weight:700;">Tổng thanh toán</td><td align="right" style="padding-top:10px;font-size:15px;font-weight:700;">${escapeHtml(formatMoney(order.TotalAmount))}</td></tr>
    </table>
    <div style="margin-top:22px;padding:16px;background:#fafafa;border:1px solid #e5e5e5;border-radius:8px;font-size:13px;line-height:1.7;color:#525252;">
      <strong style="color:#171717;">Giao đến</strong><br>${escapeHtml(order.CustomerName)} · ${escapeHtml(order.CustomerPhone)}<br>${escapeHtml(order.ShippingAddress)}<br>
      <strong style="color:#171717;">Thanh toán:</strong> ${escapeHtml(order.PaymentMethod)} · ${escapeHtml(order.PaymentStatus)}
    </div>`;
  }

  async function sendOrderConfirmationEmail(orderId) {
    assertConfigured();
    const data = await loadOrder(orderId);
    if (!data) return { skipped: true, reason: "ORDER_EMAIL_UNAVAILABLE" };
    const { order, items } = data;
    const orderUrl = `${frontendUrl}/orders`;
    const itemText = items.map((item) => {
      const attributes = [item.Size && `size ${item.Size}`, item.Color].filter(Boolean).join(", ");
      return `- ${item.ProductName}${attributes ? ` (${attributes})` : ""} x${item.Quantity}: ${formatMoney(Number(item.UnitPrice) * Number(item.Quantity))}`;
    });
    const text = [
      `ShoeGroup đã nhận đơn hàng #${order.OrderID}`,
      "",
      `Xin chào ${order.CustomerName || "bạn"}, đơn hàng của bạn đã được ghi nhận thành công.`,
      "",
      ...itemText,
      "",
      textLine("Tổng thanh toán", formatMoney(order.TotalAmount)),
      textLine("Phương thức", order.PaymentMethod),
      textLine("Trạng thái thanh toán", order.PaymentStatus),
      textLine("Địa chỉ giao hàng", order.ShippingAddress),
      "",
      `Theo dõi đơn hàng: ${orderUrl}`,
      "",
      "Đây là email giao dịch tự động, không chứa nội dung quảng cáo.",
    ].join("\n");
    const html = emailShell({
      eyebrow: `Đơn hàng #${order.OrderID}`,
      title: "Đặt hàng thành công",
      intro: `Xin chào ${order.CustomerName || "bạn"}, ShoeGroup đã nhận được đơn hàng của bạn.`,
      content: orderSummaryContent(order, items),
      actionUrl: orderUrl,
      actionLabel: "Theo dõi đơn hàng",
      footer: "Đây là email giao dịch tự động xác nhận đơn hàng từ ShoeGroup, không chứa nội dung quảng cáo.",
    });
    return sendTransactional({
      to: order.Email,
      subject: `ShoeGroup đã nhận đơn hàng #${order.OrderID}`,
      text,
      html,
      reference: `order-created:${order.OrderID}`,
    });
  }

  async function sendPaymentConfirmationEmail(orderId) {
    assertConfigured();
    const data = await loadOrder(orderId);
    if (!data) return { skipped: true, reason: "ORDER_EMAIL_UNAVAILABLE" };
    const { order } = data;
    const orderUrl = `${frontendUrl}/orders`;
    const intro = `Khoản thanh toán ${formatMoney(order.TotalAmount)} cho đơn hàng #${order.OrderID} đã được ghi nhận thành công.`;
    const text = [
      `ShoeGroup - Xác nhận thanh toán đơn hàng #${order.OrderID}`,
      "",
      intro,
      textLine("Phương thức", order.PaymentMethod),
      textLine("Trạng thái", order.PaymentStatus),
      "",
      `Theo dõi đơn hàng: ${orderUrl}`,
    ].join("\n");
    const html = emailShell({
      eyebrow: `Đơn hàng #${order.OrderID}`,
      title: "Thanh toán thành công",
      intro,
      content: `<div style="padding:16px;background:#fafafa;border:1px solid #e5e5e5;border-radius:8px;font-size:14px;line-height:1.7;color:#525252;"><strong style="color:#171717;">Phương thức:</strong> ${escapeHtml(order.PaymentMethod)}<br><strong style="color:#171717;">Trạng thái:</strong> ${escapeHtml(order.PaymentStatus)}</div>`,
      actionUrl: orderUrl,
      actionLabel: "Xem đơn hàng",
      footer: "Đây là email giao dịch tự động xác nhận thanh toán từ ShoeGroup, không chứa nội dung quảng cáo.",
    });
    return sendTransactional({
      to: order.Email,
      subject: `ShoeGroup xác nhận thanh toán đơn hàng #${order.OrderID}`,
      text,
      html,
      reference: `order-paid:${order.OrderID}`,
    });
  }

  return {
    isConfigured,
    sender: fromAddress,
    verify,
    sendPasswordResetEmail,
    sendOrderConfirmationEmail,
    sendPaymentConfirmationEmail,
  };
}

module.exports = { createEmailService, escapeHtml, formatMoney };
