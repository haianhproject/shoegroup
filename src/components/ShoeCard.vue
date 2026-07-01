<script setup>
import { addToCart, formatCurrency, showMiniCart } from '../stores/cartStore'

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
})

const handleAddToCart = () => {
  const result = addToCart({
    product: props.product,
    quantity: 1,
    size: { size_name: '42' },
    color: { color_label: 'Mặc định' }
  })
  if (!result.ok) {
    alert(result.message)
    return
  }
  showMiniCart()
}
</script>

<template>
  <div class="card h-100 border-0 rounded-4 shadow-sm shadow-hover d-flex flex-column overflow-hidden">
    <router-link
      :to="`/product/${product.id_product || product.id}`"
      class="ratio ratio-4x3 bg-light d-block text-decoration-none"
    >
      <img
        :src="product.image_url"
        class="object-fit-cover w-100 h-100 mix-blend-multiply transition-all card-img-top-hover"
        :alt="product.product_name || product.name"
      >
    </router-link>
    <div class="card-body d-flex flex-column p-4">
      <p class="text-secondary small fw-bold text-uppercase tracking-wider mb-1">
        {{ product.category_name || product.category || 'Thương hiệu' }}
      </p>
      <router-link
        :to="`/product/${product.id_product || product.id}`"
        class="text-decoration-none text-dark"
      >
        <h5 class="card-title fw-bold text-truncate mb-2">
          {{ product.product_name || product.name }}
        </h5>
      </router-link>
      <p class="card-text fw-black fs-4 text-dark mb-4">
        {{ formatCurrency(product.price || product.BasePrice) }}
      </p>
      <button
        class="btn w-100 fw-bold py-2 mt-auto rounded-3 btn-dark"
        @click="handleAddToCart"
      >
        THÊM VÀO GIỎ
      </button>
    </div>
  </div>
</template>

<style scoped>
.object-fit-cover { object-fit: cover; }
.mix-blend-multiply { mix-blend-mode: multiply; }
.card-img-top-hover:hover { transform: scale(1.05); }
.fw-black { font-weight: 900; }
</style>