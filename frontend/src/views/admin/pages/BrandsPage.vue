<!-- Mục đích: Trang thêm, sửa, ngừng dùng và thống kê sản phẩm theo thương hiệu. -->
<!-- Trang: Thương Hiệu -->
<script setup>
import { openForm, filteredBrands, getBrandProductCount, deleteItem, restoreItem } from '../adminStore'
import { genericBrandLogo, resolveBrandLogo } from '../../../utils/brandLogos'

const useFallbackLogo = (event) => {
  event.target.onerror = null
  event.target.src = genericBrandLogo
}
</script>

<template>
  <div class="fade-in">
    <div class="flex justify-end mb-4"><button @click="openForm('brands')" class="btn btn-dark btn-sm rounded-2 font-bold shadow-sm px-3"><i class="icon icon-plus-lg mr-1"></i> Thêm Thương Hiệu</button></div>
    <div class="brand-grid">
      <div v-for="b in filteredBrands" :key="b.id" class="brand-grid-item">
        <article class="brand-card bg-white rounded-1 border h-full text-center" :class="{'opacity-50': b.active === false}">
          <div class="brand-logo-stage">
            <img :src="resolveBrandLogo(b)" :alt="`Logo ${b.name}`" class="brand-logo" @error="useFallbackLogo">
          </div>
          <h6 class="brand-name font-bold mb-1 text-gray-900">
            {{ b.name }}
            <span v-if="b.active === false" class="badge bg-red-600 ml-1" style="font-size:0.6rem">Đã ẩn</span>
          </h6>
          <p class="brand-count text-gray-600 text-sm" v-text="getBrandProductCount(b.id) + ' sản phẩm'"></p>
          <div class="brand-actions flex gap-2 justify-center">
            <button v-if="b.active === false" @click="restoreItem('brands', b)" class="btn btn-sm btn-light border border-success text-green-600 rounded-2" title="Khôi phục"><i class="icon icon-arrow-counterclockwise"></i></button>
            <button @click="openForm('brands', b)" class="btn btn-sm btn-light border rounded-2" title="Sửa"><i class="icon icon-pencil"></i></button>
            <button @click="deleteItem('brands', b.id, b.name)" class="btn btn-sm btn-light border rounded-2 text-red-600" title="Xóa mềm"><i class="icon icon-trash"></i></button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.brand-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.brand-grid-item { min-width: 0; }

.brand-card {
  display: flex;
  min-height: 248px;
  flex-direction: column;
  align-items: center;
  padding: 16px;
}

.brand-logo-stage {
  display: flex;
  width: 100%;
  height: 116px;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  overflow: hidden;
  border: 1px solid #ededee;
  border-radius: 10px;
  background: #fafafa;
}

.brand-logo {
  display: block;
  width: min(160px, 78%);
  height: 82px;
  object-fit: contain;
}

.brand-name {
  display: flex;
  min-height: 28px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  overflow-wrap: anywhere;
}

.brand-count { margin: 0 0 14px; }
.brand-actions { margin-top: auto; }

@media (max-width: 1199px) {
  .brand-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 767px) {
  .brand-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .brand-card { min-height: 224px; padding: 12px; }
  .brand-logo-stage { height: 98px; }
  .brand-logo { height: 70px; }
}

@media (max-width: 479px) {
  .brand-grid { grid-template-columns: 1fr; }
}
</style>
