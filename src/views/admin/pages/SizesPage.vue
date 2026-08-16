<!-- Trang: Quản Lý Kích Thước -->
<script setup>
import { openForm, filteredSizes, deleteItem, restoreItem } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="fw-bold mb-0 text-dark">Quản Lý Kích Thước</h5>
      <button @click="openForm('sizes')" class="btn btn-dark btn-sm rounded-2 fw-bold shadow-sm px-3"><i class="bi bi-plus-lg me-1"></i> Thêm Size</button>
    </div>
    <div class="bg-white rounded-1 shadow-sm overflow-hidden"><div class="table-responsive"><table class="table align-middle mb-0">
      <thead><tr class="text-secondary small text-uppercase"><th class="ps-4">ID</th><th>Tên Size</th><th>Chuẩn</th><th>Trạng Thái</th><th class="text-end pe-4">Hành Động</th></tr></thead>
      <tbody>
        <tr v-for="s in filteredSizes" :key="s.id">
          <td class="ps-4 text-secondary small" v-text="'#' + s.id"></td>
          <td class="fw-medium" v-text="s.name"></td>
          <td class="small text-secondary" v-text="s.standard || '—'"></td>
          <td><span class="badge rounded-1" :class="s.active ? 'badge-active' : 'bg-secondary-subtle text-secondary'" v-text="s.active ? 'ACTIVE' : 'ẨN'"></span></td>
          <td class="text-end pe-4">
            <button v-if="s.active === false" @click="restoreItem('sizes', s)" class="btn btn-sm btn-light border border-success text-success rounded-2 me-1" title="Khôi phục"><i class="bi bi-arrow-counterclockwise"></i></button>
            <button @click="openForm('sizes', s)" class="btn btn-sm btn-light border rounded-2 me-1"><i class="bi bi-pencil"></i></button>
            <button @click="deleteItem('sizes', s.id, s.name)" class="btn btn-sm btn-light border rounded-2 text-danger"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
        <tr v-if="!filteredSizes.length"><td colspan="5" class="text-center text-secondary py-4">Chưa có size nào.</td></tr>
      </tbody>
    </table></div></div>
  </div>
</template>
