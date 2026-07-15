<script setup>
import { ref, onMounted } from 'vue'
import ShoeCard from '../components/ShoeCard.vue'

const productsList = ref([])
const isLoading = ref(true)

// Lấy 4 sản phẩm mới nhất để hiển thị ở trang chủ
const fetchFeaturedProducts = async () => {
  try {
    const res = await fetch('http://localhost:5000/api/products')
    const data = await res.json()
    // Lọc sp đang bán và lấy 4 cái đầu tiên
    productsList.value = data.filter(p => p.active).slice(0, 4)
  } catch (error) {
    console.error('Lỗi khi tải danh sách sản phẩm:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchFeaturedProducts()
})
</script>

<template>
  <div class="pb-5 bg-white font-sans">
    <!-- Hero Banner -->
    <section class="position-relative bg-black text-white overflow-hidden" style="min-height: 80vh;">
      <div class="position-absolute w-100 h-100 opacity-50" style="z-index: 0;">
        <img src="https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&q=80&w=2000" alt="Sneakers Cover" class="w-100 h-100 object-fit-cover">
      </div>
      <div class="position-relative container h-100 d-flex flex-column justify-content-center py-5" style="z-index: 1; min-height: 80vh;">
        <div style="max-width: 600px;">
          <span class="bg-white text-dark fw-bold px-3 py-1 text-uppercase tracking-wider mb-3 d-inline-block small">Bộ Sưu Tập Mới</span>
          <h1 class="display-3 fw-black mb-3 lh-1 mt-2">NÂNG TẦM <br><span class="text-info">PHONG CÁCH</span></h1>
          <p class="fs-5 text-light mb-5 opacity-75">Khám phá những đôi giày thể thao đỉnh cao, mang lại sự thoải mái tuyệt đối và thiết kế dẫn đầu xu hướng năm nay.</p>
          <div class="d-flex gap-3">
            <router-link to="/products" class="btn btn-light rounded-0 px-5 py-3 fw-bold text-dark d-inline-flex align-items-center gap-2 hover-scale">
              MUA NGAY
            </router-link>
            <router-link to="/products" class="btn btn-outline-light rounded-0 px-5 py-3 fw-bold d-inline-flex align-items-center gap-2 hover-scale">
              XEM TẤT CẢ <i class="bi bi-arrow-right"></i>
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- Dịch vụ -->
    <section class="py-5 border-bottom">
      <div class="container">
        <div class="row g-4 text-center">
          <div class="col-md-4">
            <i class="bi bi-truck fs-1 text-dark mb-3"></i>
            <h5 class="fw-bold text-uppercase">Miễn Phí Giao Hàng</h5>
            <p class="text-secondary small">Áp dụng cho mọi đơn hàng từ 2.000.000đ trên toàn quốc.</p>
          </div>
          <div class="col-md-4 border-md-start border-md-end">
            <i class="bi bi-arrow-repeat fs-1 text-dark mb-3"></i>
            <h5 class="fw-bold text-uppercase">Đổi Trả Dễ Dàng</h5>
            <p class="text-secondary small">Hỗ trợ đổi size, đổi mẫu trong vòng 30 ngày từ khi nhận.</p>
          </div>
          <div class="col-md-4">
            <i class="bi bi-shield-check fs-1 text-dark mb-3"></i>
            <h5 class="fw-bold text-uppercase">Chính Hãng 100%</h5>
            <p class="text-secondary small">Hoàn tiền và đền bù gấp 10 lần nếu phát hiện hàng giả.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Danh mục phổ biến -->
    <section class="container py-5 mt-4">
      <div class="text-center mb-5">
        <h2 class="fw-black fs-2 text-uppercase">Danh Mục Phổ Biến</h2>
      </div>
      <div class="row g-4">
        <div class="col-md-6 col-lg-4">
          <router-link to="/products" class="card text-white border-0 overflow-hidden rounded-0 group-hover text-decoration-none">
            <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800" class="card-img object-fit-cover transition-transform" style="height: 300px;" alt="Running">
            <div class="card-img-overlay d-flex flex-column justify-content-end bg-gradient-dark">
              <h3 class="card-title fw-black text-uppercase mb-1">Running</h3>
              <span class="text-light small fw-medium">Khám phá ngay <i class="bi bi-arrow-right"></i></span>
            </div>
          </router-link>
        </div>
        <div class="col-md-6 col-lg-4">
          <router-link to="/products" class="card text-white border-0 overflow-hidden rounded-0 group-hover text-decoration-none">
            <img src="https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=800" class="card-img object-fit-cover transition-transform" style="height: 300px;" alt="Sneakers">
            <div class="card-img-overlay d-flex flex-column justify-content-end bg-gradient-dark">
              <h3 class="card-title fw-black text-uppercase mb-1">Sneakers</h3>
              <span class="text-light small fw-medium">Khám phá ngay <i class="bi bi-arrow-right"></i></span>
            </div>
          </router-link>
        </div>
        <div class="col-md-6 col-lg-4">
          <router-link to="/products" class="card text-white border-0 overflow-hidden rounded-0 group-hover text-decoration-none">
            <img src="https://images.unsplash.com/photo-1505533321630-975218a5f66f?auto=format&fit=crop&q=80&w=800" class="card-img object-fit-cover transition-transform" style="height: 300px;" alt="Basketball">
            <div class="card-img-overlay d-flex flex-column justify-content-end bg-gradient-dark">
              <h3 class="card-title fw-black text-uppercase mb-1">Basketball</h3>
              <span class="text-light small fw-medium">Khám phá ngay <i class="bi bi-arrow-right"></i></span>
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <!-- Sản phẩm nổi bật -->
    <section class="container py-5">
      <div class="d-flex align-items-end justify-content-between mb-4">
        <div>
          <h2 class="fw-black fs-2 m-0 text-uppercase">Sản Phẩm Nổi Bật</h2>
          <p class="text-secondary mt-2 mb-0">Những mẫu giày hot được săn đón nhiều nhất tuần qua.</p>
        </div>
        <router-link to="/products" class="btn btn-outline-dark rounded-0 fw-bold px-4 d-none d-md-block">
          XEM TẤT CẢ <i class="bi bi-arrow-right ms-2"></i>
        </router-link>
      </div>
      
      <div v-if="isLoading" class="text-center py-5"><div class="spinner-border text-dark"></div></div>
      <div v-else class="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-4">
        <div class="col" v-for="product in productsList" :key="product.id">
          <ShoeCard :product="product" />
        </div>
      </div>
    </section>

    <!-- Sale Banner -->
    <section class="py-5 my-4">
      <div class="container">
        <div class="position-relative rounded-4 overflow-hidden bg-dark text-white shadow-lg" style="min-height: 400px;">
          <img src="https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&q=80&w=1600" alt="Sale Banner" class="position-absolute w-100 h-100 object-fit-cover opacity-50">
          <div class="position-relative d-flex flex-column align-items-center justify-content-center text-center h-100 p-5" style="min-height: 400px;">
            <p class="text-info fw-bold text-uppercase tracking-wider mb-2">Ưu đãi đặc biệt</p>
            <h2 class="display-4 fw-black mb-3">GIẢM GIÁ LÊN ĐẾN 30%</h2>
            <p class="fs-5 mb-4 opacity-75" style="max-width: 600px;">Áp dụng cho các mẫu giày chạy bộ chuyên nghiệp và thời trang đường phố. Số lượng có hạn, chốt đơn ngay hôm nay!</p>
            <router-link to="/products" class="btn btn-light rounded-0 px-5 py-3 fw-bold text-dark hover-scale fs-5">
              SĂN SALE NGAY
            </router-link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
.font-sans { font-family: 'Inter', sans-serif; }
.fw-black { font-weight: 900; }
.tracking-wider { letter-spacing: 2px; }
.object-fit-cover { object-fit: cover; }
.hover-scale { transition: transform 0.2s ease; }
.hover-scale:hover { transform: scale(1.05); }
.bg-gradient-dark { background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%); }
.transition-transform { transition: transform 0.5s ease; }
.group-hover:hover .transition-transform { transform: scale(1.1); }
@media (min-width: 768px) {
  .border-md-start { border-left: 1px solid #dee2e6; }
  .border-md-end { border-right: 1px solid #dee2e6; }
}
</style>