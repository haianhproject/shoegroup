<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  cartState, cartItems, cartCount, cartSubtotal,
  formatCurrency, showDrawer, hideDrawer,
} from '../stores/cartStore'
import { isAuthenticated, currentUser } from '../stores/authStore'
import { notify } from '../stores/uiStore'
import BrandLogo from './BrandLogo.vue'
import { API_BASE_URL, api } from "../services/apiClient";
import { categories as mockCategories } from '../data/mockData'

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
    const coupons = await api.get('/discounts')
    if (Array.isArray(coupons)) {
      coupons.forEach(c => {
        const active = c.IsActive ?? c.active
        if (active !== false && active !== 0 && active !== '0') {
          const type = c.DiscountType ?? c.discount_type ?? ''
          const value = c.DiscountValue ?? c.value ?? c.DiscountPercent ?? c.percent ?? 0
          const discountStr = (type === 'Phần trăm' || String(type).toLowerCase() === 'percent' || String(type).toLowerCase() === 'phan tram')
             ? `${value}%`
             : formatCurrency(value || c.MaxDiscountAmount || c.max_discount);
          const expiry = c.ExpiryDate ?? c.expiry
          const expDate = expiry ? new Date(expiry).toLocaleDateString('vi-VN') : '—';
          const dateAdded = new Date(c.CreatedAt ?? c.created_at ?? c.StartDate ?? c.start_date ?? Date.now());
          notifs.push({
            type: 'voucher',
            message: `Voucher mới: ${c.CouponCode ?? c.code ?? ''} giảm ${discountStr} (HSD: ${expDate})`,
            date: dateAdded.toLocaleString('vi-VN'),
            timestamp: dateAdded.getTime(),
            link: '/products?center=true'
          })
        }
      })
    }

    // Fetch notifications if authenticated
    const userId = currentUser.value?.id_user ?? currentUser.value?.id ?? currentUser.value?.UserID
    if (isAuthenticated.value && userId) {
      const dbNotifs = await api.get(`/customers/${userId}/notifications`)
      if (Array.isArray(dbNotifs)) {
        dbNotifs.forEach(n => {
          const dateAdded = new Date(n.created_at ?? n.CreatedAt ?? Date.now());
          notifs.push({
            type: (n.type ?? n.Type)?.toLowerCase() || 'order',
            message: n.message ?? n.Message ?? n.title ?? n.Title ?? '',
            date: dateAdded.toLocaleString('vi-VN'),
            timestamp: dateAdded.getTime(),
            link: ['order', 'Order'].includes(n.type ?? n.Type) ? '/orders?center=true' : '/products?center=true',
            isRead: n.is_read ?? n.IsRead
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
  if (isCategoryMenuOpen.value && !e.target.closest('.sg-category-wrap')) {
    isCategoryMenuOpen.value = false
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
  isCategoryMenuOpen.value = false
})

const goToNotif = (n) => {
  notifState.value.isOpen = false
  router.push(n.link)
}

const goCategory = (id) => router.push({ path: '/products', query: { category: id } })

// Menu danh mục dùng cùng query `category` với các thẻ danh mục trên trang
// chủ. Khi API chưa chạy, dữ liệu mẫu vẫn giúp menu có thể dùng được.
const menuCategories = ref([])
const isCategoryMenuOpen = ref(false)
const fetchMenuCategories = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/categories`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    if (!Array.isArray(data)) throw new Error('Danh mục không hợp lệ')
    menuCategories.value = data
      .filter((c) => c.active !== false && c.active !== 0 && c.active !== '0' && c.name)
      .filter((c) => !['giày nam', 'tất cả'].includes(c.name.trim().toLowerCase()))
      .map((c) => ({ id_category: c.id, category_name: c.name, sport: c.sport }))
  } catch {
    menuCategories.value = mockCategories.filter((c) => !['giày nam', 'tất cả'].includes(c.category_name.toLowerCase()))
  }
}
const toggleCategoryMenu = () => {
  isCategoryMenuOpen.value = !isCategoryMenuOpen.value
  if (isCategoryMenuOpen.value) notifState.value.isOpen = false
}
const closeCategoryMenu = () => { isCategoryMenuOpen.value = false }

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

const openCartDrawer = () => showDrawer()

const scrolled = ref(false)
const onScroll = () => { scrolled.value = window.scrollY > 8 }

let notifPollInterval = null
onMounted(() => { 
  fetchNotifications()
  fetchMenuCategories()
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
          <span class="sg-logo-icon"><img src="/img/logogiay.png" alt="ShoeGroup" class="sg-logo-img" /></span><span class="sg-logo-text"><span class="logo-shoe">shoe</span><span class="logo-group">group</span></span>
        </router-link>

        <!-- Category nav (desktop) -->
        <nav class="sg-catnav d-none d-lg-flex">
          <router-link to="/" class="sg-catlink" active-class="active" exact>Trang chủ</router-link>
          <router-link to="/products" class="sg-catlink" active-class="active">Sản phẩm</router-link>
          <div class="sg-category-wrap">
            <button class="sg-catlink sg-category-trigger" :class="{ active: isCategoryMenuOpen }" type="button" @click="toggleCategoryMenu" aria-haspopup="true" :aria-expanded="isCategoryMenuOpen">
              Danh mục <i class="bi bi-chevron-down" aria-hidden="true"></i>
            </button>
            <transition name="mc">
              <div v-if="isCategoryMenuOpen" class="sg-category-dropdown" @click.stop>
                <router-link
                  v-for="category in menuCategories"
                  :key="category.id_category"
                  :to="{ path: '/products', query: { category: category.id_category } }"
                  class="sg-category-item"
                  @click="closeCategoryMenu"
                >
                  <span>{{ category.category_name }}</span>
                  <small v-if="category.sport">{{ category.sport }}</small>
                </router-link>
                <router-link to="/products" class="sg-category-item sg-category-all" @click="closeCategoryMenu">Tất cả sản phẩm <i class="bi bi-arrow-right"></i></router-link>
              </div>
            </transition>
          </div>
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

          <!-- Cart: mở drawer thay vì chuyển trang (không làm mất trang nền) -->
          <div class="sg-cart-wrap">
            <button class="sg-icon-btn" @click="openCartDrawer" aria-label="Giỏ hàng">
              <i class="bi bi-bag"></i>
              <span v-if="cartCount > 0" class="sg-cart-badge">{{ cartCount }}</span>
            </button>
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
        <router-link
          v-for="category in menuCategories"
          :key="`mobile-${category.id_category}`"
          :to="{ path: '/products', query: { category: category.id_category } }"
          class="sg-catlink sg-mobile-category"
        >{{ category.category_name }}</router-link>
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
.sg-logo-text .logo-group { color: #1a1a1a; }

/* ====== Category nav (desktop) ====== */
.sg-catnav {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.sg-category-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.sg-category-trigger i {
  font-size: .68rem;
  transition: transform .2s ease;
}
.sg-category-trigger.active i { transform: rotate(180deg); }
.sg-category-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  width: 260px;
  max-height: min(70vh, 420px);
  overflow-y: auto;
  padding: 8px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, .12);
  z-index: 2700;
}
.sg-category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 5px;
  color: #333;
  text-decoration: none;
  font-size: .82rem;
  font-weight: 600;
  transition: background .2s ease, color .2s ease;
}
.sg-category-item:hover,
.sg-category-item.router-link-active { background: #f5f5f5; color: #D4001A; }
.sg-category-item small { color: #999; font-size: .68rem; font-weight: 500; }
.sg-category-all { margin-top: 4px; border-top: 1px solid #f0f0f0; border-radius: 0; color: #111; }

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
.sg-catnav-mobile .sg-mobile-category { color: #777; }

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



