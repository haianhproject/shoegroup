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
    <div class="flex justify-between items-center mb-4">
      <p class="text-gray-600 mb-0 text-sm">
        Quản lý tất cả danh mục.
      </p>
      <button
        @click="openForm('categories')"
        class="btn btn-dark btn-sm rounded-2 font-bold shadow-sm px-3"
      >
        <i class="icon icon-plus-lg mr-1"></i> Thêm Danh Mục
      </button>
    </div>

    <div class="bg-white rounded-1 shadow-sm overflow-hidden mb-4">
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead>
            <tr class="text-gray-600 text-sm uppercase bg-gray-100">
              <th class="pl-4">ID</th>
              <th>Tên Danh Mục</th>
              <th>Bộ Môn</th>
              <th class="text-center">Số SP</th>
              <th>Trạng Thái</th>
              <th class="text-end pr-4">Hành Động</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in db.categories" :key="c.id">
              <td class="pl-4 text-gray-600 text-sm" v-text="'#' + c.id"></td>
              <td class="font-medium" v-text="c.name"></td>
              <td><span class="badge bg-gray-100 text-gray-900 border" v-text="c.sport || 'Chưa phân loại'"></span></td>
              <td class="text-center" v-text="getProductCount(c.id)"></td>
              <td>
                <span
                  class="badge rounded-1"
                  :class="
                    c.active
                      ? 'badge-active'
                      : 'bg-secondary-subtle text-gray-600'
                  "
                  v-text="c.active ? 'Hoạt động' : 'Ẩn'"
                ></span>
              </td>
              <td class="text-end pr-4">
                <button
                  v-if="c.active === false"
                  @click="restoreItem('categories', c)"
                  class="btn btn-sm btn-light border border-success text-green-600 rounded-2 mr-1"
                  title="Khôi phục"
                >
                  <i class="icon icon-arrow-counterclockwise"></i>
                </button>
                <button
                  @click="openForm('categories', c)"
                  class="btn btn-sm btn-light border rounded-2 mr-1"
                >
                  <i class="icon icon-pencil"></i>
                </button>
                <button
                  @click="deleteItem('categories', c.id, c.name)"
                  class="btn btn-sm btn-light border rounded-2 text-red-600"
                >
                  <i class="icon icon-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="!db.categories.length"
      class="text-center text-gray-600 py-5"
    >
      Chưa có danh mục nào.
    </div>
  </div>
</template>
