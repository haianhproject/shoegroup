<script setup>
</script>

<template>
  <footer class="bg-dark text-white pt-5 pb-4 mt-auto">
    <div class="container-fluid px-4">
      <div class="row mb-4 row-gap-4">
        <div class="col-md-3">
          <h3 class="fw-bold fs-4 mb-3">ShoeGroups</h3>
          <p class="text-secondary small lh-lg">Hệ thống phân phối giày sneaker chính hãng hàng đầu. Cung cấp sản phẩm chất lượng với dịch vụ tốt nhất.</p>
        </div>
        <div class="col-md-3">
          <h4 class="fw-semibold fs-6 mb-3">Về ShoeGroup</h4>
          <ul class="list-unstyled text-secondary small line-height-lg gap-2 d-flex flex-column">
            <li><router-link to="/" class="text-decoration-none text-secondary hover-white">Giới thiệu</router-link></li>
            <li><router-link to="/" class="text-decoration-none text-secondary hover-white">Tin tức</router-link></li>
            <li><router-link to="/" class="text-decoration-none text-secondary hover-white">Cửa hàng</router-link></li>
          </ul>
        </div>
        <div class="col-md-3">
          <h4 class="fw-semibold fs-6 mb-3">Chính sách</h4>
          <ul class="list-unstyled text-secondary small gap-2 d-flex flex-column">
            <li><router-link to="/" class="text-decoration-none text-secondary hover-white">Chính sách đổi trả</router-link></li>
            <li><router-link to="/" class="text-decoration-none text-secondary hover-white">Chính sách bảo mật</router-link></li>
            <li><router-link to="/" class="text-decoration-none text-secondary hover-white">Điều khoản dịch vụ</router-link></li>
            <li><router-link to="/" class="text-decoration-none text-secondary hover-white">Giao hàng & Nhận hàng</router-link></li>
          </ul>
        </div>
        <div class="col-md-3">
          <h4 class="fw-semibold fs-6 mb-3">Mạng xã hội</h4>
          <ul class="list-unstyled text-secondary small gap-2 d-flex flex-column">
            <li><a href="#" class="text-decoration-none text-secondary hover-white">Facebook</a></li>
            <li><a href="#" class="text-decoration-none text-secondary hover-white">Instagram</a></li>
            <li><a href="#" class="text-decoration-none text-secondary hover-white">Tiktok</a></li>
            <li><a href="#" class="text-decoration-none text-secondary hover-white">Youtube</a></li>
          </ul>
        </div>
      </div>
      <div class="border-top border-secondary pt-3 text-center text-secondary small">
        <p class="mb-0">&copy; {{ new Date().getFullYear() }} ShoeGroup. Tất cả các quyền được bảo lưu.</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.hover-white:hover {
  color: white !important;
  transition: color 0.2s ease;
}
</style>
