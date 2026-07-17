<!-- Trang: Quản Lý Màu Sắc -->
<script setup>
import { openForm, filteredColors, deleteItem } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="fw-bold mb-0 text-dark">Quản Lý Màu Sắc</h5>
      <button @click="openForm('colors')" class="btn btn-dark btn-sm rounded-3 fw-bold shadow-sm px-3"><i class="bi bi-plus-lg me-1"></i> Thêm Màu</button>
    </div>
    <div class="bg-white rounded-4 shadow-sm overflow-hidden"><div class="table-responsive"><table class="table align-middle mb-0">
      <thead><tr class="text-secondary small text-uppercase"><th class="ps-4">ID</th><th>Tên Màu</th><th>Mã Màu</th><th>Trạng Thái</th><th class="text-end pe-4">Hành Động</th></tr></thead>
      <tbody>
        <tr v-for="c in filteredColors" :key="c.id">
          <td class="ps-4 text-secondary small" v-text="'#' + c.id"></td>
          <td class="fw-medium" v-text="c.name"></td>
          <td><span class="d-inline-flex align-items-center gap-2"><span class="color-swatch border" :style="{ backgroundColor: c.hex }"></span><span class="small text-secondary text-uppercase" v-text="c.hex"></span></span></td>
          <td><span class="badge rounded-pill" :class="c.active ? 'badge-active' : 'bg-secondary-subtle text-secondary'" v-text="c.active ? 'ACTIVE' : 'ẨN'"></span></td>
          <td class="text-end pe-4"><button @click="openForm('colors', c)" class="btn btn-sm btn-light border rounded-3 me-1"><i class="bi bi-pencil"></i></button><button @click="deleteItem('colors', c.id, c.name)" class="btn btn-sm btn-light border rounded-3 text-danger"><i class="bi bi-trash"></i></button></td>
        </tr>
        <tr v-if="!filteredColors.length"><td colspan="5" class="text-center text-secondary py-4">Chưa có màu nào.</td></tr>
      </tbody>
    </table></div></div>
  </div>
</template>

<style scoped>
.color-swatch { width: 22px; height: 22px; border-radius: 6px; display: inline-block; }
</style>
