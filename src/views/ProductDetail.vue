<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addToCart, formatCurrency, showMiniCart } from '../stores/cartStore'
import ShoeCard from '../components/ShoeCard.vue'

const route = useRoute()
const router = useRouter()
const product = ref(null)
const allProducts = ref([])
const relatedProducts = ref([])
const isLoading = ref(true)

const mainImage = ref('')

// Dữ liệu giả lập cho size như ảnh Anta
const availableSizes = ['39', '40', '41', '42', '42.5', '43', '44']

const selectedSize = ref("42")
const quantity = ref(1)

const fetchData = async () => {
  try {
    isLoading.value = true;
    const res = await fetch('http://localhost:5000/api/products');
    const data = await res.json();
    allProducts.value = data;
    
    const found = data.find(p => p.id == route.params.id);
    if (found) {
      product.value = found;
      mainImage.value = found.image_url;
      
      // Lấy tối đa 4 SP cùng loại (bỏ qua SP hiện tại)
      relatedProducts.value = data
        .filter(p => p.category_id === found.category_id && p.id != found.id && p.active)
        .slice(0, 4);
    } else {
      product.value = null;
    }
  } catch (err) {
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

// Xử lý tách các link ảnh phụ từ chuỗi trong CSDL thành mảng
const galleryImages = computed(() => {
  if (!product.value?.image_gallery) return [];
  return product.value.image_gallery.split(',').map(img => img.trim()).filter(img => img);
})

const allThumbnails = computed(() => {
  if (!product.value) return [];
  const list = [product.value.image_url, ...galleryImages.value];
  return [...new Set(list)]; // Lọc trùng lặp ảnh
})

// Tự sinh giá gốc cao hơn để có giá gạch chéo
const originalPrice = computed(() => {
    if(!product.value) return 0;
    return product.value.price * 1.25; 
})

const decreaseQuantity = () => { if (quantity.value > 1) quantity.value -= 1 }
const increaseQuantity = () => { quantity.value += 1 }

const handleAddToCart = () => {
  const result = addToCart({
    product: product.value,
    quantity: quantity.value,
    size: { size_name: selectedSize.value },
    color: { color_label: "Mặc định", color_name: "Mặc định" }
  })
  if (!result.ok) {
    alert(result.message)
    return
  }
  showMiniCart()
}

const handleBuyNow = () => {
    handleAddToCart();
    router.push('/checkout');
}

onMounted(() => {
  window.scrollTo(0, 0)
  fetchData()
})

watch(() => route.params.id, () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
  quantity.value = 1
  fetchData()
})
</script>

<template>
  <div v-if="isLoading" class="container py-5 text-center min-vh-100 d-flex flex-column justify-content-center">
      <div class="spinner-border text-danger" style="width: 3rem; height: 3rem;"></div>
      <p class="mt-3 text-secondary fw-medium">Đang tải thông tin sản phẩm...</p>
  </div>
  
  <div v-else-if="!product" class="container py-5 text-center min-vh-100 d-flex flex-column justify-content-center">
      <i class="bi bi-box-seam display-1 text-secondary mb-3 opacity-50"></i>
      <h3 class="fw-bold text-dark">Không tìm thấy sản phẩm</h3>
      <div><button class="btn btn-dark mt-3 px-4 rounded-0" @click="router.push('/products')">Quay lại cửa hàng</button></div>
  </div>
  
  <div v-else class="bg-white pb-5">
      <!-- BREADCRUMB -->
      <div class="border-bottom py-2 bg-light">
          <div class="container">
              <nav aria-label="breadcrumb">
                  <ol class="breadcrumb mb-0 small">
                      <li class="breadcrumb-item"><router-link to="/" class="text-decoration-none text-secondary">Trang chủ</router-link></li>
                      <li class="breadcrumb-item"><router-link to="/products" class="text-decoration-none text-secondary">{{ product.category }}</router-link></li>
                      <li class="breadcrumb-item active text-dark" aria-current="page">{{ product.name }}</li>
                  </ol>
              </nav>
          </div>
      </div>

      <div class="container mt-4">
          <div class="row g-5">
              <!-- CỘT TRÁI: HÌNH ẢNH SẢN PHẨM -->
              <div class="col-lg-6">
                  <div class="sticky-top" style="top: 90px; z-index: 1;">
                      <div class="border mb-3 d-flex align-items-center justify-content-center p-4 bg-white position-relative" style="height: 500px;">
                          <img :src="mainImage" class="img-fluid mix-blend-multiply object-fit-contain transition-all h-100 w-100" alt="Sản phẩm">
                      </div>
                      
                      <!-- Thumbnails -->
                      <div class="d-flex gap-2 overflow-auto pb-2 custom-scrollbar">
                          <div v-for="(img, idx) in allThumbnails" :key="idx"
                               class="border cursor-pointer thumbnail-box flex-shrink-0 bg-white"
                               :class="{'border-danger border-2': mainImage === img}"
                               @click="mainImage = img"
                               style="width: 80px; height: 80px;">
                              <img :src="img" class="w-100 h-100 object-fit-cover mix-blend-multiply p-1">
                          </div>
                      </div>
                  </div>
              </div>

              <!-- CỘT PHẢI: THÔNG TIN MUA HÀNG -->
              <div class="col-lg-6">
                  <h1 class="fs-4 fw-bold text-dark mb-2 lh-base">{{ product.name }}</h1>
                  <p class="text-secondary small mb-3">
                      Thương hiệu: <span class="text-primary fw-medium text-uppercase">SHOEGROUP</span>
                      <span class="mx-2">|</span> 
                      Mã sản phẩm: <span class="text-primary fw-medium">{{ product.id }}SG-26</span>
                  </p>

                  <div class="bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded-2 p-2 d-flex justify-content-between align-items-center mb-3">
                      <span class="text-danger fw-bold small"><i class="bi bi-fire me-1"></i> HOT SALE ĐỘC QUYỀN WEBSITE</span>
                      <span class="badge bg-danger rounded-pill px-3 py-1">Đã bán 104 sản phẩm</span>
                  </div>

                  <!-- Giá tiền -->
                  <div class="d-flex align-items-end gap-3 mb-1">
                      <span class="fs-2 fw-bold text-danger">{{ formatCurrency(product.price) }}</span>
                      <span class="text-decoration-line-through text-secondary fs-5">{{ formatCurrency(originalPrice) }}</span>
                      <span class="badge bg-danger rounded-1 mb-2">-20%</span>
                  </div>
                  <p class="text-danger small fw-medium mb-4">(Tiết kiệm {{ formatCurrency(originalPrice - product.price) }})</p>

                  <!-- Box Khuyến Mãi (Chuẩn E-commerce) -->
                  <div class="promo-box border p-3 position-relative mb-4">
                      <span class="bg-white text-danger fw-bold px-2 position-absolute" style="top: -10px; left: 15px; font-size: 0.85rem;">
                          <i class="bi bi-gift-fill me-1"></i> ƯU ĐÃI HÔM NAY
                      </span>
                      <ul class="list-unstyled small text-dark mb-0 mt-2 lh-lg">
                          <li>1) Từ 01/07 - 31/7/2026, khi mua hàng tại website:</li>
                          <li class="ms-3">- Hóa đơn từ 1,199,000vnđ tặng ngay 01 Tất thể thao</li>
                          <li class="ms-3">- Hóa đơn từ 1,999,000vnđ tặng ngay 01 Mũ thể thao</li>
                          <li class="ms-3">- Tặng túi Tote cho đơn hàng giày.</li>
                      </ul>
                  </div>

                  <!-- Chọn Kích thước -->
                  <div class="mb-4">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                          <span class="fw-bold">Kích thước: <span class="fw-normal text-danger">{{ selectedSize }}</span></span>
                          <a href="#" class="text-dark small text-decoration-underline hover-danger">Hướng dẫn chọn size</a>
                      </div>
                      <div class="d-flex flex-wrap gap-2">
                          <button v-for="size in availableSizes" :key="size"
                                  class="btn size-btn rounded-0"
                                  :class="selectedSize === size ? 'border-dark border-2 fw-bold text-dark' : 'border-secondary text-secondary'"
                                  @click="selectedSize = size">
                              {{ size }}
                          </button>
                      </div>
                  </div>

                  <!-- Thêm giỏ hàng / Mua ngay -->
                  <div class="d-flex gap-3 mb-3">
                      <div class="input-group rounded-0" style="width: 130px; height: 50px;">
                          <button class="btn btn-outline-secondary rounded-0 fs-5" @click="decreaseQuantity">-</button>
                          <input type="text" class="form-control text-center border-secondary fw-bold rounded-0" :value="quantity" readonly>
                          <button class="btn btn-outline-secondary rounded-0 fs-5" @click="increaseQuantity">+</button>
                      </div>
                      <button class="btn btn-outline-danger fw-bold text-uppercase border-2 rounded-0 flex-grow-1" @click="handleAddToCart">
                          Thêm Vào Giỏ
                      </button>
                  </div>
                  
                  <button class="btn btn-danger w-100 fw-bold fs-5 py-3 rounded-0 text-uppercase mb-4 shadow-sm" @click="handleBuyNow">
                      Mua Ngay
                  </button>
                  
                  <p class="text-center small text-secondary">Gọi đặt mua / Zalo <strong>0375.990.871</strong> (9:00 - 17:00)<br></p>

                  <div class="d-flex justify-content-around text-center text-secondary small border-top pt-4 mt-4">
                      <div><i class="bi bi-truck fs-4 d-block text-danger mb-1"></i> Giao hàng<br>miễn phí</div>
                      <div><i class="bi bi-arrow-repeat fs-4 d-block text-danger mb-1"></i> Hỗ trợ đổi size<br>sản phẩm</div>
                      <div><i class="bi bi-shield-check fs-4 d-block text-danger mb-1"></i> Cam kết<br>chính hãng</div>
                  </div>
              </div>
          </div>
      </div>

      <!-- PHẦN MÔ TẢ CHI TIẾT & ẢNH MASONRY -->
      <div class="container mt-5 pt-5 border-top">
          <div class="row g-5">
              <!-- Hình ảnh chi tiết dạng Masonry bên trái -->
              <div class="col-lg-7 order-2 order-lg-1">
                  <!-- MASONRY LAYOUT LƯỚI TỔ ONG -->
                  <div v-if="galleryImages.length > 0" class="masonry-gallery">
                      <div v-for="(img, idx) in galleryImages" :key="idx" class="masonry-item mb-3">
                          <img :src="img" class="w-100 border object-fit-cover mix-blend-multiply bg-light shadow-sm" alt="Hình chi tiết" loading="lazy">
                      </div>
                  </div>
                  
                  <!-- Trạng thái trống chờ quản trị viên thêm -->
                  <div v-else class="alert alert-light border border-dashed text-center text-secondary py-5 fst-italic rounded-0 h-100 d-flex flex-column justify-content-center">
                      <i class="bi bi-images display-1 mb-3 opacity-25"></i>
                      Chưa có hình ảnh mô tả chi tiết cho sản phẩm này.<br>Các hình ảnh sẽ được tự động lấp đầy ngăn nắp tại đây khi có dữ liệu.
                  </div>
              </div>

              <!-- Nội dung mô tả bên phải -->
              <div class="col-lg-5 order-1 order-lg-2">
                  <div class="sticky-top" style="top: 100px;">
                      <h4 class="fw-bold text-uppercase mb-4 border-bottom pb-2">Mô tả sản phẩm</h4>
                      <h6 class="fw-bold lh-base text-dark mb-3">{{ product.name }}</h6>
                      
                      <!-- Text Mô tả có xử lý Fallback khi trống -->
                      <div class="desc-content fs-6 text-secondary lh-lg text-justify mb-5" style="white-space: pre-wrap;">
                          <template v-if="product.description">{{ product.description }}</template>
                          <div v-else class="alert alert-light border border-dashed text-center text-secondary py-4 fst-italic rounded-0">
                              <i class="bi bi-card-text fs-2 d-block mb-2 opacity-50"></i>
                              Chưa có nội dung bài viết mô tả chi tiết.<br>Bạn có thể cập nhật trong trang Quản trị viên (Admin).
                          </div>
                      </div>

                      <h6 class="fw-bold text-uppercase mb-3">Thông tin chi tiết</h6>
                      <table class="table table-borderless text-secondary small border-top pt-2">
                          <tbody>
                              <tr><td class="fw-bold ps-0" style="width: 100px;">Thương hiệu:</td><td>SHOEGROUP</td></tr>
                              <tr><td class="fw-bold ps-0">Dòng giày:</td><td>Daily Trainer: Giày chạy bộ hàng ngày</td></tr>
                              <tr><td class="fw-bold ps-0">Màu sắc:</td><td>Phiên bản tiêu chuẩn</td></tr>
                              <tr><td class="fw-bold ps-0">Bề mặt:</td><td>Khuôn giày form rộng, thân giày sợi thoáng khí công nghệ cao.</td></tr>
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      </div>

      <!-- PHẦN SẢN PHẨM CÙNG LOẠI -->
      <div class="container mt-5 pt-5 border-top">
          <div class="d-flex justify-content-between align-items-center mb-4">
              <h4 class="fw-bold text-uppercase m-0">Sản phẩm cùng loại</h4>
              <button class="btn btn-outline-dark rounded-0 px-4" @click="router.push(`/products?category=${product.category_id}`)">Xem thêm</button>
          </div>
          <div v-if="relatedProducts.length > 0" class="row row-cols-2 row-cols-md-4 g-4">
              <div class="col" v-for="rel in relatedProducts" :key="rel.id">
                  <ShoeCard :product="rel" />
              </div>
          </div>
          <div v-else class="alert alert-light border text-center text-secondary py-4 fst-italic rounded-0">
              Hiện chưa có sản phẩm cùng loại nào trong danh mục này.
          </div>
      </div>
  </div>
</template>

<style scoped>
.mix-blend-multiply { mix-blend-mode: multiply; }
.text-justify { text-align: justify; }
.border-dashed { border-style: dashed !important; border-width: 2px !important; border-color: #dc3545 !important; }
.cursor-pointer { cursor: pointer; }
.transition-all { transition: all 0.3s ease; }
.hover-danger:hover { color: #dc3545 !important; }

/* Box Khuyến Mãi viền đứt nét đỏ */
.promo-box {
    border-style: dashed !important;
    border-color: #dc3545 !important;
    border-width: 2px !important;
}

/* Các Nút Size Vuông Vức Chuẩn E-Commerce */
.size-btn {
    min-width: 60px;
    height: 40px;
    border: 1px solid #dee2e6;
}
.size-btn:hover { border-color: #212529; }

/* Scrollbar Thumnails nhỏ */
.custom-scrollbar::-webkit-scrollbar { height: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #ccc;
    border-radius: 4px;
}

/* ====================================================================
   MASONRY GALLERY CSS (Tự dàn ảnh ngang dọc thông minh không bị méo)
   ==================================================================== */
.masonry-gallery {
    column-count: 2; /* Desktop chia 2 cột */
    column-gap: 1rem;
}
.masonry-item {
    break-inside: avoid; /* Ngăn không cho 1 bức ảnh bị bẻ gãy nửa qua 2 cột */
    display: inline-block;
    width: 100%;
}

/* Responsive Điện Thoại - Tự gom lại thành 1 cột */
@media (max-width: 768px) {
    .masonry-gallery {
        column-count: 1; 
    }
}
</style>