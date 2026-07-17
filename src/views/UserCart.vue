<script setup>
import { useRouter } from 'vue-router'
import {
  cartItems, cartCount, cartSubtotal, cartShippingFee, cartTotal,
  formatCurrency, increaseQuantity, decreaseQuantity, removeFromCart, clearCart,
} from '../stores/cartStore'
import { notify } from '../stores/uiStore'
import { isAuthenticated } from '../stores/authStore'

const router = useRouter()

const goCheckout = () => {
  if (!isAuthenticated.value) {
    notify({ type: 'warning', title: 'Cần đăng nhập', message: 'Vui lòng đăng nhập để thanh toán.' })
    router.push('/login')
    return
  }
  router.push('/checkout')
}
const attrsOf = (item) => {
  const a = item.attributes || item.product || {}
  return [
    { label: 'Size', value: item.size?.size_name },
    { label: 'Màu', value: item.color?.color_label },
    { label: 'Chất liệu', value: a.material_name },
    { label: 'Đế', value: a.sole_name },
    { label: 'Đệm', value: a.cushioning_name },
    { label: 'Bộ môn', value: a.sport },
  ].filter((x) => x.value)
}
</script>

<template>
  <div class="cart-page">
    <div class="container-fluid px-4 py-4">
      <div class="sg-title-bar mb-2"></div>
      <h1 class="cart-title">Giỏ hàng của bạn</h1>
      <p class="text-secondary">{{ cartCount }} sản phẩm trong giỏ</p>

      <div v-if="cartCount === 0" class="empty sg-card">
        <i class="bi bi-bag-x"></i>
        <h5>Giỏ hàng đang trống</h5>
        <p class="text-secondary">Hãy khám phá các mẫu giày thể thao mới nhất của chúng tôi.</p>
        <router-link to="/products" class="btn-sg"><i class="bi bi-bag me-2"></i>Tiếp tục mua sắm</router-link>
      </div>

      <div v-else class="row g-4 mt-1">
        <div class="col-lg-8">
          <div class="cart-item sg-card" v-for="item in cartItems" :key="item.id_product_detail">
            <router-link :to="`/product/${item.id_product}`" class="ci-img">
              <img :src="item.product?.image_url" :alt="item.product?.product_name">
            </router-link>
            <div class="ci-body">
              <div class="d-flex justify-content-between align-items-start gap-2">
                <router-link :to="`/product/${item.id_product}`" class="ci-name">{{ item.product?.product_name }}</router-link>
                <button class="ci-remove" @click="removeFromCart(item.id_product_detail)"><i class="bi bi-trash3"></i></button>
              </div>
              <div class="ci-attrs">
                <span v-for="a in attrsOf(item)" :key="a.label" class="sg-chip sg-chip-blue">{{ a.label }}: {{ a.value }}</span>
              </div>
              <div class="ci-foot">
                <div class="qty-box">
                  <button @click="decreaseQuantity(item.id_product_detail)"><i class="bi bi-dash"></i></button>
                  <span>{{ item.quantity }}</span>
                  <button @click="increaseQuantity(item.id_product_detail)"><i class="bi bi-plus"></i></button>
                </div>
                <div class="ci-price">{{ formatCurrency(item.subtotal) }}</div>
              </div>
            </div>
          </div>
          <button class="btn-clear-cart" @click="clearCart"><i class="bi bi-x-circle me-1"></i>Xóa toàn bộ giỏ hàng</button>
        </div>

        <div class="col-lg-4">
          <div class="summary sg-card">
            <h6 class="fw-bold mb-3">Tóm tắt đơn hàng</h6>
            <div class="sum-row"><span>Tạm tính</span><strong>{{ formatCurrency(cartSubtotal) }}</strong></div>
            <div class="sum-row"><span>Phí giao hàng (dự kiến)</span><strong>{{ formatCurrency(cartShippingFee) }}</strong></div>
            <hr>
            <div class="sum-row total"><span>Tổng cộng</span><strong>{{ formatCurrency(cartTotal) }}</strong></div>
            <button class="btn-sg w-100 mt-3" @click="goCheckout"><i class="bi bi-credit-card me-2"></i>Tiến hành thanh toán</button>
            <router-link to="/products" class="btn-sg-outline w-100 mt-2 text-center d-block text-decoration-none">Tiếp tục mua sắm</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cart-page { background: var(--sg-canvas); min-height: 100vh; }
.cart-title { font-weight: 900; font-size: 1.9rem; letter-spacing: -.02em; }
.empty { text-align: center; padding: 60px 20px; margin-top: 20px; }
.empty i { font-size: 2rem; color: var(--sg-muted); }
.empty h5 { font-weight: 800; margin-top: 12px; }
.cart-item { display: flex; gap: 16px; padding: 16px; margin-bottom: 14px; }
.ci-img { width: 110px; height: 110px; border-radius: 14px; overflow: hidden; background: var(--sg-canvas); flex-shrink: 0; }
.ci-img img { width: 100%; height: 100%; object-fit: cover; mix-blend-mode: multiply; }
.ci-body { flex: 1; min-width: 0; }
.ci-name { font-weight: 800; color: var(--sg-ink); text-decoration: none; font-size: 1.05rem; }
.ci-name:hover { color: var(--sg-blue); }
.ci-remove { border: 0; background: var(--sg-canvas); color: #ef4444; width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0; }
.ci-remove:hover { background: #fee2e2; }
.ci-attrs { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.ci-attrs .sg-chip { font-size: .72rem; }
.ci-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.qty-box { display: flex; align-items: center; border: 1.5px solid var(--sg-line); border-radius: 999px; overflow: hidden; }
.qty-box button { width: 38px; height: 40px; border: 0; background: #fff; }
.qty-box button:hover { background: var(--sg-canvas); }
.qty-box span { width: 38px; text-align: center; font-weight: 800; }
.ci-price { font-weight: 900; font-size: 1.15rem; color: var(--sg-blue-700); }
.btn-clear-cart { border: 0; background: transparent; color: var(--sg-muted); font-weight: 600; font-size: .88rem; margin-top: 6px; }
.btn-clear-cart:hover { color: #ef4444; }
.summary { padding: 22px; position: sticky; top: 90px; }
.sum-row { display: flex; justify-content: space-between; margin-bottom: 10px; color: var(--sg-ink-2); }
.sum-row.total { font-size: 1.2rem; color: var(--sg-ink); }
.sum-row.total strong { color: var(--sg-blue-700); }
</style>
