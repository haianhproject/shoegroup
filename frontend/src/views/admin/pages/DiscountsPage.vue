
<!-- Trang quản lý mã khuyến mại -->
<script setup>
import {
  filteredDiscountsList,
  discountSearch,
  discountStatusFilter,
  discountStatuses,
  discountTypes,
  discountModal,
  openDiscountForm,
  closeDiscountForm,
  saveDiscount,
  getDiscountStatus,
  formatDiscountValue,
  formatDate,
  formatPrice,
  restoreItem,
} from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="bg-white p-4 discount-page">
      <div class="flex flex-wrap justify-between items-start gap-2 mb-4">
        <div>
          <h5 class="font-bold mb-1 text-gray-900">Quản lý mã khuyến mại</h5>
          <p class="text-gray-600 text-sm mb-0">
            Tạo, chỉnh sửa và theo dõi mã khuyến mại
          </p>
        </div>

        <button
          @click="openDiscountForm()"
          class="btn btn-dark font-medium px-3"
        >
          <i class="icon icon-plus-lg mr-1"></i>
          Thêm mã khuyến mại
        </button>
      </div>

      <!-- Tìm kiếm và lọc -->
      <div class="flex flex-wrap gap-2 mb-3">
        <div class="relative grow search-box">
          <i class="icon icon-search search-icon"></i>
          <input
            v-model="discountSearch"
            type="text"
            class="sg-input rounded-2 pl-4"
            placeholder="Tìm theo mã hoặc tên chương trình"
          />
        </div>

        <select
          v-model="discountStatusFilter"
          class="sg-input rounded-2 status-filter"
        >
          <option
            v-for="s in discountStatuses"
            :key="s"
            :value="s"
          >
            {{ s === 'Tất cả' ? 'Lọc trạng thái' : s }}
          </option>
        </select>
      </div>

      <!-- Danh sách mã khuyến mại -->
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead>
            <tr class="text-gray-600 text-sm uppercase">
              <th>Mã</th>
              <th>Tên chương trình</th>
              <th>Loại</th>
              <th class="text-center">Giá trị</th>
              <th class="text-end">Đơn tối thiểu</th>
              <th class="text-end">Giảm tối đa</th>
              <th>Thời gian</th>
              <th class="text-center">Số lượng</th>
              <th>Trạng thái</th>
              <th class="text-end">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="filteredDiscountsList.length === 0">
              <td
                colspan="10"
                class="text-center text-gray-600 py-5"
              >
                <i class="icon icon-ticket-perforated text-4xl block mb-2 opacity-50"></i>
                Không có mã khuyến mại nào.
              </td>
            </tr>

            <tr
              v-for="d in filteredDiscountsList"
              :key="d.id"
            >
              <td class="font-bold text-gray-900">
                {{ d.code }}
              </td>

              <td class="text-sm">
                {{ d.name || '—' }}
              </td>

              <td>
                <span class="badge bg-gray-100 text-gray-600 border">
                  {{ d.discount_type }}
                </span>
              </td>

              <td class="text-center font-bold text-gray-900">
                {{ formatDiscountValue(d) }}
              </td>

              <td class="text-end text-sm">
                {{ Number(d.min_order) > 0 ? formatPrice(d.min_order) : '—' }}
              </td>

              <td class="text-end text-sm">
                {{ Number(d.max_discount) > 0 ? formatPrice(d.max_discount) : '—' }}
              </td>

              <td class="text-sm text-gray-600">
                <span>{{ d.start_date ? formatDate(d.start_date) : '—' }}</span>
                <span class="mx-1">→</span>
                <span>{{ d.expiry ? formatDate(d.expiry) : '—' }}</span>
              </td>

              <td class="text-center text-sm">
                {{ Number(d.quantity) > 0 ? d.quantity : '∞' }}
              </td>

              <td>
                <span
                  class="badge discount-status"
                  :class="getDiscountStatus(d).cls"
                >
                  {{ getDiscountStatus(d).label }}
                </span>
              </td>

              <td class="text-end action-cell">
                <button
                  v-if="d.active === false"
                  @click="restoreItem('discounts', d)"
                  class="btn btn-sm btn-light border"
                  title="Kích hoạt lại"
                >
                  <i class="icon icon-arrow-counterclockwise"></i>
                  <span>Kích hoạt lại</span>
                </button>

                <button
                  @click="openDiscountForm(d)"
                  class="btn btn-sm btn-light border"
                  title="Chỉnh sửa"
                >
                  <i class="icon icon-pencil"></i>
                  <span>Chỉnh sửa</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Form thêm / chỉnh sửa -->
    <div
      v-if="discountModal.open"
      class="custom-modal-overlay"
      @click.self="closeDiscountForm()"
    >
      <div class="custom-modal-box fade-in-scale discount-modal">
        <div class="p-4 border-b flex justify-between items-center">
          <h6 class="font-bold mb-0 text-gray-900">
            {{ discountModal.data.id ? 'Chỉnh sửa mã khuyến mại' : 'Thêm mã khuyến mại' }}
          </h6>

          <button
            @click="closeDiscountForm()"
            class="btn btn-sm btn-light border-0"
            aria-label="Đóng"
          >
            <i class="icon icon-x-lg"></i>
          </button>
        </div>

        <form @submit.prevent="saveDiscount" class="discount-form">
          <div class="p-4 discount-form-body">
            <div class="grid grid-cols-12 gap-3">
              <div class="md:col-span-6 col-span-12">
                <label class="discount-label">
                  Mã khuyến mại <span class="required">*</span>
                </label>
                <input
                  v-model="discountModal.data.code"
                  type="text"
                  class="sg-input rounded-2"
                  placeholder="VD: NEW200"
                  required
                  maxlength="50"
                />
              </div>

              <div class="md:col-span-6 col-span-12">
                <label class="discount-label">
                  Tên chương trình <span class="required">*</span>
                </label>
                <input
                  v-model="discountModal.data.name"
                  type="text"
                  class="sg-input rounded-2"
                  placeholder="Nhập tên chương trình"
                  required
                  maxlength="200"
                />
              </div>

              <div class="md:col-span-6 col-span-12">
                <label class="discount-label">
                  Loại giảm giá <span class="required">*</span>
                </label>
                <select
                  v-model="discountModal.data.discount_type"
                  class="sg-input rounded-2"
                  required
                >
                  <option value="" disabled>Chọn loại giảm giá</option>
                  <option
                    v-for="t in discountTypes"
                    :key="t"
                    :value="t"
                  >
                    {{ t }}
                  </option>
                </select>
              </div>

              <div class="md:col-span-6 col-span-12">
                <label class="discount-label">
                  Giá trị giảm <span class="required">*</span>
                </label>
                <input
                  v-model.number="discountModal.data.value"
                  type="number"
                  min="0.01"
                  :max="discountModal.data.discount_type === 'Phần trăm' ? 100 : undefined"
                  step="any"
                  class="sg-input rounded-2"
                  placeholder="Nhập giá trị giảm"
                  required
                />
              </div>

              <div class="md:col-span-6 col-span-12">
                <label class="discount-label">Đơn tối thiểu</label>
                <input
                  v-model.number="discountModal.data.min_order"
                  type="number"
                  min="0"
                  step="any"
                  class="sg-input rounded-2"
                  placeholder="0"
                />
              </div>

              <div class="md:col-span-6 col-span-12">
                <label class="discount-label">Giảm tối đa</label>
                <input
                  v-model.number="discountModal.data.max_discount"
                  type="number"
                  min="0"
                  step="any"
                  class="sg-input rounded-2"
                  placeholder="0"
                />
              </div>

              <div class="md:col-span-6 col-span-12">
                <label class="discount-label">Số lượng</label>
                <input
                  v-model.number="discountModal.data.quantity"
                  type="number"
                  min="0"
                  step="1"
                  class="sg-input rounded-2"
                  placeholder="0"
                />
              </div>

              <div class="md:col-span-6 col-span-12">
                <label class="discount-label">
                  Ngày bắt đầu <span class="required">*</span>
                </label>
                <input
                  v-model="discountModal.data.start_date"
                  type="date"
                  class="sg-input rounded-2"
                  required
                />
              </div>

              <div class="md:col-span-6 col-span-12">
                <label class="discount-label">
                  Ngày kết thúc <span class="required">*</span>
                </label>
                <input
                  v-model="discountModal.data.expiry"
                  type="date"
                  class="sg-input rounded-2"
                  :min="discountModal.data.start_date || undefined"
                  required
                />
              </div>

              <div class="col-span-12">
                <label class="discount-label">Mô tả (tùy chọn)</label>
                <textarea
                  v-model="discountModal.data.description"
                  rows="2"
                  class="sg-input rounded-2"
                  placeholder="Nhập mô tả nếu có"
                ></textarea>
              </div>

              <div class="col-span-12">
                <label class="discount-label">Trạng thái</label>
                <label class="status-toggle">
                  <input
                    v-model="discountModal.data.active"
                    class="accent-black"
                    type="checkbox"
                  />
                  <span>
                    {{ discountModal.data.active ? 'Hoạt động' : 'Không hoạt động' }}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div class="p-4 border-t flex justify-end gap-2">
            <button
              type="button"
              @click="closeDiscountForm()"
              class="btn btn-light border rounded-2"
            >
              Hủy
            </button>

            <button
              type="submit"
              class="btn btn-dark rounded-2 font-bold"
            >
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.discount-page {
  border-radius: 4px;
}

.search-box {
  min-width: 240px;
  max-width: 420px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
}

.status-filter {
  max-width: 220px;
}

.discount-status {
  border-radius: 2px;
  font-size: 0.72rem;
  white-space: nowrap;
}

.action-cell {
  white-space: nowrap;
}

.action-cell button {
  margin-left: 4px;
  border-radius: 4px;
}

.action-cell button span {
  margin-left: 4px;
}

.discount-modal {
  max-width: 640px;
}

.discount-form-body {
  max-height: 65vh;
  overflow-y: auto;
}

.discount-label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
}

.required {
  color: #dc2626;
  font-weight: 700;
}

.status-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .discount-modal {
    width: calc(100% - 24px);
    margin: 12px;
  }

  .action-cell button span {
    display: none;
  }
}
</style>
