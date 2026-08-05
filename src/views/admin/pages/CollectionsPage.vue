<!-- Trang: Bộ Sưu Tập -->
<script setup>
import { openForm, filteredCollections, getBrandName, deleteItem, restoreItem } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="d-flex justify-content-end mb-4"><button @click="openForm('collections')" class="btn btn-dark btn-sm rounded-3 fw-bold shadow-sm px-3"><i class="bi bi-plus-lg me-1"></i> Thêm Bộ Sưu Tập</button></div>
    <div class="bg-white rounded-4 shadow-sm overflow-hidden"><div class="table-responsive"><table class="table align-middle mb-0">
      <thead><tr class="text-secondary small text-uppercase"><th class="ps-4">ID</th><th>Tên Bộ Sưu Tập</th><th>Thương Hiệu</th><th>Trạng Thái</th><th class="text-end pe-4">Hành Động</th></tr></thead>
      <tbody><tr v-for="col in filteredCollections" :key="col.id">
        <td class="ps-4 text-secondary small" v-text="'#' + col.id"></td><td class="fw-medium" v-text="col.name"></td>
        <td class="small" v-text="getBrandName(col.brand_id)"></td>
        <td><span class="badge rounded-pill" :class="col.active ? 'badge-active' : 'bg-secondary-subtle text-secondary'" v-text="col.active ? 'Hoạt động' : 'Ẩn'"></span></td>
        <td class="text-end pe-4">
          <button v-if="col.active === false" @click="restoreItem('collections', col)" class="btn btn-sm btn-light border border-success text-success rounded-3 me-1" title="Khôi phục"><i class="bi bi-arrow-counterclockwise"></i></button>
          <button @click="openForm('collections', col)" class="btn btn-sm btn-light border rounded-3 me-1"><i class="bi bi-pencil"></i></button>
          <button @click="deleteItem('collections', col.id, col.name)" class="btn btn-sm btn-light border rounded-3 text-danger"><i class="bi bi-trash"></i></button>
        </td>
      </tr></tbody>
    </table></div></div>
  </div>
</template>
