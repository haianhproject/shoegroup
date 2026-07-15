<script setup>
import { ref, computed, onMounted } from 'vue'
import ShoeCard from '../components/ShoeCard.vue'

const productsList = ref([])
const categories = ref([])
const brands = ref([{id: 1, name: 'Nike'}, {id: 2, name: 'Adidas'}, {id: 3, name: 'Puma'}]) // Data mẫu thương hiệu
const isLoading = ref(true)

// Trạng thái bộ lọc
const searchQuery = ref('')
const selectedCategory = ref('Tất cả')
const selectedBrands = ref([])
const sortOrder = ref('Mới nhất')

const fetchProducts = async () => {
  try {
    const [resProd, resCat] = await Promise.all([
      fetch('http://localhost:5000/api/products'),
      fetch('http://localhost:5000/api/categories')
    ])
    
    const dataProd = await resProd.json()
    const dataCat = await resCat.json()

    categories.value = dataCat
    
    // [ĐÃ SỬA VẤN ĐỀ 1] Tự động dịch category_id thành category name để lọc chính xác
    productsList.value = dataProd.map(item => {
      const matchedCategory = dataCat.find(c => c.id === item.category_id)
      return {
        ...item,
        category: matchedCategory ? matchedCategory.name : 'Không xác định',
        image: item.image_url || 'https://via.placeholder.com/500?text=Shoe'
      }
    })
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu trang sản phẩm:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  window.scrollTo(0, 0)
  fetchProducts()
})

// Xử lý logic lọc dữ liệu
const filteredProducts = computed(() => {
  let result = productsList.value

  result = result.filter(p => p.active)

  if (searchQuery.value) {
    result = result.filter(p => p.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
  }

  if (selectedCategory.value !== 'Tất cả') {
    result = result.filter(p => p.category === selectedCategory.value)
  }

  if (selectedBrands.value.length > 0) {
    result = result.filter(p => {
      const brandObj = brands.value.find(b => b.id === p.brand_id)
      return brandObj && selectedBrands.value.includes(brandObj.name)
    })
  }

  if (sortOrder.value === 'Giá thấp đến cao') {
    result.sort((a, b) => a.price - b.price)
  } else if (sortOrder.value === 'Giá cao đến thấp') {
    result.sort((a, b) => b.price - a.price)
  } else {
    result.sort((a, b) => b.id - a.id)
  }

  return result
})

const clearFilters = () => {
  searchQuery.value = ''
  selectedCategory.value = 'Tất cả'
  selectedBrands.value = []
}
</script>

<template>
  <div class="bg-light min-vh-100 pb-5 font-sans">
    <div class="bg-dark text-white py-5 mb-5 text-center">
      <div class="container py-4">
        <h1 class="display-4 fw-black text-uppercase tracking-wider mb-3">Tất Cả Sản Phẩm</h1>
        <p class="fs-5 text-secondary">Tìm kiếm đôi giày phù hợp nhất với phong cách của bạn.</p>
      </div>
    </div>

    <div class="container">
      <div class="row g-4">
        <div class="col-lg-3">
          <div class="card border-0 shadow-sm rounded-4 p-4 sticky-top" style="top: 100px; z-index: 1;">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h5 class="fw-bold m-0"><i class="bi bi-funnel me-2"></i>Bộ Lọc</h5>
              <button class="btn btn-link text-secondary p-0 text-decoration-none small" @click="clearFilters">Xóa lọc</button>
            </div>

            <div class="mb-4">
              <div class="input-group">
                <input v-model="searchQuery" type="text" class="form-control bg-light border-0" placeholder="Tìm tên giày...">
                <span class="input-group-text bg-light border-0"><i class="bi bi-search"></i></span>
              </div>
            </div>

            <div class="mb-4">
              <h6 class="fw-bold mb-3">Danh Mục</h6>
              <div class="d-flex flex-wrap gap-2">
                <button 
                  class="btn rounded-pill px-3 py-1 fw-medium"
                  :class="selectedCategory === 'Tất cả' ? 'btn-dark' : 'btn-outline-secondary border text-dark'"
                  @click="selectedCategory = 'Tất cả'"
                >Tất cả</button>
                <button 
                  v-for="cat in categories" :key="cat.id"
                  class="btn rounded-pill px-3 py-1 fw-medium"
                  :class="selectedCategory === cat.name ? 'btn-dark' : 'btn-outline-secondary border text-dark'"
                  @click="selectedCategory = cat.name"
                >{{ cat.name }}</button>
              </div>
            </div>

            <div class="mb-4">
              <h6 class="fw-bold mb-3">Thương Hiệu</h6>
              <div class="form-check mb-2" v-for="brand in brands" :key="brand.id">
                <input class="form-check-input" type="checkbox" :value="brand.name" :id="'brand-'+brand.id" v-model="selectedBrands">
                <label class="form-check-label text-dark fw-medium" :for="'brand-'+brand.id">{{ brand.name }}</label>
              </div>
            </div>
            
            <hr class="text-secondary opacity-25">
            <p class="small text-secondary mb-0 text-center">Shoegroup © 2026</p>
          </div>
        </div>

        <div class="col-lg-9">
          <div class="card border-0 shadow-sm rounded-4 p-3 mb-4 d-flex flex-column flex-md-row justify-content-between align-items-center">
            <p class="m-0 text-secondary fw-medium mb-3 mb-md-0">Hiển thị <span class="fw-bold text-dark">{{ filteredProducts.length }}</span> kết quả</p>
            <div class="d-flex align-items-center gap-2">
              <span class="text-secondary fw-medium small text-nowrap">Sắp xếp:</span>
              <select v-model="sortOrder" class="form-select border-0 bg-light fw-medium" style="width: auto;">
                <option value="Mới nhất">Mới nhất</option>
                <option value="Giá thấp đến cao">Giá thấp đến cao</option>
                <option value="Giá cao đến thấp">Giá cao đến thấp</option>
              </select>
            </div>
          </div>

          <div v-if="isLoading" class="text-center py-5"><div class="spinner-border text-dark"></div></div>
          <div v-else-if="filteredProducts.length === 0" class="card border-0 shadow-sm rounded-4 p-5 text-center">
            <i class="bi bi-box-seam fs-1 text-secondary mb-3"></i>
            <h4 class="fw-bold text-dark">Không có sản phẩm nào</h4>
            <p class="text-secondary">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm nhé.</p>
            <div><button class="btn btn-dark mt-2" @click="clearFilters">Xóa tất cả bộ lọc</button></div>
          </div>
          <div v-else class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
            <div class="col" v-for="product in filteredProducts" :key="product.id">
              <ShoeCard :product="product" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
.font-sans { font-family: 'Inter', sans-serif; }
.fw-black { font-weight: 900; }
.tracking-wider { letter-spacing: 2px; }
.form-check-input:checked { background-color: #212529; border-color: #212529; }
.btn-outline-secondary { border-color: #dee2e6 !important; }
.btn-outline-secondary:hover { background-color: #f8f9fa; color: #000 !important; }
</style>