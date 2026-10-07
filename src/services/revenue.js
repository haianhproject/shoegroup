// Mục đích: Tính doanh thu hợp lệ phía frontend sau khi xét trạng thái đơn và khoản hoàn lịch sử.
const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim();
export function recognizedOrderRevenue(order) {
  const flag = order.is_counted_as_revenue ?? order.IsCountedAsRevenue;
  if (![true,1,'1'].includes(flag) || normalize(order.status) !== 'da nhan hang'
    || normalize(order.payment_status) !== 'da thanh toan') return 0;
  const refunded = Number(order.historical_refund_amount ?? order.HistoricalRefundAmount ?? 0);
  return Math.max(0, Number(order.total ?? order.TotalAmount ?? 0) - refunded);
}
