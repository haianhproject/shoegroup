<template>
  <div class="page-container">
    <!-- Header -->
    <header class="header">
      <div class="logo">ShoeGroup</div>
      
      <div class="search-container">
        <div class="search-box">
          <input type="text" placeholder="Tìm kiếm sản phẩm..." class="search-input" />
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
      </div>

      <nav class="nav-menu">
        <a href="#" class="nav-link">Trang chủ</a>
        <a href="#" class="nav-link active">Sản phẩm</a>
        <div class="nav-actions">
          <button class="icon-btn">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </button>
          <button class="icon-btn cart-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <span class="cart-badge">0</span>
          </button>
        </div>
      </nav>
    </header>

    <main class="main-content">
      <!-- Breadcrumb -->
      <div class="breadcrumb">
        <a href="#">Trang chủ</a>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        <a href="#">Sản phẩm</a>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        <span class="current-page">{{ product.product_name }}</span>
      </div>

      <div class="product-layout">
        
        <!-- Cột trái: Khu vực Hình ảnh -->
        <div class="left-col">
          <!-- Ảnh chính lớn -->
          <div class="main-image-box">
            <img :src="selectedImage" :alt="product.product_name" class="main-image" />
            <div class="badge-new">Mới</div>
          </div>
          
          <!-- Thumbnail list -->
          <div class="thumbnail-list">
            <button 
              v-for="(img, index) in product.images" 
              :key="index"
              @click="selectedImage = img"
              :class="['thumbnail-btn', selectedImage === img ? 'active' : '']"
            >
              <img :src="img" :alt="`Thumbnail ${index + 1}`" />
            </button>
          </div>
        </div>

        <!-- Cột phải: Thông tin sản phẩm & Các Action -->
        <div class="right-col">
          <div class="brand-name">{{ product.brand }}</div>
          <h1 class="product-title">{{ product.product_name }}</h1>
          <p class="product-price">${{ product.price.toFixed(2) }}</p>

          <div class="product-options">
            
            <!-- Chọn Size -->
            <div class="option-group">
              <div class="option-header">
                <h3>Chọn Size: <span>{{ currentSizeName }}</span></h3>
                <button class="text-link">Bảng kích cỡ</button>
              </div>
              <div class="size-list">
                <button
                  v-for="size in availableSizes"
                  :key="size.id_size"
                  @click="selectedSize = size.id_size"
                  :class="['size-btn', selectedSize === size.id_size ? 'active' : '']"
                >
                  {{ size.size_name }}
                </button>
              </div>
            </div>

            <!-- Chọn Màu -->
            <div class="option-group">
              <div class="option-header">
                <h3>Chọn Màu: <span>{{ currentColorName }}</span></h3>
              </div>
              <div class="color-list">
                <button
                  v-for="color in availableColors"
                  :key="color.id_color"
                  @click="selectedColor = color.id_color"
                  :class="['color-btn', selectedColor === color.id_color ? 'active' : '']"
                >
                  <div class="color-circle" :style="{ backgroundColor: color.hex }" :title="color.color_name"></div>
                </button>
              </div>
            </div>

            <!-- Số lượng -->
            <div class="option-group">
              <div class="option-header">
                <h3>Số lượng</h3>
              </div>
              <div class="quantity-selector">
                <button @click="handleDecreaseQuantity" class="qty-btn">-</button>
                <div class="qty-value">{{ quantity }}</div>
                <button @click="handleIncreaseQuantity" class="qty-btn">+</button>
              </div>
            </div>

            <!-- Nút Thêm giỏ hàng -->
            <button @click="handleAddToCart" class="add-to-cart-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              THÊM VÀO GIỎ HÀNG
            </button>

            <!-- Mô tả -->
            <div class="product-description">
              <h3>Chi tiết sản phẩm</h3>
              <p>{{ product.description }}</p>
              <ul>
                <li><span class="check-icon">✓</span> Thương hiệu: <strong>{{ product.brand }}</strong></li>
                <li><span class="check-icon">✓</span> Phù hợp cho chạy bộ và các hoạt động thể thao.</li>
                <li><span class="check-icon">✓</span> Chất liệu dệt kim siêu thoáng khí.</li>
                <li><span class="check-icon">✓</span> Đế đệm Zoom Air êm ái tối đa.</li>
              </ul>
            </div>

          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-grid">
        <div class="footer-col">
          <div class="footer-logo">ShoeGroup</div>
          <p>Hệ thống phân phối giày sneaker chính hãng hàng đầu. Cung cấp sản phẩm chất lượng với dịch vụ tuyệt vời nhất.</p>
        </div>
        <div class="footer-col">
          <h4>Về ShoeGroup</h4>
          <ul>
            <li><a href="#">Giới thiệu</a></li>
            <li><a href="#">Tuyển dụng</a></li>
            <li><a href="#">Tin tức</a></li>
            <li><a href="#">Hệ thống cửa hàng</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Chính sách</h4>
          <ul>
            <li><a href="#">Chính sách bảo mật</a></li>
            <li><a href="#">Chính sách đổi trả</a></li>
            <li><a href="#">Điều khoản dịch vụ</a></li>
            <li><a href="#">Giao hàng & Nhận hàng</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Kết nối với chúng tôi</h4>
          <div class="social-links">
            <a href="#" class="social-btn">FB</a>
            <a href="#" class="social-btn">IG</a>
            <a href="#" class="social-btn">YT</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        &copy; 2024 ShoeGroup. All rights reserved. Designed with passion.
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const MOCK_DATA = {
  product: {
    id_product: 1,
    product_name: "Nike Air Zoom Pegasus 39",
    price: 120.00,
    description: "Giày chạy bộ chuyên nghiệp mang tính biểu tượng của Nike, sở hữu thiết kế siêu nhẹ, thoáng khí và phần đế mềm mại đàn hồi tốt giúp bạn luôn thoải mái trên mọi hành trình.",
    brand: "Nike",
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80",
      "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80",
      "https://images.unsplash.com/photo-1552346154-21d32810baa3?w=800&q=80"
    ]
  },
  availableSizes: [
    { id_size: 1, size_name: "39" },
    { id_size: 2, size_name: "40" },
    { id_size: 3, size_name: "41" },
    { id_size: 4, size_name: "42" }
  ],
  availableColors: [
    { id_color: 1, color_name: "Đỏ cá tính", hex: "#dc2626" },
    { id_color: 2, color_name: "Đen tuyền", hex: "#171717" },
    { id_color: 3, color_name: "Trắng tinh khôi", hex: "#f8f9fa" }
  ]
};

const product = MOCK_DATA.product;
const availableSizes = MOCK_DATA.availableSizes;
const availableColors = MOCK_DATA.availableColors;

const selectedImage = ref(product.images[0]);
const selectedSize = ref(availableSizes[1].id_size);
const selectedColor = ref(availableColors[0].id_color);
const quantity = ref(1);

const currentSizeName = computed(() => {
  return availableSizes.find(s => s.id_size === selectedSize.value)?.size_name;
});

const currentColorName = computed(() => {
  return availableColors.find(c => c.id_color === selectedColor.value)?.color_name;
});

const handleIncreaseQuantity = () => {
  quantity.value++;
};

const handleDecreaseQuantity = () => {
  if (quantity.value > 1) {
    quantity.value--;
  }
};

const handleAddToCart = () => {
  alert(`Đã thêm ${quantity.value} sản phẩm ${product.product_name}\nSize: ${currentSizeName.value} | Màu: ${currentColorName.value}\nVào giỏ hàng thành công! 🎉`);
};
</script>

<style scoped>
/* Reset cơ bản cho component này */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.page-container {
  min-height: 100vh;
  background-color: #fafafa;
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  display: flex;
  flex-direction: column;
}

/* --- HEADER --- */
.header {
  background-color: #fff;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eaeaea;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
}

.logo {
  font-size: 1.5rem;
  font-weight: 900;
  color: #111;
  cursor: pointer;
  transition: color 0.2s;
}
.logo:hover { color: #dc2626; }

.search-container {
  flex: 1;
  max-width: 600px;
  margin: 0 2rem;
}

.search-box {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1.2rem 0.75rem 2.8rem;
  border: 1px solid #e5e5e5;
  border-radius: 999px;
  outline: none;
  background-color: #f9f9f9;
  transition: all 0.3s;
  font-size: 0.95rem;
}
.search-input:focus {
  background-color: #fff;
  border-color: #111;
  box-shadow: 0 0 0 1px #111;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-link {
  text-decoration: none;
  color: #555;
  font-weight: 600;
  font-size: 0.95rem;
  transition: color 0.2s;
}
.nav-link:hover { color: #111; }
.nav-link.active {
  color: #111;
  border-bottom: 2px solid #111;
  padding-bottom: 0.25rem;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  border-left: 1px solid #eaeaea;
  padding-left: 1.5rem;
}

.icon-btn {
  background: none;
  border: none;
  color: #555;
  cursor: pointer;
  transition: transform 0.2s, color 0.2s;
}
.icon-btn:hover {
  color: #111;
  transform: scale(1.1);
}

.cart-btn {
  position: relative;
}

.cart-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #dc2626;
  color: white;
  font-size: 0.65rem;
  font-weight: bold;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

/* --- MAIN CONTENT --- */
.main-content {
  flex-grow: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 2rem;
}
.breadcrumb a {
  color: #888;
  text-decoration: none;
  transition: color 0.2s;
}
.breadcrumb a:hover { color: #111; }
.current-page {
  color: #111;
  font-weight: 600;
}

.product-layout {
  display: flex;
  gap: 3rem;
  background-color: #fff;
  padding: 2.5rem;
  border-radius: 2rem;
  box-shadow: 0 10px 40px rgba(0,0,0,0.04);
}

/* Cột Trái */
.left-col {
  width: 50%;
  display: flex;
  flex-direction: column;
}

.main-image-box {
  width: 100%;
  aspect-ratio: 1;
  background-color: #f8f8f8;
  border-radius: 1.5rem;
  overflow: hidden;
  margin-bottom: 1rem;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  mix-blend-mode: multiply;
  transition: transform 0.5s ease;
}
.main-image-box:hover .main-image {
  transform: scale(1.08);
}

.badge-new {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: rgba(255,255,255,0.9);
  padding: 0.3rem 0.8rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: bold;
  color: #111;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.thumbnail-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.thumbnail-btn {
  aspect-ratio: 1;
  background-color: #f8f8f8;
  border: 2px solid transparent;
  border-radius: 1rem;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
  opacity: 0.7;
}
.thumbnail-btn:hover {
  opacity: 1;
  transform: scale(1.05);
}
.thumbnail-btn.active {
  opacity: 1;
  border-color: #111;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}
.thumbnail-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  mix-blend-mode: multiply;
}

/* Cột Phải */
.right-col {
  width: 50%;
  display: flex;
  flex-direction: column;
}

.brand-name {
  color: #dc2626;
  font-weight: 800;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
}

.product-title {
  font-size: 2.2rem;
  font-weight: 900;
  color: #111;
  line-height: 1.2;
  margin-bottom: 1rem;
}

.product-price {
  font-size: 2rem;
  font-weight: 700;
  color: #111;
  margin-bottom: 2rem;
}

.product-options {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 0.75rem;
}
.option-header h3 {
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #111;
}
.option-header span {
  font-weight: 400;
  color: #666;
  margin-left: 0.25rem;
}

.text-link {
  background: none;
  border: none;
  color: #666;
  font-size: 0.85rem;
  text-decoration: underline;
  cursor: pointer;
}
.text-link:hover { color: #111; }

.size-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.size-btn {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 0.75rem;
  border: 2px solid #eaeaea;
  background: #fff;
  font-size: 1rem;
  font-weight: 700;
  color: #555;
  cursor: pointer;
  transition: all 0.2s;
}
.size-btn:hover {
  border-color: #111;
  color: #111;
}
.size-btn.active {
  background-color: #111;
  border-color: #111;
  color: #fff;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.color-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.color-btn {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  border: 2px solid transparent;
  background: none;
  padding: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.color-btn:hover {
  border-color: #ccc;
}
.color-btn.active {
  border-color: #111;
  transform: scale(1.1);
}

.color-circle {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid #eaeaea;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
}

.quantity-selector {
  display: flex;
  width: 9rem;
  height: 3rem;
  border: 2px solid #eaeaea;
  border-radius: 0.75rem;
  overflow: hidden;
}

.qty-btn {
  flex: 1;
  background: #fff;
  border: none;
  font-size: 1.25rem;
  font-weight: bold;
  color: #555;
  cursor: pointer;
  transition: background 0.2s;
}
.qty-btn:hover { background: #f5f5f5; color: #111; }
.qty-btn:active { background: #eaeaea; }

.qty-value {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.1rem;
  border-left: 1px solid #eaeaea;
  border-right: 1px solid #eaeaea;
}

.add-to-cart-btn {
  width: 100%;
  padding: 1.25rem;
  background-color: #111;
  color: #fff;
  border: none;
  border-radius: 1rem;
  font-size: 1.1rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  cursor: pointer;
  margin-top: 1rem;
  transition: all 0.2s;
  box-shadow: 0 8px 20px rgba(0,0,0,0.15);
}
.add-to-cart-btn:hover {
  background-color: #222;
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}
.add-to-cart-btn:active {
  transform: translateY(0);
}

.product-description {
  margin-top: 1rem;
  padding-top: 2rem;
  border-top: 1px solid #eaeaea;
}

.product-description h3 {
  font-size: 1.2rem;
  font-weight: 800;
  margin-bottom: 1rem;
  color: #111;
}

.product-description p {
  color: #555;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.product-description ul {
  list-style: none;
}

.product-description li {
  margin-bottom: 0.75rem;
  color: #555;
  display: flex;
  align-items: flex-start;
}

.check-icon {
  color: #10b981;
  font-weight: bold;
  margin-right: 0.5rem;
}

/* --- FOOTER --- */
.footer {
  background-color: #0a0a0a;
  color: #fff;
  padding: 4rem 2rem 2rem;
  margin-top: 4rem;
}

.footer-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3rem;
  margin-bottom: 3rem;
}

.footer-logo {
  font-size: 2rem;
  font-weight: 900;
  margin-bottom: 1rem;
}

.footer-col p {
  color: #888;
  line-height: 1.6;
  font-size: 0.9rem;
}

.footer-col h4 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.footer-col ul {
  list-style: none;
}

.footer-col li {
  margin-bottom: 0.75rem;
}

.footer-col a {
  color: #888;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}
.footer-col a:hover {
  color: #fff;
}

.social-links {
  display: flex;
  gap: 1rem;
}

.social-btn {
  width: 2.5rem;
  height: 2.5rem;
  background-color: #222;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-weight: bold;
  font-size: 0.8rem;
  transition: background 0.2s;
}
.social-btn:hover { background-color: #dc2626; }

.footer-bottom {
  max-width: 1200px;
  margin: 0 auto;
  border-top: 1px solid #222;
  padding-top: 2rem;
  text-align: center;
  color: #666;
  font-size: 0.85rem;
}

/* Responsive cơ bản cho Mobile/Tablet */
@media (max-width: 900px) {
  .product-layout {
    flex-direction: column;
    padding: 1.5rem;
  }
  .left-col, .right-col {
    width: 100%;
  }
  .footer-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .nav-menu { display: none; }
  .footer-grid { grid-template-columns: 1fr; }
  .product-title { font-size: 1.8rem; }
}
</style>
