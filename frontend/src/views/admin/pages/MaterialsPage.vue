
<!-- Mục đích: Trang quản lý chất liệu được gắn với sản phẩm giày. -->
<!-- Trang: Quản Lý Chất Liệu -->

<script setup>
import {
  openForm,
  restoreItem,
  filteredMaterials,
  getMaterialProductCount,
} from '../adminStore'
</script>

<template>
  <div class="fade-in materials-page">
    <!-- Tiêu đề và nút thêm -->
    <div class="page-header">
      <h5 class="page-title">Quản Lý Chất Liệu</h5>

      <button
        type="button"
        @click="openForm('materials')"
        class="btn btn-dark btn-sm rounded-2 font-bold add-button"
      >
        <i class="icon icon-plus-lg"></i>
        <span>Thêm chất liệu</span>
      </button>
    </div>

    <!-- Danh sách chất liệu -->
    <div class="materials-card bg-white rounded-1 shadow-sm">
      <div class="card-heading">
        <h6 class="card-title">
          <i class="icon icon-layers mr-2"></i>
          Danh sách chất liệu
        </h6>

        <span class="total-count">
          {{ filteredMaterials.length }} chất liệu
        </span>
      </div>

      <div class="table-responsive">
        <table class="table align-middle mb-0 materials-table">
          <thead>
            <tr>
              <th class="pl-3">STT</th>
              <th>Tên chất liệu</th>
              <th class="text-center">Số sản phẩm</th>
              <th class="text-center">Trạng thái</th>
              <th class="text-end pr-3">Hành động</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(m, index) in filteredMaterials"
              :key="m.id"
            >
              <!-- STT -->
              <td class="pl-3 text-gray-600">
                {{ index + 1 }}
              </td>

              <!-- Tên chất liệu -->
              <td>
                <span class="material-name">
                  {{ m.name }}
                </span>
              </td>

              <!-- Số lượng sản phẩm -->
              <td class="text-center">
                <span class="product-count">
                  {{ getMaterialProductCount(m.id) }}
                </span>
              </td>

              <!-- Trạng thái -->
              <td class="text-center">
                <span
                  class="status-badge"
                  :class="
                    m.active === false
                      ? 'status-inactive'
                      : 'status-active'
                  "
                >
                  <i
                    class="status-dot"
                    :class="
                      m.active === false
                        ? 'dot-inactive'
                        : 'dot-active'
                    "
                  ></i>

                  {{
                    m.active === false
                      ? 'Không hoạt động'
                      : 'Hoạt động'
                  }}
                </span>
              </td>

              <!-- Hành động -->
              <td class="text-end pr-3">
                <div class="action-buttons">
                  <!-- Kích hoạt lại chất liệu -->
                  <button
                    v-if="m.active === false"
                    type="button"
                    @click="restoreItem('materials', m)"
                    class="btn btn-sm btn-light border border-success restore-button"
                    title="Kích hoạt lại"
                  >
                    <i class="icon icon-arrow-counterclockwise"></i>
                    <span>Kích hoạt lại</span>
                  </button>

                  <!-- Chỉnh sửa chất liệu -->
                  <button
                    type="button"
                    @click="openForm('materials', m)"
                    class="btn btn-sm btn-light border edit-button"
                    title="Chỉnh sửa"
                    aria-label="Chỉnh sửa chất liệu"
                  >
                    <i class="icon icon-pencil"></i>
                    <span>Chỉnh sửa</span>
                  </button>
                </div>
              </td>
            </tr>

            <!-- Danh sách trống -->
            <tr v-if="!filteredMaterials.length">
              <td colspan="5" class="empty-state">
                <div class="empty-content">
                  <i class="icon icon-layers empty-icon"></i>

                  <h6>Chưa có chất liệu nào</h6>

                  <p>
                    Thêm chất liệu để sử dụng khi quản lý sản phẩm giày.
                  </p>

                  <button
                    type="button"
                    @click="openForm('materials')"
                    class="btn btn-dark btn-sm rounded-2 add-empty-button"
                  >
                    <i class="icon icon-plus-lg"></i>
                    <span>Thêm chất liệu</span>
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
.materials-page {
  width: 100%;
  color: #1f2937;
}

/* Tiêu đề trang */
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
.add-button,
.add-empty-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 8px 14px;
  font-weight: 600;
  white-space: nowrap;
}

.add-button i,
.add-empty-button i {
  font-size: 14px;
}

/* Khung danh sách */
.materials-card {
  width: 100%;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

/* Tiêu đề bảng */
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
.materials-table {
  width: 100%;
  border-collapse: collapse;
}

.materials-table thead th {
  padding: 14px 12px;
  background: #f9fafb;
  color: #4b5563;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
  border-bottom: 1px solid #e5e7eb;
}

.materials-table tbody td {
  padding-top: 14px;
  padding-bottom: 14px;
  vertical-align: middle;
  border-bottom: 1px solid #f0f1f3;
}

.materials-table tbody tr:last-child td {
  border-bottom: none;
}

.materials-table tbody tr:hover:not(:last-child) {
  background: #fafafa;
}

/* Tên chất liệu */
.material-name {
  color: #111827;
  font-size: 0.95rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

/* Số sản phẩm */
.product-count {
  display: inline-flex;
  min-width: 32px;
  min-height: 28px;
  align-items: center;
  justify-content: center;
  padding: 3px 8px;
  border-radius: 6px;
  background: #f3f4f6;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 600;
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

/* Các nút thao tác */
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

/* Responsive máy tính bảng */
@media (max-width: 767px) {
  .page-header {
    align-items: stretch;
  }

  .page-title {
    font-size: 1.15rem;
  }

  .add-button {
    width: 100%;
  }

  .card-heading {
    padding: 12px;
  }

  .materials-table thead th,
  .materials-table tbody td {
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

/* Responsive điện thoại nhỏ */
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

  .materials-table {
    min-width: 680px;
  }
}
</style>
