# Prompt cập nhật chức năng và báo cáo ShoeGroup

Rà soát dự án ShoeGroup hiện tại và chỉ sửa các chức năng chưa hoạt động, hoạt động sai hoặc đang phát sinh lỗi. Không thiết kế lại những phần giao diện đã được sửa và đang hoạt động đúng.

## 1. Đơn hàng và thanh toán

- Xóa câu hướng dẫn thừa: “Ưu tiên xử lý những đơn được đặt trước trong hàng đợi.”
- Giữ nguyên giao diện đã hoàn thiện; chỉ sửa lỗi tải dữ liệu, chuyển trạng thái, thanh toán hoặc hiển thị chi tiết nếu các luồng này chưa hoạt động đúng.

## 2. Bán hàng tại quầy

- Với khách lẻ, không hiển thị và không yêu cầu nút lưu khách lẻ.
- Khi nhân viên đặt đơn, thông tin khách lẻ và đơn hàng phải được lưu tự động.
- Sau khi thanh toán thành công, hệ thống phải tự tạo trạng thái đã thanh toán, xuất hóa đơn và mở phần hiển thị hóa đơn để nhân viên có thể xem hoặc in.
- Phân biệt rõ các trạng thái: tạo đơn thành công, thanh toán thành công và hóa đơn đã được tạo.

## 3. Sản phẩm và giảm giá biến thể

- Bỏ trường hoặc luồng “giá giảm” ở cấp sản phẩm.
- Giảm giá được quản lý tại biến thể màu của sản phẩm, không phải voucher.
- Mỗi giảm giá biến thể hỗ trợ hai kiểu:
  - Giá giảm cố định: đặt giá bán mới cho biến thể màu.
  - Giảm theo phần trăm: tính giá bán mới từ giá gốc của biến thể màu.
- Giá gốc của sản phẩm hoặc biến thể vẫn được giữ để đối chiếu; giá bán thực tế phải lấy từ giảm giá biến thể đang còn hiệu lực.
- Kiểm tra và sửa toàn bộ luồng giảm giá biến thể màu từ giao diện, store/API đến cơ sở dữ liệu. Chỉ bổ sung migration hoặc bảng/cột nếu cơ sở dữ liệu hiện tại thực sự thiếu.

## 4. Tồn kho

- Xóa mục điều hướng và màn hình quản lý kho độc lập khỏi khu vực quản trị.
- Dự án chỉ quản lý số lượng tồn kho tại phần sản phẩm và các biến thể sản phẩm.
- Không xóa dữ liệu tồn kho cần cho kiểm tra số lượng, đặt hàng và thanh toán.

## 5. Báo cáo đồ án

- Đổi toàn bộ nội dung dự án mẫu Meow hoặc MeowShop thành dự án ShoeGroup bán giày.
- Căn phần mục lục thành một khối cân giữa trang theo bố cục của PDF mẫu; tiêu đề “MỤC LỤC” vẫn căn giữa, các dòng mục lục giữ căn trái và số trang căn phải.
- Xóa các ảnh, sơ đồ và ảnh chụp màn hình của dự án mẫu. Không tự vẽ lại sơ đồ.
- Tại mỗi vị trí ảnh cũ, để một vùng trống dễ nhận biết cùng chú thích dạng “[CHÈN ẢNH: tên ảnh hoặc màn hình cần chèn]”.
- Chỉ giữ hoặc tạo các đề mục liên quan đến ShoeGroup và các chức năng đang có trong dự án.
- Nội dung báo cáo phải phản ánh đúng các thay đổi ở trên, đặc biệt là bán hàng tại quầy, hóa đơn sau thanh toán, tồn kho trong biến thể sản phẩm và giảm giá biến thể màu.

## Yêu cầu kiểm tra

- Chạy các bài kiểm thử liên quan và build dự án sau khi sửa.
- Không báo hoàn thành nếu luồng giao diện, API và dữ liệu chưa thống nhất.
- Ghi rõ phần nào đã sửa, phần nào vốn đã hoạt động đúng và phần nào còn phụ thuộc cấu hình hoặc dữ liệu bên ngoài.
