```vue
<!-- Mục đích: Trang thêm, sửa, ngừng sử dụng và thống kê sản phẩm theo thương hiệu. -->
<!-- Trang: Thương Hiệu -->

<script setup>
import {
  openForm,
  filteredBrands,
  getBrandProductCount,
  restoreItem,
} from '../adminStore'

import {
  genericBrandLogo,
  resolveBrandLogo,
} from '../../../utils/brandLogos'

const useFallbackLogo = (event) => {
  event.target.onerror = null
  event.target.src = genericBrandLogo
}
</script>

<template>
  <div class="fade-in brands-page">
    <!-- Thanh công cụ -->
    <div class="brands-toolbar">
      <button
        type="button"
        @click="openForm('brands')"
        class="btn btn-dark btn-sm rounded-2 font-bold shadow-sm px-3"
      >
        <i class="icon icon-plus-lg mr-1"></i>
        Thêm thương hiệu
      </button>
    </div>

    <!-- Danh sách thương hiệu -->
    <div v-if="filteredBrands.length" class="brand-grid">
      <div
        v-for="b in filteredBrands"
        :key="b.id"
        class="brand-grid-item"
      >
        <article
          class="brand-card bg-white rounded-1 border h-full text-center"
          :class="{ 'brand-card-inactive': b.active === false }"
        >
          <!-- Logo -->
          <div class="brand-logo-stage">
            <img
              :src="resolveBrandLogo(b)"
              :alt="`Logo ${b.name}`"
              class="brand-logo"
              @error="useFallbackLogo"
            />
          </div>

          <!-- Tên thương hiệu -->
          <h6 class="brand-name font-bold mb-1 text-gray-900">
            {{ b.name || 'Chưa có tên' }}
          </h6>

          <!-- Trạng thái -->
          <span
            class="brand-status"
            :class="b.active === false ? 'status-inactive' : 'status-active'"
          >
            <span class="status-dot"></span>
            {{ b.active === false ? 'Không hoạt động' : 'Hoạt động' }}
          </span>

          <!-- Số sản phẩm -->
          <p class="brand-count text-gray-600 text-sm">
            {{ getBrandProductCount(b.id) }} sản phẩm
          </p>

          <!-- Thao tác -->
          <div class="brand-actions flex gap-2 justify-center">
            <button
              v-if="b.active === false"
              type="button"
              @click="restoreItem('brands', b)"
              class="btn btn-sm btn-light border border-success text-green-600 rounded-2"
              title="Kích hoạt lại thương hiệu"
              aria-label="Kích hoạt lại thương hiệu"
            >
              <i class="icon icon-arrow-counterclockwise"></i>
              <span>Kích hoạt lại</span>
            </button>

            <button
              type="button"
              @click="openForm('brands', b)"
              class="btn btn-sm btn-light border rounded-2"
              title="Sửa thương hiệu"
              aria-label="Sửa thương hiệu"
            >
              <i class="icon icon-pencil"></i>
              <span>Chỉnh Sửa</span>
            </button>
          </div>
        </article>
      </div>
    </div>

    <!-- Trạng thái danh sách trống -->
    <div v-else class="brand-empty">
      <i class="icon icon-tags"></i>
      <h3>Chưa có thương hiệu</h3>
      <p>Thêm thương hiệu để quản lý và theo dõi sản phẩm.</p>
      <button
        type="button"
        @click="openForm('brands')"
        class="btn btn-dark rounded-2"
      >
        <i class="icon icon-plus-lg mr-1"></i>
        Thêm thương hiệu
      </button>
    </div>
  </div>
</template>

<style scoped>
.brands-page {
  width: 100%;
  min-width: 0;
}

.brands-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.brands-toolbar button {
  min-height: 40px;
  font-size: 14px;
}

.brand-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.brand-grid-item {
  min-width: 0;
}

.brand-card {
  display: flex;
  min-height: 275px;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border-color: #e5e7eb;
  border-radius: 12px;
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.brand-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgb(0 0 0 / 7%);
}

.brand-card-inactive {
  background: #fafafa;
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
  background: #fff;
}

.brand-logo {
  display: block;
  width: min(160px, 78%);
  height: 82px;
  object-fit: contain;
}

.brand-name {
  display: block;
  width: 100%;
  min-height: 28px;
  margin: 0 0 8px;
  overflow-wrap: anywhere;
  font-size: 16px;
  line-height: 1.5;
}

.brand-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: 50%;
  background: currentColor;
}

.status-active {
  color: #15803d;
  background: #dcfce7;
}

.status-inactive {
  color: #6b7280;
  background: #f3f4f6;
}

.brand-count {
  margin: 12px 0 16px;
  font-size: 13px;
}

.brand-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: auto;
}

.brand-actions button {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 12px;
}

.brand-actions button i {
  font-size: 14px;
}

.brand-empty {
  display: flex;
  min-height: 260px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  background: #fff;
  text-align: center;
}

.brand-empty > i {
  margin-bottom: 12px;
  color: #9ca3af;
  font-size: 36px;
}

.brand-empty h3 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 18px;
  font-weight: 700;
}

.brand-empty p {
  margin: 0 0 18px;
  color: #6b7280;
  font-size: 14px;
}

@media (max-width: 1199px) {
  .brand-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .brand-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .brand-card {
    min-height: 250px;
    padding: 12px;
  }

  .brand-logo-stage {
    height: 98px;
  }

  .brand-logo {
    height: 70px;
  }

  .brand-actions button {
    padding: 6px 8px;
  }
}

@media (max-width: 479px) {
  .brand-grid {
    grid-template-columns: 1fr;
  }
}
</style>
```