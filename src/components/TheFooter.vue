<script setup>
import BrandLogo from './BrandLogo.vue'
</script>

<template>
  <footer class="sg-footer">
    <div class="footer-body">
      <div class="container-fluid px-4">
        <div class="row gy-5">
          <!-- Brand column -->
          <div class="col-lg-4">
            <router-link to="/" class="footer-logo">
              <span style="display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <img src="/logogiay.png" alt="ShoeGroup" style="width: auto; height: auto; display: block; max-height: 50px;" />
              </span>
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
              <li><router-link to="/">Giới thiệu</router-link></li>
              <li><router-link to="/products">Cửa hàng</router-link></li>
              <li><router-link to="/">Tin tức</router-link></li>
              <li><router-link to="/">Tuyển dụng</router-link></li>
            </ul>
          </div>

          <div class="col-6 col-lg-2">
            <h6 class="footer-heading">Chính sách</h6>
            <ul class="footer-links">
              <li><router-link to="/returns">Đổi trả hàng</router-link></li>
              <li><router-link to="/">Bảo mật</router-link></li>
              <li><router-link to="/">Giao &amp; nhận hàng</router-link></li>
              <li><router-link to="/">Điều khoản sử dụng</router-link></li>
            </ul>
          </div>

          <div class="col-lg-3">
            <h6 class="footer-heading">Liên hệ</h6>
            <ul class="footer-contact">
              <li><i class="bi bi-geo-alt"></i><span>Số 1 Lê Duẩn, Hoàn Kiếm, Hà Nội</span></li>
              <li><i class="bi bi-telephone"></i><a href="tel:0375990871">0375.990.871</a></li>
              <li><i class="bi bi-envelope"></i><a href="mailto:support@shoegroup.vn">support@shoegroup.vn</a></li>
              <li><i class="bi bi-clock"></i><span>Hỗ trợ 9:00 – 21:00 mỗi ngày</span></li>
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
  background: #0A0A0A;
  color: rgba(255, 255, 255, 0.6);
  margin-top: auto;
  position: relative;
}

.footer-body {
  padding: 60px 0 0;
}

/* ====== Logo ====== */
.footer-logo {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  text-decoration: none;
  margin-bottom: 16px;
}
.footer-logo-text {
  font-family: 'Inter', sans-serif;
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  line-height: 1;
  text-transform: uppercase;
}
.logo-shoe  { color: #fff; }
.logo-group { color: #D4001A; }

.footer-desc {
  font-size: 0.88rem;
  line-height: 1.7;
  max-width: 310px;
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.45);
}

/* ====== Trust badges ====== */
.footer-badges {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 20px 0;
}
.f-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.82rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
}
.f-badge i {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

/* ====== Social links ====== */
.footer-social {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
.footer-social a {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  transition: color 0.2s ease, background 0.2s ease;
  text-decoration: none;
}
.footer-social a:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

/* ====== Headings ====== */
.footer-heading {
  color: #fff;
  font-weight: 600;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 20px;
}

/* ====== Links ====== */
.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.footer-links li a {
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 400;
  transition: color 0.2s ease;
}
.footer-links li a:hover {
  color: #fff;
}

/* ====== Contact list ====== */
.footer-contact {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.footer-contact li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 0.86rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.5);
}
.footer-contact li i {
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.88rem;
  margin-top: 2px;
  flex-shrink: 0;
}
.footer-contact li a {
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  transition: color 0.2s ease;
}
.footer-contact li a:hover {
  color: #fff;
}

/* ====== Bottom bar ====== */
.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin-top: 48px;
  padding: 20px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  gap: 12px;
  flex-wrap: wrap;
  color: rgba(255, 255, 255, 0.3);
}
.footer-bottom-right {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.3);
}
.footer-brand-tag {
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
  font-size: 0.8rem;
}
</style>

