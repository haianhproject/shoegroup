<!-- Trang: Nhóm Danh Mục -->
<script setup>
import { openForm, filteredCategories, getProductCount, deleteItem } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="d-flex justify-content-end mb-4"><button @click="openForm('categories')" class="btn btn-dark btn-sm rounded-3 fw-bold shadow-sm px-3"><i class="bi bi-plus-lg me-1"></i> Thêm Danh Mục</button></div>
    <div class="bg-white rounded-4 shadow-sm overflow-hidden"><div class="table-responsive"><table class="table align-middle mb-0">
      <thead><tr class="text-secondary small text-uppercase"><th class="ps-4">ID</th><th>Tên Danh Mục</th><th class="text-center">Số SP</th><th>Trạng Thái</th><th class="text-end pe-4">Hành Động</th></tr></thead>
      <tbody><tr v-for="c in filteredCategories" :key="c.id">
        <td class="ps-4 text-secondary small" v-text="'#' + c.id"></td><td class="fw-medium" v-text="c.name"></td>
        <td class="text-center" v-text="getProductCount(c.id)"></td>
        <td><span class="badge rounded-pill" :class="c.active ? 'badge-active' : 'bg-secondary-subtle text-secondary'" v-text="c.active ? 'Hoạt động' : 'Ẩn'"></span></td>
        <td class="text-end pe-4"><button @click="openForm('categories', c)" class="btn btn-sm btn-light border rounded-3 me-1"><i class="bi bi-pencil"></i></button><button @click="deleteItem('categories', c.id, c.name)" class="btn btn-sm btn-light border rounded-3 text-danger"><i class="bi bi-trash"></i></button></td>
      </tr></tbody>
    </table></div></div>
  </div>
</template>
