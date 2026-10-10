
<!-- Mục đích: Trang quản lý các kích thước dùng để tạo biến thể giày. -->
<!-- Trang: Quản Lý Kích Thước -->

<script setup>
import {
  openForm,
  filteredSizes,
  restoreItem,
} from '../adminStore'
</script>

<template>
  <div class="fade-in sizes-page">
    <!-- Tiêu đề và nút thêm -->
    <div class="page-header">
      <h5 class="page-title">Quản Lý Kích Thước</h5>

      <button
        type="button"
        @click="openForm('sizes')"
        class="btn btn-dark btn-sm add-button"
      >
        <i class="icon icon-plus-lg"></i>
        <span>Thêm kích thước</span>
      </button>
    </div>

    <!-- Danh sách kích thước -->
    <div class="sizes-card bg-white shadow-sm">
      <div class="card-heading">
        <h6 class="card-title">
          <i class="icon icon-rulers mr-2"></i>
          Danh sách kích thước
        </h6>

        <span class="total-count">
          {{ filteredSizes.length }} kích thước
        </span>
      </div>

      <div class="table-responsive">
        <table class="table align-middle mb-0 sizes-table">
          <thead>
            <tr>
              <th class="pl-4">ID</th>
              <th>Tên kích thước</th>
              <th>Chuẩn kích thước</th>
              <th>Trạng thái</th>
              <th class="text-end pr-4">Hành động</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="s in filteredSizes" :key="s.id">
              <!-- ID -->
              <td class="pl-4 text-gray-600">
                #{{ s.id }}
              </td>

              <!-- Tên kích thước -->
              <td>
                <span class="size-name">
                  {{ s.name }}
                </span>
              </td>

              <!-- Chuẩn kích thước -->
              <td>
                <span class="standard-text">
                  {{ s.standard || '—' }}
                </span>
              </td>

              <!-- Trạng thái -->
              <td>
                <span
                  class="status-badge"
                  :class="
                    s.active === false
                      ? 'status-inactive'
                      : 'status-active'
                  "
                >
                  <span
                    class="status-dot"
                    :class="
                      s.active === false
                        ? 'dot-inactive'
                        : 'dot-active'
                    "
                  ></span>

                  {{
                    s.active === false
                      ? 'Không hoạt động'
                      : 'Hoạt động'
                  }}
                </span>
              </td>

              <!-- Hành động -->
              <td class="text-end pr-4">
                <div class="action-buttons">
                  <button
                    v-if="s.active === false"
                    type="button"
                    @click="restoreItem('sizes', s)"
                    class="btn btn-sm btn-light border restore-button"
                    title="Kích hoạt lại"
                  >
                    <i class="icon icon-arrow-counterclockwise"></i>
                    <span>Kích hoạt lại</span>
                  </button>

                  <button
                    type="button"
                    @click="openForm('sizes', s)"
                    class="btn btn-sm btn-light border edit-button"
                    title="Chỉnh sửa"
                    aria-label="Chỉnh sửa kích thước"
                  >
                    <i class="icon icon-pencil"></i>
                    <span>Chỉnh sửa</span>
                  </button>
                </div>
              </td>
            </tr>

            <!-- Không có dữ liệu -->
            <tr v-if="!filteredSizes.length">
              <td colspan="5" class="empty-state">
                <div class="empty-content">
                  <i class="icon icon-rulers empty-icon"></i>

                  <h6>Chưa có kích thước nào</h6>

                  <p>
                    Thêm kích thước để sử dụng khi tạo biến thể giày.
                  </p>

                  <button
                    type="button"
                    @click="openForm('sizes')"
                    class="btn btn-dark btn-sm add-button"
                  >
                    <i class="icon icon-plus-lg"></i>
                    <span>Thêm kích thước</span>
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
.sizes-page {
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

/* Khung danh sách */
.sizes-card {
  width: 100%;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
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
.sizes-table {
  width: 100%;
  border-collapse: collapse;
}

.sizes-table thead th {
  padding: 14px 12px;
  background: #f9fafb;
  color: #4b5563;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
  border-bottom: 1px solid #e5e7eb;
}

.sizes-table tbody td {
  padding-top: 14px;
  padding-bottom: 14px;
  vertical-align: middle;
  border-bottom: 1px solid #f0f1f3;
}

.sizes-table tbody tr:last-child td {
  border-bottom: none;
}

.sizes-table tbody tr:hover:not(:last-child) {
  background: #fafafa;
}

/* Tên kích thước */
.size-name {
  color: #111827;
  font-size: 0.95rem;
  font-weight: 600;
}

/* Chuẩn kích thước */
.standard-text {
  color: #4b5563;
  font-size: 0.9rem;
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

  .sizes-table thead th,
  .sizes-table tbody td {
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

  .sizes-table {
    min-width: 700px;
  }
}
</style>
