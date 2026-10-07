# Dọn chức năng đã bỏ — 04/10/2026

Đã áp dụng trực tiếp vào `ShoegroupDB` theo yêu cầu: bỏ trang kho riêng, ví,
bộ sưu tập và trả hàng. Người dùng đã đính chính giữ giỏ hàng.

## Database

- Xóa `Collections`, `Products.CollectionID` và khóa ngoại liên quan.
- Xóa `ShoeGroupWallets`, `ShoeGroupWalletTransactions`, `ShoeGroupWalletWithdrawals`.
- Xóa `Returns`, `ReturnDetails`, `PostOffices` (bưu cục chỉ dùng cho trả hàng).
- Giữ `Carts`, `CartItems`, `PosCarts`, `PosCartItems` và tồn kho trong `ProductVariants`.
- Trước khi xóa, chuyển tổng tiền đã hoàn sang `Orders.HistoricalRefundAmount`
  và số lượng đã trả sang `OrderDetails.HistoricalReturnedQuantity` để báo cáo
  giữ nguyên số liệu lịch sử: 3.099.997 đồng và 15 sản phẩm.
- Không sửa lịch sử thanh toán, trạng thái đơn hoặc cộng/trừ lại tồn kho.

## Sao lưu và triển khai

Đã tạo bản sao lưu SQL Server `COPY_ONLY, CHECKSUM` và chạy `RESTORE VERIFYONLY`:

`C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\Backup\ShoegroupDB_before_feature_cleanup_1791106229184.bak`

Khi áp dụng cho database khác: sao lưu trước, chạy
`database/migrations/20261004_revenue_history.sql`, triển khai code mới rồi chạy
`database/migrations/20261004_remove_retired_features.sql` trong thời gian ngừng ghi dữ liệu.
Migration xóa bảng chạy thủ công; startup chỉ chạy migration giữ số liệu lịch sử.
Các SQL dump cũ là bản lưu lịch sử, không phải schema hiện hành.

## Code và kiểm tra

Đã bỏ các trang, route, state, biểu mẫu và API của các chức năng trên; bỏ cơ chế
tự tạo lại bảng ví khi khởi động. API đọc tồn kho vẫn phục vụ sản phẩm và POS.

Build frontend thành công; 56 kiểm tra nhanh hiện có về thanh toán, quyền truy cập,
khởi tạo database, frontend và POS đều đạt. API sản phẩm, đơn hàng, tồn kho,
doanh thu theo sản phẩm và biểu đồ trả 200; API collections/returns/wallet trả 404.
Đã đối chiếu tồn kho và giỏ POS trước/sau khi xóa: không thay đổi.
