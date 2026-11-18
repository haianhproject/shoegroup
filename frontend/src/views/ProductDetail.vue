<!-- Mục đích: Trang chi tiết sản phẩm, chọn màu/size và thêm sản phẩm vào giỏ. -->
<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FigmaProductCard from '../components/figma/product/FigmaProductCard.vue'
import FigmaProductGrid from '../components/figma/product/FigmaProductGrid.vue'
import { api } from '../services/apiClient'
import { variantSizeLabel } from '../services/variantSize'
import { addToCart, formatCurrency, showDrawer } from '../stores/cartStore'
import { notify } from '../stores/uiStore'
import fallbackProductImage from '../../img/hero-sneakers.jpg'

const route = useRoute()
const router = useRouter()
const product = ref(null)
const relatedProducts = ref([])
const isLoading = ref(true)
const activeImage = ref('')
const selectedColor = ref(null)
const selectedSize = ref(null)
const quantity = ref(1)

const normalizeProduct = (raw) => ({
  ...raw,
  id_product: raw.id_product ?? raw.id,
  product_name: raw.product_name ?? raw.name ?? '',
  category_name: raw.category_name ?? raw.category ?? '',
  id_category: raw.id_category ?? raw.category_id,
  brand_name: raw.brand_name ?? raw.brand ?? '',
  image_url: raw.image_url ?? raw.image ?? '',
  total_stock: raw.total_stock ?? raw.stock,
  variants: Array.isArray(raw.variants) ? raw.variants.map((variant) => ({
    ...variant,
    id: variant.id ?? variant.variant_id ?? variant.id_variant ?? null,
    size: String(variant.size ?? variant.size_name ?? variant.SizeName ?? ''),
    color: String(variant.color ?? variant.color_name ?? variant.color_label ?? variant.ColorName ?? ''),
    stock: Number(variant.stock ?? variant.stock_quantity ?? variant.quantity ?? 0),
  })) : [],
  colors: Array.isArray(raw.colors) ? raw.colors : [],
  sizes: Array.isArray(raw.sizes) ? raw.sizes : [],
})

const colorOptions = computed(() => {
  if (!product.value) return []
  const fromApi = product.value.colors.map((color) => {
    const name = String(color.name ?? color.color_name ?? color.color_label ?? color.ColorName ?? '')
    const matchingVariant = product.value.variants.find((variant) => variant.color === name)
    return {
      name,
      label: String(color.name ?? color.color_label ?? color.color_name ?? color.ColorName ?? ''),
      hex: color.hex ?? color.color_hex ?? color.ColorHex ?? '#d4d4d4',
      image: color.image ?? color.image_url ?? color.ImageURL ?? matchingVariant?.image ?? matchingVariant?.image_url ?? '',
    }
  }).filter((color) => color.name)
  if (fromApi.length) return fromApi

  const options = new Map()
  for (const variant of product.value.variants) {
    if (!variant.color || options.has(variant.color)) continue
    options.set(variant.color, {
      name: variant.color,
      label: variant.color,
      hex: variant.hex ?? variant.color_hex ?? '#d4d4d4',
      image: variant.image ?? variant.image_url ?? '',
    })
  }
  return [...options.values()]
})

const allSizes = computed(() => {
  if (!product.value) return []
  const variantSizes = product.value.variants.map(variantSizeLabel).filter(Boolean)
  if (variantSizes.length) return [...new Set(variantSizes)]
  return product.value.sizes.map((size) => String(size?.size_name ?? size?.name ?? size)).filter(Boolean)
})

const availableSizes = computed(() => {
  if (!product.value?.variants.length || !selectedColor.value) return allSizes.value
  return [...new Set(product.value.variants
    .filter((variant) => variant.color === selectedColor.value.name)
    .map(variantSizeLabel)
    .filter(Boolean))]
})

const selectedVariant = computed(() => {
  if (!product.value?.variants.length) return null
  return product.value.variants.find((variant) =>
    variant.color === selectedColor.value?.name && variantSizeLabel(variant) === String(selectedSize.value),
  ) || null
})

const sizeStock = (size) => {
  if (!product.value?.variants.length) return Number(product.value?.total_stock ?? product.value?.stock_quantity ?? 0) || 0
  const variant = product.value.variants.find((item) =>
    item.color === selectedColor.value?.name && variantSizeLabel(item) === String(size),
  )
  return Math.max(0, Number(variant?.stock) || 0)
}

const selectedStock = computed(() => {
  if (selectedVariant.value) return Math.max(0, Number(selectedVariant.value.stock) || 0)
  if (product.value?.variants.length) return 0
  return Math.max(0, Number(product.value?.total_stock ?? product.value?.stock_quantity ?? 0) || 0)
})

const colorOutOfStock = (color) => {
  if (!product.value?.variants.length) return selectedStock.value <= 0
  const variants = product.value.variants.filter((variant) => variant.color === color.name)
  return !variants.length || variants.every((variant) => Number(variant.stock) <= 0)
}

const isEntireProductOutOfStock = computed(() => {
  if (!product.value) return true
  if (product.value.variants.length) return product.value.variants.every((variant) => Number(variant.stock) <= 0)
  return selectedStock.value <= 0
})

const galleryImages = computed(() => {
  if (!product.value) return []
  const coverImage = product.value.image_url
  const productImages = [...new Set([
    ...colorOptions.value.map((color) => color.image),
    ...product.value.variants.map((variant) => variant.image ?? variant.image_url),
  ].filter(Boolean))]
  // Ảnh bìa chỉ dùng cho card bên ngoài. Trang chi tiết chỉ dùng lại ảnh
  // bìa khi sản phẩm hoàn toàn chưa có ảnh màu/ảnh sản phẩm nào khác. Nếu
  // ảnh màu đầu tiên trùng URL ảnh bìa thì vẫn giữ lại vì đó vẫn là ảnh sản phẩm.
  return (productImages.length ? productImages : [coverImage].filter(Boolean)).slice(0, 4)
})

const hasDiscount = computed(() => {
  const regular = Number(selectedVariant.value?.price ?? product.value?.price) || 0
  const sale = Number(selectedVariant.value?.sale_price ?? product.value?.sale_price) || 0
  return sale > 0 && sale < regular
})
const regularPrice = computed(() => Number(selectedVariant.value?.price ?? product.value?.price) || 0)
const displayPrice = computed(() => hasDiscount.value
  ? Number(selectedVariant.value?.sale_price ?? product.value?.sale_price)
  : regularPrice.value)

const attributes = computed(() => [
  ['Thương hiệu', product.value?.brand_name],
  ['Danh mục', product.value?.category_name],
  ['Bộ môn', product.value?.sport],
  ['Chất liệu', product.value?.material_name],
].filter(([, value]) => value))

const trustItems = [
  { title: 'Chính hãng 100%', sub: 'Cam kết hoàn tiền', icon: 'shield' },
  { title: 'Giao hàng toàn quốc', sub: 'Theo dõi đơn dễ dàng', icon: 'truck' },
  { title: 'Yêu cầu trả hàng', sub: 'Trong 14 ngày từ khi nhận', icon: 'return' },
]

const selectColor = (color) => {
  selectedColor.value = color
  activeImage.value = color.image || galleryImages.value[0] || product.value?.image_url || ''
  const firstInStock = availableSizes.value.find((size) => sizeStock(size) > 0)
  selectedSize.value = firstInStock ?? availableSizes.value[0] ?? null
  quantity.value = 1
}

const selectSize = (size) => {
  selectedSize.value = size
  quantity.value = 1
}

const incrementQuantity = () => {
  if (quantity.value < selectedStock.value) quantity.value += 1
  else notify({ type: 'warning', message: `Sản phẩm này chỉ còn ${selectedStock.value} trong kho.` })
}

const buildCartPayload = () => ({
  product: {
    ...product.value,
    price: selectedVariant.value?.price ?? product.value.price,
    sale_price: selectedVariant.value?.sale_price ?? product.value.sale_price,
  },
  quantity: quantity.value,
  size: { size_name: String(selectedVariant.value?.size ?? selectedSize.value ?? ''), standard:selectedVariant.value?.standard },
  color: {
    color_name: selectedColor.value?.name ?? 'Tiêu chuẩn',
    color_label: selectedColor.value?.label ?? 'Tiêu chuẩn',
    color_hex: selectedColor.value?.hex ?? '',
    image: selectedColor.value?.image ?? product.value.image_url,
  },
  variantId: selectedVariant.value?.id ?? null,
  stockQuantity: selectedStock.value,
})

const addCurrentSelection = async ({ openCart = true } = {}) => {
  if (colorOptions.value.length && !selectedColor.value) {
    notify({ type: 'warning', message: 'Vui lòng chọn màu sắc.' })
    return false
  }
  if (allSizes.value.length && !selectedSize.value) {
    notify({ type: 'warning', message: 'Vui lòng chọn kích cỡ.' })
    return false
  }
  if (product.value.variants.length && !selectedVariant.value) {
    notify({ type: 'warning', message: 'Sản phẩm này không còn tồn tại.' })
    return false
  }
  if (selectedStock.value <= 0 || quantity.value > selectedStock.value) {
    notify({ type: 'warning', message: 'Sản phẩm này hiện không đủ hàng.' })
    return false
  }

  const result = await addToCart(buildCartPayload())
  if (!result.ok) {
    notify({ type: 'error', message: result.message })
    return false
  }
  if (openCart) showDrawer()
  notify({ type: 'success', title: 'Đã thêm vào giỏ hàng', message: product.value.product_name, duration: 2500 })
  quantity.value = 1
  return true
}

const buyNow = async () => {
  if (await addCurrentSelection({ openCart: false })) router.push('/checkout')
}

const onImageError = (event) => {
  if (event.target.dataset.fallbackApplied) return
  event.target.dataset.fallbackApplied = 'true'
  event.target.src = fallbackProductImage
}

const fetchData = async () => {
  isLoading.value = true
  product.value = null
  relatedProducts.value = []
  try {
    const response = await api.get('/products')
    const rows = Array.isArray(response) ? response : (response?.data || response?.products || [])
    const id = Number(route.params.id)
    const raw = rows.find((item) => Number(item.id ?? item.id_product) === id)
    if (!raw) return

    product.value = normalizeProduct(raw)
    relatedProducts.value = rows
      .filter((item) => Number(item.id ?? item.id_product) !== id)
      .filter((item) => {
        const categoryId = item.category_id ?? item.id_category
        return product.value.id_category != null
          ? String(categoryId) === String(product.value.id_category)
          : String(item.category ?? item.category_name) === product.value.category_name
      })
      .filter((item) => item.active !== false && item.active !== 0 && item.active !== '0')
      .map(normalizeProduct)
      .slice(0, 5)

    const firstColor = colorOptions.value.find((color) => !colorOutOfStock(color)) ?? colorOptions.value[0] ?? null
    if (firstColor) selectColor(firstColor)
    else {
      activeImage.value = galleryImages.value[0] || product.value.image_url
      selectedSize.value = availableSizes.value.find((size) => sizeStock(size) > 0) ?? availableSizes.value[0] ?? null
    }
  } catch (error) {
    console.error('Lỗi tải sản phẩm:', error)
    notify({ type: 'error', message: 'Không thể tải thông tin sản phẩm.' })
  } finally {
    isLoading.value = false
  }
}

watch(() => route.params.id, fetchData)
onMounted(fetchData)
</script>

<template>
  <div class="product-detail-page min-h-screen bg-white text-[#0F172A]">
    <div v-if="isLoading" class="flex min-h-[520px] items-center justify-center gap-3" aria-live="polite">
      <span class="sg-spinner text-slate-900" aria-hidden="true"></span>
      <span class="text-sm font-semibold text-slate-500">Đang chuẩn bị sản phẩm...</span>
    </div>

    <div v-else-if="product" class="mx-auto w-full max-w-[1360px] px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pt-8">
      <!-- Breadcrumbs -->
      <nav class="mb-6 flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-400" aria-label="Đường dẫn">
        <router-link to="/" class="shrink-0 transition-colors hover:text-slate-900">Trang chủ</router-link>
        <span aria-hidden="true">/</span>
        <router-link to="/products" class="shrink-0 transition-colors hover:text-slate-900">Sản phẩm</router-link>
        <span aria-hidden="true">/</span>
        <span class="truncate text-slate-900">{{ product.product_name }}</span>
      </nav>

      <div class="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-14">
        <!-- Image Section (Sticky on desktop) -->
        <section class="lg:sticky lg:top-[96px]" aria-label="Hình ảnh sản phẩm">
          <div class="relative aspect-square overflow-hidden rounded-3xl bg-[#F8FAFC] border border-slate-200/80 shadow-xs">
            <span v-if="product.sport" class="absolute left-4 top-4 z-10 rounded-full bg-slate-900/90 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-xs">{{ product.sport }}</span>
            <span v-if="hasDiscount" class="absolute right-4 top-4 z-10 rounded-full bg-[#D4001A] text-white px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-xs">Sale Ưu Đãi</span>
            <img :src="activeImage || product.image_url" :alt="product.product_name" class="h-full w-full object-cover transition-transform duration-500 hover:scale-105" @error="onImageError" />
          </div>
          <!-- Thumbnails -->
          <div v-if="galleryImages.length > 1" class="mt-4 grid grid-cols-4 gap-3">
            <button
              v-for="(image, index) in galleryImages"
              :key="image"
              type="button"
              class="aspect-square overflow-hidden rounded-2xl border-2 bg-[#F8FAFC] p-0 transition-all cursor-pointer shadow-xs"
              :class="activeImage === image ? 'border-slate-900 ring-2 ring-slate-900/10 scale-102' : 'border-slate-200 hover:border-slate-400 opacity-75 hover:opacity-100'"
              :aria-label="`Xem ảnh ${index + 1}`"
              @click="activeImage = image"
            >
              <img :src="image" :alt="`Ảnh ${index + 1} của ${product.product_name}`" class="h-full w-full object-cover" @error="onImageError" />
            </button>
          </div>
        </section>

        <!-- Product Info Section -->
        <section class="flex flex-col">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">{{ product.brand_name || 'ShoeGroup' }}</span>
            <span v-if="product.is_featured" class="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Nổi bật</span>
          </div>

          <h1 class="figma-display text-3xl font-bold leading-tight text-slate-900 md:text-4xl tracking-tight mb-3">{{ product.product_name }}</h1>

          <!-- Price -->
          <div class="mb-5 flex flex-wrap items-baseline gap-3 pb-5 border-b border-slate-100">
            <span class="figma-display text-3xl font-bold text-[#D4001A]">{{ formatCurrency(displayPrice) }}</span>
            <span v-if="hasDiscount" class="text-base text-slate-400 line-through font-medium">{{ formatCurrency(regularPrice) }}</span>
          </div>

          <p class="mb-6 text-sm leading-relaxed text-slate-600 font-normal">{{ product.description || `${product.product_name} có thiết kế hiện đại, đệm nâng đỡ êm ái và bám sân tối ưu cho phong cách năng động hằng ngày.` }}</p>

          <!-- Attributes Grid -->
          <dl v-if="attributes.length" class="mb-6 grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 p-4 text-[13px]">
            <div v-for="([label, value]) in attributes" :key="label" class="min-w-0">
              <dt class="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{{ label }}</dt>
              <dd class="mt-0.5 truncate font-bold text-slate-800">{{ value }}</dd>
            </div>
          </dl>

          <!-- Color options -->
          <div v-if="colorOptions.length" class="mb-6">
            <div class="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-700">Màu sắc: <span class="font-normal text-slate-500 normal-case">{{ selectedColor?.label }}</span></div>
            <div class="flex flex-wrap gap-2.5">
              <button
                v-for="color in colorOptions"
                :key="color.name"
                type="button"
                class="relative flex h-12 min-w-12 items-center justify-center overflow-hidden rounded-xl border-2 bg-white p-1 transition-all cursor-pointer shadow-xs"
                :class="[
                  selectedColor?.name === color.name ? 'border-slate-900 ring-2 ring-slate-900/10 scale-105' : 'border-slate-200 hover:border-slate-400',
                  colorOutOfStock(color) ? 'opacity-40' : ''
                ]"
                :title="colorOutOfStock(color) ? `${color.label} - Hết hàng, vẫn có thể xem ảnh` : color.label"
                @click="selectColor(color)"
              >
                <img v-if="color.image" :src="color.image" :alt="color.label" class="h-full w-full rounded-lg object-cover" @error="onImageError" />
                <span v-else class="h-7 w-7 rounded-full border border-black/10" :style="{ backgroundColor: color.hex }"></span>
              </button>
            </div>
          </div>

          <!-- Size options -->
          <div v-if="availableSizes.length" class="mb-6">
            <div class="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-700">Chọn kích cỡ</div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="size in availableSizes"
                :key="size"
                type="button"
                class="relative flex h-11 min-w-[50px] px-3.5 items-center justify-center rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs"
                :class="[
                  selectedSize === size
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50',
                  sizeStock(size) <= 0 ? 'cursor-not-allowed text-slate-300 line-through opacity-50 bg-slate-50' : ''
                ]"
                :disabled="sizeStock(size) <= 0"
                @click="selectSize(size)"
              >
                {{ size }}
              </button>
            </div>
          </div>

          <!-- Stock note -->
          <div v-if="selectedSize || !allSizes.length" class="mb-5 flex items-center gap-2 text-xs font-bold">
            <span class="w-2 h-2 rounded-full" :class="selectedStock > 0 ? 'bg-emerald-500' : 'bg-red-500'"></span>
            <span :class="selectedStock > 0 ? 'text-emerald-700' : 'text-red-600'">
              {{ selectedStock > 0 ? `Còn ${selectedStock} sản phẩm trong kho` : 'Phiên bản này hiện đã hết hàng' }}
            </span>
          </div>

          <!-- Actions -->
          <template v-if="!isEntireProductOutOfStock">
            <div class="mb-3.5 flex items-center gap-3">
              <!-- Quantity Stepper -->
              <div class="flex h-12 shrink-0 items-center rounded-full border border-slate-200 bg-white px-1 shadow-xs">
                <button
                  type="button"
                  aria-label="Giảm số lượng"
                  class="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer"
                  @click="quantity = Math.max(1, quantity - 1)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14" /></svg>
                </button>
                <span class="w-10 text-center text-sm font-bold text-slate-900">{{ quantity }}</span>
                <button
                  type="button"
                  aria-label="Tăng số lượng"
                  class="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer"
                  @click="incrementQuantity"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
                </button>
              </div>

              <!-- Add to Cart -->
              <button
                type="button"
                class="btn-sg-outline h-12 flex-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="selectedStock <= 0"
                @click="addCurrentSelection()"
              >
                Thêm vào giỏ
              </button>
            </div>

            <!-- Buy Now -->
            <button
              type="button"
              class="btn-sg-warm mb-8 h-12 w-full rounded-full text-xs font-extrabold uppercase tracking-wider transition-all disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="selectedStock <= 0"
              @click="buyNow"
            >
              Mua ngay
            </button>
          </template>

          <div v-else class="mb-8 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5 text-center">
            <p class="text-sm font-bold text-slate-800">Sản phẩm này hiện đã hết hàng.</p>
            <router-link to="/products" class="mt-2 inline-block text-xs font-bold text-[#D4001A] hover:underline">Khám phá các mẫu tương tự</router-link>
          </div>

          <!-- Trust Items with Lucide Icons -->
          <div class="space-y-3.5 border-t border-slate-200/80 pt-6">
            <div v-for="item in trustItems" :key="item.title" class="flex items-center gap-3">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-[#D4001A]">
                <svg v-if="item.icon === 'shield'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5z" /><path d="m9 12 2 2 4-4" /></svg>
                <svg v-else-if="item.icon === 'truck'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6" /><path d="M3 13a9 9 0 1 0 3-7.7L3 8" /></svg>
              </div>
              <p class="text-xs text-slate-600"><strong class="text-slate-900">{{ item.title }}</strong> · {{ item.sub }}</p>
            </div>
          </div>
        </section>
      </div>

      <!-- Related Products Section -->
      <section v-if="relatedProducts.length" class="mt-20 border-t border-slate-200 pt-14">
        <div class="mb-8">
          <span class="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4001A]">Gợi ý cho bạn</span>
          <h2 class="figma-display text-2xl font-bold text-slate-900 md:text-3xl mt-1">Sản phẩm liên quan</h2>
        </div>
        <FigmaProductGrid :columns="5">
          <FigmaProductCard v-for="item in relatedProducts" :key="item.id_product" :product="item" />
        </FigmaProductGrid>
      </section>
    </div>

    <!-- 404 Not Found State with Vector SVG -->
    <div v-else class="mx-auto flex min-h-[520px] max-w-md flex-col items-center justify-center px-6 text-center">
      <div class="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-50 text-[#D4001A]">
        <svg class="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1 class="figma-display text-2xl font-bold text-slate-900">Không tìm thấy sản phẩm</h1>
      <p class="mt-2 text-sm text-slate-500 leading-relaxed">Sản phẩm này có thể đã ngừng kinh doanh hoặc đường dẫn không còn tồn tại.</p>
      <router-link to="/products" class="btn-sg-warm mt-6 inline-block">Khám phá sản phẩm khác</router-link>
    </div>
  </div>
</template>
