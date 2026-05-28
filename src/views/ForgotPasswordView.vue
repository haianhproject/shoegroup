<script setup>
</script>

<template>
  <div class="container d-flex align-items-center justify-content-center min-vh-100 py-5">
    <div class="card border-0 rounded-5 shadow-lg w-100" style="max-width: 450px;">
      <div class="card-body p-4 p-md-5">
        <div class="text-center mb-4">
          <h2 class="fw-bold text-dark fs-3 mb-2">Khôi Phục Mật Khẩu</h2>
          <p class="text-secondary fw-medium small px-3">Nhập email để nhận liên kết đặt lại mật khẩu</p>
        </div>
        
        <form>
          <div class="mb-4">
            <label class="form-label fw-bold text-dark small">Email của bạn</label>
            <input type="email" class="form-control form-control-lg rounded-4 bg-light border-0 px-4 fw-medium fs-6" placeholder="nhapemail@example.com">
          </div>
          <button type="button" class="btn btn-dark w-100 btn-lg rounded-4 fw-bold fs-6 shadow-hover mt-3">
            Gửi Liên Kết
          </button>
        </form>
        
        <div class="text-center mt-4">
          <p class="text-secondary fw-medium small mb-0">
            <router-link to="/login" class="text-dark fw-bold text-decoration-none border-bottom border-dark">&larr; Quay lại Đăng nhập</router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-control:focus {
  box-shadow: none;
  background-color: #fff !important;
  border: 1px solid #212529 !important;
}
</style>
