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

const categories = ref([])
const fetchCategories = async () => {
  try {
    const res = await fetch('http://localhost:5000/api/categories')
    const data = await res.json()
    categories.value = data.filter((c) => c.active !== false).map((c) => ({
      id: c.id, name: c.name, sport: c.sport,
    }))
  } catch (e) {
    categories.value = [
      { id: 1, name: 'Running', sport: 'Chạy bộ' },
      { id: 2, name: 'Sneakers', sport: 'Thời trang' },
      { id: 3, name: 'Basketball', sport: 'Bóng rổ' },
      { id: 4, name: 'Training', sport: 'Tập luyện' },
    ]
  }
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
onMounted(() => { fetchCategories(); window.addEventListener('scroll', onScroll) })
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header class="sg-nav" :class="{ scrolled }">
    <div class="sg-nav-inner">
      <!-- Top bar: brand + actions -->
      <div class="sg-nav-row">
        <!-- Brand Logo -->
        <router-link to="/" class="sg-logo">
          <BrandLogo :size="42" :radius="12" />
          <span class="sg-logo-text">
            <span class="logo-shoe">shoe</span><span class="logo-group">group</span>
          </span>
        </router-link>

        <!-- Category nav (desktop) -->
        <nav class="sg-catnav d-none d-lg-flex">
          <router-link to="/" class="sg-catlink" active-class="active" exact>Trang chủ</router-link>
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

        <!-- Action icons -->
        <div class="sg-actions">
          <!-- Search -->
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
                      <p class="mc-price">{{ item.quantity }} × {{ formatCurrency(item.unitPrice) }}</p>
                    </div>
                    <button class="mc-remove" @click="removeFromCart(item.id_product_detail)"><i class="bi bi-x"></i></button>
                  </div>
                  <div v-if="cartItems.length > 3" class="small text-secondary text-center">Và {{ cartItems.length - 3 }} sản phẩm khác…</div>
                  <hr class="my-1">
                  <div class="d-flex justify-content-between fw-bold">
                    <span>Tạm tính</span>
                    <span class="mc-total">{{ formatCurrency(cartSubtotal) }}</span>
                  </div>
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
            <router-link :to="currentUser?.role === 'Admin' ? '/admin' : '/account'" class="sg-icon-btn active">
              <i class="bi bi-person-check-fill"></i>
            </router-link>
          </template>
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
/* ====== Navbar shell ====== */
.sg-nav {
  position: sticky;
  top: 0;
  z-index: 1030;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1.5px solid var(--sg-line);
  transition: box-shadow .3s, background .3s;
}
.sg-nav.scrolled {
  box-shadow: 0 4px 24px rgba(26, 58, 107, .12);
  background: rgba(255, 255, 255, 0.98);
}
.sg-nav-inner { padding: 0 24px; }

/* ====== Logo ====== */
.sg-nav-row { display: flex; align-items: center; gap: 20px; height: 72px; }
.sg-logo { display: flex; align-items: center; gap: 11px; text-decoration: none; flex-shrink: 0; }
.sg-logo-text {
  font-family: 'Inter', sans-serif;
  font-size: 1.45rem;
  letter-spacing: -.025em;
  font-weight: 900;
  line-height: 1;
}
.logo-shoe  { color: var(--sg-navy); }
.logo-group { color: var(--sg-navy-mid); }
.sg-logo:hover .sg-logo-text { opacity: .85; }

/* ====== Category nav (desktop) ====== */
.sg-catnav { flex: 1; display: flex; align-items: center; gap: 2px; justify-content: center; }
.sg-catlink {
  position: relative;
  background: transparent;
  border: 0;
  color: var(--sg-ink-2);
  font-weight: 700;
  font-size: .9rem;
  padding: 7px 14px;
  border-radius: 999px;
  transition: all .2s;
  text-decoration: none;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.1;
  white-space: nowrap;
}
.sg-catlink-sub { font-size: .6rem; font-weight: 600; color: var(--sg-muted); text-transform: uppercase; letter-spacing: .05em; margin-top: 2px; }
.sg-catlink:hover { background: var(--sg-navy-pale); color: var(--sg-navy); }
.sg-catlink.active { background: var(--sg-navy); color: #fff; }
.sg-catlink.active .sg-catlink-sub { color: rgba(255,255,255,.7); }
.sg-catlink::after {
  content: '';
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 18px;
  height: 2.5px;
  border-radius: 99px;
  background: var(--sg-navy-mid);
  transition: transform .2s;
}
.sg-catlink:hover::after { transform: translateX(-50%) scaleX(1); }
.sg-catlink.active::after { display: none; }

/* ====== Action buttons ====== */
.sg-actions { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.sg-icon-btn {
  position: relative;
  width: 44px; height: 44px;
  border-radius: 12px;
  border: 1.5px solid var(--sg-line);
  background: #fff;
  color: var(--sg-ink-2);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 1.1rem;
  text-decoration: none;
  transition: all .2s;
}
.sg-icon-btn:hover { background: var(--sg-navy); color: #fff; border-color: var(--sg-navy); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(26,58,107,.25); }
.sg-icon-btn.active { background: var(--sg-grad-primary); border-color: transparent; color: #fff; }
.sg-cart-badge {
  position: absolute; top: -5px; right: -5px;
  min-width: 20px; height: 20px; padding: 0 5px;
  border-radius: 999px;
  background: var(--sg-orange); color: #fff;
  font-size: .66rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 3px 8px rgba(255,90,31,.5);
  border: 2px solid #fff;
}

/* ====== Mini cart ====== */
.mini-cart { position: absolute; right: 0; top: 56px; width: 360px; max-width: 92vw; padding: 18px; z-index: 1050; box-shadow: 0 20px 60px rgba(26,58,107,.18); border-radius: 20px; border: 1.5px solid var(--sg-line); }
.mini-cart-item { display: flex; gap: 10px; align-items: center; }
.mc-img { width: 62px; height: 62px; border-radius: 12px; overflow: hidden; background: var(--sg-canvas); border: 1px solid var(--sg-line); flex-shrink: 0; }
.mc-img img { width: 100%; height: 100%; object-fit: cover; mix-blend-mode: multiply; }
.mc-name { display: block; font-weight: 800; font-size: .87rem; color: var(--sg-ink); text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mc-name:hover { color: var(--sg-navy); }
.mc-attrs { display: flex; gap: 5px; margin: 3px 0; flex-wrap: wrap; }
.mc-attrs .sg-chip { font-size: .65rem; padding: .1rem .5rem; }
.mc-price { font-size: .83rem; font-weight: 800; margin: 0; color: var(--sg-navy); }
.mc-total { color: var(--sg-navy); font-size: 1rem; }
.mc-remove { border: 0; background: var(--sg-canvas); color: #ef4444; width: 30px; height: 30px; border-radius: 8px; transition: .2s; flex-shrink: 0; }
.mc-remove:hover { background: #fee2e2; }

/* ====== Search bar ====== */
.sg-searchbar { padding-bottom: 14px; }
.sg-searchbar-inner { display: flex; align-items: center; gap: 10px; background: var(--sg-canvas); border: 1.5px solid var(--sg-line); border-radius: 999px; padding: 6px 6px 6px 18px; }
.sg-searchbar-inner:focus-within { border-color: var(--sg-navy-mid); box-shadow: 0 0 0 3px rgba(59,111,181,.15); }
.sg-searchbar-inner i { color: var(--sg-muted); font-size: 1rem; }
.sg-searchbar-inner input { flex: 1; border: 0; background: transparent; outline: none; font-weight: 600; padding: 8px 0; }
.sg-searchbar-inner .btn-sg { padding: .48rem 1.3rem; font-size: .9rem; }

/* ====== Mobile category chips ====== */
.sg-catnav-mobile { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 12px; }
.sg-catnav-mobile::-webkit-scrollbar { display: none; }

/* ====== Transitions ====== */
.searchbar-enter-active, .searchbar-leave-active { transition: all .25s ease; overflow: hidden; }
.searchbar-enter-from, .searchbar-leave-to { opacity: 0; transform: translateY(-8px); }
.mc-enter-active, .mc-leave-active { transition: all .22s ease; }
.mc-enter-from, .mc-leave-to { opacity: 0; transform: translateY(-10px) scale(.97); }
</style>
