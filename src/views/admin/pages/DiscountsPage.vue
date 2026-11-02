<!-- Mục đích: Mã giảm giá theo đơn hàng, thời gian, lượt sử dụng và trạng thái. -->
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
  couponFinished, toggleDiscountStatus, discountDetail, openDiscountDetail,
} from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="bg-white p-4 discount-page">
      <div class="flex flex-wrap justify-between items-start gap-2 mb-4">
        <div>
          <h5 class="font-bold mb-1 text-gray-900">Quản lý mã giảm giá</h5>
          <p class="text-gray-600 text-sm mb-0">
            Tạo, chỉnh sửa và theo dõi mã giảm giá
          </p>
        </div>

        <button
          @click="openDiscountForm()"
          class="btn btn-dark font-medium px-3"
        >
          <i class="icon icon-plus-lg mr-1"></i>
          Thêm mã giảm giá
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

      <!-- Danh sách mã giảm giá -->
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead>
            <tr class="text-gray-600 text-sm uppercase">
              <th>Mã</th>
              <th>Tên chương trình</th>
              <th class="text-center">Giá trị</th>
              <th class="w-72">Thời gian</th>
              <th>Trạng thái</th>
              <th class="text-end text-center w-24">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="filteredDiscountsList.length === 0">
              <td
                colspan="6"
                class="text-center text-gray-600 py-5"
              >
                <i class="icon icon-ticket-perforated text-4xl block mb-2 opacity-50"></i>
                Không có mã giảm giá nào.
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


              <td class="text-center font-bold text-gray-900">
                {{ formatDiscountValue(d) }}
              </td>

              <td class="text-sm text-gray-600 w-72">
                <span>{{ d.start_date ? formatDate(d.start_date) : '—' }}</span>
                <span class="mx-1">→</span>
                <span>{{ d.expiry ? formatDate(d.expiry) : '—' }}</span>
              </td>

              <td>
                <span
                  class="badge discount-status"
                  :class="getDiscountStatus(d).cls"
                >
                  {{ getDiscountStatus(d).label === 'Không hoạt động' ? 'Ngừng hoạt động' : getDiscountStatus(d).label }}
                </span>
              </td>

              <td class="text-end action-cell w-24 text-center">
                 <button type="button" @click="openDiscountDetail(d)" class="btn btn-sm btn-light border text-blue-500 hover:text-blue-700" title="Xem chi tiết" :aria-label="'Xem mã '+d.code">
                  <i class="icon icon-eye"></i>
                </button>
                <button
                  @click="openDiscountForm(d)"
                  :disabled="couponFinished(d)"
                  class="btn btn-sm btn-light border"
                  title="Chỉnh sửa"
                >
                  <i class="icon icon-pencil"></i>
                </button>
                <input type="checkbox" role="switch" :checked="d.active" :disabled="couponFinished(d)" @change="toggleDiscountStatus(d,$event)" :aria-label="'Trạng thái mã '+d.code" :title="d.active?'Ngừng hoạt động':'Bật hoạt động'">
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Form thêm / chỉnh sửa dạng Drawer (Slide Panel) -->
    <div
      v-if="discountModal.open"
      class="custom-modal-overlay"
      @click.self="closeDiscountForm()"
    >
      <div class="custom-drawer slide-in-right discount-modal">
        <div class="p-4 border-b flex justify-between items-center bg-gray-50">
          <h6 class="font-bold mb-0 text-gray-900">
            {{ discountModal.data.id ? 'Chỉnh sửa mã giảm giá' : 'Thêm mã giảm giá' }}
          </h6>
          <button
            @click="closeDiscountForm()"
            class="btn btn-sm btn-light border-0 hover:bg-gray-200"
            aria-label="Đóng"
          >
            <i class="icon icon-x-lg"></i>
          </button>
        </div>

        <form @submit.prevent="saveDiscount" class="discount-form flex flex-col h-[calc(100vh-65px)]">
          <div class="p-4 discount-form-body flex-grow overflow-y-auto">
            <div class="grid grid-cols-12 gap-4">
              <div class="col-span-12">
                <label class="discount-label font-medium text-gray-700 mb-1 block">
                  Mã giảm giá <span class="text-red-500 font-bold">*</span>
                </label>
                <input
                  v-model="discountModal.data.code"
                  type="text"
                  class="sg-input rounded-md w-full border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="VD: NEW200"
                  required
                  maxlength="50"
                />
              </div>

              <div class="col-span-12">
                <label class="discount-label font-medium text-gray-700 mb-1 block">
                  Tên chương trình <span class="text-red-500 font-bold">*</span>
                </label>
                <input
                  v-model="discountModal.data.name"
                  type="text"
                  class="sg-input rounded-md w-full border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Nhập tên chương trình"
                  required
                  maxlength="200"
                />
              </div>

              <div class="col-span-6">
                <label class="discount-label font-medium text-gray-700 mb-1 block">
                  Loại giảm giá <span class="text-red-500 font-bold">*</span>
                </label>
                <select
                  v-model="discountModal.data.discount_type"
                  class="sg-input rounded-md w-full border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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

              <div class="col-span-6">
                <label class="discount-label font-medium text-gray-700 mb-1 block">
                  Giá trị giảm <span class="text-red-500 font-bold">*</span>
                </label>
                <input
                  v-model.number="discountModal.data.value"
                  type="number"
                  min="0.01"
                  :max="discountModal.data.discount_type === 'Phần trăm' ? 100 : undefined"
                  step="any"
                  class="sg-input rounded-md w-full border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Nhập giá trị giảm"
                  required
                />
              </div>

              <div class="col-span-6">
                <label class="discount-label font-medium text-gray-700 mb-1 block">Đơn tối thiểu</label>
                <input
                  v-model.number="discountModal.data.min_order"
                  type="number"
                  min="0"
                  step="any"
                  class="sg-input rounded-md w-full border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="0"
                />
              </div>

              <div class="col-span-6">
                <label class="discount-label font-medium text-gray-700 mb-1 block">Giảm tối đa</label>
                <input
                  v-model.number="discountModal.data.max_discount"
                  type="number"
                  min="0"
                  step="any"
                  class="sg-input rounded-md w-full border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="0"
                />
              </div>

              <div class="col-span-12">
                <label class="discount-label font-medium text-gray-700 mb-1 block">Tổng số lượt <span class="text-red-500 font-bold" v-if="discountModal.data.quantity!=null">*</span></label>
                <label class="flex gap-2 items-center mb-2 text-sm text-gray-600"><input type="checkbox" :checked="discountModal.data.quantity==null" @change="discountModal.data.quantity=$event.target.checked?null:1" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">Không giới hạn</label>
                <input
                  v-model.number="discountModal.data.quantity"
                  :disabled="discountModal.data.quantity==null"
                  :required="discountModal.data.quantity!=null"
                  type="number"
                  min="0"
                  step="1"
                  class="sg-input rounded-md w-full border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
                  placeholder="0"
                />
              </div>

              <div class="col-span-6">
                <label class="discount-label font-medium text-gray-700 mb-1 block">
                  Ngày bắt đầu <span class="text-red-500 font-bold">*</span>
                </label>
                <input
                  v-model="discountModal.data.start_date"
                  type="date"
                  class="sg-input rounded-md w-full border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div class="col-span-6">
                <label class="discount-label font-medium text-gray-700 mb-1 block">
                  Ngày kết thúc <span class="text-red-500 font-bold">*</span>
                </label>
                <input
                  v-model="discountModal.data.expiry"
                  type="date"
                  class="sg-input rounded-md w-full border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  :min="discountModal.data.start_date || undefined"
                  required
                />
              </div>

              <div class="col-span-12">
                <label class="discount-label font-medium text-gray-700 mb-1 block">Mô tả (tùy chọn)</label>
                <textarea
                  v-model="discountModal.data.description"
                  rows="3"
                  class="sg-input rounded-md w-full border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Nhập mô tả nếu có"
                ></textarea>
              </div>

              <div class="col-span-12">
                <label class="discount-label font-medium text-gray-700 mb-1 block">Trạng thái</label>
                <label class="status-toggle flex items-center cursor-pointer">
                  <div class="relative">
                    <input
                      v-model="discountModal.data.active"
                      type="checkbox"
                      class="sr-only"
                    />
                    <div class="block bg-gray-300 w-10 h-6 rounded-full" :class="{'bg-blue-500': discountModal.data.active}"></div>
                    <div class="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition" :class="{'transform translate-x-4': discountModal.data.active}"></div>
                  </div>
                  <span class="ml-3 text-sm font-medium text-gray-700">
                    {{ discountModal.data.active ? 'Hoạt động' : 'Ngừng hoạt động' }}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div class="p-4 border-t flex justify-end gap-3 bg-gray-50 mt-auto">
            <button
              type="button"
              @click="closeDiscountForm()"
              class="btn btn-light border border-gray-300 rounded-md shadow-sm px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Hủy
            </button>

            <button
              type="submit"
              class="btn btn-dark rounded-md shadow-sm px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
    
     <!-- Chi tiết Drawer -->
    <div
      v-if="discountDetail.open"
      class="custom-modal-overlay"
      @click.self="discountDetail.open=false"
    >
      <div class="custom-drawer slide-in-right discount-modal">
        <div class="p-4 border-b flex justify-between items-center bg-gray-50">
          <h6 class="font-bold mb-0 text-gray-900">Chi tiết mã: {{ discountDetail.item.code }}</h6>
          <button
            @click="discountDetail.open=false"
            class="btn btn-sm btn-light border-0 hover:bg-gray-200"
            aria-label="Đóng"
          >
            <i class="icon icon-x-lg"></i>
          </button>
        </div>

        <div class="p-6 overflow-y-auto h-[calc(100vh-65px)]">
             <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                 <div class="sm:col-span-2">
                     <dt class="text-sm font-medium text-gray-500">Chương trình</dt>
                     <dd class="mt-1 text-sm text-gray-900">{{ discountDetail.item.name }}</dd>
                 </div>
                 <div>
                    <dt class="text-sm font-medium text-gray-500">Giá trị giảm</dt>
                    <dd class="mt-1 text-sm text-gray-900 font-semibold">{{ formatDiscountValue(discountDetail.item) }}</dd>
                 </div>
                 <div>
                    <dt class="text-sm font-medium text-gray-500">Trạng thái</dt>
                    <dd class="mt-1 text-sm text-gray-900">
                        <span class="badge" :class="getDiscountStatus(discountDetail.item).cls">
                            {{ getDiscountStatus(discountDetail.item).label === 'Không hoạt động' ? 'Ngừng hoạt động' : getDiscountStatus(discountDetail.item).label }}
                        </span>
                    </dd>
                 </div>
                 <div>
                    <dt class="text-sm font-medium text-gray-500">Đơn tối thiểu</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ Number(discountDetail.item.min_order) > 0 ? formatPrice(discountDetail.item.min_order) : '—' }}</dd>
                 </div>
                 <div>
                    <dt class="text-sm font-medium text-gray-500">Giảm tối đa</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ Number(discountDetail.item.max_discount) > 0 ? formatPrice(discountDetail.item.max_discount) : '—' }}</dd>
                 </div>
                 <div>
                    <dt class="text-sm font-medium text-gray-500">Thời gian áp dụng</dt>
                    <dd class="mt-1 text-sm text-gray-900">
                        {{ discountDetail.item.start_date ? formatDate(discountDetail.item.start_date) : '—' }} <br/>
                        đến <br/>
                        {{ discountDetail.item.expiry ? formatDate(discountDetail.item.expiry) : '—' }}
                    </dd>
                 </div>
                 <div>
                     <dt class="text-sm font-medium text-gray-500">Số lượng</dt>
                     <dd class="mt-1 text-sm text-gray-900">
                         Tổng: {{ discountDetail.item.quantity ?? 'Không giới hạn' }} <br/>
                         Đã dùng: {{ discountDetail.item.used }} <br/>
                         Còn lại: <span class="font-semibold">{{ discountDetail.item.quantity!=null ? Math.max(0, discountDetail.item.quantity - discountDetail.item.used) : 'Không giới hạn' }}</span>
                     </dd>
                 </div>
                 <div class="sm:col-span-2" v-if="discountDetail.item.description">
                     <dt class="text-sm font-medium text-gray-500">Mô tả</dt>
                     <dd class="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{{ discountDetail.item.description }}</dd>
                 </div>
             </dl>
        </div>
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
.action-cell input { margin-left:12px; }
.discount-page .table { min-width:1080px; }

.action-cell button {
  margin-left: 4px;
  border-radius: 4px;
}

.action-cell button span {
  margin-left: 4px;
}

/* Custom Drawer Styles */
.custom-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 450px;
    max-width: 100vw;
    background-color: white;
    box-shadow: -4px 0 15px rgba(0, 0, 0, 0.1);
    z-index: 1001; /* Ensure it's above the overlay */
    display: flex;
    flex-direction: column;
}

.slide-in-right {
    animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
    }
    to {
        transform: translateX(0);
    }
}

.custom-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.45);
    z-index: 1000;
    display: flex; /* Kept for overlay centering if needed by other modals, but drawer ignores it */
    justify-content: flex-end; /* Align drawer to right */
}

/* Custom toggle switch styling */
input:checked ~ .dot {
  transform: translateX(100%);
  background-color: white;
}

@media (max-width: 768px) {
  .custom-drawer {
      width: 100vw;
  }
}
</style>