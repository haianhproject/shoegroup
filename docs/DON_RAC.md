# Danh sách file đã xoá — và lý do

Mọi file dưới đây đều đã được **kiểm tra bằng `grep` toàn bộ dự án** trước khi xoá.
Không có file nào bị xoá vì "trông như rác" — phải chứng minh được không ai gọi đến.

## 1. Bản sao cũ của file đang dùng

| File | Dung lượng | Lý do |
|---|---|---|
| `4db4323_HomeDisplay.vue` | 25 KB | Bản cũ của `src/views/HomeDisplay.vue`, nằm sai chỗ (ngoài `src/`) nên Vite không bao giờ đọc |
| `4db4323_HomeDisplay_utf8.vue` | 13 KB | Bản cũ thứ hai, cũng không được đọc |
| `backend.zip` | **14 MB** | File zip tự chứa chính thư mục `backend/` ngay bên cạnh nó |
| `src.zip` | 164 KB | File zip tự chứa chính thư mục `src/` ngay bên cạnh nó |
| `package-lock.json` (2 file) | — | Sẽ được tạo lại khi `npm install`; bản cũ trỏ tới các thư viện đã bị gỡ |

## 2. Rác từ template Google AI Studio

Dự án được tạo từ template AI Studio nên còn sót lại những thứ không liên quan gì đến bán giày:

| File | Lý do |
|---|---|
| `metadata.json` | Khai báo `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`. Dự án không gọi Gemini dù chỉ một dòng |
| `.env.example` (bản cũ) | Chỉ chứa `GEMINI_API_KEY` và `APP_URL`. `grep` toàn bộ `src/`: **0 kết quả**. Đã thay bằng bản chứa `VITE_API_BASE_URL` |
| `assets/.aistudio/` | Thư mục chỉ chứa một file `.gitignore` rỗng nghĩa |
| Đoạn `DISABLE_HMR` trong `vite.config.ts` | Cơ chế riêng của AI Studio để chống nháy màn hình khi agent sửa file. Chạy trên máy bạn thì nó **làm tắt HMR** — sửa code không tự cập nhật. Đã bỏ |

## 3. Script test mồ côi

| File | Lý do |
|---|---|
| `test.js` | Dùng `puppeteer` — nhưng `puppeteer` **không hề có trong `package.json`**, chạy là lỗi ngay |
| `test.cjs` | Giống trên, còn hard-code đường dẫn `C:\Users\admin\.cache\puppeteer\...` nên chỉ chạy đúng trên 1 máy duy nhất |

## 4. Ảnh không được gọi đến

| File | Dung lượng | Kiểm tra |
|---|---|---|
| `public/logo.png` | **1.2 MB** | `grep -rn 'logo.png'` toàn dự án → không file nào tham chiếu. Toàn bộ giao diện chỉ dùng `logogiay.png` (trong `BrandLogo.vue` và `TheNavbar.vue`) |
| `dist/logo.png` | 1.2 MB | Trong bản build cũ, xoá cùng `dist/` |

`public/logogiay.png` **được giữ** vì đang dùng thật.

## 5. Code chết

| File | Kiểm tra |
|---|---|
| `src/views/ProductManagement.vue` | Không có trong `router/index.js`, không có trong `adminRoutes.js`, không được `import` ở bất kỳ `.vue` nào. Trang quản lý sản phẩm thật đang dùng là `views/admin/pages/ProductsPage.vue` |
| `src/data/mockData.ts` | Trùng hoàn toàn với `mockData.js`. Các file đều viết `from '../data/mockData'` (không đuôi) và Vite ưu tiên `.js` trước `.ts`, nên bản `.ts` **chưa bao giờ được tải** — sửa nó cũng vô dụng |
| `tsconfig.json` | Sau khi xoá `mockData.ts` và chuyển `vite.config.ts` → `.js`, dự án không còn file TypeScript nào. Gỡ luôn `typescript` khỏi `devDependencies` |
| `dist/` | Thư mục build đã cũ (chứa cả 2 phiên bản của cùng một view, ví dụ `AboutView-BHcoIExM.js` và `AboutView-DKtHHVFK.js`). Đã nằm trong `.gitignore` nhưng vẫn bị đóng gói. `npm run build` sẽ tạo lại |
| `ShoegroupDB.sql` | 61 byte, chỉ có `CREATE DATABASE` + `USE`. Đã gộp vào script đầy đủ |

## 6. Thư viện đã gỡ khỏi `package.json`

Đây là phần đáng chú ý nhất: frontend Vue đang khai báo **toàn bộ hệ sinh thái React**.

| Gỡ | Lý do |
|---|---|
| `react`, `react-dom` | `grep 'from "react"'` → 0 kết quả. Đây là dự án Vue |
| `react-router-dom` | Không dùng; đang dùng `vue-router` |
| `lucide-react` | Icon cho React; đang dùng `bootstrap-icons` |
| `motion` | 0 kết quả |
| `axios` | 0 kết quả; toàn bộ dự án dùng `fetch` |
| `express`, `nodemailer`, `dotenv` | Thư viện **backend** bị khai báo trong package.json của frontend. Đã chuyển về `backend/package.json` |
| `typescript` | Không còn file `.ts` |
| `vite` (trong `dependencies`) | Bị khai báo **2 lần** — vừa `dependencies` vừa `devDependencies`. Chỉ giữ ở `devDependencies` |
| `express@^4.21.2` ở root | Xung đột phiên bản với `express@^5.2.1` của backend — rất dễ gây lỗi khó đoán |

**Giữ lại:** `vue`, `vue-router`, `bootstrap`, `bootstrap-icons` (dùng trong `main.js`), `chart.js` (dùng trong `DashboardPage.vue`), `concurrently` (script `dev`).

## 7. Giữ lại có chủ đích

| File | Vì sao không xoá |
|---|---|
| `src/data/mockData.js` | Vẫn được 5 view dùng làm dữ liệu dự phòng khi API lỗi |
| `src/components/SakuraFalling.vue`, `PromoModal.vue`, `CenterNotify.vue` | Đều được `App.vue` gọi |
| `backend/legacy/server.original.js` | Bản gốc nguyên vẹn để đối chiếu và rollback |
| `database/legacy_*.sql` | Bản SQL cũ của bạn, chỉ để lưu trữ — không cần chạy |

---

## Kết quả

| | Trước | Sau |
|---|---|---|
| Dung lượng (không tính `node_modules`) | ~19 MB | ~1.3 MB |
| Số file | 188 | 74 |
| Thư viện frontend | 20 | 8 |
