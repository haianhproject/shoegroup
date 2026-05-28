import { createRouter, createWebHistory } from 'vue-router'
import HomeDisplay from '../views/HomeDisplay.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeDisplay
    },
    {
      path: '/product/:id',
      name: 'product-detail',
      component: () => import('../views/ProductDetail.vue')
    },
    {
      path: '/cart',
      name: 'cart',
      component: () => import('../views/UserCart.vue')
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue')
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/ForgotPasswordView.vue')
    },
    {
      path: '/account',
      name: 'account',
      component: () => import('../views/AccountView.vue')
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('../views/MyOrders.vue')
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminDashboard.vue')
    }
  ],
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
