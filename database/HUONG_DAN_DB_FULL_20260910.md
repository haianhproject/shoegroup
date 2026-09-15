# Database ShoeGroup đầy đủ — 10/09/2026

File cần gửi sang máy khác: **`ShoegroupDB_FULL_20260910.sql`**. Đây là một file cài đặt độc lập, có sẵn cấu trúc, dữ liệu và các bản vá hiện có trong dự án; không cần chạy thêm `dbsql.sql`, `dbhientai.sql` hay từng migration.

**File sẽ xóa vĩnh viễn `ShoegroupDB` cũ trên SQL Server đang kết nối rồi tạo lại. Chỉ chạy trên máy nhận bản cài đặt; sao lưu trước nếu máy đó có dữ liệu cần giữ.** Database nguồn trên máy phát triển không bị thay đổi trong quá trình tạo và kiểm thử bản này.

## Chạy trên máy nhận

1. Cài SQL Server 2017 trở lên và SQL Server Management Studio (SSMS). Bản này đã được kiểm thử thực tế trên SQL Server 2022.
2. Tắt backend ShoeGroup trên máy nhận. Kết nối SSMS vào đúng SQL Server bằng tài khoản có quyền tạo/xóa database, chẳng hạn tài khoản quản trị SQL.
3. Mở `ShoegroupDB_FULL_20260910.sql`, không bôi chọn riêng một đoạn, bấm **Execute / F5 một lần**. Không cần bật SQLCMD Mode.
4. Khi hoàn tất, bảng kết quả sẽ hiện `HOAN TAT - ShoegroupDB da san sang`, **46 bảng, 577 dòng dữ liệu, 36 chỉ mục bổ sung**.

Script tự dùng thư mục dữ liệu mặc định của SQL Server trên máy nhận; không phụ thuộc đường dẫn ổ đĩa hoặc tài khoản SQL của máy nguồn. Nếu nạp dữ liệu gặp lỗi, script dừng và rollback phần tạo bảng/nạp dữ liệu, không báo thành công. Bước DROP database cũ không thể được hoàn tác bằng rollback đó.

## Kết nối ứng dụng

Chép cùng **mã nguồn ShoeGroup mới nhất** sang máy nhận để có các sửa đổi giao diện đăng xuất và ảnh sản phẩm. Các sửa đổi Vue nằm trong mã nguồn, không nằm trong SQL.

Tạo `backend/.env` từ `backend/.env.example` nếu chưa có, rồi điền cấu hình của **máy nhận**:

```dotenv
DB_SERVER=127.0.0.1
DB_NAME=ShoegroupDB
DB_USER=ten_dang_nhap_sql_tren_may_nhan
DB_PASS=mat_khau_sql_tren_may_nhan
DB_ENCRYPT=false
DB_TRUST_CERT=true
DB_USE_UTC=false
PORT=5000
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173
```

`DB_SERVER` phải trỏ đến instance vừa chạy file SQL; `127.0.0.1` chỉ là ví dụ cho SQL Server mặc định trên máy nhận. Backend dùng SQL Authentication: login cần được bật và có quyền truy cập database mới. Điền `JWT_SECRET` theo hướng dẫn trong file mẫu. Dùng múi giờ UTC+07 cho máy chạy SQL Server và Node để giữ đúng các thời điểm lịch sử.

Từ thư mục gốc dự án, cài thư viện nếu chưa cài rồi khởi động một lần:

```powershell
npm run setup
npm run dev
```

Mở `http://localhost:3000`. Tài khoản ứng dụng và mật khẩu hiện có được giữ nguyên, không đặt lại. Cấu hình gửi email dùng cấu hình riêng của máy nhận. Nếu cổng 3000 đã có ShoeGroup chạy, dùng phiên đang chạy hoặc dừng phiên đó trước khi chạy lại lệnh dev.

## Những phần đã bổ sung so với `dbhientai.sql`

| Nội dung | Kết quả |
| --- | --- |
| Tạo lại database | Có DROP/CREATE, dùng đường dẫn mặc định của máy nhận |
| Dữ liệu | Giữ đủ 46 bảng, 577 dòng, gồm 5 bảng `bak_*`, ảnh lưu trong DB, tài khoản và lịch sử |
| Chỉ mục | Bổ sung đủ 36 chỉ mục thường/unique filtered đang có trên database nguồn |
| Thông báo đơn hàng | Khôi phục `trg_Orders_StatusChange_Notify` |
| Chống tạo đơn trùng | Khôi phục `Latin1_General_100_BIN2` cho `CheckoutRequests.IdempotencyKey` |
| Bộ đếm tự tăng | Giữ `IDENTITY last_value`, kể cả khoảng trống do ID đã xóa |
| Ràng buộc | Xác thực lại 8 khóa ngoại chưa trusted; toàn bộ 61 FK và 18 CHECK đều bật và trusted |
| Bản vá | Gộp đủ 7 migration từ 26/08–09/09/2026, ví ShoeGroup và backfill lý do hủy đơn từ backend |

Bao gồm các bản vá luồng bán hàng, avatar, vận chuyển tiêu chuẩn, tồn kho, chống checkout trùng, ghi nhận sử dụng mã giảm giá, kiểm tra số tiền/số lượng, chống giao dịch thanh toán và hoàn ví trùng, cùng procedure xử lý đơn mới nhất. Các bảng đang rỗng vẫn được giữ đúng theo bản nguồn. Những ảnh lịch sử dùng URL bên ngoài vẫn giữ URL gốc và cần Internet để tải.

Đã kiểm thử tạo mới và DROP/CREATE lần hai trong database `ShoegroupAudit_*`: hash dữ liệu từng bảng khớp nguồn; cấu trúc cột, chỉ mục, view, procedure, trigger và bộ đếm ID khớp; `DBCC CHECKDB` và `DBCC CHECKCONSTRAINTS` đều đạt. Đã thử từ chối tồn kho âm, checkout/giao dịch trùng, phân biệt khóa checkout hoa/thường, trigger thông báo và rollback khi cố tình gây lỗi nạp. Database kiểm thử đã được xóa sau khi hoàn tất.

Kết quả chi tiết và SHA-256 của file đã kiểm thử nằm trong `ShoegroupDB_FULL_20260910.verify.json`.
