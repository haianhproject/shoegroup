<script setup>
</script>

<template>
  <div class="container-fluid px-4 py-5 bg-light min-vh-100">
    <div class="container">
      <h1 class="fw-bold mb-4 fs-2">Tài Khoản Của Tôi</h1>
      
      <div class="row g-4">
        <!-- Sidebar (25% on desktop) -->
        <div class="col-md-4 col-lg-3">
          <div class="d-flex flex-column gap-2 bg-white rounded-4 p-3 shadow-sm">
            <router-link to="/account" class="btn btn-dark text-start border-0 fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2" active-class="active">
              <i class="bi bi-person"></i> Hồ sơ
            </router-link>
            <router-link to="/orders" class="btn btn-light text-start border-0 fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2 text-secondary" active-class="btn-dark text-white">
              <i class="bi bi-box"></i> Đơn hàng
            </router-link>
            <button class="btn btn-light text-start border-0 fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2 text-secondary">
              <i class="bi bi-gear"></i> Cài đặt
            </button>
            <hr class="my-2 text-secondary">
            <button class="btn btn-outline-danger text-start fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2 border-0 bg-danger-hover">
              <i class="bi bi-box-arrow-right"></i> Đăng xuất
            </button>
          </div>
        </div>
        
        <!-- Content -->
        <div class="col-md-8 col-lg-9">
          <div class="card border-0 rounded-4 shadow-sm p-4">
            <div class="border-bottom pb-3 mb-4">
              <h2 class="fw-bold fs-4 m-0">Thông tin cá nhân</h2>
            </div>
            
            <form class="row g-4">
              <div class="col-md-6">
                <label class="form-label fw-bold small text-dark">Họ và Tên</label>
                <input type="text" class="form-control form-control-lg rounded-3 bg-light border-0 fs-6 fw-medium px-3" value="Nguyễn Văn A">
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold small text-dark">Số Điện Thoại</label>
                <input type="tel" class="form-control form-control-lg rounded-3 bg-light border-0 fs-6 fw-medium px-3" value="0987654321">
              </div>
              <div class="col-12">
                <label class="form-label fw-bold small text-dark">Email</label>
                <input type="email" class="form-control form-control-lg rounded-3 border-0 fs-6 fw-medium px-3 text-secondary" style="background-color: #e9ecef;" value="nguyenvana@example.com" readonly>
              </div>
              <div class="col-12">
                <label class="form-label fw-bold small text-dark">Địa chỉ giao hàng mặc định</label>
                <input type="text" class="form-control form-control-lg rounded-3 bg-light border-0 fs-6 fw-medium px-3" value="Số 1, Đường Lê Duẩn, Quận 1, TP HCM">
              </div>
              <div class="col-12 d-flex justify-content-end mt-4">
                <button type="button" class="btn btn-dark fw-bold px-5 py-2 rounded-3 shadow-hover">
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
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
.bg-danger-hover:hover {
  background-color: #f8d7da;
}
</style>
