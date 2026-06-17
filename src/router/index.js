import { createRouter, createWebHistory } from "vue-router";
import HomeDisplay from "../views/HomeDisplay.vue";
import { getCurrentUser } from "../stores/authStore";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeDisplay,
    },
    {
      path: "/product/:id",
      name: "product-detail",
      component: () => import("../views/ProductDetail.vue"),
    },
    {
      path: "/cart",
      name: "cart",
      component: () => import("../views/UserCart.vue"),
    },
    {
      path: "/checkout",
      name: "checkout",
      component: () => import("../views/CheckoutView.vue"),
      meta: { requiresAuth: true },
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
      path: "/forgot-password",
      name: "forgot-password",
      component: () => import("../views/ForgotPasswordView.vue"),
    },
    {
      path: "/account",
      name: "account",
      component: () => import("../views/AccountView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminDashboard.vue')
    },
    {
  path: '/admin/products',
  name: 'ProductManagement',
  component: () => import('../views/ProductManagement.vue')
}
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !getCurrentUser()) {
    return {
      path: "/login",
      query: { redirect: to.fullPath },
    };
  }

  return true;
});

export default router;
