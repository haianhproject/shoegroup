<script setup>
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { addToCart, formatCurrency, showDrawer } from "../stores/cartStore"
import { notify } from "../stores/uiStore"

const props = defineProps({
  product: { type: Object, required: true },
})

const brandName = computed(() => props.product.brand_name || props.product.brand || "")
const baseName = computed(() => props.product.product_name || props.product.name || "")
const sportName = computed(() => props.product.sport || "")
const displayName = computed(() => (sportName.value ? `${sportName.value} - ${baseName.value}` : baseName.value))

const router = useRouter()
const productLink = computed(() => `/product/${props.product.id_product || props.product.id}`)

const isOutOfStock = computed(() => {
  let ts = props.product.total_stock ?? props.product.stock_quantity ?? props.product.stock
  if (ts === null || ts === undefined || ts === "" || ts === "null") {
    const variants = props.product.variants || []
    ts = variants.length > 0 ? variants.reduce((s, v) => s + (Number(v.stock) || 0), 0) : 0
  }
  const parsedTs = Number(ts)
  if (isNaN(parsedTs)) return true
  return parsedTs <= 0
})

/* Modal chon bien the */
const showVariantModal = ref(false)
const selectedColor = ref(null)
const selectedSize = ref(null)
const selectedQty = ref(1)

const colorList = computed(() => {
  if (props.product.colors && props.product.colors.length > 0) {
    return props.product.colors.map(c => ({
      name: c.name || c.ColorName || "",
      hex: c.hex || c.ColorHex || "",
      image: c.image || c.ImageURL || props.product.image_url || "",
    }))
  }
  const map = {}
  for (const v of (props.product.variants || [])) {
    if (!v.color) continue
    if (!map[v.color]) map[v.color] = { name: v.color, hex: v.hex || "", image: props.product.image_url || "" }
  }
  return Object.values(map)
})

const sizeList = computed(() => {
  const variants = props.product.variants || []
  if (variants.length === 0) return props.product.sizes || []
  if (!selectedColor.value) return [...new Set(variants.map(v => v.size).filter(Boolean))]
  return variants.filter(v => v.color === selectedColor.value.name).map(v => v.size).filter(Boolean)
})

const getVariant = (colorName, sizeName) => {
  return (props.product.variants || []).find(v => v.color === colorName && v.size === sizeName) || null
}

const isVariantOos = (colorName, sizeName) => {
  const v = getVariant(colorName, sizeName)
  return v ? Number(v.stock) <= 0 : false
}

const selectedVariantStock = computed(() => {
  if ((props.product.variants || []).length === 0) {
    const total = props.product.total_stock ?? props.product.stock_quantity ?? props.product.stock
    return Math.max(0, Number(total) || 0)
  }
  if (!selectedColor.value || !selectedSize.value) return 0
  const v = getVariant(selectedColor.value.name, selectedSize.value)
  return v ? Number(v.stock) || 0 : 0
})

const selectedVariantId = computed(() => {
  if (!selectedColor.value || !selectedSize.value) return null
  const v = getVariant(selectedColor.value.name, selectedSize.value)
  return v?.id ?? null
})

const hasVariants = computed(() => (props.product.variants || []).length > 0)
const previewImage = computed(() => selectedColor.value?.image || props.product.image_url || "")

const originalPrice = computed(() => {
  const value = Number(props.product.price ?? props.product.BasePrice ?? 0)
  return Number.isFinite(value) && value > 0 ? value : 0
})
const salePrice = computed(() => {
  const value = Number(props.product.sale_price ?? props.product.SalePrice ?? 0)
  return Number.isFinite(value) && value > 0 ? value : 0
})
const hasDiscount = computed(() =>
  originalPrice.value > 0 && salePrice.value > 0 && salePrice.value < originalPrice.value,
)
const displayPrice = computed(() => hasDiscount.value ? salePrice.value : originalPrice.value)
const discountPercent = computed(() => {
  if (!hasDiscount.value) return 0
  // Không làm tròn về 0: ví dụ 100.000đ -> 99.999đ vẫn phải cho khách biết
  // đây là giá khuyến mãi (0,001%), thay vì mất luôn nhãn giảm giá.
  return ((originalPrice.value - salePrice.value) / originalPrice.value) * 100
})
const discountLabel = computed(() => {
  if (!discountPercent.value) return ''
  const rounded = Math.round(discountPercent.value * 1000) / 1000
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(rounded)
})

function openVariantModal() {
  if (isOutOfStock.value) {
    notify({ type: "warning", title: "Sản phẩm hết hàng", message: "Xin lỗi! Sản phẩm này hiện không còn hàng.", duration: 4000 })
    return
  }
  selectedColor.value = colorList.value.length > 0 ? colorList.value[0] : null
  selectedSize.value = null
  selectedQty.value = 1
  showVariantModal.value = true
}

watch(selectedColor, () => { selectedSize.value = null })
watch(selectedSize, () => { selectedQty.value = 1 })

const galleryImages = computed(() => {
  const imgs = []
  if (props.product.image_url) imgs.push(props.product.image_url)
  colorList.value.forEach(c => { if (c.image && !imgs.includes(c.image)) imgs.push(c.image) })
  // thêm ảnh variant nếu có
  ;(props.product.variants||[]).slice(0,3).forEach(v=>{ if(v.image && !imgs.includes(v.image)) imgs.push(v.image) })
  return [...new Set(imgs)].slice(0,5)
})
const galleryIndex = computed(() => {
  const idx = galleryImages.value.indexOf(previewImage.value)
  return idx >=0 ? idx : 0
})
function galleryPrev() {
  const imgs = galleryImages.value
  if (!imgs.length) return
  const idx = galleryIndex.value
  const prev = (idx - 1 + imgs.length) % imgs.length
  const col = colorList.value.find(c=>c.image===imgs[prev])
  if (col) selectedColor.value = col
}
function galleryNext() {
  const imgs = galleryImages.value
  if (!imgs.length) return
  const idx = galleryIndex.value
  const next = (idx + 1) % imgs.length
  const col = colorList.value.find(c=>c.image===imgs[next])
  if (col) selectedColor.value = col
}
function selectThumb(img) {
  const col = colorList.value.find(c=>c.image===img)
  if (col) selectedColor.value = col
}

const stockStatus = computed(() => {
  if (isOutOfStock.value) return { text: 'Hết hàng', cls: 'oos' }
  const stock = selectedVariantStock.value
  if (stock > 0 && stock <= 5) return { text: 'Sắp hết hàng', cls: 'low' }
  if (stock > 5) return { text: 'Còn hàng', cls: 'in' }
  return { text: 'Còn hàng', cls: 'in' }
})

function confirmAddToCart() {
  const variants = props.product.variants || []
  const hasVariants = variants.length > 0
  if (hasVariants) {
    if (!selectedSize.value) { notify({ type: "warning", message: "Vui lòng chọn kích thước." }); return }
    if (isVariantOos(selectedColor.value?.name, selectedSize.value)) { notify({ type: "warning", message: "Biến thể này đã hết hàng." }); return }
  }
  const colorObj = selectedColor.value
    ? { color_label: selectedColor.value.name, color_name: selectedColor.value.name, color_hex: selectedColor.value.hex || "", image: selectedColor.value.image || "" }
    : { color_label: "Tiêu chuẩn", color_name: "Tieu chuan" }
  const sizeObj = { size_name: selectedSize.value || props.product.default_size || "" }
  let stockQty = selectedVariantStock.value
  if (stockQty === 0 && !hasVariants) {
    const ts = props.product.total_stock ?? props.product.stock_quantity ?? props.product.stock
    stockQty = isNaN(Number(ts)) ? 0 : Number(ts)
  }
  const result = addToCart({
    product: props.product, quantity: selectedQty.value,
    size: sizeObj, color: colorObj,
    variantId: selectedVariantId.value,
    stockQuantity: stockQty,
  })
  if (!result.ok) { notify({ type: "warning", message: result.message }); return }
  showVariantModal.value = false
  showDrawer()
  notify({ type: "success", title: "Đã thêm vào giỏ", message: props.product.product_name || props.product.name, duration: 2200 })
}
function handleBuyNow() {
  const variants = props.product.variants || []
  const hasVariants = variants.length > 0
  if (hasVariants) {
    if (!selectedSize.value) { notify({ type: "warning", message: "Vui lòng chọn kích thước." }); return }
    if (isVariantOos(selectedColor.value?.name, selectedSize.value)) { notify({ type: "warning", message: "Biến thể này đã hết hàng." }); return }
  }
  const colorObj = selectedColor.value
    ? { color_label: selectedColor.value.name, color_name: selectedColor.value.name, color_hex: selectedColor.value.hex || "", image: selectedColor.value.image || "" }
    : { color_label: "Tiêu chuẩn", color_name: "Tieu chuan" }
  const sizeObj = { size_name: selectedSize.value || props.product.default_size || "" }
  let stockQty = selectedVariantStock.value
  if (stockQty === 0 && !hasVariants) {
    const ts = props.product.total_stock ?? props.product.stock_quantity ?? props.product.stock
    stockQty = isNaN(Number(ts)) ? 0 : Number(ts)
  }
  const result = addToCart({
    product: props.product, quantity: selectedQty.value,
    size: sizeObj, color: colorObj,
    variantId: selectedVariantId.value,
    stockQuantity: stockQty,
  })
  if (!result.ok) { notify({ type: "warning", message: result.message }); return }
  showVariantModal.value = false
  router.push('/checkout')
  notify({ type: "success", title: "Mua ngay", message: props.product.product_name || props.product.name, duration: 2200 })
}
</script>

<template>
  <div class="shoe-card" :class="{ 'shoe-card-oos': isOutOfStock }">
    <router-link :to="productLink" class="shoe-media">
      <span v-if="hasDiscount" class="discount-badge">-{{ discountLabel }}%</span>
      <span v-else-if="product.category_name || product.category" class="shoe-tag">{{ product.category_name || product.category }}</span>
      <img :src="product.image_url" :alt="product.product_name || product.name">
      <div v-if="isOutOfStock" class="shoe-oos-overlay">
        <span class="shoe-oos-badge"><i class="bi bi-x-circle me-1"></i>Hết hàng</span>
      </div>
      <!-- Hover actions: mắt xem nhanh (hover mới hiện chữ) + Tùy chọn vào chi tiết -->
      <div v-if="!isOutOfStock" class="hover-actions">
        <button class="quick-view-btn" @click.prevent.stop="openVariantModal" aria-label="Xem nhanh"><i class="bi bi-eye"></i><span class="qv-text">Xem nhanh</span></button>
        <router-link :to="productLink" class="option-btn" @click.stop>Tùy chọn</router-link>
      </div>
      <span class="shoe-shine"></span>
    </router-link>
    <div class="shoe-body">
      <span v-if="brandName" class="shoe-brand">{{ brandName }}</span>
      <router-link :to="productLink" class="shoe-name">{{ displayName }}</router-link>
      <div class="shoe-price d-flex flex-column">
        <span v-if="hasDiscount" class="price-sale">{{ formatCurrency(displayPrice) }}</span>
        <span v-else class="price-regular">{{ formatCurrency(displayPrice) }}</span>
        <span v-if="hasDiscount" class="price-original">{{ formatCurrency(originalPrice) }}</span>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <transition name="vm-fade">
      <div v-if="showVariantModal" class="vm-overlay" @click.self="showVariantModal = false">
        <div class="vm-box-quick">
          <button class="vm-close-quick" @click="showVariantModal = false"><i class="bi bi-x-lg"></i></button>
          <div class="vm-quick-grid">
            <!-- Gallery -->
            <div class="vm-gallery">
              <div class="vm-main-wrap">
                <img :src="previewImage" :alt="baseName" class="vm-main-img">
                <button v-if="galleryImages.length>1" class="vm-nav vm-nav-prev" @click="galleryPrev"><i class="bi bi-chevron-left"></i></button>
                <button v-if="galleryImages.length>1" class="vm-nav vm-nav-next" @click="galleryNext"><i class="bi bi-chevron-right"></i></button>
              </div>
              <div class="vm-thumbs">
                <button v-for="img in galleryImages" :key="img" class="vm-thumb" :class="{ active: previewImage===img }" @click="selectThumb(img)">
                  <img :src="img" :alt="baseName">
                </button>
              </div>
            </div>
            <!-- Details -->
            <div class="vm-details">
              <h2 class="vm-title-quick">{{ displayName }}</h2>
              <div class="vm-brand-line">Thương hiệu: <strong>{{ brandName || 'ShoeGroup' }}</strong> · Loại: <strong>{{ product.category_name || product.sport || 'Giày' }}</strong></div>
              <div class="vm-stock-line">Tồn kho: <strong>{{ product.total_stock ?? product.stock_quantity ?? product.stock ?? selectedVariantStock ?? '—' }}</strong> <span v-if="product.material_name">· Chất liệu: {{ product.material_name }}</span></div>
              <div class="vm-price-row">
                <span class="vm-price-now">{{ formatCurrency(displayPrice) }}</span>
                <span v-if="hasDiscount" class="vm-price-old">{{ formatCurrency(originalPrice) }}</span>
                <span v-if="hasDiscount" class="vm-discount-tag">-{{ discountLabel }}%</span>
              </div>

              <div v-if="colorList.length > 0" class="vm-section">
                <div class="vm-label">Màu sắc<span v-if="selectedColor">: {{ selectedColor.name }}</span></div>
                <div class="vm-color-list">
                  <button v-for="c in colorList" :key="c.name" class="vm-color-btn" :class="{ active: selectedColor?.name === c.name }" @click="selectedColor = c" :title="c.name">
                    <img v-if="c.image" :src="c.image" :alt="c.name" class="vm-color-img">
                    <span v-else-if="c.hex" class="vm-color-swatch" :style="{ background: c.hex }"></span>
                    <span class="vm-color-name">{{ c.name }}</span>
                    <i class="bi bi-check-lg vm-color-check"></i>
                  </button>
                </div>
              </div>

              <div v-if="sizeList.length > 0" class="vm-section">
                <div class="vm-label">Kích thước<span v-if="selectedSize"> : {{ selectedSize }}</span></div>
                <div class="vm-size-list">
                  <button v-for="sz in sizeList" :key="sz" class="vm-size-btn"
                    :class="{ active: selectedSize === sz, oos: isVariantOos(selectedColor?.name, sz) }"
                    :disabled="isVariantOos(selectedColor?.name, sz)" @click="selectedSize = sz">
                    {{ sz }}
                  </button>
                </div>
                <a href="#" class="vm-size-guide" @click.prevent><i class="bi bi-rulers me-1"></i>Hướng dẫn chọn size</a>
              </div>

              <div class="vm-section">
                <div class="vm-label">Số lượng</div>
                <div class="vm-qty-row">
                  <div class="vm-qty-box">
                    <button class="vm-qty-btn" :disabled="hasVariants && !selectedSize" @click="selectedQty = Math.max(1, selectedQty - 1)"><i class="bi bi-dash"></i></button>
                    <span class="vm-qty-val">{{ selectedQty }}</span>
                    <button class="vm-qty-btn" :disabled="hasVariants && !selectedSize" @click="selectedQty = Math.min(selectedVariantStock || 99, selectedQty + 1)"><i class="bi bi-plus"></i></button>
                  </div>
                  <span class="vm-stock-status" :class="stockStatus.cls">{{ stockStatus.text }}</span>
                </div>
              </div>

              <div class="vm-actions">
                <button class="vm-btn-buy" @click="handleBuyNow"><i class="bi bi-bag me-2"></i>MUA NGAY</button>
                <button class="vm-btn-add" @click="confirmAddToCart"><i class="bi bi-cart-plus me-2"></i>THÊM VÀO GIỎ</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.shoe-card { display: flex; flex-direction: column; height: 100%; min-width: 0; background: #fff; border: 1px solid var(--sg-line); border-radius: 14px; overflow: hidden; transition: border-color .3s ease, box-shadow .3s ease, transform .3s ease; }
.shoe-card:hover { border-color: #0A0A0A; box-shadow: 0 4px 16px rgba(0,0,0,.06); }
.shoe-card-oos { opacity: 0.82; }
.shoe-media { position: relative; display: block; aspect-ratio: 1 / 1; background: #f3f3f3; overflow: hidden; border-bottom: 1px solid var(--sg-line); padding: 0; border-radius: 16px 16px 0 0; }
.shoe-media img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s ease; }
.shoe-card:hover .shoe-media img { transform: scale(1.04); }
.shoe-tag { position: absolute; top: 12px; left: 12px; z-index: 2; background: #0A0A0A; color: #fff; font-size: .68rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; padding: .28rem .7rem; border-radius: 6px; }
.discount-badge { position: absolute; top: 12px; left: 12px; z-index: 2; background: #e53935; color: #fff; font-size: .72rem; font-weight: 800; padding: 4px 8px; border-radius: 6px; line-height: 1; }
.hover-actions { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity .18s ease; z-index: 3; }
.shoe-card:hover .hover-actions { opacity: 1; pointer-events: auto; }
.quick-view-btn { position: absolute; top: 12px; right: 12px; width: 34px; height: 34px; border-radius: 50%; background: #fff; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.12); color: #111; transition: all .22s ease; overflow: hidden; white-space: nowrap; }
.quick-view-btn i { font-size: .95rem; flex-shrink: 0; }
.quick-view-btn .qv-text { display: none; font-size: .76rem; font-weight: 700; margin-left: 5px; }
.quick-view-btn:hover { width: auto; padding: 0 12px; border-radius: 999px; background: #0A0A0A; color: #fff; border-color: #0A0A0A; gap: 5px; }
.quick-view-btn:hover .qv-text { display: inline; }
.option-btn { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); width: 84%; max-width: 180px; background: #0A0A0A; color: #fff; border: 1px solid #0A0A0A; border-radius: 999px; padding: 9px 14px; font-size: .80rem; font-weight: 800; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,.15); text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; opacity: 0; transform: translateX(-50%) translateY(6px); transition: all .22s ease; pointer-events: none; }
.shoe-card:hover .option-btn { opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto; }
.price-sale { font-weight: 900; font-size: 1rem; color: #e53935; }
.price-original { font-size: .74rem; color: #888; text-decoration: line-through; font-weight: 400; }
.price-regular { font-weight: 900; font-size: 1rem; color: #0A0A0A; }
.shoe-oos-overlay { position: absolute; inset: 0; z-index: 3; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.38); backdrop-filter: blur(1.5px); }
.shoe-oos-badge { background: rgba(239,68,68,0.95); color: #fff; font-size: .85rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; padding: .5rem 1.4rem; border-radius: 2px; }
.shoe-shine { display: none; }
.shoe-body { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px 14px; flex: 1; min-height: 124px; }
.shoe-brand { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--sg-muted); opacity: .7; margin-bottom: -2px; }
.shoe-name { font-weight: 800; color: #000; text-decoration: none; font-size: .92rem; line-height: 1.32; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.4em; transition: color .2s; }
.shoe-name:hover { color: #555; }
.shoe-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.shoe-meta .sg-chip { font-size: .68rem; padding: .16rem .55rem; border-radius: 999px; background: #f9f9f9; color: #000; border: 1px solid var(--sg-line); }
.shoe-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; }
.shoe-price { margin-top: auto; line-height: 1.2; }
.shoe-add { width: 38px; height: 38px; border-radius: 10px; border: 1px solid #0A0A0A; background: #0A0A0A; color: #fff; font-size: 1rem; display: flex; align-items: center; justify-content: center; transition: all .3s ease; text-decoration: none; cursor: pointer; }
.shoe-add:hover { background: #fff; color: #0A0A0A; }
.shoe-add-oos { background: #6b7280 !important; border-color: #6b7280 !important; }
.shoe-add-oos:hover { background: #4b5563 !important; color: #fff !important; border-color: #4b5563 !important; }
@media (max-width: 768px) { .shoe-body { padding: 12px 12px 14px; gap: 8px; min-height: 116px; } .shoe-name { font-size: 0.95rem; min-height: 2.4em; } .shoe-price { font-size: 1.1rem; } .shoe-add { width: 40px; height: 40px; font-size: 1rem; } }
@media (max-width: 576px) { .shoe-body { padding: 10px 10px 12px; gap: 6px; } .shoe-brand { font-size: 0.68rem; } .shoe-name { font-size: 0.85rem; min-height: 2.4em; } .shoe-price { font-size: 1rem; } .shoe-meta .sg-chip { font-size: 0.6rem; padding: 0.12rem 0.4rem; } .shoe-add { width: 34px; height: 34px; font-size: 0.9rem; } }

/* VARIANT MODAL */
.vm-overlay { position: fixed; inset: 0; z-index: 9000; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; overflow-y: auto; padding: 16px; }
@media (min-width: 600px) { .vm-overlay { align-items: center; } }
.vm-box { background: #fff; border-radius: 20px 20px 0 0; width: 100%; max-width: 520px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 -8px 40px rgba(0,0,0,.18); }
@media (min-width: 600px) { .vm-box { border-radius: 16px; max-height: 85vh; } }
.vm-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 14px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
.vm-title { font-weight: 700; font-size: 1rem; color: #111; }
.vm-close { width: 32px; height: 32px; border: none; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.85rem; color: #555; transition: background .2s; }
.vm-close:hover { background: #e0e0e0; }
.vm-preview { display: flex; gap: 14px; padding: 16px 20px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
.vm-img { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e5e5; flex-shrink: 0; transition: all 0.3s; }
.vm-pinfo { flex: 1; min-width: 0; }
.vm-pname { font-weight: 700; font-size: 0.9rem; color: #111; line-height: 1.3; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.vm-pprice { font-weight: 900; font-size: 1.1rem; color: #0A0A0A; margin-bottom: 6px; }
.vm-pattr { font-size: 0.8rem; color: #666; }
.vm-body { flex: 1; overflow-y: auto; }
.vm-section { padding: 14px 20px; border-bottom: 1px solid #f5f5f5; }
.vm-label { font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin-bottom: 10px; }
.vm-color-list { display: flex; flex-wrap: wrap; gap: 8px; }
.vm-color-btn { display: flex; align-items: center; gap: 7px; border: 1.5px solid #e5e5e5; border-radius: 8px; padding: 6px 12px 6px 6px; cursor: pointer; background: #fff; transition: all 0.18s; position: relative; }
.vm-color-btn:hover { border-color: #aaa; }
.vm-color-btn.active { border-color: #111; border-width: 2px; background: #fafafa; }
.vm-color-img { width: 32px; height: 32px; object-fit: cover; border-radius: 5px; border: 1px solid #e5e5e5; }
.vm-color-swatch { width: 24px; height: 24px; border-radius: 50%; border: 1px solid rgba(0,0,0,.12); }
.vm-color-name { font-size: 0.82rem; font-weight: 600; color: #111; }
.vm-color-check { display: none; position: absolute; right: 6px; font-size: 0.75rem; color: #111; }
.vm-color-btn.active .vm-color-check { display: block; }
.vm-size-list { display: flex; flex-wrap: wrap; gap: 8px; }
.vm-size-btn { min-width: 52px; height: 40px; padding: 0 12px; border: 1.5px solid #e0e0e0; border-radius: 8px; background: #fff; cursor: pointer; font-weight: 600; font-size: 0.88rem; color: #111; transition: all 0.18s; display: flex; align-items: center; justify-content: center; gap: 4px; }
.vm-size-btn:hover:not(.oos) { border-color: #111; }
.vm-size-btn.active { border-color: #111; border-width: 2px; background: #111; color: #fff; }
.vm-size-btn.oos { color: #bbb; border-color: #e5e5e5; cursor: not-allowed; background: #fafafa; }
.vm-oos-tag { font-size: 0.6rem; color: #e74c3c; font-weight: 700; }
.vm-qty-row { display: flex; align-items: center; gap: 12px; }
.vm-qty-btn { width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid #e0e0e0; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1rem; color: #111; transition: all 0.15s; }
.vm-qty-btn:hover { border-color: #111; background: #f5f5f5; }
.vm-qty-val { font-size: 1.1rem; font-weight: 700; min-width: 28px; text-align: center; }
.vm-stock-hint { font-size: 0.78rem; color: #999; }
.vm-footer { padding: 16px 20px; border-top: 1px solid #f0f0f0; flex-shrink: 0; }
.vm-btn-add { width: 100%; height: 50px; background: #111; color: #fff; border: none; border-radius: 10px; font-weight: 700; font-size: 0.95rem; letter-spacing: 0.06em; cursor: pointer; transition: background 0.2s; }
.vm-btn-add:hover { background: #333; }
.vm-fade-enter-active, .vm-fade-leave-active { transition: opacity 0.25s; }
.vm-fade-enter-from, .vm-fade-leave-to { opacity: 0; }
.vm-fade-enter-active .vm-box, .vm-fade-leave-active .vm-box,
.vm-fade-enter-active .vm-box-quick, .vm-fade-leave-active .vm-box-quick { transition: transform 0.25s; }
.vm-fade-enter-from .vm-box, .vm-fade-leave-to .vm-box,
.vm-fade-enter-from .vm-box-quick, .vm-fade-leave-to .vm-box-quick { transform: translateY(30px); }

/* ——— Quick view như mẫu JapanSport — gọn, không dài ——— */
.vm-box-quick { background: #fff; border-radius: 16px; width: 100%; max-width: 820px; max-height: 72vh; display: flex; flex-direction: column; overflow: hidden; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,.22); }
.vm-close-quick { position: absolute; top: 10px; right: 10px; width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid #e5e7eb; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 5; color: #111; }
.vm-quick-grid { display: grid; grid-template-columns: 0.98fr 1.02fr; max-height: 72vh; overflow: hidden; }
.vm-gallery { background: #f3f5f7; padding: 10px; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }
.vm-main-wrap { position: relative; background: #eef1f4; border-radius: 12px; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; max-height: 340px; flex-shrink: 0; }
.vm-main-img { width: 84%; height: 84%; object-fit: contain; }
.vm-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 30px; height: 30px; border-radius: 50%; border: 1px solid #e5e7eb; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.12); color: #333; font-size: .85rem; }
.vm-nav-prev { left: 8px; }
.vm-nav-next { right: 8px; }
.vm-thumbs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
.vm-thumb { width: 52px; height: 52px; border-radius: 8px; border: 1.5px solid #e5e7eb; overflow: hidden; background: #fff; flex-shrink: 0; cursor: pointer; padding: 2px; }
.vm-thumb.active { border-color: #0A0A0A; }
.vm-thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
.vm-details { padding: 14px 18px 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 7px; max-height: 72vh; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
.vm-details .vm-section { padding: 5px 0; border: none; margin: 0; }
.vm-title-quick { font-weight: 800; font-size: 1.18rem; line-height: 1.32; color: #111; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.vm-brand-line { font-size: .82rem; color: #666; line-height: 1.4; }
.vm-stock-line { font-size: .82rem; color: #555; line-height: 1.4; }
.vm-price-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0; }
.vm-price-now { font-weight: 900; font-size: 1.28rem; color: #e53935; }
.vm-price-old { font-size: .9rem; color: #888; text-decoration: line-through; }
.vm-discount-tag { background: #e53935; color: #fff; font-size: .72rem; font-weight: 800; padding: 3px 6px; border-radius: 4px; }
.vm-size-guide { font-size: .8rem; color: #555; text-decoration: underline; display: inline-flex; align-items: center; margin-top: 8px; cursor: pointer; }
.vm-qty-box { display: inline-flex; align-items: center; border: 1px solid #e5e7eb; border-radius: 999px; overflow: hidden; background: #fff; }
.vm-stock-status { font-size: .85rem; font-weight: 600; margin-left: 12px; }
.vm-stock-status.low { color: #d97706; }
.vm-stock-status.in { color: #16a34a; }
.vm-stock-status.oos { color: #e53935; }
.vm-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
.vm-btn-buy { height: 48px; border: 1.5px solid #0A0A0A; background: #fff; color: #0A0A0A; border-radius: 999px; font-weight: 800; font-size: .9rem; cursor: pointer; }
.vm-btn-buy:hover { background: #f9fafb; }
.vm-btn-add { height: 48px; border: 1.5px solid #0A0A0A; background: #0A0A0A; color: #fff; border-radius: 999px; font-weight: 800; font-size: .9rem; cursor: pointer; }
.vm-btn-add:hover { background: #000; }
@media (max-width: 768px) {
  .vm-box-quick { max-width: 96vw; max-height: 92vh; }
  .vm-quick-grid { grid-template-columns: 1fr; overflow-y: auto; }
  .vm-gallery { padding: 12px; }
  .vm-main-wrap { aspect-ratio: 1.15; }
  .vm-details { padding: 16px; }
  .vm-actions { grid-template-columns: 1fr; }
}
</style>
