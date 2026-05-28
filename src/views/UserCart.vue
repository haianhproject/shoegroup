<script setup>
import { computed } from 'vue'
import { products } from '../data/mockData'

const cartItems = computed(() => {
  return [products[0], products[1]]
})
</script>

<template>
  <div class="container-fluid px-4 py-5 bg-light min-vh-100">
    <h1 class="fw-bold mb-4 fs-2">Giỏ Hàng Của Bạn</h1>
    
    <div class="row g-4">
      <!-- Cột trái: DS SP (70%) -->
      <div class="col-lg-8">
        <div class="d-flex flex-column gap-3">
          <div v-for="(item, idx) in cartItems" :key="idx" class="card border-0 rounded-4 shadow-sm">
            <div class="card-body p-3 d-flex flex-column flex-sm-row align-items-center gap-3">
              <div class="bg-light rounded-3 overflow-hidden border" style="width: 100px; height: 100px; flex-shrink: 0;">
                <img :src="item.image_url" :alt="item.product_name" class="w-100 h-100 object-fit-cover mix-blend-multiply">
              </div>
              <div class="flex-grow-1 text-center text-sm-start">
                <router-link :to="`/product/${item.id_product}`" class="text-dark fw-bold text-decoration-none hover-primary">{{ item.product_name }}</router-link>
                <p class="text-secondary small mb-2 fw-semibold">Size: 42 | Màu: Đen</p>
                <p class="fw-bold fs-5 text-dark mb-0">${{ item.price.toFixed(2) }}</p>
              </div>
              <div class="d-flex align-items-center gap-3 w-100 w-sm-auto justify-content-between mt-3 mt-sm-0">
                <div class="input-group input-group-sm rounded bg-light border" style="width: 100px;">
                  <button class="btn btn-light border-0" type="button"><i class="bi bi-dash"></i></button>
                  <input type="text" class="form-control text-center border-0 bg-transparent fw-bold px-0" value="1" readonly>
                  <button class="btn btn-light border-0" type="button"><i class="bi bi-plus"></i></button>
                </div>
                <button class="btn btn-outline-danger border-0 rounded-3 text-danger bg-danger-hover">
                  <i class="bi bi-trash fs-5"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cột phải: Tổng thanh toán -->
      <div class="col-lg-4">
        <div class="card border-0 rounded-4 shadow-sm sticky-top" style="top: 100px;">
          <div class="card-body p-4">
            <h4 class="fw-bold fs-4 mb-4">Tóm tắt đơn hàng</h4>
            <div class="d-flex justify-content-between mb-3 text-secondary">
              <span class="fw-bold">Tạm tính</span>
              <span class="text-dark fw-bold">$310.00</span>
            </div>
            <div class="d-flex justify-content-between mb-3 text-secondary">
              <span class="fw-bold">Phí vận chuyển</span>
              <span class="text-dark fw-bold">$15.00</span>
            </div>
            <hr class="my-4 text-secondary">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <span class="fw-bold fs-5">Tổng thanh toán</span>
              <span class="text-dark fw-bold display-6 mb-0 fs-3">$325.00</span>
            </div>
            <button class="btn btn-dark w-100 py-3 rounded-3 fw-bold fs-5 shadow-hover">
              Tiến hành thanh toán
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.object-fit-cover {
  object-fit: cover;
}
.mix-blend-multiply {
  mix-blend-mode: multiply;
}
.hover-primary:hover {
  color: #0d6efd !important;
}
.bg-danger-hover:hover {
  background-color: #f8d7da;
}
</style>
