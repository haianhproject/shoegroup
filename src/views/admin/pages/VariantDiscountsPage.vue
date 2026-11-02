<!-- Mục đích: Trang quản lý khuyến mại theo toàn bộ màu hoặc đúng biến thể màu + size. -->
<!-- Trang: Khuyến Mại Sản Phẩm theo màu hoặc màu + size -->
<script setup>
import {
  filteredVariantDiscounts, variantDiscountSearch, variantStatusFilter, variantReasonFilter,
  variantDiscountScopes, variantDiscountOptionsForScope, variantDiscountTypes, variantReasons,
  variantDiscountModal, openVariantDiscountForm, closeVariantDiscountForm, saveVariantDiscount,
  resetVariantDiscountSelection,
  getVariantInfo, formatVariantDiscountValue, getVariantDiscountStatus, variantAlreadyDiscounted,
  formatDateOnly, toggleVariantDiscount,
} from '../adminStore'
import fallbackProductImage from '../../../../img/hero-sneakers.jpg'
</script>

<template>
  <div class="fade-in">
    <div class="bg-white rounded-1 shadow-sm p-4">
      <!-- Tiêu đề -->
      <div class="flex flex-wrap justify-between items-start gap-2 mb-4">
        <div>
          <h5 class="font-bold mb-1 text-gray-900">Quản Lý Khuyến Mại Sản Phẩm</h5>
          <p class="text-gray-600 text-sm mb-0">Áp dụng ưu đãi cho mọi size của một màu hoặc riêng một màu + size cụ thể</p>
        </div>
        <button @click="openVariantDiscountForm()" class="btn btn-dark rounded-2 font-bold shadow-sm px-3"><i class="icon icon-plus-lg mr-1"></i> Thêm khuyến mại</button>
      </div>

      <!-- Bộ lọc -->
      <div class="flex flex-wrap gap-2 mb-3">
        <div class="relative grow" style="min-width:220px;max-width:360px;">
          <i class="icon icon-search absolute text-gray-600" style="left:12px;top:50%;transform:translateY(-50%);"></i>
          <input v-model="variantDiscountSearch" type="search" class="sg-input rounded-2 pl-4" placeholder="Tìm theo sản phẩm / màu / size" aria-label="Tìm khuyến mại theo sản phẩm, màu hoặc size">
        </div>
        <select v-model="variantReasonFilter" class="sg-input rounded-2" style="max-width:200px;">
          <option value="Tất cả">Lọc theo lý do</option>
          <option v-for="r in variantReasons" :key="r" :value="r" v-text="r"></option>
        </select>
        <select v-model="variantStatusFilter" class="sg-input rounded-2" style="max-width:200px;">
          <option value="Tất cả">Lọc theo trạng thái</option>
          <option value="Hoạt động">Hoạt động</option>
          <option value="Sắp diễn ra">Sắp diễn ra</option>
          <option value="Đã dùng hết">Đã dùng hết</option>
          <option value="Hết hạn">Hết hạn</option>
          <option value="Không hoạt động">Không hoạt động</option>
        </select>
      </div>

      <!-- Bảng -->
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead>
            <tr class="text-gray-600 text-sm uppercase">
              <th>Hình ảnh</th>
              <th>Sản phẩm</th>
              <th>Biến thể</th>
              <th class="text-end">Giá trị</th>
              <th class="w-72">Thời gian</th>
              <th>Trạng thái</th>
              <th class="text-end text-center w-24">Hành động</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredVariantDiscounts.length === 0"><td colspan="7" class="text-center text-gray-600 py-5"><i class="icon icon-palette text-4xl block mb-2 opacity-50"></i>Không có khuyến mại sản phẩm phù hợp.</td></tr>
            <tr v-for="vd in filteredVariantDiscounts" :key="vd.id">
              <td><img :src="getVariantInfo(vd).image || fallbackProductImage" :alt="getVariantInfo(vd).product_name" class="rounded-2 border" style="width:44px;height:44px;object-fit:cover;" @error="$event.target.src=fallbackProductImage"></td>
              <td>
                <div class="font-medium text-gray-900 text-sm" v-text="getVariantInfo(vd).product_name"></div>
                <div class="text-gray-600" style="font-size:0.75rem;">
                  <span v-text="'- ' + getVariantInfo(vd).color"></span>
                  <span v-if="getVariantInfo(vd).color_hex" v-text="' (' + getVariantInfo(vd).color_hex + ')'"></span>
                </div>
                <span v-if="vd.reason" class="badge rounded-1 bg-gray-100 text-gray-600 border mt-1" style="font-size:0.68rem;" v-text="vd.reason"></span>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <span class="rounded-full border inline-block shrink-0" :style="{ width:'16px', height:'16px', background: getVariantInfo(vd).color_hex || '#d1d5db' }" :title="getVariantInfo(vd).color"></span>
                  <div>
                    <div class="text-sm font-medium" v-text="getVariantInfo(vd).scope_label"></div>
                    <div v-if="getVariantInfo(vd).size" class="text-gray-600" style="font-size:0.72rem;" v-text="'Size ' + getVariantInfo(vd).size"></div>
                  </div>
                </div>
              </td>
              <td class="text-end font-bold text-gray-900 text-sm" v-text="formatVariantDiscountValue(vd)"></td>
              
              <!-- Cột Thời gian kéo dài -->
              <td class="text-sm text-gray-600 w-72">
                  <span>{{ formatDateOnly(vd.start_date) }}</span>
                  <span class="mx-1">→</span>
                  <span>{{ formatDateOnly(vd.end_date) }}</span>
              </td>

              <!-- Sửa text trạng thái -->
              <td>
                  <span class="badge rounded-1" :class="getVariantDiscountStatus(vd).cls">
                      {{ getVariantDiscountStatus(vd).label === 'Không hoạt động' ? 'Ngừng hoạt động' : getVariantDiscountStatus(vd).label }}
                  </span>
              </td>
              
              <td class="text-end action-cell w-24 text-center">
                  <!-- Thêm icon xem chi tiết -->
                <button type="button" @click="openVariantDiscountForm(vd)" class="btn btn-sm btn-light border text-blue-500 hover:text-blue-700 mr-1" title="Xem chi tiết" :aria-label="'Xem khuyến mại'">
                  <i class="icon icon-eye"></i>
                </button>
                <button @click="openVariantDiscountForm(vd)" :disabled="getVariantDiscountStatus(vd).label==='Hết hạn'" class="btn btn-sm btn-light border rounded-2 mr-1" type="button" title="Chỉnh sửa khuyến mại" aria-label="Chỉnh sửa khuyến mại"><i class="icon icon-pencil"></i></button>
                <input type="checkbox" role="switch" :checked="vd.active" :disabled="getVariantDiscountStatus(vd).label==='Hết hạn'" @change="toggleVariantDiscount(vd,$event)" aria-label="Trạng thái khuyến mại" :title="vd.active?'Ngừng hoạt động':'Bật hoạt động'">
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Cập nhật: MODAL -> DRAWER (Slide Panel) -->
    <div v-if="variantDiscountModal.open" class="custom-modal-overlay" @click.self="closeVariantDiscountForm()">
      <div class="custom-drawer slide-in-right discount-modal">
        <div class="p-4 border-b flex justify-between items-center bg-gray-50">
          <h6 class="font-bold mb-0 text-gray-900" v-text="variantDiscountModal.data.id ? 'Chỉnh sửa khuyến mại sản phẩm' : 'Thêm khuyến mại sản phẩm'"></h6>
          <button @click="closeVariantDiscountForm()" class="btn btn-sm btn-light border-0 hover:bg-gray-200" type="button" aria-label="Đóng"><i class="icon icon-x-lg"></i></button>
        </div>
        
        <div class="p-4 overflow-y-auto flex-grow h-[calc(100vh-65px)]">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Phạm vi áp dụng <span class="text-red-500 font-bold">*</span></label>
            <select v-model="variantDiscountModal.data.apply_scope" class="sg-input rounded-md w-full border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" @change="resetVariantDiscountSelection">
              <option v-for="scope in variantDiscountScopes" :key="scope.value" :value="scope.value" v-text="scope.label"></option>
            </select>
            <small class="text-gray-600 mt-1 block" style="font-size:0.75rem;">Chọn “mọi size” để cùng một ưu đãi áp dụng cho toàn bộ size của màu đó.</small>
          </div>

          <!-- ĐÃ BỎ PHẦN CHỌN BIẾN THỂ TẠI ĐÂY -->
          
          <!-- Cảnh báo trùng -->
          <div v-if="variantDiscountModal.data.active && variantAlreadyDiscounted(variantDiscountModal.data.variant_id, variantDiscountModal.data.id, variantDiscountModal.data.start_date, variantDiscountModal.data.end_date, variantDiscountModal.data.apply_scope)" class="alert alert-warning py-2 px-3 text-sm rounded-md flex items-start gap-2 mb-4 bg-yellow-50 text-yellow-800 border border-yellow-200">
            <i class="icon icon-exclamation-triangle-fill mt-1"></i>
            <span>Phạm vi này đã có chương trình khuyến mại trùng thời gian. Hãy đổi phạm vi, thời gian hoặc tạm dừng chương trình cũ.</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" v-text="variantDiscountModal.data.discount_type === 'Cố định' ? 'Giá bán mới (VNĐ)' : 'Phần trăm giảm (%)'"><span class="text-red-500 font-bold ml-1">*</span></label>
                <input v-model.number="variantDiscountModal.data.value" type="number" min="1" :max="variantDiscountModal.data.discount_type === 'Theo phần trăm' ? 99 : undefined" :step="variantDiscountModal.data.discount_type === 'Theo phần trăm' ? 1 : 1000" class="sg-input rounded-md w-full border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" :placeholder="variantDiscountModal.data.discount_type === 'Cố định' ? 'Ví dụ: 499000' : 'Từ 1 đến 99'">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Số lượng được giảm</label>
                <input v-model.number="variantDiscountModal.data.quantity" type="number" min="0" step="1" class="sg-input rounded-md w-full border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" placeholder="0 = không giới hạn">
                <small class="text-gray-600 mt-1 block" style="font-size:0.75rem;">Nhập 0 nếu không giới hạn số lượng.</small>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                <input v-model="variantDiscountModal.data.start_date" type="date" class="sg-input rounded-md w-full border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" :max="variantDiscountModal.data.end_date || undefined">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                <input v-model="variantDiscountModal.data.end_date" type="date" class="sg-input rounded-md w-full border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" :min="variantDiscountModal.data.start_date || undefined">
                <small class="text-gray-600 mt-1 block" style="font-size:0.75rem;">Ưu đãi có hiệu lực đến hết ngày đã chọn.</small>
            </div>
            
            <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Lý do khuyến mại</label>
                <select v-model="variantDiscountModal.data.reason" class="sg-input rounded-md w-full border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                    <option v-for="r in variantReasons" :key="r" :value="r" v-text="r"></option>
                </select>
            </div>
            
            <div class="md:col-span-2 flex items-center mt-2">
                <label class="status-toggle flex items-center cursor-pointer">
                  <div class="relative">
                    <input v-model="variantDiscountModal.data.active" type="checkbox" class="sr-only" id="vdActive" />
                    <div class="block bg-gray-300 w-10 h-6 rounded-full transition-colors" :class="{'bg-blue-500': variantDiscountModal.data.active}"></div>
                    <div class="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform" :class="{'transform translate-x-4': variantDiscountModal.data.active}"></div>
                  </div>
                  <span class="ml-3 text-sm font-medium text-gray-700">Kích hoạt</span>
                </label>
            </div>
          </div>
        </div>
        
        <div class="p-4 border-t flex justify-end gap-3 bg-gray-50 mt-auto">
            <button @click="closeVariantDiscountForm()" class="btn btn-light border border-gray-300 rounded-md shadow-sm px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" type="button" :disabled="variantDiscountModal.saving">Hủy</button>
            <button @click="saveVariantDiscount" class="btn btn-dark rounded-md shadow-sm px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" type="button" :disabled="variantDiscountModal.saving" v-text="variantDiscountModal.saving ? 'Đang lưu…' : 'Lưu'"></button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom Drawer Styles */
.custom-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 500px;
    max-width: 100vw;
    background-color: white;
    box-shadow: -4px 0 15px rgba(0, 0, 0, 0.1);
    z-index: 1001;
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
    display: flex;
    justify-content: flex-end; 
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