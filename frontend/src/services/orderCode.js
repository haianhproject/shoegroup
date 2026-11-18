// Mục đích: Tạo cùng một mã đơn cho giao diện khách hàng, quản trị và hóa đơn.
export function formatOrderCode(orderId, createdAt) {
  const id = Number(orderId) || 0;
  const date = createdAt ? new Date(createdAt) : new Date();
  const ymd = String(date.getFullYear()).slice(2)
    + String(date.getMonth() + 1).padStart(2, '0')
    + String(date.getDate()).padStart(2, '0');
  const sequence = String(id).padStart(5, '0');
  const check = String.fromCharCode(65 + ((id * 7 + 3) % 26))
    + String((id * 13 + 7) % 10);
  return 'SGVN' + ymd + sequence + check;
}
