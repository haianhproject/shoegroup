# Tiến Độ ShoeGroup

Cập nhật: 2026-10-07. Backend đã chuyển 76/76 API sang Spring Boot.
Ứng dụng chạy Spring + Vue + SQL Server, không chuyển tiếp API sang Express.

## Đã Hoàn Thành

- Giữ URL và dữ liệu API tương thích Vue, mật khẩu scrypt/bcrypt và JWT hiện có.
- Kiểm tra quyền/tình trạng tài khoản từ database; bảo vệ chủ sở hữu đơn và quản trị viên cuối cùng.
- Checkout dùng transaction, khóa SQL và Idempotency-Key; giữ phản hồi để chống tạo đơn trùng.
- Giỏ POS giữ tồn thật; đơn online trừ tồn khi xác nhận; hủy đơn hoàn tồn một lần.
- Java xử lý sản phẩm, khách hàng, khuyến mãi, báo cáo, thanh toán và vòng đời đơn.
- Spring thực hiện migrations runtime, tác vụ tự động, email sau commit và SSE.
- Kiểm thử trước dọn file: frontend 53/53, bộ đối chiếu Express 29/29, Java/SQL 28/28,
  đầu cuối POS/đơn hàng 28/28; build Vue và Spring thành công.
- Khởi động thực tế: Vue 3000, Spring 5000 kết nối SQL; Express 5001 đã tắt.
- Chưa xác minh gửi email qua SMTP thật, đối soát ngân hàng và tải production.
  Hoàn tiền thủ công vẫn chờ xác minh; hành vi khách xác nhận chuyển khoản được giữ như trước.

## Dọn File Và Chú Thích

- Bỏ script trích xuất migration, tạo sơ đồ và các audit Express cũ không còn sử dụng.
- Đưa báo cáo/sơ đồ/kết quả audit, bản SQL 20260910, nguồn media thiết kế cũ,
  dữ liệu làm việc và node_modules dư ở gốc ra khỏi dự án.
- Cơ chế bảo vệ chặn xóa hàng loạt; các file trên được chuyển đến
  `E:/VS Code/shoegroup-removed-20261007/` ngoài repository để có thể khôi phục.
- Giữ SQL 20260929, migrations, .env, thư viện đang dùng, ảnh/video website và kiểm thử.
- Bổ sung chú thích tiếng Việt ở đầu các file code/cấu hình hỗ trợ comment;
  công dụng JSON, lockfile, SQL mã hóa gốc và media được giải thích trong README.
- Chú thích cũ trên các trang Vue được giữ, bổ sung các file còn thiếu.
- Đã kiểm tra đủ 181 file code/SQL/SVG có mô tả mục đích ở phần đầu; bổ sung 124 chú thích mới.
- Sau dọn file: frontend 53/53, bộ đối chiếu 29/29 và 13 kiểm thử Java đạt.
  Build Vue/Spring thành công; 69 module frontend đều được dùng, không thiếu import.
  15 bài SQL được bỏ qua trong build thường; kết quả chạy database thật trước đó là 15/15.

## Sửa Lỗi Ngắt Kết Nối SSE

- Log người dùng gửi: lần chạy đầu cổng 5000 đã bị chiếm; lần sau Spring/Vue khởi động thành công.
- Khi trình duyệt ngắt kết nối SSE, IOException bị xử lý thành JSON 500 trên response text/event-stream,
  gây lỗi phụ HttpMessageNotWritableException và stack trace dài.
- Xử lý ngắt kết nối mà không ghi JSON vào stream; lỗi API thông thường vẫn trả JSON với mã HTTP đúng.
- Giải phóng slot SSE ngay khi gửi thất bại, để kết nối đã ngắt không chiếm giới hạn 16 khách.
- Thông báo cổng đang dùng có hướng dẫn mở ứng dụng hoặc dừng phiên cũ bằng Ctrl+C.
- Build Spring đạt; 18 kiểm thử Java chạy đạt, gồm 5 bài mới cho SSE/xử lý lỗi.
  15 bài SQL không chạy trong build thường. Phiên ứng dụng đang mở cần khởi động lại để nạp code mới.
