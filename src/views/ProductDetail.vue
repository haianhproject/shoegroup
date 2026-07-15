<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { addToCart, formatCurrency, showMiniCart } from '../stores/cartStore'

const route = useRoute()
const product = ref(null)
const isLoading = ref(true)

// Dữ liệu Brand mặc định
const brands = [{ id: 1, brand_name: 'Nike' }, { id: 2, brand_name: 'Adidas' }, { id: 3, brand_name: 'Puma' }]

// Khởi tạo các biến chọn
const selectedSize = ref('42') // Size mặc định
const selectedColor = ref(null)
const quantity = ref(1)
const mainImage = ref('')

const availableSizes = ['39', '40', '41', '42', '43', '44']

const brand = computed(() => {
  return product.value ? brands.find((b) => b.id === product.value.brand_id) : null
})

// Gọi API lấy thông tin sản phẩm chi tiết
const fetchProductDetail = async () => {
  try {
    const res = await fetch('http://localhost:5000/api/products')
    const data = await res.json()
    // Tìm sản phẩm dựa trên ID trên thanh địa chỉ URL
    const foundProduct = data.find(p => p.id === Number(route.params.id))
    
    if (foundProduct) {
      product.value = foundProduct
      mainImage.value = foundProduct.image_url // Gán ảnh mặc định
      
      // Nếu có biến thể màu, mặc định chọn màu đầu tiên
      if (foundProduct.colors && foundProduct.colors.length > 0) {
        selectedColor.value = foundProduct.colors[0].color_name
      }
    }
  } catch (error) {
    console.error('Lỗi API:', error)
  } finally {
    isLoading.value = false
  }
}

const selectSize = (size) => {
  selectedSize.value = size
}

const selectColor = (colorObj) => {
  selectedColor.value = colorObj.color_name
  // Khi chọn màu, đổi luôn ảnh chính thành ảnh của màu đó
  if (colorObj.image_url) {
    mainImage.value = colorObj.image_url
  }
}

const decreaseQuantity = () => { if (quantity.value > 1) quantity.value -= 1 }
const increaseQuantity = () => { quantity.value += 1 } // Tạm bỏ check tồn kho phức tạp

const handleAddToCart = () => {
  if (!product.value) return

  const result = addToCart({
    productId: product.value.id,
    name: product.value.name,
    price: product.value.price,
    image: mainImage.value,
    size: selectedSize.value,
    color: selectedColor.value,
    quantity: quantity.value
  })

  if (!result.ok) {
    alert(result.message)
    return
  }
  showMiniCart()
}

onMounted(() => {
  window.scrollTo(0, 0)
  fetchProductDetail()
})
</script>

<template>
  <div v-if="isLoading" class="container text-center py-5"><h2 class="fw-bold">Đang tải dữ liệu...</h2></div>
  <div v-else-if="!product" class="container text-center py-5"><h2 class="fw-bold">Không tìm thấy sản phẩm</h2></div>

  <div v-else class="container-fluid px-4 py-5 bg-light min-vh-100">
    <div class="row bg-white rounded-5 shadow-sm p-4 mx-0 g-5">
      <div class="col-lg-6 d-flex flex-column gap-3">
        <div class="bg-light rounded-4 overflow-hidden border">
          <img :src="mainImage || 'https://via.placeholder.com/500?text=Shoe'" :alt="product.name" class="w-100 object-fit-cover ratio-1x1 mix-blend-multiply">
        </div>
      </div>

      <div class="col-lg-6 d-flex flex-column">
        <p class="text-secondary fw-bold text-uppercase mb-2">{{ brand?.brand_name || 'SHOEGROUP' }}</p>
        <h1 class="display-5 fw-bold text-dark mb-2">{{ product.name }}</h1>
        <p class="fs-1 fw-bold text-dark mb-4">{{ formatCurrency(product.price) }}</p>

        <div class="mb-4">
          <h5 class="fw-bold fs-6 text-uppercase mb-3">Chọn Size: <span class="fw-normal">{{ selectedSize }}</span></h5>
          <div class="d-flex flex-wrap gap-2">
            <button
              v-for="size in availableSizes" :key="size" type="button"
              class="btn fw-bold d-flex align-items-center justify-content-center size-btn"
              :class="selectedSize === size ? 'btn-dark' : 'btn-outline-secondary text-dark'"
              @click="selectSize(size)"
            >
              {{ size }}
            </button>
          </div>
        </div>

        <div class="mb-4" v-if="product.colors && product.colors.length > 0">
          <h5 class="fw-bold fs-6 text-uppercase mb-3">Chọn Màu: <span class="fw-normal">{{ selectedColor }}</span></h5>
          <div class="d-flex flex-wrap gap-3">
            <button
              v-for="color in product.colors" :key="color.color_name" type="button"
              class="color-btn rounded-circle transition-all position-relative bg-light"
              :class="selectedColor === color.color_name ? 'border-dark active-scale' : 'border-transparent'"
              :title="color.color_name"
              @click="selectColor(color)"
            >
              <img :src="color.image_url" class="w-100 h-100 rounded-circle object-fit-cover" :alt="color.color_name">
            </button>
          </div>
        </div>

        <div class="mb-4">
          <h5 class="fw-bold fs-6 text-uppercase mb-3">Số lượng</h5>
          <div class="d-flex align-items-center gap-3">
            <div class="input-group" style="width: 140px;">
              <button type="button" class="btn btn-outline-secondary" @click="decreaseQuantity"><i class="bi bi-dash"></i></button>
              <input type="text" class="form-control text-center fw-bold" :value="quantity" readonly>
              <button type="button" class="btn btn-outline-secondary" @click="increaseQuantity"><i class="bi bi-plus"></i></button>
            </div>
          </div>
        </div>

        <button type="button" class="btn btn-dark w-100 py-3 rounded-4 fw-bold fs-5 mb-4 shadow-hover d-flex align-items-center justify-content-center gap-2" @click="handleAddToCart">
          <i class="bi bi-bag"></i> THÊM VÀO GIỎ HÀNG
        </button>
      </div>
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

.ratio-1x1 {
  aspect-ratio: 1 / 1;
}

.border-transparent {
  border-color: transparent !important;
}

.border-hover-dark:hover {
  border-color: #dee2e6 !important;
}

.size-btn {
  width: 54px;
  height: 50px;
  border-width: 2px !important;
}

.color-btn {
  width: 42px;
  height: 42px;
  border: 2px solid;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 .125rem .25rem rgba(0,0,0,.075);
}

.color-btn.active-scale {
  transform: scale(1.15);
  box-shadow: 0 .5rem 1rem rgba(0,0,0,.15);
}
</style>