# Chạy lại audit ShoeGroup

Báo cáo: [AUDIT-2026-09-09.md](./AUDIT-2026-09-09.md). Kết quả máy đọc được: [summary.json](./summary.json). Các file `*-results.json` là bằng chứng lần chạy đã thực hiện, không phải dữ liệu mẫu.

## Điều kiện

- Node/npm và SQL Server local chạy được; dependency đã cài qua lockfile. Backend dùng cấu hình kết nối trong `backend/.env`; không đưa file này vào báo cáo/Git.
- Chỉ chạy fixture trên database tên `ShoegroupAudit_*`. Không dùng `ShoegroupDB` hoặc dữ liệu thật. Helper từ chối khởi tạo database đã có bảng và không nạp INSERT seed trong SQL dump.
- Dùng port5100–5199 cho HTTP audit; xác minh không có dịch vụ thật đang chiếm port được chọn. Helper từ chối gọi port ngoài dải này. **Port phải trỏ tới process dùng cùng audit DB**; kiểm tra cấu hình process trước khi chạy. Không đổi process trên port5000.
- Không chạy các suite có fault injection song song trên cùng DB: chúng tạo trigger test tạm thời và gỡ trong `finally`.

## Tạo database mới (một lần)

Trong PowerShell tại `E:\VS Code\shoegroup\backend`, đặt một tên mới chưa có bảng:

```powershell
$env:AUDIT_DB_NAME='ShoegroupAudit_local_run1'
node test/helpers/audit-db.cjs
```

Helper tạo schema, chạy các migration liên quan và thêm 12 customer + 1 admin tổng hợp. User test `audit1@example.test` đến `audit12@example.test`, admin `audit-admin@example.test`; mật khẩu **chỉ dùng trong fixture**: `Audit-Only-Password-2026`. Không dùng tài khoản/mật khẩu này ở production.

Nếu chạy lại các suite trên audit DB hiện có thì bỏ bước setup. Mỗi case tạo product/coupon mới. `ShoegroupAudit_20260909_fixed` giữ bằng chứng dữ liệu của lần audit hiện tại.

## Khởi động API audit

Trong terminal riêng, cwd `backend`:

```powershell
$env:DB_NAME='ShoegroupAudit_local_run1'
$env:PORT='5100'
$env:CORS_ORIGINS='http://localhost:3100,http://localhost:3000'
$env:EMAIL_USER=''
$env:EMAIL_PASS=''
$env:DB_USE_UTC='false'
node server.js
```

Driver đang dùng local time để tương thích `GETDATE()` của schema cũ; Node và SQL Server phải có cùng timezone nghiệp vụ. `CheckoutRequests` và `CouponRedemptions` hiện được server khởi tạo nếu thiếu; migration constraints không tự chạy trên DB thật. Log kết nối cũ in tên ShoegroupDB cố định, **không dùng dòng log đó để suy ra DB thực tế**; cấu hình `DB_NAME` và SQL `DB_NAME()` mới là bằng chứng.

## Regression API + SQL

Trong terminal khác, cwd `backend`, chạy tuần tự:

```powershell
$env:AUDIT_DB_NAME='ShoegroupAudit_local_run1'
$env:AUDIT_PORT='5100'
node test/audit.integration.cjs
node test/audit.extended.cjs
node test/audit.boundary.cjs
node test/audit.jobs.cjs
node test/audit.gaps.cjs
```

Kết quả hiện tại: integration30 PASS; extended14 PASS; boundary12 PASS; jobs5 PASS. `audit.jobs.cjs` tự bật/dừng process audit port5102, kiểm tra scheduler thật và idempotency qua hai process. Nó không dừng server5100.

**`audit.gaps.cjs` hiện trả exit code1 với 4 FAIL có chủ đích:** G01 giá promotion, G02 cước khi đổi địa chỉ, G03 payout chưa có executor, G04 raw PAN. Đây là production gaps còn mở, không được bỏ assertions để test xanh. Chạy sau extended suite vì case rút ví dùng số dư tổng hợp đã được credit từ return. Chỉ dùng số thẻ test công khai, không nhập thẻ thật. Khi policy/provider được triển khai, cập nhật fixture/expectation theo contract đã chốt rồi yêu cầu cả4 ca đạt.

Mỗi suite ghi đè file kết quả tương ứng trong `docs/audit/`. Các kết quả trước sửa được giữ trong `baseline-*.json`. Snapshot backend baseline tạm đã được gỡ khỏi workspace sau kiểm thử để tránh chạy nhầm code có lỗi. Không thể coi baseline v2 là nguyên trạng vì nó đã dùng shared route module; báo cáo ghi giới hạn này.

## Unit và build

Tại project root:

```powershell
npm test
npm --prefix backend test
npm run build
git diff --check
```

Kết quả đã kiểm tra: 11 frontend + 15 backend PASS; build PASS. Handler VM tests chạy đoạn handler thực với SQL mock; các case race/rollback được chứng minh thêm bằng integration SQL thật.

## UI smoke

Tại root, terminal riêng:

```powershell
$env:VITE_API_BASE_URL='http://localhost:5100/api'
npm run dev:web -- --port 3100
```

Mở localhost3100, đăng nhập customer fixture, chọn Audit Product A sizeM (sizeL hết hàng), thêm giỏ, checkout COD. Kiểm tra giá500k + cước75k cho địa chỉ HCMC trong fixture. Xem đơn ở account, hủy với lý do, đối chiếu `Orders`, `OrderDetails`, `ProductVariants`, `OrderStatusHistory`. Stock phải trở lại giá trị trước mua đúng một lần. Không dùng trang local này để thanh toán thật.

Quan sát UI của lần audit: đơn UI SG186668 tương ứng SQL OrderID85; đã hủy sau test; stock variant1 từ100→99→100. File `ui-database-results.json` lưu trạng thái sau hủy. Không có gateway/SMTP/carrier thật trong smoke này.

## Deployment của bản sửa

Chưa thực hiện trên DB gốc. Trước rollout cần backup và staging rehearsal, kiểm tra dữ liệu âm/trùng provider reference/quantity sai, coupon history và timestamp cũ. Chạy lần lượt các migration mới:

1. `database/migrations/20260909_checkout_idempotency.sql`
2. `database/migrations/20260909_coupon_redemptions.sql`
3. `database/migrations/20260909_audit_constraints.sql`

Migration3 dùng `WITH CHECK`, cố ý thất bại nếu history không hợp lệ; không xóa lịch sử hoặc bỏ check để vượt lỗi. Xác minh prerequisite các migration trước đó của project. Không shift mọi timestamp7h: có cột từng ghi GETDATE, có cột từng ghi JS Date; cần phân loại nguồn dữ liệu. Không tự backfill per-user coupon từ discount amount vì order cũ không lưu coupon ID.

Client inventory phải gửi `version`, POS paid phải xác nhận `total` đúng, checkout nên luôn gửi `Idempotency-Key`. Customer bank declaration chỉ trả pending, paid cancellation trả pending refund; UI không được báo đã trả tiền. Phương thức thanh toán/payout chưa tích hợp phải được đóng hoặc quy trình manual được định nghĩa rõ trước mở bán.

## Tạo lại báo cáo

Sau khi cập nhật finding và kết quả kiểm thử đã xác minh:

```powershell
node docs/audit/render-report.cjs
```

`audit-findings.cjs` lưu issue/feature; `render-report.cjs` kết hợp evidence JSON vào báo cáo. Phần unit/UI trong generator ghi nhận lần chạy đã xác minh, không tự chạy test; phải xác minh lại khi sửa code trước khi cập nhật báo cáo. Không coi việc render report thành công là test pass.
