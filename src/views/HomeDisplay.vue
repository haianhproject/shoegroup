<template>
  <div class="home-page min-h-full bg-[#FFFFFF] text-[#0E0E0E]" style="font-family:'Be Vietnam Pro',sans-serif">

    <!-- Navbar and footer are supplied by FigmaCustomerLayout. -->

      <!-- Hero peek-carousel -->
      <section class="relative pb-5 bg-[#FFFFFF]"
        @mouseenter="pauseHero" @mouseleave.self="playHero">
        <div ref="heroViewport" class="relative overflow-hidden pt-8"
          @mousedown="onDragStart"
          @mousemove="onDragMove"
          @mouseup="onDragEnd"
          @mouseleave="onDragEnd"
          :style="isDragging ? 'cursor: grabbing; user-select: none' : 'cursor: grab'">
          <!-- Track -->
          <div ref="heroTrack" class="flex items-stretch"
            :class="isDragging || !isTransitioning ? '' : 'transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]'"
            @transitionend="onTrackTransitionEnd"
            :style="{ transform: `translateX(${trackOffset}px)`, gap: heroGap + 'px' }">
            <div v-for="(slide, i) in displaySlides" :key="slide._key"
              class="shrink-0 transition-all duration-700 ease-out"
              :style="{ width: slideWidth + 'px' }"
              :class="i === currentIndex ? 'opacity-100 scale-100' : 'opacity-45 scale-[0.94]'"
              @click="!dragMoved && (i === currentIndex ? goToProducts(slide.filter) : (currentIndex = i))">
              <div class="group relative overflow-hidden rounded-2xl bg-[#0E0E0E] h-[300px] md:h-[400px] lg:h-[460px] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.4)]">
                <!-- Media -->
                <template v-if="slide.type === 'video'">
                  <video :src="slide.src" :poster="slide.fallback" autoplay muted loop playsinline preload="auto" @error="onVideoError($event, slide.fallback)"
                    class="absolute inset-0 w-full h-full object-cover"></video>
                </template>
                <template v-else>
                  <img :src="slide.img" :alt="slide.alt" @error="onImageError($event, slide.fallback)"
                    class="absolute inset-0 w-full h-full object-cover"/>
                </template>
                <div class="absolute inset-0 bg-gradient-to-r from-[#0E0E0E]/85 via-[#0E0E0E]/35 to-transparent"></div>

                <!-- Copy -->
                <div class="relative h-full flex flex-col justify-center p-8 md:p-12 max-w-[85%] md:max-w-[62%]">
                  <div class="flex items-center gap-2.5 mb-3">
                    <span v-if="slide.type === 'video'" class="inline-flex items-center gap-1.5 bg-white text-[#0E0E0E] text-[10px] font-bold tracking-wide uppercase px-2 py-1 rounded-full">
                      <span class="w-1.5 h-1.5 rounded-full bg-[#0E0E0E] animate-pulse"></span> Video
                    </span>
                    <span class="hero-eyebrow text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase">{{ slide.eyebrow }}</span>
                  </div>
                  <h2 style="font-family:'Fraunces',serif" class="hero-title text-3xl md:text-5xl lg:text-6xl leading-[0.95] font-semibold text-white mb-3">
                    {{ slide.title }}<template v-if="slide.titleEm"><br><em class="hero-title-em not-italic">{{ slide.titleEm }}</em></template>
                  </h2>
                  <p class="hero-description text-sm md:text-base leading-relaxed max-w-sm mb-6">{{ slide.sub }}</p>
                  <span class="inline-flex items-center gap-2 bg-white text-[#0E0E0E] px-6 py-3 text-[13px] font-semibold w-fit rounded-full group-hover:bg-[#E5E5E5] transition-colors">
                    {{ slide.cta }}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Arrows -->
          <button @click.stop="prevSlide" aria-label="Trước"
            class="absolute left-4 lg:left-10 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center bg-white text-[#0E0E0E] shadow-md hover:bg-[#0E0E0E] hover:text-white rounded-full transition-colors border border-[#E5E5E5] cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button @click.stop="nextSlide" aria-label="Sau"
            class="absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center bg-white text-[#0E0E0E] shadow-md hover:bg-[#0E0E0E] hover:text-white rounded-full transition-colors border border-[#E5E5E5] cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        <!-- Dots -->
        <div class="flex items-center justify-center gap-2.5 mt-5">
          <button v-for="(slide, i) in heroSlides" :key="'dot'+i" @click="goToSlide(i)"
            :aria-label="'Banner ' + (i+1)"
            class="h-1.5 rounded-full transition-all duration-300 border-none cursor-pointer p-0"
            :class="i === activeSlide ? 'w-8 bg-[#0E0E0E]' : 'w-4 bg-[#D4D4D4] hover:bg-[#737373]'"></button>
        </div>
      </section>

      <!-- Ticker -->
      <div class="overflow-hidden border-y border-[#E5E5E5] bg-[#0E0E0E] text-[#FFFFFF] py-3">
        <div class="flex gap-10 whitespace-nowrap animate-marquee">
          <template v-for="n in 6" :key="n">
            <span v-for="t in tickerItems" :key="t+n" class="text-[10px] font-bold tracking-[0.18em] uppercase inline-flex items-center gap-10">
              {{ t }}<span class="text-[#FFFFFF]">✦</span>
            </span>
          </template>
        </div>
      </div>

      <!-- Sản phẩm nổi bật -->
      <section class="max-w-[1400px] mx-auto px-6 lg:px-12 py-14">
        <div class="flex items-end justify-between mb-7">
          <div>
            <span class="text-[10px] font-bold tracking-[0.2em] uppercase text-[#737373]">Nổi bật</span>
            <h2 style="font-family:'Fraunces',serif" class="text-3xl md:text-4xl mt-1.5 font-semibold leading-tight">Sản phẩm được yêu thích</h2>
          </div>
          <button @click="goToProducts('all')" class="hidden md:flex items-center gap-1.5 text-sm font-semibold bg-transparent border-none cursor-pointer p-0 hover:underline underline-offset-4">
            Xem tất cả
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
        <!-- Lưới 5 cột, card chuẩn -->
        <FigmaProductGrid :columns="5">
          <FigmaProductCard v-for="p in homeProducts" :key="p.id_product" :product="p" />
        </FigmaProductGrid>
      </section>

      <!-- 3 Banner thật -->
      <section class="max-w-[1400px] mx-auto px-6 lg:px-12 pb-14">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <!-- Banner lớn -->
          <button @click="goToProducts(banners[0].filter)"
            class="group relative overflow-hidden bg-[#0E0E0E] block text-left cursor-pointer border-none p-0 min-h-[300px] lg:min-h-[520px] lg:row-span-2">
            <img :src="banners[0].img" :alt="banners[0].alt" @error="onImageError($event, banners[0].fallback)" class="absolute inset-0 w-full h-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-105"/>
            <div class="absolute inset-0 bg-gradient-to-t from-[#0E0E0E] via-[#0E0E0E]/25 to-transparent"></div>
            <div class="relative h-full flex flex-col justify-end p-8 lg:p-12">
              <span class="hero-eyebrow text-[10px] font-bold tracking-[0.2em] uppercase mb-3">{{ banners[0].eyebrow }}</span>
              <h3 style="font-family:'Fraunces',serif" class="home-banner-title home-banner-title-light text-4xl lg:text-6xl text-white leading-[0.95] mb-4 font-semibold">
                {{ banners[0].title }}<br><em class="hero-title-em not-italic">{{ banners[0].titleEm }}</em>
              </h3>
              <p class="hero-description text-sm leading-relaxed mb-6 max-w-sm">{{ banners[0].sub }}</p>
              <span class="inline-flex items-center gap-2 border border-[#FFFFFF] text-[#FFFFFF] px-6 py-3 text-[11px] font-bold uppercase w-fit group-hover:bg-[#FFFFFF] group-hover:text-[#0E0E0E] transition-colors">
                {{ banners[0].cta }}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </div>
          </button>

          <!-- 2 Banner nhỏ -->
          <button v-for="b in banners.slice(1)" :key="b.title" @click="goToProducts(b.filter)"
            class="group relative overflow-hidden block text-left cursor-pointer border-none p-0 min-h-[250px]"
            :class="b.dark ? 'bg-[#0E0E0E]' : 'bg-[#F0F0F0]'">
            <img :src="b.img" :alt="b.alt" @error="onImageError($event, b.fallback)" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              :class="b.dark ? 'opacity-70' : ''"/>
            <div class="absolute inset-0" :class="b.dark ? 'bg-gradient-to-r from-[#0E0E0E] via-[#0E0E0E]/30 to-transparent' : 'bg-gradient-to-r from-white/85 via-white/40 to-transparent'"></div>
            <div class="relative h-full flex flex-col justify-center p-8 lg:p-10 max-w-[70%]">
              <span class="hero-eyebrow text-[10px] font-bold tracking-[0.2em] uppercase mb-2" :class="b.dark ? '' : 'text-[#737373]'">{{ b.eyebrow }}</span>
              <h3 style="font-family:'Fraunces',serif" class="home-banner-title text-2xl lg:text-3xl leading-tight mb-2 font-semibold" :class="b.dark ? 'home-banner-title-light text-white' : 'home-banner-title-dark text-[#0E0E0E]'">{{ b.title }}</h3>
              <p class="hero-description text-sm leading-relaxed mb-4 max-w-[240px]" :class="b.dark ? '' : 'text-[#737373]'">{{ b.sub }}</p>
              <span class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase" :class="b.dark ? 'text-white' : 'text-[#0E0E0E]'">
                {{ b.cta }}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </div>
          </button>
        </div>
      </section>

      <!-- Danh mục -->
      <section class="max-w-[1400px] mx-auto px-6 lg:px-12 pb-14">
        <div class="mb-7">
          <span class="text-[10px] font-bold tracking-[0.2em] uppercase text-[#737373]">Danh mục giày nam</span>
          <h2 style="font-family:'Fraunces',serif" class="text-3xl md:text-4xl mt-1.5 font-semibold">Chọn theo phong cách</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button v-for="(cat,i) in categoryCards" :key="cat.label" @click="goToProducts({ category: cat.categoryId, filter: cat.key })"
            class="group relative overflow-hidden bg-[#F0F0F0] block cursor-pointer border-none p-0 text-left"
            :style="{minHeight: i===0?'360px':'280px'}">
            <img :src="cat.img" :alt="cat.label" @error="onImageError($event, cat.fallback)" class="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-105"/>
            <div class="absolute inset-0 bg-gradient-to-t from-[#0E0E0E]/70 via-transparent to-transparent"></div>
            <div class="absolute bottom-5 left-5">
              <div style="font-family:'Fraunces',serif" class="text-xl text-white font-semibold mb-0.5">{{ cat.label }}</div>
              <div class="text-xs text-white/60">{{ cat.count }}</div>
            </div>
          </button>
        </div>
      </section>

      <!-- Cam kết -->
      <section class="border-y border-[#E5E5E5] py-10">
        <div class="max-w-[1400px] mx-auto px-6 lg:px-12 grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8">
          <div v-for="item in trustItems" :key="item.title" class="flex items-center gap-3.5">
            <div class="shrink-0 w-11 h-11 rounded-full border border-[#E5E5E5] flex items-center justify-center text-[#0E0E0E]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" v-html="trustIcons[item.icon]"></svg>
            </div>
            <div>
              <div class="text-sm font-semibold leading-tight">{{ item.title }}</div>
              <div class="text-xs text-[#737373] mt-0.5">{{ item.sub }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Đăng ký -->
      <section class="py-16 px-6 lg:px-12">
        <div class="max-w-xl mx-auto text-center">
          <span class="text-[9px] font-bold tracking-[0.2em] uppercase text-[#737373]">Bản tin</span>
          <h2 style="font-family:'Fraunces',serif" class="text-4xl mt-3 mb-3 font-semibold">Đừng bỏ lỡ<br>ưu đãi độc quyền</h2>
          <p class="text-sm text-[#737373] mb-8">Nhận thông báo sản phẩm mới và ưu đãi dành riêng cho thành viên.</p>
          <form @submit.prevent="subscribe" class="flex max-w-sm mx-auto">
            <input v-model="email" type="email" placeholder="Email của bạn"
              class="flex-1 border border-[#0E0E0E] border-r-0 px-4 py-3 text-sm bg-transparent outline-none placeholder:text-[#737373]"/>
            <button type="submit" class="bg-[#0E0E0E] text-[#FFFFFF] px-5 py-3 text-[10px] font-bold uppercase hover:bg-[#333333] transition-colors whitespace-nowrap cursor-pointer border-none">
              Đăng ký
            </button>
          </form>
        </div>
      </section>

    </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import FigmaProductCard from '../components/figma/product/FigmaProductCard.vue'
import FigmaProductGrid from '../components/figma/product/FigmaProductGrid.vue'
import { api } from '../services/apiClient'
import { notify } from '../stores/uiStore'
import { homeMedia } from '../data/homeMedia'

const router = useRouter()
const email = ref('')
const products = ref([])
const allProducts = ref([])
const categoriesFromApi = ref([])
const subscribe = () => {
  const value = email.value.trim()
  if (!/^\S+@\S+\.\S+$/.test(value)) {
    notify({ type: 'warning', title: 'Email chưa hợp lệ', message: 'Vui lòng nhập địa chỉ email để đăng ký nhận tin.' })
    return
  }
  notify({ type: 'success', title: 'Đăng ký thành công', message: 'Bạn sẽ nhận được các ưu đãi mới nhất từ ShoeGroup.' })
  email.value = ''
}

const mapProduct = (p) => ({
  id_product: p.id_product ?? p.id, product_name: p.product_name ?? p.name,
  price: p.price, sale_price: p.sale_price, id_category: p.id_category ?? p.category_id,
  category_name: p.category_name ?? p.category, sport: p.sport, material_name: p.material_name,
  image_url: p.image_url ?? p.img, brand_name: p.brand_name ?? p.brand ?? '', id_brand: p.id_brand ?? p.brand_id ?? 1,
  variants: p.variants || [], colors: p.colors || [],
  is_new: p.is_new ?? p.isNew ?? p.new_arrival ?? p.is_featured ?? p.IsFeatured ?? false,
  is_featured: p.is_featured ?? p.IsFeatured ?? false, tag: p.tag,
  f_sizes: (p.sizes || []).map((s) => String(s)),
  f_colors: (p.colors || []).map((c) => c.name || c.color_label || c.color_name || c),
  total_stock: p.total_stock ?? p.stock ?? (p.id != null ? null : 24),
})

const loadData = async () => {
  try {
    const [featuredResult, allResult, categoryResult] = await Promise.allSettled([
      api.get('/v2/products/featured?limit=5'),
      api.get('/products'),
      api.get('/categories'),
    ])
    const featuredPayload = featuredResult.status === 'fulfilled' ? featuredResult.value : null
    const allPayload = allResult.status === 'fulfilled' ? allResult.value : null
    const categoryPayload = categoryResult.status === 'fulfilled' ? categoryResult.value : []
    const featuredRows = Array.isArray(featuredPayload)
      ? featuredPayload
      : (featuredPayload?.data || featuredPayload?.products || [])
    const allRows = Array.isArray(allPayload) ? allPayload : (allPayload?.data || allPayload?.products || [])
    const cats = Array.isArray(categoryPayload) ? categoryPayload : (categoryPayload?.data || categoryPayload?.categories || [])
    if (!allRows.length || !Array.isArray(cats)) throw new Error('Dữ liệu API sản phẩm trống')
    allProducts.value = allRows.filter(p => p.active !== false && p.active !== 0 && p.active !== '0').map(mapProduct)
    const fullById = new Map(allRows.map((row) => [String(row.id ?? row.id_product), row]))
    const featuredWithFullShape = featuredRows.map((row) => ({ ...(fullById.get(String(row.id ?? row.id_product)) || {}), ...row }))
    products.value = (featuredRows.length ? featuredWithFullShape : allRows)
      .filter(p => p.active !== false && p.active !== 0 && p.active !== '0')
      .map(mapProduct)
      .slice(0, 5)
    categoriesFromApi.value = cats.filter(c => c.active !== false && c.active !== 0 && c.active !== '0').map(c => ({ id_category: c.id, category_name: c.name, sport: c.sport }))
  } catch (error) {
    console.warn('Không thể tải dữ liệu trang chủ từ API:', error)
    products.value = []
    allProducts.value = []
    categoriesFromApi.value = []
  }
}

const heroVideo = homeMedia.videos[Math.floor(Math.random() * homeMedia.videos.length)]
const heroSlides = [
  { eyebrow: 'Bộ Sưu Tập Nam 2026', title: 'Giày thể thao', titleEm: 'đỉnh cao', sub: 'Thiết kế tối giản, hiệu suất vượt trội. Mỗi bước chân là tuyên ngôn về phong cách sống năng động.', cta: 'Mua ngay', filter: 'all', alt: 'Giày thể thao nam trắng', img: homeMedia.hero.sneakers },
  { eyebrow: 'Trên chân thực tế', title: 'Cảm nhận', titleEm: 'từng chuyển động', sub: 'Chất liệu, phom dáng và độ bám được chăm chút trong từng bước chân.', cta: 'Khám phá sản phẩm', filter: 'all', type: 'video', src: heroVideo, fallback: homeMedia.hero.sneakers },
  { eyebrow: 'Dòng Chạy Bộ', title: 'Được tạo ra', titleEm: 'cho tốc độ', sub: 'Công nghệ đệm tiên tiến, trọng lượng siêu nhẹ — nâng tầm mỗi cây số.', cta: 'Xem giày chạy', filter: 'running', alt: 'Nam giới chạy bộ với giày thể thao', img: homeMedia.hero.running },
  { eyebrow: 'Ưu Đãi Cuối Mùa', title: 'Giảm đến 30%', titleEm: 'số lượng có hạn', sub: 'Loạt mẫu lifestyle & training giá tốt nhất năm.', cta: 'Săn sale ngay', filter: 'sale', alt: 'Giày sneaker nam phong cách đường phố', img: homeMedia.hero.sale },
]
// Tạo 3 bộ slide để tạo vòng lặp vô hạn mượt mà (cả 2 bên trái/phải luôn có ảnh hiển thị)
const displaySlides = computed(() => [
  ...heroSlides.map((s, idx) => ({ ...s, _key: `set0-${idx}`, realIdx: idx })),
  ...heroSlides.map((s, idx) => ({ ...s, _key: `set1-${idx}`, realIdx: idx })),
  ...heroSlides.map((s, idx) => ({ ...s, _key: `set2-${idx}`, realIdx: idx })),
])

const currentIndex = ref(heroSlides.length) // Bắt đầu ở slide 0 của set giữa
const isTransitioning = ref(true)

const activeSlide = computed(() => {
  const len = heroSlides.length
  return ((currentIndex.value % len) + len) % len
})

const heroTrack = ref(null)
const heroViewport = ref(null)
const viewportWidth = ref(1200)
const heroGap = 20
const slideWidth = computed(() => { const w = viewportWidth.value; return Math.round(w * (w >= 1024 ? 0.80 : w >= 640 ? 0.86 : 0.90)) })

// Drag state
const isDragging = ref(false)
const dragStartX = ref(0)
const dragDeltaX = ref(0)
const dragMoved = ref(false)
const DRAG_THRESHOLD = 60 // px kéo tối thiểu để chuyển slide

const trackOffset = computed(() =>
  Math.round(viewportWidth.value / 2 - slideWidth.value / 2 - currentIndex.value * (slideWidth.value + heroGap))
  + (isDragging.value ? dragDeltaX.value : 0)
)

const measure = () => { if (heroViewport.value) viewportWidth.value = heroViewport.value.clientWidth }
let heroTimer = null

const goToSlide = (targetRealIdx) => {
  const currentRealIdx = activeSlide.value
  let diff = targetRealIdx - currentRealIdx
  if (diff > heroSlides.length / 2) diff -= heroSlides.length
  else if (diff < -heroSlides.length / 2) diff += heroSlides.length
  currentIndex.value += diff
}

const nextSlide = () => { currentIndex.value++ }
const prevSlide = () => { currentIndex.value-- }

const onTrackTransitionEnd = (e) => {
  if (e && e.target !== e.currentTarget) return
  if (e && e.propertyName && e.propertyName !== 'transform') return

  const len = heroSlides.length
  if (currentIndex.value >= len * 2) {
    isTransitioning.value = false
    currentIndex.value -= len
    if (heroTrack.value) void heroTrack.value.offsetHeight
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isTransitioning.value = true
      })
    })
  } else if (currentIndex.value < len) {
    isTransitioning.value = false
    currentIndex.value += len
    if (heroTrack.value) void heroTrack.value.offsetHeight
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isTransitioning.value = true
      })
    })
  }
}

const playHero = () => { if (!heroTimer) heroTimer = setInterval(nextSlide, 5000) }
const pauseHero = () => { if (heroTimer) { clearInterval(heroTimer); heroTimer = null } }

// Mouse drag handlers
const onDragStart = (e) => {
  if (e.button !== 0) return // chỉ chuột trái
  isDragging.value = true
  dragMoved.value = false
  dragDeltaX.value = 0
  dragStartX.value = e.clientX
  pauseHero()
  e.preventDefault()
}
const onDragMove = (e) => {
  if (!isDragging.value) return
  dragDeltaX.value = e.clientX - dragStartX.value
  if (Math.abs(dragDeltaX.value) > 5) dragMoved.value = true
}
const onDragEnd = () => {
  if (!isDragging.value) return
  const delta = dragDeltaX.value
  isDragging.value = false
  dragDeltaX.value = 0
  if (Math.abs(delta) >= DRAG_THRESHOLD) {
    if (delta < 0) nextSlide(); else prevSlide()
  }
  // Nếu không kéo đủ xa → tự bounce về vị trí cũ (transition sẽ xử lý)
  setTimeout(playHero, 800)
}
const onImageError = (event, fallback) => {
  if (!fallback || event.target.dataset.fallbackApplied) return
  event.target.dataset.fallbackApplied = 'true'
  event.target.src = fallback
}
const onVideoError = (event, fallback) => {
  if (!fallback || event.target.dataset.fallbackApplied) return
  event.target.dataset.fallbackApplied = 'true'
  event.target.style.display = 'none'
  const image = document.createElement('img')
  image.src = fallback
  image.alt = 'Banner ShoeGroup'
  image.className = 'absolute inset-0 h-full w-full object-cover'
  event.target.parentElement?.prepend(image)
}

const normalizeFilterText = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const categoryAliases = {
  running: ['running', 'chay bo'],
  basketball: ['basketball', 'bong ro'],
  training: ['training', 'gym', 'tap'],
  lifestyle: ['lifestyle', 'sneaker'],
  football: ['football', 'bong da'],
  tennis: ['tennis'],
}
const resolveCategoryId = (filter) => {
  const aliases = categoryAliases[filter] || [filter]
  const source = categoriesFromApi.value
  const match = source.find((category) => {
    const haystack = normalizeFilterText(`${category.category_name} ${category.sport}`)
    return aliases.some((alias) => haystack.includes(normalizeFilterText(alias)))
  })
  return match?.id_category ?? null
}
const goToProducts = (filter = 'all') => {
  const value = typeof filter === 'object' ? filter : { filter }
  let query = {}
  if (value.category != null) {
    query = { category: String(value.category) }
  } else if (value.filter && value.filter !== 'all') {
    const categoryId = resolveCategoryId(value.filter)
    query = ['sale', 'new'].includes(value.filter)
      ? { filter: value.filter }
      : categoryId != null
        ? { category: String(categoryId) }
        : { search: value.filter }
  }
  router.push({ path: '/products', query })
}
const homeProducts = computed(() => products.value.slice(0, 5))
const categoryImages = homeMedia.categories
const categorySpecs = [
  { key: 'running', label: 'Chạy Bộ' },
  { key: 'basketball', label: 'Bóng Rổ' },
  { key: 'training', label: 'Training' },
]
const categoryCards = computed(() => categorySpecs.map((spec, i) => {
  const categoryId = resolveCategoryId(spec.key)
  const category = categoriesFromApi.value.find((item) => String(item.id_category) === String(categoryId))
  const count = allProducts.value.filter((product) => String(product.id_category) === String(categoryId)).length
  return {
    key: spec.key,
    label: category?.category_name || spec.label,
    count: `${count || allProducts.value.filter((product) => normalizeFilterText(`${product.sport} ${product.category_name}`).includes(normalizeFilterText(spec.key))).length} sản phẩm`,
    categoryId,
    img: categoryImages[i],
  }
}))
const tickerItems = ['CHẠY BỘ NAM', 'BÓNG RỔ', 'TRAINING', 'LIFESTYLE', 'TENNIS', 'SALE -30%']
const banners = [
  { eyebrow: 'Dòng Hiệu Suất Cao', title: 'Được tạo ra', titleEm: 'cho tốc độ', sub: 'Công nghệ đệm tiên tiến, trọng lượng siêu nhẹ.', cta: 'Xem bộ sưu tập', filter: 'running', dark: true, alt: 'Giày chạy bộ hiệu suất cao', img: homeMedia.promo.running },
  { eyebrow: 'Sân đấu bóng rổ', title: 'Bứt phá mọi giới hạn', sub: 'Bám sân tối ưu, hỗ trợ cổ chân vững chắc.', cta: 'Khám phá ngay', filter: 'basketball', dark: true, alt: 'Giày thể thao dành cho sân bóng rổ', img: homeMedia.promo.basketball },
  { eyebrow: 'Giảm đến 30%', title: 'Ưu đãi cuối mùa', sub: 'Loạt mẫu lifestyle & training giá tốt.', cta: 'Săn sale', filter: 'sale', dark: false, alt: 'Bộ sưu tập ưu đãi cuối mùa', img: homeMedia.promo.sale },
]
const trustItems = [{ icon: 'truck', title: 'Giao hàng toàn quốc', sub: 'Xem phí khi thanh toán' }, { icon: 'return', title: 'Yêu cầu trả hàng', sub: 'Trong 14 ngày từ khi nhận' }, { icon: 'shield', title: 'Chính hãng 100%', sub: 'Cam kết hoàn tiền' }, { icon: 'support', title: 'Hỗ trợ 24/7', sub: 'Luôn sẵn sàng' }]
const trustIcons = { truck: '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>', return: '<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>', shield: '<path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>', support: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-3v-8h3a2 2 0 0 1 2 2z"/><path d="M3 19a2 2 0 0 0 2 2h3v-8H5a2 2 0 0 0-2 2z"/>' }
onMounted(() => { loadData(); measure(); window.addEventListener('resize', measure); playHero() })
onUnmounted(() => { pauseHero(); window.removeEventListener('resize', measure) })
</script>

<style>
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.animate-marquee { animation: marquee 22s linear infinite; }
.home-page a { text-decoration: none !important; }
.home-page h2.hero-title,
.home-page h3.home-banner-title-light { color: #FFFFFF !important; }
.home-page h3.home-banner-title-dark { color: #0E0E0E !important; }
.home-page .hero-eyebrow { color: #DCE8F2 !important; }
.home-page .hero-title-em { color: #B5C5D3 !important; }
.home-page .hero-description { color: rgba(255,255,255,.92) !important; }
</style>
