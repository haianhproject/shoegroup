import { createRouter, createWebHistory } from "vue-router";
// Import file router của admin vào đây
import adminRoutes from "../views/admin/adminRoutes.js";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // --- CÁC ROUTE DÀNH CHO KHÁCH HÀNG ---
    {
      path: "/",
      name: "home",
      component: () => import("../views/HomeDisplay.vue"),
    },
    {
      path: "/products",
      name: "products",
      component: () => import("../views/ProductsView.vue"),
    },
    {
      path: "/product/:id",
      name: "ProductDetail",
      component: () => import("../views/ProductDetail.vue"),
    },
    {
      path: "/login",
      name: "login",
      component: () => import("../views/LoginView.vue"),
    },
    {
      path: "/register",
      name: "register",
      component: () => import("../views/RegisterView.vue"),
    },
    {
      path: "/cart",
      name: "UserCart",
      component: () => import("../views/UserCart.vue"),
    },
    {
      path: "/checkout",
      name: "checkout",
      component: () => import("../views/CheckoutView.vue"),
    },
    {
      path: "/forgot-password",
      name: "forgot-password",
      component: () => import("../views/ForgotPasswordView.vue"),
    },
    {
      path: "/account",
      name: "account",
      component: () => import("../views/AccountView.vue"),
    },
    {
      path: "/orders",
      name: "orders",
      component: () => import("../views/MyOrders.vue"),
    },

    // --- GỘP TOÀN BỘ ROUTE ADMIN VÀO ĐÂY ---
    // Dấu 3 chấm (...) sẽ tự giải nén toàn bộ các cấu hình từ file adminRoutes sang đây
    ...adminRoutes,
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
