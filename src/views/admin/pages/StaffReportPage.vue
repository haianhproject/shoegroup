<!-- Trang: Báo Cáo Nhân Viên -->
<script setup>
import { staffStats, formatPrice } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="bg-white rounded-4 shadow-sm p-4">
      <h5 class="fw-bold mb-1 text-dark">Báo Cáo Hiệu Suất Nhân Viên</h5>
      <p class="text-secondary small mb-4">Thống kê đơn hàng đã xử lý theo từng nhân viên.</p>
      <div v-if="staffStats.length === 0" class="text-center text-secondary py-5">Chưa có dữ liệu xử lý đơn.</div>
      <div v-else class="table-responsive"><table class="table align-middle mb-0">
        <thead><tr class="text-secondary small text-uppercase"><th class="ps-2">Nhân Viên</th><th class="text-center">Đơn Đã Xử Lý</th><th class="text-center">Đơn Thành Công</th><th class="text-end">Doanh Thu Đóng Góp</th></tr></thead>
        <tbody><tr v-for="s in staffStats" :key="s.name">
          <td class="ps-2"><div class="d-flex align-items-center gap-2"><div class="rounded-circle bg-light border d-flex align-items-center justify-content-center fw-bold text-dark" style="width:36px;height:36px;" v-text="s.name.charAt(0).toUpperCase()"></div><span class="fw-medium" v-text="s.name"></span></div></td>
          <td class="text-center" v-text="s.total"></td>
          <td class="text-center"><span class="badge badge-active rounded-pill" v-text="s.done"></span></td>
          <td class="text-end fw-medium" v-text="formatPrice(s.revenue)"></td>
        </tr></tbody>
      </table></div>
    </div>
  </div>
</template>
