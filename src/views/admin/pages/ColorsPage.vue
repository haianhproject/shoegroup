<!-- Trang: Quản Lý Màu Sắc -->
<script setup>
import { openForm, filteredColors, deleteItem, restoreItem } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="flex justify-between items-center mb-4">
      <h5 class="font-bold mb-0 text-gray-900">Quản Lý Màu Sắc</h5>
      <button @click="openForm('colors')" class="btn btn-dark btn-sm font-medium px-3"><i class="icon icon-plus-lg mr-1"></i> Thêm Màu</button>
    </div>
    <div class="bg-white shadow-sm overflow-hidden" style="border-radius: 4px;"><div class="table-responsive"><table class="table align-middle mb-0">
      <thead><tr class="text-gray-600 text-sm uppercase bg-gray-100"><th class="pl-4">ID</th><th>Tên Màu</th><th>Mã Màu</th><th>Trạng Thái</th><th class="text-end pr-4">Hành Động</th></tr></thead>
      <tbody>
        <tr v-for="c in filteredColors" :key="c.id">
          <td class="pl-4 text-gray-600 text-sm" v-text="'#' + c.id"></td>
          <td class="font-medium" v-text="c.name"></td>
          <td>
            <span class="inline-flex items-center gap-2">
              <span class="color-swatch-box border" :style="{ backgroundColor: c.hex }"></span>
              <span class="text-sm text-gray-600 uppercase" v-text="c.hex"></span>
            </span>
          </td>
          <td>
            <span class="badge" style="border-radius: 2px; font-size: 0.72rem;"
              :class="c.active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 border'"
              v-text="c.active ? 'Hoạt động' : 'Đã ẩn'"></span>
          </td>
          <td class="text-end pr-4">
            <button v-if="c.active === false" @click="restoreItem('colors', c)" class="btn btn-sm btn-light border mr-1" style="border-radius: 3px;" title="Khôi phục"><i class="icon icon-arrow-counterclockwise"></i></button>
            <button @click="openForm('colors', c)" class="btn btn-sm btn-light border mr-1" style="border-radius: 3px;"><i class="icon icon-pencil"></i></button>
            <button @click="deleteItem('colors', c.id, c.name)" class="btn btn-sm btn-light border text-red-600" style="border-radius: 3px;"><i class="icon icon-trash"></i></button>
          </td>
        </tr>
        <tr v-if="!filteredColors.length"><td colspan="5" class="text-center text-gray-600 py-4">Chưa có màu nào.</td></tr>
      </tbody>
    </table></div></div>
  </div>
</template>

<style scoped>
/* Swatch màu: hình vuông nhỏ gọn, bo cực ít */
.color-swatch-box {
  width: 20px;
  height: 20px;
  border-radius: 2px;
  display: inline-block;
  flex-shrink: 0;
}
</style>
