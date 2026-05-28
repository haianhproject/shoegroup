<script setup>
</script>

<template>
  <div class="container d-flex align-items-center justify-content-center min-vh-100 py-5">
    <div class="card border-0 rounded-5 shadow-lg w-100" style="max-width: 450px;">
      <div class="card-body p-4 p-md-5">
        <div class="text-center mb-4">
          <h2 class="fw-bold text-dark fs-3 mb-2">Đăng Nhập</h2>
          <p class="text-secondary fw-medium small">Chào mừng trở lại với ShoeGroup</p>
        </div>
        
        <form>
          <div class="mb-3">
            <label class="form-label fw-bold text-dark small">Email</label>
            <input type="email" class="form-control form-control-lg rounded-4 bg-light border-0 px-4 fw-medium fs-6" placeholder="nhapemail@example.com">
          </div>
          <div class="mb-4">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <label class="form-label fw-bold text-dark small mb-0">Mật khẩu</label>
              <router-link to="/forgot-password" class="text-decoration-none text-primary fw-bold small">Quên?</router-link>
            </div>
            <input type="password" class="form-control form-control-lg rounded-4 bg-light border-0 px-4 fw-medium fs-6" placeholder="••••••••">
          </div>
          <button type="button" class="btn btn-dark w-100 btn-lg rounded-4 fw-bold fs-6 shadow-hover mt-2">
            Đăng Nhập
          </button>
        </form>
        
        <div class="text-center mt-4">
          <p class="text-secondary fw-medium small mb-0">
            Chưa có tài khoản? <router-link to="/register" class="text-dark fw-bold text-decoration-none border-bottom border-dark">Đăng ký ngay</router-link>
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
