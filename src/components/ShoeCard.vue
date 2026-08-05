<script setup>
import { computed } from 'vue'
import { addToCart, formatCurrency, showMiniCart } from '../stores/cartStore'
import { notify } from '../stores/uiStore'

const props = defineProps({
  product: { type: Object, required: true },
})

const brandName = computed(() => props.product.brand_name || props.product.brand || '')
const baseName = computed(() => props.product.product_name || props.product.name || '')
const sportName = computed(() => props.product.sport || '')
const displayName = computed(() => (sportName.value ? `${sportName.value} - ${baseName.value}` : baseName.value))

/* Kiểm tra hết hàng: tổng stock = 0 hoặc không có biến thể */
const isOutOfStock = computed(() => {
  const variants = props.product.variants || []
  if (!variants.length) return false // chưa cấu hình biến thể thì không khóa
  const total = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0)
  return total <= 0
})

const handleAddToCart = () => {
  if (isOutOfStock.value) { notify({ type: 'error', title: 'Hết hàng', message: 'Sản phẩm này hiện đã hết hàng.' }); return }
  const result = addToCart({
    product: props.product,
    quantity: 1,
    size: { size_name: props.product.default_size || '42' },
    color: {
      color_label: props.product.color_name || props.product.color || 'Tiêu chuẩn',
      color_name: props.product.color_name || props.product.color || 'Tiêu chuẩn',
    },
  })
  if (!result.ok) { notify({ type: 'error', message: result.message }); return }
  showMiniCart()
  notify({ type: 'success', title: 'Đã thêm vào giỏ', message: props.product.product_name || props.product.name, duration: 2200 })
}
</script>

<template>
  <div class="shoe-card">
    <router-link :to="`/product/${product.id_product || product.id}`" class="shoe-media">
      <span v-if="product.category_name || product.category" class="shoe-tag">{{ product.category_name || product.category }}</span>
      <img :src="product.image_url" :alt="product.product_name || product.name">
      <span class="shoe-shine"></span>
    </router-link>
    <div class="shoe-body">
      <span v-if="brandName" class="shoe-brand">{{ brandName }}</span>
      <router-link :to="`/product/${product.id_product || product.id}`" class="shoe-name">
        {{ displayName }}
      </router-link>
      <div class="shoe-meta">
        <span v-if="product.material_name" class="sg-chip sg-chip-lime"><i class="bi bi-layers"></i> {{ product.material_name }}</span>
        <span v-if="product.sport" class="sg-chip sg-chip-blue">{{ product.sport }}</span>
      </div>
      <div class="shoe-foot">
        <div class="shoe-price d-flex flex-column">
          <span v-if="Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.price || product.BasePrice)" class="text-danger text-decoration-line-through small" style="font-size:0.8rem; font-weight:normal;">{{ formatCurrency(product.price || product.BasePrice) }}</span>
          <span>{{ formatCurrency(Number(product.sale_price) > 0 ? product.sale_price : (product.price || product.BasePrice)) }}</span>
        </div>
        <button v-if="isOutOfStock" class="shoe-add shoe-add-oos" disabled aria-label="Hết hàng" title="Sản phẩm đã hết hàng">
          <i class="bi bi-x-lg"></i>
        </button>
        <button v-else class="shoe-add" @click="handleAddToCart" aria-label="Thêm vào giỏ">
          <i class="bi bi-plus-lg"></i>
        </button>
      </div>
      <span v-if="isOutOfStock" class="shoe-oos-tag">Hết hàng</span>
    </div>
  </div>
</template>

<style scoped>
.shoe-card { display: flex; flex-direction: column; height: 100%; background: #fff; border: 1px solid var(--sg-line); border-radius: 0px; overflow: hidden; transition: border-color .3s ease; }
.shoe-card:hover { border-color: #000; }
.shoe-media { position: relative; display: block; aspect-ratio: 4/3; background: #f9f9f9; overflow: hidden; border-bottom: 1px solid var(--sg-line); }
.shoe-media img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s ease; }
.shoe-card:hover .shoe-media img { transform: scale(1.04); }
.shoe-tag { position: absolute; top: 12px; left: 12px; z-index: 2; background: #000; color: #fff; font-size: .68rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; padding: .28rem .7rem; border-radius: 0px; }
.shoe-shine { display: none; }
.shoe-body { display: flex; flex-direction: column; gap: 10px; padding: 16px 16px 18px; flex: 1; }
.shoe-brand { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--sg-muted); opacity: .7; margin-bottom: -4px; }
.shoe-name { font-weight: 800; color: #000; text-decoration: none; font-size: 1rem; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.6em; transition: color .2s; }
.shoe-name:hover { color: #555; }
.shoe-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.shoe-meta .sg-chip { font-size: .68rem; padding: .16rem .55rem; border-radius: 0px; background: #f9f9f9; color: #000; border: 1px solid var(--sg-line); }
.shoe-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; }
.shoe-price { font-weight: 900; font-size: 1.2rem; color: #000; }
.shoe-add { width: 44px; height: 44px; border-radius: 0px; border: 1px solid #000; background: #000; color: #fff; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; transition: all .3s ease; }
.shoe-add:hover { background: #fff; color: #000; }
.shoe-add-oos { background: #999 !important; border-color: #999 !important; cursor: not-allowed !important; opacity: .6; }
.shoe-add-oos:hover { background: #999 !important; color: #fff !important; }
.shoe-oos-tag { display: block; text-align: center; background: #ef4444; color: #fff; font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; padding: .3rem .6rem; margin-top: 8px; }
</style>
