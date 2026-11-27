// Mục đích: Đối chiếu Express: quy tắc doanh thu sau nhận hàng và khoản hoàn lịch sử.
// Chỉ ghi nhận đơn giao thành công đã thu tiền; giữ tương thích trạng thái nhận hàng cũ.
const recognizedWhere = `ISNULL(o.IsCountedAsRevenue,0)=1
  AND o.Status IN (N'Đã giao hàng thành công',N'Da giao hang thanh cong',N'Đã giao',N'Da giao',N'Delivered',N'Đã nhận hàng',N'Da nhan hang',N'Received',N'Hoàn thành',N'Hoàn tất',N'Completed')
  AND o.PaymentStatus IN (N'Đã thanh toán',N'Da thanh toan')`;
const refundJoin = '';
const netAmount = `CASE WHEN o.TotalAmount>o.HistoricalRefundAmount+o.ReturnAdjustmentAmount THEN o.TotalAmount-o.HistoricalRefundAmount-o.ReturnAdjustmentAmount ELSE 0 END`;
module.exports = { recognizedWhere, refundJoin, netAmount };
