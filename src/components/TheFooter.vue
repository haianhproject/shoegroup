<script setup>
import BrandLogo from './BrandLogo.vue'</script>

<template>
  <footer class="sg-footer">
    <div class="container-fluid px-4">
      <div class="row gy-4">
        <div class="col-lg-4">
          <router-link to="/" class="sg-logo mb-3">
            <BrandLogo :size="40" :radius="12" />
            <span class="sg-logo-text text-white">SHOE<span class="sg-gradient-text">GROUP</span></span>
          </router-link>
          <p class="sg-foot-desc">Hệ thống phân phối giày thể thao nam chính hãng. Bứt phá phong cách, tự tin từng bước chạy.</p>
          <div class="sg-social">
            <a href="#"><i class="bi bi-facebook"></i></a>
            <a href="#"><i class="bi bi-instagram"></i></a>
            <a href="#"><i class="bi bi-tiktok"></i></a>
            <a href="#"><i class="bi bi-youtube"></i></a>
          </div>
        </div>
        <div class="col-6 col-lg-2">
          <h6 class="sg-foot-h">Về ShoeGroup</h6>
          <ul><li><router-link to="/">Giới thiệu</router-link></li><li><router-link to="/products">Cửa hàng</router-link></li><li><router-link to="/">Tin tức</router-link></li></ul>
        </div>
        <div class="col-6 col-lg-3">
          <h6 class="sg-foot-h">Chính sách</h6>
          <ul><li><router-link to="/returns">Đổi trả hàng</router-link></li><li><router-link to="/">Bảo mật</router-link></li><li><router-link to="/">Giao hàng &amp; nhận hàng</router-link></li></ul>
        </div>
        <div class="col-lg-3">
          <h6 class="sg-foot-h">Liên hệ</h6>
          <ul>
            <li><i class="bi bi-geo-alt"></i> Số 1 Lê Duẩn, Hoàn Kiếm, Hà Nội</li>
            <li><i class="bi bi-telephone"></i> 0375.990.871</li>
            <li><i class="bi bi-envelope"></i> support@shoegroup.vn</li>
          </ul>
        </div>
      </div>
      <div class="sg-foot-bottom">
        <span>&copy; {{ new Date().getFullYear() }} ShoeGroup. Tất cả các quyền được bảo lưu.</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.sg-footer { background: var(--sg-ink); color: rgba(255,255,255,.72); padding: 56px 0 24px; margin-top: auto; }
.sg-logo { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
.sg-logo-mark { width: 40px; height: 40px; border-radius: 12px; background: var(--sg-grad-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.sg-logo-text { font-weight: 900; font-size: 1.35rem; letter-spacing: -.02em; }
.sg-foot-desc { font-size: .9rem; line-height: 1.7; max-width: 320px; margin-top: 6px; }
.sg-social { display: flex; gap: 10px; margin-top: 16px; }
.sg-social a { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,.08); color: #fff; display: flex; align-items: center; justify-content: center; transition: .2s; }
.sg-social a:hover { background: var(--sg-grad-primary); transform: translateY(-3px); }
.sg-foot-h { color: #fff; font-weight: 800; margin-bottom: 16px; }
.sg-footer ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; font-size: .9rem; }
.sg-footer ul a { color: rgba(255,255,255,.72); text-decoration: none; transition: .2s; }
.sg-footer ul a:hover { color: var(--sg-cyan); }
.sg-footer ul i { color: var(--sg-cyan); margin-right: 6px; }
.sg-foot-bottom { border-top: 1px solid rgba(255,255,255,.1); margin-top: 36px; padding-top: 20px; text-align: center; font-size: .85rem; }
</style>
