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
</script>

<template>
  <div class="shoe-card" :class="{ 'shoe-card-oos': isOutOfStock }">
    <router-link :to="productLink" class="shoe-media">
      <span v-if="product.category_name || product.category" class="shoe-tag">{{ product.category_name || product.category }}</span>
      <img :src="product.image_url" :alt="product.product_name || product.name">
      <div v-if="isOutOfStock" class="shoe-oos-overlay">
        <span class="shoe-oos-badge"><i class="bi bi-x-circle me-1"></i>Hết hàng</span>
      </div>
      <span class="shoe-shine"></span>
    </router-link>
    <div class="shoe-body">
      <span v-if="brandName" class="shoe-brand">{{ brandName }}</span>
      <router-link :to="productLink" class="shoe-name">{{ displayName }}</router-link>
      <div class="shoe-meta">
        <span v-if="product.material_name" class="sg-chip sg-chip-lime"><i class="bi bi-layers"></i> {{ product.material_name }}</span>
        <span v-if="product.sport" class="sg-chip sg-chip-blue">{{ product.sport }}</span>
      </div>
      <div class="shoe-foot">
        <div class="shoe-price d-flex flex-column">
          <span v-if="Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.price || product.BasePrice)" class="text-danger text-decoration-line-through small" style="font-size:0.8rem; font-weight:normal;">{{ formatCurrency(product.price || product.BasePrice) }}</span>
          <span>{{ formatCurrency(Number(product.sale_price) > 0 ? product.sale_price : (product.price || product.BasePrice)) }}</span>
        </div>
        <router-link v-if="isOutOfStock" :to="productLink" class="shoe-add shoe-add-oos" title="Xem chi tiết">
          <i class="bi bi-eye"></i>
        </router-link>
        <button v-else class="shoe-add" @click.prevent="openVariantModal" aria-label="Thêm vào giỏ">
          <i class="bi bi-plus-lg"></i>
        </button>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <transition name="vm-fade">
      <div v-if="showVariantModal" class="vm-overlay" @click.self="showVariantModal = false">
        <div class="vm-box">
          <div class="vm-head">
            <span class="vm-title">Chọn phân loại hàng</span>
            <button class="vm-close" @click="showVariantModal = false"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="vm-preview">
            <img :src="previewImage" :alt="baseName" class="vm-img">
            <div class="vm-pinfo">
              <div class="vm-pname">{{ baseName }}</div>
              <div class="vm-pprice">{{ formatCurrency(Number(product.sale_price) > 0 ? product.sale_price : (product.price || product.BasePrice)) }}</div>
              <div v-if="selectedColor" class="vm-pattr">Màu: <strong>{{ selectedColor.name }}</strong></div>
              <div v-if="selectedSize" class="vm-pattr">Size: <strong>{{ selectedSize }}</strong></div>
            </div>
          </div>
          <div class="vm-body">
            <div v-if="colorList.length > 0" class="vm-section">
              <div class="vm-label">Màu sắc</div>
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
              <div class="vm-label">Kích thước</div>
              <div class="vm-size-list">
                <button v-for="sz in sizeList" :key="sz" class="vm-size-btn"
                  :class="{ active: selectedSize === sz, oos: isVariantOos(selectedColor?.name, sz) }"
                  :disabled="isVariantOos(selectedColor?.name, sz)" @click="selectedSize = sz">
                  {{ sz }}
                  <span v-if="isVariantOos(selectedColor?.name, sz)" class="vm-oos-tag">Het</span>
                </button>
              </div>
            </div>
            <div class="vm-section">
              <div class="vm-label">Số lượng</div>
              <div class="vm-qty-row">
                <button class="vm-qty-btn" :disabled="hasVariants && !selectedSize" @click="selectedQty = Math.max(1, selectedQty - 1)"><i class="bi bi-dash"></i></button>
                <span class="vm-qty-val">{{ selectedQty }}</span>
                <button class="vm-qty-btn" :disabled="hasVariants && !selectedSize" @click="selectedQty = Math.min(selectedVariantStock || 99, selectedQty + 1)"><i class="bi bi-plus"></i></button>
                <span v-if="selectedVariantStock > 0" class="vm-stock-hint">Còn {{ selectedVariantStock }}</span>
              </div>
            </div>
          </div>
          <div class="vm-footer">
            <button class="vm-btn-add" @click="confirmAddToCart"><i class="bi bi-bag-plus me-2"></i>THÊM VÀO GIỎ HÀNG</button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.shoe-card { display: flex; flex-direction: column; height: 100%; background: #fff; border: 1px solid var(--sg-line); border-radius: 0px; overflow: hidden; transition: border-color .3s ease; }
.shoe-card:hover { border-color: #000; }
.shoe-card-oos { opacity: 0.82; }
.shoe-media { position: relative; display: block; aspect-ratio: 4/3; background: #f9f9f9; overflow: hidden; border-bottom: 1px solid var(--sg-line); }
.shoe-media img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s ease; }
.shoe-card:hover .shoe-media img { transform: scale(1.04); }
.shoe-tag { position: absolute; top: 12px; left: 12px; z-index: 2; background: #000; color: #fff; font-size: .68rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; padding: .28rem .7rem; border-radius: 0px; }
.shoe-oos-overlay { position: absolute; inset: 0; z-index: 3; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.38); backdrop-filter: blur(1.5px); }
.shoe-oos-badge { background: rgba(239,68,68,0.95); color: #fff; font-size: .85rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; padding: .5rem 1.4rem; border-radius: 2px; }
.shoe-shine { display: none; }
.shoe-body { display: flex; flex-direction: column; gap: 10px; padding: 16px 16px 18px; flex: 1; }
.shoe-brand { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--sg-muted); opacity: .7; margin-bottom: -4px; }
.shoe-name { font-weight: 800; color: #000; text-decoration: none; font-size: 1rem; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.6em; transition: color .2s; }
.shoe-name:hover { color: #555; }
.shoe-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.shoe-meta .sg-chip { font-size: .68rem; padding: .16rem .55rem; border-radius: 0px; background: #f9f9f9; color: #000; border: 1px solid var(--sg-line); }
.shoe-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; }
.shoe-price { font-weight: 900; font-size: 1.2rem; color: #000; }
.shoe-add { width: 44px; height: 44px; border-radius: 0px; border: 1px solid #000; background: #000; color: #fff; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; transition: all .3s ease; text-decoration: none; cursor: pointer; }
.shoe-add:hover { background: #fff; color: #000; }
.shoe-add-oos { background: #6b7280 !important; border-color: #6b7280 !important; }
.shoe-add-oos:hover { background: #4b5563 !important; color: #fff !important; border-color: #4b5563 !important; }
@media (max-width: 768px) { .shoe-body { padding: 12px 12px 14px; gap: 8px; } .shoe-name { font-size: 0.95rem; min-height: 2.4em; } .shoe-price { font-size: 1.1rem; } .shoe-add { width: 40px; height: 40px; font-size: 1rem; } }
@media (max-width: 576px) { .shoe-body { padding: 10px 10px 12px; gap: 6px; } .shoe-brand { font-size: 0.68rem; } .shoe-name { font-size: 0.85rem; min-height: 2.4em; } .shoe-price { font-size: 1rem; } .shoe-meta .sg-chip { font-size: 0.6rem; padding: 0.12rem 0.4rem; } .shoe-add { width: 34px; height: 34px; font-size: 0.9rem; } }

/* VARIANT MODAL */
.vm-overlay { position: fixed; inset: 0; z-index: 9000; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; }
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
.vm-pprice { font-weight: 900; font-size: 1.1rem; color: #D4001A; margin-bottom: 6px; }
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
.vm-fade-enter-active .vm-box, .vm-fade-leave-active .vm-box { transition: transform 0.25s; }
.vm-fade-enter-from .vm-box, .vm-fade-leave-to .vm-box { transform: translateY(30px); }
</style>
