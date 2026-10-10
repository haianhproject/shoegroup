<!-- Mục đích: Danh sách thương hiệu, logo, số sản phẩm và trạng thái hoạt động. -->
<script setup>
import { openForm, filteredBrands, brandSearch, getBrandProductCount, toggleCatalogStatus } from '../adminStore';
import { genericBrandLogo, resolveBrandLogo } from '../../../utils/brandLogos';
function fallback(event) { event.target.onerror=null; event.target.src=genericBrandLogo; }
</script>
<template>
  <div class="brands-page fade-in">
    <div class="brands-toolbar">
      <h5>Quản lý thương hiệu</h5>
      <button type="button" class="btn btn-dark" @click="openForm('brands')"><i class="icon icon-plus-lg"></i> Thêm thương hiệu</button>
    </div>
    <input v-model="brandSearch" type="search" class="sg-input brands-search" placeholder="Tìm theo mã hoặc tên thương hiệu" aria-label="Tìm thương hiệu">
    <div class="table-responsive">
      <table class="table align-middle mb-0">
        <thead><tr><th>ID</th><th>Logo</th><th>Thương hiệu</th><th>Số sản phẩm</th><th>Trạng thái</th><th class="text-end">Thao tác</th></tr></thead>
        <tbody>
          <tr v-for="b in filteredBrands" :key="b.id">
            <td>#{{ b.id }}</td>
            <td><img :src="resolveBrandLogo(b)" :alt="b.name" class="brand-logo" @error="fallback"></td>
            <td class="brand-name">{{ b.name }}</td>
            <td>{{ getBrandProductCount(b.id) }}</td>
            <td><span class="badge" :class="b.active?'badge-active':'bg-light text-secondary'">{{ b.active?'Hoạt động':'Không hoạt động' }}</span></td>
            <td class="text-end"><div class="brand-actions">
              <button type="button" class="btn btn-sm btn-light border" @click="openForm('brands',b)" title="Sửa thương hiệu" :aria-label="'Sửa thương hiệu '+b.name"><i class="icon icon-pencil"></i></button>
              <input type="checkbox" role="switch" :checked="b.active" @change="toggleCatalogStatus('brands',b,$event)" :aria-label="'Trạng thái thương hiệu '+b.name" :title="b.active?'Ngừng hoạt động':'Bật hoạt động'">
            </div></td>
          </tr>
          <tr v-if="!filteredBrands.length"><td colspan="6" class="text-center py-4 text-gray-600">Không có thương hiệu phù hợp.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<style scoped>
.brands-page { min-width:0; }
.brands-toolbar { display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px; }
.brands-toolbar h5 { margin:0;font-size:20px;font-weight:700; }
.brands-search { max-width:420px;margin-bottom:16px; }
.brand-logo { width:64px;height:42px;object-fit:contain;background:white; }
.brand-name { min-width:130px;overflow-wrap:anywhere; }
.brand-actions { display:flex;justify-content:flex-end;align-items:center;gap:12px; }
.table-responsive { background:white; }
.table { min-width:620px; }
th { white-space:nowrap; }
@media(max-width:480px) { .brands-toolbar { align-items:stretch; } .brands-toolbar button { width:100%; } }
</style>
