// Preserve the existing 14-day/received recognition rule. Never recognize
// unpaid, cancelled or fully returned orders merely because a flag is stale.
const recognizedWhere = `ISNULL(o.IsCountedAsRevenue,0)=1
  AND o.Status IN (N'Đã nhận hàng',N'Da nhan hang')
  AND o.PaymentStatus IN (N'Đã thanh toán',N'Da thanh toan')`;
const refundJoin = '';
const netAmount = `CASE WHEN o.TotalAmount>o.HistoricalRefundAmount THEN o.TotalAmount-o.HistoricalRefundAmount ELSE 0 END`;
module.exports = { recognizedWhere, refundJoin, netAmount };
