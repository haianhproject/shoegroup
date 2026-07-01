<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ShoeCard from '../components/ShoeCard.vue'
import { brands, sizes, colors } from '../data/mockData'

const route = useRoute()
const router = useRouter()

// === STATE DỮ LIỆU TỪ CSDL ===
const products = ref([])
const categories = ref([])
const isLoading = ref(true)

// === STATE BỘ LỌC ===
const searchQuery = ref('')
const selectedCategory = ref(null)
const selectedBrands = ref([])
const selectedSizes = ref([])
const selectedColors = ref([])
const priceRange = ref(5000000)
const sortOrder = ref('new')

const fetchProductsData = async () => {
  try {
    const [resProd, resCat] = await Promise.all([
      fetch('http://localhost:5000/api/products'),
      fetch('http://localhost:5000/api/categories')
    ])
    
    const prodData = await resProd.json()
    const catData = await resCat.json()

    categories.value = catData.filter(c => c.active).map(c => ({
      id_category: c.id,
      category_name: c.name
    }))

    products.value = prodData.filter(p => p.active).map(p => ({
      id_product: p.id,
      product_name: p.name,
      price: p.price,
      id_category: p.category_id,
      category_name: p.category,
      image_url: p.image_url,
      id_brand: p.id_brand || 1
    }))

  } catch (err) {
    console.error('Lỗi khi lấy dữ liệu Sản Phẩm:', err)
  } finally {
    isLoading.value = false
  }
}

// LẮNG NGHE SỰ THAY ĐỔI CỦA THANH URL ĐỂ TỰ ĐỘNG GÁN VÀO BỘ LỌC
watch(
  () => route.query,
  (query) => {
    if (query.search !== undefined) {
      searchQuery.value = query.search
    } else {
      searchQuery.value = ''
    }
    
    if (query.category !== undefined) {
      selectedCategory.value = Number(query.category)
    } else {
      selectedCategory.value = null
    }
  },
  { immediate: true }
)

// HÀM: Chuyển đổi chuỗi tiếng Việt có dấu thành không dấu để tìm kiếm gần đúng
const removeAccents = (str) => {
  if (!str) return '';
  return str.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// === LOGIC LỌC SẢN PHẨM ===
const filteredProducts = computed(() => {
  let filtered = products.value.filter(p => {
    // 1. TÌM KIẾM TÊN GẦN ĐÚNG
    if (searchQuery.value) {
      const q = removeAccents(searchQuery.value).trim()
      const pName = removeAccents(p.product_name || p.name || '')
      // Nếu tên sản phẩm không chứa từ khóa -> Lọc bỏ
      if (!pName.includes(q)) return false
    }

    // 2. LỌC THEO DANH MỤC
    if (selectedCategory.value && p.id_category !== selectedCategory.value) {
      return false
    }

    // 3. Lọc theo Thương hiệu
    if (selectedBrands.value.length > 0 && !selectedBrands.value.includes(p.id_brand)) return false
    
    // 4. Lọc theo Khoảng giá
    if (p.price > priceRange.value) return false
    
    return true
  })

  // Sắp xếp
  if (sortOrder.value === 'price-asc') filtered.sort((a, b) => a.price - b.price)
  else if (sortOrder.value === 'price-desc') filtered.sort((a, b) => b.price - a.price)
  else filtered.sort((a, b) => b.id_product - a.id_product)

  return filtered
})

const toggleArrayItem = (array, item) => {
  const index = array.indexOf(item)
  if (index > -1) array.splice(index, 1)
  else array.push(item)
}

const formatPrice = (value) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value).replace(' ', '')
}

// Hàm Xóa Bộ Lọc -> Đồng thời làm sạch thanh URL
const clearFilters = () => {
  searchQuery.value = ''
  selectedCategory.value = null
  selectedBrands.value = []
  priceRange.value = 5000000
  sortOrder.value = 'new'
  
  router.push({ path: '/products' }) // Xóa query trên thanh địa chỉ
}

onMounted(() => {
  window.scrollTo(0, 0)
  fetchProductsData() 
})
</script>

<template>
  <div class="pb-5 bg-light-gray min-vh-100">
    <section class="page-header py-5 mb-4 bg-dark text-white text-center">
      <div class="container">
        <h1 class="display-5 fw-bolder mb-2 text-uppercase tracking-tight">Tất Cả Sản Phẩm</h1>
        <p class="fs-6 text-light mb-0">
          <span v-if="searchQuery">Đang tìm kiếm: "<strong class="text-warning">{{ searchQuery }}</strong>"</span>
          <span v-else>Tìm kiếm đôi giày phù hợp với phong cách của bạn.</span>
        </p>
      </div>
    </section>
    
    <div class="container px-4">
      <div class="row g-5">
        <!-- SIDEBAR BỘ LỌC -->
        <aside class="col-lg-3">
          <div class="sticky-top" style="top: 100px; z-index: 1;">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="fw-bold m-0 fs-5"><i class="bi bi-funnel me-2"></i>Bộ Lọc</h5>
              <button @click="clearFilters" class="btn btn-sm text-decoration-underline text-secondary p-0 shadow-none border-0">Xóa Bộ Lọc</button>
            </div>
            
            <!-- Tìm kiếm thủ công -->
            <div class="mb-4">
              <div class="position-relative">
                <input v-model="searchQuery" type="text" class="form-control bg-white border-0 shadow-sm py-2 ps-4 pe-5 rounded-3 focus-ring" placeholder="Tìm tên giày...">
                <i class="bi bi-search position-absolute top-50 translate-middle-y end-0 me-3 text-muted"></i>
              </div>
            </div>
            
            <div class="mb-4 bg-white p-4 rounded-4 shadow-sm">
              <h6 class="fw-bold mb-3 fs-6">Danh Mục</h6>
              <div class="d-flex flex-wrap gap-2">
                <button class="btn btn-sm rounded-pill fw-medium transition-all" :class="selectedCategory === null ? 'btn-dark' : 'btn-light border'" @click="selectedCategory = null">Tất Cả</button>
                <button v-for="cat in categories" :key="cat.id_category" class="btn btn-sm rounded-pill fw-medium transition-all" :class="selectedCategory === cat.id_category ? 'btn-dark' : 'btn-light border'" @click="selectedCategory = cat.id_category">
                  {{ cat.category_name }}
                </button>
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
              <h6 class="fw-bold mb-3 fs-6">Mức Giá: Dưới {{ formatPrice(priceRange) }}đ</h6>
              <input v-model="priceRange" type="range" class="form-range custom-range" min="500000" max="5000000" step="100000">
            </div>
          </div>
        </aside>
        
        <!-- MAIN SẢN PHẨM -->
        <main class="col-lg-9">
          <div class="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded-4 shadow-sm">
            <p class="m-0 fw-medium text-secondary">
              Hiển thị <span class="text-dark fw-bold">{{ filteredProducts.length }}</span> kết quả
            </p>
            <div class="d-flex align-items-center gap-2">
              <span class="text-secondary small fw-medium text-nowrap">Sắp xếp:</span>
              <select v-model="sortOrder" class="form-select form-select-sm border-0 bg-light fw-medium shadow-none cursor-pointer w-auto">
                <option value="new">Mới nhất</option>
                <option value="price-asc">Giá: Thấp - Cao</option>
                <option value="price-desc">Giá: Cao - Thấp</option>
              </select>
            </div>
          </div>

          <div v-if="isLoading" class="text-center py-5 bg-white rounded-4 shadow-sm mt-4">
            <div class="spinner-border text-dark mb-3"></div>
            <h4 class="fw-bold text-secondary">Đang tải sản phẩm từ CSDL...</h4>
          </div>

          <div v-else-if="filteredProducts.length === 0" class="text-center py-5 bg-white rounded-4 shadow-sm mt-4">
            <i class="bi bi-search display-1 text-secondary opacity-50 mb-3"></i>
            <h4 class="fw-bold text-secondary">Không tìm thấy sản phẩm phù hợp</h4>
            <p class="text-muted">Vui lòng điều chỉnh lại bộ lọc hoặc từ khóa tìm kiếm.</p>
            <button @click="clearFilters" class="btn btn-dark rounded-pill px-4 mt-2 fw-medium">Xem tất cả</button>
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
.bg-light-gray { background-color: #f8f9fa; }
.tracking-tight { letter-spacing: -0.02em; }
.fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.custom-range { height: 4px; }
.custom-range::-webkit-slider-thumb { background: #212529; }
.focus-ring:focus { box-shadow: 0 0 0 0.2rem rgba(33,37,41,0.1); border: 1px solid #212529 !important; outline: none; }
.custom-checkbox-container input:checked ~ .custom-checkbox { background-color: #212529; border-color: #212529; }
.custom-checkbox-container input:checked ~ .custom-checkbox::after { content: '\F26A'; font-family: 'bootstrap-icons'; color: white; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 10px; }
.custom-checkbox { width: 18px; height: 18px; border: 2px solid #dee2e6; border-radius: 4px; display: inline-block; position: relative; transition: all 0.2s; }
.hover-dark { transition: color 0.2s; }
.custom-checkbox-container:hover .hover-dark { color: #212529 !important; }
</style>