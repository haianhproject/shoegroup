<script setup>
import { ref } from 'vue'

const mockOrders = ref([
  { id: '#SG00123', date: '12/05/2026', total: 325.00, status: 'Hoàn thành' },
  { id: '#SG00124', date: '25/05/2026', total: 120.00, status: 'Đang giao' },
])
</script>

<template>
  <div class="container-fluid px-4 py-5 bg-light min-vh-100">
    <div class="container">
      <h1 class="fw-bold mb-4 fs-2">Tài Khoản Của Tôi</h1>
      
      <div class="row g-4">
        <!-- Sidebar -->
        <div class="col-md-4 col-lg-3">
          <div class="d-flex flex-column gap-2 bg-white rounded-4 p-3 shadow-sm">
            <router-link to="/account" class="btn btn-light text-start border-0 fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2 text-secondary" active-class="btn-dark text-white">
              <i class="bi bi-person"></i> Hồ sơ
            </router-link>
            <router-link to="/orders" class="btn btn-dark text-start border-0 fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2" active-class="active">
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
          <div class="card border-0 rounded-4 shadow-sm overflow-hidden">
            <div class="p-4 border-bottom bg-white d-flex align-items-center justify-content-between">
              <h2 class="fw-bold fs-4 m-0">Lịch sử đơn hàng</h2>
            </div>
            
            <div class="table-responsive">
              <table class="table table-hover mb-0 align-middle">
                <thead class="table-light text-secondary text-uppercase small bg-light">
                  <tr>
                    <th scope="col" class="py-3 px-4 fw-bold">Mã đơn</th>
                    <th scope="col" class="py-3 px-4 fw-bold">Ngày đặt</th>
                    <th scope="col" class="py-3 px-4 fw-bold">Trạng thái</th>
                    <th scope="col" class="py-3 px-4 fw-bold">Tổng tiền</th>
                    <th scope="col" class="py-3 px-4 fw-bold text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody class="border-top-0">
                  <tr v-for="(order, idx) in mockOrders" :key="idx">
                    <td class="py-3 px-4 fw-bold text-dark">{{ order.id }}</td>
                    <td class="py-3 px-4 text-secondary fw-semibold">{{ order.date }}</td>
                    <td class="py-3 px-4">
                      <span class="badge rounded-pill fw-bold text-uppercase px-3 py-2" :class="order.status === 'Hoàn thành' ? 'bg-success text-white' : 'bg-warning text-dark'">
                        {{ order.status }}
                      </span>
                    </td>
                    <td class="py-3 px-4 fw-bold text-dark">${{ order.total.toFixed(2) }}</td>
                    <td class="py-3 px-4 text-end">
                      <button class="btn btn-sm btn-outline-primary fw-bold px-3 py-1 rounded-3 d-inline-flex gap-1 align-items-center border-0" style="background-color: #e7f1ff;">
                        <i class="bi bi-eye"></i> Xem
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-danger-hover:hover {
  background-color: #f8d7da;
}
</style>
