
<!-- Mục đích: Trang quản lý tên, mã màu và trạng thái sử dụng màu sản phẩm. -->
<!-- Trang: Quản Lý Màu Sắc -->

<script setup>
import {
  openForm,
  filteredColors,
  restoreItem,
} from '../adminStore'
</script>

<template>
  <div class="fade-in colors-page">
    <!-- Tiêu đề và nút thêm -->
    <div class="page-header">
      <h5 class="page-title">Quản Lý Màu Sắc</h5>

      <button
        type="button"
        @click="openForm('colors')"
        class="btn btn-dark btn-sm add-button"
      >
        <i class="icon icon-plus-lg"></i>
        <span>Thêm màu</span>
      </button>
    </div>

    <!-- Bảng danh sách màu -->
    <div class="colors-card bg-white shadow-sm">
      <div class="card-heading">
        <h6 class="card-title">
          <i class="icon icon-palette mr-2"></i>
          Danh sách màu sắc
        </h6>

        <span class="total-count">
          {{ filteredColors.length }} màu
        </span>
      </div>

      <div class="table-responsive">
        <table class="table align-middle mb-0 colors-table">
          <thead>
            <tr>
              <th class="pl-4">ID</th>
              <th>Tên màu</th>
              <th>Mã màu</th>
              <th>Trạng thái</th>
              <th class="text-end pr-4">Hành động</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="c in filteredColors" :key="c.id">
              <!-- ID -->
              <td class="pl-4 text-gray-600">
                #{{ c.id }}
              </td>

              <!-- Tên màu -->
              <td>
                <span class="color-name">
                  {{ c.name }}
                </span>
              </td>

              <!-- Mã màu và ô màu -->
              <td>
                <div class="color-code">
                  <span
                    class="color-swatch-box"
                    :style="{ backgroundColor: c.hex || '#FFFFFF' }"
                    :title="c.hex || '#FFFFFF'"
                  ></span>

                  <span class="hex-text">
                    {{ c.hex || '#FFFFFF' }}
                  </span>
                </div>
              </td>

              <!-- Trạng thái -->
              <td>
                <span
                  class="status-badge"
                  :class="
                    c.active === false
                      ? 'status-inactive'
                      : 'status-active'
                  "
                >
                  <span
                    class="status-dot"
                    :class="
                      c.active === false
                        ? 'dot-inactive'
                        : 'dot-active'
                    "
                  ></span>

                  {{
                    c.active === false
                      ? 'Không hoạt động'
                      : 'Hoạt động'
                  }}
                </span>
              </td>

              <!-- Hành động -->
              <td class="text-end pr-4">
                <div class="action-buttons">
                  <button
                    v-if="c.active === false"
                    type="button"
                    @click="restoreItem('colors', c)"
                    class="btn btn-sm btn-light border restore-button"
                    title="Kích hoạt lại"
                  >
                    <i class="icon icon-arrow-counterclockwise"></i>
                    <span>Kích hoạt lại</span>
                  </button>

                  <button
                    type="button"
                    @click="openForm('colors', c)"
                    class="btn btn-sm btn-light border edit-button"
                    title="Chỉnh sửa"
                    aria-label="Chỉnh sửa màu sắc"
                  >
                    <i class="icon icon-pencil"></i>
                    <span>Chỉnh sửa</span>
                  </button>
                </div>
              </td>
            </tr>

            <!-- Danh sách trống -->
            <tr v-if="!filteredColors.length">
              <td colspan="5" class="empty-state">
                <div class="empty-content">
                  <i class="icon icon-palette empty-icon"></i>

                  <h6>Chưa có màu sắc nào</h6>

                  <p>
                    Thêm màu sắc để sử dụng trong quản lý sản phẩm.
                  </p>

                  <button
                    type="button"
                    @click="openForm('colors')"
                    class="btn btn-dark btn-sm add-button"
                  >
                    <i class="icon icon-plus-lg"></i>
                    <span>Thêm màu</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Tổng thể */
.colors-page {
  width: 100%;
  color: #1f2937;
}

/* Tiêu đề */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}

.page-title {
  margin: 0;
  color: #111827;
  font-size: 1.3rem;
  font-weight: 700;
}

/* Nút thêm */
.add-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 8px 14px;
  border-radius: 6px;
  font-weight: 600;
  white-space: nowrap;
}

.add-button i {
  font-size: 14px;
}

/* Khung bảng */
.colors-card {
  width: 100%;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

/* Phần đầu bảng */
.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.card-title {
  display: flex;
  align-items: center;
  margin: 0;
  color: #111827;
  font-size: 1rem;
  font-weight: 700;
}

.card-title i {
  font-size: 18px;
}

.total-count {
  flex-shrink: 0;
  padding: 5px 10px;
  border-radius: 6px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 0.875rem;
  font-weight: 600;
}

/* Bảng */
.colors-table {
  width: 100%;
  border-collapse: collapse;
}

.colors-table thead th {
  padding: 14px 12px;
  background: #f9fafb;
  color: #4b5563;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
  border-bottom: 1px solid #e5e7eb;
}

.colors-table tbody td {
  padding-top: 14px;
  padding-bottom: 14px;
  vertical-align: middle;
  border-bottom: 1px solid #f0f1f3;
}

.colors-table tbody tr:last-child td {
  border-bottom: none;
}

.colors-table tbody tr:hover:not(:last-child) {
  background: #fafafa;
}

/* Tên màu */
.color-name {
  color: #111827;
  font-size: 0.95rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

/* Ô màu và mã HEX */
.color-code {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.color-swatch-box {
  display: inline-block;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 3%);
}

.hex-text {
  color: #4b5563;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
}

/* Trạng thái */
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 6px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-active {
  background: #dcfce7;
  color: #166534;
}

.status-inactive {
  background: #fee2e2;
  color: #991b1b;
}

.status-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
}

.dot-active {
  background: #16a34a;
}

.dot-inactive {
  background: #dc2626;
}

/* Các nút hành động */
.action-buttons {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.action-buttons .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 36px;
  padding: 7px 11px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

/* Nút chỉnh sửa */
.edit-button {
  color: #374151;
  border-color: #d1d5db;
  background: #ffffff;
}

.edit-button:hover {
  color: #111827;
  border-color: #9ca3af;
  background: #f3f4f6;
}

.edit-button i {
  font-size: 14px;
}

/* Nút kích hoạt lại */
.restore-button {
  color: #15803d;
  background: #ffffff;
  border-color: #86efac !important;
}

.restore-button:hover {
  color: #166534;
  background: #f0fdf4;
}

/* Danh sách trống */
.empty-state {
  padding: 0 !important;
  text-align: center;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px;
}

.empty-icon {
  margin-bottom: 12px;
  color: #9ca3af;
  font-size: 36px;
}

.empty-content h6 {
  margin: 0 0 8px;
  color: #374151;
  font-size: 1rem;
  font-weight: 700;
}

.empty-content p {
  margin: 0 0 18px;
  color: #6b7280;
  font-size: 0.9rem;
}

/* Máy tính bảng */
@media (max-width: 767px) {
  .page-header {
    align-items: stretch;
  }

  .page-title {
    font-size: 1.15rem;
  }

  .page-header > .add-button {
    width: 100%;
  }

  .card-heading {
    padding: 12px;
  }

  .colors-table thead th,
  .colors-table tbody td {
    padding: 10px;
  }

  .action-buttons {
    flex-direction: column;
    align-items: stretch;
  }

  .action-buttons .btn {
    justify-content: center;
  }
}

/* Điện thoại nhỏ */
@media (max-width: 480px) {
  .card-heading {
    align-items: flex-start;
  }

  .card-title {
    font-size: 0.9rem;
  }

  .total-count {
    font-size: 0.75rem;
  }

  .colors-table {
    min-width: 720px;
  }
}
</style>
