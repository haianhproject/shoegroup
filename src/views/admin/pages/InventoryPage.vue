<!-- Trang: Quản Lý Kho Hàng (tồn kho có giới hạn logic hợp lý) -->
<script setup>
import { inventorySearch, lowStockOnly, filteredInventory, updateStock, LOW_STOCK_THRESHOLD, db, formatPrice } from '../adminStore'

function stockState(n) {
  const s = Number(n) || 0
  if (s <= 0) return { cls: 'bg-danger-subtle text-danger', label: 'Hết hàng' }
  if (s <= LOW_STOCK_THRESHOLD) return { cls: 'bg-warning-subtle text-warning-emphasis', label: 'Sắp hết' }
  return { cls: 'badge-active', label: 'Còn hàng' }
}
function stepStock(v, delta) {
  const s = Math.max(0, Math.min(100000, (Number(v.stock) || 0) + delta))
  v.stock = s
}
</script>

<template>
  <div class="fade-in">
    <!-- Thẻ tổng quan -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-lg-3"><div class="bg-white rounded-4 shadow-sm p-3"><p class="text-secondary small mb-1">Tổng biến thể</p><h5 class="fw-bold mb-0" v-text="db.inventory.length"></h5></div></div>
      <div class="col-6 col-lg-3"><div class="bg-white rounded-4 shadow-sm p-3"><p class="text-secondary small mb-1">Tổng tồn kho</p><h5 class="fw-bold mb-0" v-text="db.inventory.reduce((s,v)=>s+(Number(v.stock)||0),0)"></h5></div></div>
      <div class="col-6 col-lg-3"><div class="bg-white rounded-4 shadow-sm p-3"><p class="text-secondary small mb-1">Sắp hết hàng</p><h5 class="fw-bold mb-0 text-warning-emphasis" v-text="db.inventory.filter(v=>Number(v.stock)>0 && Number(v.stock)<=LOW_STOCK_THRESHOLD).length"></h5></div></div>
      <div class="col-6 col-lg-3"><div class="bg-white rounded-4 shadow-sm p-3"><p class="text-secondary small mb-1">Hết hàng</p><h5 class="fw-bold mb-0 text-danger" v-text="db.inventory.filter(v=>Number(v.stock)<=0).length"></h5></div></div>
    </div>

    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
      <div class="input-group bg-white rounded-3 shadow-sm" style="max-width:320px;"><span class="input-group-text bg-white border-0"><i class="bi bi-search text-secondary"></i></span><input v-model="inventorySearch" type="text" class="form-control border-0" placeholder="Tìm theo SKU / tên..."></div>
      <div class="form-check form-switch"><input v-model="lowStockOnly" class="form-check-input" type="checkbox" id="lowStockSwitch"><label class="form-check-label small fw-medium" for="lowStockSwitch">Chỉ hiện sắp/hết hàng</label></div>
    </div>

    <div class="bg-white rounded-4 shadow-sm overflow-hidden">
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead><tr class="text-secondary small text-uppercase"><th class="ps-4">Sản Phẩm</th><th>SKU</th><th>Màu</th><th>Size</th><th class="text-center">Trạng Thái</th><th class="text-center">Tồn Kho</th><th class="text-end pe-4">Cập Nhật</th></tr></thead>
          <tbody>
            <tr v-for="v in filteredInventory" :key="v.id">
              <td class="ps-4 small fw-medium" v-text="v.product_name"></td>
              <td class="small text-secondary" v-text="v.sku"></td>
              <td class="small"><span class="color-dot me-1" :style="{ background: v.color_hex || '#ccc' }"></span><span v-text="v.color"></span></td>
              <td class="small" v-text="v.size"></td>
              <td class="text-center"><span class="badge rounded-pill" :class="stockState(v.stock).cls" v-text="stockState(v.stock).label"></span></td>
              <td class="text-center fw-bold" v-text="v.stock"></td>
              <td class="text-end pe-4">
                <div class="d-inline-flex gap-1 align-items-center">
                  <button @click="stepStock(v,-1)" class="btn btn-sm btn-light border rounded-3" :disabled="Number(v.stock)<=0"><i class="bi bi-dash"></i></button>
                  <input v-model.number="v.stock" type="number" min="0" max="100000" class="form-control form-control-sm text-center" style="width:80px;">
                  <button @click="stepStock(v,1)" class="btn btn-sm btn-light border rounded-3"><i class="bi bi-plus"></i></button>
                  <button @click="updateStock(v)" class="btn btn-sm btn-dark rounded-3" title="Lưu tồn kho"><i class="bi bi-check-lg"></i></button>
                </div>
              </td>
            </tr>
            <tr v-if="!filteredInventory.length"><td colspan="7" class="text-center text-secondary py-5"><i class="bi bi-box-seam fs-3 d-block mb-2 opacity-50"></i>Chưa có dữ liệu kho. Hãy tạo biến thể cho sản phẩm hoặc chạy file dữ liệu mẫu.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
