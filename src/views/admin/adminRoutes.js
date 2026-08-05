/*
 * adminRoutes.js
 * ------------------------------------------------------------------
 * Định nghĩa route cho toàn bộ khu quản trị.
 *
 * Cách dùng trong router chính (src/router/index.js):
 *
 *   import adminRoutes from '../admin/adminRoutes'
 *   const routes = [
 *     ...adminRoutes,
 *     // các route khác của bạn (login, trang khách hàng, ...)
 *   ]
 *
 * Sơ đồ route:
 *   /admin              -> Màn hình "Xin chào quản lý" (AdminWelcome)
 *   /admin/panel        -> Khung quản trị (AdminLayout) + nav trái
 *     └ các trang con hiển thị bên phải qua <router-view>
 * ------------------------------------------------------------------
 */

const adminRoutes = [
  {
    path: "/admin",
    name: "admin-welcome",
    component: () => import("./AdminWelcome.vue"),
  },
  {
    path: "/admin/panel",
    component: () => import("./AdminLayout.vue"),
    children: [
      { path: "", redirect: "/admin/panel/dashboard" },
      {
        path: "dashboard",
        name: "admin-dashboard",
        component: () => import("./pages/DashboardPage.vue"),
        meta: { title: "Thống Kê Tổng Quan" },
      },
      {
        path: "payments",
        name: "admin-payments",
        component: () => import("./pages/PaymentsPage.vue"),
        meta: { title: "Xác Nhận Thanh Toán" },
      },
      {
        path: "returns",
        name: "admin-returns",
        component: () => import("./pages/ReturnsPage.vue"),
        meta: { title: "Trả Hàng / Đổi Trả" },
      },
      {
        path: "pos",
        name: "admin-pos",
        component: () => import("./pages/PosPage.vue"),
        meta: { title: "Bán Hàng Tại Quầy" },
      },
      {
        path: "products",
        name: "admin-products",
        component: () => import("./pages/ProductsPage.vue"),
        meta: { title: "Quản Lý Sản Phẩm" },
      },
      {
        path: "inventory",
        name: "admin-inventory",
        component: () => import("./pages/InventoryPage.vue"),
        meta: { title: "Quản Lý Kho Hàng" },
      },
      {
        path: "categories",
        name: "admin-categories",
        component: () => import("./pages/CategoriesPage.vue"),
        meta: { title: "Nhóm Danh Mục" },
      },
      {
        path: "brands",
        name: "admin-brands",
        component: () => import("./pages/BrandsPage.vue"),
        meta: { title: "Thương Hiệu" },
      },
      {
        path: "collections",
        name: "admin-collections",
        component: () => import("./pages/CollectionsPage.vue"),
        meta: { title: "Bộ Sưu Tập" },
      },
      {
        path: "materials",
        name: "admin-materials",
        component: () => import("./pages/MaterialsPage.vue"),
        meta: { title: "Chất Liệu" },
      },
      {
        path: "colors",
        name: "admin-colors",
        component: () => import("./pages/ColorsPage.vue"),
        meta: { title: "Màu Sắc" },
      },
      {
        path: "sizes",
        name: "admin-sizes",
        component: () => import("./pages/SizesPage.vue"),
        meta: { title: "Kích Thước" },
      },
      {
        path: "discounts",
        name: "admin-discounts",
        component: () => import("./pages/DiscountsPage.vue"),
        meta: { title: "Mã Khuyến Mãi" },
      },
      {
        path: "variant-discounts",
        name: "admin-variant-discounts",
        component: () => import("./pages/VariantDiscountsPage.vue"),
        meta: { title: "Giảm Giá Biến Thể Màu" },
      },
      {
        path: "customers",
        name: "admin-customers",
        component: () => import("./pages/CustomersPage.vue"),
        meta: { title: "Khách Hàng (CRM)" },
      },
      {
        path: "staff-report",
        name: "admin-staff-report",
        component: () => import("./pages/StaffReportPage.vue"),
        meta: { title: "Báo Cáo Nhân Viên" },
      },
      {
        path: "accounts",
        name: "admin-accounts",
        component: () => import("./pages/AccountsPage.vue"),
        meta: { title: "Quản Lý Tài Khoản" },
      },
    ],
  },
];

export default adminRoutes;
