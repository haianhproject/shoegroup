<!-- Trang: Thương Hiệu -->
<script setup>
import { openForm, filteredBrands, getBrandProductCount, deleteItem } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="d-flex justify-content-end mb-4"><button @click="openForm('brands')" class="btn btn-dark btn-sm rounded-3 fw-bold shadow-sm px-3"><i class="bi bi-plus-lg me-1"></i> Thêm Thương Hiệu</button></div>
    <div class="row g-3">
      <div v-for="b in filteredBrands" :key="b.id" class="col-6 col-md-4 col-xl-3">
        <div class="bg-white rounded-4 shadow-sm p-4 h-100 text-center dashboard-card">
          <img :src="b.logo_url || 'https://via.placeholder.com/80'" class="rounded-3 mb-3" style="height:64px;object-fit:contain;" @error="$event.target.src='https://via.placeholder.com/80'">
          <h6 class="fw-bold mb-1 text-dark" v-text="b.name"></h6>
          <p class="text-secondary small mb-3" v-text="getBrandProductCount(b.id) + ' sản phẩm'"></p>
          <div class="d-flex gap-2 justify-content-center"><button @click="openForm('brands', b)" class="btn btn-sm btn-light border rounded-3"><i class="bi bi-pencil"></i></button><button @click="deleteItem('brands', b.id, b.name)" class="btn btn-sm btn-light border rounded-3 text-danger"><i class="bi bi-trash"></i></button></div>
        </div>
      </div>
    </div>
  </div>
</template>
