<!-- Trang: Bộ Sưu Tập -->
<script setup>
import { openForm, filteredCollections, getBrandName, deleteItem, restoreItem } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="flex justify-end mb-4"><button @click="openForm('collections')" class="btn btn-dark btn-sm rounded-2 font-bold shadow-sm px-3"><i class="icon icon-plus-lg mr-1"></i> Thêm Bộ Sưu Tập</button></div>
    <div class="bg-white rounded-1 shadow-sm overflow-hidden"><div class="table-responsive"><table class="table align-middle mb-0">
      <thead><tr class="text-gray-600 text-sm uppercase"><th class="pl-4">ID</th><th>Tên Bộ Sưu Tập</th><th>Thương Hiệu</th><th>Trạng Thái</th><th class="text-end pr-4">Hành Động</th></tr></thead>
      <tbody><tr v-for="col in filteredCollections" :key="col.id">
        <td class="pl-4 text-gray-600 text-sm" v-text="'#' + col.id"></td><td class="font-medium" v-text="col.name"></td>
        <td class="text-sm" v-text="getBrandName(col.brand_id)"></td>
        <td><span class="badge rounded-1" :class="col.active ? 'badge-active' : 'bg-secondary-subtle text-gray-600'" v-text="col.active ? 'Hoạt động' : 'Đã ẩn'"></span></td>
        <td class="text-end pr-4">
          <button v-if="col.active === false" @click="restoreItem('collections', col)" class="btn btn-sm btn-light border border-success text-green-600 rounded-2 mr-1" title="Khôi phục"><i class="icon icon-arrow-counterclockwise"></i></button>
          <button @click="openForm('collections', col)" class="btn btn-sm btn-light border rounded-2 mr-1"><i class="icon icon-pencil"></i></button>
          <button @click="deleteItem('collections', col.id, col.name)" class="btn btn-sm btn-light border rounded-2 text-red-600"><i class="icon icon-trash"></i></button>
        </td>
      </tr></tbody>
    </table></div></div>
  </div>
</template>
