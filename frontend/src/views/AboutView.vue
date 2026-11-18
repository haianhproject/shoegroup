<!-- Mục đích: Trang giới thiệu thương hiệu, câu chuyện và giá trị của ShoeGroup. -->
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
      <img
        src="https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&q=80&w=2000"
        alt="ShoeGroup Vision"
        class="hero-bg"
      />
      <div class="hero-overlay"></div>
      <div class="w-full px-4 hero-content">
        <span class="badge-premium">SINCE 2010 • ARCHIVE & INNOVATION</span>
        <h1 class="display-title">ĐỊNH HÌNH LẠI VĂN HOÁ<br>SÁT MẶT ĐẤT</h1>
        <p class="hero-sub">ShoeGroup không chỉ bán giày. Chúng tôi kiến tạo những di sản vượt thời gian, nơi công nghệ tiên tiến hòa quyện cùng nghệ thuật thiết kế đỉnh cao.</p>
        <button class="btn-about-cta mt-6 inline-flex items-center gap-2" @click="$router.push('/products')">
          <span>KHÁM PHÁ BỘ SƯU TẬP</span>
          <svg class="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="max-w-[1200px] mx-auto px-4 -mt-12 relative z-10">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 stats-grid">
        <div class="stat-card">
          <h2 class="stat-num">5M+</h2>
          <p class="stat-text">Khách hàng tin tưởng</p>
        </div>
        <div class="stat-card">
          <h2 class="stat-num">120+</h2>
          <p class="stat-text">Cửa hàng toàn quốc</p>
        </div>
        <div class="stat-card">
          <h2 class="stat-num">50+</h2>
          <p class="stat-text">Bằng sáng chế đệm</p>
        </div>
        <div class="stat-card">
          <h2 class="stat-num">100%</h2>
          <p class="stat-text">Chính hãng cam kết</p>
        </div>
      </div>
    </section>

    <!-- Vision & Technology Section -->
    <section class="max-w-[1200px] mx-auto px-4 py-16">
      <div class="grid grid-cols-1 lg:grid-cols-12 items-center gap-10">
        <div class="lg:col-span-6">
          <div class="vision-img-wrap">
            <img
              src="https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=1000"
              alt="Technology"
              class="vision-img"
            />
            <div class="vision-floating-pill">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span class="text-xs font-bold tracking-wider text-slate-900">LAB RESEARCH 2026</span>
            </div>
          </div>
        </div>

        <div class="lg:col-span-6">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-6 h-0.5 bg-[#D4001A]"></span>
            <span class="text-xs font-bold uppercase tracking-wider text-[#D4001A]">CÔNG NGHỆ TIÊN PHONG</span>
          </div>
          <h2 class="section-title mb-4">CÔNG NGHỆ ĐỘC QUYỀN<br>VƯƠN TẦM THẾ GIỚI</h2>
          <p class="text-slate-600 mb-6 leading-relaxed">
            Mỗi đôi giày tại ShoeGroup được nghiên cứu tỉ mỉ, tích hợp vật liệu cao cấp và công nghệ phản hồi năng lượng ưu việt. Thiết kế không chỉ tôn vinh tính thẩm mỹ đường phố mà còn đem lại độ êm ái tối đa cho từng bước chuyển động.
          </p>

          <div class="flex flex-col gap-4">
            <div class="vision-item">
              <div class="vision-ic">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div>
                <h4 class="text-sm font-bold text-slate-900 mb-0.5">Đế đệm CloudX-9 đa chiều</h4>
                <p class="text-xs text-slate-500 mb-0">Hấp thụ lực chấn động đến 92%, đàn hồi vượt trội suốt ngày dài.</p>
              </div>
            </div>

            <div class="vision-item">
              <div class="vision-ic">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div>
                <h4 class="text-sm font-bold text-slate-900 mb-0.5">Sợi vải Titan-Weave siêu nhẹ</h4>
                <p class="text-xs text-slate-500 mb-0">Kháng nước bề mặt, thông thoáng khí và bền bỉ trong mọi điều kiện.</p>
              </div>
            </div>

            <div class="vision-item">
              <div class="vision-ic">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div>
                <h4 class="text-sm font-bold text-slate-900 mb-0.5">Form dáng công thái học (Ergonomic)</h4>
                <p class="text-xs text-slate-500 mb-0">Tối ưu chuẩn tỷ lệ bàn chân người Việt, ôm khít mà không gây cộm bó.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3 Core Pillars -->
    <section class="bg-slate-50 py-16 border-y border-slate-200">
      <div class="max-w-[1200px] mx-auto px-4">
        <div class="text-center max-w-2xl mx-auto mb-12">
          <span class="text-xs font-bold tracking-widest text-[#D4001A] uppercase">GIÁ TRỊ CỐT LÕI</span>
          <h2 class="font-serif font-bold text-3xl text-slate-900 mt-2">TRIẾT LÝ SÁNG TẠO</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="pillar-card">
            <div class="pillar-icon">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v20" />
                <path d="m17 5-5-3-5 3" />
                <path d="m17 19-5 3-5-3" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <h3 class="font-bold text-lg text-slate-900 mb-2">Đẳng cấp nguyên bản</h3>
            <p class="text-sm text-slate-600 leading-relaxed mb-0">Mỗi sản phẩm xuất xưởng đều trải qua quy trình kiểm định 12 bước nghiêm ngặt về chất lượng vật liệu và đường chỉ.</p>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 13.5 7.78L21 21l-1.22-4.5A9 9 0 0 0 12 3Z" />
              </svg>
            </div>
            <h3 class="font-bold text-lg text-slate-900 mb-2">Đồng hành phong cách</h3>
            <p class="text-sm text-slate-600 leading-relaxed mb-0">Chúng tôi cập nhật xu hướng sneaker toàn cầu nhanh nhất, giúp bạn luôn tự tin khẳng định cá tính riêng.</p>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              </svg>
            </div>
            <h3 class="font-bold text-lg text-slate-900 mb-2">Bảo chứng trọn đời</h3>
            <p class="text-sm text-slate-600 leading-relaxed mb-0">Chính sách đổi hàng trong 30 ngày, bảo hành keo chỉ 12 tháng cùng đội ngũ chăm sóc tận tâm 24/7.</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.about-page {
  background: #FFFFFF;
  min-height: 100vh;
  font-family: 'Be Vietnam Pro', sans-serif;
}

/* Hero */
.about-hero {
  position: relative;
  height: 70vh;
  min-height: 520px;
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
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%);
}
.hero-content {
  position: relative;
  z-index: 2;
  max-width: 820px;
  color: #FFFFFF;
  margin: 0 auto;
  text-align: center;
}
.badge-premium {
  display: inline-block;
  background: rgba(255, 255, 255, 0.12);
  color: #FFFFFF;
  border: 1px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(8px);
  padding: 6px 16px;
  border-radius: 9999px;
  font-weight: 700;
  letter-spacing: 0.12em;
  margin-bottom: 20px;
  font-size: 0.75rem;
}
.display-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(2.4rem, 5vw, 4rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin-bottom: 18px;
  color: #FFFFFF;
}
.hero-sub {
  font-size: 1.05rem;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.65;
  max-width: 660px;
  margin: 0 auto;
}
.btn-about-cta {
  background: #FFFFFF;
  color: #0F172A;
  font-weight: 700;
  font-size: 0.88rem;
  letter-spacing: 0.05em;
  padding: 14px 28px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}
.btn-about-cta:hover {
  background: #D4001A;
  color: #FFFFFF;
  transform: translateY(-2px);
  box-shadow: 0 15px 30px -5px rgba(212, 0, 26, 0.4);
}

/* Stats */
.stats-grid {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08);
}
.stat-card {
  text-align: center;
  padding: 16px;
  border-radius: 14px;
  transition: all 0.2s ease;
}
.stat-card:hover {
  background: #F8FAFC;
}
.stat-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 2.8rem;
  font-weight: 800;
  color: #0F172A;
  margin-bottom: 4px;
  letter-spacing: -0.03em;
}
.stat-card:hover .stat-num {
  color: #D4001A;
}
.stat-text {
  font-weight: 600;
  color: #64748B;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0;
}

/* Vision */
.vision-img-wrap {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  aspect-ratio: 4/5;
  background: #F1F5F9;
  box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.12);
}
.vision-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.vision-floating-pill {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  padding: 8px 16px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.15);
}
.section-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(1.8rem, 3.5vw, 2.3rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0F172A;
  line-height: 1.2;
}
.vision-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 12px 16px;
  border-radius: 16px;
  background: #F8FAFC;
  border: 1px solid #F1F5F9;
  transition: all 0.2s ease;
}
.vision-item:hover {
  background: #FFFFFF;
  border-color: #E2E8F0;
  box-shadow: 0 8px 20px -5px rgba(15, 23, 42, 0.06);
}
.vision-ic {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #FEE2E2;
  color: #D4001A;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

/* Core Pillars */
.pillar-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 20px;
  padding: 28px;
  transition: all 0.25s ease;
}
.pillar-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 35px -10px rgba(15, 23, 42, 0.08);
  border-color: #CBD5E1;
}
.pillar-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: #0F172A;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}
</style>
