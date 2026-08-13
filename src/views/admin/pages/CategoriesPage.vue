<!-- Trang: Danh Muc Bo Mon -->
<script setup>
import {
  openForm,
  db,
  getProductCount,
  deleteItem,
  restoreItem,
} from "../adminStore";
</script>

<template>
  <div class="fade-in">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <p class="text-secondary mb-0 small">
        Quản lý tất cả danh mục.
      </p>
      <button
        @click="openForm('categories')"
        class="btn btn-dark btn-sm rounded-2 fw-bold shadow-sm px-3"
      >
        <i class="bi bi-plus-lg me-1"></i> Thêm Danh Mục
      </button>
    </div>

    <div class="bg-white rounded-1 shadow-sm overflow-hidden mb-4">
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead>
            <tr class="text-secondary small text-uppercase bg-light">
              <th class="ps-4">ID</th>
              <th>Tên Danh Mục</th>
              <th>Bộ Môn</th>
              <th class="text-center">Số SP</th>
              <th>Trạng Thái</th>
              <th class="text-end pe-4">Hành Động</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in db.categories" :key="c.id">
              <td class="ps-4 text-secondary small" v-text="'#' + c.id"></td>
              <td class="fw-medium" v-text="c.name"></td>
              <td><span class="badge bg-light text-dark border" v-text="c.sport || 'Chưa phân loại'"></span></td>
              <td class="text-center" v-text="getProductCount(c.id)"></td>
              <td>
                <span
                  class="badge rounded-1"
                  :class="
                    c.active
                      ? 'badge-active'
                      : 'bg-secondary-subtle text-secondary'
                  "
                  v-text="c.active ? 'Hoạt động' : 'Ẩn'"
                ></span>
              </td>
              <td class="text-end pe-4">
                <button
                  v-if="c.active === false"
                  @click="restoreItem('categories', c)"
                  class="btn btn-sm btn-light border border-success text-success rounded-2 me-1"
                  title="Khôi phục"
                >
                  <i class="bi bi-arrow-counterclockwise"></i>
                </button>
                <button
                  @click="openForm('categories', c)"
                  class="btn btn-sm btn-light border rounded-2 me-1"
                >
                  <i class="bi bi-pencil"></i>
                </button>
                <button
                  @click="deleteItem('categories', c.id, c.name)"
                  class="btn btn-sm btn-light border rounded-2 text-danger"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="!db.categories.length"
      class="text-center text-secondary py-5"
    >
      Chưa có danh mục nào.
    </div>
  </div>
</template>
