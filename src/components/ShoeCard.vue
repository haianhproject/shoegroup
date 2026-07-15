<script setup>
import { computed } from 'vue'
import { addToCart, formatCurrency, showMiniCart } from '../stores/cartStore'

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
})

// Dữ liệu Brand giả định (Do DB hiện tại của anh chưa có bảng Brands cho client)
const brands = [
  { id: 1, brand_name: 'Nike' },
  { id: 2, brand_name: 'Adidas' },
  { id: 3, brand_name: 'Puma' }
]

const brand = computed(() => {
  return brands.find((b) => b.id === props.product.brand_id)
})

// Kiểm tra tình trạng hoạt động thay cho check tồn kho
const isOutOfStock = computed(() => {
  return !props.product.active
})

const handleAddToCart = () => {
  const result = addToCart({
    productId: props.product.id, // Dùng product.id của API
    detailId: null, // Bỏ qua detailId vì API mới lưu theo product thẳng
    quantity: 1,
    // Truyền thêm data để giỏ hàng hiển thị đúng
    name: props.product.name,
    price: props.product.price,
    image: props.product.image_url
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
      :to="`/product/${product.id}`"
      class="ratio ratio-4x3 bg-light d-block text-decoration-none"
    >
      <img
        :src="product.image_url || 'https://via.placeholder.com/400x300?text=Shoe'"
        class="object-fit-cover w-100 h-100 mix-blend-multiply transition-all card-img-top-hover"
        :alt="product.name"
      >
    </router-link>

    <div class="card-body d-flex flex-column p-4">
      <p class="text-secondary small fw-bold text-uppercase tracking-wider mb-1">
        {{ brand?.brand_name || 'SHOEGROUP' }}
      </p>

      <router-link
        :to="`/product/${product.id}`"
        class="text-decoration-none text-dark"
      >
        <h5 class="card-title fw-bold text-truncate mb-2">
          {{ product.name }}
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
        {{ isOutOfStock ? 'TẠM ẨN' : 'THÊM VÀO GIỎ' }}
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