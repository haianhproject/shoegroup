# ERD hiện hành — 04/10/2026

Schema đọc trực tiếp từ ShoegroupDB: **25 bảng nghiệp vụ, 224 cột, 31 FK**.
AppMigrations (2 cột) ở trang kỹ thuật; sysdiagrams là hạ tầng SSMS.

- [Draw.io chỉnh sửa được](ERD-ShoeGroup-20261004.drawio)
- [Ảnh tổng quan trắng đen](ERD-ShoeGroup-20261004.png)
- [PDF 6 trang](ERD-ShoeGroup-20261004.pdf)
- [Metadata](schema-20261004.json)
- [Chi tiết khóa ngoại](ERD-KhoaNgoai.md)
- [Rà soát bảng/cột](../../docs/erd-audit-20261004.md)

Draw.io/PDF gồm tổng quan, tài khoản, sản phẩm, đơn hàng, giỏ tại quầy và migration.
Nền trắng, chữ và đường nối đen; đầy đủ cột, kiểu dữ liệu, PK/FK/UQ, NULL và IDENTITY.
Quan hệ lấy từ FK vật lý, có xét UNIQUE và khả năng NULL.

ERD-SD64-ShoeGroup-Hoan-Chinh.drawio/png/pdf đã đồng bộ bản này.
diagram/ERD-ShoeGroup.drawio/png và tài liệu khóa ngoại cũng đã đồng bộ.
Các file mang ngày 20261001 là bản lịch sử, không phải schema hiện hành.

Tạo lại metadata/Draw.io: `node backend/tools/export-erd.cjs`.
Sau đó xuất lại PNG/PDF bằng Draw.io.
