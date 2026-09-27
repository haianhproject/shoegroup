const test = require("node:test");
const assert = require("node:assert/strict");
const { createEmailService } = require("../src/email");

function fixture() {
  const sent = [];
  const transporter = {
    async verify() { return true; },
    async sendMail(message) { sent.push(message); return { messageId: "test-message" }; },
  };
  const pool = {
    request() {
      return {
        input() { return this; },
        async query(query) {
          if (query.includes("FROM Orders o")) {
            return { recordset: [{
              OrderID: 42,
              TotalAmount: 575000,
              ShippingFee: 75000,
              DiscountAmount: 0,
              ShippingAddress: "123 Đường A, Hồ Chí Minh",
              CustomerName: "Hải Anh",
              CustomerPhone: "0901234567",
              PaymentMethod: "Chuyển khoản ngân hàng",
              PaymentStatus: "Đã thanh toán",
              EstimatedDeliveryText: "4-5 ngày",
              Email: "customer@example.com",
            }] };
          }
          return { recordset: [{
            ProductName: "Giày 6",
            Quantity: 1,
            UnitPrice: 500000,
            Size: "39",
            Color: "Xanh lá",
          }] };
        },
      };
    },
  };
  const service = createEmailService({
    config: {
      frontendUrl: "https://shop.example.com/",
      mail: {
        user: "sender@gmail.com",
        pass: "app-password",
        fromName: "ShoeGroup",
        fromAddress: "sender@gmail.com",
        replyTo: "support@example.com",
      },
    },
    pool,
    sql: { Int: "int" },
    transporter,
  });
  return { service, sent };
}

test("password reset email is transactional and does not pretend to be a mailing list", async () => {
  const { service, sent } = fixture();
  await service.sendPasswordResetEmail({
    to: "customer@example.com",
    resetLink: "https://shop.example.com/reset-password?token=secret",
    token: "secret",
  });

  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].from, { name: "ShoeGroup", address: "sender@gmail.com" });
  assert.equal(sent[0].headers["List-Unsubscribe"], undefined);
  assert.equal(sent[0].headers["List-Unsubscribe-Post"], undefined);
  assert.equal(sent[0].headers["Auto-Submitted"], "auto-generated");
  assert.match(sent[0].text, /có hiệu lực trong 1 giờ/);
  assert.match(sent[0].html, /background:#0e0e0e/);
});

test("order email uses the authenticated account email loaded from the database", async () => {
  const { service, sent } = fixture();
  await service.sendOrderConfirmationEmail(42);

  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "customer@example.com");
  assert.equal(sent[0].subject, "ShoeGroup đã nhận đơn hàng #42");
  assert.match(sent[0].text, /Giày 6 \(size 39, Xanh lá\) x1/);
  assert.match(sent[0].html, /575\.000 đ/);
  assert.match(sent[0].html, /https:\/\/shop\.example\.com\/orders/);
});

test("payment email contains the server-side amount and paid status", async () => {
  const { service, sent } = fixture();
  await service.sendPaymentConfirmationEmail(42);

  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /xác nhận thanh toán đơn hàng #42/);
  assert.match(sent[0].text, /575\.000 đ/);
  assert.match(sent[0].text, /Đã thanh toán/);
});

test("email service refuses to send when credentials are absent", async () => {
  const service = createEmailService({ config: { mail: {}, frontendUrl: "http://localhost:3000" } });
  await assert.rejects(
    service.sendPasswordResetEmail({ to: "customer@example.com", resetLink: "http://localhost/reset", token: "x" }),
    (error) => error.code === "EMAIL_NOT_CONFIGURED",
  );
});
