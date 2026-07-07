<!-- Trang: Xác Nhận Thanh Toán -->
<script setup>
import { paymentOrders, formatDate, formatPrice, getPaymentBadgeClass, confirmPayment } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="bg-white rounded-4 shadow-sm p-4">
      <h5 class="fw-bold mb-3 text-dark">Xác Nhận Thanh Toán</h5>
      <p class="text-secondary small">Danh sách đơn hàng chưa hoàn tất thanh toán. Xác nhận khi đã nhận được tiền (chuyển khoản / COD).</p>
      <div v-if="paymentOrders.length === 0" class="text-center text-secondary py-5"><i class="bi bi-check2-circle fs-1 d-block mb-2 opacity-50"></i>Toàn bộ đơn hàng đã được thanh toán.</div>
      <div v-else class="table-responsive">
        <table class="table align-middle mb-0">
          <thead><tr class="text-secondary small text-uppercase"><th>Mã Đơn</th><th>Khách Hàng</th><th>Ngày</th><th>Phương Thức</th><th class="text-end">Số Tiền</th><th>Trạng Thái</th><th class="text-end">Hành Động</th></tr></thead>
          <tbody>
            <tr v-for="ord in paymentOrders" :key="ord.id">
              <td class="fw-bold text-dark" v-text="'#' + ord.id"></td>
              <td v-text="ord.customer_name"></td>
              <td class="small text-secondary" v-text="formatDate(ord.date)"></td>
              <td v-text="ord.payment_method || 'COD'"></td>
              <td class="text-end fw-medium" v-text="formatPrice(ord.total)"></td>
              <td><span class="badge rounded-pill" :class="getPaymentBadgeClass(ord.payment_status)" v-text="ord.payment_status || 'Chưa thanh toán'"></span></td>
              <td class="text-end"><button @click="confirmPayment(ord)" class="btn btn-sm btn-success rounded-3 fw-medium"><i class="bi bi-cash-coin me-1"></i> Xác nhận</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
