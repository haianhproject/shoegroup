<!-- Mục đích: Trang danh sách sản phẩm với tìm kiếm, lọc, sắp xếp và phân trang. -->
<script setup>
import StoreIllustration from '../components/StoreIllustration.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FigmaProductCard from '../components/figma/product/FigmaProductCard.vue'
import FigmaProductGrid from '../components/figma/product/FigmaProductGrid.vue'
import { api } from "../services/apiClient";

const route = useRoute()
const router = useRouter()

const products = ref([])
const categories = ref([])
const brands = ref([])
const colors = ref([])
const sizes = ref([])
const materials = ref([])
const sports = ref([])
const isLoading = ref(true)

const isCentered = computed(() => route.query.center === 'true')

// Filter state
const search = ref('')
const selCategory = ref(null)
const selBrand = ref(null)
const selSports = ref([])
const selColors = ref([])
const selSizes = ref([])
const selMaterials = ref([])
const sortBy = ref('featured')
const activeFilter = ref('')
const showFiltersMobile = ref(false)

// Hiển thị tối đa 8 sản phẩm mỗi trang.  Trang hiện tại được giữ trong
// query string để các liên kết danh mục, nút See all và nút Back/Forward
// của trình duyệt luôn khôi phục đúng trạng thái danh sách.
const pageSize = 8
const currentPage = ref(1)

const fetchAll = async () => {
  try {
    const [dp, dc, db, dcol, ds, dm] = await Promise.all([
      api.get('/products'), api.get('/categories'),
      api.get('/brands'),
      api.get('/colors'), api.get('/sizes'), api.get('/materials'),
    ])
    if (!Array.isArray(dp) || !dp.length || !Array.isArray(dc)) throw new Error('Dữ liệu sản phẩm trống')
    const catSportMap = {}
    dc.forEach((c) => { catSportMap[c.id ?? c.id_category] = c.sport })
    products.value = dp.filter((p) => p.active !== false && p.active !== 0 && p.active !== '0').map((p) => ({
      id_product: p.id ?? p.id_product, product_name: p.name ?? p.product_name, price: p.price, sale_price: p.sale_price,
      id_category: p.category_id ?? p.id_category, category_name: p.category_name ?? p.category,
      is_new: p.is_new ?? p.isNew ?? p.new_arrival ?? p.is_featured ?? p.IsFeatured ?? false,
      is_featured: p.is_featured ?? p.IsFeatured ?? false, tag: p.tag,
      sport: catSportMap[p.category_id] || '',
      material_id: p.material_id,
      material_name: p.material_name || p.material || '',
      f_sizes: (p.sizes || []).map((s) => String(s)),
      f_colors: (p.colors || []).map((c) => c.name ?? c.color_name ?? c.color_label ?? c).filter(Boolean),
      image_url: p.image_url,
      brand_name: p.brand_name || p.brand || '', id_brand: p.id_brand ?? p.brand_id ?? null,
      variants: p.variants || [], colors: p.colors || [], total_stock: p.total_stock ?? p.stock ?? null,
    }))
    categories.value = dc.filter((c) => c.active !== false && c.active !== 0 && c.active !== '0').map((c) => ({ id_category: c.id ?? c.id_category, category_name: c.name ?? c.category_name, sport: c.sport }))
    brands.value = (Array.isArray(db) ? db : []).filter((b) => b.active !== false && b.active !== 0 && b.active !== '0').map((b) => ({ id_brand: b.id ?? b.id_brand, brand_name: b.name ?? b.brand_name }))
    colors.value = dcol.filter((c) => c.active !== false && c.active !== 0 && c.active !== '0').map((c) => ({ id_color: c.id, color_label: c.name, hex: c.hex || '' }))
    sizes.value = ds.filter((s) => s.active !== false && s.active !== 0 && s.active !== '0').map((s) => ({ id_size: s.id, size_name: String(s.name) }))
    materials.value = dm.filter((m) => m.active !== false && m.active !== 0 && m.active !== '0').map((m) => ({ id_material: m.id, material_name: m.name }))
    sports.value = [...new Set(categories.value.map((c) => c.sport).filter(Boolean))]
  } catch (e) {
    console.error("Lỗi khi lấy dữ liệu bộ lọc từ DB:", e)
    products.value = []
    categories.value = []
    brands.value = []
    colors.value = []
    sizes.value = []
    materials.value = []
    sports.value = []
  } finally {
    isLoading.value = false
  }
}

const parsePage = (value) => {
  const page = Number.parseInt(Array.isArray(value) ? value[0] : value, 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

// Sync from URL (category / search / page set by navbar and HomeDisplay)
watch(() => route.query, (q) => {
  const categoryValue = Array.isArray(q.category) ? q.category[0] : q.category
  const searchValue = Array.isArray(q.search) ? q.search[0] : q.search
  const legacySearchValue = Array.isArray(q.q) ? q.q[0] : q.q
  const brandValue = Array.isArray(q.brand) ? q.brand[0] : q.brand
  const filterValue = Array.isArray(q.filter) ? q.filter[0] : q.filter
  const categoryId = categoryValue ? Number(categoryValue) : NaN
  selCategory.value = Number.isFinite(categoryId) ? categoryId : null
  selBrand.value = brandValue ? String(brandValue) : null
  search.value = searchValue || legacySearchValue || ''
  activeFilter.value = filterValue || (!Number.isFinite(categoryId) && categoryValue ? String(categoryValue) : '')
  currentPage.value = parsePage(q.page)
}, { immediate: true })

const toggle = (arr, val) => {
  // NOTE: In templates, refs are auto-unwrapped, so `arr` here is the array itself (not the ref).
  const i = arr.indexOf(val)
  if (i === -1) arr.push(val); else arr.splice(i, 1)
}

const clearFilters = () => {
  selCategory.value = null; selBrand.value = null; selSports.value = []; selColors.value = []
  selSizes.value = []; selMaterials.value = []; search.value = ''
  router.replace({ path: '/products' })
}

const setBrand = (brandId) => {
  const query = { ...route.query }
  if (String(selBrand.value) === String(brandId)) delete query.brand
  else query.brand = String(brandId)
  delete query.page
  router.push({ path: '/products', query })
}

const filtered = computed(() => {
  let list = [...products.value]
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter((p) => normalizeFilterText([
    p.product_name,
    p.brand_name,
    p.category_name,
    p.sport,
    p.material_name,
    ...(p.f_colors || []),
  ].join(' ')).includes(normalizeFilterText(q)))
  if (selCategory.value != null) list = list.filter((p) => String(p.id_category) === String(selCategory.value))
  if (selBrand.value) {
    const brandNeedle = String(selBrand.value).toLowerCase()
    list = list.filter((p) => String(p.id_brand) === String(selBrand.value) || String(p.brand_name || '').toLowerCase() === brandNeedle)
  }
  if (activeFilter.value === 'sale') list = list.filter((p) => Number(p.sale_price) > 0 && Number(p.sale_price) < Number(p.price))
  if (activeFilter.value === 'new') list = list.filter((p) => p.is_new || p.is_featured || p.isNew || p.tag === 'Mới' || p.tag === 'New')
  if (activeFilter.value && !['sale', 'new'].includes(activeFilter.value)) {
    const aliases = filterAliases[activeFilter.value] || [activeFilter.value]
    list = list.filter((p) => {
      const haystack = normalizeFilterText(`${p.category_name} ${p.sport} ${p.product_name}`)
      return aliases.some((alias) => haystack.includes(normalizeFilterText(alias)))
    })
  }
  if (selSports.value.length) list = list.filter((p) => selSports.value.includes(p.sport))
  if (selColors.value.length) list = list.filter((p) => (p.f_colors || []).some((c) => selColors.value.includes(c)))
  if (selSizes.value.length) list = list.filter((p) => (p.f_sizes || []).some((s) => selSizes.value.includes(String(s))))
  if (selMaterials.value.length) list = list.filter((p) => selMaterials.value.includes(p.material_id))
  if (sortBy.value === 'price-asc') list.sort((a, b) => a.price - b.price)
  else if (sortBy.value === 'price-desc') list.sort((a, b) => b.price - a.price)
  else if (sortBy.value === 'name') list.sort((a, b) => (a.product_name || '').localeCompare(b.product_name || ''))
  return list
})

const activeCategoryName = computed(() => categories.value.find((c) => String(c.id_category) === String(selCategory.value))?.category_name)
const activeBrandName = computed(() => brands.value.find((b) => String(b.id_brand) === String(selBrand.value))?.brand_name || (selBrand.value && !/^\d+$/.test(selBrand.value) ? selBrand.value : ''))
const activeFilterName = computed(() => ({
  running: 'CHẠY BỘ',
  basketball: 'BÓNG RỔ',
  training: 'TRAINING',
  lifestyle: 'LIFESTYLE',
  football: 'BÓNG ĐÁ',
  tennis: 'TENNIS',
}[activeFilter.value] || ''))
const pageTitle = computed(() => {
  if (activeFilter.value === 'sale') return 'SẢN PHẨM ĐANG SALE'
  if (activeFilter.value === 'new') return 'HÀNG MỚI VỀ'
  if (activeBrandName.value) return `THƯƠNG HIỆU ${activeBrandName.value}`
  if (activeFilterName.value) return activeFilterName.value
  return activeCategoryName.value || 'TẤT CẢ SẢN PHẨM'
})
const fmtPrice = (v) => new Intl.NumberFormat('vi-VN').format(v) + 'đ'
const normalizeFilterText = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const filterAliases = {
  running: ['running', 'chay bo'],
  basketball: ['basketball', 'bong ro'],
  training: ['training', 'gym', 'tap'],
  lifestyle: ['lifestyle', 'sneaker'],
  football: ['football', 'bong da'],
  tennis: ['tennis'],
}

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

const pageNumbers = computed(() => Array.from({ length: totalPages.value }, (_, i) => i + 1))

const updatePageQuery = (page) => {
  const target = Math.min(Math.max(1, Number(page) || 1), totalPages.value)
  currentPage.value = target
  const query = { ...route.query }
  if (target === 1) delete query.page
  else query.page = String(target)
  router.push({ path: '/products', query })
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
}

const resetPagination = () => {
  if (currentPage.value === 1 && !route.query.page) return
  currentPage.value = 1
  const query = { ...route.query }
  delete query.page
  router.replace({ path: '/products', query })
}

// Khi thay đổi bộ lọc, luôn bắt đầu ở trang đầu; tránh trạng thái trang cũ
// không còn dữ liệu sau khi lọc.
watch(
  [selCategory, selBrand, selSports, selColors, selSizes, selMaterials, sortBy, search],
  () => {
    resetPagination()
  },
  { deep: true },
)

// Nếu số trang giảm (ví dụ sau khi API trả về hoặc lọc), kẹp trang hiện tại
// vào phạm vi hợp lệ.
watch(totalPages, (pages) => {
  if (currentPage.value > pages) updatePageQuery(pages)
})

onMounted(fetchAll)
</script>

<template>
  <div class="figma-products-page bg-white min-h-screen" :class="{ 'flex items-center justify-center': isCentered }">
    <div class="mx-auto w-full max-w-[1440px] px-4 pb-20 pt-8 sm:px-6 lg:px-10">

      <!-- Page Header -->
      <div class="collection-heading mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between border-b border-slate-100 pb-6">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="inline-block w-2 h-2 rounded-full bg-[#D4001A]"></span>
            <span class="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4001A]">Bộ sưu tập</span>
          </div>
          <h1 class="figma-display text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">{{ pageTitle }}</h1>
          <p class="mt-2 text-sm text-slate-500 font-medium">{{ filtered.length }} sản phẩm chính hãng có sẵn</p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Toggle Filter Button -->
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-800 transition-all hover:border-slate-900 hover:shadow-xs cursor-pointer"
            :class="showFiltersMobile ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800' : ''"
            @click="showFiltersMobile = !showFiltersMobile"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>{{ showFiltersMobile ? 'Ẩn bộ lọc chi tiết' : 'Bộ lọc chi tiết' }}</span>
          </button>

          <!-- Sort Select -->
          <div class="relative">
            <label class="sr-only" for="product-sort">Sắp xếp</label>
            <select
              id="product-sort"
              v-model="sortBy"
              class="appearance-none rounded-full border border-slate-200 bg-white pl-4 pr-9 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-slate-900 cursor-pointer shadow-xs hover:border-slate-300"
            >
              <option value="featured">Nổi bật nhất</option>
              <option value="price-asc">Giá: Thấp → Cao</option>
              <option value="price-desc">Giá: Cao → Thấp</option>
              <option value="name">Tên sản phẩm: A → Z</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Filter Pills & Search Bar -->
      <div class="collection-toolbar mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-2xl bg-[#F8FAFC] p-3 border border-slate-200/80">
        <!-- Quick pills -->
        <div class="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            type="button"
            class="rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer border"
            :class="!activeFilter && selSports.length === 0 ? 'border-slate-900 bg-slate-900 text-white shadow-xs' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'"
            @click="clearFilters"
          >
            Tất cả
          </button>
          <button
            type="button"
            class="rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer border"
            :class="activeFilter === 'sale' ? 'border-[#D4001A] bg-[#D4001A] text-white shadow-xs' : 'border-red-200 bg-red-50/70 text-[#D4001A] hover:bg-red-100'"
            @click="router.push({ path: '/products', query: { filter: 'sale' } })"
          >
            Sale Ưu Đãi
          </button>
          <button
            type="button"
            class="rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer border"
            :class="activeFilter === 'new' ? 'border-slate-900 bg-slate-900 text-white shadow-xs' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'"
            @click="router.push({ path: '/products', query: { filter: 'new' } })"
          >
            Hàng Mới
          </button>
          <button
            v-for="sport in sports"
            :key="sport"
            type="button"
            class="rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer border"
            :class="selSports.includes(sport) ? 'border-slate-900 bg-slate-900 text-white shadow-xs' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'"
            @click="toggle(selSports, sport)"
          >
            {{ sport }}
          </button>
          <button
            v-for="brand in brands"
            :key="brand.id_brand"
            type="button"
            class="rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer border"
            :class="String(selBrand) === String(brand.id_brand) ? 'border-slate-900 bg-slate-900 text-white shadow-xs' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'"
            @click="setBrand(brand.id_brand)"
          >
            {{ brand.brand_name }}
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-1.5 shadow-xs focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 min-w-[260px]">
          <svg class="h-4 w-4 text-slate-400 mr-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            v-model="search"
            type="search"
            class="w-full min-w-0 border-0 bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400"
            placeholder="Tìm theo tên, màu, chất liệu…"
          />
          <button
            v-if="search"
            type="button"
            class="text-xs text-slate-400 hover:text-slate-700 ml-1 cursor-pointer border-0 bg-transparent"
            @click="search = ''"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Expandable Filter Panel -->
      <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 -translate-y-2 scale-98" enter-to-class="opacity-100 translate-y-0 scale-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 translate-y-0 scale-100" leave-to-class="opacity-0 -translate-y-2 scale-98">
        <div v-if="showFiltersMobile" class="mb-8 rounded-3xl bg-[#F8FAFC] border border-slate-200 p-6 shadow-sm">
          <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <!-- Colors -->
            <div class="space-y-3">
              <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Màu sắc</div>
              <div class="flex flex-wrap gap-2.5">
                <button
                  v-for="c in colors"
                  :key="c.id_color"
                  type="button"
                  class="relative h-8 w-8 rounded-full border-2 transition-all cursor-pointer"
                  :class="selColors.includes(c.color_label) ? 'border-white scale-110 shadow-[0_0_0_3px_#0F172A]' : 'border-white shadow-[0_0_0_1.5px_#CBD5E1] hover:scale-105'"
                  :style="{ background: c.hex || '#ccc' }"
                  :title="c.color_label"
                  @click="toggle(selColors, c.color_label)"
                ></button>
              </div>
            </div>

            <!-- Sizes -->
            <div class="space-y-3">
              <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Kích cỡ giày</div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="s in sizes"
                  :key="s.id_size"
                  type="button"
                  class="rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer"
                  :class="selSizes.includes(s.size_name) ? 'border-slate-900 bg-slate-900 text-white shadow-xs' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'"
                  @click="toggle(selSizes, s.size_name)"
                >
                  {{ s.size_name }}
                </button>
              </div>
            </div>

            <!-- Materials -->
            <div class="space-y-3">
              <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Chất liệu</div>
              <div class="space-y-2">
                <label v-for="m in materials" :key="m.id_material" class="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    :value="m.id_material"
                    :checked="selMaterials.includes(m.id_material)"
                    class="rounded border-slate-300 text-slate-900 accent-slate-900 focus:ring-slate-900 h-4 w-4"
                    @change="toggle(selMaterials, m.id_material)"
                  />
                  <span>{{ m.material_name }}</span>
                </label>
              </div>
              <button type="button" class="mt-3 text-xs font-bold text-[#D4001A] hover:underline cursor-pointer border-0 bg-transparent p-0" @click="clearFilters">
                Đặt lại toàn bộ lọc
              </button>
            </div>
          </div>
        </div>
      </transition>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-28 gap-3">
        <span class="sg-spinner text-slate-900" aria-label="Đang tải"></span>
        <span class="text-xs font-semibold text-slate-400">Đang chuẩn bị sản phẩm…</span>
      </div>

      <!-- Empty State with Vector SVG -->
      <div v-else-if="filtered.length === 0" class="rounded-3xl border border-slate-200 bg-[#F8FAFC] px-6 py-20 text-center max-w-xl mx-auto shadow-sm">
        <StoreIllustration kind="search" class="mb-5" />
        <h2 class="figma-display text-2xl font-bold text-slate-900">Không tìm thấy sản phẩm</h2>
        <p class="mt-2 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
          Rất tiếc, không có mẫu giày nào phù hợp với bộ lọc hoặc từ khóa bạn đang tìm.
        </p>
        <button
          type="button"
          class="btn-sg-warm mt-6 inline-flex items-center gap-2 cursor-pointer border-0"
          @click="clearFilters"
        >
          <span>Xóa bộ lọc & Xem tất cả</span>
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
      </div>

      <!-- Product Grid -->
      <FigmaProductGrid v-else :columns="4" class="figma-product-grid">
        <div v-for="product in paginatedProducts" :key="product.id_product" class="min-w-0">
          <FigmaProductCard :product="product" />
        </div>
      </FigmaProductGrid>

      <!-- Pagination -->
      <nav v-if="totalPages > 1" class="mt-14 flex items-center justify-center gap-2" aria-label="Phân trang sản phẩm">
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xs hover:border-slate-900 hover:text-slate-950 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          :disabled="currentPage === 1"
          aria-label="Trang trước"
          @click="updatePageQuery(currentPage - 1)"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          v-for="page in pageNumbers"
          :key="page"
          type="button"
          class="flex h-10 min-w-10 items-center justify-center rounded-full px-3.5 text-xs font-bold transition-all shadow-xs cursor-pointer border"
          :class="page === currentPage ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'"
          @click="updatePageQuery(page)"
        >
          {{ page }}
        </button>

        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xs hover:border-slate-900 hover:text-slate-950 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          :disabled="currentPage === totalPages"
          aria-label="Trang sau"
          @click="updatePageQuery(currentPage + 1)"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </nav>

    </div>
  </div>
</template>

<style scoped>
.products-page { background: var(--sg-canvas); min-height: 100vh; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.page-title { font-weight: 900; font-size: 1.9rem; letter-spacing: -.02em; margin: 0; }
.sort-sel { padding: .5rem 1rem; font-weight: 600; min-width: 160px; border-radius: 10px; }

.filter-panel {
  background: #fff; border: 1px solid #e5e5e5; border-radius: 16px; padding: 20px;
  position: sticky; top: 80px; max-height: calc(100vh - 100px); overflow-y: auto;
}
.filter-top { display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 1px solid var(--sg-line); margin-bottom: 16px; }
.btn-clear { border: 0; background: transparent; color: var(--sg-red); font-weight: 700; font-size: .85rem; }
.btn-clear:hover { text-decoration: underline; }
.filter-group { padding: 14px 0; border-bottom: 1px dashed var(--sg-line); }
.filter-group:last-child { border-bottom: 0; }
.filter-label { font-weight: 700; font-size: .85rem; color: var(--sg-ink-2); margin-bottom: 10px; display: block; }
.search-inline { display: flex; align-items: center; gap: 8px; background: var(--sg-canvas); border: 1px solid var(--sg-line); border-radius: 10px; padding: 6px 12px; }
.search-inline i { color: var(--sg-muted); }
.search-inline input { border: 0; background: transparent; outline: none; width: 100%; font-weight: 500; }
.chip-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
.filter-chip { border: 1px solid var(--sg-line); background: #fff; border-radius: 999px; padding: .3rem .8rem; font-size: .8rem; font-weight: 700; color: var(--sg-ink-2); transition: .2s; }
.filter-chip:hover { border-color: #0A0A0A; color: #0A0A0A; }
.filter-chip.active { background: #0A0A0A; color: #fff; border-color: #0A0A0A; }
.color-wrap { display: flex; flex-wrap: wrap; gap: 10px; }
.color-dot { width: 34px; height: 34px; border-radius: 50%; border: 1px solid #ccc; color: transparent; display: flex; align-items: center; justify-content: center; font-size: .8rem; transition: .2s; }
.color-dot:hover { transform: scale(1.12); border-color: #0A0A0A; }
.color-dot.active { box-shadow: 0 0 0 2px #0A0A0A; border-color: #0A0A0A; color: #fff; }
.size-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
.size-box { width: 46px; height: 40px; border: 1px solid #ccc; background: #fff; border-radius: 10px; font-weight: 700; transition: .2s; display: flex; align-items: center; justify-content: center; color: #0A0A0A; }
.size-box:hover { border-color: #0A0A0A; }
.size-box.active { background: #0A0A0A; color: #fff; border-color: #0A0A0A; }
.check-row { display: flex; align-items: center; gap: 8px; font-size: .88rem; cursor: pointer; }
.check-row input { width: 17px; height: 17px; accent-color: #0A0A0A; }

.empty-state { text-align: center; padding: 60px 20px; border-radius: 16px; }
.empty-state i { font-size: 3rem; color: var(--sg-muted); }
.empty-state h5 { font-weight: 800; margin-top: 12px; }

/* Pagination */
.products-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 32px 0 8px;
}
.page-btn {
  min-width: 40px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--sg-line);
  border-radius: 10px;
  background: #fff;
  color: var(--sg-ink);
  font-size: .88rem;
  font-weight: 700;
  cursor: pointer;
  transition: color .2s ease, background-color .2s ease, border-color .2s ease;
}
.page-btn:hover:not(:disabled) { border-color: var(--sg-ink); }
.page-btn.active { background: var(--sg-ink); border-color: var(--sg-ink); color: #fff; }
.page-btn:disabled { opacity: .4; cursor: not-allowed; }
@media (max-width: 576px) {
  .products-pagination { gap: 5px; margin-top: 24px; }
  .page-btn { min-width: 36px; height: 36px; padding: 0 9px; }
}
</style>
