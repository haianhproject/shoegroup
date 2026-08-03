<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  cartState, cartItems, cartCount, cartSubtotal,
  formatCurrency, showMiniCart, hideMiniCart, removeFromCart,
} from '../stores/cartStore'
import { isAuthenticated, currentUser } from '../stores/authStore'
import { notify } from '../stores/uiStore'
import BrandLogo from './BrandLogo.vue'
import { API_BASE_URL } from "../services/apiClient";

const router = useRouter()
const route = useRoute()

const goAccount = () => {
  if (currentUser.value?.role === 'Admin' || currentUser.value?.role_id === 1 || currentUser.value?.RoleID === 1) {
    router.push('/admin')
  } else {
    router.push('/account')
  }
}

const miniCartItems = computed(() => cartItems.value.slice(0, 3))

const notifState = ref({ isOpen: false })
const notifications = ref([])

const fetchNotifications = async () => {
  try {
    const notifs = []
    
    // Fetch coupons (vouchers)
    const resCoupons = await fetch(`${API_BASE_URL}/discounts`)
    if (resCoupons.ok) {
      const coupons = await resCoupons.json()
      coupons.forEach(c => {
        if (c.IsActive) {
          const discountStr = (c.DiscountType === 'Phần trăm' || c.DiscountType === 'percent')
             ? `${c.DiscountValue || c.DiscountPercent}%` 
             : formatCurrency(c.DiscountValue || c.MaxDiscountAmount);
          const expDate = new Date(c.ExpiryDate).toLocaleDateString('vi-VN');
          const dateAdded = new Date(c.CreatedAt || c.StartDate || Date.now());
          notifs.push({
            type: 'voucher',
            message: `Voucher mới: ${c.CouponCode} giảm ${discountStr} (HSD: ${expDate})`,
            date: dateAdded.toLocaleString('vi-VN'),
            timestamp: dateAdded.getTime(),
            link: '/products?center=true'
          })
        }
      })
    }

    // Fetch notifications if authenticated
    if (isAuthenticated.value && currentUser.value?.id) {
      const resNotifs = await fetch(`${API_BASE_URL}/customers/${currentUser.value.id}/notifications`)
      if (resNotifs.ok) {
        const dbNotifs = await resNotifs.json()
        dbNotifs.forEach(n => {
          const dateAdded = new Date(n.created_at || Date.now());
          notifs.push({
            type: n.type?.toLowerCase() || 'order',
            message: n.message,
            date: dateAdded.toLocaleString('vi-VN'),
            timestamp: dateAdded.getTime(),
            link: n.type === 'order' || n.type === 'Order' ? '/orders?center=true' : '/products?center=true',
            isRead: n.is_read
          })
        })
      }
    }

    // Sort by newest
    notifications.value = notifs.sort((a, b) => b.timestamp - a.timestamp)
  } catch (e) {
    console.error('Failed to fetch notifications', e)
  }
}

watch(isAuthenticated, (val) => {
  if (val) fetchNotifications()
})

const toggleNotif = () => notifState.value.isOpen = !notifState.value.isOpen

const closeNotifOnClickOutside = (e) => {
  if (notifState.value.isOpen && !e.target.closest('.sg-notif-wrap')) {
    notifState.value.isOpen = false;
  }
}

onMounted(() => {
  document.addEventListener('click', closeNotifOnClickOutside);
})

onUnmounted(() => {
  document.removeEventListener('click', closeNotifOnClickOutside);
})

watch(() => route.path, () => {
  notifState.value.isOpen = false;
})

const goToNotif = (n) => {
  notifState.value.isOpen = false
  router.push(n.link)
}

const goCategory = (id) => router.push({ path: '/products', query: { category: id } })

const searchOpen = ref(false)
const searchQuery = ref('')
const searchBox = ref(null)

const toggleSearch = () => {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) {
    setTimeout(() => searchBox.value?.focus(), 60)
  }
}
watch(searchQuery, (q) => {
  if (!searchOpen.value) return
  if (q && q.trim()) {
    router.push({ path: '/products', query: { search: q.trim() } })
  }
})
const submitSearch = () => {
  router.push({ path: '/products', query: searchQuery.value.trim() ? { search: searchQuery.value.trim() } : {} })
}

watch(() => route.query.search, (s) => { searchQuery.value = s || '' }, { immediate: true })

let hideTimeout = null
const handleMouseEnter = () => { if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null } showMiniCart() }
const handleMouseLeave = () => { hideTimeout = setTimeout(() => hideMiniCart(), 300) }

const scrolled = ref(false)
const onScroll = () => { scrolled.value = window.scrollY > 8 }

let notifPollInterval = null
onMounted(() => { 
  fetchNotifications()
  notifPollInterval = setInterval(fetchNotifications, 5000)
  window.addEventListener('scroll', onScroll) 
})
onUnmounted(() => {
  if (notifPollInterval) clearInterval(notifPollInterval)
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <header class="sg-nav" :class="{ scrolled }">
    <div class="sg-nav-inner">
      <!-- Top bar: brand + actions -->
      <div class="sg-nav-row">
        <!-- Brand Logo -->
        <router-link to="/" class="sg-logo">
          <span class="sg-logo-icon"><img src="/logogiay.png" alt="ShoeGroup" class="sg-logo-img" /></span><span class="sg-logo-text"><span class="logo-shoe">shoe</span><span class="logo-group">group</span></span>
        </router-link>

        <!-- Category nav (desktop) -->
        <nav class="sg-catnav d-none d-lg-flex">
          <router-link to="/" class="sg-catlink" active-class="active" exact>Trang chủ</router-link>
          <router-link to="/products" class="sg-catlink" active-class="active">Sản phẩm</router-link>
          <router-link to="/about" class="sg-catlink" active-class="active">Giới thiệu</router-link>

          <!-- Notifications popup -->
          <div class="sg-notif-wrap" style="position: relative;">
            <button class="sg-catlink d-flex align-items-center gap-1" :class="{ 'active': notifState.isOpen }" @click="toggleNotif" style="cursor: pointer; border:none; background:transparent;">Thông báo
              <span v-if="notifState.hasUnread" class="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"><span class="visually-hidden">New alerts</span></span>
            </button>
            <transition name="mc">
              <div v-if="notifState.isOpen" class="mini-cart notif-dropdown" @click.stop>
                <div class="mc-header">
                  <span class="mc-title">Thông báo</span>
                  <span class="mc-count">{{ notifications.length }}</span>
                </div>
                <div v-if="notifications.length === 0" class="mc-empty">
                  <i class="bi bi-bell-slash"></i>
                  <p>Không có thông báo nào.</p>
                </div>
                <div v-else class="notif-list" style="max-height: 350px; overflow-y: auto;">
                  <a v-for="(n, i) in notifications" :key="i" href="#" @click.prevent="goToNotif(n)" class="notif-item">
                    <div class="notif-icon" :class="n.type === 'order' || n.type === 'Order' ? 'notif-icon--order' : 'notif-icon--voucher'">
                      <i :class="n.type === 'order' || n.type === 'Order' ? 'bi-box-seam' : 'bi-ticket-perforated'"></i>
                    </div>
                    <div class="notif-content">
                      <p class="notif-msg">{{ n.message }}</p>
                      <span class="notif-date">{{ n.date }}</span>
                    </div>
                  </a>
                </div>
              </div>
            </transition>
          </div>

          <router-link to="/contact" class="sg-catlink" active-class="active">Liên hệ</router-link>
        </nav>

        <!-- Action icons -->
        <div class="sg-actions">
          <!-- Search -->
          <button class="sg-icon-btn" :class="{ active: searchOpen }" @click="toggleSearch" aria-label="Tìm kiếm">
            <i class="bi" :class="searchOpen ? 'bi-x-lg' : 'bi-search'"></i>
          </button>

          <!-- Cart + mini popover -->
          <div class="sg-cart-wrap" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
            <router-link to="/cart" class="sg-icon-btn" @click="hideMiniCart">
              <i class="bi bi-bag"></i>
              <span v-if="cartCount > 0" class="sg-cart-badge">{{ cartCount }}</span>
            </router-link>

            <transition name="mc">
              <div v-if="cartState.isMiniCartOpen" class="mini-cart" @click.stop>
                <div class="mc-header">
                  <span class="mc-title">Giỏ hàng</span>
                  <span class="mc-count">{{ cartCount }} sản phẩm</span>
                </div>
                <div v-if="miniCartItems.length === 0" class="mc-empty">
                  <i class="bi bi-bag-x"></i>
                  <p>Giỏ hàng đang trống.</p>
                </div>
                <div v-else class="mc-body">
                  <div v-for="item in miniCartItems" :key="item.id_product_detail" class="mc-item">
                    <router-link :to="`/product/${item.id_product}`" class="mc-img" @click="hideMiniCart">
                      <img :src="item.product?.image_url" :alt="item.product?.product_name">
                    </router-link>
                    <div class="mc-info">
                      <router-link :to="`/product/${item.id_product}`" class="mc-name" @click="hideMiniCart">
                        {{ item.product?.product_name }}
                      </router-link>
                      <div class="mc-attrs">
                        <span v-if="item.size?.size_name" class="mc-tag">Size {{ item.size.size_name }}</span>
                        <span v-if="item.color?.color_label" class="mc-tag">{{ item.color.color_label }}</span>
                      </div>
                      <p class="mc-price">{{ item.quantity }} × {{ formatCurrency(item.unitPrice) }}</p>
                    </div>
                    <button class="mc-remove" @click="removeFromCart(item.id_product_detail)"><i class="bi bi-x"></i></button>
                  </div>
                  <div v-if="cartItems.length > 3" class="mc-more">Và {{ cartItems.length - 3 }} sản phẩm khác…</div>
                  <div class="mc-divider"></div>
                  <div class="mc-subtotal">
                    <span>Tạm tính</span>
                    <span class="mc-subtotal-value">{{ formatCurrency(cartSubtotal) }}</span>
                  </div>
                  <div class="mc-actions">
                    <router-link to="/cart" class="mc-btn mc-btn--outline" @click="hideMiniCart">Xem giỏ hàng</router-link>
                    <router-link to="/checkout" class="mc-btn mc-btn--primary" @click="hideMiniCart">Thanh toán</router-link>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <!-- Account -->
          <router-link v-if="!isAuthenticated" to="/login" class="sg-icon-btn"><i class="bi bi-person"></i></router-link>
          <button v-else @click="goAccount" class="sg-icon-btn active">
            <i class="bi bi-person-check-fill"></i>
          </button>
        </div>
      </div>

      <!-- Slide-down search -->
      <transition name="searchbar">
        <div v-if="searchOpen" class="sg-searchbar">
          <form class="sg-searchbar-inner" @submit.prevent="submitSearch">
            <i class="bi bi-search"></i>
            <input
              ref="searchBox"
              v-model="searchQuery"
              type="search"
              placeholder="Nhập tên giày… (lọc theo từng ký tự)"
            >
            <button type="submit" class="sg-search-submit">Tìm</button>
          </form>
        </div>
      </transition>

      <!-- Mobile category nav -->
      <div class="sg-catnav-mobile d-lg-none">
        <router-link to="/" class="sg-catlink">Trang chủ</router-link>
        <router-link to="/products" class="sg-catlink">Sản phẩm</router-link>
        <router-link to="/about" class="sg-catlink">Giới thiệu</router-link>
        <button class="sg-catlink" @click="toggleNotif">Thông báo</button>
        <router-link to="/contact" class="sg-catlink">Liên hệ</router-link>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* ============================================
   LULULEMON-INSPIRED MINIMAL NAVBAR
   ============================================ */

/* ====== Navbar shell ====== */
.sg-nav {
  position: sticky;
  top: 0;
  z-index: 2600;
  background: #ffffff;
  border-bottom: 1px solid #e5e5e5;
  transition: box-shadow 0.3s ease;
}
.sg-nav.scrolled {
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.06);
}
.sg-nav-inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 32px;
}

/* ====== Top row layout ====== */
.sg-nav-row {
  display: flex;
  align-items: center;
  height: 64px;
}

/* ====== Logo ====== */
.sg-logo {
  display: flex;
  align-items: center;
  text-decoration: none;
  flex-shrink: 0;
}
.sg-logo-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sg-logo-img {
  width: auto;
  height: auto;
  display: block;
  transition: opacity 0.2s ease;
}
.sg-logo:hover .sg-logo-img { opacity: 0.85; }
.sg-logo-text {
  font-family: 'Inter', sans-serif;
  font-size: 1.4rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  line-height: 1;
  margin-left: 6px;
  text-transform: uppercase;
}
.sg-logo-text .logo-shoe { color: #1a1a1a; }
.sg-logo-text .logo-group { color: #D4001A; }

/* ====== Category nav (desktop) ====== */
.sg-catnav {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.sg-catlink {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  color: #555;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 8px 16px;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.sg-catlink:hover {
  color: #1a1a1a;
}

/* Active = bottom underline, NOT pill/background */
.sg-catlink.active {
  color: #1a1a1a;
  font-weight: 600;
}
.sg-catlink.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 16px;
  right: 16px;
  height: 2px;
  background: #D4001A;
  border-radius: 1px;
}

/* ====== Action buttons ====== */
.sg-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.sg-icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #333;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}
.sg-icon-btn:hover {
  color: #1a1a1a;
  background: #f5f5f5;
}
.sg-icon-btn.active {
  color: #D4001A;
  background: transparent;
}

/* ====== Cart badge ====== */
.sg-cart-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 999px;
  background: #D4001A;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  border: 1.5px solid #fff;
}

/* ====== Mini cart / notification dropdown ====== */
.sg-cart-wrap,
.sg-notif-wrap {
  position: relative;
}

.mini-cart {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 360px;
  max-width: 92vw;
  padding: 20px;
  z-index: 1050;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
}

.mc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}
.mc-title {
  font-weight: 700;
  font-size: 0.9rem;
  color: #1a1a1a;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.mc-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: #888;
}

.mc-empty {
  text-align: center;
  padding: 24px 0;
  color: #999;
}
.mc-empty i {
  font-size: 1.8rem;
  display: block;
  margin-bottom: 8px;
}
.mc-empty p {
  margin: 0;
  font-size: 0.85rem;
}

/* ====== Mini cart items ====== */
.mc-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mc-item {
  display: flex;
  gap: 12px;
  align-items: center;
}

.mc-img {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  overflow: hidden;
  background: #fafafa;
  border: 1px solid #eee;
  flex-shrink: 0;
}
.mc-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mc-info {
  flex: 1;
  min-width: 0;
}

.mc-name {
  display: block;
  font-weight: 600;
  font-size: 0.84rem;
  color: #1a1a1a;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mc-name:hover {
  color: #D4001A;
}

.mc-attrs {
  display: flex;
  gap: 6px;
  margin: 4px 0;
}
.mc-tag {
  font-size: 0.65rem;
  font-weight: 500;
  color: #666;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.02em;
}

.mc-price {
  font-size: 0.8rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.mc-remove {
  border: none;
  background: none;
  color: #aaa;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  flex-shrink: 0;
  font-size: 1rem;
}
.mc-remove:hover {
  color: #D4001A;
  background: #fef2f2;
}

.mc-more {
  font-size: 0.78rem;
  color: #999;
  text-align: center;
}

.mc-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0;
}

.mc-subtotal {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  font-size: 0.9rem;
  color: #1a1a1a;
}
.mc-subtotal-value {
  font-weight: 700;
  color: #D4001A;
}

.mc-actions {
  display: grid;
  gap: 8px;
  margin-top: 4px;
}
.mc-btn {
  display: block;
  text-align: center;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.82rem;
  padding: 10px 16px;
  border-radius: 6px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: background 0.2s, color 0.2s;
  cursor: pointer;
}
.mc-btn--outline {
  border: 1px solid #1a1a1a;
  color: #1a1a1a;
  background: #fff;
}
.mc-btn--outline:hover {
  background: #1a1a1a;
  color: #fff;
}
.mc-btn--primary {
  border: 1px solid #D4001A;
  background: #D4001A;
  color: #fff;
}
.mc-btn--primary:hover {
  background: #b8001a;
  border-color: #b8001a;
}

/* ====== Notification items ====== */
.notif-dropdown {
  width: 340px;
  left: 50%;
  transform: translateX(-50%);
  right: auto;
}

.notif-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notif-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px;
  border-radius: 6px;
  text-decoration: none;
  transition: background 0.2s ease;
}
.notif-item:hover {
  background: #f9f9f9;
}

.notif-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
  margin-top: 2px;
  color: #888;
}
.notif-icon--order { color: #2563eb; }
.notif-icon--voucher { color: #16a34a; }

.notif-content {
  flex: 1;
  min-width: 0;
}
.notif-msg {
  margin: 0 0 2px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.4;
}
.notif-date {
  font-size: 0.72rem;
  color: #999;
}

/* ====== Search bar ====== */
.sg-searchbar {
  padding-bottom: 16px;
}
.sg-searchbar-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid #d4d4d4;
  border-radius: 6px;
  padding: 8px 8px 8px 16px;
  transition: border-color 0.2s;
}
.sg-searchbar-inner:focus-within {
  border-color: #1a1a1a;
}
.sg-searchbar-inner i {
  color: #999;
  font-size: 0.95rem;
}
.sg-searchbar-inner input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-weight: 500;
  font-size: 0.88rem;
  padding: 6px 0;
  color: #333;
}
.sg-searchbar-inner input::placeholder {
  color: #bbb;
}
.sg-search-submit {
  border: none;
  background: #1a1a1a;
  color: #fff;
  font-weight: 600;
  font-size: 0.82rem;
  padding: 8px 20px;
  border-radius: 4px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s;
}
.sg-search-submit:hover {
  background: #333;
}

/* ====== Mobile category nav ====== */
.sg-catnav-mobile {
  display: flex;
  gap: 0;
  overflow-x: auto;
  padding-bottom: 10px;
  border-top: 1px solid #f0f0f0;
  padding-top: 6px;
}
.sg-catnav-mobile::-webkit-scrollbar { display: none; }
.sg-catnav-mobile .sg-catlink {
  font-size: 0.78rem;
  padding: 6px 14px;
}

/* ====== Transitions ====== */
.searchbar-enter-active,
.searchbar-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.searchbar-enter-from,
.searchbar-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.mc-enter-active,
.mc-leave-active {
  transition: all 0.2s ease;
}
.mc-enter-from,
.mc-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>



