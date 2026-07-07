<!-- Trang: Quản Lý Kho Hàng -->
<script setup>
import { inventorySearch, lowStockOnly, filteredInventory, updateStock } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
      <div class="input-group bg-white rounded-3 shadow-sm" style="max-width:320px;"><span class="input-group-text bg-white border-0"><i class="bi bi-search text-secondary"></i></span><input v-model="inventorySearch" type="text" class="form-control border-0" placeholder="Tìm theo SKU / tên..."></div>
      <div class="form-check form-switch"><input v-model="lowStockOnly" class="form-check-input" type="checkbox" id="lowStockSwitch"><label class="form-check-label small fw-medium" for="lowStockSwitch">Chỉ hiện sắp hết hàng</label></div>
    </div>
    <div class="bg-white rounded-4 shadow-sm overflow-hidden">
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead><tr class="text-secondary small text-uppercase"><th class="ps-4">Sản Phẩm</th><th>SKU</th><th>Màu</th><th>Size</th><th class="text-center">Tồn Kho</th><th class="text-end pe-4">Cập Nhật</th></tr></thead>
          <tbody>
            <tr v-for="v in filteredInventory" :key="v.id">
              <td class="ps-4 small fw-medium" v-text="v.product_name"></td>
              <td class="small text-secondary" v-text="v.sku"></td>
              <td class="small"><span class="color-dot me-1" :style="{ background: v.color_hex || '#ccc' }"></span><span v-text="v.color"></span></td>
              <td class="small" v-text="v.size"></td>
              <td class="text-center"><span class="badge rounded-pill" :class="v.stock <= 10 ? 'bg-danger-subtle text-danger' : 'badge-active'" v-text="v.stock"></span></td>
              <td class="text-end pe-4"><div class="d-inline-flex gap-1 align-items-center"><input v-model.number="v.stock" type="number" class="form-control form-control-sm text-end" style="width:90px;"><button @click="updateStock(v)" class="btn btn-sm btn-dark rounded-3"><i class="bi bi-check-lg"></i></button></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
