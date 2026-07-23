<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  window.scrollTo(0, 0)
})
</script>

<template>
  <div class="contact-page">
    <!-- Hero Section -->
    <section class="contact-hero">
      <img src="https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&q=80&w=2000" alt="ShoeGroup HQ" class="hero-bg">
      <div class="hero-overlay"></div>
      <div class="container-fluid px-4 hero-content fade-in-up">
        <h1 class="display-title">LIÊN HỆ CHÚNG TÔI</h1>
        <p class="hero-sub">Trụ sở không gian mở tại trung tâm mua sắm hàng đầu. Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn mọi lúc, mọi nơi.</p>
      </div>
    </section>

    <!-- Main Content -->
    <section class="container-fluid px-4 py-5" style="margin-top: -80px; position: relative; z-index: 10; max-width: 1200px;">
      <div class="row g-5">
        <!-- Info Cards -->
        <div class="col-lg-5 fade-in-up" style="animation-delay: 0.1s">
          <div class="info-card mb-4">
            <div class="icon-wrap"><i class="bi bi-geo-alt"></i></div>
            <div>
              <h4 class="info-title">Trụ sở chính</h4>
              <p class="info-text">Tầng 99, Tháp ShoeGroup Landmark, Quận 1, TP. HCM</p>
            </div>
          </div>
          <div class="info-card mb-4">
            <div class="icon-wrap"><i class="bi bi-headset"></i></div>
            <div>
              <h4 class="info-title">Hotline hỗ trợ</h4>
              <p class="info-text">Zalo/Phone: <strong>0375.990.871</strong><br>(Phục vụ 24/7)</p>
            </div>
          </div>
          <div class="info-card">
            <div class="icon-wrap"><i class="bi bi-envelope"></i></div>
            <div>
              <h4 class="info-title">Email phản hồi</h4>
              <p class="info-text">contact@shoegroup.vn</p>
            </div>
          </div>
        </div>

        <!-- Minimal Form -->
        <div class="col-lg-7 fade-in-up" style="animation-delay: 0.3s">
          <div class="contact-form">
            <h3 class="form-title mb-4">GỬI TIN NHẮN CHO CHÚNG TÔI</h3>
            <div class="sg-title-bar mb-4"></div>
            <form @submit.prevent>
              <div class="row g-4">
                <div class="col-md-6">
                  <label class="form-label">HỌ VÀ TÊN</label>
                  <input type="text" class="sg-input w-100" placeholder="Nguyễn Văn A">
                </div>
                <div class="col-md-6">
                  <label class="form-label">EMAIL HOẶC SỐ ĐIỆN THOẠI</label>
                  <input type="text" class="sg-input w-100" placeholder="you@example.com">
                </div>
                <div class="col-12">
                  <label class="form-label">NỘI DUNG</label>
                  <textarea class="sg-input w-100" rows="5" placeholder="Chia sẻ ý kiến hoặc vấn đề của bạn..."></textarea>
                </div>
                <div class="col-12 mt-4">
                  <button type="submit" class="btn-sg w-100 py-3">GỬI TIN NHẮN</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.contact-page { 
  background: #ffffff; 
  min-height: 100vh; 
  padding-bottom: 80px; 
}

/* Hero */
.contact-hero { 
  position: relative; 
  height: 55vh; 
  min-height: 450px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  text-align: center; 
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
  background: rgba(10, 10, 10, 0.7); 
}
.hero-content { 
  position: relative; 
  z-index: 2; 
  max-width: 800px; 
  color: #fff; 
}
.display-title { 
  font-size: clamp(2.5rem, 5vw, 4rem); 
  font-weight: 700; 
  line-height: 1.1; 
  letter-spacing: 0.05em; 
  margin-bottom: 16px; 
}
.hero-sub { 
  font-size: 1.1rem; 
  color: rgba(255,255,255,0.85); 
  line-height: 1.6; 
  margin: 0 auto; 
  max-width: 600px; 
}

/* Info Cards */
.info-card { 
  display: flex; 
  align-items: flex-start; 
  gap: 20px; 
  background: #fff; 
  border: 1px solid #e5e5e5; 
  border-radius: 4px; 
  padding: 32px; 
  transition: transform 0.2s, border-color 0.2s; 
}
.info-card:hover { 
  transform: translateX(4px); 
  border-color: #1a1a1a; 
}
.icon-wrap { 
  width: 48px; 
  height: 48px; 
  background: #1a1a1a; 
  color: #fff; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-size: 1.4rem; 
  flex-shrink: 0; 
}
.info-title {
  font-weight: 700;
  font-size: 1.05rem;
  margin-bottom: 8px;
  color: #1a1a1a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.info-text {
  color: #555;
  margin-bottom: 0;
  line-height: 1.5;
  font-size: 0.95rem;
}

/* Form */
.contact-form { 
  background: #ffffff; 
  border: 1px solid #e5e5e5; 
  border-radius: 4px; 
  padding: 48px; 
  position: relative; 
}
.form-title {
  font-weight: 700;
  font-size: 1.25rem;
  letter-spacing: 0.1em;
  color: #1a1a1a;
}
.form-label {
  font-weight: 600;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  color: #1a1a1a;
  margin-bottom: 8px;
}

@media (max-width: 768px) {
  .contact-hero { height: 45vh; }
}
</style>
