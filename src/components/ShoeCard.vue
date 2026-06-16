<script setup>
import { computed } from 'vue'
import { brands, product_details } from '../data/mockData'
import { addToCart, formatCurrency, showMiniCart } from '../stores/cartStore'

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
})

const brand = computed(() => {
  return brands.find((b) => b.id_brand === props.product.id_brand)
})

const defaultDetail = computed(() => {
  return product_details.find(
    (detail) =>
      detail.id_product === props.product.id_product &&
      detail.stock_quantity > 0
  )
})

const isOutOfStock = computed(() => {
  return !defaultDetail.value
})

const handleAddToCart = () => {
  const result = addToCart({
    productId: props.product.id_product,
    detailId: defaultDetail.value?.id_product_detail,
    quantity: 1
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
      :to="`/product/${product.id_product}`"
      class="ratio ratio-4x3 bg-light d-block text-decoration-none"
    >
      <img
        :src="product.image_url"
        class="object-fit-cover w-100 h-100 mix-blend-multiply transition-all card-img-top-hover"
        :alt="product.product_name"
      >
    </router-link>

    <div class="card-body d-flex flex-column p-4">
      <p class="text-secondary small fw-bold text-uppercase tracking-wider mb-1">
        {{ brand?.brand_name || 'Brand' }}
      </p>

      <router-link
        :to="`/product/${product.id_product}`"
        class="text-decoration-none text-dark"
      >
        <h5 class="card-title fw-bold text-truncate mb-2">
          {{ product.product_name }}
        </h5>
      </router-link>

      <p class="card-text fw-black fs-4 text-dark mb-4">
        {{ formatCurrency(product.price) }}
      </p>

      <button
        class="btn w-100 fw-bold py-2 mt-auto rounded-3"
        :class="isOutOfStock ? 'btn-secondary disabled' : 'btn-dark'"
        :disabled="isOutOfStock"
        @click="handleAddToCart"
      >
        {{ isOutOfStock ? 'HẾT HÀNG' : 'THÊM VÀO GIỎ' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.object-fit-cover {
  object-fit: cover;
}

.mix-blend-multiply {
  mix-blend-mode: multiply;
}

.card-img-top-hover:hover {
  transform: scale(1.05);
}

.fw-black {
  font-weight: 900;
}
</style>


