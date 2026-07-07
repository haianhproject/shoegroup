<!-- Trang: Mã Khuyến Mãi -->
<script setup>
import { openForm, filteredDiscounts, formatDate, isExpired, deleteItem } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="d-flex justify-content-end mb-4"><button @click="openForm('discounts')" class="btn btn-dark btn-sm rounded-3 fw-bold shadow-sm px-3"><i class="bi bi-plus-lg me-1"></i> Thêm Mã Giảm Giá</button></div>
    <div class="bg-white rounded-4 shadow-sm overflow-hidden"><div class="table-responsive"><table class="table align-middle mb-0">
      <thead><tr class="text-secondary small text-uppercase"><th class="ps-4">Mã</th><th class="text-center">Giảm</th><th class="text-center">Đã Dùng / Giới Hạn</th><th>Hết Hạn</th><th>Trạng Thái</th><th class="text-end pe-4">Hành Động</th></tr></thead>
      <tbody><tr v-for="d in filteredDiscounts" :key="d.id">
        <td class="ps-4 fw-bold text-dark" v-text="d.code"></td>
        <td class="text-center" v-text="d.percent + '%'"></td>
        <td class="text-center small" v-text="(d.used || 0) + ' / ' + (d.limit || '∞')"></td>
        <td class="small" v-text="d.expiry ? formatDate(d.expiry) : 'Không'"></td>
        <td><span class="badge rounded-pill" :class="(d.active && !isExpired(d.expiry)) ? 'badge-active' : 'bg-secondary-subtle text-secondary'" v-text="(d.active && !isExpired(d.expiry)) ? 'Đang chạy' : (isExpired(d.expiry) ? 'Hết hạn' : 'Tạm dừng')"></span></td>
        <td class="text-end pe-4"><button @click="openForm('discounts', d)" class="btn btn-sm btn-light border rounded-3 me-1"><i class="bi bi-pencil"></i></button><button @click="deleteItem('discounts', d.id, d.code)" class="btn btn-sm btn-light border rounded-3 text-danger"><i class="bi bi-trash"></i></button></td>
      </tr></tbody>
    </table></div></div>
  </div>
</template>
