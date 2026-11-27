# ShoeGroup

Vue 3 + Spring Boot + SQL Server. Các API trong `backend/API-INVENTORY.json` đều có xử lý Java.
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
| Sản phẩm, thuộc tính, khuyến mại | `backend/src/main/java/vn/shoegroup/catalog/` |
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
| `backend/API-INVENTORY.json` | Danh sách API dùng trong kiểm thử controller Java |
| `database/ShoegroupDB_FULL_20261128.sql` | DB đầy đủ mới nhất, có lệnh xóa/tạo lại DB; dùng cho cả nhóm cập nhật |
| `backend/legacy-express/test/fixtures/legacy-schema.sql` | Chỉ cấu trúc gốc để kiểm thử migration; không chứa dữ liệu, không dùng cài DB |
| `database/migrations/` | Các bản cập nhật SQL; Spring chạy những bản đã đăng ký trong SchemaInitializer |
| `database/ERD.drawio`, `database/ERD.md`, `database/schema-current.json` | Sơ đồ và cấu trúc DB thực tế, xuất tự động từ SQL Server |
| `database/catalog-id-map-20261016.json` | Bảng đổi ID cũ sang mới và đường dẫn backup trước khi đổi |
| `.vscode/settings.json`, `.gitignore` | Ẩn/bỏ qua thư viện, build và dữ liệu cục bộ |

## Chạy Và Kiểm Tra

### Thay Database Cho Cả Nhóm

1. Lấy code mới từ `main`, dừng ứng dụng và sao lưu database riêng trước khi thay.
2. Mở `database/ShoegroupDB_FULL_20261128.sql` trong SSMS, kết nối SQL Server của mình rồi chạy toàn bộ file (F5). File **xóa hoàn toàn ShoegroupDB cũ**, tạo lại và nhập đủ cấu trúc/dữ liệu ngày 28/11/2026, gồm trả hàng, hoàn tiền và giỏ tại quầy; không cần đổi đường dẫn MDF/LDF.
3. Cấu hình `backend/.env` theo máy mình, để `DB_NAME=ShoegroupDB`; lần đầu chạy `npm run setup`, sau đó `npm run dev`. Spring tự kiểm tra các migration đã áp dụng.

Bản full có dữ liệu tài khoản/đơn hàng; chỉ chia sẻ với thành viên được phép. Không có mật khẩu kết nối SQL/JWT/SMTP từ `.env`.
Thư mục `database` chỉ giữ một bản full mới nhất để tránh nhập nhầm; các bản cũ nằm trong lịch sử Git. Bản ngày 28/11/2026 đã phục hồi và đối chiếu thành công trên SQL Server 2022: 32 bảng (gồm bảng hỗ trợ sơ đồ SSMS), toàn bộ dữ liệu từng dòng, bộ đếm ID, view, procedure, function, index và ràng buộc khớp bản sao DB nguồn tại thời điểm sao lưu. Giữ `migrations`, ERD và bảng đối chiếu ID; không cần chạy các migration thủ công sau khi nhập full.
Đã đánh lại ID thật của sản phẩm, biến thể và danh mục từ 1, giữ toàn bộ dữ liệu và liên kết. Dùng bản full mới nhất cùng code mới; frontend tự chuyển giỏ/fingerprint lưu trên trình duyệt sang phiên ID mới. Không trộn code cũ với DB mới.
`npm run db:verify` thử phục hồi bản full mới nhất vào DB riêng, đối chiếu rồi dọn DB thử; không thay DB đang dùng.
`npm run db:export` sao lưu `.bak`, phục hồi thành bản sao chỉ đọc và xuất SQL nhất quán từ bản sao này; máy xuất cần SMO 16 của SQL Server 2022 và quyền sao lưu/phục hồi DB. Công cụ tự thử nhập SQL vào DB riêng, đối chiếu với bản sao trước khi thay file full và dọn các DB tạm. Có thể xuất khi ứng dụng đang chạy. Nếu dùng `npm run db:verify` riêng, tránh thay dữ liệu DB nguồn trong lúc đối chiếu.

### Nâng Cấp Không Xóa Dữ Liệu

Đổi ID là thao tác một lần: `node backend/scripts/renumber-catalog-ids.cjs` chỉ kiểm tra; `--rehearse` thử trên bản DB riêng; `--apply` yêu cầu dừng Spring/Vue, tự backup, rehearsal và đối chiếu toàn bộ dữ liệu trước commit. DB hiện tại đã áp dụng, chạy lại không đổi mã. Không sử dụng công cụ này để tự động lấp các khoảng trống ID phát sinh về sau.

Dừng ứng dụng, chạy `node backend/scripts/order-migration.cjs --apply` để sao lưu, nâng cấp đơn hàng/voucher ngày 15/10 và cập nhật ERD. Không chạy bản full nếu cần giữ dữ liệu riêng của mình. Voucher cũ giới hạn 0 được chuyển thành NULL (không giới hạn); bản mới dùng 0 cho hết mã. Các bản full cũ đã bỏ khỏi thư mục làm việc, vẫn có thể tra cứu trong lịch sử Git.

Trước khi chạy bản tối ưu 2026-10-10 trên DB có dữ liệu, dùng
`node backend/scripts/catalog-migration.cjs --apply --erd` để sao lưu, cập nhật DB và đồng bộ ERD.
Chi tiết thay đổi và kiểm thử nằm trong `MIGRATION.md`.

Cần Node.js 22+, JDK 17+ và SQL Server. Lần đầu dùng `npm run setup`,
cấu hình `backend/.env` theo file mẫu. Maven được chuẩn bị trong `tools/.cache/`.

`npm run dev` khởi động Spring rồi Vue khi SQL đã kết nối.
`npm run build` build frontend; `npm run build:api` build Spring.
`npm test`, `npm run test:spring:sql`, `npm run test:spring:pos` kiểm tra phần mềm.
`npm run test:spring:after-sales` kiểm tra trả hàng, hoàn kho, hoàn tiền và chatbot bằng Spring/SQL riêng sau khi build JAR.
Kiểm thử SQL/POS dùng database riêng; kiểm thử POS cần JAR đã build.

`backend/legacy-express/` chỉ phục vụ đối chiếu trong kiểm thử, không chạy cùng ứng dụng.
Form liên hệ và yêu cầu nhận tin gửi email tới `EMAIL_REPLY_TO`, mặc định dùng hộp thư `EMAIL_USER`.
Các form này dùng cấu hình SMTP trong `backend/.env` và chỉ báo thành công sau khi máy chủ gửi được yêu cầu.
VietQR khi thanh toán online dùng cùng các biến `POS_BANK_*` trong `backend/.env` như tại quầy.
Khi thông tin ngân hàng chưa được cấu hình, trang thanh toán hiển thị số hỗ trợ để khách nhận hướng dẫn chuyển khoản.
`node_modules/`, `frontend/dist/`, `backend/target/` và `tools/.cache/`
là thư viện/build cần dùng, được ẩn trong VS Code. Tiến độ mới nhất: [MIGRATION.md](MIGRATION.md).

## Bán hàng tại quầy

Hóa đơn chờ hiển thị từ **#1** theo thứ tự tab, tách biệt với ID lưu trong database. Bấm **×** để đóng từng hóa đơn;
hóa đơn có sản phẩm cần xác nhận trước khi hoàn lại toàn bộ hàng đang giữ. Đóng tab khác giữ nguyên khách hàng và tiền nhập ở tab đang làm.
Đóng tab cuối tạo lại một hóa đơn trống. Hóa đơn đã thanh toán được giữ nguyên lịch sử, không xóa qua nút này.
**Tiền khách đưa** tự bằng tổng thanh toán, cập nhật theo số lượng và ưu đãi. Sau khi nhân viên sửa số tiền, hệ thống giữ giá trị riêng cho hóa đơn;
bấm **Dùng đúng số tiền** để trở về tự động. Tiền thừa được tính từ tiền khách đưa trừ tổng thanh toán.

## Trả hàng, hoàn kho và trợ lý cửa hàng

Đơn giao thất bại có hai hướng: **Hẹn giao lại** hoặc **Hoàn kho & hủy đơn** khi khách không nghe máy/bùng hàng.
Hoàn kho lấy toàn bộ số lượng từ đơn gốc, thực hiện đúng một lần. Đơn COD chưa thu tiền không phát sinh tiền hoàn hay doanh thu.
Đơn đã trả trước chọn **Tiền mặt** hoặc **Chuyển khoản** để ghi nhận hoàn tiền cùng thao tác hủy.
Đơn đã giao thành công sử dụng trang **Trả hàng & tiền hoàn**: nhập mã đơn, nhập số lượng từng sản phẩm cần trả,
chọn hình thức hoàn tiền và xác nhận. Số lượng 0 giữ nguyên sản phẩm; số trả không vượt phần còn được trả.
Không yêu cầu chứng từ, ô tích điều kiện hoặc phân loại hàng tốt/hỏng. Ghi chú là tùy chọn.
Khoản hoàn tính từ giá thực trả sau giảm giá; tùy chọn hoàn phí vận chuyển chỉ hiện khi nhận lại toàn bộ hàng còn lại.
Khách và quản lý đều xem được từng sản phẩm đã trả cùng số tiền và hình thức hoàn.
Nút xác nhận ghi nhận tiền cửa hàng đã hoàn; ứng dụng không tự chuyển khoản ngân hàng.
Các khoản chờ hoàn từ đơn hủy cũ vẫn được xử lý ở **Khoản chờ hoàn**, chỉ chọn hình thức và bấm **Xác nhận đã hoàn tiền**.
Giữ nguyên lịch sử và cấu trúc hàng hỏng/chứng từ cũ để không làm mất dữ liệu; giao diện mới không sử dụng các bước này.

Trợ lý ở góc trang khách dùng FAQ và dữ liệu thật để tìm giày theo tên/màu/size/ngân sách, tra đơn của tài khoản đang đăng nhập
và hướng dẫn chuyển hỗ trợ Zalo. Đây là chatbot tra cứu có ngữ cảnh, chưa dùng mô hình ngôn ngữ hoặc dịch vụ AI trả phí.
Hỏi **Phí giao hàng** rồi nhập tỉnh/thành (ví dụ Hà Nội, Đà Nẵng) hoặc chọn địa chỉ đã lưu của chính tài khoản.
Bot gọi cùng `ShippingService.quote` như checkout để báo phí tiêu chuẩn và thời gian dự kiến, trước ưu đãi trên đơn.
Nơi nhận chưa rõ hoặc có nhiều tỉnh/thành sẽ được hỏi lại; không lấy mức phí dự phòng làm báo giá cho một địa chỉ chưa xác định.
Hội thoại chỉ giữ trong bộ nhớ phiên trang, xóa khi đổi tài khoản; bot không tự hủy đơn, hoàn kho hay xác nhận thanh toán.
Migration `20261127_after_sales.sql` được Spring áp dụng tự động, giữ nguyên số liệu hoàn lịch sử và làm mới view sau khi thêm cột tồn hỏng.
Migration `20261127_return_workflow.sql` bổ sung nguồn tiếp nhận Zalo và chỉ mục tra dòng hàng, giữ các phiếu/chứng từ cũ.

Trong môi trường dev, frontend kiểm tra hợp đồng API qua `/health` trước khi nạp store. Nếu cổng mặc định 5000 còn chạy bản cũ,
frontend chỉ chọn 5001 khi đây là bản ShoeGroup tương thích và thông tin database/catalog khớp nếu bản cũ có cung cấp.
Việc chọn API diễn ra trước phiên làm việc; không gửi lại POST/PUT qua máy chủ khác. Khi backend 5000 đã được cập nhật, cổng này luôn được ưu tiên.
