<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ShoeCard from '../components/ShoeCard.vue'
import {
  products as mockProducts, categories as mockCats,
  colors as mockColors, sizes as mockSizes, materials as mockMaterials, sports as mockSports,
} from '../data/mockData'

const route = useRoute()
const router = useRouter()

const products = ref([])
const categories = ref([])
const colors = ref([])
const sizes = ref([])
const materials = ref([])
const sports = ref([])
const isLoading = ref(true)

// Filter state
const search = ref('')
const selCategory = ref(null)
const selSports = ref([])
const selColors = ref([])
const selSizes = ref([])
const selMaterials = ref([])
const priceMax = ref(6000000)
const sortBy = ref('featured')
const showFiltersMobile = ref(false)

const API = 'http://localhost:5000/api'

const fetchAll = async () => {
  try {
    const [rp, rc, rcol, rs, rm] = await Promise.all([
      fetch(`${API}/products`), fetch(`${API}/categories`),
      fetch(`${API}/colors`), fetch(`${API}/sizes`), fetch(`${API}/materials`),
    ])
    const dp = await rp.json()
    const dc = await rc.json()
    const catSportMap = {}
    dc.forEach((c) => { catSportMap[c.id] = c.sport })
    products.value = dp.filter((p) => p.active).map((p) => ({
      id_product: p.id, product_name: p.name, price: p.price,
      id_category: p.category_id, category_name: p.category,
      sport: catSportMap[p.category_id] || '',
      material_id: p.material_id,
      f_sizes: (p.sizes || []).map((s) => String(s)),
      f_colors: (p.colors || []).map((c) => c.name),
      sole_name: p.sole_name, cushioning_name: p.cushioning_name,
      image_url: p.image_url,
      brand_name: p.brand_name || p.brand || '', id_brand: p.id_brand || p.brand_id || 1,
    }))
    categories.value = dc.filter((c) => c.active).map((c) => ({ id_category: c.id, category_name: c.name, sport: c.sport }))
    colors.value = (await rcol.json()).map((c) => ({ id_color: c.id, color_label: c.name, hex: c.hex || '' }))
    sizes.value = (await rs.json()).map((s) => ({ id_size: s.id, size_name: String(s.name) }))
    materials.value = (await rm.json()).map((m) => ({ id_material: m.id, material_name: m.name }))
    sports.value = [...new Set(categories.value.map((c) => c.sport).filter(Boolean))]
  } catch (e) {
    products.value = mockProducts.map((p) => ({ ...p, category_name: mockCats.find((c) => c.id_category === p.id_category)?.category_name, color_name: 'Đen' }))
    categories.value = mockCats
    colors.value = mockColors
    sizes.value = mockSizes
    materials.value = mockMaterials
    sports.value = mockSports
  } finally {
    isLoading.value = false
  }
}

// Sync from URL (category / search set by navbar)
watch(() => route.query, (q) => {
  selCategory.value = q.category ? Number(q.category) : null
  search.value = q.search || ''
}, { immediate: true })

const toggle = (arr, val) => {
  // NOTE: In templates, refs are auto-unwrapped, so `arr` here is the array itself (not the ref).
  const i = arr.indexOf(val)
  if (i === -1) arr.push(val); else arr.splice(i, 1)
}

const clearFilters = () => {
  selCategory.value = null; selSports.value = []; selColors.value = []
  selSizes.value = []; selMaterials.value = []; priceMax.value = 6000000; search.value = ''
  router.replace({ path: '/products' })
}

const filtered = computed(() => {
  let list = [...products.value]
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter((p) => (p.product_name || '').toLowerCase().includes(q))
  if (selCategory.value) list = list.filter((p) => p.id_category === selCategory.value)
  if (selSports.value.length) list = list.filter((p) => selSports.value.includes(p.sport))
  if (selColors.value.length) list = list.filter((p) => (p.f_colors || []).some((c) => selColors.value.includes(c)))
  if (selSizes.value.length) list = list.filter((p) => (p.f_sizes || []).some((s) => selSizes.value.includes(String(s))))
  if (selMaterials.value.length) list = list.filter((p) => selMaterials.value.includes(p.material_id))
  list = list.filter((p) => (p.price || 0) <= priceMax.value)
  if (sortBy.value === 'price-asc') list.sort((a, b) => a.price - b.price)
  else if (sortBy.value === 'price-desc') list.sort((a, b) => b.price - a.price)
  else if (sortBy.value === 'name') list.sort((a, b) => (a.product_name || '').localeCompare(b.product_name || ''))
  return list
})

const activeCategoryName = computed(() => categories.value.find((c) => c.id_category === selCategory.value)?.category_name)
const fmtPrice = (v) => new Intl.NumberFormat('vi-VN').format(v) + 'đ'

onMounted(fetchAll)
</script>

<template>
  <div class="products-page">
    <div class="container-fluid px-4 py-4">
      <!-- Header -->
      <div class="page-head">
        <div>
          <div class="sg-title-bar mb-2"></div>
          <h1 class="page-title">{{ activeCategoryName || 'Tất cả sản phẩm' }}</h1>
          <p class="text-secondary mb-0">{{ filtered.length }} sản phẩm phù hợp</p>
        </div>
        <div class="d-flex gap-2 align-items-center">
          <button class="btn-sg-outline d-lg-none" @click="showFiltersMobile = !showFiltersMobile"><i class="bi bi-funnel me-1"></i>Lọc</button>
          <select v-model="sortBy" class="sg-input sort-sel">
            <option value="featured">Nổi bật</option>
            <option value="price-asc">Giá thấp → cao</option>
            <option value="price-desc">Giá cao → thấp</option>
            <option value="name">Tên A → Z</option>
          </select>
        </div>
      </div>

      <div class="row g-4 mt-1">
        <!-- LEFT FILTERS -->
        <aside class="col-lg-3" :class="{ 'd-none d-lg-block': !showFiltersMobile }">
          <div class="filter-panel sg-card">
            <div class="filter-top">
              <h6 class="mb-0 fw-bold"><i class="bi bi-sliders me-2"></i>Bộ lọc</h6>
              <button class="btn-clear" @click="clearFilters">Xóa lọc</button>
            </div>

            <!-- Type-ahead search -->
            <div class="filter-group">
              <label class="filter-label">Tìm theo tên</label>
              <div class="search-inline">
                <i class="bi bi-search"></i>
                <input v-model="search" type="search" placeholder="Nhập từng ký tự…">
              </div>
            </div>

            <!-- Sport / category -->
            <div class="filter-group">
              <label class="filter-label">Thể loại thể thao</label>
              <div class="chip-wrap">
                <button v-for="s in sports" :key="s" class="filter-chip" :class="{ active: selSports.includes(s) }" @click="toggle(selSports, s)">{{ s }}</button>
              </div>
            </div>

            <!-- Colors -->
            <div class="filter-group">
              <label class="filter-label">Màu sắc</label>
              <div class="color-wrap">
                <button v-for="c in colors" :key="c.id_color" class="color-dot" :class="{ active: selColors.includes(c.color_label) }" :style="{ background: c.hex || '#ccc' }" :title="c.color_label" @click="toggle(selColors, c.color_label)">
                  <i v-if="selColors.includes(c.color_label)" class="bi bi-check-lg"></i>
                </button>
              </div>
            </div>

            <!-- Sizes -->
            <div class="filter-group">
              <label class="filter-label">Kích cỡ (Size)</label>
              <div class="size-wrap">
                <button v-for="s in sizes" :key="s.id_size" class="size-box" :class="{ active: selSizes.includes(s.size_name) }" @click="toggle(selSizes, s.size_name)">{{ s.size_name }}</button>
              </div>
            </div>

            <!-- Materials -->
            <div class="filter-group">
              <label class="filter-label">Chất liệu</label>
              <div class="d-flex flex-column gap-2">
                <label v-for="m in materials" :key="m.id_material" class="check-row">
                  <input type="checkbox" :value="m.id_material" :checked="selMaterials.includes(m.id_material)" @change="toggle(selMaterials, m.id_material)">
                  <span>{{ m.material_name }}</span>
                </label>
              </div>
            </div>

            <!-- Price -->
            <div class="filter-group">
              <label class="filter-label">Giá tối đa: <strong class="text-sg-blue">{{ fmtPrice(priceMax) }}</strong></label>
              <input type="range" min="500000" max="6000000" step="100000" v-model.number="priceMax" class="price-range">
            </div>
          </div>
        </aside>

        <!-- PRODUCT GRID -->
        <div class="col-lg-9">
          <div v-if="isLoading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
          <div v-else-if="filtered.length === 0" class="empty-state sg-card">
            <i class="bi bi-search"></i>
            <h5>Không tìm thấy sản phẩm</h5>
            <p class="text-secondary">Thử điều chỉnh bộ lọc hoặc từ khóa khác.</p>
            <button class="btn-sg" @click="clearFilters">Xóa bộ lọc</button>
          </div>
          <div v-else class="row row-cols-2 row-cols-md-3 g-4">
            <div class="col fade-in" v-for="product in filtered" :key="product.id_product">
              <ShoeCard :product="product" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.products-page { background: var(--sg-canvas); min-height: 100vh; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.page-title { font-weight: 900; font-size: 1.9rem; letter-spacing: -.02em; margin: 0; }
.sort-sel { padding: .5rem 1rem; font-weight: 600; min-width: 160px; }

.filter-panel { padding: 20px; }
.filter-top { display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 1px solid var(--sg-line); margin-bottom: 16px; }
.btn-clear { border: 0; background: transparent; color: var(--sg-orange); font-weight: 700; font-size: .85rem; }
.btn-clear:hover { text-decoration: underline; }
.filter-group { padding: 14px 0; border-bottom: 1px dashed var(--sg-line); }
.filter-group:last-child { border-bottom: 0; }
.filter-label { font-weight: 700; font-size: .85rem; color: var(--sg-ink-2); margin-bottom: 10px; display: block; }
.search-inline { display: flex; align-items: center; gap: 8px; background: var(--sg-canvas); border: 1.5px solid var(--sg-line); border-radius: 10px; padding: 6px 12px; }
.search-inline i { color: var(--sg-muted); }
.search-inline input { border: 0; background: transparent; outline: none; width: 100%; font-weight: 500; }
.chip-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
.filter-chip { border: 1.5px solid var(--sg-line); background: #fff; border-radius: 999px; padding: .3rem .8rem; font-size: .8rem; font-weight: 700; color: var(--sg-ink-2); transition: .2s; }
.filter-chip:hover { border-color: var(--sg-blue); color: var(--sg-blue); }
.filter-chip.active { background: var(--sg-ink); color: #fff; border-color: var(--sg-ink); }
.color-wrap { display: flex; flex-wrap: wrap; gap: 10px; }
.color-dot { width: 34px; height: 34px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1.5px var(--sg-line); color: #fff; display: flex; align-items: center; justify-content: center; font-size: .8rem; transition: .2s; }
.color-dot:hover { transform: scale(1.12); }
.color-dot.active { box-shadow: 0 0 0 3px var(--sg-blue); }
.size-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
.size-box { width: 46px; height: 40px; border: 1.5px solid var(--sg-line); background: #fff; border-radius: 10px; font-weight: 700; transition: .2s; }
.size-box:hover { border-color: var(--sg-blue); }
.size-box.active { background: var(--sg-grad-primary); color: #fff; border-color: transparent; }
.check-row { display: flex; align-items: center; gap: 8px; font-size: .88rem; cursor: pointer; }
.check-row input { width: 17px; height: 17px; accent-color: var(--sg-blue); }
.price-range { width: 100%; accent-color: var(--sg-blue); }

.empty-state { text-align: center; padding: 60px 20px; }
.empty-state i { font-size: 3rem; color: var(--sg-muted); }
.empty-state h5 { font-weight: 800; margin-top: 12px; }
</style>
