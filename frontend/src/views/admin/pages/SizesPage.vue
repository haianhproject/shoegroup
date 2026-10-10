<!-- Mục đích: Trang quản lý các kích thước dùng để tạo biến thể giày. -->
<!-- Trang: Quản Lý Kích Thước -->
<script setup>
import { openForm, filteredSizes, toggleCatalogStatus, sizeSearch, sizeStandardFilter, sizeStatusFilter } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="flex justify-between items-center mb-4">
      <h5 class="font-bold mb-0 text-gray-900">Quản Lý Kích Thước</h5>
      <button @click="openForm('sizes')" class="btn btn-dark btn-sm rounded-2 font-bold shadow-sm px-3"><i class="icon icon-plus-lg mr-1"></i> Thêm kích cỡ</button>
    </div>
    <div class="flex flex-wrap gap-2 mb-3">
      <input v-model="sizeSearch" type="search" class="sg-input" style="flex:1;min-width:160px" placeholder="Tìm kích cỡ..." aria-label="Tìm kích cỡ">
      <select v-model="sizeStandardFilter" class="sg-input" style="width:150px" aria-label="Lọc hệ kích cỡ"><option value="">Tất cả hệ</option><option>EU</option><option>US</option><option>UK</option></select>
      <select v-model="sizeStatusFilter" class="sg-input" style="width:180px" aria-label="Lọc trạng thái"><option value="">Tất cả trạng thái</option><option value="active">Hoạt động</option><option value="inactive">Không hoạt động</option></select>
    </div>
    <div class="bg-white overflow-hidden"><div class="table-responsive"><table class="table align-middle mb-0">
      <thead><tr class="text-gray-600 text-sm uppercase"><th class="pl-4">ID</th><th>Tên Size</th><th>Chuẩn</th><th>Trạng Thái</th><th class="text-end pr-4">Hành Động</th></tr></thead>
      <tbody>
        <tr v-for="s in filteredSizes" :key="s.id">
          <td class="pl-4 text-gray-600 text-sm" v-text="'#' + s.id"></td>
          <td class="font-medium" v-text="s.name"></td>
          <td class="text-sm text-gray-600" v-text="s.standard || '—'"></td>
          <td><span class="badge rounded-1" :class="s.active ? 'badge-active' : 'bg-secondary-subtle text-gray-600'" v-text="s.active ? 'Hoạt động' : 'Không hoạt động'"></span></td>
          <td class="text-end pr-4">
            <button @click="openForm('sizes', s)" class="btn btn-sm btn-light border rounded-2 mr-1" title="Sửa kích cỡ" aria-label="Sửa kích cỡ"><i class="icon icon-pencil"></i></button>
            <input type="checkbox" role="switch" :checked="s.active" @change="toggleCatalogStatus('sizes',s,$event)" :aria-label="'Trạng thái kích cỡ '+s.name" :title="s.active?'Ngừng hoạt động':'Bật hoạt động'">
          </td>
        </tr>
        <tr v-if="!filteredSizes.length"><td colspan="5" class="text-center text-gray-600 py-4">Chưa có size nào.</td></tr>
      </tbody>
    </table></div></div>
  </div>
</template>
