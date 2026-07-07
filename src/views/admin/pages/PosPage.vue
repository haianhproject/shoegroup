<!-- Trang: Bán Hàng Tại Quầy (POS) -->
<script setup>
import { posSearch, posProducts, formatPrice, addToCart, posCart, posCustomer, posPayment, posTotal, checkoutPos } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="row g-4">
      <div class="col-lg-7">
        <div class="bg-white rounded-4 shadow-sm p-4">
          <div class="input-group mb-3"><span class="input-group-text bg-light-gray border-0"><i class="bi bi-search"></i></span><input v-model="posSearch" type="text" class="form-control border-0 bg-light-gray" placeholder="Tìm sản phẩm theo tên..."></div>
          <div class="row g-2" style="max-height:60vh;overflow:auto;">
            <div v-for="p in posProducts" :key="p.id" class="col-6 col-md-4">
              <div class="pos-product border rounded-3 p-2 h-100" @click="addToCart(p)">
                <img :src="p.image_url || 'https://via.placeholder.com/120'" class="rounded-2 w-100 mb-2" style="height:90px;object-fit:cover;" @error="$event.target.src='https://via.placeholder.com/120'">
                <p class="small fw-medium mb-0 text-dark text-truncate" v-text="p.name"></p>
                <p class="small text-secondary mb-0" v-text="formatPrice(p.price)"></p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-5">
        <div class="bg-white rounded-4 shadow-sm p-4">
          <h5 class="fw-bold mb-3 text-dark"><i class="bi bi-cart3 me-2"></i>Giỏ Hàng</h5>
          <div v-if="posCart.length === 0" class="text-center text-secondary py-4 small">Chưa có sản phẩm.</div>
          <div v-for="(c, i) in posCart" :key="i" class="d-flex align-items-center gap-2 py-2 border-bottom">
            <div class="flex-grow-1"><p class="small fw-medium mb-0 text-dark" v-text="c.name"></p><p class="small text-secondary mb-0" v-text="formatPrice(c.price)"></p></div>
            <input type="number" min="1" v-model.number="c.quantity" class="form-control form-control-sm text-center" style="width:60px;">
            <button @click="posCart.splice(i,1)" class="btn btn-sm btn-link text-danger p-0"><i class="bi bi-trash"></i></button>
          </div>
          <div class="mt-3">
            <input v-model="posCustomer" type="text" class="form-control form-control-sm mb-2" placeholder="Tên khách hàng (tùy chọn)">
            <select v-model="posPayment" class="form-select form-select-sm mb-3"><option>Tiền mặt</option><option>Chuyển khoản</option><option>Thẻ</option></select>
            <div class="d-flex justify-content-between align-items-center mb-3"><span class="fw-medium text-secondary">Tổng cộng</span><h4 class="fw-bolder mb-0 text-dark" v-text="formatPrice(posTotal)"></h4></div>
            <button @click="checkoutPos" :disabled="posCart.length === 0" class="btn btn-dark w-100 rounded-3 fw-bold py-2"><i class="bi bi-check2-circle me-2"></i>Thanh Toán</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
