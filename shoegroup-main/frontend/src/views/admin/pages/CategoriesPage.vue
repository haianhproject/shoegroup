<!-- Mục đích: Danh sách danh mục, tìm kiếm và bật/tắt trạng thái không xóa dữ liệu. -->
<!-- Trang quản lý danh mục / bộ môn -->
<script setup>
import { computed, ref } from "vue";
import {
  openForm,
  db,
  getProductCount,
  toggleCatalogStatus,
} from "../adminStore";

const searchText = ref("");

/**
 * Sắp xếp ID tăng dần và tìm kiếm danh mục.
 * Không thay đổi trực tiếp mảng dữ liệu gốc.
 */
const categories = computed(() => {
  const list = Array.isArray(db.categories) ? db.categories : [];

  return [...list]
    .sort((a, b) => Number(a.id) - Number(b.id))
    .filter((c) => {
      const keyword = searchText.value.trim().toLowerCase();

      if (!keyword) return true;

      return (
        String(c.id ?? "").toLowerCase().includes(keyword) ||
        String(c.name ?? "").toLowerCase().includes(keyword) ||
        String(c.sport ?? "").toLowerCase().includes(keyword)
      );
    });
});

const getStatusText = (category) =>
  category.active === false ? "Không hoạt động" : "Hoạt động";

const getStatusClass = (category) =>
  category.active === false
    ? "status-inactive"
    : "status-active";

/**
 * Chỉ mở biểu mẫu khi thêm mới hoặc chỉnh sửa.
 * Việc kiểm tra bắt buộc khi lưu cần được thực hiện
 * trong hàm saveForm của adminStore.js.
 */
function addCategory() {
  openForm("categories");
}

function editCategory(category) {
  openForm("categories", category);
}
</script>

<template>
  <div class="categories-page">
    <!-- Tiêu đề -->
    <div class="page-heading">
      <div>
        <h2 class="page-title">Quản lý danh mục</h2>
        <p class="page-description">
          Quản lý danh mục và bộ môn dùng để phân loại sản phẩm.
        </p>
      </div>

      <button class="btn-primary-custom" @click="addCategory">
        <i class="icon icon-plus-lg" aria-hidden="true"></i>
        Thêm danh mục
      </button>
    </div>

    <!-- Thống kê -->
    <div class="summary-card">
      <i class="icon icon-collection summary-icon" aria-hidden="true"></i>
      <div>
        <div class="summary-label">Tổng số danh mục</div>
        <div class="summary-value">
          {{ db.categories?.length ?? 0 }}
        </div>
      </div>
    </div>

    <!-- Danh sách -->
    <div class="content-card">
      <div class="table-toolbar">
        <div>
          <h3 class="section-title">Danh sách danh mục</h3>
        </div>

        <input
          v-model="searchText"
          type="search"
          class="search-input"
          placeholder="Tìm theo ID, tên danh mục, bộ môn..."
          aria-label="Tìm kiếm danh mục"
        />
      </div>

      <div class="table-responsive">
        <table class="category-table">
          <thead>
            <tr>
              <th class="id-column">ID</th>
              <th>Tên danh mục <span class="required-mark">*</span></th>
              <th>Bộ môn <span class="required-mark">*</span></th>
              <th class="center-column">Số sản phẩm</th>
              <th>Trạng thái</th>
              <th class="action-column">Hành động</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="category in categories" :key="category.id">
              <td class="id-cell">
                #{{ category.id }}
              </td>

              <td class="name-cell">
                {{ category.name || "Chưa cập nhật" }}
              </td>

              <td>
                <span class="sport-tag">
                  {{ category.sport || "Chưa phân loại" }}
                </span>
              </td>

              <td class="center-column">
                {{ getProductCount(category.id) }}
              </td>

              <td>
                <span
                  class="status-badge"
                  :class="getStatusClass(category)"
                >
                  <span class="status-dot"></span>
                  {{ getStatusText(category) }}
                </span>
              </td>

              <td class="action-column">
                <button
                  type="button"
                  class="btn-edit"
                  title="Chỉnh sửa danh mục"
                  @click="editCategory(category)"
                >
                  <i class="icon icon-pencil" aria-hidden="true"></i>
                </button>
                <input type="checkbox" role="switch" :checked="category.active" @change="toggleCatalogStatus('categories',category,$event)" :aria-label="'Trạng thái danh mục '+category.name" :title="category.active?'Ngừng hoạt động':'Bật hoạt động'">
              </td>
            </tr>

            <tr v-if="categories.length === 0">
              <td colspan="6" class="empty-cell">
                <i class="icon icon-collection empty-icon" aria-hidden="true"></i>
                <p>
                  {{
                    searchText.trim()
                      ? "Không tìm thấy danh mục phù hợp."
                      : "Chưa có danh mục nào."
                  }}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-footer">
        Hiển thị {{ categories.length }} / {{ db.categories?.length ?? 0 }}
        danh mục
      </div>
    </div>

  </div>
</template>

<style scoped>
.categories-page {
  width: 100%;
  padding: 0;
  color: #1f2937;
  font-size: 15px;
}

.page-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.page-title {
  margin: 0 0 8px;
  font-size: 20px;
  line-height: 1.3;
  font-weight: 750;
  color: #111827;
}

.page-description,
.section-description {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.btn-primary-custom {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 18px;
  border: 0;
  border-radius: 8px;
  background: #111827;
  color: #fff;
  font-size: 15px;
  font-weight: 650;
  cursor: pointer;
  white-space: nowrap;
}

.btn-primary-custom:hover {
  background: #374151;
}

.button-icon {
  font-size: 22px;
  line-height: 1;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 16px;
  width: fit-content;
  min-width: 245px;
  padding: 18px 22px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.summary-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #f3f4f6;
  color: #374151;
  font-size: 26px;
}

.summary-label {
  margin-bottom: 5px;
  color: #6b7280;
  font-size: 13px;
}

.summary-value {
  color: #111827;
  font-size: 25px;
  font-weight: 750;
}

.content-card {
  overflow: hidden;
  border-radius: 0;
  background: #fff;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding: 22px;
  border-bottom: 1px solid #e5e7eb;
}

.section-title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 750;
  color: #111827;
}

.search-input {
  width: min(100%, 360px);
  min-height: 42px;
  padding: 10px 13px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  outline: none;
  font-size: 14px;
}

.search-input:focus {
  border-color: #6b7280;
  box-shadow: 0 0 0 3px rgb(107 114 128 / 12%);
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.category-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.category-table thead {
  background: #f9fafb;
}

.category-table th {
  padding: 15px 16px;
  border-bottom: 1px solid #e5e7eb;
  color: #4b5563;
  font-size: 12px;
  font-weight: 750;
  text-transform: uppercase;
  white-space: nowrap;
}

.category-table td {
  padding: 17px 16px;
  border-bottom: 1px solid #f0f1f3;
  font-size: 14px;
  vertical-align: middle;
}

.category-table tbody tr:last-child td {
  border-bottom: 0;
}

.category-table tbody tr:hover {
  background: #fafafa;
}

.id-column {
  width: 85px;
}

.id-cell {
  color: #6b7280;
  font-weight: 650;
}

.name-cell {
  min-width: 180px;
  color: #111827;
  font-weight: 650;
}

.required-mark {
  color: #dc2626;
  font-weight: 800;
}

.sport-tag {
  display: inline-block;
  padding: 5px 9px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
  color: #374151;
  font-size: 12px;
}

.center-column {
  text-align: center !important;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}

.status-active {
  background: #ecfdf3;
  color: #166534;
}

.status-inactive {
  background: #f3f4f6;
  color: #4b5563;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.action-column {
  min-width: 140px;
  text-align: right;
  white-space: nowrap;
}
.action-column input { margin-left:12px; }

.btn-edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 11px;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  background: #fff;
  color: #374151;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}

.btn-edit:hover {
  border-color: #9ca3af;
  background: #f9fafb;
}

.btn-edit span {
  font-size: 17px;
}

.empty-cell {
  padding: 48px 20px !important;
  text-align: center;
  color: #6b7280;
}

.empty-cell p {
  margin: 10px 0 0;
}

.empty-icon {
  font-size: 30px;
  color: #9ca3af;
}

.table-footer {
  padding: 14px 22px;
  border-top: 1px solid #e5e7eb;
  color: #6b7280;
  font-size: 13px;
}

.notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 18px;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 9px;
  background: #f9fafb;
  color: #4b5563;
}

.notice-icon {
  font-size: 18px;
  line-height: 1.3;
}

.notice p {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
}

@media (max-width: 768px) {
  .categories-page {
    padding: 0;
  }

  .page-heading,
  .table-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .btn-primary-custom {
    width: 100%;
  }

  .search-input {
    width: 100%;
  }
}
</style>
