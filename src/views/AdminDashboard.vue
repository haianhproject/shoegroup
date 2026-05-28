<script setup>
import { products } from '../data/mockData'
</script>

<template>
  <div class="d-flex min-vh-100 bg-light">
    <!-- Sidebar -->
    <aside class="bg-dark text-white d-flex flex-column" style="width: 250px; position: fixed; height: 100vh; overflow-y: auto;">
      <div class="p-4 mb-3">
        <h1 class="fw-bold fs-3 text-white mb-1">ShoeGroup</h1>
        <span class="badge bg-primary px-2 py-1 text-uppercase fw-bold" style="font-size: 0.7em;">Admin Panel</span>
      </div>
      <ul class="nav nav-pills flex-column px-3 gap-2 flex-grow-1">
        <li class="nav-item">
          <router-link to="/admin" class="nav-link text-white d-flex align-items-center gap-3 py-3 fw-bold rounded-3" active-class="bg-secondary bg-opacity-25 active">
            <i class="bi bi-grid-1x2"></i> Tổng quan
          </router-link>
        </li>
        <li class="nav-item">
          <button class="nav-link text-secondary w-100 text-start d-flex align-items-center gap-3 py-3 fw-bold btn-hover-white rounded-3">
            <i class="bi bi-box-seam"></i> Sản phẩm
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link text-secondary w-100 text-start d-flex align-items-center gap-3 py-3 fw-bold btn-hover-white rounded-3">
            <i class="bi bi-receipt"></i> Đơn hàng
          </button>
        </li>
      </ul>
    </aside>

    <!-- Main Content -->
    <main class="flex-grow-1 p-4 p-md-5" style="margin-left: 250px;">
      <h2 class="fw-bold fs-3 mb-4">Tổng Quan Hệ Thống</h2>

      <!-- Stats Cards -->
      <div class="row g-4 mb-5">
        <div class="col-sm-6 col-lg-3">
          <div class="card h-100 border-0 rounded-4 shadow-sm">
            <div class="card-body p-4 d-flex align-items-center gap-3">
              <div class="bg-dark text-white rounded-3 d-flex align-items-center justify-content-center shadow-sm" style="width: 50px; height: 50px;">
                <i class="bi bi-currency-dollar fs-4"></i>
              </div>
              <div>
                <p class="text-secondary small fw-bold text-uppercase tracking-wider m-0">Tổng doanh thu</p>
                <h4 class="fw-black fs-4 m-0 text-dark">$12,450</h4>
              </div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card h-100 border-0 rounded-4 shadow-sm">
            <div class="card-body p-4 d-flex align-items-center gap-3">
              <div class="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center shadow-sm" style="width: 50px; height: 50px;">
                <i class="bi bi-box fs-4"></i>
              </div>
              <div>
                <p class="text-secondary small fw-bold text-uppercase tracking-wider m-0">Tổng đơn hàng</p>
                <h4 class="fw-black fs-4 m-0 text-dark">342</h4>
              </div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card h-100 border-0 rounded-4 shadow-sm">
            <div class="card-body p-4 d-flex align-items-center gap-3">
              <div class="bg-success text-white rounded-3 d-flex align-items-center justify-content-center shadow-sm" style="width: 50px; height: 50px;">
                <i class="bi bi-people fs-4"></i>
              </div>
              <div>
                <p class="text-secondary small fw-bold text-uppercase tracking-wider m-0">Lượng truy cập</p>
                <h4 class="fw-black fs-4 m-0 text-dark">8,504</h4>
              </div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card h-100 border-0 rounded-4 shadow-sm">
            <div class="card-body p-4 d-flex align-items-center gap-3">
              <div class="bg-warning text-white rounded-3 d-flex align-items-center justify-content-center shadow-sm" style="width: 50px; height: 50px;">
                <i class="bi bi-graph-up fs-4"></i>
              </div>
              <div>
                <p class="text-secondary small fw-bold text-uppercase tracking-wider m-0">Tỷ lệ chuyển đổi</p>
                <h4 class="fw-black fs-4 m-0 text-dark">4.2%</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Products Table -->
      <div class="card border-0 rounded-4 shadow-sm overflow-hidden">
        <div class="card-header bg-white border-bottom border-light p-4 d-flex justify-content-between align-items-center">
          <h3 class="fw-bold fs-5 m-0 text-dark">Quản lý sản phẩm</h3>
          <button class="btn btn-dark fw-bold rounded-3 shadow-sm px-4">
            <i class="bi bi-plus-lg"></i> Thêm sản phẩm
          </button>
        </div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light text-secondary text-uppercase small">
              <tr>
                <th scope="col" class="py-3 px-4 fw-bold">Hình ảnh</th>
                <th scope="col" class="py-3 px-4 fw-bold">Tên sản phẩm</th>
                <th scope="col" class="py-3 px-4 fw-bold">Giá</th>
                <th scope="col" class="py-3 px-4 fw-bold">Kho</th>
                <th scope="col" class="py-3 px-4 fw-bold text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody class="border-top-0">
              <tr v-for="product in products" :key="product.id_product">
                <td class="p-4">
                  <div class="bg-light rounded overflow-hidden shadow-sm border" style="width: 50px; height: 50px;">
                    <img :src="product.image_url" :alt="product.product_name" class="w-100 h-100 object-fit-cover mix-blend-multiply">
                  </div>
                </td>
                <td class="p-4 fw-bold text-dark">{{ product.product_name }}</td>
                <td class="p-4 text-secondary fw-semibold">${{ product.price.toFixed(2) }}</td>
                <td class="p-4">
                  <span class="badge bg-success text-white rounded-pill px-3 py-2 fw-bold text-uppercase">
                    Còn hàng (42)
                  </span>
                </td>
                <td class="p-4 text-end">
                  <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-sm btn-outline-primary border-0 rounded d-flex align-items-center justify-content-center bg-blue-hover" style="width: 35px; height: 35px; background-color: #e7f1ff;">
                      <i class="bi bi-pencil fs-5"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger border-0 rounded d-flex align-items-center justify-content-center bg-danger-hover" style="width: 35px; height: 35px; background-color: #f8d7da;">
                      <i class="bi bi-trash fs-5"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.fw-black {
  font-weight: 900;
}
.btn-hover-white:hover {
  color: white !important;
  background-color: rgba(255,255,255,0.05);
}
.object-fit-cover {
  object-fit: cover;
}
.mix-blend-multiply {
  mix-blend-mode: multiply;
}
.bg-blue-hover:hover {
  background-color: #0d6efd !important;
  color: white !important;
}
.bg-danger-hover:hover {
  background-color: #dc3545 !important;
  color: white !important;
}
</style>
