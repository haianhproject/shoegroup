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

const handleAddToCart = () => {
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
        <span v-if="product.sport" class="sg-chip sg-chip-blue"><i class="bi bi-lightning"></i> {{ product.sport }}</span>
      </div>
      <div class="shoe-foot">
        <div class="shoe-price">{{ formatCurrency(product.price || product.BasePrice) }}</div>
        <button class="shoe-add" @click="handleAddToCart" aria-label="Thêm vào giỏ">
          <i class="bi bi-plus-lg"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shoe-card { display: flex; flex-direction: column; height: 100%; background: #fff; border: 1px solid var(--sg-line); border-radius: 20px; overflow: hidden; transition: transform .3s cubic-bezier(.25,.8,.25,1), box-shadow .3s; }
.shoe-card:hover { transform: translateY(-8px); box-shadow: var(--sg-shadow-lg); border-color: transparent; }
.shoe-media { position: relative; display: block; aspect-ratio: 4/3; background: linear-gradient(160deg,#eef2ff 0%,#f5f7fb 100%); overflow: hidden; }
.shoe-media img { width: 100%; height: 100%; object-fit: cover; mix-blend-mode: multiply; transition: transform .5s ease; }
.shoe-card:hover .shoe-media img { transform: scale(1.09) rotate(-3deg); }
.shoe-tag { position: absolute; top: 12px; left: 12px; z-index: 2; background: rgba(15,23,42,.85); color: #fff; font-size: .68rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; padding: .28rem .7rem; border-radius: 999px; }
.shoe-shine { position: absolute; top: 0; left: -60%; width: 40%; height: 100%; background: linear-gradient(120deg, transparent, rgba(255,255,255,.55), transparent); transform: skewX(-20deg); transition: left .6s ease; }
.shoe-card:hover .shoe-shine { left: 120%; }
.shoe-body { display: flex; flex-direction: column; gap: 10px; padding: 16px 16px 18px; flex: 1; }
.shoe-brand { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--sg-muted); opacity: .7; margin-bottom: -4px; }
.shoe-name { font-weight: 800; color: var(--sg-ink); text-decoration: none; font-size: 1rem; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.6em; transition: color .2s; }
.shoe-name:hover { color: var(--sg-blue); }
.shoe-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.shoe-meta .sg-chip { font-size: .68rem; padding: .16rem .55rem; }
.shoe-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; }
.shoe-price { font-weight: 900; font-size: 1.2rem; color: var(--sg-ink); }
.shoe-add { width: 44px; height: 44px; border-radius: 14px; border: 0; background: var(--sg-grad-primary); color: #fff; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 18px rgba(37,99,235,.32); transition: transform .2s, box-shadow .2s; }
.shoe-add:hover { transform: translateY(-3px) rotate(90deg); box-shadow: 0 14px 26px rgba(37,99,235,.45); }
</style>
