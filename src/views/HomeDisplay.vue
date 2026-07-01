<script setup>
import { computed, onMounted, ref } from 'vue'
import ShoeCard from '../components/ShoeCard.vue'

const products = ref([])
const categories = ref([])
const isLoading = ref(true)

const featuredProducts = computed(() => products.value.slice(0, 8))

// HÀM TÌM ẢNH SẢN PHẨM ĐẦU TIÊN CỦA DANH MỤC TỪ DATABASE
const getCategoryImage = (categoryId) => {
  const prod = products.value.find(p => p.id_category === categoryId)
  // Nếu có sản phẩm thuộc danh mục, lấy ảnh đó. Nếu chưa có, dùng ảnh mặc định.
  return prod?.image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800'
}

// GỌI API LẤY DỮ LIỆU TỪ DB
const fetchData = async () => {
  try {
    const [resProd, resCat] = await Promise.all([
      fetch('http://localhost:5000/api/products'),
      fetch('http://localhost:5000/api/categories')
    ])
    
    const dataProd = await resProd.json()
    const dataCat = await resCat.json()

    products.value = dataProd.filter(p => p.active).map(p => ({
      id_product: p.id,
      product_name: p.name,
      price: p.price,
      id_category: p.category_id,
      category_name: p.category,
      image_url: p.image_url,
      id_brand: p.id_brand || 1
    }))

    categories.value = dataCat.filter(c => c.active).map(c => ({
      id_category: c.id,
      category_name: c.name
    }))
  } catch (error) {
    console.error("Lỗi tải dữ liệu Database:", error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  window.scrollTo(0, 0)
  fetchData()
})
</script>

<template>
  <div class="home-wrapper bg-light-custom">
    <section class="hero-section position-relative d-flex align-items-center">
      <div class="hero-bg position-absolute w-100 h-100"></div>
      <div class="container position-relative z-1 py-5">
        <div class="row">
          <div class="col-lg-8 col-xl-7 text-white text-center text-lg-start mt-4">
            <span class="badge bg-white text-dark mb-4 px-3 py-2 fw-bold tracking-widest text-uppercase rounded-pill shadow-sm">
              Bộ Sưu Tập Mới
            </span>
            <h1 class="display-2 fw-black mb-4 text-uppercase lh-1">
              Nâng Tầm <br><span class="text-warning">Phong Cách</span>
            </h1>
            <p class="fs-5 text-light mb-5 fw-light" style="max-width: 550px;">
              Khám phá những đôi giày thể thao đỉnh cao, mang lại sự thoải mái tuyệt đối và dẫn đầu xu hướng năm nay.
            </p>
            <div class="d-flex gap-3 justify-content-center justify-content-lg-start">
              <router-link to="/products" class="btn btn-light btn-lg rounded-pill px-5 fw-bold text-uppercase tracking-wide btn-hover-scale shadow-lg">
                Mua Ngay
              </router-link>
              <router-link to="/products" class="btn btn-outline-light btn-lg rounded-pill px-4 fw-bold text-uppercase tracking-wide btn-hover-scale">
                Xem Tất Cả
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Khối Feature Dịch vụ -->
    <section class="features-section py-4 bg-white position-relative shadow-sm" style="margin-top: -40px; border-radius: 30px 30px 0 0; z-index: 2;">
      <div class="container px-4 mt-3">
        <div class="row g-4 text-center">
          <div class="col-md-4">
            <div class="feature-card p-4 rounded-4 h-100 transition-all">
              <div class="icon-box bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 70px; height: 70px;">
                <i class="bi bi-truck fs-2 text-dark"></i>
              </div>
              <h5 class="fw-bold mb-2">Miễn Phí Giao Hàng</h5>
              <p class="text-muted small mb-0">Áp dụng cho mọi đơn hàng từ 2.000.000đ.</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="feature-card p-4 rounded-4 h-100 transition-all">
              <div class="icon-box bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 70px; height: 70px;">
                <i class="bi bi-arrow-repeat fs-2 text-dark"></i>
              </div>
              <h5 class="fw-bold mb-2">Đổi Trả Dễ Dàng</h5>
              <p class="text-muted small mb-0">Hỗ trợ đổi size, mẫu trong vòng 30 ngày.</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="feature-card p-4 rounded-4 h-100 transition-all">
              <div class="icon-box bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 70px; height: 70px;">
                <i class="bi bi-shield-check fs-2 text-dark"></i>
              </div>
              <h5 class="fw-bold mb-2">Chính Hãng 100%</h5>
              <p class="text-muted small mb-0">Hoàn tiền gấp 10 lần nếu phát hiện hàng giả.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Khối Danh Mục -->
    <section class="category-section py-5">
      <div class="container px-4 pt-4">
        <div class="text-center mb-5">
          <h2 class="display-6 fw-bold mb-2 text-uppercase tracking-tight">Danh Mục Sản Phẩm</h2>
          <div class="divider mx-auto bg-dark"></div>
        </div>
        
        <div class="row g-4">
          <div class="col-md-6 col-lg-3" v-for="cat in categories.slice(0, 4)" :key="cat.id_category">
            <!-- CHUYỂN HƯỚNG KÈM THEO ID CỦA DANH MỤC LÊN URL -->
            <router-link :to="`/products?category=${cat.id_category}`" class="category-card d-block position-relative rounded-4 overflow-hidden shadow-sm">
              <img :src="getCategoryImage(cat.id_category)" class="w-100 h-100 object-fit-cover bg-light" alt="Category" style="min-height: 350px;">
              <div class="overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-end p-4">
                <div class="content w-100 text-center">
                  <h4 class="text-white fw-bold mb-1 text-uppercase">{{ cat.category_name }}</h4>
                  <span class="text-white-50 small fw-medium">Khám phá ngay <i class="bi bi-arrow-right"></i></span>
                </div>
              </div>
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- Khối SẢN PHẨM Nổi Bật -->
    <section class="products-section py-5 bg-white">
      <div class="container px-4">
        <div class="d-flex justify-content-between align-items-end mb-5">
          <div>
            <h2 class="display-6 fw-bold mb-2 text-uppercase tracking-tight">Sản Phẩm Nổi Bật</h2>
            <div class="divider bg-dark mb-3"></div>
            <p class="text-secondary mb-0">Những mẫu giày hot nhất tuần qua.</p>
          </div>
          <router-link to="/products" class="btn btn-outline-dark rounded-pill px-4 fw-bold d-none d-md-inline-block transition-all hover-invert">
            Xem Tất Cả <i class="bi bi-arrow-right ms-1"></i>
          </router-link>
        </div>

        <div v-if="isLoading" class="text-center py-5">
          <div class="spinner-border text-dark" role="status"></div>
          <p class="mt-2 fw-medium text-secondary">Đang nạp cơ sở dữ liệu...</p>
        </div>

        <div v-else class="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-4">
          <div class="col fade-in-up" v-for="(product, index) in featuredProducts" :key="product.id_product" :style="`animation-delay: ${index * 0.1}s`">
            <ShoeCard :product="product" />
          </div>
        </div>
        
        <div class="text-center mt-5 d-md-none">
          <router-link to="/products" class="btn btn-dark rounded-pill px-5 py-3 fw-bold w-100 text-uppercase">
            Xem Toàn Bộ Sản Phẩm
          </router-link>
        </div>
      </div>
    </section>

    <!-- Banner Cuối -->
    <section class="promo-section py-5 my-5 mx-3 mx-lg-5 rounded-5 overflow-hidden position-relative shadow-lg">
      <div class="promo-bg position-absolute top-0 start-0 w-100 h-100"></div>
      <div class="container position-relative z-1 py-5 text-center text-white">
        <span class="badge bg-danger text-white mb-3 px-3 py-2 fw-bold tracking-widest text-uppercase rounded-pill">Đặc Biệt</span>
        <h2 class="display-4 fw-black mb-3 text-uppercase tracking-tight">Giảm Giá Đến 30%</h2>
        <p class="fs-5 mb-5 opacity-75 fw-light" style="max-width: 600px; margin: 0 auto;">
          Áp dụng cho các mẫu giày chạy bộ chuyên nghiệp và thời trang đường phố cao cấp, chốt ngay hôm nay!
        </p>
        <router-link to="/products" class="btn btn-light btn-lg rounded-pill px-5 py-3 fw-bold text-uppercase tracking-wide shadow-lg btn-hover-scale text-dark">
          Săn Sale Ngay
        </router-link>
      </div>
    </section>
  </div>
</template>

<style scoped>
.bg-light-custom { background-color: #f8f9fa; }
.text-accent { color: #ff3e6c; }
.tracking-widest { letter-spacing: 0.2em; }
.tracking-wide { letter-spacing: 0.1em; }
.tracking-tight { letter-spacing: -0.03em; }
.fw-black { font-weight: 900; }
.transition-all { transition: all 0.3s ease; }
.btn-hover-scale { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
.btn-hover-scale:hover { transform: translateY(-4px) scale(1.05); box-shadow: 0 15px 25px rgba(0,0,0,0.2) !important; }
.hover-invert:hover { background-color: #212529; color: white !important; }
.divider { width: 60px; height: 4px; border-radius: 2px; }
.hero-section { min-height: 85vh; }
.hero-bg { background-image: url('https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&q=80&w=2000'); background-size: cover; background-position: center 30%; background-attachment: fixed; }
.hero-bg::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.1) 100%); }
.feature-card { border: 1px solid transparent; background-color: white; }
.feature-card:hover { border-color: #f1f1f1; box-shadow: 0 1rem 3rem rgba(0,0,0,0.08) !important; transform: translateY(-10px); }
.feature-card:hover .icon-box { background-color: #212529 !important; }
.feature-card:hover .icon-box i { color: white !important; }
.category-card .overlay { background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 100%); opacity: 0.85; transition: all 0.4s ease; }
.category-card img { transition: transform 0.6s ease; mix-blend-mode: multiply;}
.category-card:hover img { transform: scale(1.1); }
.category-card:hover .overlay { opacity: 1; background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 60%, transparent 100%); }
.category-card .content { transform: translateY(15px); transition: transform 0.4s ease; }
.category-card:hover .content { transform: translateY(0); }
.promo-bg { background-image: url('https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&q=80&w=2000'); background-size: cover; background-position: center; background-attachment: fixed; }
.promo-bg::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); }
.fade-in-up { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
.mix-blend-multiply { mix-blend-mode: multiply; }
.object-fit-cover { object-fit: cover; }
</style>