# ERD ShoeGroup

Bộ sơ đồ hoàn chỉnh để trình bày cơ sở dữ liệu ShoeGroup với giáo viên.
Tên bảng và thuộc tính giữ nguyên theo database, kèm diễn giải tiếng Việt.

## File sử dụng

- [Draw.io một trang để xem và chỉnh sửa](ERD-ShoeGroup-Hoan-Chinh.drawio)
- [Chi tiết khóa ngoại và ràng buộc](ERD-KhoaNgoai.md)
- [Metadata cấu trúc cơ sở dữ liệu](schema.json)

Mở `.drawio` bằng Draw.io hoặc diagrams.net qua **File → Open From → Device**.
File `.drawio` là nguồn chỉnh sửa, không phải ảnh hay PDF.

## Nội dung

Tất cả nằm trên một trang duy nhất, như Database Diagram:
25 bảng nghiệp vụ, bảng kỹ thuật `AppMigrations`, 226 thuộc tính và 31 khóa ngoại.
Mỗi bảng chỉ xuất hiện một lần. Toàn bộ đường nối giữa các bảng nằm trên cùng trang.
`AppMigrations` không có khóa ngoại trong database nên không có đường nối.

PK: khóa chính; FK: khóa ngoại; UQ: duy nhất; AI: tự tăng.
NULL / NOT NULL cho biết thuộc tính được phép / không được phép bỏ trống.
Trong quan hệ chân quạ, vòng tròn biểu thị 0, vạch biểu thị 1 và chân quạ biểu thị nhiều.
Các thuộc tính cùng được đánh dấu PK trong một bảng tạo thành khóa chính ghép.
Sơ đồ chứa toàn bộ 31 FK vật lý; không suy diễn FK chỉ từ tên cột.

Schema đã đối chiếu trực tiếp với SQL Server ngày 07/10/2026.
`sysdiagrams` là hạ tầng SSMS, không thuộc ERD nghiệp vụ.

## Tạo lại

Đọc database đã cấu hình trong `backend/.env`:

```powershell
node backend/tools/export-erd.cjs
```

Hoặc tạo lại từ metadata đã lưu:

```powershell
node backend/tools/export-erd.cjs --schema diagrams/erd/schema.json
```

Script dùng `backend/tools/erd-labels.vi.json` để giữ tên tiếng Việt.
Chỉ giữ một file Draw.io chính thức trong thư mục này.
