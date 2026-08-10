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
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="fw-bold mb-0 text-dark">Quản Lý Chất Liệu</h5>
    </div>
    <div class="row g-3">

      <!-- CHẤT LIỆU -->
      <div class="col-12">
        <div class="bg-white rounded-1 shadow-sm h-100 d-flex flex-column">
          <div class="p-3 border-bottom d-flex justify-content-between align-items-center">
            <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-layers me-2"></i>Chất Liệu</h6>
            <button @click="openForm('materials')" class="btn btn-dark btn-sm rounded-2 fw-bold"><i class="bi bi-plus-lg"></i></button>
          </div>
          <div class="table-responsive flex-grow-1">
            <table class="table align-middle mb-0">
              <thead><tr class="text-secondary small text-uppercase"><th class="ps-3">Tên</th><th class="text-center">SP</th><th class="text-end pe-3">Hành Động</th></tr></thead>
              <tbody>
                <tr v-for="m in filteredMaterials" :key="m.id">
                  <td class="ps-3"><span class="fw-medium" v-text="m.name"></span><span v-if="!m.active" class="badge rounded-1 bg-secondary-subtle text-secondary ms-2">ẨN</span></td>
                  <td class="text-center" v-text="getMaterialProductCount(m.id)"></td>
                  <td class="text-end pe-3">
                    <button v-if="m.active === false" @click="restoreItem('materials', m)" class="btn btn-sm btn-light border border-success text-success rounded-2 me-1" title="Khôi phục"><i class="bi bi-arrow-counterclockwise"></i></button>
                    <button @click="openForm('materials', m)" class="btn btn-sm btn-light border rounded-2 me-1"><i class="bi bi-pencil"></i></button>
                    <button @click="deleteItem('materials', m.id, m.name)" class="btn btn-sm btn-light border rounded-2 text-danger"><i class="bi bi-trash"></i></button>
                  </td>
                </tr>
                <tr v-if="!filteredMaterials.length"><td colspan="3" class="text-center text-secondary py-4 small">Chưa có chất liệu nào.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
