# ShoeGroup — Bản đã tối ưu (v2)

Gói này **không thay thế** dự án cũ của bạn, mà là bản đã được vá các lỗi nguy hiểm nêu trong báo cáo. Toàn bộ 70 API cũ, mọi màn hình Vue, mọi bảng dữ liệu **vẫn giữ nguyên**.

---

## 1. Chạy trong 5 bước

### Bước 1 — Cơ sở dữ liệu (làm trước tiên)
1. **BACKUP** `ShoegroupDB` (bắt buộc, để có đường lùi).
2. Mở SSMS → chạy `database/01_ShoegroupDB_optimize_migration.sql` trên database đang dùng.
   - Script này **chỉ thêm** index / bảng tra cứu / cột phụ / ràng buộc. Không xoá, không đổi tên gì.
   - Chạy lại nhiều lần vẫn an toàn (idempotent).
3. Nếu muốn tạo DB mới từ đầu: chạy `database/ShoegroupDB_portable_optimized.sql` (schema + seed + tối ưu trong 1 file).

### Bước 2 — Backend
```bash
cd backend
cp .env.example .env        # rồi mở .env điền mật khẩu SQL thật + JWT_SECRET
npm install
npm start
```
Kiểm tra: mở `http://localhost:5000/api/health` → thấy `{"success":true,"db":"connected"}`.

> Sinh JWT_SECRET mạnh:
> `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### Bước 3 — Frontend
```bash
cd frontend
cp .env.example .env        # VITE_API_BASE_URL=http://localhost:5000/api
npm install
npm run dev
```

### Bước 4 — Đăng nhập thử
Tài khoản cũ **vẫn đăng nhập bằng đúng mật khẩu cũ**. Ngay sau lần đăng nhập đầu tiên, mật khẩu thô trong DB sẽ tự động được băm lại (scrypt). Bạn không phải reset mật khẩu cho ai.

### Bước 5 — Việc bạn phải tự làm (quan trọng)
- 🔴 **Thu hồi app password Gmail đã bị lộ** trong code cũ (`labw adqs zelc mcen`) tại https://myaccount.google.com/apppasswords, tạo cái mới và điền vào `.env`.
- 🔴 Đổi mật khẩu `sa` của SQL Server (code cũ để `123`).
- 🔴 Không commit file `.env` lên Git (đã có `.gitignore`).

---

## 2. Nếu có màn hình nào báo lỗi 401/403

Đặt tạm trong `backend/.env`:
```
AUTH_MODE=warn
```
Khi đó server **chỉ ghi log cảnh báo** thay vì chặn, bạn xem log terminal để biết chỗ nào chưa gửi token, sửa xong thì trả lại `AUTH_MODE=enforce`.

---

## 3. Cấu trúc gói

```
ShoeGroup_Optimized/
├─ backend/
│  ├─ server.js                  ← bản đã vá (giữ nguyên toàn bộ 70 route cũ)
│  ├─ legacy/server.original.js  ← bản gốc của bạn, không sửa 1 ký tự (để đối chiếu / rollback)
│  ├─ src/security/env.js        ← đọc .env (không cần cài dotenv)
│  ├─ src/security/password.js   ← băm scrypt + tương thích mật khẩu cũ
│  ├─ src/security/jwt.js        ← phát hành / xác thực JWT
│  ├─ src/security/guard.js      ← phân quyền tập trung, rate limit, CORS, error handler
│  ├─ src/routes/optimized.routes.js ← API mới có phân trang (/api/v2/...)
│  ├─ .env.example  .gitignore  package.json
├─ frontend/
│  ├─ src/services/apiClient.js       ← lớp gọi API dùng chung (mới)
│  ├─ src/services/httpInterceptor.js ← tự gắn JWT cho MỌI fetch cũ (mới)
│  └─ src/... (toàn bộ file cũ, chỉ main.js / authStore.js / adminStore.js / orderStore.js được chèn thêm)
├─ database/
│  ├─ 01_ShoegroupDB_optimize_migration.sql   ← chạy trên DB đang có
│  ├─ ShoegroupDB_portable_optimized.sql      ← schema + seed + tối ưu (tạo mới)
│  └─ ShoegroupDB_portable_original.sql       ← bản gốc
└─ docs/
   ├─ HUONG_DAN_CAI_DAT.md
   └─ BAO_CAO_TOI_UU.md
```

## 4. Rollback
Backend: xoá `server.js`, đổi tên `legacy/server.original.js` → `server.js`.
Frontend: bỏ 2 dòng `installHttpInterceptor` trong `main.js`.
DB: các thay đổi đều là bổ sung nên không cần rollback; nếu muốn, chỉ cần `DROP` các index / bảng `OrderStatuses` / trigger vừa tạo.

---

## 5. Ve file .env (bo sung)

Goi nay da co san 2 file `.env` **dien dung cau hinh may ban**, chi can copy vao la chay:

| File | Dat o dau |
|---|---|
| `backend/.env` | cung cap voi `server.js` |
| `frontend/.env` | cung cap voi `package.json` (**KHONG dat trong `src/`**) |

Neu trong frontend cua ban dang co file `.env.example` chua `GEMINI_API_KEY` / `APP_URL`:
day la rac tu template Google AI Studio, **khong co code nao dung den**, cu xoa di.
Vite cung khong doc file `.env.example` (chi doc `.env`), nen no chua tung anh huong gi.

Luu y: moi thu trong `frontend/.env` deu bi nhung vao file JS gui xuong trinh duyet
-> TUYET DOI khong dat mat khau / JWT_SECRET / API key o day.
