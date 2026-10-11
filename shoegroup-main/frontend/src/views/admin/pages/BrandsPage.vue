<script setup>
import { 
  openForm, 
  filteredBrands, 
  brandSearch, 
  brandStatusFilter,
  toggleCatalogStatus 
} from '../adminStore';
import { genericBrandLogo, resolveBrandLogo } from '../../../utils/brandLogos';

function fallbackLogo(event) {
  event.target.onerror = null;
  event.target.src = genericBrandLogo;
}
</script>

<template>
  <div class="brands-page fade-in">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h5 class="font-bold mb-1 text-gray-900">Quản Lý Thương Hiệu</h5>
        <p class="text-xs text-gray-500 mb-0">Danh sách hãng và thương hiệu giày</p>
      </div>
      <button 
        type="button" 
        class="btn btn-dark btn-sm rounded-2 font-bold shadow-sm px-3" 
        @click="openForm('brands')"
      >
        <i class="icon icon-plus-lg mr-1"></i> Thêm thương hiệu
      </button>
    </div>

    <!-- Thanh tìm kiếm & lọc trạng thái -->
    <div class="flex flex-wrap gap-2 mb-3">
      <input 
        v-model="brandSearch" 
        type="search" 
        class="sg-input" 
        style="flex: 1; min-width: 200px;" 
        placeholder="Tìm theo mã (#ID) hoặc tên thương hiệu..." 
        aria-label="Tìm thương hiệu"
      />
      <select 
        v-model="brandStatusFilter" 
        class="sg-input" 
        style="width: 180px;" 
        aria-label="Lọc trạng thái"
      >
        <option value="">Tất cả trạng thái</option>
        <option value="active">Hoạt động</option>
        <option value="inactive">Không hoạt động</option>
      </select>
    </div>

    <!-- Bảng danh sách dạng danh mục -->
    <div class="bg-white overflow-hidden rounded-2 border">
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead>
            <tr class="text-gray-600 text-sm uppercase bg-gray-50">
              <th class="pl-4" style="width: 80px;">ID</th>
              <th style="width: 100px;">Logo</th>
              <th>Tên Thương Hiệu</th>
              <th>Mô Tả</th>
              <th style="width: 150px;">Trạng Thái</th>
              <th class="text-end pr-4" style="width: 140px;">Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in filteredBrands" :key="b.id">
              <td class="pl-4 text-gray-600 text-sm font-semibold">#{{ b.id }}</td>
              <td>
                <div class="brand-logo-wrapper">
                  <img 
                    :src="resolveBrandLogo(b)" 
                    :alt="b.name" 
                    class="brand-logo" 
                    @error="fallbackLogo" 
                  />
                </div>
              </td>
              <td class="font-bold text-gray-900">{{ b.name }}</td>
              <td class="text-sm text-gray-500 max-w-xs truncate" :title="b.description">
                {{ b.description || '—' }}
              </td>
              <td>
                <span 
                  class="badge rounded-1" 
                  :class="b.active ? 'badge-active' : 'bg-secondary-subtle text-gray-600'"
                >
                  {{ b.active ? 'Hoạt động' : 'Không hoạt động' }}
                </span>
              </td>
              <td class="text-end pr-4">
                <div class="inline-flex items-center gap-2">
                  <!-- Sửa -->
                  <button 
                    type="button" 
                    class="btn btn-sm btn-light border rounded-2" 
                    @click="openForm('brands', b)" 
                    title="Chỉnh sửa thương hiệu"
                  >
                    <i class="icon icon-pencil"></i>
                  </button>
                  <!-- Switch Bật/Tắt (Không có nút xóa) -->
                  <input 
                    type="checkbox" 
                    role="switch" 
                    :checked="b.active" 
                    @change="toggleCatalogStatus('brands', b, $event)" 
                    :title="b.active ? 'Ngừng hoạt động' : 'Bật hoạt động'"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="!filteredBrands.length">
              <td colspan="6" class="text-center py-4 text-gray-500">
                Không tìm thấy thương hiệu phù hợp.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.brand-logo-wrapper {
  width: 58px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  padding: 2px;
}
.brand-logo {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>