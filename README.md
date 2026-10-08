# ShoeGroup

Vue 3 + Spring Boot + SQL Server. 76/76 API có xử lý Java.
Chạy ứng dụng bằng `npm run dev`: Vue tại http://localhost:3000, Spring tại http://localhost:5000.

## Tìm Code

| Phần mềm | Nơi chứa code |
| --- | --- |
| Trang khách hàng | `frontend/src/views/` |
| Trang quản trị | `frontend/src/views/admin/pages/` |
| Khung giao diện, thành phần dùng chung | `frontend/src/App.vue`, `frontend/src/components/` |
| Điều hướng và quyền vào trang | `frontend/src/router/`, `frontend/src/views/admin/adminRoutes.js` |
| Nghiệp vụ frontend | `frontend/src/services/`, `frontend/src/stores/`, `frontend/src/views/admin/adminStore.js` |
| Điểm khởi động Spring | `backend/src/main/java/vn/shoegroup/ShoeGroupApplication.java` |
| Đăng nhập, mật khẩu, phân quyền | `backend/src/main/java/vn/shoegroup/auth/`, `security/` |
| Sản phẩm, thuộc tính, khuyến mãi | `backend/src/main/java/vn/shoegroup/catalog/` |
| Đặt đơn, thanh toán, tồn kho đơn hàng | `backend/src/main/java/vn/shoegroup/orders/` |
| Giỏ tại quầy | `backend/src/main/java/vn/shoegroup/pos/` |
| Tài khoản, địa chỉ, giỏ online | `backend/src/main/java/vn/shoegroup/customer/` |
| Vận chuyển, cập nhật trực tiếp | `backend/src/main/java/vn/shoegroup/shipping/`, `events/` |
| Cấu trúc và cập nhật database | `database/` |
| Ảnh và video đang dùng | `frontend/img/`, `frontend/src/assets/brands/` |

Đầu mỗi file code có chú thích tiếng Việt mô tả vai trò của file.
Ảnh/video là file nhị phân; JSON phải giữ đúng cú pháp nên không chèn chú thích vào các file này.

## Cấu Hình Và Dữ Liệu

| File | Công dụng |
| --- | --- |
| `package.json`, `frontend/package.json` | Khai báo thư viện và lệnh chạy/build/test |
| Các `package-lock.json` | Khóa phiên bản thư viện để cài đặt nhất quán |
| `backend/pom.xml` | Thư viện Java và cách đóng gói Spring |
| `backend/.env`, `backend/.env.example` | Cấu hình SQL Server, JWT, email và ngân hàng; file thật không commit |
| `backend/src/main/resources/application.properties` | Cấu hình chạy Spring |
| `read-queries.json`, `order-queries.json` trong resources | Truy vấn SQL dùng bởi các API Java |
| `order-rules.json`, `shipping-distances.json` trong resources | Quy tắc trạng thái đơn và khoảng cách tính phí giao hàng |
| `backend/API-INVENTORY.json` | Danh sách 76 API dùng trong kiểm thử controller Java |
| `database/ShoegroupDB_FULL_20260929.sql` | Bản SQL để cài database và tạo schema kiểm thử; giữ nguyên mã hóa gốc |
| `database/migrations/` | Các bản cập nhật SQL; script ghi thủ công không tự chạy lúc khởi động |
| `.vscode/settings.json`, `.gitignore` | Ẩn/bỏ qua thư viện, build và dữ liệu cục bộ |

## Chạy Và Kiểm Tra

Cần Node.js 22+, JDK 17+ và SQL Server. Lần đầu dùng `npm run setup`,
cấu hình `backend/.env` theo file mẫu. Maven được chuẩn bị trong `tools/.cache/`.

`npm run dev` khởi động Spring rồi Vue khi SQL đã kết nối.
`npm run build` build frontend; `npm run build:api` build Spring.
`npm test`, `npm run test:spring:sql`, `npm run test:spring:pos` kiểm tra phần mềm.
Kiểm thử SQL/POS dùng database riêng; kiểm thử POS cần JAR đã build.

`backend/legacy-express/` chỉ phục vụ đối chiếu trong kiểm thử, không chạy cùng ứng dụng.
`node_modules/`, `frontend/dist/`, `backend/target/` và `tools/.cache/`
là thư viện/build cần dùng, được ẩn trong VS Code. Tiến độ mới nhất: [MIGRATION.md](MIGRATION.md).
