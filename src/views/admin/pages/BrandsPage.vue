<!-- Trang: Thương Hiệu -->
<script setup>
import { openForm, filteredBrands, getBrandProductCount, deleteItem, restoreItem } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="flex justify-end mb-4"><button @click="openForm('brands')" class="btn btn-dark btn-sm rounded-2 font-bold shadow-sm px-3"><i class="icon icon-plus-lg mr-1"></i> Thêm Thương Hiệu</button></div>
    <div class="grid grid-cols-12 gap-3">
      <div v-for="b in filteredBrands" :key="b.id" class="col-span-6 md:col-span-4 xl:col-span-3">
        <div class="bg-white rounded-1 border p-4 h-full text-center" :class="{'opacity-50': b.active === false}">
          <img :src="b.logo_url || 'https://via.placeholder.com/80'" class="rounded-2 mb-3" style="height:64px;object-fit:contain;" @error="$event.target.src='https://via.placeholder.com/80'">
          <h6 class="font-bold mb-1 text-gray-900">
            {{ b.name }}
            <span v-if="b.active === false" class="badge bg-red-600 ml-1" style="font-size:0.6rem">Đã ẩn</span>
          </h6>
          <p class="text-gray-600 text-sm mb-3" v-text="getBrandProductCount(b.id) + ' sản phẩm'"></p>
          <div class="flex gap-2 justify-center">
            <button v-if="b.active === false" @click="restoreItem('brands', b)" class="btn btn-sm btn-light border border-success text-green-600 rounded-2" title="Khôi phục"><i class="icon icon-arrow-counterclockwise"></i></button>
            <button @click="openForm('brands', b)" class="btn btn-sm btn-light border rounded-2" title="Sửa"><i class="icon icon-pencil"></i></button>
            <button @click="deleteItem('brands', b.id, b.name)" class="btn btn-sm btn-light border rounded-2 text-red-600" title="Xóa mềm"><i class="icon icon-trash"></i></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
