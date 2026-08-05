<!-- Trang: Khách Hàng (CRM) -->
<script setup>
import { customerSearch, filteredCustomers, getRank, formatPrice, formatDate, viewCustomerDetails, customerModal, closeCustomerDetails, getOrderStatusPill } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="input-group bg-white rounded-3 shadow-sm mb-4" style="max-width:320px;"><span class="input-group-text bg-white border-0"><i class="bi bi-search text-secondary"></i></span><input v-model="customerSearch" type="text" class="form-control border-0" placeholder="Tìm khách hàng..."></div>
    <div class="row g-3">
      <div v-for="cus in filteredCustomers" :key="cus.id" class="col-12 col-md-6 col-xl-4">
        <div class="bg-white rounded-4 shadow-sm p-4 h-100 dashboard-card">
          <div class="d-flex align-items-center gap-3 mb-3">
            <div class="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center fw-bold fs-5" style="width:48px;height:48px;" v-text="(cus.name || '?').charAt(0).toUpperCase()"></div>
            <div class="flex-grow-1"><h6 class="fw-bold mb-0 text-dark" v-text="cus.name"></h6><p class="text-secondary small mb-0" v-text="cus.phone"></p></div>
            <span class="badge rounded-pill" :class="getRank(cus.spent).class" v-text="getRank(cus.spent).label"></span>
          </div>
          <div class="d-flex justify-content-between align-items-center bg-light-gray rounded-3 p-2 px-3 mb-3"><span class="text-secondary small">Tổng chi tiêu</span><span class="fw-bolder text-dark" v-text="formatPrice(cus.spent)"></span></div>
          <button @click="viewCustomerDetails(cus)" class="btn btn-sm btn-outline-dark rounded-3 w-100"><i class="bi bi-eye me-1"></i> Xem chi tiết &amp; lịch sử đơn</button>
        </div>
      </div>
    </div>

    <!-- MODAL Chi tiết khách hàng + lịch sử đơn + ảnh sản phẩm -->
    <div v-if="customerModal.open" class="custom-modal-overlay" @click.self="closeCustomerDetails()">
      <div class="custom-modal-box fade-in-scale" style="max-width:760px;">
        <div class="p-4 border-bottom d-flex justify-content-between align-items-center">
          <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-person-vcard me-2"></i>Chi tiết khách hàng</h6>
          <button @click="closeCustomerDetails()" class="btn btn-sm btn-light border-0"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="p-4" style="max-height:72vh;overflow:auto;">
          <div v-if="customerModal.customer" class="d-flex align-items-center gap-3 mb-3">
            <div class="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center fw-bold fs-4" style="width:60px;height:60px;" v-text="(customerModal.customer.name || '?').charAt(0).toUpperCase()"></div>
            <div class="flex-grow-1">
              <h5 class="fw-bold mb-0 text-dark" v-text="customerModal.customer.name"></h5>
              <p class="text-secondary small mb-0"><i class="bi bi-telephone me-1"></i><span v-text="customerModal.customer.phone || '—'"></span></p>
              <p v-if="customerModal.customer.email" class="text-secondary small mb-0"><i class="bi bi-envelope me-1"></i><span v-text="customerModal.customer.email"></span></p>
              <p v-if="customerModal.customer.address" class="text-secondary small mb-0"><i class="bi bi-geo-alt me-1"></i><span v-text="customerModal.customer.address"></span></p>
              <span v-if="customerModal.customer.source" class="badge rounded-pill bg-light text-secondary border mt-1" v-text="'Nguồn: ' + customerModal.customer.source"></span>
            </div>
            <span class="badge rounded-pill align-self-start" :class="getRank(customerModal.customer.spent).class" v-text="getRank(customerModal.customer.spent).label"></span>
          </div>

          <div class="row g-2 mb-4">
            <div class="col-6"><div class="bg-light-gray rounded-3 p-3 text-center"><div class="text-secondary text-uppercase" style="font-size:0.68rem;">Tổng chi tiêu</div><div class="fw-bolder text-dark fs-5" v-text="formatPrice(customerModal.customer ? customerModal.customer.spent : 0)"></div></div></div>
            <div class="col-6"><div class="bg-light-gray rounded-3 p-3 text-center"><div class="text-secondary text-uppercase" style="font-size:0.68rem;">Số đơn hàng</div><div class="fw-bolder text-dark fs-5" v-text="customerModal.orders.length"></div></div></div>
          </div>

          <h6 class="fw-bold text-dark mb-2"><i class="bi bi-bag-check me-2"></i>Lịch sử đơn hàng</h6>
          <div v-if="customerModal.orders.length === 0" class="text-center text-secondary py-4 small border rounded-3">Khách chưa có đơn hàng nào.</div>
          <div v-for="o in customerModal.orders" :key="o.id" class="border rounded-3 p-3 mb-2">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div>
                <span class="fw-bold text-dark" v-text="'#' + o.id"></span>
                <span class="text-secondary small ms-2" v-text="formatDate(o.date)"></span>
              </div>
              <span class="badge rounded-pill" :class="getOrderStatusPill(o).cls" v-text="getOrderStatusPill(o).label"></span>
            </div>
            <div v-for="(p, i) in o.products" :key="i" class="d-flex align-items-center gap-2 py-1">
              <img :src="p.image || 'https://via.placeholder.com/48'" class="rounded-2 border" style="width:48px;height:48px;object-fit:cover;" @error="$event.target.src='https://via.placeholder.com/48'">
              <div class="flex-grow-1">
                <p class="small fw-medium mb-0 text-dark text-truncate" v-text="p.name"></p>
                <p class="text-secondary mb-0" style="font-size:0.72rem;" v-text="[p.color, p.size].filter(Boolean).join(' · ') + ' · SL ' + p.quantity"></p>
              </div>
              <span class="small fw-medium text-dark" v-text="formatPrice(p.price)"></span>
            </div>
            <div v-if="o.products.length === 0" class="text-secondary small">Không có chi tiết sản phẩm.</div>
            <div class="d-flex justify-content-between border-top pt-2 mt-1">
              <span class="text-secondary small">Tổng đơn</span>
              <span class="fw-bold text-dark" v-text="formatPrice(o.total)"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
