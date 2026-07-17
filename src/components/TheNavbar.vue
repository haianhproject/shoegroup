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

const router = useRouter()
const route = useRoute()

const miniCartItems = computed(() => cartItems.value.slice(0, 3))

/* --- Category / sport quick-filter nav (replaces the old search bar) --- */
const categories = ref([])
const fetchCategories = async () => {
  try {
    const res = await fetch('http://localhost:5000/api/categories')
    const data = await res.json()
    categories.value = data.filter((c) => c.active !== false).map((c) => ({
      id: c.id, name: c.name, sport: c.sport,
    }))
  } catch (e) {
    // Fallback so the nav still works without the backend running
    categories.value = [
      { id: 1, name: 'Running', sport: 'Chạy bộ' },
      { id: 2, name: 'Sneakers', sport: 'Thời trang' },
      { id: 3, name: 'Basketball', sport: 'Bóng rổ' },
      { id: 4, name: 'Training', sport: 'Tập luyện' },
    ]
  }
}

const goCategory = (id) => router.push({ path: '/products', query: { category: id } })

/* --- Magnifier search: click icon -> small search bar drops down --- */
const searchOpen = ref(false)
const searchQuery = ref('')
const searchBox = ref(null)

const toggleSearch = () => {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) {
    setTimeout(() => searchBox.value?.focus(), 60)
  }
}
// Live filter: every character narrows results (by product name) on the products page.
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

/* --- Mini cart hover --- */
let hideTimeout = null
const handleMouseEnter = () => { if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null } showMiniCart() }
const handleMouseLeave = () => { hideTimeout = setTimeout(() => hideMiniCart(), 300) }

/* --- Scroll shadow --- */
const scrolled = ref(false)
const onScroll = () => { scrolled.value = window.scrollY > 8 }
onMounted(() => { fetchCategories(); window.addEventListener('scroll', onScroll) })
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header class="sg-nav" :class="{ scrolled }">
    <div class="container-fluid px-3 px-lg-4">
      <div class="sg-nav-row">
        <!-- Brand / new logo -->
        <router-link to="/" class="sg-logo">
          <BrandLogo :size="40" :radius="12" />
          <span class="sg-logo-text">SHOE<span class="sg-gradient-text">GROUP</span></span>
        </router-link>

        <!-- Category / sport quick nav (desktop) -->
        <nav class="sg-catnav d-none d-lg-flex">
          <router-link to="/" class="sg-catlink" active-class="active">Trang chủ</router-link>
          <router-link to="/products" class="sg-catlink" active-class="active">Tất cả</router-link>
          <button
            v-for="cat in categories.slice(0, 5)"
            :key="cat.id"
            class="sg-catlink"
            @click="goCategory(cat.id)"
          >
            {{ cat.name }}
            <span v-if="cat.sport" class="sg-catlink-sub">{{ cat.sport }}</span>
          </button>
        </nav>

        <!-- Actions -->
        <div class="sg-actions">
          <!-- Magnifier -->
          <button class="sg-icon-btn" :class="{ active: searchOpen }" @click="toggleSearch" aria-label="Tìm kiếm">
            <i class="bi" :class="searchOpen ? 'bi-x-lg' : 'bi-search'"></i>
          </button>

          <!-- Cart + mini popover -->
          <div class="position-relative" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
            <router-link to="/cart" class="sg-icon-btn" @click="hideMiniCart">
              <i class="bi bi-bag"></i>
              <span v-if="cartCount > 0" class="sg-cart-badge">{{ cartCount }}</span>
            </router-link>

            <transition name="mc">
              <div v-if="cartState.isMiniCartOpen" class="mini-cart sg-card" @click.stop>
                <div class="d-flex align-items-center justify-content-between mb-3">
                  <h6 class="fw-bold mb-0">Giỏ hàng</h6>
                  <span class="sg-chip sg-chip-blue">{{ cartCount }} sản phẩm</span>
                </div>
                <div v-if="miniCartItems.length === 0" class="text-center py-4">
                  <i class="bi bi-bag-x fs-2 text-secondary"></i>
                  <p class="text-secondary small mb-0 mt-2">Giỏ hàng đang trống.</p>
                </div>
                <div v-else class="d-flex flex-column gap-3">
                  <div v-for="item in miniCartItems" :key="item.id_product_detail" class="mini-cart-item">
                    <router-link :to="`/product/${item.id_product}`" class="mc-img" @click="hideMiniCart">
                      <img :src="item.product?.image_url" :alt="item.product?.product_name">
                    </router-link>
                    <div class="flex-grow-1 overflow-hidden">
                      <router-link :to="`/product/${item.id_product}`" class="mc-name" @click="hideMiniCart">
                        {{ item.product?.product_name }}
                      </router-link>
                      <div class="mc-attrs">
                        <span v-if="item.size?.size_name" class="sg-chip sg-chip-blue">Size {{ item.size.size_name }}</span>
                        <span v-if="item.color?.color_label" class="sg-chip sg-chip-warm">{{ item.color.color_label }}</span>
                      </div>
                      <p class="mc-price">{{ item.quantity }} x {{ formatCurrency(item.unitPrice) }}</p>
                    </div>
                    <button class="mc-remove" @click="removeFromCart(item.id_product_detail)"><i class="bi bi-x"></i></button>
                  </div>
                  <div v-if="cartItems.length > 3" class="small text-secondary text-center">Và {{ cartItems.length - 3 }} sản phẩm khác…</div>
                  <hr class="my-1">
                  <div class="d-flex justify-content-between fw-bold"><span>Tạm tính</span><span>{{ formatCurrency(cartSubtotal) }}</span></div>
                  <div class="d-grid gap-2 mt-1">
                    <router-link to="/cart" class="btn-sg-outline text-center text-decoration-none" @click="hideMiniCart">Xem giỏ hàng</router-link>
                    <router-link to="/checkout" class="btn-sg text-center text-decoration-none" @click="hideMiniCart">Thanh toán</router-link>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <!-- Account -->
          <router-link v-if="!isAuthenticated" to="/login" class="sg-icon-btn"><i class="bi bi-person"></i></router-link>
          <template v-else>
            <router-link :to="currentUser?.role === 'Admin' ? '/admin' : '/account'" class="sg-icon-btn active"><i class="bi bi-person-check-fill"></i></router-link>
          </template>
        </div>
      </div>

      <!-- Slide-down search bar under the magnifier -->
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
            <button type="submit" class="btn-sg">Tìm</button>
          </form>
        </div>
      </transition>

      <!-- Mobile category chips -->
      <div class="sg-catnav-mobile d-lg-none">
        <router-link to="/products" class="sg-catlink">Tất cả</router-link>
        <button v-for="cat in categories" :key="cat.id" class="sg-catlink" @click="goCategory(cat.id)">{{ cat.name }}</button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.sg-nav { position: sticky; top: 0; z-index: 1030; background: rgba(255,255,255,.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--sg-line); transition: box-shadow .25s, background .25s; }
.sg-nav.scrolled { box-shadow: var(--sg-shadow-sm); }
.sg-nav-row { display: flex; align-items: center; gap: 18px; height: 72px; }

.sg-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.sg-logo-mark { width: 40px; height: 40px; border-radius: 12px; background: var(--sg-grad-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; box-shadow: 0 8px 18px rgba(37,99,235,.35); transition: transform .3s; }
.sg-logo:hover .sg-logo-mark { transform: rotate(-12deg) scale(1.06); }
.sg-logo-text { font-weight: 900; font-size: 1.35rem; letter-spacing: -.02em; color: var(--sg-ink); }

.sg-catnav { flex: 1; display: flex; align-items: center; gap: 4px; justify-content: center; }
.sg-catlink { position: relative; background: transparent; border: 0; color: var(--sg-ink-2); font-weight: 700; font-size: .93rem; padding: 8px 14px; border-radius: 999px; transition: all .2s; text-decoration: none; display: inline-flex; flex-direction: column; align-items: center; line-height: 1.1; }
.sg-catlink-sub { font-size: .62rem; font-weight: 600; color: var(--sg-muted); text-transform: uppercase; letter-spacing: .04em; }
.sg-catlink:hover { background: var(--sg-soft); color: var(--sg-blue-700); }
.sg-catlink.active { background: var(--sg-ink); color: #fff; }
.sg-catlink.active .sg-catlink-sub { color: rgba(255,255,255,.7); }

.sg-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.sg-icon-btn { position: relative; width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--sg-canvas); color: var(--sg-ink); display: inline-flex; align-items: center; justify-content: center; font-size: 1.15rem; text-decoration: none; transition: all .2s; }
.sg-icon-btn:hover { background: var(--sg-ink); color: #fff; transform: translateY(-2px); }
.sg-icon-btn.active { background: var(--sg-grad-primary); color: #fff; }
.sg-cart-badge { position: absolute; top: -2px; right: -2px; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 999px; background: var(--sg-orange); color: #fff; font-size: .68rem; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(255,90,31,.5); }

/* Mini cart */
.mini-cart { position: absolute; right: 0; top: 54px; width: 360px; max-width: 92vw; padding: 18px; z-index: 1050; box-shadow: var(--sg-shadow-lg); border-radius: 18px; }
.mini-cart-item { display: flex; gap: 10px; align-items: center; }
.mc-img { width: 60px; height: 60px; border-radius: 12px; overflow: hidden; background: var(--sg-canvas); border: 1px solid var(--sg-line); flex-shrink: 0; }
.mc-img img { width: 100%; height: 100%; object-fit: cover; mix-blend-mode: multiply; }
.mc-name { display: block; font-weight: 800; font-size: .88rem; color: var(--sg-ink); text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mc-attrs { display: flex; gap: 5px; margin: 3px 0; }
.mc-attrs .sg-chip { font-size: .66rem; padding: .12rem .5rem; }
.mc-price { font-size: .82rem; font-weight: 800; margin: 0; color: var(--sg-blue-700); }
.mc-remove { border: 0; background: var(--sg-canvas); color: #ef4444; width: 28px; height: 28px; border-radius: 50%; }
.mc-remove:hover { background: #fee2e2; }

/* Search bar */
.sg-searchbar { padding-bottom: 14px; }
.sg-searchbar-inner { display: flex; align-items: center; gap: 10px; background: var(--sg-canvas); border: 1.5px solid var(--sg-line); border-radius: 999px; padding: 6px 6px 6px 18px; }
.sg-searchbar-inner i { color: var(--sg-muted); font-size: 1.1rem; }
.sg-searchbar-inner input { flex: 1; border: 0; background: transparent; outline: none; font-weight: 600; padding: 8px 0; }
.sg-searchbar-inner .btn-sg { padding: .5rem 1.4rem; }

.sg-catnav-mobile { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 12px; }
.sg-catnav-mobile::-webkit-scrollbar { display: none; }

.searchbar-enter-active, .searchbar-leave-active { transition: all .25s ease; overflow: hidden; }
.searchbar-enter-from, .searchbar-leave-to { opacity: 0; transform: translateY(-8px); }
.mc-enter-active, .mc-leave-active { transition: all .2s ease; }
.mc-enter-from, .mc-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
