# Báo cáo đã xử lý — ShoeGroup v2

Bảng đối chiếu từng vấn đề trong báo cáo đánh giá → cách đã xử lý trong gói này.

## 🔴 Nhóm khẩn cấp — Bảo mật

| Vấn đề (báo cáo) | Đã xử lý | File |
|---|---|---|
| 2.1 Mật khẩu lưu plaintext | Băm bằng **scrypt** (module `crypto` có sẵn — không cần cài bcrypt). Đăng nhập / đăng ký / reset đều băm. **Tài khoản cũ vẫn đăng nhập được** và tự động được băm lại ngay sau đó | `src/security/password.js`, `server.js` |
| 2.2 API không phân quyền | Phát hành **JWT** khi đăng nhập + **1 middleware phân quyền tập trung** theo bảng chính sách (PUBLIC / CUSTOMER / ADMIN). Mặc định *fail-closed*: route lạ → yêu cầu Admin. Chặn luôn IDOR (`/api/customers/:id` của người khác) | `src/security/guard.js`, `src/security/jwt.js` |
| 2.3 Hard-code secret | Toàn bộ cấu hình DB / mail / JWT / PORT đọc từ `.env`. **Đã gỡ app password Gmail khỏi mã nguồn**. Thêm `.gitignore` | `src/security/env.js`, `.env.example` |
| 2.4 CORS mở, body 50MB, lộ `e.message`, không rate limit | CORS whitelist theo `CORS_ORIGINS`; body limit 50MB → 5MB; error handler tập trung ẩn chi tiết lỗi ở production; rate limit đăng nhập (10 lần/15 phút) và toàn API; thêm header bảo mật (thay helmet) | `src/security/guard.js` |

## 🟠 Cơ sở dữ liệu

| Vấn đề | Đã xử lý |
|---|---|
| 3.1 8 FK `WITH NOCHECK` → untrusted | Vòng lặp tự động chuyển mọi FK về trạng thái tin cậy; nếu còn dòng mồ côi thì **in cảnh báo** chứ không phá dữ liệu |
| 3.2 Thiếu index | Thêm **~25 index** cho các cột khoá ngoại / lọc / sắp xếp (Orders.UserID, OrderDetails.OrderID, Products.CategoryID, PasswordResetToken, AutoCancelDeadline, …) kèm `INCLUDE` để tránh key lookup |
| 3.4 Tiền tệ `decimal(18,0)` mất số lẻ | Tự động chuẩn hoá **mọi cột tiền về `decimal(18,2)`** (mở rộng → không mất dữ liệu) |
| 3.5 Trạng thái đơn là chuỗi tiếng Việt tự do | Thêm bảng `OrderStatuses` (8 mã chuẩn) + cột `Orders.StatusCode` / `PaymentStatusCode` + hàm map có dấu/không dấu + **trigger đồng bộ tự động** + view `vw_OrdersWithStatus`. Cột `Status` cũ **giữ nguyên** nên backend cũ không hỏng |
| Toàn vẹn dữ liệu | CHECK: Quantity > 0, UnitPrice ≥ 0, StockQuantity ≥ 0, TotalAmount ≥ 0; UNIQUE cho `ChildSKU` và (ProductID, ColorID, SizeID) — **chỉ tạo khi dữ liệu hiện tại hợp lệ** |
| Hỗ trợ băm mật khẩu | Thêm `Users.PasswordAlgo`, `FailedLoginCount`, `LockoutUntil`; đánh dấu tài khoản còn mật khẩu thô để theo dõi tiến độ nâng cấp |

## 🟡 Hiệu năng

| Vấn đề | Đã xử lý |
|---|---|
| 5.1 Không phân trang, lọc bằng JavaScript | Thêm API mới (không đụng route cũ): `GET /api/v2/products` (phân trang + lọc + sắp xếp bằng `OFFSET/FETCH`), `GET /api/v2/orders` (ghép chi tiết đơn bằng `FOR JSON PATH` trong SQL thay vì lặp trong Node) |
| 5.2 Trang chủ tải toàn bộ sản phẩm | `GET /api/v2/products/featured?limit=8` — trả về trường tối thiểu |
| Dashboard nhiều truy vấn | `GET /api/v2/dashboard/summary` — gộp 6 chỉ số vào 1 truy vấn |
| Pool DB | Cấu hình pool (max 20) + `requestTimeout` 30s + tắt server "mượt" (graceful shutdown) |

## 🟡 Frontend

| Vấn đề | Đã xử lý |
|---|---|
| URL API hard-code ở ~20 file | Thêm `services/apiClient.js` (đọc `VITE_API_BASE_URL`) và `services/httpInterceptor.js` bọc `window.fetch` **một lần** → mọi `fetch` cũ tự động được gắn `Authorization: Bearer` và đổi base URL. **Không phải sửa từng file** |
| Route guard chỉ chạy ở trình duyệt | Nay phía server mới là chứt chặn thật (guard client chỉ còn là UX) |
| Phiên hết hạn không biết | Gặp 401 → xoá token và điều hướng về `/login` |

## ⚠️ Việc còn lại (đề xuất giai đoạn 3)
- Tách `server.js` thành routes/controllers/services đầy đủ (đã có sẵn khung `src/`).
- Gom CRUD lặp của ~20 thực thể bằng hàm factory.
- Tách `adminStore.js` (100 KB) thành nhiều store nhỏ; xoá `mockData.js`/`mockData.ts` trùng.
- Thêm test (Jest/supertest, Vitest) + ESLint/Prettier + CI.
- Chuyển cron `setInterval` sang SQL Server Agent Job hoặc node-cron.
