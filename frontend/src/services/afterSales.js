// Hợp đồng dữ liệu hậu mãi dùng chung cho khách hàng và quản lý.
import { api } from './apiClient'
export const returnStatuses = {
  REQUESTED: 'Chờ duyệt', APPROVED: 'Chờ nhận hàng', REFUND_PENDING: 'Chờ hoàn tiền',
  COMPLETED: 'Đã hoàn tất', REJECTED: 'Đã từ chối',
}
export const formatAfterSalesMoney = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 }).format(Number(value) || 0)
export const afterSalesApi = {
  detail: (id, options) => api.get(`/orders/${id}/after-sales`, options),
  request: (id, body) => api.post(`/orders/${id}/returns`, body),
  list: (scope, q = '') => api.get(`/returns?scope=${encodeURIComponent(scope)}&q=${encodeURIComponent(q)}`),
  review: (id, body) => api.post(`/returns/${id}/review`, body),
  receive: (id, body) => api.post(`/returns/${id}/receive`, body),
  warehouse: (id, body) => api.post(`/orders/${id}/warehouse-return`, body),
  refund: (id, transaction, body) => api.post(`/orders/${id}/refunds/${transaction}/confirm`, body),
  damaged: () => api.get('/inventory/damaged'),
  resolve: (id, body) => api.post(`/inventory/damaged/${id}/resolve`, body),
}

export function validateInspection(lines, wholeParcel = false) {
  let total = 0
  for (const line of lines) {
    const good = Number(line.good_quantity), damaged = Number(line.damaged_quantity)
    const expected = Number(line.expected_quantity)
    if (![good, damaged, expected].every(Number.isSafeInteger) || good < 0 || damaged < 0 || expected <= 0
      || good + damaged > expected || (wholeParcel && good + damaged !== expected)) return false
    total += good + damaged
  }
  return lines.length > 0 && total > 0
}
