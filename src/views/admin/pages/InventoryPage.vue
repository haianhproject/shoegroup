<!-- Trang: Quản Lý Kho Hàng (tồn kho có giới hạn logic hợp lý) -->
<script setup>
import { inventorySearch, lowStockOnly, filteredInventory, updateStock, LOW_STOCK_THRESHOLD, db, formatPrice } from '../adminStore'

function stockState(n) {
  const s = Number(n) || 0
  if (s <= 0) return { cls: 'bg-danger-subtle text-danger', label: 'Hết hàng' }
  if (s <= LOW_STOCK_THRESHOLD) return { cls: 'bg-light text-dark', label: 'Sắp hết' }
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
    <div class="grid grid-cols-12 gap-3 mb-4">
      <div class="col-span-6 lg:col-span-3"><div class="bg-white rounded-1 shadow-sm p-3"><p class="text-gray-600 text-sm mb-1">Tổng biến thể</p><h5 class="font-bold mb-0" v-text="db.inventory.length"></h5></div></div>
      <div class="col-span-6 lg:col-span-3"><div class="bg-white rounded-1 shadow-sm p-3"><p class="text-gray-600 text-sm mb-1">Tổng tồn kho</p><h5 class="font-bold mb-0" v-text="db.inventory.reduce((s,v)=>s+(Number(v.stock)||0),0)"></h5></div></div>
      <div class="col-span-6 lg:col-span-3"><div class="bg-white rounded-1 shadow-sm p-3"><p class="text-gray-600 text-sm mb-1">Sắp hết hàng</p><h5 class="font-bold mb-0 text-gray-900" v-text="db.inventory.filter(v=>Number(v.stock)>0 && Number(v.stock)<=LOW_STOCK_THRESHOLD).length"></h5></div></div>
      <div class="col-span-6 lg:col-span-3"><div class="bg-white rounded-1 shadow-sm p-3"><p class="text-gray-600 text-sm mb-1">Hết hàng</p><h5 class="font-bold mb-0 text-red-600" v-text="db.inventory.filter(v=>Number(v.stock)<=0).length"></h5></div></div>
    </div>

    <div class="flex flex-wrap justify-between items-center gap-2 mb-4">
      <div class="flex bg-white rounded-2 shadow-sm" style="max-width:320px;"><span class="flex items-center bg-white border-0"><i class="icon icon-search text-gray-600"></i></span><input v-model="inventorySearch" type="text" class="sg-input border-0" placeholder="Tìm theo SKU / tên..."></div>
      <div class="flex items-center gap-2 flex items-center"><input v-model="lowStockOnly" class="accent-black" type="checkbox" id="lowStockSwitch"><label class="text-sm text-sm font-medium" for="lowStockSwitch">Chỉ hiện sắp/hết hàng</label></div>
    </div>

    <div class="bg-white rounded-1 shadow-sm overflow-hidden">
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead><tr class="text-gray-600 text-sm uppercase"><th class="pl-4">Sản Phẩm</th><th>SKU</th><th>Màu</th><th>Size</th><th class="text-center">Trạng Thái</th><th class="text-center">Tồn Kho</th><th class="text-end pr-4">Cập Nhật</th></tr></thead>
          <tbody>
            <tr v-for="v in filteredInventory" :key="v.id">
              <td class="pl-4 text-sm font-medium" v-text="v.product_name"></td>
              <td class="text-sm text-gray-600" v-text="v.sku"></td>
              <td class="text-sm"><span class="color-dot mr-1" :style="{ background: v.color_hex || '#ccc' }"></span><span v-text="v.color"></span></td>
              <td class="text-sm" v-text="v.size"></td>
              <td class="text-center"><span class="badge rounded-1" :class="stockState(v.stock).cls" v-text="stockState(v.stock).label"></span></td>
              <td class="text-center font-bold" v-text="v.stock"></td>
              <td class="text-end pr-4">
                <div class="inline-flex gap-1 items-center">
                  <button @click="stepStock(v,-1)" class="btn btn-sm btn-light border rounded-2" :disabled="Number(v.stock)<=0"><i class="icon icon-dash"></i></button>
                  <input v-model.number="v.stock" type="number" min="0" max="100000" class="sg-input sg-input text-center" style="width:80px;">
                  <button @click="stepStock(v,1)" class="btn btn-sm btn-light border rounded-2"><i class="icon icon-plus"></i></button>
                  <button @click="updateStock(v)" class="btn btn-sm btn-dark rounded-2" title="Lưu tồn kho"><i class="icon icon-check-lg"></i></button>
                </div>
              </td>
            </tr>
            <tr v-if="!filteredInventory.length"><td colspan="7" class="text-center text-gray-600 py-5"><i class="icon icon-box-seam text-2xl block mb-2 opacity-50"></i>Chưa có dữ liệu kho. Hãy tạo biến thể cho sản phẩm hoặc chạy file dữ liệu mẫu.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
