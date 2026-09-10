<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../../../services/apiClient'
import { cartCount, showDrawer } from '../../../stores/cartStore'
import { isAuthenticated } from '../../../stores/authStore'
import logoGiay from '../../../../img/logogiay.png'

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
  <header class="figma-navbar fixed inset-x-0 top-0 z-[70] bg-white/95 backdrop-blur-md">
    <div class="mx-auto flex h-[68px] min-w-0 max-w-[1440px] items-center gap-2 px-3 sm:gap-5 sm:px-6 lg:px-10">
      <button type="button" class="flex min-w-0 shrink-0 items-center gap-2 border-0 bg-transparent p-0" aria-label="Trang chủ" @click="goHome">
        <img :src="logoGiay" alt="ShoeGroup" class="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9" />
        <span class="figma-display truncate text-[19px] font-semibold leading-none tracking-tight sm:text-[22px] max-[340px]:hidden">ShoeGroup</span>
      </button>

      <nav class="pointer-events-none absolute inset-x-0 hidden h-full items-center justify-center lg:flex" aria-label="Điều hướng chính">
        <div class="pointer-events-auto flex items-center gap-5 xl:gap-6">
        <div v-for="link in navLinks" :key="link.label" class="relative" @mouseleave="link.menu && (openMenu = null)">
          <button
            type="button"
            class="relative flex items-center gap-1 border-0 bg-transparent py-6 text-[13px] font-medium text-[#0E0E0E]/80 transition-colors hover:text-[#0E0E0E] xl:text-[14px]"
            :class="[isActive(link) || link.sale ? 'font-bold text-[#0E0E0E]' : '', link.sale ? 'underline decoration-2 underline-offset-4' : '']"
            @mouseenter="link.menu && (openMenu = link.label)"
            @click="handleLink(link)"
          >
            {{ link.label }}
            <svg v-if="link.menu" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" :class="openMenu === link.label ? 'rotate-180' : ''" class="transition-transform"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          <div v-if="link.menu && openMenu === link.label" class="absolute left-0 top-full w-52 pt-1" @click.stop>
            <div class="border border-[#E5E5E5] bg-white py-2 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)]">
              <button v-for="item in link.menu" :key="item.label" type="button" class="flex w-full items-center justify-between border-0 bg-transparent px-4 py-2.5 text-left text-[13px] font-medium text-[#0E0E0E]/80 transition-colors hover:bg-[#F5F5F5] hover:text-[#0E0E0E]" @click="handleMenuItem(item)">
                {{ item.label }}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-40"><path d="M5 12h14M12 5l7 7-7-7" /></svg>
              </button>
            </div>
          </div>
        </div>
        </div>
      </nav>

      <div class="ml-auto flex shrink-0 items-center gap-0.5">
        <button type="button" aria-label="Tìm kiếm" class="flex h-9 w-9 items-center justify-center rounded-full border-0 bg-transparent text-[#0E0E0E]/70 transition-colors hover:bg-[#F0F0F0] hover:text-[#0E0E0E] max-[340px]:h-8 max-[340px]:w-8" :class="searchOpen ? 'bg-[#F0F0F0] text-[#0E0E0E]' : ''" @click="toggleSearch">
          <svg v-if="!searchOpen" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <svg v-else width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        <button type="button" aria-label="Tài khoản" class="flex h-9 w-9 items-center justify-center rounded-full border-0 bg-transparent text-[#0E0E0E]/70 transition-colors hover:bg-[#F0F0F0] hover:text-[#0E0E0E] max-[340px]:h-8 max-[340px]:w-8" @click="router.push(isAuthenticated ? '/account' : '/login')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
        </button>
        <button type="button" aria-label="Giỏ hàng" class="relative flex h-9 w-9 items-center justify-center rounded-full border-0 bg-transparent text-[#0E0E0E]/70 transition-colors hover:bg-[#F0F0F0] hover:text-[#0E0E0E] max-[340px]:h-8 max-[340px]:w-8" @click="showDrawer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
          <span v-if="cartCount > 0" class="absolute right-0.5 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#0E0E0E] px-1 text-[10px] font-bold text-white">{{ cartCount }}</span>
        </button>
        <button type="button" aria-label="Mở menu" class="flex h-9 w-9 items-center justify-center border-0 bg-transparent lg:hidden max-[340px]:h-8 max-[340px]:w-8" @click="menuOpen = !menuOpen">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
        </button>
      </div>
    </div>
    <div class="h-px bg-[#E5E5E5]" />

    <Transition enter-active-class="transition duration-200" enter-from-class="-translate-y-2 opacity-0" enter-to-class="translate-y-0 opacity-100" leave-active-class="transition duration-150" leave-from-class="translate-y-0 opacity-100" leave-to-class="-translate-y-2 opacity-0">
      <div v-if="searchOpen" class="absolute left-0 right-0 top-full border-b border-[#E5E5E5] bg-white shadow-[0_24px_50px_-20px_rgba(0,0,0,0.25)]">
        <div class="mx-auto max-w-[900px] px-5 py-5 sm:px-6">
          <form class="flex items-center gap-3 rounded-full border border-[#0E0E0E] px-5 py-3" @submit.prevent="submitSearch">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-[#737373]"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input v-model="searchQuery" autofocus type="search" class="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#737373]" placeholder="Nhập tên giày, thương hiệu, màu sắc…" @input="onSearchInput" />
            <button v-if="searchQuery" type="button" aria-label="Xóa tìm kiếm" class="border-0 bg-transparent p-0 text-[#737373]" @click="searchQuery = ''; searchProducts = []"><span aria-hidden="true">×</span></button>
          </form>
          <div v-if="searchQuery" class="mt-4">
            <div v-if="isSearching" class="py-4 text-center text-sm text-[#737373]">Đang tìm kiếm…</div>
            <div v-else-if="searchProducts.length" class="grid gap-2 sm:grid-cols-2">
              <button v-for="product in searchProducts" :key="product.id_product" type="button" class="flex items-center gap-3 rounded-xl border-0 bg-transparent p-2 text-left transition-colors hover:bg-[#F0F0F0]" @click="pickSearchProduct(product)">
                <img :src="product.image_url" :alt="product.product_name" class="h-12 w-12 shrink-0 rounded-lg bg-[#F0F0F0] object-cover" />
                <span class="min-w-0"><span class="block truncate text-[10px] font-bold uppercase tracking-wide text-[#737373]">{{ product.brand_name }}</span><span class="block truncate text-sm font-medium">{{ product.product_name }}</span></span>
              </button>
            </div>
            <p v-else class="py-4 text-center text-sm text-[#737373]">Không tìm thấy sản phẩm phù hợp.</p>
          </div>
        </div>
      </div>
    </Transition>

    <div v-if="menuOpen" class="border-b border-[#E5E5E5] bg-white px-5 py-4 lg:hidden sm:px-6">
      <div v-for="link in navLinks" :key="link.label">
        <button type="button" class="block w-full border-0 bg-transparent py-2.5 text-left text-[15px] font-medium" :class="link.sale ? 'font-bold' : ''" @click="handleLink(link); link.menu || (menuOpen = false)">{{ link.label }}<span v-if="link.menu" class="float-right text-[#737373]">{{ openMenu === link.label ? '−' : '+' }}</span></button>
        <div v-if="link.menu && openMenu === link.label" class="mb-2 ml-3 border-l border-[#E5E5E5] pl-3">
          <button v-for="item in link.menu" :key="item.label" type="button" class="block w-full border-0 bg-transparent py-2 text-left text-sm text-[#737373]" @click="handleMenuItem(item); menuOpen = false">{{ item.label }}</button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.figma-navbar :where(button) { cursor: pointer; }
</style>
