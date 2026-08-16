import { createRouter, createWebHistory } from "vue-router";
import adminRoutes from "../views/admin/adminRoutes.js";
import { isAuthenticated, currentUser } from "../stores/authStore";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // --- ROUTE KHACH HANG ---
    { path: "/", name: "home", component: () => import("../views/HomeDisplay.vue") },
    { path: "/products", name: "products", component: () => import("../views/ProductsView.vue") },
    { path: "/about", name: "about", component: () => import("../views/AboutView.vue") },
    { path: "/contact", name: "contact", component: () => import("../views/ContactView.vue") },
    { path: "/product/:id", name: "ProductDetail", component: () => import("../views/ProductDetail.vue") },
    { path: "/login", name: "login", component: () => import("../views/LoginView.vue") },
    { path: "/register", name: "register", component: () => import("../views/RegisterView.vue") },
    { path: "/cart", name: "UserCart", component: () => import("../views/UserCart.vue") },
    { path: "/checkout", name: "checkout", component: () => import("../views/CheckoutView.vue"), meta: { requiresAuth: true } },
    { path: "/order-success", name: "order-success", component: () => import("../views/OrderSuccessView.vue"), meta: { requiresAuth: true } },
    { path: "/forgot-password", name: "forgot-password", component: () => import("../views/ForgotPasswordView.vue") },
    { path: "/reset-password", name: "reset-password", component: () => import("../views/ResetPasswordView.vue") },
    { path: "/account", name: "account", component: () => import("../views/AccountView.vue"), meta: { requiresAuth: true } },
    { path: "/orders", name: "orders", component: () => import("../views/MyOrders.vue"), meta: { requiresAuth: true } },
    { path: "/returns", name: "returns", component: () => import("../views/ReturnView.vue"), meta: { requiresAuth: true } },
    { path: "/returns/:orderId", name: "return-order", component: () => import("../views/ReturnView.vue"), meta: { requiresAuth: true } },

    // --- ROUTE ADMIN ---
    ...adminRoutes,
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

/* =====================================================================
   BAO MAT DIEU HUONG
   - Khu quan tri (/admin, /admin/panel/...) BAT BUOC dang nhap + quyen admin.
   - Guard chay cho MOI lan dieu huong (ke ca khi bam nut Back trinh duyet),
     nen sau khi dang xuat thi quay lai trang quan tri se bi day ve dang nhap.
   - Mot so trang khach hang (thanh toan, tai khoan, don hang) cung can dang nhap.
   ===================================================================== */
const isAdmin = () => {
  const u = currentUser.value;
  return !!u && (u.role === "Admin" || u.role_id === 1 || u.RoleID === 1);
};

router.beforeEach((to) => {
  const path = to.path || "";
  const adminArea = path === "/admin" || path.startsWith("/admin/");

  if (adminArea) {
    if (!isAuthenticated.value) return { path: "/login", query: { redirect: path } };
    if (!isAdmin()) return { path: "/" };
    return true;
  }

  if (to.meta && to.meta.requiresAuth && !isAuthenticated.value) {
    return { path: "/login", query: { redirect: path } };
  }
  return true;
});

/* Tu dong tai lai khi trinh duyet khong tai duoc chunk (loi Vite hay gap khi dev):
   "Failed to fetch dynamically imported module" -> tranh man hinh trang. */
router.onError((error, to) => {
  const msg = (error && error.message) || "";
  const isChunkErr = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(msg);
  if (!isChunkErr) return;
  const key = "sg_chunk_reload_at";
  const now = Date.now();
  const last = Number(sessionStorage.getItem(key) || 0);
  if (now - last > 10000) {
    sessionStorage.setItem(key, String(now));
    if (to && to.fullPath) window.location.assign(to.fullPath);
    else window.location.reload();
  }
});

export default router;
