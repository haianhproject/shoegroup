<!-- Trang: Báo Cáo Nhân Viên -->
<script setup>
import { staffStats, formatPrice } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="bg-white rounded-1 shadow-sm p-4">
      <h5 class="font-bold mb-1 text-gray-900">Báo Cáo Hiệu Suất Nhân Viên</h5>
      <p class="text-gray-600 text-sm mb-4">Thống kê đơn hàng đã xử lý theo từng nhân viên.</p>
      <div v-if="staffStats.length === 0" class="text-center text-gray-600 py-5">Chưa có dữ liệu xử lý đơn.</div>
      <div v-else class="table-responsive"><table class="table align-middle mb-0">
        <thead><tr class="text-gray-600 text-sm uppercase"><th class="pl-2">Nhân Viên</th><th class="text-center">Đơn Đã Xử Lý</th><th class="text-center">Đơn Thành Công</th><th class="text-end">Doanh Thu Đóng Góp</th></tr></thead>
        <tbody><tr v-for="s in staffStats" :key="s.name">
          <td class="pl-2"><div class="flex items-center gap-2"><div class="rounded-full bg-gray-100 border flex items-center justify-center font-bold text-gray-900" style="width:36px;height:36px;" v-text="s.name.charAt(0).toUpperCase()"></div><span class="font-medium" v-text="s.name"></span></div></td>
          <td class="text-center" v-text="s.total"></td>
          <td class="text-center"><span class="badge badge-active rounded-1" v-text="s.done"></span></td>
          <td class="text-end font-medium" v-text="formatPrice(s.revenue)"></td>
        </tr></tbody>
      </table></div>
    </div>
  </div>
</template>
