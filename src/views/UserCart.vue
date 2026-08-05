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

const handleIncrease = (id) => {
  const r = increaseQuantity(id)
  if (!r.ok) notify({ type: 'warning', message: r.message })
}

const handleDecrease = (id) => {
  const r = decreaseQuantity(id)
  if (!r.ok && r.message !== 'Số lượng tối thiểu là 1') {
    notify({ type: 'warning', message: r.message })
  }
}
</script>

<template>
  <div class="cart-page">
    <div class="container-fluid px-4 py-5" style="max-width: 1200px; margin: 0 auto;">
      <h1 class="cart-title">GIỎ HÀNG CỦA BẠN</h1>
      <p class="text-secondary cart-count-text">{{ cartCount }} SẢN PHẨM</p>

      <div class="sg-title-bar mb-5"></div>

      <div v-if="cartCount === 0" class="empty-state">
        <i class="bi bi-bag"></i>
        <h5>Giỏ hàng đang trống</h5>
        <p class="text-secondary mb-4">Hãy khám phá các mẫu giày thể thao mới nhất của chúng tôi.</p>
        <router-link to="/products" class="btn-sg">TIẾP TỤC MUA SẮM</router-link>
      </div>

      <div v-else class="row g-5">
        <div class="col-lg-8">
          <div class="cart-list">
            <div class="cart-item" v-for="item in cartItems" :key="item.id_product_detail">
              <router-link :to="`/product/${item.id_product}`" class="ci-img">
                <img :src="item.product?.image_url" :alt="item.product?.product_name">
              </router-link>
              
              <div class="ci-body">
                <div class="d-flex justify-content-between align-items-start gap-3">
                  <router-link :to="`/product/${item.id_product}`" class="ci-name">
                    {{ item.product?.product_name }}
                  </router-link>
                  <button class="ci-remove" @click="removeFromCart(item.id_product_detail)" title="Xóa">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
                
                <div class="ci-attrs">
                  <span v-for="a in attrsOf(item)" :key="a.label" class="ci-attr-item">
                    {{ a.label }}: {{ a.value }}
                  </span>
                </div>
                
                <div class="ci-foot mt-4">
                  <div class="qty-box">
                    <button @click="handleDecrease(item.id_product_detail)"><i class="bi bi-dash"></i></button>
                    <span>{{ item.quantity }}</span>
                    <button @click="handleIncrease(item.id_product_detail)"><i class="bi bi-plus"></i></button>
                  </div>
                  <div class="ci-price">{{ formatCurrency(item.subtotal) }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <button class="btn-clear-cart" @click="clearCart">
            XÓA TOÀN BỘ GIỎ HÀNG
          </button>
        </div>

        <div class="col-lg-4">
          <div class="summary-box">
            <h6 class="summary-title">TÓM TẮT ĐƠN HÀNG</h6>
            
            <div class="sum-row mt-4">
              <span>Tạm tính</span>
              <span>{{ formatCurrency(cartSubtotal) }}</span>
            </div>
            
            <div class="sum-row">
              <span>Phí giao hàng (dự kiến)</span>
              <span>{{ formatCurrency(cartShippingFee) }}</span>
            </div>
            
            <hr class="summary-divider">
            
            <div class="sum-row total">
              <span>TỔNG CỘNG</span>
              <strong>{{ formatCurrency(cartTotal) }}</strong>
            </div>
            
            <button class="btn-sg-warm w-100 mt-4" @click="goCheckout">
              TIẾN HÀNH THANH TOÁN
            </button>
            <router-link to="/products" class="btn-sg-outline w-100 mt-3 text-center d-block">
              TIẾP TỤC MUA SẮM
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cart-page {
  background: #ffffff;
  min-height: 100vh;
}

.cart-title {
  font-weight: 700;
  font-size: 1.5rem;
  letter-spacing: 0.12em;
  color: #1a1a1a;
  margin: 0 0 4px;
}

.cart-count-text {
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 24px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: #fafafa;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
}
.empty-state i {
  font-size: 2.5rem;
  color: #ccc;
  display: block;
  margin-bottom: 16px;
}
.empty-state h5 {
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

/* Cart Item */
.cart-list {
  border-top: 1px solid #e5e5e5;
}
.cart-item {
  display: flex;
  gap: 24px;
  padding: 24px 0;
  border-bottom: 1px solid #e5e5e5;
}
.ci-img {
  width: 140px;
  height: 140px;
  background: #f5f5f5;
  flex-shrink: 0;
  display: block;
}
.ci-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.ci-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.ci-name {
  font-weight: 600;
  font-size: 1.1rem;
  color: #1a1a1a;
  text-decoration: none;
  line-height: 1.3;
}
.ci-name:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}
.ci-remove {
  border: 0;
  background: transparent;
  color: #888;
  font-size: 1.2rem;
  padding: 4px;
  cursor: pointer;
  transition: color 0.2s;
}
.ci-remove:hover {
  color: #D4001A;
}

.ci-attrs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}
.ci-attr-item {
  font-size: 0.85rem;
  color: #555;
  border-right: 1px solid #ddd;
  padding-right: 12px;
}
.ci-attr-item:last-child {
  border-right: none;
  padding-right: 0;
}

.ci-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

/* Quantity Box */
.qty-box {
  display: inline-flex;
  align-items: center;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
}
.qty-box button {
  width: 32px;
  height: 32px;
  border: 0;
  background: transparent;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}
.qty-box button:hover {
  background: #f5f5f5;
}
.qty-box span {
  width: 40px;
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
  color: #1a1a1a;
  border-left: 1px solid #e5e5e5;
  border-right: 1px solid #e5e5e5;
  line-height: 32px;
}

.ci-price {
  font-weight: 600;
  font-size: 1.15rem;
  color: #1a1a1a;
}

.btn-clear-cart {
  border: 0;
  background: transparent;
  color: #555;
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  margin-top: 24px;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 4px;
  cursor: pointer;
}
.btn-clear-cart:hover {
  color: #1a1a1a;
}

/* Summary Box */
.summary-box {
  background: #fafafa;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  padding: 32px;
  position: sticky;
  top: 100px;
}
.summary-title {
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 0.1em;
  color: #1a1a1a;
  margin: 0;
}
.sum-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  color: #555;
  font-size: 0.95rem;
}
.summary-divider {
  border-top: 1px solid #e5e5e5;
  margin: 20px 0;
}
.sum-row.total {
  font-size: 1.1rem;
  color: #1a1a1a;
  font-weight: 600;
}
.sum-row.total strong {
  font-weight: 700;
}

@media (max-width: 768px) {
  .cart-item {
    flex-direction: column;
    gap: 16px;
  }
  .ci-img {
    width: 100%;
    height: 240px;
  }
  .summary-box {
    padding: 20px;
    margin-top: 32px;
  }
}
</style>
