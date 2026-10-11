# Tiến Độ ShoeGroup

## Bản DB Full Và Bàn Giao Git - 2026-10-10

- Xuất `database/ShoegroupDB_FULL_20261010.sql` từ DB thật sau tối ưu và tích hợp Việt. Có cảnh báo cùng lệnh DROP/CREATE database, không dùng đường dẫn MDF/LDF cố định của máy xuất.
- Đã thử phục hồi vào database riêng: đủ 27 bảng; từng dòng dữ liệu, bộ đếm identity, cột, khóa/chỉ mục/ràng buộc và nội dung 4 view, 7 procedure, 1 function, 1 trigger khớp DB nguồn. Không có vi phạm ràng buộc.
- DB thật vẫn giữ 12 sản phẩm, 36 biến thể, 73 đơn, 81 dòng đơn và tồn 103; không chạy lệnh xóa/tạo lại trên DB đang dùng.
- Bản `.bak` cục bộ đã kiểm tra checksum/RESTORE VERIFYONLY: `C:/Program Files/Microsoft SQL Server/MSSQL16.SQLEXPRESS/MSSQL/Backup/ShoegroupDB_FULL_20261010_222541.bak` (không đưa `.bak` lên Git).
- Thêm `npm run db:export` và `npm run db:verify`; hướng dẫn thay DB nằm trong README. Giữ SQL ngày 29/09 vì bộ kiểm thử tương thích vẫn sử dụng.
- Phạm vi bàn giao lên `admin`/`main`: toàn bộ code hiện tại, migrations, ERD, bản SQL full mới và kiểm thử; loại `.env`, thư viện, file build, log và bản sao lưu nhị phân khỏi Git. Bản full có dữ liệu tài khoản/đơn nên chỉ chia sẻ trong nhóm được phép.
- Các ghi chú “chưa commit/push” bên dưới mô tả trạng thái trước đợt bàn giao này.

## Tích Hợp Nhánh Việt - 2026-10-10

- Đã lấy bản mới nhất `origin/vietdo`, commit `a0e586d` (20:10:14 ngày 10/10, `done nhiem vu 10/10`). So với tổ tiên chung với `admin`, nhánh này sửa 10 file frontend, không có thay đổi Spring/SQL.
- Tích hợp chọn lọc vào file đang làm trên nhánh `admin`; không đổi nhánh, không ghi đè phần Hải Anh, chưa tạo merge commit hoặc push.
- Nhánh Việt đã thêm kiểm tra trường bắt buộc, tìm kiếm ở nhiều danh mục, giao diện tài khoản và bỏ nhiều nút xóa. Tuy nhiên chưa đủ để kết luận hoàn thành toàn bộ nhiệm vụ đã giao.

### Xung Đột Giao Diện Và Cách Xử Lý

- Sản phẩm/kích cỡ: giữ bản hiện tại có giá từng biến thể, cùng giá, chọn nhiều size và bộ lọc EU/US/UK. Không lấy phần giao diện Việt còn giá cha hoặc làm mất tìm/lọc size; bổ sung kiểm tra trường bắt buộc, ID tăng dần và quyền chỉ xem.
- Thương hiệu: đổi dạng thẻ trong nhánh Việt sang danh sách theo yêu cầu giáo viên, có tìm kiếm, chỉnh sửa và công tắc trạng thái ngay trên dòng.
- Mã giảm giá: lấy bố cục danh sách nhưng sửa trạng thái đơn giản thành sắp diễn ra/hoạt động/không hoạt động/hết mã/đã kết thúc; bỏ cột loại, thêm mắt xem số lượt tổng/đã dùng/còn lại và khóa chỉnh sửa chương trình đã kết thúc.
- Tài khoản: giữ bố cục Việt, nối chọn vai trò với API thật và bỏ nhãn vai trò bị mờ/trùng. Danh mục/màu/chất liệu có công tắc trực tiếp; sửa ký tự Markdown thừa trong trang danh mục.

### Rà Soát Và Sửa Logic

- Sửa nhầm nhân viên thành RoleID=2 (khách hàng). Nhân viên dùng RoleID=3; Spring xác minh vai trò/tình trạng tài khoản từ DB, không tin vai trò do trình duyệt gửi.
- Nhân viên chỉ vào sản phẩm ở chế độ xem, đơn hàng/thanh toán và POS; không được sửa danh mục, quản trị tài khoản hoặc xem báo cáo quản trị. Có kiểm thử quyền API thật, không chỉ ẩn nút.
- Thêm migration `20261010_staff_role.sql`; giữ vai trò 3 hiện có là `Nhan vien`, chỉ thêm khi chưa tồn tại. Không đổi mật khẩu hoặc tự tạo tài khoản nhân viên trên DB thật.
- Tên nhân viên trên đơn lấy từ tài khoản đăng nhập ở máy chủ. Giữ transaction, khóa tồn, giỏ riêng/revision và Idempotency-Key; thử thanh toán lại không tạo đơn/trừ tồn hai lần.
- Bật/tắt sản phẩm dùng API riêng chỉ cập nhật trạng thái, không gửi lại giá/tồn từ bản chụp giao diện; ngừng sản phẩm cha vô hiệu hóa biến thể con. Khôi phục cha không tự bật mọi biến thể.
- API xóa danh mục chuyển thành ngừng hoạt động; chặn xóa cứng sản phẩm qua HTTP. Xóa mã giảm giá/khuyến mại tương thích cũng chỉ ngừng hoạt động và vẫn giữ lịch sử; chương trình đã kết thúc không được sửa. Không thay đổi API xóa địa chỉ khách hàng.
- Cho phép tắt khuyến mại chưa kết thúc khi sản phẩm cha đã ngừng hoạt động; bật lại vẫn kiểm tra phạm vi, sản phẩm/biến thể và thời gian chồng lấn.
- Công tắc mã giảm giá giữ nguyên giá trị, số lượt và ngày; ngày hết hạn nhập theo ngày được tính đến cuối ngày. `UsageLimit=0` cũ vẫn là không giới hạn, không tự biến thành hết mã; với giới hạn dương, còn 0 lượt thì hiển thị hết mã.
- Nhánh Việt không có các migration ERD đã giao cho Users/Roles/UserAddresses/Notifications/Carts/CartItems/CheckoutRequests. Không coi các đề xuất như bỏ Users.Address, duy nhất RoleName/địa chỉ mặc định hoặc ràng buộc giỏ là đã được Việt triển khai trong commit này; cần đối chiếu riêng trước khi thay DB.

### Kiểm Chứng Và Sao Lưu

- Frontend 66/66; Spring + SQL 37/37 (không bỏ qua); 13/13 kịch bản API catalog/POS, gồm nhân viên thật, phân quyền, chống đơn trùng, bảo toàn giá lịch sử, trạng thái và không xóa dữ liệu. Build Vue và Spring thành công.
- Giao diện 10 trang ở 1440px/390px cùng các form và quyền chỉ xem: không lỗi JavaScript/API hoặc tràn ngang toàn trang trong các luồng kiểm tra. Không thay thế kiểm thử tải production/SMTP/ngân hàng thật.
- DB thật sau tích hợp giữ 12 sản phẩm, 36 biến thể, 73 đơn, 81 dòng đơn; tồn 103, tổng UnitPrice × Quantity lịch sử 97.119.995 đồng. Spring 5000 kết nối SQL, Vue 3000 đang chạy.
- Sao lưu code trước tích hợp: `C:/Users/admin/AppData/Local/Temp/shoegroup-before-vietdo-20261010-214303` (patch và file chưa theo dõi).
- Sao lưu DB trước tích hợp: `C:/Program Files/Microsoft SQL Server/MSSQL16.SQLEXPRESS/MSSQL/Backup/ShoegroupDB_before_vietdo_1791644133774.bak`.
- Mục này cập nhật phần phân quyền/POS ở ghi chú phạm vi cũ bên dưới; các đề xuất khác của nhóm chưa tự động được coi là hoàn thành.

## Phần Hải Anh - 2026-10-10 (Đã triển khai)

- Chuẩn hóa biến thể theo ColorID/SizeID, lưu SalePrice riêng, giữ Version và lịch sử đơn.
- Khuyến mại liên kết ColorID, bỏ DiscountPercent/ColorHex/Description; không đổi giá chương trình cũ.
- Giỏ POS dùng PosCartID cho từng hóa đơn chờ; hết ngày hoàn tồn và đóng giỏ.
- Giao diện: tìm/lọc size, chọn nhiều size, cùng giá, SKU tự sinh, trạng thái từng biến thể.
- Đã sao lưu DB rồi áp dụng `20261010_catalog_optimization.sql` trên ShoegroupDB.
- Đối chiếu trước/sau: giữ 12 sản phẩm, 36 biến thể, 73 đơn, 81 dòng đơn; tồn 103 và tổng tiền lịch sử không đổi.
- ERD toàn DB được xuất từ cấu trúc thật: `database/ERD.drawio`, `database/ERD.md`; metadata tại `database/schema-current.json`.
- Frontend 61/61, Java + SQL 35/35, 10 kịch bản API catalog/POS và 29 bài tương thích cũ đều đạt; build Vue/Spring thành công.
- Kiểm tra giao diện 1440px/390px: danh sách size, sản phẩm, khuyến mại, POS; form size/khuyến mại, sửa sản phẩm và chọn size hàng loạt. Không tràn ngang toàn trang, không lỗi JS/API trong các luồng này.
- Spring 5000 kết nối SQL; Vue 3000 đang chạy. Chưa commit/push thay đổi.

### Quyết Định Và Giới Hạn

- Bỏ BasePrice ở Products và PriceAdjustment ở ProductVariants, dùng SalePrice: khi bỏ giá cha thì giá chênh lệch không còn đủ để xác định giá bán.
- SKU mới do Spring sinh theo mã sản phẩm + ColorID + SizeID, không phụ thuộc tên và không yêu cầu nhập tay; giữ nguyên SKU đã lưu.
- Chọn nhiều size, cùng giá, tồn ban đầu và sửa ngay trên bảng giảm thao tác; bỏ chọn biến thể đã lưu chỉ ngừng hoạt động, không xóa lịch sử.
- US/UK cùng số size được phân biệt cả ở quản trị và phía khách hàng. Kiểm tra hệ, khoảng số và bước 0,5 là quy tắc nhập liệu, không phải bảng quy đổi quốc tế theo từng hãng/giới tính.
- Bản size cũ hệ ABC không được dùng bởi biến thể nên giữ lại ở trạng thái không hoạt động, không đoán chuyển sang EU.
- Khuyến mại mới dùng phần trăm, không có ô loại giảm/mô tả. Vẫn giữ cách tính chương trình giá cố định cũ để không tự đổi giá; chương trình hết hạn không được sửa/bật lại.
- Giữ AppMigrations để chống chạy lại thay đổi cấu trúc; không đổi bảng này thành lịch sử thao tác admin.
- Giữ snapshot tên/SKU/màu/size/giá/ảnh trong OrderDetails: sửa danh mục sau này không được thay đổi hóa đơn cũ.
- Các đề xuất riêng của Việt, Minhhiếu, Hưng ngoài phần phối hợp nêu trên chưa được triển khai trong đợt này. ERD phản ánh DB thực tế, không đánh dấu các đề xuất đó là đã hoàn thành.
- Hóa đơn chờ lưu giỏ/tồn ở DB; thông tin khách đang nhập được tách theo tab trong phiên giao diện, chưa lưu bền vững sau tải lại trang. Chức năng POS/quyền nhân viên đầy đủ vẫn thuộc phần Hưng/Việt.
- Sao lưu: `C:/Program Files/Microsoft SQL Server/MSSQL16.SQLEXPRESS/MSSQL/Backup/ShoegroupDB_before_catalog_1791606546876.bak`.
- Máy khác: trước khi khởi động bản mới trên DB có dữ liệu, chạy `node backend/scripts/catalog-migration.cjs --apply --erd` để sao lưu và cập nhật. Migration chạy lại không đổi dữ liệu; Spring có đăng ký migration này khi khởi động.

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
