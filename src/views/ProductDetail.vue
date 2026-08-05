<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { addToCart, formatCurrency, showMiniCart } from '../stores/cartStore'
import { notify } from '../stores/uiStore'
import { API_BASE_URL } from "../services/apiClient";

const route = useRoute()
const product = ref(null)
/* Chỉ hiển thị biến thể (màu/size/ảnh) thực tế của sản phẩm, KHÔNG tự thêm. */
const variants = ref([])      // [{ id, size, color, hex, sku, stock }]
const colorList = ref([])     // [{ color_label, color_name, hex, image }]
const sizeList = ref([])      // [{ size_name }]
const isLoading = ref(true)
const selSize = ref(null)
const selColor = ref(null)
const activeImage = ref('')
const qty = ref(1)
const API = API_BASE_URL

const fetchData = async () => {
  const id = Number(route.params.id)
  try {
    const rp = await fetch(`${API}/products`)
    const dp = await rp.json()
    const raw = dp.find((p) => p.id === id)
    if (raw) {
      product.value = {
        id_product: raw.id, product_name: raw.name, price: raw.price,
        category_name: raw.category, sport: raw.sport, description: raw.description,
        material_name: raw.material_name,
        brand_name: raw.brand,
        collection_name: raw.collection_name, image_url: raw.image_url,
      }
      variants.value = Array.isArray(raw.variants) ? raw.variants : []
      // Màu thực tế của sản phẩm (kèm ảnh biến thể nếu có)
      colorList.value = (Array.isArray(raw.colors) ? raw.colors : []).map((c) => ({
        color_label: c.name, color_name: c.name, hex: c.hex || '#ccc', image: c.image || null,
      }))
      // Size thực tế của sản phẩm
      sizeList.value = (Array.isArray(raw.sizes) ? raw.sizes : []).map((s) => ({ size_name: String(s) }))
    }
  } catch {
    // Fallback preview khi chưa có backend
    const raw = mockProducts.find((p) => p.id_product === id) || mockProducts[0]
    product.value = raw
    colorList.value = mockColors.map((c) => ({ color_label: c.color_label, color_name: c.color_label, hex: c.hex || '#ccc', image: null }))
    sizeList.value = mockSizes.map((s) => ({ size_name: String(s.size_name) }))
    variants.value = []
  } finally {
    isLoading.value = false
    selColor.value = colorList.value[0] || null
    activeImage.value = selColor.value?.image || product.value?.image_url || ''
    selSize.value = availableSizes.value[0]?.size_name || sizeList.value[0]?.size_name || null
  }
}

/* Danh sách ảnh: ảnh chính + ảnh các biến thể màu (không trùng) */
const galleryImages = computed(() => {
  const imgs = []
  if (product.value?.image_url) imgs.push(product.value.image_url)
  for (const c of colorList.value) if (c.image && !imgs.includes(c.image)) imgs.push(c.image)
  return imgs
})

/* Chỉ những size có thật cho màu đang chọn (dựa trên biến thể). */
const availableSizes = computed(() => {
  if (!variants.value.length || !selColor.value) return sizeList.value
  const ok = variants.value
    .filter((v) => v.color === selColor.value.color_name)
    .map((v) => String(v.size))
  const filtered = sizeList.value.filter((s) => ok.includes(String(s.size_name)))
  return filtered.length ? filtered : sizeList.value
})

const selectColor = (c) => {
  selColor.value = c
  if (c.image) activeImage.value = c.image
  if (!availableSizes.value.find((s) => s.size_name === selSize.value)) {
    selSize.value = availableSizes.value[0]?.size_name || null
  }
}

const attributes = computed(() => {
  if (!product.value) return []
  const p = product.value
  return [
    { icon: 'bi-tag', label: 'Thương hiệu', value: p.brand_name },
    { icon: 'bi-grid', label: 'Danh mục', value: p.category_name },
    { icon: 'bi-activity', label: 'Bộ môn', value: p.sport },
    { icon: 'bi-layers', label: 'Chất liệu', value: p.material_name },
    { icon: 'bi-collection', label: 'Bộ sưu tập', value: p.collection_name },
  ].filter((a) => a.value)
})

/* Kiểm tra hết hàng */
const isOutOfStock = computed(() => {
  if (!variants.value.length) return false
  const total = variants.value.reduce((s, v) => s + (Number(v.stock) || 0), 0)
  return total <= 0
})

const handleAdd = () => {
  if (isOutOfStock.value) { notify({ type: 'error', title: 'Hết hàng', message: 'Sản phẩm này hiện đã hết hàng.' }); return }
  if (!selSize.value) { notify({ type: 'error', message: 'Vui lòng chọn kích cỡ' }); return }
  if (!selColor.value) { notify({ type: 'error', message: 'Vui lòng chọn màu sắc' }); return }
  const r = addToCart({
    product: product.value,
    quantity: qty.value,
    size: { size_name: selSize.value },
    color: { color_label: selColor.value.color_label, color_name: selColor.value.color_name, color_hex: selColor.value.hex },
  })
  if (!r.ok) { notify({ type: 'error', message: r.message }); return }
  showMiniCart()
  notify({ type: 'success', title: 'Đã thêm vào giỏ', message: product.value.product_name })
}

watch(() => route.params.id, fetchData)
onMounted(fetchData)
</script>

<template>
  <div class="detail-page">
    <div class="container-fluid px-4 py-4">
      <div v-if="isLoading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="product" class="row g-5">
        <!-- Gallery -->
        <div class="col-lg-6">
          <div class="detail-media">
            <span v-if="product.sport" class="detail-tag">{{ product.sport }}</span>
            <img :src="activeImage || product.image_url" :alt="product.product_name">
          </div>
          <!-- Thư viện ảnh biến thể (chỉ hiện khi có nhiều ảnh) -->
          <div v-if="galleryImages.length > 1" class="thumb-row">
            <button v-for="(img, i) in galleryImages" :key="i" class="thumb" :class="{ active: activeImage === img }" @click="activeImage = img">
              <img :src="img" alt="variant">
            </button>
          </div>
        </div>
        <!-- Info -->
        <div class="col-lg-6">
          <nav class="detail-breadcrumb"><router-link to="/">Trang chủ</router-link> / <router-link to="/products">Sản phẩm</router-link> / <span>{{ product.product_name }}</span></nav>
          <h1 class="detail-name">{{ product.product_name }}</h1>
          <div class="detail-price">{{ formatCurrency(product.price) }}</div>

          <p class="detail-desc">{{ product.description || 'Sản phẩm giày thể thao nam chính hãng, thiết kế hiện đại, phù hợp mọi hoạt động.' }}</p>

          <!-- Attributes -->
          <div class="attr-grid">
            <div class="attr-item" v-for="a in attributes" :key="a.label">
              <i class="bi" :class="a.icon"></i>
              <div><span class="attr-l">{{ a.label }}</span><strong>{{ a.value }}</strong></div>
            </div>
          </div>

          <!-- Color: chỉ hiện màu sản phẩm thực có -->
          <div class="picker" v-if="colorList.length">
            <label>Màu sắc: <strong>{{ selColor?.color_label }}</strong></label>
            <div class="color-wrap">
              <button v-for="c in colorList" :key="c.color_name" class="color-dot" :class="{ active: selColor?.color_name === c.color_name }" :style="{ background: c.hex }" :title="c.color_label" @click="selectColor(c)">
                <i v-if="selColor?.color_name === c.color_name" class="bi bi-check-lg"></i>
              </button>
            </div>
          </div>

          <!-- Size: chỉ hiện size sản phẩm thực có -->
          <div class="picker" v-if="availableSizes.length">
            <label>Kích cỡ: <strong>{{ selSize }}</strong></label>
            <div class="size-wrap">
              <button v-for="s in availableSizes" :key="s.size_name" class="size-box" :class="{ active: selSize === s.size_name }" @click="selSize = s.size_name">{{ s.size_name }}</button>
            </div>
          </div>
          <p v-else class="text-muted small">Sản phẩm chưa cấu hình biến thể.</p>

          <!-- Qty + add -->
          <div v-if="isOutOfStock" class="buy-row">
            <button class="btn-sg btn-sg-oos flex-grow-1" disabled><i class="bi bi-x-circle me-2"></i>HẾT HÀNG</button>
          </div>
          <div v-else class="buy-row">
            <div class="qty-box">
              <button @click="qty > 1 && qty--"><i class="bi bi-dash"></i></button>
              <span>{{ qty }}</span>
              <button @click="qty++"><i class="bi bi-plus"></i></button>
            </div>
            <button class="btn-sg flex-grow-1" @click="handleAdd"><i class="bi bi-bag-plus me-2"></i>Thêm vào giỏ hàng</button>
          </div>
          <p v-if="isOutOfStock" class="oos-notice"><i class="bi bi-exclamation-triangle-fill me-1"></i>Sản phẩm hiện đã hết hàng. Vui lòng quay lại sau.</p>

          <div class="trust-row">
            <span><i class="bi bi-shield-check"></i> Chính hãng</span>
            <span><i class="bi bi-truck"></i> Giao 24h</span>
            <span><i class="bi bi-arrow-repeat"></i> Đổi trả 14 ngày</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-page { background: var(--sg-canvas); min-height: 100vh; }
.detail-media { position: relative; border-radius: 0px; overflow: hidden; background: #f9f9f9; aspect-ratio: 1/1; box-shadow: none; border: 1px solid var(--sg-line); }
.detail-media img { width: 100%; height: 100%; object-fit: cover; mix-blend-mode: multiply; }
.detail-tag { position: absolute; top: 16px; left: 16px; background: #000; color: #fff; font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; padding: .3rem .8rem; border-radius: 0px; z-index: 2; }
.thumb-row { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
.thumb { width: 74px; height: 74px; border-radius: 0px; overflow: hidden; border: 1px solid var(--sg-line); background: #f9f9f9; padding: 0; transition: .2s; cursor: pointer; }
.thumb.active { border-color: var(--sg-blue); box-shadow: 0 0 0 2px rgba(37,99,235,.25); }
.thumb img { width: 100%; height: 100%; object-fit: cover; mix-blend-mode: multiply; }
.detail-breadcrumb { font-size: .82rem; color: var(--sg-muted); margin-bottom: 10px; }
.detail-breadcrumb a { color: var(--sg-muted); text-decoration: none; }
.detail-breadcrumb a:hover { color: var(--sg-blue); }
.detail-name { font-weight: 900; font-size: 2rem; letter-spacing: -.02em; }
.detail-price { font-weight: 900; font-size: 1.8rem; color: var(--sg-blue-700); margin: 6px 0 16px; }
.detail-desc { color: var(--sg-ink-2); line-height: 1.7; }
.attr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
.attr-item { display: flex; gap: 10px; align-items: center; background: #fff; border: 1px solid var(--sg-line); border-radius: 0px; padding: 10px 12px; }
.attr-item i { font-size: 1.2rem; color: var(--sg-blue); }
.attr-l { display: block; font-size: .72rem; color: var(--sg-muted); }
.attr-item strong { font-size: .9rem; }
.picker { margin: 16px 0; }
.picker label { font-weight: 700; font-size: .9rem; margin-bottom: 8px; display: block; }
.color-wrap { display: flex; gap: 10px; flex-wrap: wrap; }
.color-dot { width: 38px; height: 38px; border-radius: 0px; border: 1px solid #ccc; color: transparent; display: flex; align-items: center; justify-content: center; transition: .2s; cursor: pointer; }
.color-dot:hover { border-color: #0A0A0A; }
.color-dot.active { box-shadow: 0 0 0 2px #0A0A0A; border-color: #0A0A0A; color: #fff; }
.size-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
.size-box { width: 52px; height: 46px; border: 1px solid #ccc; background: #fff; border-radius: 0px; font-weight: 700; transition: .2s; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #0A0A0A; }
.size-box:hover { border-color: #0A0A0A; }
.size-box.active { background: #0A0A0A; color: #fff; border-color: #0A0A0A; }
.buy-row { display: flex; gap: 12px; margin-top: 24px; }
.qty-box { display: flex; align-items: center; border: 1px solid var(--sg-line); border-radius: 0px; overflow: hidden; }
.qty-box button { width: 44px; height: 48px; border: 0; background: #fff; font-size: 1.1rem; }
.qty-box button:hover { background: var(--sg-canvas); }
.qty-box span { width: 44px; text-align: center; font-weight: 800; }
.trust-row { display: flex; gap: 18px; margin-top: 20px; flex-wrap: wrap; }
.trust-row span { font-size: .85rem; color: var(--sg-ink-2); font-weight: 600; }
.trust-row i { color: #16a34a; margin-right: 5px; }
@media (max-width: 576px) { .attr-grid { grid-template-columns: 1fr; } }
</style>

