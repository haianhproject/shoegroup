<script setup>
import { onUnmounted, computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  cartState, cartItems, cartCount, cartSubtotal, cartShippingFee, cartTotal,
  formatCurrency, increaseQuantity, decreaseQuantity, removeFromCart, clearCart,
  refreshCartAvailability, cartHasUnavailableItems, isCheckingCartStock,
  hideDrawer,
} from '../stores/cartStore'
import { notify } from '../stores/uiStore'
import { isAuthenticated } from '../stores/authStore'
import { api } from '../services/apiClient'

const router = useRouter()
const isOpen = computed(() => cartState.isDrawerOpen)

let stockPollTimer = null
let lastUnavailableSignature = ''

const close = () => hideDrawer()

const checkCartStock = async ({ announceCurrent = false } = {}) => {
  const result = await refreshCartAvailability()
  if (!result.ok) return result
  const unavailable = [...result.outOfStock, ...result.insufficient]
  const signature = unavailable.map(item => `${item.id_product_detail}:${item.stockAvailability}:${item.stockQuantity}`).sort().join('|')
  const shouldAnnounce = unavailable.length > 0 && (announceCurrent || result.newlyUnavailable.length > 0) && signature !== lastUnavailableSignature
  if (shouldAnnounce) {
    if (result.outOfStock.length > 0) {
      notify({ type: 'error', title: 'Sản phẩm vừa hết hàng', message: `${result.outOfStock.length} sản phẩm trong giỏ đã hết do khách khác mua trước.` })
    } else {
      notify({ type: 'warning', title: 'Số lượng trong kho đã thay đổi', message: 'Một số sản phẩm không còn đủ số lượng. Vui lòng giảm số lượng.' })
    }
  }
  lastUnavailableSignature = signature
  return result
}

const onVisible = () => { if (document.visibilityState === 'visible' && isOpen.value) checkCartStock() }

watch(isOpen, async (open) => {
  if (open) {
    await checkCartStock({ announceCurrent: true })
    stockPollTimer = window.setInterval(() => checkCartStock(), 30000)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    fetchSuggestions()
  } else {
    if (stockPollTimer) window.clearInterval(stockPollTimer)
    stockPollTimer = null
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', onVisible)
  }
})

onUnmounted(() => {
  if (stockPollTimer) window.clearInterval(stockPollTimer)
  document.removeEventListener('visibilitychange', onVisible)
  window.removeEventListener('focus', onVisible)
})

const goCheckout = async () => {
  const stockResult = await checkCartStock({ announceCurrent: true })
  if (!stockResult.ok) { notify({ type: 'warning', title: 'Chưa kiểm tra được tồn kho', message: 'Vui lòng thử lại.' }); return }
  if (stockResult.outOfStock.length || stockResult.insufficient.length || cartHasUnavailableItems.value) {
    notify({ type: 'error', title: 'Chưa thể thanh toán', message: 'Hãy xóa sản phẩm hết hàng hoặc giảm số lượng.' }); return
  }
  if (!isAuthenticated.value) { notify({ type: 'warning', title: 'Cần đăng nhập', message: 'Vui lòng đăng nhập để thanh toán.' }); router.push('/login'); hideDrawer(); return }
  hideDrawer()
  router.push('/checkout')
}

const attrsOf = (item) => {
  return [{ label: 'Size', value: item.size?.size_name }, { label: 'Màu', value: item.color?.color_label }].filter(x => x.value)
}
const handleIncrease = (item) => { const r = increaseQuantity(item.id_product_detail); if (!r.ok) notify({ type: 'warning', message: r.message }) }
const handleDecrease = (id) => { const r = decreaseQuantity(id); if (!r.ok && r.message !== 'Số lượng tối thiểu là 1') notify({ type: 'warning', message: r.message }) }

// Suggestions: 3 sản phẩm đầu trang
const suggestions = ref([])
const fetchSuggestions = async () => {
  if (suggestions.value.length) return
  try {
    const products = await api.get('/products')
    if (Array.isArray(products)) {
      suggestions.value = products.slice(0, 3).map(p => ({
        id: p.id ?? p.ProductID ?? p.product_id,
        name: p.product_name ?? p.name ?? p.ProductName ?? 'Sản phẩm',
        price: Number(p.sale_price ?? p.SalePrice ?? 0) > 0
          ? Number(p.sale_price ?? p.SalePrice)
          : Number(p.price ?? p.BasePrice ?? 0),
        image: p.image_url ?? p.ImageURL ?? p.image ?? '',
        brand: p.brand_name ?? p.BrandName ?? p.brand ?? 'ShoeGroup',
      }))
    }
  } catch { suggestions.value = [] }
}

const addSuggestedToCart = async (p) => {
  // điều hướng sang chi tiết để chọn size/màu đầy đủ
  hideDrawer()
  router.push(`/product/${p.id}`)
}
</script>

<template>
  <teleport to="body">
    <transition name="drawer-fade">
      <div v-if="isOpen" class="cart-drawer-overlay" @click.self="close">
        <aside class="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" @click.stop @keydown.esc="close">
          <!-- Header -->
          <div class="drawer-header">
            <h2 id="cart-drawer-title" class="drawer-title">Giỏ hàng của bạn ({{ cartCount }})</h2>
            <button class="drawer-close" @click="close" aria-label="Đóng"><i class="icon icon-x-lg"></i></button>
          </div>

          <!-- Body -->
          <div class="drawer-body">
            <div v-if="cartCount === 0" class="empty-state">
              <i class="icon icon-bag"></i>
              <h3>Giỏ hàng trống</h3>
              <p>Thêm vài đôi giày để bắt đầu.</p>
              <router-link to="/products" class="btn-sg-dark" @click="close">Khám phá sản phẩm</router-link>
            </div>

            <div v-else class="cart-compact-list">
              <div class="cart-compact-item" :class="{ 'is-unavailable': item.isOutOfStock || item.hasInsufficientStock }" v-for="item in cartItems" :key="item.id_product_detail">
                <router-link :to="`/product/${item.id_product}`" class="cc-img" @click="close">
                  <img :src="item.color?.image || item.product?.image_url" :alt="item.product?.product_name">
                  <span v-if="item.isOutOfStock" class="cc-oos">HẾT HÀNG</span>
                </router-link>
                <div class="cc-info">
                  <div class="cc-heading">
                    <div class="cc-heading-copy">
                      <router-link :to="`/product/${item.id_product}`" class="cc-name" @click="close">{{ item.product?.product_name }}</router-link>
                      <div class="cc-variant">{{ attrsOf(item).map(a=>a.value).join(' / ') || '—' }}</div>
                    </div>
                    <div class="cc-price">{{ formatCurrency(item.subtotal) }}</div>
                  </div>
                  <div v-if="item.isOutOfStock" class="cc-alert">Biến thể đã hết hàng.</div>
                  <div v-else-if="item.hasInsufficientStock" class="cc-alert warn">Kho chỉ còn {{ item.stockQuantity }}.</div>
                  <router-link
                    v-if="item.isOutOfStock || item.hasInsufficientStock"
                    :to="`/product/${item.id_product}`"
                    class="cc-choose-variant"
                    @click="close"
                  ><i class="icon icon-arrow-repeat mr-1"></i>Chọn biến thể khác</router-link>
                  <div class="cc-actions">
                    <div class="qty-compact">
                      <button :disabled="item.isOutOfStock || item.quantity <= 1" @click="handleDecrease(item.id_product_detail)" :aria-label="`Giảm số lượng ${item.product?.product_name}`"><i class="icon icon-dash" aria-hidden="true"></i></button>
                      <span>{{ item.quantity }}</span>
                      <button :disabled="item.isOutOfStock || item.hasInsufficientStock || item.quantity >= Number(item.stockQuantity || 0)" @click="handleIncrease(item)" :aria-label="`Tăng số lượng ${item.product?.product_name}`"><i class="icon icon-plus" aria-hidden="true"></i></button>
                    </div>
                    <div class="cc-unit-actions">
                      <span class="cc-unit">{{ formatCurrency(item.unitPrice) }} / sp</span>
                      <button class="cc-remove" @click="removeFromCart(item.id_product_detail)" :aria-label="`Xóa ${item.product?.product_name}`" title="Xóa"><i class="icon icon-trash" aria-hidden="true"></i></button>
                    </div>
                  </div>
                </div>
              </div>

              <button class="btn-clear-compact" @click="clearCart">Xóa toàn bộ giỏ hàng</button>

              <!-- Gợi ý 3 sản phẩm -->
              <div class="suggest-box">
                <div class="suggest-head">
                  <span>GỢI Ý DÀNH CHO BẠN</span>
                  <router-link to="/products" class="suggest-link" @click="close">Xem thêm</router-link>
                </div>
                <div v-if="suggestions.length" class="suggest-grid-3">
                  <button v-for="p in suggestions" :key="p.id" class="suggest-card-3" @click="addSuggestedToCart(p)">
                    <span class="suggest-img">
                      <img :src="p.image" :alt="p.name" />
                    </span>
                    <span class="suggest-name">{{ p.name }}</span>
                    <span class="suggest-price">{{ formatCurrency(p.price) }}</span>
                  </button>
                </div>
                <div v-else class="suggest-grid">
                  <router-link to="/products" class="suggest-card" @click="close"><i class="icon icon-plus-lg"></i><span>Khám phá thêm</span></router-link>
                  <router-link to="/products" class="suggest-card" @click="close"><i class="icon icon-plus-lg"></i><span>Sản phẩm mới</span></router-link>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer (đã bỏ ghi chú + icon) -->
          <div v-if="cartCount > 0" class="drawer-footer">
            <div class="footer-row">
              <span>Tạm tính ({{ cartCount }} sản phẩm)</span>
              <strong>{{ formatCurrency(cartSubtotal) }}</strong>
            </div>
            <div class="footer-row footer-shipping">
              <span>Phí vận chuyển</span>
              <span>{{ formatCurrency(cartShippingFee) }}</span>
            </div>
            <button class="btn-checkout" :disabled="isCheckingCartStock || cartHasUnavailableItems" @click="goCheckout">
              <i class="icon icon-bag mr-2"></i>{{ isCheckingCartStock ? 'ĐANG KIỂM TRA...' : `Thanh toán ${formatCurrency(cartTotal)}` }}
            </button>
            <p class="footer-hint">Nhập coupon và phí vận chuyển ở trang thanh toán</p>
          </div>
        </aside>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.cart-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 3200;
  display: flex;
  justify-content: flex-end;
  background: rgba(14,14,14,.4);
  backdrop-filter: blur(2px);
}
.cart-drawer {
  width: 440px;
  max-width: 100vw;
  height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: -20px 0 60px -20px rgba(0,0,0,.35);
  animation: slideIn .28s cubic-bezier(.16,1,.3,1);
}
@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
.drawer-fade-enter-active, .drawer-fade-leave-active { transition: opacity .22s ease; }
.drawer-fade-enter-from, .drawer-fade-leave-to { opacity: 0; }
.drawer-fade-enter-active .cart-drawer, .drawer-fade-leave-active .cart-drawer { transition: transform .28s cubic-bezier(.16,1,.3,1); }
.drawer-fade-enter-from .cart-drawer { transform: translateX(100%); }
.drawer-fade-leave-to .cart-drawer { transform: translateX(100%); }

.drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #E5E5E5; flex-shrink: 0; }
.drawer-title { font-family: "Fraunces", Georgia, serif; font-weight: 600; font-size: 1.25rem; letter-spacing: -.025em; text-transform: uppercase; margin: 0; color: #0E0E0E; }
.drawer-close { width: 36px; height: 36px; border: 0; background: #F0F0F0; border-radius: 999px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #0E0E0E; transition: background .2s ease; }
.drawer-close:hover { background: #E5E5E5; }

.drawer-body { flex: 1; overflow-y: auto; padding: 0; }
.drawer-body::-webkit-scrollbar { width: 6px; }
.drawer-body::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }
.empty-state { text-align: center; padding: 96px 24px; color: #737373; }
.empty-state i { font-size: 2.2rem; color: #ccc; display: block; margin-bottom: 12px; }
.empty-state h3 { font-family: "Fraunces", Georgia, serif; font-size: 1.25rem; font-weight: 500; color: #0E0E0E; margin: 0 0 4px; }
.empty-state p { font-size: .875rem; margin: 0 0 20px; }
.btn-sg-dark { background: #0E0E0E; color: #fff; border: 1px solid #0E0E0E; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: .8125rem; text-decoration: none; display: inline-block; transition: background .2s ease; }
.btn-sg-dark:hover { background: #333; }

.cart-compact-list { padding: 0 24px; }
.cart-compact-item { display: flex; gap: 14px; padding: 20px 0; border-bottom: 1px solid #E5E5E5; }
.cart-compact-item.is-unavailable { opacity: .6; background: #FAFAFA; margin: 0 -24px; padding-left: 24px; padding-right: 24px; }
.cc-img { width: 80px; height: 80px; background: #F0F0F0; border: 0; border-radius: 8px; overflow: hidden; flex-shrink: 0; position: relative; display: block; }
.cc-img img { width: 100%; height: 100%; object-fit: cover; }
.cc-oos { position: absolute; inset: 50% auto auto 50%; transform: translate(-50%,-50%); background: #0A0A0A; color: #fff; font-size: .6rem; font-weight: 800; padding: 3px 6px; white-space: nowrap; }
.cc-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.cc-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.cc-heading-copy { min-width: 0; }
.cc-name { font-family: "Fraunces", Georgia, serif; font-weight: 600; font-size: .98rem; color: #0E0E0E; text-decoration: none; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cc-variant { font-size: .75rem; color: #737373; margin-top: 3px; }
.cc-alert { font-size: .74rem; font-weight: 700; color: #0A0A0A; background: #f5f5f5; border-left: 2px solid #0A0A0A; padding: 4px 8px; }
.cc-alert.warn { border-color: #f59e0b; background: #fffbeb; color: #92400e; }
.cc-choose-variant { align-self: flex-start; color: #0A0A0A; font-size: .73rem; font-weight: 800; text-decoration: underline; text-underline-offset: 3px; }
.cc-choose-variant:hover { color: #b91c1c; }
.cc-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 10px; }
.qty-compact { display: inline-flex; align-items: center; border: 1px solid #E5E5E5; border-radius: 8px; overflow: hidden; background: #fff; }
.qty-compact button { width: 28px; height: 28px; border: 0; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #0A0A0A; }
.qty-compact button:disabled { opacity: .3; cursor: not-allowed; }
.qty-compact span { width: 32px; text-align: center; font-weight: 700; font-size: .84rem; border-left: 1px solid #eee; border-right: 1px solid #eee; line-height: 28px; }
.cc-price { font-weight: 600; font-size: .9375rem; color: #0E0E0E; white-space: nowrap; }
.cc-unit-actions { display: inline-flex; align-items: center; gap: 12px; }
.cc-unit { font-size: .7rem; color: #737373; white-space: nowrap; }
.cc-remove { border: 0; background: transparent; color: #999; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 4px; flex-shrink: 0; }
.cc-remove:hover { color: #0A0A0A; background: #f5f5f5; }

.btn-clear-compact { border: 0; background: transparent; color: #777; font-size: .76rem; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; margin: 12px 0 4px; cursor: pointer; padding: 0; }
.btn-clear-compact:hover { color: #0A0A0A; }

.suggest-box { margin: 8px 0 24px; border: 1px solid #E5E5E5; border-radius: 12px; padding: 16px; background: #FAFAFA; }
.suggest-head { display: flex; justify-content: space-between; align-items: center; font-size: .78rem; font-weight: 800; letter-spacing: .04em; color: #0A0A0A; margin-bottom: 10px; }
.suggest-link { font-size: .76rem; font-weight: 600; color: #0A0A0A; text-decoration: underline; }
.suggest-grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
.suggest-card-3 { background: transparent; border: 0; border-radius: 0; overflow: hidden; padding: 0; display: flex; flex-direction: column; text-align: left; cursor: pointer; }
.suggest-img { position: relative; display: block; aspect-ratio: 1; background: #f9fafb; overflow: hidden; }
.suggest-img img { width: 100%; height: 100%; object-fit: cover; }
.suggest-name { font-family: "Fraunces", Georgia, serif; font-size: .75rem; font-weight: 500; color: #0E0E0E; padding: 6px 0 0; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.5em; }
.suggest-price { font-size: .75rem; font-weight: 500; color: #737373; padding: 2px 0 0; }
.suggest-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.suggest-card { border: 1px dashed #d1d5db; border-radius: 6px; background: #fff; height: 72px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; text-decoration: none; color: #0A0A0A; font-size: .78rem; font-weight: 600; }

.drawer-footer { border-top: 1px solid #E5E5E5; padding: 20px 24px; background: #fff; flex-shrink: 0; }
.footer-row { display: flex; justify-content: space-between; font-size: .875rem; color: #0E0E0E; margin-bottom: 6px; }
.footer-shipping { color: #737373; margin-bottom: 16px; }
.btn-checkout { width: 100%; background: #0A0A0A; color: #fff; border: 1px solid #0A0A0A; border-radius: 999px; padding: 13px 18px; font-weight: 800; font-size: .88rem; letter-spacing: .02em; cursor: pointer; margin-top: 10px; transition: background .2s; }
.btn-checkout:hover:not(:disabled) { background: #000; }
.btn-checkout:disabled { opacity: .5; cursor: not-allowed; }
.footer-hint { text-align: center; font-size: .6875rem; color: #737373; margin: 12px 0 0; }

@media (max-width: 480px) { .cart-drawer { width: 100vw; } }
</style>
