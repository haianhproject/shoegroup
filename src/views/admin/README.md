# Khu Quản Trị (Admin) – Đã tách thành nhiều file

Toàn bộ nội dung từ file `AdminDashboard.vue` cũ (tất cả trong 1 file) đã được tách ra:

- **Màn hình chào** “Xin chào quản lý” hiển giữa màn hình, bấm xác nhận → vào khu quản trị.
- **Layout**: thanh nav bên trái (dùng chung), nội dung từng trang hiển bên phải.
- **Mỗi mục quản lý = 1 file trang riêng** trong `pages/`, liên kết với nhau bằng nav (Vue Router).

## Cấu trúc thư mục

```
admin/
├─ AdminWelcome.vue        # Màn hình "Xin chào quản lý"
├─ AdminLayout.vue         # Khung: nav trái + header + <router-view> + modal/toast dùng chung
├─ adminStore.js           # Toàn bộ state & logic dùng chung (thay cho <script setup> cũ)
├─ adminRoutes.js          # Khai báo route cho khu quản trị
├─ admin-theme.css         # CSS dùng chung cho mọi trang
└─ pages/
   ├─ DashboardPage.vue        (Thống Kê Tổng Quan)
   ├─ OrdersPage.vue           (Quản Lý Đơn Hàng)
   ├─ PaymentsPage.vue         (Xác Nhận Thanh Toán)
   ├─ ReturnsPage.vue          (Trả Hàng / Đổi Trả)
   ├─ PosPage.vue              (Bán Hàng Tại Quầy)
   ├─ ProductsPage.vue         (Quản Lý Sản Phẩm + form thêm/sửa)
   ├─ InventoryPage.vue        (Quản Lý Kho Hàng)
   ├─ CategoriesPage.vue       (Nhóm Danh Mục)
   ├─ BrandsPage.vue           (Thương Hiệu)
   ├─ CollectionsPage.vue      (Bộ Sưu Tập)
   ├─ DiscountsPage.vue        (Mã Khuyến Mãi)
   ├─ VariantDiscountsPage.vue (Giảm Giá Biến Thể Màu)
   ├─ CustomersPage.vue        (Khách Hàng CRM)
   ├─ StaffReportPage.vue      (Báo Cáo Nhân Viên)
   └─ AccountsPage.vue         (Quản Lý Tài Khoản)
```

## Cài đặt

1. **Chép thư mục** `admin/` vào `src/` của dự án → `src/admin/`.
   (Đường dẫn import giả định là `src/admin/`. `adminStore.js` và `AdminLayout.vue` import authStore theo `../stores/authStore`, trùng với file gốc.)

2. **Đăng ký route** trong router chính:

   ```js
   import adminRoutes from '../admin/adminRoutes'
   const routes = [
     ...adminRoutes,
     // ... các route khác (login, trang khách...)
   ]
   ```

3. **Gỡ route cũ** trỏ tới `AdminDashboard.vue` (nếu có). Điểm vào mới:
   - `/admin` → màn hình chào
   - `/admin/panel` → khu quản trị
   Trang login đã được cập nhật để chuyển Admin → `/admin`.

4. **Dependencies cần có**:
   ```bash
   npm install vue-router chart.js
   ```
   Bootstrap 5 + bootstrap-icons vẫn dùng như dự án gốc (bootstrap-icons được import sẵn trong `admin-theme.css`).

## Ghi chú

- Mọi state/logic nằm trong `adminStore.js` dưới dạng “store” singleton (dùng `reactive`/`ref` của Vue) nên mọi trang chia sẻ chung dữ liệu – không phải gọi API lại khi chuyển trang.
- `AdminLayout.vue` gọi `fetchAllData()` một lần khi vào panel.
- API endpoint giữ nguyên: `http://localhost:5000/api` (sửa trong `adminStore.js` nếu cần).
