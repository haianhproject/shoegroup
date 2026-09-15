<!-- Trang: Quản Lý Kích Thước -->
<script setup>
import { openForm, filteredSizes, deleteItem, restoreItem } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="flex justify-between items-center mb-4">
      <h5 class="font-bold mb-0 text-gray-900">Quản Lý Kích Thước</h5>
      <button @click="openForm('sizes')" class="btn btn-dark btn-sm rounded-2 font-bold shadow-sm px-3"><i class="icon icon-plus-lg mr-1"></i> Thêm Size</button>
    </div>
    <div class="bg-white rounded-1 shadow-sm overflow-hidden"><div class="table-responsive"><table class="table align-middle mb-0">
      <thead><tr class="text-gray-600 text-sm uppercase"><th class="pl-4">ID</th><th>Tên Size</th><th>Chuẩn</th><th>Trạng Thái</th><th class="text-end pr-4">Hành Động</th></tr></thead>
      <tbody>
        <tr v-for="s in filteredSizes" :key="s.id">
          <td class="pl-4 text-gray-600 text-sm" v-text="'#' + s.id"></td>
          <td class="font-medium" v-text="s.name"></td>
          <td class="text-sm text-gray-600" v-text="s.standard || '—'"></td>
          <td><span class="badge rounded-1" :class="s.active ? 'badge-active' : 'bg-secondary-subtle text-gray-600'" v-text="s.active ? 'ACTIVE' : 'ẨN'"></span></td>
          <td class="text-end pr-4">
            <button v-if="s.active === false" @click="restoreItem('sizes', s)" class="btn btn-sm btn-light border border-success text-green-600 rounded-2 mr-1" title="Khôi phục"><i class="icon icon-arrow-counterclockwise"></i></button>
            <button @click="openForm('sizes', s)" class="btn btn-sm btn-light border rounded-2 mr-1"><i class="icon icon-pencil"></i></button>
            <button @click="deleteItem('sizes', s.id, s.name)" class="btn btn-sm btn-light border rounded-2 text-red-600"><i class="icon icon-trash"></i></button>
          </td>
        </tr>
        <tr v-if="!filteredSizes.length"><td colspan="5" class="text-center text-gray-600 py-4">Chưa có size nào.</td></tr>
      </tbody>
    </table></div></div>
  </div>
</template>
