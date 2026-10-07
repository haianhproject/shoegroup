# Rà soát database ShoeGroup — 01/10/2026

Đã áp dụng trực tiếp trên `ShoegroupDB` tại `DESKTOP-FP2J1RT\SQLEXPRESS`.
Căn cứ là `backend/server.js`, các module thực sự được import trong `backend/src`,
giao diện `src`, catalog SQL Server và thống kê dữ liệu tại thời điểm rà soát.
Không coi code trong `backend/legacy`, SQL dump cũ hoặc fixture lịch sử là chức năng đang chạy.

## Kết quả

- Xóa 16 bảng: 11 bảng chức năng chưa được sử dụng và 5 bảng sao lưu cũ.
- Xóa 20 cột dư trong các bảng còn dùng; không thay `NULL` bằng `NOT NULL` hàng loạt.
- Xóa 2 view, 1 stored procedure cũ, index `IX_Users_TierID` và 4 FK trùng.
- Còn 30 bảng nghiệp vụ, 277 thuộc tính, 38 khóa ngoại.
- Ngoài ERD nghiệp vụ còn `AppMigrations` (2 cột) và `sysdiagrams` (5 cột).
  Tổng catalog: 32 bảng, 284 cột. Các thủ tục hỗ trợ sơ đồ của SSMS được giữ nguyên.
- So sánh SHA-256 trên **tất cả cột còn giữ lại, tất cả dòng** của 30 bảng trước/sau:
  hoàn toàn giống nhau. Việc so sánh và migration diễn ra trong cùng transaction SERIALIZABLE;
  nếu lệch dữ liệu thì rollback. `AppMigrations` được thêm một dòng đánh dấu.

## Bảng đã bỏ và căn cứ

| Bảng | Dòng trước khi xóa | Căn cứ |
| --- | ---: | --- |
| `Reviews`, `ReviewImages` | 0, 0 | Không có API đánh giá. `adminStore` chỉ có mảng reviews rỗng, không tải DB. |
| `Wishlists` | 0 | Không có luồng đọc/ghi danh sách yêu thích vào DB. |
| `ProductQuestions` | 0 | Không có API hỏi/đáp sản phẩm. |
| `MemberTiers`, `PointTransactions` | 3, 0 | Hạng thành viên chỉ là dữ liệu danh mục cũ; không có tính điểm/xét hạng. |
| `SearchLogs` | 0 | Tìm kiếm hiện truy vấn Products trực tiếp, không ghi lịch sử tìm kiếm. |
| `StockAlerts` | 0 | Không có đăng ký/gửi báo có hàng. API `/inventory/alerts` tính tồn thấp trực tiếp từ ProductVariants. |
| `SizeCharts` | 0 | Không đọc/ghi bảng quy đổi size; `Sizes` và `ProductVariants` vẫn được giữ. |
| `UserSessions` | 0 | Đăng nhập dùng JWT và kiểm tra Users, không lưu phiên tại bảng này. |
| `PaymentMethods` | 4 | Không có truy vấn bảng. Orders.PaymentMethodID toàn NULL; API lưu tên phương thức trong Orders.PaymentMethod. |
| `bak_Categories_20260804` | 15 | Bản sao cũ, không có code chạy tham chiếu. |
| `bak_OrderDetails_20260804` | 30 | Như trên. |
| `bak_Orders_20260804` | 33 | Như trên. |
| `bak_Products_SoleCushion_20260804` | 10 | Như trên. |
| `bak_ProductVariants_20260804` | 102 | Như trên. |

## Cột đã bỏ

| Bảng | Cột | Căn cứ |
| --- | --- | --- |
| `Users` | `EmailVerified`, `EmailVerifyToken`, `EmailVerifyExpiry` | Không có luồng xác minh email. Hai cột token toàn NULL. Đăng ký, đăng nhập và reset mật khẩu dùng các cột khác. |
| `Users` | `PointBalance`, `TierID` | Không có tích điểm/hạng; TierID toàn NULL. |
| `Products` | `WishlistCount` | Không có tính năng yêu thích trong DB. |
| `Products` | `ImageGallery` | Toàn NULL, không có thao tác ghi và không có frontend tiêu thụ; ảnh theo màu dùng ProductImages. Đã bỏ khỏi SELECT sản phẩm. |
| `Products` | `SalePrice` | Giá khuyến mãi hiện lấy từ VariantDiscounts. Cột này có giá cũ nhưng API tính giá không đọc; API lưu sản phẩm trước đây chỉ ghi 0. Đã bỏ khỏi INSERT/UPDATE và bỏ thủ tục cũ còn dùng nó. `sale_price` trong JSON vẫn là giá tính toán. |
| `Products` | `UpdatedAt` | Không có truy vấn sản phẩm đọc/ghi cột này; 1/11 dòng có giá trị lịch sử. Không bỏ UpdatedAt ở các bảng đang cập nhật nó. |
| `Orders` | `PaymentMethodID` | Toàn NULL; không dùng. Giữ PaymentMethod là nguồn phương thức thanh toán thực tế. |
| `Orders` | `RecipientLatitude`, `RecipientLongitude`, `IsAddressVerified` | Toàn NULL, không đọc/ghi. Tính phí đang dựa trên tỉnh/thành và khoảng cách ước lượng. |
| `UserAddresses` | `Latitude`, `Longitude` | Toàn NULL, không đọc/ghi. |
| `PostOffices` | `Latitude`, `Longitude` | Bảng hiện rỗng; API bưu cục không sử dụng tọa độ. |
| `PaymentTransactions` | `RawResponse` | Toàn NULL; không có tích hợp đọc/ghi phản hồi cổng thanh toán. Giữ các cột giao dịch đang được code ghi. |
| `Coupons` | `IsFlashSale` | Không có luồng đọc/ghi cờ này; khuyến mãi hiện dùng Coupons và VariantDiscounts. |
| `ShoeGroupWalletWithdrawals` | `ProcessedBy` | Chỉ có trong DDL tạo bảng; không có thao tác đọc/ghi. Đã bỏ khỏi DDL khởi động. |

## Đối tượng khác

- `vw_ProductRatings`, `vw_TopSearchKeywords`: không được ứng dụng gọi, phụ thuộc bảng đã bỏ.
- `sp_ProcessOrderAtomic`: không được backend hiện tại gọi. Checkout dùng transaction trong route
  `/api/orders`; thủ tục cũ còn tham chiếu SalePrice. Đã bỏ migration tạo lại thủ tục khỏi danh sách khởi động.
- Bỏ các FK trùng `FK__Users__RoleID__1D7B6025`, `FK__Products__Catego__05A3D694`,
  `FK__Products__BrandI__03BB8E22`, `FK__Orders__UserID__7755B73D`.
  Migration chỉ xóa khi catalog có một FK khác cùng cột, cùng chính sách và còn được kiểm chứng.
- Giữ trigger thông báo thay đổi trạng thái đơn hàng: trigger đang ghi Notifications.

## Những phần rỗng hoặc NULL vẫn cần giữ

- `Carts`, `CartItems`: có API đồng bộ giỏ; checkout xóa giỏ và cập nhật Carts.
- `ShoeGroupWallets`, `ShoeGroupWalletTransactions`, `ShoeGroupWalletWithdrawals`: có API số dư,
  hoàn tiền, lịch sử và yêu cầu rút tiền. Dữ liệu rỗng không có nghĩa tính năng dư.
- `PostOffices`, `Returns.PostOfficeID`: form trả hàng và backend có nhánh chọn/kiểm tra bưu cục.
- `Products.CollectionID`, `Users.Source`: có code ghi/đọc dù dữ liệu hiện đều NULL.
- `OrderDetails.VariantDiscountID`: lưu dấu vết ưu đãi để phục hồi số lượt khi hủy.
- `Coupons.PerUserLimit`: checkout vẫn kiểm tra giới hạn theo người dùng.
- `Orders.PaymentDueAt`: hiện tạo đơn mới với NULL nhưng truy vấn thanh toán/job vẫn tham chiếu.
- `Returns.InspectionNote`, `ResolutionNote`, `WalletCreditedAt`: phục vụ xử lý trả hàng/hoàn tiền.
- `Orders.TrackingNumber`: vẫn được trả về và frontend hiển thị khi có giá trị.

Không thể chứng minh một cột “chưa từng” được dùng trong mọi thời điểm lịch sử chỉ từ snapshot.
Kết luận ở đây dựa trên code hiện hành, các phụ thuộc DB và dữ liệu thực tế đã kiểm tra.

## ERD hiện hành

- [ERD chỉnh sửa được, 6 trang](../diagrams/erd/ERD-ShoeGroup-20261001.drawio)
- [Ảnh tổng quan](../diagrams/erd/ERD-ShoeGroup-20261001.png)
- [Metadata trích trực tiếp từ DB, không có dữ liệu người dùng](../diagrams/erd/schema-20261001.json)

Trang tổng chứa đủ 30 bảng nghiệp vụ; các trang sau tách chi tiết tài khoản/giỏ hàng,
sản phẩm, đơn hàng/thanh toán, trả hàng/ví và migration kỹ thuật.
PK, FK, kiểu dữ liệu và tính nullable lấy từ SQL Server, không suy đoán theo hậu tố ID.
Ví dụ `OrderDetails.VariantDiscountID` chưa có FK vật lý nên không tự vẽ thành quan hệ ràng buộc.
Các file `ERD-SD64-ShoeGroup-Hoan-Chinh.drawio` và `.png` đã được đồng bộ với bản hiện hành,
cũng như `diagram/ERD-ShoeGroup.drawio` và `.png`. Riêng PDF cũ chưa xuất lại.
Các đường nối đã xét UNIQUE và nullable; xem `diagram/ERD-KhoaNgoai.md` để đọc đủ 38 FK,
bội số và chính sách ON DELETE của từng quan hệ.

Tạo lại ERD từ DB được cấu hình trong `backend/.env`:

```powershell
node backend/tools/export-erd.cjs
```

## Kiểm chứng và khôi phục

- Backup COPY_ONLY + CHECKSUM trước sửa; `RESTORE VERIFYONLY` thành công.
- Đã khôi phục backup sang DB kiểm thử riêng, chạy migration hai lần để kiểm tra idempotency,
  chạy lại các migration khởi động và kiểm tra constraint.
- Test frontend/backend hiện có và `npm run build` đều thành công.
- 33 request API thực tế trên DB kiểm thử: danh mục, sản phẩm, tài khoản, đơn hàng,
  thống kê, ưu đãi, trả hàng, ví, bưu cục, vận chuyển, địa chỉ và thông báo.
  Tạo/sửa sản phẩm thành công; bán tại quầy giảm tồn từ 5 xuống 4 và ghi đúng 1 giao dịch SUCCESS.
- DB chính: fingerprint dữ liệu giữ nguyên ở 30 bảng; DBCC CHECKCONSTRAINTS thành công.
- ERD: đối chiếu đủ 277 cột, 38 FK, không có đầu nối thiếu; đã xuất PNG và kiểm tra hiển thị.

Backup nằm tại thư mục Backup của SQL Server:
`C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\Backup\ShoegroupDB_before_cleanup_20261001_1790850660161.bak`.
Metadata, fingerprint và kết quả kiểm thử cục bộ nằm trong `.codex-work/db-cleanup/` (được gitignore).
Backup chứa dữ liệu trước khi dọn, kể cả các bảng/cột đã xóa; không gửi ra ngoài máy.
Nếu cần phục hồi, ưu tiên restore backup sang một DB riêng để lấy đúng đối tượng cần cứu,
tránh ghi đè giao dịch mới phát sinh trên DB chính.

Migration `20261001_remove_unused_schema.sql` được giữ để truy vết; **không tự chạy khi server khởi động**.
Các dump/migration lịch sử vẫn là tài liệu cũ. Khi dựng DB từ dump cũ phải áp dụng đợt dọn này
cùng backend mới, sau khi backup và rà soát dữ liệu; không chạy lại migration tạo thủ tục checkout cũ.
Script `backend/tools/verify-schema-cleanup.cjs` chỉ cho phép ghi trên tên DB
`ShoegroupAudit_Cleanup_*`, tắt email gửi ra ngoài và tự dừng server kiểm thử khi kết thúc.
