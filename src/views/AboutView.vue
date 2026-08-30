<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  window.scrollTo(0, 0)
})
</script>

<template>
  <div class="about-page">
    <!-- Hero Section -->
    <section class="about-hero">
      <img src="https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&q=80&w=2000" alt="ShoeGroup Vision" class="hero-bg">
      <div class="hero-overlay"></div>
      <div class="container-fluid px-4 hero-content fade-in-up">
        <span class="badge-premium">SINCE 2010</span>
        <h1 class="display-title">ĐỊNH HÌNH LẠI VĂN HOÁ<br>SÁT MẶT ĐẤT</h1>
        <p class="hero-sub">ShoeGroup không chỉ bán giày. Chúng tôi kiến tạo những di sản vượt thời gian, nơi công nghệ tiên tiến hòa quyện cùng nghệ thuật thiết kế đỉnh cao.</p>
        <button class="btn-sg mt-4 btn-about-cta" @click="$router.push('/products')">KHÁM PHÁ BỘ SƯU TẬP <i class="bi bi-arrow-right ms-2"></i></button>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="container-fluid px-4 py-5 mt-4" style="max-width: 1200px; margin: 0 auto;">
      <div class="row g-4 text-center stats-row">
        <div class="col-6 col-md-3 stat-col">
          <h2 class="stat-num">5M+</h2>
          <p class="stat-text">Khách hàng</p>
        </div>
        <div class="col-6 col-md-3 stat-col">
          <h2 class="stat-num">120</h2>
          <p class="stat-text">Cửa hàng</p>
        </div>
        <div class="col-6 col-md-3 stat-col">
          <h2 class="stat-num">50+</h2>
          <p class="stat-text">Bằng sáng chế</p>
        </div>
        <div class="col-6 col-md-3 stat-col">
          <h2 class="stat-num">∞</h2>
          <p class="stat-text">Đam mê</p>
        </div>
      </div>
    </section>

    <!-- Vision Section -->
    <section class="container-fluid px-4 py-5" style="max-width: 1200px; margin: 0 auto;">
      <div class="row align-items-center g-5">
        <div class="col-lg-6 fade-in-up">
          <div class="vision-img-wrap">
            <img src="https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=1000" alt="Technology" class="vision-img">
          </div>
        </div>
        <div class="col-lg-6 fade-in-up" style="animation-delay: 0.2s">
          <div class="sg-title-bar"></div>
          <h2 class="section-title mb-4">CÔNG NGHỆ ĐỘC QUYỀN<br>VƯƠN TẦM THẾ GIỚI</h2>
          <p class="text-secondary mb-4" style="font-size: 1.1rem; line-height: 1.6;">
            Mỗi đôi giày tại ShoeGroup được nghiên cứu tỉ mỉ, tích hợp vật liệu cao cấp và công nghệ phản hồi năng lượng ưu việt. Thiết kế không chỉ tôn vinh tính thẩm mỹ mà còn đem lại hiệu suất tối đa.
          </p>
          <ul class="vision-list">
            <li><i class="bi bi-check2"></i> <span>Đế đệm CloudX-9 chịu lực bẻ cong đa chiều.</span></li>
            <li><i class="bi bi-check2"></i> <span>Sợi vải Titan-Weave siêu nhẹ, độ bền cực cao.</span></li>
            <li><i class="bi bi-check2"></i> <span>Thiết kế công thái học điều chỉnh theo form bàn chân.</span></li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.about-page { 
  background: #ffffff; 
  min-height: 100vh; 
  padding-bottom: 80px; 
}

/* Hero */
.about-hero { 
  position: relative; 
  height: 75vh; 
  min-height: 600px; 
  display: flex; 
  align-items: center; 
  overflow: hidden; 
}
.hero-bg { 
  position: absolute; 
  inset: 0; 
  width: 100%; 
  height: 100%; 
  object-fit: cover; 
}
.hero-overlay { 
  position: absolute; 
  inset: 0; 
  background: rgba(10, 10, 10, 0.75); 
}
.hero-content { 
  position: relative; 
  z-index: 2; 
  max-width: 800px; 
  color: #fff; 
  margin: 0 auto;
  text-align: center;
}
.badge-premium { 
  display: inline-block; 
  background: transparent; 
  color: #fff; 
  border: 1px solid #fff; 
  padding: 6px 16px; 
  border-radius: 0; 
  font-weight: 700; 
  letter-spacing: 0.15em; 
  margin-bottom: 24px; 
  font-size: 0.8rem; 
}
.btn-about-cta {
  background: #fff;
  color: #0A0A0A;
  border: 1px solid #fff;
  transition: all 0.3s ease;
}
.btn-about-cta:hover {
  background: transparent;
  color: #fff;
}
.btn-about-cta:hover i {
  transform: translateX(6px);
}
.btn-about-cta i {
  transition: transform 0.3s ease;
}
.display-title { 
  font-size: clamp(2.5rem, 5vw, 4.5rem); 
  font-weight: 800; 
  line-height: 1.1; 
  letter-spacing: 0.05em; 
  margin-bottom: 24px; 
  color: #ffffff !important;
  text-shadow: 0 2px 12px rgba(0,0,0,0.55);
}
.hero-sub { 
  font-size: 1.1rem; 
  color: rgba(255,255,255,0.92) !important; 
  line-height: 1.6; 
  max-width: 650px; 
  margin: 0 auto;
  text-shadow: 0 1px 6px rgba(0,0,0,0.4);
}

/* Stats */
.stats-row { 
  background: #fff; 
  border-top: 1px solid #e5e5e5; 
  border-bottom: 1px solid #e5e5e5; 
  padding: 60px 0; 
}
.stat-col {
  border-right: 1px solid #e5e5e5;
}
.stat-col:last-child {
  border-right: none;
}
.stat-num { 
  font-size: 3rem; 
  font-weight: 700; 
  color: #1a1a1a;
  margin-bottom: 8px; 
  letter-spacing: -0.02em;
}
.stat-text { 
  font-weight: 600; 
  color: #666; 
  font-size: 0.9rem; 
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0; 
}

/* Vision */
.vision-img-wrap { 
  position: relative; 
  border-radius: 4px; 
  overflow: hidden; 
  aspect-ratio: 4/5; 
  background: #f5f5f5;
}
.vision-img { 
  width: 100%; 
  height: 100%; 
  object-fit: cover; 
  position: relative; 
  z-index: 2; 
}

.section-title {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #1a1a1a;
  line-height: 1.2;
}

.vision-list { 
  list-style: none; 
  padding: 0; 
  margin-top: 32px; 
}
.vision-list li { 
  display: flex; 
  align-items: flex-start; 
  font-size: 1.05rem; 
  color: #1a1a1a; 
  margin-bottom: 20px; 
  line-height: 1.5;
}
.vision-list li i {
  color: #D4001A;
  font-size: 1.2rem;
  margin-right: 16px;
  font-weight: bold;
}

@media (max-width: 768px) {
  .about-hero { height: 60vh; }
  .display-title { font-size: 2rem; }
  .stat-num { font-size: 2rem; }
  .stat-col {
    border-right: none;
    border-bottom: 1px solid #e5e5e5;
    padding: 20px 0;
  }
  .stat-col:last-child {
    border-bottom: none;
  }
}
</style>
