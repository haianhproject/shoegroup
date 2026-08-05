<!-- Trang: Quản Lý Chất Liệu / Đế / Đệm -->
<script setup>
import {
  openForm,
  deleteItem,
  filteredMaterials,
  getMaterialProductCount,
  filteredSoles,
  getSoleProductCount,
  filteredCushionings,
  getCushioningProductCount,
} from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="fw-bold mb-0 text-dark">Quản Lý Chất Liệu &amp; Cấu Tạo Giày</h5>
    </div>
    <div class="row g-3">

      <!-- CHẤT LIỆU -->
      <div class="col-12 col-lg-4">
        <div class="bg-white rounded-4 shadow-sm h-100 d-flex flex-column">
          <div class="p-3 border-bottom d-flex justify-content-between align-items-center">
            <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-layers me-2"></i>Chất Liệu</h6>
            <button @click="openForm('materials')" class="btn btn-dark btn-sm rounded-3 fw-bold"><i class="bi bi-plus-lg"></i></button>
          </div>
          <div class="table-responsive flex-grow-1">
            <table class="table align-middle mb-0">
              <thead><tr class="text-secondary small text-uppercase"><th class="ps-3">Tên</th><th class="text-center">SP</th><th class="text-end pe-3">Hành Động</th></tr></thead>
              <tbody>
                <tr v-for="m in filteredMaterials" :key="m.id">
                  <td class="ps-3"><span class="fw-medium" v-text="m.name"></span><span v-if="!m.active" class="badge rounded-pill bg-secondary-subtle text-secondary ms-2">ẨN</span></td>
                  <td class="text-center" v-text="getMaterialProductCount(m.id)"></td>
                  <td class="text-end pe-3"><button @click="openForm('materials', m)" class="btn btn-sm btn-light border rounded-3 me-1"><i class="bi bi-pencil"></i></button><button @click="deleteItem('materials', m.id, m.name)" class="btn btn-sm btn-light border rounded-3 text-danger"><i class="bi bi-trash"></i></button></td>
                </tr>
                <tr v-if="!filteredMaterials.length"><td colspan="3" class="text-center text-secondary py-4 small">Chưa có chất liệu nào.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ĐẾ GIÀY -->
      <div class="col-12 col-lg-4">
        <div class="bg-white rounded-4 shadow-sm h-100 d-flex flex-column">
          <div class="p-3 border-bottom d-flex justify-content-between align-items-center">
            <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-badge-vo me-2"></i>Đế Giày</h6>
            <button @click="openForm('soles')" class="btn btn-dark btn-sm rounded-3 fw-bold"><i class="bi bi-plus-lg"></i></button>
          </div>
          <div class="table-responsive flex-grow-1">
            <table class="table align-middle mb-0">
              <thead><tr class="text-secondary small text-uppercase"><th class="ps-3">Tên</th><th class="text-center">SP</th><th class="text-end pe-3">Hành Động</th></tr></thead>
              <tbody>
                <tr v-for="s in filteredSoles" :key="s.id">
                  <td class="ps-3"><span class="fw-medium" v-text="s.name"></span><span v-if="!s.active" class="badge rounded-pill bg-secondary-subtle text-secondary ms-2">ẨN</span></td>
                  <td class="text-center" v-text="getSoleProductCount(s.id)"></td>
                  <td class="text-end pe-3"><button @click="openForm('soles', s)" class="btn btn-sm btn-light border rounded-3 me-1"><i class="bi bi-pencil"></i></button><button @click="deleteItem('soles', s.id, s.name)" class="btn btn-sm btn-light border rounded-3 text-danger"><i class="bi bi-trash"></i></button></td>
                </tr>
                <tr v-if="!filteredSoles.length"><td colspan="3" class="text-center text-secondary py-4 small">Chưa có loại đế nào.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ĐỆM GIÀY -->
      <div class="col-12 col-lg-4">
        <div class="bg-white rounded-4 shadow-sm h-100 d-flex flex-column">
          <div class="p-3 border-bottom d-flex justify-content-between align-items-center">
            <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-cloud me-2"></i>Đệm Giày</h6>
            <button @click="openForm('cushionings')" class="btn btn-dark btn-sm rounded-3 fw-bold"><i class="bi bi-plus-lg"></i></button>
          </div>
          <div class="table-responsive flex-grow-1">
            <table class="table align-middle mb-0">
              <thead><tr class="text-secondary small text-uppercase"><th class="ps-3">Tên</th><th class="text-center">SP</th><th class="text-end pe-3">Hành Động</th></tr></thead>
              <tbody>
                <tr v-for="c in filteredCushionings" :key="c.id">
                  <td class="ps-3"><span class="fw-medium" v-text="c.name"></span><span v-if="!c.active" class="badge rounded-pill bg-secondary-subtle text-secondary ms-2">ẨN</span></td>
                  <td class="text-center" v-text="getCushioningProductCount(c.id)"></td>
                  <td class="text-end pe-3"><button @click="openForm('cushionings', c)" class="btn btn-sm btn-light border rounded-3 me-1"><i class="bi bi-pencil"></i></button><button @click="deleteItem('cushionings', c.id, c.name)" class="btn btn-sm btn-light border rounded-3 text-danger"><i class="bi bi-trash"></i></button></td>
                </tr>
                <tr v-if="!filteredCushionings.length"><td colspan="3" class="text-center text-secondary py-4 small">Chưa có loại đệm nào.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
