<script setup>
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
  <div class="figma-products-page bg-white" :class="{ 'flex items-center justify-center min-h-screen': isCentered }">
    <div class="mx-auto w-full max-w-[1400px] px-5 pb-16 pt-8 sm:px-6 lg:px-12">
      <div class="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]">Bộ sưu tập ShoeGroup</span>
          <h1 class="figma-display mt-2 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">{{ pageTitle }}</h1>
          <p class="mt-2 text-sm text-[#737373]">{{ filtered.length }} sản phẩm từ dữ liệu cửa hàng</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2.5 text-xs font-semibold transition-colors hover:border-[#0E0E0E]" @click="showFiltersMobile = !showFiltersMobile"><i class="icon icon-funnel"></i>{{ showFiltersMobile ? 'Ẩn bộ lọc' : 'Bộ lọc' }}</button>
          <label class="sr-only" for="product-sort">Sắp xếp</label>
          <select id="product-sort" v-model="sortBy" class="rounded-full border border-[#E5E5E5] bg-white px-4 py-2.5 text-xs font-semibold outline-none focus:border-[#0E0E0E]">
            <option value="featured">Nổi bật</option><option value="price-asc">Giá thấp → cao</option><option value="price-desc">Giá cao → thấp</option><option value="name">Tên A → Z</option>
          </select>
        </div>
      </div>

      <div class="mb-8 flex flex-col gap-4 border-y border-[#E5E5E5] py-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="rounded-full border px-4 py-2 text-xs font-semibold transition-colors" :class="!activeFilter && selSports.length === 0 ? 'border-[#0E0E0E] bg-[#0E0E0E] text-white' : 'border-[#E5E5E5] bg-white hover:border-[#0E0E0E]'" @click="clearFilters">Tất cả</button>
          <button type="button" class="rounded-full border px-4 py-2 text-xs font-semibold transition-colors" :class="activeFilter === 'sale' ? 'border-[#0E0E0E] bg-[#0E0E0E] text-white' : 'border-[#E5E5E5] bg-white hover:border-[#0E0E0E]'" @click="router.push({ path: '/products', query: { filter: 'sale' } })">Sale</button>
          <button type="button" class="rounded-full border px-4 py-2 text-xs font-semibold transition-colors" :class="activeFilter === 'new' ? 'border-[#0E0E0E] bg-[#0E0E0E] text-white' : 'border-[#E5E5E5] bg-white hover:border-[#0E0E0E]'" @click="router.push({ path: '/products', query: { filter: 'new' } })">Hàng mới</button>
          <button v-for="sport in sports" :key="sport" type="button" class="rounded-full border px-4 py-2 text-xs font-semibold transition-colors" :class="selSports.includes(sport) ? 'border-[#0E0E0E] bg-[#0E0E0E] text-white' : 'border-[#E5E5E5] bg-white hover:border-[#0E0E0E]'" @click="toggle(selSports, sport)">{{ sport }}</button>
          <button v-for="brand in brands" :key="brand.id_brand" type="button" class="rounded-full border px-4 py-2 text-xs font-semibold transition-colors" :class="String(selBrand) === String(brand.id_brand) ? 'border-[#0E0E0E] bg-[#0E0E0E] text-white' : 'border-[#E5E5E5] bg-white hover:border-[#0E0E0E]'" @click="setBrand(brand.id_brand)">{{ brand.brand_name }}</button>
        </div>
        <div class="flex items-center gap-2 rounded-full border border-[#E5E5E5] px-4 py-2 text-sm">
          <i class="icon icon-search text-[#737373]"></i><input v-model="search" type="search" class="w-full min-w-0 border-0 bg-transparent text-sm outline-none placeholder:text-[#737373]" placeholder="Tìm sản phẩm…" />
        </div>
      </div>

      <div v-if="showFiltersMobile" class="mb-8 grid gap-5 rounded-2xl bg-[#F0F0F0] p-5 md:grid-cols-2 lg:grid-cols-4">
        <div><div class="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#737373]">Màu sắc</div><div class="flex flex-wrap gap-3"><button v-for="c in colors" :key="c.id_color" type="button" class="relative h-8 w-8 rounded-full border-2 transition-all duration-150" :class="selColors.includes(c.color_label) ? 'border-white scale-110 shadow-[0_0_0_3px_#0E0E0E]' : 'border-white shadow-[0_0_0_1.5px_#D4D4D4] hover:shadow-[0_0_0_2px_#737373]'" :style="{ background: c.hex || '#ccc' }" :title="c.color_label" @click="toggle(selColors, c.color_label)"></button></div></div>
        <div><div class="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#737373]">Kích cỡ</div><div class="flex flex-wrap gap-2"><button v-for="s in sizes" :key="s.id_size" type="button" class="rounded-full border px-3 py-1.5 text-xs font-semibold" :class="selSizes.includes(s.size_name) ? 'border-[#0E0E0E] bg-[#0E0E0E] text-white' : 'border-[#E5E5E5] bg-white'" @click="toggle(selSizes, s.size_name)">{{ s.size_name }}</button></div></div>
        <div><div class="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#737373]">Chất liệu</div><label v-for="m in materials" :key="m.id_material" class="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" :value="m.id_material" :checked="selMaterials.includes(m.id_material)" @change="toggle(selMaterials, m.id_material)" />{{ m.material_name }}</label><button type="button" class="mt-2 text-xs font-bold underline" @click="clearFilters">Xóa bộ lọc</button></div>
      </div>

      <div v-if="isLoading" class="flex justify-center py-24"><span class="sg-spinner" aria-label="Đang tải"></span></div>
      <div v-else-if="filtered.length === 0" class="rounded-2xl border border-[#E5E5E5] px-6 py-24 text-center"><div class="mb-4 text-4xl text-[#D4D4D4]">⌕</div><h2 class="figma-display text-2xl font-semibold">Không tìm thấy sản phẩm</h2><p class="mt-2 text-sm text-[#737373]">Thử điều chỉnh bộ lọc hoặc từ khóa khác.</p><button type="button" class="mt-6 rounded-full bg-[#0E0E0E] px-6 py-3 text-xs font-bold text-white" @click="clearFilters">Xóa bộ lọc</button></div>
      <FigmaProductGrid v-else :columns="5" class="figma-product-grid">
        <div v-for="product in paginatedProducts" :key="product.id_product" class="min-w-0"><FigmaProductCard :product="product" /></div>
      </FigmaProductGrid>

      <nav v-if="totalPages > 1" class="mt-10 flex items-center justify-center gap-2" aria-label="Phân trang sản phẩm">
        <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E5E5] disabled:opacity-40" :disabled="currentPage === 1" aria-label="Trang trước" @click="updatePageQuery(currentPage - 1)"><i class="icon icon-chevron-left"></i></button>
        <button v-for="page in pageNumbers" :key="page" type="button" class="flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-xs font-bold" :class="page === currentPage ? 'border-[#0E0E0E] bg-[#0E0E0E] text-white' : 'border-[#E5E5E5] bg-white'" @click="updatePageQuery(page)">{{ page }}</button>
        <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E5E5] disabled:opacity-40" :disabled="currentPage === totalPages" aria-label="Trang sau" @click="updatePageQuery(currentPage + 1)"><i class="icon icon-chevron-right"></i></button>
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
