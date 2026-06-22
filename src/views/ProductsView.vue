<script setup>
import { ref, computed, onMounted } from 'vue'
import ShoeCard from '../components/ShoeCard.vue'
import { products, categories, brands, sizes, colors, product_details } from '../data/mockData'

// === STATE CHO BỘ LỌC (FILTERS) ===
const searchQuery = ref('')
const selectedCategory = ref(null)
const selectedBrands = ref([])
const selectedSizes = ref([])
const selectedColors = ref([])
const priceRange = ref(5000000)

// === LOGIC XỬ LÝ LỌC SẢN PHẨM ===
const filteredProducts = computed(() => {
  return products.filter(p => {
    // 1. Lọc theo từ khóa tìm kiếm
    if (searchQuery.value && !p.product_name.toLowerCase().includes(searchQuery.value.toLowerCase())) {
      return false
    }
    
    // 2. Lọc theo Danh mục (Category)
    if (selectedCategory.value && p.id_category !== selectedCategory.value) {
      return false
    }

    // 3. Lọc theo Thương hiệu (Brand)
    if (selectedBrands.value.length > 0 && !selectedBrands.value.includes(p.id_brand)) {
      return false
    }

    // 4. Lọc theo Khoảng giá (Price)
    if (p.price > priceRange.value) {
      return false
    }

    // Lấy danh sách chi tiết (size, color) của sản phẩm này có tồn kho > 0
    const detailsForProduct = product_details.filter(d => d.id_product === p.id_product && (d.stock_quantity > 0 || d.stock_quality > 0))

    // 5. Lọc theo Kích cỡ (Size)
    if (selectedSizes.value.length > 0) {
      const hasSize = detailsForProduct.some(d => selectedSizes.value.includes(d.id_size))
      if (!hasSize) return false
    }

    // 6. Lọc theo Màu sắc (Color)
    if (selectedColors.value.length > 0) {
      const hasColor = detailsForProduct.some(d => selectedColors.value.includes(d.id_color))
      if (!hasColor) return false
    }

    return true
  })
})

// === HÀM HỖ TRỢ ===
const toggleArrayItem = (array, item) => {
  const index = array.indexOf(item)
  if (index > -1) {
    array.splice(index, 1)
  } else {
    array.push(item)
  }
}

const formatPrice = (value) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value).replace('₫', 'đ')
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedCategory.value = null
  selectedBrands.value = []
  selectedSizes.value = []
  selectedColors.value = []
  priceRange.value = 5000000
}

onMounted(() => {
  window.scrollTo(0, 0)
})
</script>

<template>
  <div class="pb-5 bg-light-gray">
    <section class="page-header py-5 mb-5 bg-dark text-white text-center">
      <div class="container">
        <h1 class="display-5 fw-bolder mb-2 text-uppercase tracking-tight">Tất Cả Sản Phẩm</h1>
        <p class="fs-6 text-light mb-0">Tìm kiếm đôi giày phù hợp nhất với phong cách của bạn.</p>
      </div>
    </section>

    <div class="container px-4">
      <div class="row g-5">
        
        <aside class="col-lg-3">
          <div class="sticky-top" style="top: 100px; z-index: 1;">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h5 class="fw-bold m-0 fs-5"><i class="bi bi-funnel me-2"></i>Bộ Lọc</h5>
              <button @click="clearFilters" class="btn btn-sm text-decoration-underline text-secondary p-0 shadow-none border-0">Xóa lọc</button>
            </div>

            <div class="mb-4">
              <div class="position-relative">
                <input v-model="searchQuery" type="text" class="form-control bg-white border-0 shadow-sm py-2 ps-4 pe-5 rounded-3" placeholder="Tìm tên giày...">
                <i class="bi bi-search position-absolute top-50 translate-middle-y end-0 me-3 text-muted"></i>
              </div>
            </div>

            <div class="mb-4 bg-white p-4 rounded-4 shadow-sm">
              <h6 class="fw-bold mb-3 fs-6">Danh Mục</h6>
              <div class="d-flex flex-wrap gap-2">
                <button 
                  class="btn btn-sm rounded-pill fw-medium transition-all" 
                  :class="selectedCategory === null ? 'btn-dark' : 'btn-light border'"
                  @click="selectedCategory = null"
                >Tất cả</button>
                <button 
                  v-for="cat in categories" 
                  :key="cat.id_category"
                  class="btn btn-sm rounded-pill fw-medium transition-all"
                  :class="selectedCategory === cat.id_category ? 'btn-dark' : 'btn-light border'"
                  @click="selectedCategory = cat.id_category"
                >{{ cat.category_name }}</button>
              </div>
            </div>

            <div class="mb-4 bg-white p-4 rounded-4 shadow-sm">
              <h6 class="fw-bold mb-3 fs-6">Thương Hiệu</h6>
              <div class="d-flex flex-column gap-2">
                <label v-for="brand in brands" :key="brand.id_brand" class="custom-checkbox-container d-flex align-items-center cursor-pointer">
                  <input type="checkbox" :value="brand.id_brand" :checked="selectedBrands.includes(brand.id_brand)" @change="toggleArrayItem(selectedBrands, brand.id_brand)" class="d-none">
                  <span class="custom-checkbox me-2"></span>
                  <span class="fw-medium text-secondary hover-dark">{{ brand.brand_name }}</span>
                </label>
              </div>
            </div>

            <div class="mb-4 bg-white p-4 rounded-4 shadow-sm">
              <h6 class="fw-bold mb-3 fs-6">Mức Giá: Tối đa {{ formatPrice(priceRange) }}</h6>
              <input v-model="priceRange" type="range" class="form-range custom-range" min="500000" max="5000000" step="100000">
              <div class="d-flex justify-content-between text-muted small mt-2">
                <span>500k</span>
                <span>5 Triệu</span>
              </div>
            </div>

            <div class="mb-4 bg-white p-4 rounded-4 shadow-sm">
              <h6 class="fw-bold mb-3 fs-6">Kích Cỡ (Size)</h6>
              <div class="d-flex flex-wrap gap-2">
                <button 
                  v-for="size in sizes" 
                  :key="size.id_size"
                  class="btn btn-sm size-btn fw-bold transition-all"
                  :class="selectedSizes.includes(size.id_size) ? 'active' : ''"
                  @click="toggleArrayItem(selectedSizes, size.id_size)"
                >{{ size.size_name }}</button>
              </div>
            </div>

            <div class="mb-4 bg-white p-4 rounded-4 shadow-sm">
              <h6 class="fw-bold mb-3 fs-6">Màu Sắc</h6>
              <div class="d-flex flex-wrap gap-2">
                <button 
                  v-for="color in colors" 
                  :key="color.id_color"
                  class="color-btn position-relative rounded-circle p-0 border"
                  :class="selectedColors.includes(color.id_color) ? 'active shadow-sm' : ''"
                  :style="{ backgroundColor: color.hex }"
                  :title="color.color_label"
                  @click="toggleArrayItem(selectedColors, color.id_color)"
                >
                  <i v-if="selectedColors.includes(color.id_color)" class="bi bi-check text-white position-absolute top-50 start-50 translate-middle fw-bold"></i>
                </button>
              </div>
            </div>

          </div>
        </aside>

        <main class="col-lg-9">
          <div class="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded-4 shadow-sm">
            <p class="m-0 fw-medium text-secondary">
              Hiển thị <span class="text-dark fw-bold">{{ filteredProducts.length }}</span> kết quả
            </p>
            <div class="d-flex align-items-center gap-2">
              <span class="text-secondary small fw-medium text-nowrap">Sắp xếp:</span>
              <select class="form-select form-select-sm border-0 bg-light fw-medium shadow-none cursor-pointer" style="width: auto;">
                <option value="new">Mới nhất</option>
                <option value="price-asc">Giá: Thấp - Cao</option>
                <option value="price-desc">Giá: Cao - Thấp</option>
              </select>
            </div>
          </div>

          <div v-if="filteredProducts.length === 0" class="text-center py-5 bg-white rounded-4 shadow-sm mt-4">
            <i class="bi bi-search display-1 text-light mb-3"></i>
            <h4 class="fw-bold text-secondary">Không tìm thấy sản phẩm phù hợp</h4>
            <p class="text-muted">Vui lòng điều chỉnh lại bộ lọc hoặc từ khóa tìm kiếm.</p>
            <button @click="clearFilters" class="btn btn-dark rounded-pill px-4 mt-2 fw-medium">Xóa bộ lọc</button>
          </div>

          <div v-else class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
            <div class="col fade-in" v-for="product in filteredProducts" :key="product.id_product">
              <ShoeCard :product="product" />
            </div>
          </div>
        </main>

      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-light-gray {
  background-color: #f8f9fa;
}

.tracking-widest {
  letter-spacing: 0.15em;
}

.tracking-tight {
  letter-spacing: -0.02em;
}

/* Animations */
.fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Custom Checkbox */
.custom-checkbox-container input:checked ~ .custom-checkbox {
  background-color: #212529;
  border-color: #212529;
}
.custom-checkbox-container input:checked ~ .custom-checkbox::after {
  content: '\F26A'; /* Bootstrap icon check */
  font-family: 'bootstrap-icons';
  color: white;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
}
.custom-checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid #dee2e6;
  border-radius: 4px;
  display: inline-block;
  position: relative;
  transition: all 0.2s;
}
.hover-dark {
  transition: color 0.2s;
}
.custom-checkbox-container:hover .hover-dark {
  color: #212529 !important;
}

/* Custom Range Slider */
.custom-range {
  height: 4px;
}
.custom-range::-webkit-slider-thumb {
  background: #212529;
}

/* Custom Size Buttons */
.size-btn {
  width: 45px;
  height: 45px;
  background-color: #fff;
  border: 1px solid #dee2e6;
  color: #6c757d;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}
.size-btn:hover {
  border-color: #212529;
  color: #212529;
}
.size-btn.active {
  background-color: #212529;
  color: #fff;
  border-color: #212529;
}

/* Custom Color Buttons */
.color-btn {
  width: 32px;
  height: 32px;
  cursor: pointer;
  transition: transform 0.2s;
}
.color-btn:hover {
  transform: scale(1.1);
}
.color-btn.active {
  border: 2px solid #212529 !important;
  transform: scale(1.1);
}
</style>