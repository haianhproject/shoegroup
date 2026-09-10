// Preserve the existing 14-day/received recognition rule. Never recognize
// unpaid, cancelled or fully returned orders merely because a flag is stale.
const recognizedWhere = `ISNULL(o.IsCountedAsRevenue,0)=1
  AND o.Status IN (N'Đã nhận hàng',N'Da nhan hang')
  AND o.PaymentStatus IN (N'Đã thanh toán',N'Da thanh toan')`;
const refundJoin = `OUTER APPLY (SELECT ISNULL(SUM(r.RefundAmount),0) AS amount
  FROM Returns r WHERE r.OrderID=o.OrderID AND r.RefundedAt IS NOT NULL) refunds`;
const netAmount = `CASE WHEN o.TotalAmount>refunds.amount THEN o.TotalAmount-refunds.amount ELSE 0 END`;
module.exports = { recognizedWhere, refundJoin, netAmount };
