<!-- Mục đích: Điều hướng, tìm kiếm và giỏ hàng dùng chung trong khu khách hàng. -->
<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../../../services/apiClient'
import { cartCount, showDrawer } from '../../../stores/cartStore'
import { isAuthenticated } from '../../../stores/authStore'
import BrandLogo from '../../BrandLogo.vue'
import { ArrowRight, ArrowUpRight, ChevronDown, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const menuOpen = ref(false)
const openMenu = ref(null)
const searchOpen = ref(false)
const searchQuery = ref('')
const searchProducts = ref([])
const categories = ref([])
const brands = ref([])
const isSearching = ref(false)
let searchTimer = null

const navLinks = computed(() => [
  { label: 'Sale', query: { filter: 'sale' }, sale: true },
  { label: 'Hàng Mới', query: { filter: 'new' } },
  {
    label: 'Thương Hiệu',
    menu: [
      { label: 'Tất cả thương hiệu', query: {} },
      ...brands.value
        .filter((brand) => brand.active !== false && brand.active !== 0 && brand.active !== '0')
        .map((brand) => ({ label: brand.name ?? brand.brand_name, brand: brand.id ?? brand.id_brand }))
        .filter((brand) => brand.label && brand.brand != null),
    ],
  },
  {
    label: 'Danh Mục',
    menu: [
      { label: 'Chạy Bộ', category: 'running' },
      { label: 'Bóng Rổ', category: 'basketball' },
      { label: 'Training', category: 'training' },
      { label: 'Lifestyle', category: 'lifestyle' },
    ],
  },
])

const activeQuery = computed(() => route.query || {})
const isActive = (link) => {
  if (link.sale) return activeQuery.value.filter === 'sale'
  if (link.query?.filter) return activeQuery.value.filter === link.query.filter
  return false
}

const goHome = () => {
  closeMenus()
  router.push('/')
}

const goProducts = (query = {}) => {
  closeMenus()
  router.push({ path: '/products', query })
}

const handleLink = (link) => {
  if (link.menu) {
    openMenu.value = openMenu.value === link.label ? null : link.label
    return
  }
  if (link.action === 'account') {
    router.push(isAuthenticated.value ? '/account' : '/login')
    return
  }
  if (link.action === 'contact') {
    router.push('/contact')
    return
  }
  goProducts(link.query)
}

const handleMenuItem = (item) => {
  if (item.brand != null) {
    goProducts({ brand: String(item.brand) })
    return
  }
  if (!item.category) {
    goProducts(item.query)
    return
  }
  const aliases = {
    running: ['running', 'chay bo'],
    basketball: ['basketball', 'bong ro'],
    training: ['training', 'gym', 'tap'],
    lifestyle: ['lifestyle', 'sneaker'],
  }[item.category] || [item.category]
  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const category = categories.value.find((row) => aliases.some((alias) => normalize(`${row.name || row.category_name} ${row.sport}`).includes(normalize(alias))))
  goProducts(category?.id != null ? { category: String(category.id) } : { search: item.category })
}

const closeMenus = () => {
  menuOpen.value = false
  openMenu.value = null
}

const toggleSearch = () => {
  searchOpen.value = !searchOpen.value
  if (!searchOpen.value) searchQuery.value = ''
}

const submitSearch = () => {
  const value = searchQuery.value.trim()
  searchOpen.value = false
  if (value) router.push({ path: '/products', query: { search: value } })
}

const pickSearchProduct = (product) => {
  searchOpen.value = false
  searchQuery.value = ''
  router.push(`/product/${product.id_product ?? product.id}`)
}

const normalizeProduct = (p) => ({
  id_product: p.id_product ?? p.id,
  product_name: p.product_name ?? p.name ?? '',
  brand_name: p.brand_name ?? p.brand ?? '',
  price: p.price,
  sale_price: p.sale_price,
  image_url: p.image_url ?? p.image ?? '',
})
const normalizeSearchText = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const runSearch = async () => {
  const value = searchQuery.value.trim()
  if (!value) {
    searchProducts.value = []
    return
  }
  isSearching.value = true
  try {
    // The optimized endpoint searches only ProductName. Load the canonical
    // product payload here so brand, category and variant-color searches use
    // the same SQL-backed fields as the listing page.
    const result = await api.get('/products')
    const rows = Array.isArray(result) ? result : (result?.products || result?.data || [])
    const needle = normalizeSearchText(value)
    searchProducts.value = rows
      .filter((row) => normalizeSearchText([
        row.name ?? row.product_name,
        row.brand ?? row.brand_name,
        row.category ?? row.category_name,
        row.sport,
        ...(Array.isArray(row.colors) ? row.colors : []).map((color) => color.name ?? color.color_name ?? color.color_label ?? color),
      ].join(' ')).includes(needle))
      .slice(0, 6)
      .map(normalizeProduct)
  } catch {
    searchProducts.value = []
  } finally {
    isSearching.value = false
  }
}

const onSearchInput = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(runSearch, 220)
}

const onKeydown = (event) => {
  if (event.key === 'Escape') {
    searchOpen.value = false
    closeMenus()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onMounted(async () => {
  const [categoryResult, brandResult] = await Promise.allSettled([
    api.get('/categories'),
    api.get('/brands'),
  ])
  const categoryResponse = categoryResult.status === 'fulfilled' ? categoryResult.value : []
  const brandResponse = brandResult.status === 'fulfilled' ? brandResult.value : []
  categories.value = Array.isArray(categoryResponse) ? categoryResponse : (categoryResponse?.categories || categoryResponse?.data || [])
  brands.value = Array.isArray(brandResponse) ? brandResponse : (brandResponse?.brands || brandResponse?.data || [])
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(searchTimer)
})
</script>

<template>
  <header class="figma-navbar storefront-header fixed top-0 inset-x-0">
    <div class="store-announcement">
      <span
        >CHÍNH HÃNG TỪNG ĐÔI
        <span class="announcement-star" aria-hidden="true">✳</span> ĐẬM CHẤT
        TỪNG BƯỚC</span
      >
    </div>
    <div class="store-nav-inner">
      <button
        type="button"
        class="store-wordmark"
        aria-label="ShoeGroup — Trang chủ"
        @click="goHome"
      >
        <BrandLogo :size="33" tagline />
      </button>
      <nav class="store-desktop-nav" aria-label="Điều hướng chính">
        <button
          type="button"
          class="store-nav-link"
          :class="{
            active:
              route.path === '/products' && !Object.keys(activeQuery).length,
          }"
          @click="goProducts({})"
        >
          Cửa hàng
        </button>
        <div
          v-for="(link, linkIndex) in navLinks"
          :key="link.label"
          class="store-nav-group"
          @mouseleave="link.menu && (openMenu = null)"
        >
          <button
            type="button"
            class="store-nav-link"
            :class="{ active: isActive(link), 'sale-link': link.sale }"
            :aria-expanded="link.menu ? openMenu === link.label : undefined"
            :aria-controls="link.menu ? 'nav-menu-' + linkIndex : undefined"
            @mouseenter="link.menu && (openMenu = link.label)"
            @click="handleLink(link)"
          >
            {{ link.label
            }}<ChevronDown
              v-if="link.menu"
              :size="11"
              aria-hidden="true"
              :class="{ 'rotate-180': openMenu === link.label }"
            />
          </button>
          <div
            v-if="link.menu && openMenu === link.label"
            :id="'nav-menu-' + linkIndex"
            class="store-nav-dropdown"
            @click.stop
          >
            <button
              v-for="item in link.menu"
              :key="item.label"
              type="button"
              @click="handleMenuItem(item)"
            >
              {{ item.label }}<ArrowUpRight :size="13" aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>
      <div class="store-nav-actions">
        <button
          type="button"
          aria-label="Tìm kiếm"
          class="store-nav-search"
          :aria-expanded="searchOpen"
          aria-controls="store-search-panel"
          @click="toggleSearch"
        >
          <Search v-if="!searchOpen" :size="18" aria-hidden="true" /><X
            v-else
            :size="18"
            aria-hidden="true"
          /><span>Tìm đôi giày của bạn</span
          ><span class="search-slash" aria-hidden="true">↗</span>
        </button>
        <button
          type="button"
          aria-label="Tài khoản"
          class="store-icon-button"
          @click="router.push(isAuthenticated ? '/account' : '/login')"
        >
          <UserRound :size="20" :stroke-width="1.6" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Giỏ hàng"
          class="store-icon-button store-cart-button"
          @click="showDrawer"
        >
          <ShoppingBag :size="20" :stroke-width="1.6" aria-hidden="true" /><span
            v-if="cartCount > 0"
            class="store-cart-count"
            >{{ cartCount }}</span
          >
        </button>
        <button
          type="button"
          class="store-icon-button store-menu-toggle"
          :aria-label="menuOpen ? 'Đóng menu' : 'Mở menu'"
          :aria-expanded="menuOpen"
          aria-controls="store-mobile-menu"
          @click="menuOpen = !menuOpen"
        >
          <X v-if="menuOpen" :size="22" aria-hidden="true" /><Menu
            v-else
            :size="22"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
    <Transition name="store-search">
      <div v-if="searchOpen" id="store-search-panel" class="store-search-panel">
        <div class="store-container">
          <form class="store-search-form" @submit.prevent="submitSearch">
            <Search :size="23" :stroke-width="1.5" aria-hidden="true" /><input
              v-model="searchQuery"
              type="search"
              placeholder="Tìm tên giày, thương hiệu, màu sắc..."
              aria-label="Từ khóa tìm kiếm sản phẩm"
              @input="onSearchInput"
            /><button type="submit">
              Tìm kiếm <ArrowRight :size="17" aria-hidden="true" />
            </button>
          </form>
          <div v-if="isSearching" class="store-search-status" role="status">
            <span class="sg-spinner sg-spinner-sm"></span> Đang tìm đôi giày của
            bạn…
          </div>
          <div v-else-if="searchProducts.length" class="store-search-results">
            <button
              v-for="product in searchProducts"
              :key="product.id_product"
              type="button"
              @click="pickSearchProduct(product)"
            >
              <img :src="product.image_url" :alt="product.product_name" /><span
                ><small>{{ product.brand_name }}</small
                ><strong>{{ product.product_name }}</strong
                ><span
                  >{{
                    Number(
                      product.sale_price || product.price || 0,
                    ).toLocaleString('vi-VN')
                  }}
                  ₫</span
                ></span
              ><ArrowUpRight :size="18" aria-hidden="true" />
            </button>
          </div>
          <p v-else-if="searchQuery.trim()" class="store-search-status">
            Chưa tìm thấy sản phẩm phù hợp. Thử một từ khóa khác nhé.
          </p>
          <p v-else class="store-search-status">
            Tìm cảm hứng cho bước chân tiếp theo của bạn.
          </p>
        </div>
      </div>
    </Transition>
    <nav
      v-if="menuOpen"
      id="store-mobile-menu"
      class="store-mobile-nav"
      aria-label="Điều hướng trên điện thoại"
    >
      <button type="button" @click="goProducts({})">
        Cửa hàng <ArrowUpRight :size="17" aria-hidden="true" />
      </button>
      <div v-for="link in navLinks" :key="link.label">
        <button
          type="button"
          :class="{ 'sale-link': link.sale }"
          :aria-expanded="link.menu ? openMenu === link.label : undefined"
          @click="
            handleLink(link);
            link.menu || (menuOpen = false);
          "
        >
          {{ link.label
          }}<ChevronDown
            v-if="link.menu"
            :size="15"
            aria-hidden="true"
            :class="{ 'rotate-180': openMenu === link.label }"
          /><ArrowUpRight v-else :size="17" aria-hidden="true" />
        </button>
        <div
          v-if="link.menu && openMenu === link.label"
          class="store-mobile-submenu"
        >
          <button
            v-for="item in link.menu"
            :key="item.label"
            type="button"
            @click="
              handleMenuItem(item);
              menuOpen = false;
            "
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </nav>
  </header>
</template>
