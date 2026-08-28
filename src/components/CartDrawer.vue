<script setup>
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
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

const FREE_SHIP_THRESHOLD = 400000
const freeShipRemaining = computed(() => Math.max(0, FREE_SHIP_THRESHOLD - cartSubtotal.value))
const freeShipProgress = computed(() => Math.min(100, (cartSubtotal.value / FREE_SHIP_THRESHOLD) * 100))
const freeShipAchieved = computed(() => cartSubtotal.value >= FREE_SHIP_THRESHOLD)

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
  const a = item.attributes || item.product || {}
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
        price: Number(p.sale_price ?? p.SalePrice ?? p.price ?? p.BasePrice ?? 0),
        image: p.image_url ?? p.ImageURL ?? p.image ?? '',
        brand: p.brand_name ?? p.BrandName ?? 'ADIDAS',
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
        <div class="cart-drawer" @click.stop>
          <!-- Header -->
          <div class="drawer-header">
            <h2 class="drawer-title">GIỎ HÀNG CỦA BẠN ({{ cartCount }})</h2>
            <button class="drawer-close" @click="close" aria-label="Đóng"><i class="bi bi-x-lg"></i></button>
          </div>

          <!-- Free ship progress -->
          <div v-if="cartCount > 0" class="free-ship">
            <p v-if="!freeShipAchieved" class="free-ship-text">Mua thêm <strong>{{ formatCurrency(freeShipRemaining) }}</strong> để được miễn phí vận chuyển!</p>
            <p v-else class="free-ship-text success"><i class="bi bi-check-circle-fill me-1"></i>Bạn đã được miễn phí vận chuyển!</p>
            <div class="free-ship-bar">
              <div class="free-ship-fill" :style="{ width: freeShipProgress + '%' }"></div>
              <span class="free-ship-truck" :style="{ left: 'calc(' + freeShipProgress + '% - 12px)' }"><i class="bi bi-truck"></i></span>
            </div>
          </div>

          <!-- Body -->
          <div class="drawer-body">
            <div v-if="cartCount === 0" class="empty-state">
              <i class="bi bi-bag"></i>
              <h5>Giỏ hàng đang trống</h5>
              <p class="text-secondary mb-3">Hãy khám phá các mẫu giày mới nhất.</p>
              <router-link to="/products" class="btn-sg-dark" @click="close">TIẾP TỤC MUA SẮM</router-link>
            </div>

            <div v-else class="cart-compact-list">
              <div class="cart-compact-item" :class="{ 'is-unavailable': item.isOutOfStock || item.hasInsufficientStock }" v-for="item in cartItems" :key="item.id_product_detail">
                <router-link :to="`/product/${item.id_product}`" class="cc-img" @click="close">
                  <img :src="item.color?.image || item.product?.image_url" :alt="item.product?.product_name">
                  <span v-if="item.isOutOfStock" class="cc-oos">HẾT HÀNG</span>
                </router-link>
                <div class="cc-info">
                  <router-link :to="`/product/${item.id_product}`" class="cc-name" @click="close">{{ item.product?.product_name }}</router-link>
                  <div class="cc-variant">{{ attrsOf(item).map(a=>a.value).join(' / ') || '—' }}</div>
                  <div v-if="item.isOutOfStock" class="cc-alert">Biến thể đã hết hàng.</div>
                  <div v-else-if="item.hasInsufficientStock" class="cc-alert warn">Kho chỉ còn {{ item.stockQuantity }}.</div>
                  <div class="cc-actions">
                    <div class="qty-compact">
                      <button :disabled="item.isOutOfStock || item.quantity <= 1" @click="handleDecrease(item.id_product_detail)"><i class="bi bi-dash"></i></button>
                      <span>{{ item.quantity }}</span>
                      <button :disabled="item.isOutOfStock || item.hasInsufficientStock || item.quantity >= Number(item.stockQuantity || 0)" @click="handleIncrease(item)"><i class="bi bi-plus"></i></button>
                    </div>
                    <div class="cc-price">{{ formatCurrency(item.subtotal) }}</div>
                    <button class="cc-remove" @click="removeFromCart(item.id_product_detail)" title="Xóa"><i class="bi bi-trash"></i></button>
                  </div>
                  <div class="cc-unit">{{ formatCurrency(item.unitPrice) }} / sp</div>
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
                  <div v-for="p in suggestions" :key="p.id" class="suggest-card-3">
                    <router-link :to="`/product/${p.id}`" class="suggest-img" @click="close">
                      <img :src="p.image" :alt="p.name" />
                      <span class="suggest-plus" @click.prevent="addSuggestedToCart(p)"><i class="bi bi-plus"></i></span>
                    </router-link>
                    <div class="suggest-name">{{ p.name }}</div>
                    <div class="suggest-price">{{ formatCurrency(p.price) }}</div>
                  </div>
                </div>
                <div v-else class="suggest-grid">
                  <router-link to="/products" class="suggest-card" @click="close"><i class="bi bi-plus-lg"></i><span>Khám phá thêm</span></router-link>
                  <router-link to="/products" class="suggest-card" @click="close"><i class="bi bi-plus-lg"></i><span>Sản phẩm mới</span></router-link>
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
            <div class="footer-row small text-muted">
              <span>Phí vận chuyển</span>
              <span>{{ formatCurrency(cartShippingFee) }}</span>
            </div>
            <button class="btn-checkout" :disabled="isCheckingCartStock || cartHasUnavailableItems" @click="goCheckout">
              <i class="bi bi-bag me-2"></i>{{ isCheckingCartStock ? 'ĐANG KIỂM TRA...' : `Thanh toán ${formatCurrency(cartTotal)}` }}
            </button>
            <p class="footer-hint">Nhập coupon và phí vận chuyển ở trang thanh toán</p>
          </div>
        </div>
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
  background: rgba(10,10,10,.32);
  backdrop-filter: blur(1px);
}
.cart-drawer {
  width: 420px;
  max-width: 100vw;
  height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 30px rgba(0,0,0,.18);
  animation: slideIn .28s cubic-bezier(.16,1,.3,1);
}
@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
.drawer-fade-enter-active, .drawer-fade-leave-active { transition: opacity .22s ease; }
.drawer-fade-enter-from, .drawer-fade-leave-to { opacity: 0; }
.drawer-fade-enter-active .cart-drawer, .drawer-fade-leave-active .cart-drawer { transition: transform .28s cubic-bezier(.16,1,.3,1); }
.drawer-fade-enter-from .cart-drawer { transform: translateX(100%); }
.drawer-fade-leave-to .cart-drawer { transform: translateX(100%); }

.drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #e5e5e5; flex-shrink: 0; }
.drawer-title { font-weight: 800; font-size: 1.05rem; letter-spacing: .06em; margin: 0; color: #0A0A0A; }
.drawer-close { width: 32px; height: 32px; border: 0; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #333; }
.drawer-close:hover { background: #0A0A0A; color: #fff; }

.free-ship { padding: 14px 20px 12px; border-bottom: 1px solid #f0f0f0; background: #fafafa; flex-shrink: 0; }
.free-ship-text { font-size: .82rem; color: #333; margin: 0 0 8px; }
.free-ship-text strong { color: #0A0A0A; }
.free-ship-text.success { color: #111; font-weight: 700; }
.free-ship-bar { position: relative; height: 6px; background: #e5e5e5; border-radius: 999px; overflow: visible; }
.free-ship-fill { height: 100%; background: #0A0A0A; border-radius: 999px; transition: width .4s ease; }
.free-ship-truck { position: absolute; top: 50%; transform: translateY(-50%); width: 22px; height: 22px; background: #fff; border: 1.5px solid #0A0A0A; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .7rem; color: #0A0A0A; transition: left .4s ease; }

.drawer-body { flex: 1; overflow-y: auto; padding: 0; }
.drawer-body::-webkit-scrollbar { width: 6px; }
.drawer-body::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-state i { font-size: 2.2rem; color: #ccc; display: block; margin-bottom: 12px; }
.empty-state h5 { font-weight: 700; color: #0A0A0A; margin-bottom: 6px; }
.btn-sg-dark { background: #0A0A0A; color: #fff; border: 1px solid #0A0A0A; padding: 10px 18px; border-radius: 6px; font-weight: 700; font-size: .82rem; text-decoration: none; display: inline-block; }
.btn-sg-dark:hover { background: #000; }

.cart-compact-list { padding: 12px 16px; }
.cart-compact-item { display: flex; gap: 12px; padding: 14px 0; border-bottom: 1px solid #f0f0f0; }
.cart-compact-item.is-unavailable { opacity: .6; background: #fafafa; margin: 0 -16px; padding-left: 16px; padding-right: 16px; }
.cc-img { width: 68px; height: 68px; background: #f5f5f5; border: 1px solid #eee; border-radius: 6px; overflow: hidden; flex-shrink: 0; position: relative; display: block; }
.cc-img img { width: 100%; height: 100%; object-fit: cover; }
.cc-oos { position: absolute; inset: 50% auto auto 50%; transform: translate(-50%,-50%); background: #0A0A0A; color: #fff; font-size: .6rem; font-weight: 800; padding: 3px 6px; white-space: nowrap; }
.cc-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.cc-name { font-weight: 700; font-size: .88rem; color: #0A0A0A; text-decoration: none; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cc-variant { font-size: .76rem; color: #777; }
.cc-alert { font-size: .74rem; font-weight: 700; color: #0A0A0A; background: #f5f5f5; border-left: 2px solid #0A0A0A; padding: 4px 8px; }
.cc-alert.warn { border-color: #f59e0b; background: #fffbeb; color: #92400e; }
.cc-actions { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.qty-compact { display: inline-flex; align-items: center; border: 1px solid #d1d5db; border-radius: 999px; overflow: hidden; background: #fff; }
.qty-compact button { width: 28px; height: 28px; border: 0; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #0A0A0A; }
.qty-compact button:disabled { opacity: .3; cursor: not-allowed; }
.qty-compact span { width: 32px; text-align: center; font-weight: 700; font-size: .84rem; border-left: 1px solid #eee; border-right: 1px solid #eee; line-height: 28px; }
.cc-price { font-weight: 800; font-size: .92rem; color: #0A0A0A; margin-left: auto; }
.cc-unit { font-size: .7rem; color: #999; }
.cc-remove { border: 0; background: transparent; color: #999; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 4px; flex-shrink: 0; }
.cc-remove:hover { color: #0A0A0A; background: #f5f5f5; }

.btn-clear-compact { border: 0; background: transparent; color: #777; font-size: .76rem; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; margin: 12px 0 4px; cursor: pointer; padding: 0; }
.btn-clear-compact:hover { color: #0A0A0A; }

.suggest-box { margin-top: 16px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px; background: #fafafa; }
.suggest-head { display: flex; justify-content: space-between; align-items: center; font-size: .78rem; font-weight: 800; letter-spacing: .04em; color: #0A0A0A; margin-bottom: 10px; }
.suggest-link { font-size: .76rem; font-weight: 600; color: #0A0A0A; text-decoration: underline; }
.suggest-grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
.suggest-card-3 { background: #fff; border: 1px solid #eee; border-radius: 8px; overflow: hidden; padding: 0; display: flex; flex-direction: column; }
.suggest-img { position: relative; display: block; aspect-ratio: 1; background: #f9fafb; overflow: hidden; }
.suggest-img img { width: 100%; height: 100%; object-fit: cover; }
.suggest-plus { position: absolute; right: 6px; bottom: 6px; width: 26px; height: 26px; background: #0A0A0A; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .9rem; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
.suggest-name { font-size: .72rem; font-weight: 700; color: #0A0A0A; padding: 6px 6px 0; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.5em; }
.suggest-price { font-size: .78rem; font-weight: 800; color: #0A0A0A; padding: 2px 6px 8px; }
.suggest-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.suggest-card { border: 1px dashed #d1d5db; border-radius: 6px; background: #fff; height: 72px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; text-decoration: none; color: #0A0A0A; font-size: .78rem; font-weight: 600; }

.drawer-footer { border-top: 1px solid #e5e5e5; padding: 14px 16px 16px; background: #fff; flex-shrink: 0; }
.footer-row { display: flex; justify-content: space-between; font-size: .88rem; color: #333; margin-bottom: 6px; }
.footer-row.small { font-size: .78rem; color: #777; }
.btn-checkout { width: 100%; background: #0A0A0A; color: #fff; border: 1px solid #0A0A0A; border-radius: 999px; padding: 13px 18px; font-weight: 800; font-size: .88rem; letter-spacing: .02em; cursor: pointer; margin-top: 10px; transition: background .2s; }
.btn-checkout:hover:not(:disabled) { background: #000; }
.btn-checkout:disabled { opacity: .5; cursor: not-allowed; }
.footer-hint { text-align: center; font-size: .7rem; color: #999; margin: 8px 0 0; }

@media (max-width: 480px) { .cart-drawer { width: 100vw; } }
</style>
