# Tiến Độ ShoeGroup

## Thêm Biến Thể Theo Bản Nháp - 2026-10-16

- Thay cơ chế tích chọn vừa thêm/bỏ dòng vừa đổi trạng thái bằng bước thêm riêng trong mỗi màu: chọn hệ EU/US/UK, chọn nhiều kích cỡ chưa có, nhập giá và tồn dùng chung cho đợt thêm, bấm "Thêm biến thể". Chọn/bỏ tích chỉ thay danh sách chờ; chỉ ghi DB sau xác nhận lưu sản phẩm.
- Bỏ ba nút Chọn tất cả / Bỏ chọn tất cả / Hoàn tác chọn kích cỡ cùng các hàm xử lý cũ. Giá chung chuyển vào từng đợt thêm; mọi dòng đã có, kể cả dòng mới của đợt trước, giữ giá/tồn riêng và luôn sửa trực tiếp được. Không còn thao tác bật giá chung ghi đè cả bảng.
- Chỉ đưa các kích cỡ chưa tồn tại trong màu vào danh sách thêm, tính cả biến thể đã ngừng hoạt động. Dòng chưa lưu có nhãn "Mới" và nút bỏ khỏi bản nháp; dòng có ID được bảo vệ, chỉ sửa hoặc bật/tắt. Đổi trạng thái màu/từng biến thể vẫn độc lập với bước chọn size. Hoạt động và Hết hàng hiển thị riêng khi tồn bằng 0.
- Kiểm tra giá, tồn nguyên không âm và kích cỡ ngay dưới ô; dữ liệu sai làm cả đợt thêm bị từ chối. Size vừa ngừng hoặc đã được dùng được gỡ khỏi danh sách chờ để chọn lại. Khi còn size đang chọn chưa bấm thêm, chặn lưu và mở phần thêm để nhắc hoàn tất.
- Bảng biến thể dùng cột co giãn theo vùng nội dung; vùng hẹp chuyển từng dòng sang bố cục hai cột, có SKU và trạng thái ngay trong dòng. Loại bỏ chiều rộng tối thiểu/ô nhập cố định gây cuộn ngang.
- Kiểm chứng: frontend 80/80, build Vue và audit source đạt. Playwright kiểm tra 11 trang ở 1440px/390px; riêng form biến thể kiểm tra thêm 320/768/1024/1366/1920px, không tràn ngang. Thử chọn/bỏ chọn không đổi dòng cũ, thêm hai đợt giá/kho khác nhau, bỏ dòng mới, phân biệt tồn 0 với hoạt động, chặn lưu khi chưa thêm và kiểm tra payload lưu giữ ID/SKU/giá/kho/version của toàn bộ dòng đã lưu. Yêu cầu PUT trong kiểm tra giao diện được mô phỏng phản hồi, không ghi sản phẩm thử vào DB thật.
- Không cần đổi cấu trúc DB/ERD cho luồng này. Giữ các thay đổi đang có trên nhánh admin; chưa commit/push. Vue chạy ở http://localhost:3000, Spring ở cổng 5000.

## Chống Trùng Tên Các Danh Mục - 2026-10-16

- Rà soát ban đầu: kích thước đã kiểm tra trùng theo hệ; danh mục, thương hiệu, chất liệu và màu sắc chưa có chống trùng thống nhất. DB thật hiện không có tên trùng/rỗng theo quy tắc mới, không cần xóa hay gộp bản ghi.
- Bổ sung kiểm tra khi thêm/sửa ở Vue và Spring: chuẩn hóa Unicode NFC, không phân biệt hoa/thường, bỏ qua khoảng trắng đầu/cuối/giữa tên, tab, xuống dòng, NBSP và ký tự cách vô hình. Ví dụ Da thật / DA THẬT / Da  thật / D a t h ậ t là cùng tên. Không bỏ dấu tiếng Việt hoặc đồng nhất các từ khác nghĩa: Da và Đá vẫn khác.
- Tính cả bản ghi không hoạt động; báo lỗi dưới ô tên, nêu ID hiện có để dùng lại. Khi sửa giữ nguyên tên của chính bản ghi thì được phép; danh sách trên trình duyệt cũ vẫn nhận lỗi 409 từ server và giữ nguyên form đang nhập.
- Kích thước giữ quy tắc số chuẩn hóa theo từng hệ: 40 và 40.00 trùng trong EU, nhưng US 7 và UK 7 khác nhau. Không gộp các chất liệu chỉ vì có chung một từ như Da thật và Da lộn.
- Migration `20261016_catalog_name_uniqueness.sql` thêm CatalogNameKey tự tính và unique index ở bốn bảng Categories/Brands/Materials/Colors, cùng CHECK tên không rỗng. Không thêm ô nhập hay yêu cầu điền mã này. Hàm SQL dùng collation không phân biệt hoa/thường nhưng phân biệt dấu; giữ cả tên, ID, trạng thái và liên kết hiện có. Không cho hai yêu cầu đồng thời tạo hai tên trùng.
- Kết nối Spring đặt các SET option cần cho chỉ mục trên cột tự tính. Migration có transaction, chạy lại không đổi dữ liệu; dừng nếu gặp dữ liệu trùng cũ thay vì tự xóa hoặc đoán cách gộp.
- Đã sao lưu checksum/VERIFYONLY trước khi áp dụng DB thật: `C:/Program Files/Microsoft SQL Server/MSSQL16.SQLEXPRESS/MSSQL/Backup/ShoegroupDB_before_catalog_names_20261016_1792116051351.bak`. Sau áp dụng đối chiếu nguyên tên/ID/trạng thái bốn danh mục, số sản phẩm/biến thể/đơn, tổng tồn và tiền lịch sử không đổi; đã xuất lại ERD/metadata.
- Kiểm thử: frontend 80/80; Java/SQL 38/38 không bỏ qua; API 19/19 trên DB riêng. Có thử thêm/sửa, bản ghi đã tắt, dấu cách Unicode, tên khác dấu, ghi SQL trực tiếp và tạo trùng đồng thời cho cả bốn danh mục. Playwright kiểm tra 11 trang ở 1440px/390px, riêng bốn form đều hiện lỗi dưới ô tên, chặn lưu trùng và cho sửa tên của chính bản ghi; không lỗi JS/API hoặc tràn ngang toàn trang trong các luồng thử. Build Vue/Spring và audit source đạt.
- Bản full `database/ShoegroupDB_FULL_20261016.sql` đã xuất lại và phục hồi thử khớp 27 bảng, dữ liệu/identity, chỉ mục/ràng buộc, công thức cột tự tính và module SQL. Backup full mới: `C:/Program Files/Microsoft SQL Server/MSSQL16.SQLEXPRESS/MSSQL/Backup/ShoegroupDB_FULL_20261016_090056.bak`. Spring/Vue đã khởi động lại, API health xác nhận SQL kết nối ở cổng 5000; Vue ở 3000.
- Giữ các thay đổi đang có trên nhánh admin, chưa commit/push.

## Form An Toàn, Giá Riêng Và Dọn Dữ Liệu - 2026-10-16

- Form kích cỡ không đóng khi bấm nền ngoài hoặc cuộn trang. Đóng/Hủy khi đã nhập sẽ hỏi bỏ thay đổi; có nút tiếp tục nhập. Dùng ô số dạng văn bản với bàn phím số để tránh cuộn chuột làm đổi size.
- Lỗi hiện dưới trường nhập, cập nhật khi sửa: bắt buộc, hệ EU/US/UK, khoảng EU 14-60 hoặc US/UK 0-22, bước 0,5. Chấp nhận dấu phẩy rồi chuẩn hóa; 40/40.00 và 7,5/7.50 được coi là cùng size trong cùng hệ, kể cả bản ghi không hoạt động. Đây là giới hạn dữ liệu của hệ thống, không phải bảng quy đổi size giữa các hãng/giới tính.
- Bỏ ô "Thứ tự" khỏi form kích cỡ vì người dùng không cần nhập để sắp ID tăng dần. Giữ SortOrder trong DB để tương thích; API cập nhật không gửi trường này sẽ giữ giá trị cũ.
- Gom chọn size vào phần gấp/mở "Thêm kích cỡ"; bảng bên dưới là nơi sửa biến thể hiện có. Bỏ ô tồn mặc định toàn sản phẩm, thay bằng "Tồn mỗi kích cỡ thêm mới" trong từng màu; không tác động tồn cũ. SKU có chiều rộng tối thiểu, không còn bị bẻ từng vài ký tự như ảnh phản hồi.
- Thêm hoàn tác cho lần chọn/bỏ size gần nhất, khôi phục số dòng và trạng thái cũ, giữ sửa giá/tồn trên các dòng được giữ. Dòng chưa lưu được bỏ khỏi bản nháp, biến thể đã lưu chỉ tắt hoạt động.
- Giá riêng và giá chung có bản nháp tách biệt: bật cùng giá giữ giá riêng, thay giá chung nhiều lần không ghi đè bản dự phòng; bỏ chọn sẽ trả lại giá riêng. Biến thể mới không có giá riêng sẽ trở về trống và yêu cầu nhập, không tự bịa giá. Đây là hoàn tác trước lưu, không phải lưu hai giá bán đồng thời trong DB. Hộp xác nhận ghi rõ giá chung và số biến thể khi người dùng thực sự lưu.
- Thêm lỗi dưới tên/danh mục, giá chung, giá/tồn và kích cỡ biến thể. Kiểm tra trùng ở Vue, Spring và unique/check của SQL; trùng SKU trả 409 và rollback toàn bộ sản phẩm mới.
- DB: áp dụng `20261016_catalog_data_hardening.sql`, chạy lại không đổi dữ liệu. Xóa duy nhất Sizes #23 (36/ABC) sai hệ và không được tham chiếu; không xóa sản phẩm, biến thể, đơn hoặc tồn. Chuẩn hóa 12 SKU có dấu và các SKU lặp sang mã duy nhất theo ProductID/VariantID; giữ mã hợp lệ không trùng và giữ nguyên snapshot SKU trên đơn cũ. Tắt hai biến thể #223/#224 của sản phẩm cha #33 đã tắt, không trừ tồn.
- Trước sửa có backup checksum/VERIFYONLY: `C:/Program Files/Microsoft SQL Server/MSSQL16.SQLEXPRESS/MSSQL/Backup/ShoegroupDB_before_catalog_cleanup_20261016_1792085524368.bak`. Sau sửa DBCC và audit không còn vấn đề thuộc các quy tắc đã rà; giữ 12 sản phẩm, 36 biến thể, 73 đơn, 81 dòng đơn, tồn 103, 40 thanh toán, 244 lịch sử; tổng đơn 96.341.995 và tổng dòng lịch sử 97.119.995 đồng.
- ID sản phẩm nhỏ nhất hiện tại là 22, identity hiện tại 34; không phải số thứ tự hiển thị. Không reseed hay đánh lại ID để tránh đổi liên kết giỏ/đơn/khuyến mại; danh sách vẫn mới nhất ở trên.
- ERD/metadata đã xuất lại, không thêm bảng/cột nghiệp vụ. Bản full mới `database/ShoegroupDB_FULL_20261016.sql` kèm DROP/CREATE; đã phục hồi thử khớp 27 bảng, từng dòng dữ liệu, identity, chỉ mục, ràng buộc và module SQL. Không chạy bản full lên DB thật. README trỏ bản mới; backup full đã kiểm tra: `C:/Program Files/Microsoft SQL Server/MSSQL16.SQLEXPRESS/MSSQL/Backup/ShoegroupDB_FULL_20261016_003618.bak`.
- Kiểm thử: frontend 78/78; Java/SQL 38/38, không bỏ qua; API 18/18 trên DB riêng gồm dọn dữ liệu, ràng buộc size/SKU và rollback. Playwright 11 trang ở 1440px/390px kiểm tra lỗi dưới ô, giữ form khi bấm nền/cuộn, xác nhận hủy, hoàn tác size, khôi phục giá riêng, mắt xem và quyền nhân viên; không lỗi JS/API hay tràn ngang toàn trang trong các luồng thử. Build Vue/Spring, audit source đạt.
- Chỉ sửa trên máy ở nhánh admin, chưa commit/push; giữ toàn bộ thay đổi Hiếu/Hưng của đợt trước.

## Sản Phẩm Và Biến Thể Theo Phản Hồi Giao Diện - 2026-10-15

- Bỏ dòng SKU cha/chưa thiết lập khỏi mắt xem; SKU chỉ hiển thị ở từng biến thể. Không xóa cột hoặc dữ liệu SKU cũ khỏi DB trong đợt sửa giao diện này.
- Danh sách sản phẩm sắp ID giảm dần: sản phẩm mới ở trên, ID nhỏ ở dưới; tìm theo mã/tên. Không đánh lại ID vì các khóa ngoại, giỏ và lịch sử đơn đang tham chiếu ID thật.
- Mắt xem chỉ đọc: không còn nút sửa hay công tắc biến thể. Chỉnh sửa qua bút riêng và vẫn kiểm tra quyền quản trị.
- Sửa giá chi tiết bị 0 khi tất cả biến thể ngừng hoạt động: lấy khoảng giá biến thể, có dự phòng giá các biến thể đã ngừng. Bật cùng giá với ô giá trống không ghi đè giá cũ về 0.
- Đổi tên tồn ban đầu thành "Tồn cho biến thể mới", mặc định 0 khi mở sửa; chỉ áp dụng cho size thêm sau đó, không ghi đè tồn đã lưu. "Tổng tồn kho" là số tính tự động chỉ đọc; mỗi biến thể vẫn có tồn riêng.
- Thêm bỏ chọn tất cả theo hệ EU/US/UK: dòng chưa lưu được bỏ khỏi bản nháp, dòng đã lưu chuyển không hoạt động nhưng giữ ID/SKU/giá/tồn. Chọn tất cả bật lại dòng cũ và bổ sung size còn thiếu, không tạo trùng.
- Sửa kích cỡ qua danh sách chọn ở từng biến thể; chặn trùng cùng màu kể cả dòng không hoạt động. Spring chặn đổi màu/size khi biến thể đang trong giỏ POS hoặc đơn chưa hoàn tất (409 VARIANT_IN_USE); không sửa snapshot đơn cũ.
- Công tắc màu bật/tắt toàn bộ biến thể thuộc màu trong sản phẩm đang sửa, không tắt danh mục Colors toàn hệ thống. Có trạng thái hoạt động một phần; vẫn bật/tắt riêng từng biến thể. Tồn 0 = hết hàng, khác với không hoạt động. Thay đổi bản nháp chỉ ghi DB sau xác nhận Lưu sản phẩm.
- API công khai không đưa màu đã ngừng trở lại từ ProductImages; quản trị vẫn thấy ảnh/màu để sửa và bật lại. Ẩn chuỗi base64 dài trong ô đường dẫn ảnh, giữ nguyên ảnh đã tải.
- Kiểm chứng: frontend 75/75; Java/SQL 38/38, không bỏ qua; 16/16 tình huống API catalog/POS trên DB riêng. Build Vue/Spring và audit source đạt. Playwright kiểm tra 11 trang ở 1440px/390px, mắt xem chỉ đọc, chọn/bỏ tất cả, công tắc màu/từng dòng và ảnh chụp; không lỗi JS/API hoặc tràn ngang toàn trang trong các luồng thử (bảng rộng cuộn nội bộ).
- Không đổi cấu trúc DB/ERD ở đợt này, không lưu thử thay đổi sản phẩm vào DB thật. Tiếp tục giữ các sửa đổi Hiếu/Hưng đang có trên nhánh admin; chưa commit/push.

## Hoàn Thiện Hiếu Và Hưng - 2026-10-15

### Đối Chiếu Nhánh Shop

- Kiểm tra `origin/shop` mới nhất `c2f28a3`: Hiếu đã tách đúng 8 cột sản phẩm và bỏ mô tả khỏi danh sách. Tuy nhiên bản này dùng hàm bật/tắt giả không gọi API, gọi lưu trực tiếp không xác nhận, đưa lại giá cha và mất chặn chỉnh sửa với nhân viên.
- Chỉ tích hợp ý định hiển thị, giữ bản Spring hiện tại; không đưa Express cũ/folder `shoegroup-main` trùng vào dự án. Không tạo merge commit cho hai lịch sử không chung tổ tiên.
- Hoàn thiện danh sách thương hiệu và bộ lọc trạng thái bị thiếu xử lý. Không thêm cột mô tả rỗng khi API/DB chưa hỗ trợ; giữ số sản phẩm để bảng có thông tin sử dụng được.

### Kiểm Tra Nhiệm Vụ Hiếu

| Yêu cầu | Bản trên máy sau hoàn thiện |
| --- | --- |
| Thương hiệu dạng danh sách | Đạt; tìm theo ID/tên, lọc trạng thái, ID tăng dần |
| Mã → ảnh → tên giày → thương hiệu → khoảng giá → tồn → trạng thái → thao tác | Đạt, đủ 8 cột riêng |
| Xem/sửa/bật tắt, không xóa | Đạt; nhân viên chỉ xem, Spring chặn ghi |
| Mô tả chỉ trong chi tiết | Đạt, không hiển thị trong danh sách |
| Xác nhận tắt cha và ngừng toàn bộ biến thể | Đạt; API trạng thái riêng, transaction; câu hỏi đúng yêu cầu |
| Xác nhận trước khi lưu | Đạt; kiểm tra tên/danh mục/giá/tồn trước khi mở xác nhận |
| Giá ở biến thể, khoảng giá từ biến thể | Đạt; giữ chọn cùng giá và thêm nhiều size, không đưa lại BasePrice ở Products |

### Kiểm Tra Nhiệm Vụ Hưng

- Đơn hàng: giữ hành động theo bước nghiệp vụ và xác nhận hiện có, không thêm xóa/ẩn hoặc công tắc bật/tắt cho trạng thái giao hàng. Hủy đơn là nghiệp vụ có lý do/hoàn tồn, không phải xóa bản ghi.
- Voucher theo đơn: không có cột loại trong danh sách; có mắt xem tổng/đã dùng/còn lại; trạng thái sắp diễn ra/đang diễn ra/hết mã/đã kết thúc, thêm không hoạt động cho mã bị tắt. Hết thời gian ưu tiên trạng thái kết thúc; khóa sửa ở cả Vue và Spring.
- Tách NULL = không giới hạn, 0 = hết mã; migration chuyển 0 cũ thành NULL đúng một lần để giữ ý nghĩa cũ. Có lựa chọn không giới hạn riêng, không dùng số 0 cho hai ý nghĩa. Chặn hạ tổng lượt thấp hơn số đã dùng.
- POS chỉ chọn mã đang diễn ra/còn lượt; đồng bộ kiểm tra giới hạn với checkout online. Server khóa voucher trong transaction, thử đồng thời chỉ một đơn dùng được lượt cuối.
- Giữ nhiều hóa đơn chờ dạng tab, mỗi tab có giỏ/revision riêng, không đặt giới hạn số tab. Khách/ghi chú/mã/tiền đang nhập tách theo tab và lưu trong phiên trình duyệt, không dùng chung giữa nhân viên. Giỏ/tồn lưu DB; bản nháp không đồng bộ sang thiết bị khác.
- Hóa đơn quá ngày được đóng và hoàn tồn đúng một lần bằng tác vụ mỗi phút; nếu app tắt thì dọn khi chạy lại/đọc giỏ. POS tự tải lại giỏ định kỳ; không yêu cầu người dùng làm mới trang.
- Thêm nhân viên/ngày lập/mã sản phẩm/SKU/màu trong POS, hóa đơn, chi tiết đơn và bản in phù hợp. Bỏ danh mục/chất liệu/mô tả dài dưới từng sản phẩm POS.
- Thêm tiền khách đưa, tính tiền thừa, hộp xác nhận trước thanh toán; chặn số âm/lẻ/thiếu tiền ở Vue và Spring, lưu tiền thực nhận vào đơn. Trả lại khách tính từ CashGiven - TotalAmount, không thêm cột trùng.
- Tên nhân viên và tổng tiền lấy từ server; đơn/giá/SKU lịch sử ưu tiên snapshot. Khách lẻ lưu trong đơn, không phát sinh yêu cầu tạo tài khoản quản trị sau thanh toán của nhân viên.
- Giữ idempotency, khóa/phiên bản tồn và quyền sở hữu giỏ; thử lại không tạo đơn hoặc trừ tồn hai lần. Chuyển khoản vẫn xác nhận thủ công, chưa có đối soát ngân hàng thật.

### Phản Biện Và Tối Ưu Sáu Bảng

- Ảnh của Hưng hiển thị ba nhận xét về trạng thái Orders, liên kết/lịch sử OrderStatusHistory và trùng DiscountPercent/DiscountValue. Những nhận xét này đúng hướng nhưng chưa chỉ ra migration, kiểm tra dữ liệu hoặc hành vi khi thanh toán đồng thời; không bỏ qua, cũng không coi nhận xét là đã triển khai.
- Orders: giữ trạng thái đơn, trạng thái thanh toán và phương thức riêng vì ba ý nghĩa khác nhau; thêm CHECK cho giá trị hợp lệ. Giữ phí/giảm/địa chỉ cùng các mốc giao hàng, hoàn tiền, trừ/hoàn tồn vì code đang dùng và cần bảo toàn lịch sử. Thêm HandledByUserID (FK), giữ HandledBy là tên tại lúc bán; thêm CashGiven, cho NULL ở đơn cũ/online để không bịa số tiền đã nhận.
- OrderStatusHistory: giữ bảng và OldStatus/NewStatus/Note/ChangedAt; bổ sung FK ChangedBy → Users (NULL cho hệ thống) và index theo đơn/thời gian. Không thay bằng ghi đè Orders.Status vì sẽ mất lịch sử.
- ShippingMethods: giữ bảng và các cột đang tính phí/phạm vi/thời gian; phí trong Orders là giá chốt lúc mua, không phải dữ liệu thừa có thể lấy lại từ cấu hình hiện tại.
- PaymentTransactions: giữ lịch sử thu/hoàn tiền, ProviderTxnRef, SignatureValid và các mốc thời gian; không gộp vào Orders.PaymentStatus vì một đơn có thể có nhiều sự kiện/giao dịch. Không coi thanh toán thủ công là xác minh ngân hàng.
- Coupons: bỏ DiscountPercent sau khi chuyển giá trị phần trăm cũ thiếu sang DiscountValue. Giữ DiscountType để phân biệt phần trăm/số tiền/freeship (chỉ bỏ cột trên UI, không bỏ ý nghĩa tính tiền); giữ điều kiện, giới hạn người dùng, bộ đếm và thời gian. Thêm CHECK giá trị/thời gian/giới hạn.
- CouponRedemptions: giữ số tiền và loại giảm tại lúc áp dụng, không tra ngược chương trình đã bị sửa để dựng hóa đơn cũ; giữ FK hiện có và thêm unique OrderID vì checkout hiện tại chỉ cho một voucher trên đơn. UsedCount giữ để khóa lượt nhanh và bảo toàn số khởi tạo cũ, không tự tính lại từ lịch sử thiếu của DB cũ.
- Không thêm bảng trạng thái, bảng tiền thừa hay bảng lịch sử tổng quát chưa có nhu cầu. Không bỏ sáu bảng hoặc các snapshot chỉ để giảm số cột.

### DB Và Kiểm Chứng

- Đã áp dụng migration `20261015_order_coupon_hardening.sql` (chạy lại không đổi dữ liệu) và đồng bộ `database/ERD.drawio`, `ERD.md`, `schema-current.json` từ DB thật.
- Bản sao lưu trước đổi: `C:/Program Files/Microsoft SQL Server/MSSQL16.SQLEXPRESS/MSSQL/Backup/ShoegroupDB_before_orders_20261015_1792059097654.bak`, đã VERIFYONLY/checksum. Patch phần đang làm trước đợt này ở thư mục Temp: `shoegroup-before-hieu-hung-20261015.patch`.
- Trước/sau giữ 73 đơn, 81 dòng đơn, 40 giao dịch, 244 lịch sử, 10 lượt dùng; tồn 103; tổng tiền đơn 96.341.995 và tổng UnitPrice × Quantity 97.119.995 đồng.
- Bản full mới `database/ShoegroupDB_FULL_20261015.sql` có DROP/CREATE và hướng dẫn; thử phục hồi đủ 27 bảng, dữ liệu, identity, chỉ mục/ràng buộc và nội dung view/procedure/function/trigger khớp DB nguồn. Không chạy bản full lên DB thật.
- Kiểm thử: frontend 70/70; Java/SQL 38/38 không bỏ qua; API catalog/POS/voucher 15/15; build Vue/Spring đạt. Kiểm tra 11 trang ở 1440px/390px, form sản phẩm/thương hiệu/voucher và xác nhận thanh toán: không lỗi JS/API hay tràn ngang toàn trang trong các luồng thử.
- Chỉ sửa trên máy, vẫn ở nhánh admin; chưa commit/push đợt này. Những mục chưa triển khai của thành viên khác trong ghi chú cũ không tự động được coi là hoàn thành.

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
