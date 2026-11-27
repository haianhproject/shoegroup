// Một quy tắc dùng chung cho hàng chờ và số đơn cần xử lý trên thanh quản lý.
const normalize = value => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').trim().toLowerCase()
  .replace(/\s+/g, ' ');

const closedStatuses = new Set([
  'da giao', 'da giao hang thanh cong', 'delivered',
  'da nhan hang', 'received', 'hoan thanh', 'hoan tat', 'completed',
  'da huy', 'huy', 'cancelled', 'canceled',
  'da hoan tat tra hang', 'returned',
]);

export const isOrderInProgress = order => Number(order?.active_return_count || 0) > 0
  || Number(order?.pending_refund_amount || 0) > 0
  || !closedStatuses.has(normalize(order?.status));
