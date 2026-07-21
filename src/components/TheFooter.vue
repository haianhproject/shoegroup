<script setup>
import BrandLogo from './BrandLogo.vue'
</script>

<template>
  <footer class="sg-footer">
    <!-- Wave divider -->
    <div class="footer-wave">
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 40 Q360 0 720 30 Q1080 60 1440 20 L1440 60 L0 60 Z" fill="#0e1e3d"/>
      </svg>
    </div>

    <div class="footer-body">
      <div class="container-fluid px-4">
        <div class="row gy-5">
          <!-- Brand column -->
          <div class="col-lg-4">
            <router-link to="/" class="footer-logo">
              <BrandLogo :size="44" :radius="13" />
              <span class="footer-logo-text">
                <span class="logo-shoe">shoe</span><span class="logo-group">group</span>
              </span>
            </router-link>
            <p class="footer-desc">Hệ thống phân phối giày thể thao nam chính hãng. Bứt phá phong cách — tự tin từng bước chạy.</p>
            <!-- Trust badges -->
            <div class="footer-badges">
              <div class="f-badge"><i class="bi bi-shield-check"></i><span>Chính hãng 100%</span></div>
              <div class="f-badge"><i class="bi bi-truck"></i><span>Giao 24h</span></div>
              <div class="f-badge"><i class="bi bi-arrow-repeat"></i><span>Đổi trả 14 ngày</span></div>
            </div>
            <!-- Socials -->
            <div class="footer-social">
              <a href="#" aria-label="Facebook"><i class="bi bi-facebook"></i></a>
              <a href="#" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
              <a href="#" aria-label="TikTok"><i class="bi bi-tiktok"></i></a>
              <a href="#" aria-label="YouTube"><i class="bi bi-youtube"></i></a>
            </div>
          </div>

          <!-- Links columns -->
          <div class="col-6 col-lg-2">
            <h6 class="footer-heading">Về ShoeGroup</h6>
            <ul class="footer-links">
              <li><router-link to="/"><i class="bi bi-chevron-right"></i>Giới thiệu</router-link></li>
              <li><router-link to="/products"><i class="bi bi-chevron-right"></i>Cửa hàng</router-link></li>
              <li><router-link to="/"><i class="bi bi-chevron-right"></i>Tin tức</router-link></li>
              <li><router-link to="/"><i class="bi bi-chevron-right"></i>Tuyển dụng</router-link></li>
            </ul>
          </div>

          <div class="col-6 col-lg-2">
            <h6 class="footer-heading">Chính sách</h6>
            <ul class="footer-links">
              <li><router-link to="/returns"><i class="bi bi-chevron-right"></i>Đổi trả hàng</router-link></li>
              <li><router-link to="/"><i class="bi bi-chevron-right"></i>Bảo mật</router-link></li>
              <li><router-link to="/"><i class="bi bi-chevron-right"></i>Giao & nhận hàng</router-link></li>
              <li><router-link to="/"><i class="bi bi-chevron-right"></i>Điều khoản sử dụng</router-link></li>
            </ul>
          </div>

          <div class="col-lg-3">
            <h6 class="footer-heading">Liên hệ</h6>
            <ul class="footer-contact">
              <li><i class="bi bi-geo-alt-fill"></i><span>Số 1 Lê Duẩn, Hoàn Kiếm, Hà Nội</span></li>
              <li><i class="bi bi-telephone-fill"></i><a href="tel:0375990871">0375.990.871</a></li>
              <li><i class="bi bi-envelope-fill"></i><a href="mailto:support@shoegroup.vn">support@shoegroup.vn</a></li>
              <li><i class="bi bi-clock-fill"></i><span>Hỗ trợ 9:00 – 21:00 mỗi ngày</span></li>
            </ul>
          </div>
        </div>

        <!-- Bottom bar -->
        <div class="footer-bottom">
          <span>© {{ new Date().getFullYear() }} ShoeGroup. Tất cả các quyền được bảo lưu.</span>
          <div class="footer-bottom-right">
            <span>Thiết kế bởi</span>
            <span class="footer-brand-tag">ShoeGroup Team</span>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* ====== Footer shell ====== */
.sg-footer {
  background: #0e1e3d;
  color: rgba(255, 255, 255, 0.72);
  margin-top: auto;
  position: relative;
}

.footer-wave {
  line-height: 0;
  overflow: hidden;
}
.footer-wave svg {
  width: 100%;
  height: 60px;
  display: block;
}

.footer-body {
  padding: 52px 0 0;
}

/* ====== Logo ====== */
.footer-logo {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  text-decoration: none;
  margin-bottom: 14px;
}
.footer-logo-text {
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: -.025em;
  line-height: 1;
}
.logo-shoe  { color: #fff; }
.logo-group { color: var(--sg-navy-light, #7dacd4); }

.footer-desc {
  font-size: .9rem;
  line-height: 1.75;
  max-width: 310px;
  margin-top: 8px;
  color: rgba(255,255,255,.62);
}

/* ====== Trust badges ====== */
.footer-badges {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 18px 0;
}
.f-badge {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: .85rem;
  font-weight: 600;
  color: rgba(255,255,255,.80);
}
.f-badge i {
  width: 30px; height: 30px;
  background: rgba(125, 172, 212, .15);
  border: 1px solid rgba(125, 172, 212, .25);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: #7dacd4;
  flex-shrink: 0;
}

/* ====== Social links ====== */
.footer-social {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}
.footer-social a {
  width: 40px; height: 40px;
  border-radius: 11px;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.12);
  color: rgba(255,255,255,.75);
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem;
  transition: all .22s;
  text-decoration: none;
}
.footer-social a:hover {
  background: var(--sg-navy-mid, #3b6fb5);
  border-color: transparent;
  color: #fff;
  transform: translateY(-3px);
  box-shadow: 0 6px 18px rgba(59,111,181,.4);
}

/* ====== Headings ====== */
.footer-heading {
  color: #fff;
  font-weight: 800;
  font-size: .95rem;
  letter-spacing: .03em;
  text-transform: uppercase;
  margin-bottom: 18px;
  position: relative;
  padding-bottom: 10px;
}
.footer-heading::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  width: 30px; height: 2.5px;
  border-radius: 99px;
  background: #7dacd4;
}

/* ====== Links ====== */
.footer-links {
  list-style: none;
  padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 10px;
}
.footer-links li a {
  color: rgba(255,255,255,.65);
  text-decoration: none;
  font-size: .9rem;
  font-weight: 500;
  transition: all .2s;
  display: flex; align-items: center; gap: 6px;
}
.footer-links li a i {
  font-size: .65rem;
  color: #7dacd4;
  transition: transform .2s;
}
.footer-links li a:hover {
  color: #fff;
  padding-left: 4px;
}
.footer-links li a:hover i { transform: translateX(3px); }

/* ====== Contact list ====== */
.footer-contact {
  list-style: none;
  padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 12px;
}
.footer-contact li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: .88rem;
  line-height: 1.5;
  color: rgba(255,255,255,.70);
}
.footer-contact li i {
  color: #7dacd4;
  font-size: .95rem;
  margin-top: 1px;
  flex-shrink: 0;
}
.footer-contact li a {
  color: rgba(255,255,255,.70);
  text-decoration: none;
  transition: color .2s;
}
.footer-contact li a:hover { color: #fff; }

/* ====== Bottom bar ====== */
.footer-bottom {
  border-top: 1px solid rgba(255,255,255,.08);
  margin-top: 44px;
  padding: 20px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: .83rem;
  gap: 12px;
  flex-wrap: wrap;
}
.footer-bottom-right {
  display: flex; align-items: center; gap: 6px;
  color: rgba(255,255,255,.45);
}
.footer-brand-tag {
  background: rgba(125,172,212,.15);
  border: 1px solid rgba(125,172,212,.2);
  color: #7dacd4;
  padding: .2rem .7rem;
  border-radius: 999px;
  font-size: .78rem;
  font-weight: 700;
}
</style>
