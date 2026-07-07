<!-- Trang: Trả Hàng / Đổi Trả -->
<script setup>
import { returnFilter, filteredReturns, formatPrice, getReturnBadgeClass, processReturn } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="bg-white rounded-4 shadow-sm p-4">
      <div class="d-flex flex-wrap gap-2 mb-3">
        <button v-for="s in ['Tất cả', 'Chờ xử lý', 'Đã duyệt', 'Từ chối', 'Hoàn tất']" :key="s" @click="returnFilter = s" class="btn btn-sm rounded-pill px-3 fw-medium border" :class="returnFilter === s ? 'btn-dark text-white border-dark' : 'btn-white text-secondary'" v-text="s"></button>
      </div>
      <div v-if="filteredReturns.length === 0" class="text-center text-secondary py-5"><i class="bi bi-arrow-return-left fs-1 d-block mb-2 opacity-50"></i>Không có yêu cầu trả hàng nào.</div>
      <div v-else class="table-responsive">
        <table class="table align-middle mb-0">
          <thead><tr class="text-secondary small text-uppercase"><th>Mã</th><th>Đơn Gốc</th><th>Loại</th><th>Lý Do</th><th class="text-end">Hoàn Tiền</th><th>Trạng Thái</th><th class="text-end">Hành Động</th></tr></thead>
          <tbody>
            <tr v-for="r in filteredReturns" :key="r.id">
              <td class="fw-bold text-dark" v-text="'#' + r.id"></td>
              <td v-text="'#' + r.order_id"></td>
              <td v-text="r.return_type"></td>
              <td class="small text-secondary" style="max-width:220px;" v-text="r.reason"></td>
              <td class="text-end fw-medium" v-text="formatPrice(r.refund_amount)"></td>
              <td><span class="badge rounded-pill" :class="getReturnBadgeClass(r.status)" v-text="r.status"></span></td>
              <td class="text-end">
                <div v-if="r.status === 'Chờ xử lý'" class="btn-group">
                  <button @click="processReturn(r, 'Đã duyệt')" class="btn btn-sm btn-success rounded-start-3">Duyệt</button>
                  <button @click="processReturn(r, 'Từ chối')" class="btn btn-sm btn-outline-danger rounded-end-3">Từ chối</button>
                </div>
                <button v-else-if="r.status === 'Đã duyệt'" @click="processReturn(r, 'Hoàn tất')" class="btn btn-sm btn-dark rounded-3">Hoàn tất</button>
                <span v-else class="text-secondary small">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
