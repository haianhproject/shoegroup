<!-- Trang: Khách Hàng (CRM) -->
<script setup>
import { customerSearch, filteredCustomers, getRank, formatPrice, viewCustomerDetails } from '../adminStore'
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
  </div>
</template>
