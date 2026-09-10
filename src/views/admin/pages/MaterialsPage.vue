<!-- Trang: Quản Lý Chất Liệu -->
<script setup>
import {
  openForm,
  deleteItem,
  restoreItem,
  filteredMaterials,
  getMaterialProductCount,
} from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="flex justify-between items-center mb-4">
      <h5 class="font-bold mb-0 text-gray-900">Quản Lý Chất Liệu</h5>
    </div>
    <div class="grid grid-cols-12 gap-3">

      <!-- CHẤT LIỆU -->
      <div class="col-span-12">
        <div class="bg-white rounded-1 shadow-sm h-full flex flex-col">
          <div class="p-3 border-b flex justify-between items-center">
            <h6 class="font-bold mb-0 text-gray-900"><i class="icon icon-layers mr-2"></i>Chất Liệu</h6>
            <button @click="openForm('materials')" class="btn btn-dark btn-sm rounded-2 font-bold"><i class="icon icon-plus-lg"></i></button>
          </div>
          <div class="table-responsive grow">
            <table class="table align-middle mb-0">
              <thead><tr class="text-gray-600 text-sm uppercase"><th class="pl-3">Tên</th><th class="text-center">SP</th><th class="text-end pr-3">Hành Động</th></tr></thead>
              <tbody>
                <tr v-for="m in filteredMaterials" :key="m.id">
                  <td class="pl-3"><span class="font-medium" v-text="m.name"></span><span v-if="!m.active" class="badge rounded-1 bg-secondary-subtle text-gray-600 ml-2">ẨN</span></td>
                  <td class="text-center" v-text="getMaterialProductCount(m.id)"></td>
                  <td class="text-end pr-3">
                    <button v-if="m.active === false" @click="restoreItem('materials', m)" class="btn btn-sm btn-light border border-success text-green-600 rounded-2 mr-1" title="Khôi phục"><i class="icon icon-arrow-counterclockwise"></i></button>
                    <button @click="openForm('materials', m)" class="btn btn-sm btn-light border rounded-2 mr-1"><i class="icon icon-pencil"></i></button>
                    <button @click="deleteItem('materials', m.id, m.name)" class="btn btn-sm btn-light border rounded-2 text-red-600"><i class="icon icon-trash"></i></button>
                  </td>
                </tr>
                <tr v-if="!filteredMaterials.length"><td colspan="3" class="text-center text-gray-600 py-4 text-sm">Chưa có chất liệu nào.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
