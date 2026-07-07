<!-- Trang: Quản Lý Đơn Hàng -->
<script setup>
import {
  orderStatuses, orderStatusFilter, countByStatus, filteredOrders,
  getStatusBadgeClass, getPaymentBadgeClass, formatDate, formatPrice,
  openOrderTimeline, getNextAction, processOrderFlow, openCancelModal
} from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="d-flex flex-wrap gap-2 mb-4">
      <button v-for="s in ['Tất cả', ...orderStatuses]" :key="s" @click="orderStatusFilter = s" class="btn btn-sm rounded-pill px-3 fw-medium border" :class="orderStatusFilter === s ? 'btn-dark text-white border-dark' : 'btn-white text-secondary'">
        <span v-text="s"></span>
        <span class="ms-1 opacity-75" v-text="'(' + countByStatus(s) + ')'"></span>
      </button>
    </div>

    <div v-if="filteredOrders.length === 0" class="text-center text-secondary py-5"><i class="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>Không có đơn hàng nào.</div>

    <div class="row g-3">
      <div v-for="ord in filteredOrders" :key="ord.id" class="col-12">
        <div class="order-card bg-white rounded-4 shadow-sm p-4">
          <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
            <div>
              <div class="d-flex align-items-center gap-2 mb-1">
                <h6 class="fw-bold mb-0 text-dark">Đơn <span v-text="'#' + ord.id"></span></h6>
                <span class="badge rounded-pill" :class="getStatusBadgeClass(ord.status)" v-text="ord.status"></span>
                <span class="badge rounded-pill" :class="getPaymentBadgeClass(ord.payment_status)" v-text="ord.payment_status || 'Chưa thanh toán'"></span>
              </div>
              <p class="text-secondary small mb-0"><i class="bi bi-clock me-1"></i><span v-text="formatDate(ord.date)"></span></p>
            </div>
            <div class="text-end">
              <p class="text-secondary small mb-0">Tổng tiền</p>
              <h5 class="fw-bolder mb-0 text-dark" v-text="formatPrice(ord.total)"></h5>
            </div>
          </div>

          <div class="bg-light-gray rounded-3 p-3 mb-3">
            <div v-for="(p, idx) in (ord.isExpanded ? ord.products : ord.products.slice(0,1))" :key="idx" class="d-flex align-items-center gap-3 py-2 border-bottom border-light">
              <img :src="p.image || 'https://via.placeholder.com/48'" class="rounded-3 border" style="width:48px;height:48px;object-fit:cover;" @error="$event.target.src='https://via.placeholder.com/48'">
              <div class="flex-grow-1">
                <p class="fw-medium mb-0 text-dark small" v-text="p.name"></p>
                <p class="text-secondary mb-0" style="font-size:0.78rem;"><span v-text="p.color"></span> / Size <span v-text="p.size"></span> · SL: <span v-text="p.quantity"></span></p>
              </div>
              <span class="fw-medium text-dark small" v-text="formatPrice(p.price)"></span>
            </div>
            <button v-if="ord.products.length > 1" @click="ord.isExpanded = !ord.isExpanded" class="btn btn-link btn-sm text-decoration-none text-dark p-0 mt-2 fw-medium">
              <span v-if="!ord.isExpanded" v-text="'Xem thêm ' + (ord.products.length - 1) + ' sản phẩm'"></span>
              <span v-else>Thu gọn</span>
            </button>
          </div>

          <div class="row g-2 mb-3 small">
            <div class="col-md-4"><span class="text-secondary">Khách hàng:</span> <span class="fw-medium text-dark" v-text="ord.customer_name"></span></div>
            <div class="col-md-3"><span class="text-secondary">SĐT:</span> <span class="fw-medium text-dark" v-text="ord.customer_phone"></span></div>
            <div class="col-md-5"><span class="text-secondary">Địa chỉ:</span> <span class="fw-medium text-dark" v-text="ord.customer_address"></span></div>
          </div>

          <div v-if="ord.status === 'Đã hủy' && ord.cancel_reason" class="alert alert-danger py-2 px-3 small rounded-3 mb-3"><i class="bi bi-x-circle me-1"></i> Lý do hủy: <span v-text="ord.cancel_reason"></span></div>

          <div class="d-flex flex-wrap gap-2 justify-content-end">
            <button @click="openOrderTimeline(ord)" class="btn btn-sm btn-outline-secondary rounded-3"><i class="bi bi-clock-history me-1"></i> Lịch sử</button>
            <button v-if="getNextAction(ord.status)" @click="processOrderFlow(ord)" class="btn btn-sm rounded-3 fw-medium" :class="getNextAction(ord.status).class"><i class="bi bi-arrow-right-circle me-1"></i><span v-text="getNextAction(ord.status).text"></span></button>
            <button v-if="ord.status !== 'Đã giao hàng thành công' && ord.status !== 'Đã hủy'" @click="openCancelModal(ord)" class="btn btn-sm btn-outline-danger rounded-3"><i class="bi bi-x-lg me-1"></i> Hủy đơn</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
