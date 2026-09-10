const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim();
export function recognizedOrderRevenue(order, returns = []) {
  const flag = order.is_counted_as_revenue ?? order.IsCountedAsRevenue;
  if (![true,1,'1'].includes(flag) || normalize(order.status) !== 'da nhan hang'
    || normalize(order.payment_status) !== 'da thanh toan') return 0;
  const refunded = returns.filter(row => String(row.order_id ?? row.OrderID) === String(order.id ?? order.OrderID)
    && (row.refunded_at || row.RefundedAt)).reduce((sum,row)=>sum + Number(row.refund_amount ?? row.RefundAmount ?? 0),0);
  return Math.max(0, Number(order.total ?? order.TotalAmount ?? 0) - refunded);
}
