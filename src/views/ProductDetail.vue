<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { addToCart, formatCurrency, showMiniCart } from '../stores/cartStore'

const route = useRoute()
const product = ref(null)
const isLoading = ref(true)

// Dữ liệu size và color mẫu
const availableSizes = [
  { id_size: 1, size_name: "39" },
  { id_size: 2, size_name: "40" },
  { id_size: 3, size_name: "41" },
  { id_size: 4, size_name: "42" },
  { id_size: 5, size_name: "43" }
]
const availableColors = [
  { id_color: 1, color_name: "Black", color_label: "Đen", hex: "#1e293b" },
  { id_color: 2, color_name: "White", color_label: "Trắng", hex: "#f8fafc" },
  { id_color: 3, color_name: "Red", color_label: "Đỏ", hex: "#ef4444" }
]

const selectedSize = ref("42")
const selectedColor = ref("Đen")
const quantity = ref(1)

const currentStock = ref(100)

// GỌI API LẤY TRỰC TIẾP TỪ SQL SERVER
const fetchProduct = async () => {
  try {
    isLoading.value = true;
    const res = await fetch('http://localhost:5000/api/products');
    const data = await res.json();
    const found = data.find(p => p.id == route.params.id);
    if (found) {
      product.value = found;
    }
  } catch (err) {
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

const decreaseQuantity = () => {
  if (quantity.value > 1) {
    quantity.value -= 1
  }
}

const increaseQuantity = () => {
  if (quantity.value < currentStock.value) {
    quantity.value += 1
  }
}

const handleAddToCart = () => {
  if (currentStock.value <= 0) {
    alert('Sản phẩm đã hết hàng.')
    return
  }
  const result = addToCart({
    product: product.value,
    quantity: quantity.value,
    size: { size_name: selectedSize.value },
    color: { color_name: selectedColor.value, color_label: selectedColor.value }
  })
  if (!result.ok) {
    alert(result.message)
    return
  }
  showMiniCart()
}

onMounted(() => {
  window.scrollTo(0, 0)
  fetchProduct()
})

watch(() => route.params.id, () => {
  fetchProduct()
})
</script>

<template>
  <div v-if="isLoading" class="container text-center py-5">
    <div class="spinner-border text-dark"></div>
  </div>
  <div v-else-if="!product" class="container text-center py-5">
    <h2 class="fw-bold">Không tìm thấy sản phẩm</h2>
  </div>
  <div v-else class="container-fluid px-4 py-5 bg-light min-vh-100">
    <div class="row bg-white rounded-5 shadow-sm p-4 mx-0 g-5">
      <div class="col-lg-6 d-flex flex-column gap-3">
        <div class="bg-light rounded-4 overflow-hidden border">
          <img
            :src="product.image_url"
            :alt="product.name"
            class="w-100 object-fit-cover ratio-1x1 mix-blend-multiply"
          >
        </div>
      </div>
      <div class="col-lg-6 d-flex flex-column">
        <p class="text-secondary fw-bold text-uppercase mb-2">
          {{ product.category || 'ShoeGroup' }}
        </p>
        <h1 class="display-5 fw-bold text-dark mb-2">
          {{ product.name || product.product_name }}
        </h1>
        <p class="fs-1 fw-bold text-dark mb-4">
          {{ formatCurrency(product.price || product.BasePrice) }}
        </p>
        <div class="mb-4">
          <h5 class="fw-bold fs-6 text-uppercase mb-3">
            Chọn Size:
            <span class="fw-normal text-danger">{{ selectedSize }}</span>
          </h5>
          <div class="d-flex flex-wrap gap-2">
            <button
              v-for="size in availableSizes"
              :key="size.id_size"
              type="button"
              class="btn fw-bold d-flex align-items-center justify-content-center size-btn"
              :class="selectedSize === size.size_name ? 'btn-dark' : 'btn-outline-secondary text-dark'"
              @click="selectedSize = size.size_name"
            >
              {{ size.size_name }}
            </button>
          </div>
        </div>
        <div class="mb-4">
          <h5 class="fw-bold fs-6 text-uppercase mb-3">
            Chọn Màu:
            <span class="fw-normal text-danger">{{ selectedColor }}</span>
          </h5>
          <div class="d-flex flex-wrap gap-3">
            <button
              v-for="color in availableColors"
              :key="color.id_color"
              type="button"
              class="color-btn rounded-circle transition-all position-relative"
              :class="selectedColor === color.color_label ? 'border-dark active-scale' : 'border-transparent'"
              :style="{ backgroundColor: color.hex }"
              :title="color.color_label"
              @click="selectedColor = color.color_label"
            >
              <i
                v-if="selectedColor === color.color_label"
                class="bi bi-check position-absolute top-50 start-50 translate-middle"
                :class="color.color_name === 'White' ? 'text-dark' : 'text-white'"
              ></i>
            </button>
          </div>
        </div>
        <div class="mb-4">
          <h5 class="fw-bold fs-6 text-uppercase mb-3">Số lượng</h5>
          <div class="d-flex align-items-center gap-3">
            <div class="input-group" style="width: 140px;">
              <button type="button" class="btn btn-outline-secondary d-flex align-items-center justify-content-center" :disabled="quantity <= 1" @click="decreaseQuantity"><i class="bi bi-dash"></i></button>
              <input type="text" class="form-control text-center fw-bold bg-white" :value="quantity" readonly>
              <button type="button" class="btn btn-outline-secondary d-flex align-items-center justify-content-center" :disabled="quantity >= currentStock" @click="increaseQuantity"><i class="bi bi-plus"></i></button>
            </div>
            <span class="text-success fw-bold small"><i class="bi bi-check-circle"></i> Còn hàng</span>
          </div>
        </div>
        <button
          type="button"
          class="btn btn-dark w-100 py-3 rounded-4 fw-bold fs-5 mb-4 shadow-hover d-flex align-items-center justify-content-center gap-2"
          :disabled="currentStock <= 0"
          @click="handleAddToCart"
        >
          <i class="bi bi-bag"></i>
          THÊM VÀO GIỎ
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.object-fit-cover { object-fit: cover; }
.mix-blend-multiply { mix-blend-mode: multiply; }
.ratio-1x1 { aspect-ratio: 1 / 1; }
.border-transparent { border-color: transparent !important; }
.border-hover-dark:hover { border-color: #dee2e6 !important; }
.size-btn { width: 54px; height: 50px; border-width: 2px !important; }
.color-btn { width: 42px; height: 42px; border: 2px solid #ddd; padding: 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 .125rem .25rem rgba(0,0,0,.075); }
.color-btn.active-scale { transform: scale(1.15); box-shadow: 0 .5rem 1rem rgba(0,0,0,.15); }
</style>