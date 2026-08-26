<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ShoeCard from '../components/ShoeCard.vue'
import { products as mockProducts, categories as mockCats } from '../data/mockData'
import { API_BASE_URL } from "../services/apiClient";
import banner1 from '../../img/banner1.png'
import banner2 from '../../img/banner2.png'
import banner3 from '../../img/banner3.png'

const products = ref([])
const categories = ref([])
const isLoading = ref(true)

// Trang chủ luôn giới hạn mỗi nhóm ở tám sản phẩm. Nút See all đưa người
// dùng sang trang danh sách đầy đủ (nơi có phân trang và bộ lọc chi tiết).
const HOME_PAGE_SIZE = 8

// --- FEATURED section ---
const selectedCategoryId = ref(null)

const selectedCategory = computed(() =>
  categories.value.find(c => c.id_category === selectedCategoryId.value) || categories.value[0] || null
)

const featuredProducts = computed(() => {
  const id = selectedCategoryId.value
  const list = id
    ? products.value.filter(p => String(p.id_category ?? p.category_id) === String(id))
    : products.value
  return list.slice(0, 4)
})

// Drag-scroll cho tabs bộ môn
const tabsRef = ref(null)
let tabsDragStartX = 0
let tabsScrollStart = 0
let tabsDragging = false
let tabsClickSuppressed = false

const onTabsPointerDown = (e) => {
  if (e.button !== 0) return
  tabsDragStartX = e.clientX
  tabsScrollStart = tabsRef.value?.scrollLeft || 0
  tabsDragging = false
}
const onTabsPointerMove = (e) => {
  if (!e.buttons) return
  const dx = e.clientX - tabsDragStartX
  if (Math.abs(dx) > 8) {
    tabsDragging = true
    if (tabsRef.value) tabsRef.value.scrollLeft = tabsScrollStart - dx
  }
}
const onTabsPointerUp = () => {
  tabsClickSuppressed = tabsDragging
  tabsDragging = false
}
const selectTab = (catId) => {
  if (tabsClickSuppressed) {
    tabsClickSuppressed = false
    return
  }
  selectedCategoryId.value = catId
}


const getCategoryImage = (categoryId) => {
  const category = categories.value.find((c) => c.id_category === categoryId)
  const text = `${category?.category_name || ''} ${category?.sport || ''}`.toLowerCase()
  // Dùng đúng bộ ảnh trong thư mục img cho mọi ảnh tĩnh của trang chủ.
  if (text.includes('bóng rổ') || text.includes('basket')) return banner1
  if (text.includes('tennis') || text.includes('cầu lông') || text.includes('court')) return banner2
  if (text.includes('bóng đá') || text.includes('football') || text.includes('soccer')) return banner3
  return text.includes('chạy') || text.includes('running') ? banner2 : banner1
}

const categoryGroups = computed(() => {
  const groups = new Map()

  // API categories là nguồn chính; vẫn bổ sung category chỉ xuất hiện trong
  // dữ liệu sản phẩm để fallback/demo không làm mất nhóm sản phẩm.
  categories.value.forEach((category) => {
    groups.set(String(category.id_category), { ...category, products: [] })
  })
  products.value.forEach((product) => {
    const id = product.id_category ?? product.category_id
    const key = String(id ?? 'uncategorized')
    if (!groups.has(key)) {
      groups.set(key, {
        id_category: id,
        category_name: product.category_name || product.category || 'Sản phẩm khác',
        sport: product.sport || '',
        products: [],
      })
    }
    groups.get(key).products.push(product)
  })

  return [...groups.values()]
    .map((group) => ({ ...group, products: group.products.slice(0, HOME_PAGE_SIZE) }))
    .filter((group) => group.products.length > 0)
})

/* ---- Hero slideshow: ảnh banner nội bộ, có mũi tên và kéo/swipe ----
 * Các banner đã có sẵn typography/nội dung nên không cần lớp text phủ thêm.
 * Import tĩnh từ thư mục img để cả dev server và bản build production đều đóng gói đúng asset.
 */
const slides = [
  { img: banner1, alt: 'Bộ sưu tập giày bóng rổ ShoeGroup', link: '/products' },
  { img: banner2, alt: 'Bộ sưu tập giày tennis ShoeGroup', link: '/products' },
  { img: banner3, alt: 'Bộ sưu tập giày bóng đá ShoeGroup', link: '/products' },
]
const current = ref(0)
let timer = null
const go = (i) => { current.value = (i + slides.length) % slides.length }
const next = () => go(current.value + 1)
const prev = () => go(current.value - 1)
const startAuto = () => { stopAuto(); timer = setInterval(next, 5000) }
const stopAuto = () => { if (timer) { clearInterval(timer); timer = null } }

// Pointer events let the same interaction work with mouse, touch and pen.
// Only a horizontal gesture changes slides; vertical gestures keep page scroll natural.
const pointerStartX = ref(0)
const pointerStartY = ref(0)
const dragOffset = ref(0)
const isPointerDown = ref(false)
const isDragging = ref(false)
const suppressClick = ref(false)
let suppressClickTimer = null

const clearSuppressClick = () => {
  if (suppressClickTimer !== null) {
    clearTimeout(suppressClickTimer)
    suppressClickTimer = null
  }
  suppressClick.value = false
}

const slideTrackStyle = computed(() => ({
  transform: `translate3d(calc(-${current.value * 100}% + ${dragOffset.value}px), 0, 0)`,
  transition: isDragging.value ? 'none' : undefined,
}))

const onPointerDown = (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  // A new gesture should not inherit suppression from a previous drag.
  clearSuppressClick()
  pointerStartX.value = event.clientX
  pointerStartY.value = event.clientY
  dragOffset.value = 0
  isPointerDown.value = true
  isDragging.value = false
  stopAuto()
  event.currentTarget?.setPointerCapture?.(event.pointerId)
}

const onPointerMove = (event) => {
  if (!isPointerDown.value) return
  const dx = event.clientX - pointerStartX.value
  const dy = event.clientY - pointerStartY.value

  // Give vertical movement back to the browser instead of hijacking page scroll.
  if (!isDragging.value && Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx)) {
    isPointerDown.value = false
    dragOffset.value = 0
    startAuto()
    return
  }
  if (!isDragging.value && Math.abs(dx) < 6) return

  isDragging.value = true
  dragOffset.value = dx
  if (event.cancelable) event.preventDefault()
}

const onPointerUp = (event) => {
  if (!isPointerDown.value) return
  const dx = dragOffset.value
  const didSwipe = isDragging.value && Math.abs(dx) >= 50
  const moved = isDragging.value && Math.abs(dx) > 8

  isPointerDown.value = false
  isDragging.value = false
  dragOffset.value = 0
  if (didSwipe) (dx < 0 ? next : prev)()
  startAuto()

  // A drag starts on the router-link, so suppress the synthetic click it may emit.
  if (moved) {
    suppressClick.value = true
    if (suppressClickTimer !== null) clearTimeout(suppressClickTimer)
    suppressClickTimer = setTimeout(() => {
      suppressClick.value = false
      suppressClickTimer = null
    }, 350)
  }
  event.currentTarget?.releasePointerCapture?.(event.pointerId)
}

const onPointerCancel = (event) => {
  if (!isPointerDown.value) return
  isPointerDown.value = false
  isDragging.value = false
  dragOffset.value = 0
  startAuto()
  event.currentTarget?.releasePointerCapture?.(event.pointerId)
}

const handleSlideClick = (event) => {
  if (!suppressClick.value) return
  event.preventDefault()
  event.stopPropagation()
  clearSuppressClick()
}

const isActiveRecord = (value) => value !== false && value !== 0 && value !== '0'

const fetchData = async () => {
  try {
    const [resProd, resCat] = await Promise.all([
      fetch(`${API_BASE_URL}/products`),
      fetch(`${API_BASE_URL}/categories`),
    ])
    const dataProd = await resProd.json()
    const dataCat = await resCat.json()
    if (!Array.isArray(dataProd) || !Array.isArray(dataCat)) throw new Error('Dữ liệu sản phẩm/danh mục không hợp lệ')
    products.value = dataProd.filter((p) => isActiveRecord(p.active)).map((p) => ({
      id_product: p.id, product_name: p.name, price: p.price, sale_price: p.sale_price,
      id_category: p.category_id, category_name: p.category, sport: p.sport,
      material_name: p.material_name, image_url: p.image_url,
      brand_name: p.brand_name || p.brand || '', id_brand: p.id_brand || 1,
      variants: p.variants || [], colors: p.colors || [], total_stock: p.total_stock ?? p.stock ?? null,
    }))
    categories.value = dataCat
      .filter((c) => isActiveRecord(c.active) && c.name && c.name.toLowerCase() !== 'giày nam' && c.name.toLowerCase() !== 'tất cả')
      .map((c) => ({
        id_category: c.id, category_name: c.name, sport: c.sport,
      }))
  } catch (error) {
    console.warn('Không thể tải dữ liệu trang chủ, dùng dữ liệu mẫu:', error)
    products.value = mockProducts.map((p) => ({ ...p, category_name: mockCats.find((c) => c.id_category === p.id_category)?.category_name }))
    categories.value = mockCats.filter((c) => c.category_name.toLowerCase() !== 'giày nam' && c.category_name.toLowerCase() !== 'tất cả')
  } finally {
    isLoading.value = false
    if (categories.value.length && selectedCategoryId.value === null) {
      selectedCategoryId.value = categories.value[0].id_category
    }
  }
}


onMounted(() => {
  window.scrollTo(0, 0)
  fetchData()
  startAuto()
})
onUnmounted(() => {
  stopAuto()
  clearSuppressClick()
})
</script>

<template>
  <div class="home">
    <!-- HERO SLIDESHOW -->
    <section class="hero-slider" @mouseenter="stopAuto" @mouseleave="startAuto">
      <div
        class="slides"
        :class="{ 'is-dragging': isDragging }"
        :style="slideTrackStyle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
      >
        <div class="slide" v-for="(s, i) in slides" :key="s.img">
          <router-link :to="s.link" class="slide-link" :aria-label="`${s.alt} — xem tất cả sản phẩm`" @click="handleSlideClick">
            <img :src="s.img" :alt="s.alt" draggable="false">
          </router-link>
        </div>
      </div>
      <button class="slide-arrow left" @click="prev" aria-label="Trước">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button class="slide-arrow right" @click="next" aria-label="Sau">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <div class="slide-status" aria-live="polite">{{ current + 1 }} / {{ slides.length }}</div>
      <div class="slide-dots" role="tablist" :aria-label="`Banner ${slides.length} ảnh`">
        <button v-for="(s, i) in slides" :key="s.img" :class="{ active: i === current }" @click="go(i)" :aria-current="i === current ? 'true' : undefined" :aria-label="`Banner ${i + 1} / ${slides.length}`"></button>
      </div>
    </section>

    <!-- SERVICES -->
    <section class="services-wrap">
      <div class="services">
        <div class="service">
          <div><h6>Giao hỏa tốc 24h</h6><p>Nội thành Hà Nội</p></div>
        </div>
        <div class="service">
          <div><h6>Đổi trả 14 ngày</h6><p>Miễn phí đổi trả</p></div>
        </div>
        <div class="service">
          <div><h6>Chính hãng 100%</h6><p>Cam kết hoàn tiền</p></div>
        </div>
        <div class="service">
          <div><h6>Hỗ trợ 9–21h</h6><p>0375.990.871</p></div>
        </div>
      </div>
    </section>

    <!-- SECTION SẢN PHẨM NỔI BẬT -->
    <section class="featured-section">
      <!-- Tiêu đề -->
      <div class="featured-header">
        <div>
          <h2 class="featured-title">SẢN PHẨM NỔI BẬT</h2>
          <p class="featured-sub" v-if="selectedCategory">{{ selectedCategory.category_name }}</p>
        </div>
        <router-link
          :to="selectedCategory?.id_category != null ? { path: '/products', query: { category: selectedCategory.id_category } } : { path: '/products' }"
          class="btn-sg-outline d-none d-md-inline-flex"
        >Xem tất cả</router-link>
      </div>

      <!-- Tabs bộ môn kéo ngang -->
      <div class="sport-tabs-outer">
        <div
          ref="tabsRef"
          class="sport-tabs"
          @pointerdown="onTabsPointerDown"
          @pointermove="onTabsPointerMove"
          @pointerup="onTabsPointerUp"
          @pointercancel="onTabsPointerUp"
        >
          <button
            v-for="cat in categories"
            :key="cat.id_category"
            class="sport-tab"
            :class="{ active: cat.id_category === selectedCategoryId }"
            @click="selectTab(cat.id_category)"
          >{{ cat.category_name }}</button>
        </div>
      </div>

      <template v-if="isLoading">
        <div class="text-center py-5">
          <div class="spinner-border text-primary"></div>
          <p class="mt-2 fw-semibold text-secondary">Đang tải sản phẩm…</p>
        </div>
      </template>
      <template v-else>
        <div class="row row-cols-2 row-cols-md-4 g-4 featured-grid">
          <div class="col fade-in-up" v-for="(product, i) in featuredProducts" :key="product.id_product" :style="`animation-delay:${i * 0.07}s`">
            <ShoeCard :product="product" />
          </div>
          <div v-if="featuredProducts.length === 0" class="col-12 text-center py-4 text-secondary">
            Không có sản phẩm trong danh mục này.
          </div>
        </div>
        <div class="category-see-all">
          <router-link
            :to="selectedCategory?.id_category != null ? { path: '/products', query: { category: selectedCategory.id_category } } : { path: '/products' }"
            class="see-all-link"
          >
            Xem tất cả {{ selectedCategory?.category_name }} <i class="bi bi-arrow-right" aria-hidden="true"></i>
          </router-link>
        </div>
      </template>
    </section>

  </div>
</template>

<style scoped>
.home { background: var(--sg-canvas); }

/* Hero slideshow: giữ gần đúng tỷ lệ 2:1 của ba banner trong img để không
   cắt phần chữ/logo đã được thiết kế sẵn trên ảnh. */
.hero-slider { position: relative; overflow: hidden; width: 100%; background: #000; }
.slides { display: flex; transition: transform .8s cubic-bezier(0.25, 1, 0.5, 1); touch-action: pan-y; cursor: grab; user-select: none; }
.slides.is-dragging { cursor: grabbing; }
.slide { position: relative; min-width: 100%; }
.slide-link { display: block; width: 100%; }
.slide img { width: 100%; height: auto; display: block; opacity: 1; pointer-events: none; }
.slide-caption { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; max-width: 800px; text-align: center; color: #fff; display: flex; flex-direction: column; align-items: center; padding: 0 20px; z-index: 2; }
.hero-chip { background: transparent; color: #fff; display: inline-block; padding: 0 0 6px 0; border-bottom: 2px solid #fff; margin-bottom: 20px; font-size: 0.85rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; }
.hero-title { font-weight: 900; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.1; letter-spacing: -0.03em; margin: 0 0 20px 0; text-transform: uppercase; }
.hero-sub { color: rgba(255,255,255,.9); font-size: 1.1rem; max-width: 540px; margin-bottom: 32px; font-weight: 400; }
.hero-cta { display: flex; justify-content: center; gap: 12px; }
.btn-hero-primary { background: #000; color: #fff; padding: 16px 36px; border-radius: 0px; font-weight: 700; text-decoration: none; display: inline-block; transition: background-color .3s ease; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.9rem; border: 1px solid #000; }
.btn-hero-primary:hover { background: #fff; color: #000; border-color: #fff; }

.slide-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 56px; height: 56px; border-radius: 0; border: 1px solid rgba(255,255,255,0.4); background: transparent; color: #fff; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; transition: all .3s ease; z-index: 3; }
.slide-arrow:hover { background: #fff; color: #000; border-color: #fff; }
.slide-arrow.left { left: 18px; }
.slide-arrow.right { right: 18px; }
.slide-status { position: absolute; bottom: 42px; left: 50%; transform: translateX(-50%); z-index: 3; color: #fff; background: rgba(0,0,0,.46); border-radius: 999px; padding: 2px 9px; font-size: .72rem; font-weight: 700; letter-spacing: .08em; pointer-events: none; }
.slide-dots { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 3; }
.slide-dots button { width: 9px; height: 9px; border-radius: 50%; border: 1px solid rgba(255,255,255,.85); background: rgba(255,255,255,.45); transition: transform .3s ease, background-color .3s ease, opacity .3s ease; cursor: pointer; padding: 0; }
.slide-dots button.active { background: #fff; transform: scale(1.35); opacity: 1; }

/* Services */
.services-wrap { padding: 0 1.5rem; }
.services { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; background: #fff; border: 1px solid var(--sg-line); border-radius: 0px; padding: 32px 22px; margin-top: 0; position: relative; z-index: 3; box-shadow: none; }
.service { display: flex; gap: 14px; align-items: center; }
.service i { font-size: 1.8rem; color: var(--sg-ink); }
.service h6 { font-weight: 800; margin: 0; }
.service p { font-size: .82rem; color: var(--sg-muted); margin: 0; }

/* Section head */
.sec-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 28px; gap: 16px; }
.sec-title { font-weight: 900; font-size: 1.9rem; letter-spacing: -.02em; margin: 0; }
.sec-sub { color: var(--sg-muted); margin: 4px 0 0; }

/* Category cards */
.cat-card { display: block; position: relative; border-radius: 0px; overflow: hidden; aspect-ratio: 3/4; border: 1px solid var(--sg-line); }
.cat-card img { width: 100%; height: 100%; object-fit: cover; transition: transform .8s ease; }
.cat-card:hover img { transform: scale(1.05); }
.cat-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.2); display: flex; flex-direction: column; justify-content: flex-end; padding: 24px; color: #fff; transition: background .3s ease; }
.cat-card:hover .cat-overlay { background: rgba(0,0,0,0.4); }
.cat-sport { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; background: #000; color: #fff; align-self: flex-start; padding: .4rem .8rem; margin-bottom: 12px; }
.cat-overlay h4 { font-weight: 900; margin: 0; font-size: 1.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
.cat-go { font-size: .85rem; color: #fff; font-weight: 700; opacity: 0; transform: translateY(8px); transition: .3s; text-decoration: underline; margin-top: 8px; }
.cat-card:hover .cat-go { opacity: 1; transform: translateY(0); }

/* Product groups on the home page */
.product-category-section { padding-top: 2.5rem; }
.product-category-section + .product-category-section { border-top: 1px solid var(--sg-line); margin-top: 2.5rem; }
.category-see-all { display: flex; justify-content: center; margin-top: 1.5rem; }
.see-all-link { display: inline-flex; align-items: center; gap: .55rem; color: var(--sg-ink); border-bottom: 1px solid currentColor; padding: .45rem .15rem; text-decoration: none; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; font-size: .8rem; transition: gap .2s ease, color .2s ease; }
.see-all-link:hover { color: var(--sg-red); gap: .8rem; }
.empty-home-products { margin: 2.5rem 0; padding: 3rem 1.5rem; text-align: center; }
.empty-home-products .sec-title { margin-bottom: .5rem; }

/* CTA */
.cta-banner { background: #000; border-radius: 0px; padding: 64px 48px; color: #fff; text-align: center; border: 1px solid #000; }
.cta-content h3 { font-weight: 900; font-size: 1.9rem; }
.cta-content p { color: rgba(255,255,255,.85); margin-bottom: 22px; }

@media (max-width: 991px) { .services { grid-template-columns: repeat(2, 1fr); } .hero-slider { max-height: none; } .slide-caption { left: 5%; right: 5%; } }
@media (max-width: 576px) { .services { grid-template-columns: 1fr; } .hero-slider { aspect-ratio: 1.9 / 1; min-height: 200px; } .slide-arrow { width: 40px; height: 40px; } .slide-arrow.left { left: 8px; } .slide-arrow.right { right: 8px; } .slide-status { bottom: 38px; } .slide-dots { bottom: 17px; } }

/* ====== FEATURED section ====== */
.featured-section { padding: 2.5rem 1.5rem 3rem; }

.featured-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  gap: 16px;
}
.featured-title {
  font-weight: 900;
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  letter-spacing: -.03em;
  margin: 0;
  text-transform: uppercase;
}
.featured-sub {
  margin: 4px 0 0;
  color: var(--sg-muted);
  font-size: .95rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
}

/* Sport tabs scrollable row */
.sport-tabs-outer {
  overflow: hidden;
  border-bottom: 1px solid #e5e5e5;
  margin-bottom: 2rem;
}
.sport-tabs {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  cursor: grab;
  user-select: none;
  touch-action: pan-y;
}
.sport-tabs::-webkit-scrollbar { display: none; }
.sport-tab {
  flex-shrink: 0;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: .75rem 1.4rem;
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: .85rem;
  letter-spacing: .08em;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
  color: #999;
  transition: color .2s ease, border-color .2s ease;
  margin-bottom: -1px;
}
.sport-tab:hover { color: #1a1a1a; }
.sport-tab.active {
  color: #1a1a1a;
  border-bottom-color: #1a1a1a;
}

.featured-grid { margin-top: 0; }
.category-see-all { display: flex; justify-content: center; margin-top: 2rem; }
.see-all-link { display: inline-flex; align-items: center; gap: .55rem; color: var(--sg-ink); border-bottom: 1px solid currentColor; padding: .45rem .15rem; text-decoration: none; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; font-size: .8rem; transition: gap .2s ease, color .2s ease; }
.see-all-link:hover { color: var(--sg-red); gap: .8rem; }
</style>
