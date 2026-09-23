<!-- Trang: Giảm Giá Biến Thể theo màu hoặc màu + size -->
<script setup>
import {
  filteredVariantDiscounts, variantDiscountSearch, variantStatusFilter, variantReasonFilter,
  variantDiscountScopes, variantDiscountOptionsForScope, variantDiscountTypes, variantReasons,
  variantDiscountModal, openVariantDiscountForm, closeVariantDiscountForm, saveVariantDiscount,
  resetVariantDiscountSelection,
  getVariantInfo, formatVariantDiscountValue, getVariantDiscountStatus, variantAlreadyDiscounted,
  formatDateOnly, deleteItem,
} from '../adminStore'
import fallbackProductImage from '../../../../img/hero-sneakers.jpg'
</script>

<template>
  <div class="fade-in">
    <div class="bg-white rounded-1 shadow-sm p-4">
      <!-- Tiêu đề -->
      <div class="flex flex-wrap justify-between items-start gap-2 mb-4">
        <div>
          <h5 class="font-bold mb-1 text-gray-900">Quản Lý Giảm Giá Biến Thể</h5>
          <p class="text-gray-600 text-sm mb-0">Áp dụng ưu đãi cho mọi size của một màu hoặc riêng một màu + size cụ thể</p>
        </div>
        <button @click="openVariantDiscountForm()" class="btn btn-dark rounded-2 font-bold shadow-sm px-3"><i class="icon icon-plus-lg mr-1"></i> Thêm Giảm Giá</button>
      </div>

      <!-- Bộ lọc -->
      <div class="flex flex-wrap gap-2 mb-3">
        <div class="relative grow" style="min-width:220px;max-width:360px;">
          <i class="icon icon-search absolute text-gray-600" style="left:12px;top:50%;transform:translateY(-50%);"></i>
          <input v-model="variantDiscountSearch" type="search" class="sg-input rounded-2 pl-4" placeholder="Tìm theo sản phẩm / màu / size" aria-label="Tìm giảm giá theo sản phẩm, màu hoặc size">
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
          <option value="Tạm dừng">Tạm dừng</option>
        </select>
      </div>

      <!-- Bảng -->
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead>
            <tr class="text-gray-600 text-sm uppercase">
              <th>Hình ảnh</th><th>Sản phẩm</th><th>Biến thể</th><th>Loại giảm</th>
              <th class="text-end">Giá trị</th><th class="text-center">Số lượng</th><th class="text-center">Đã dùng</th>
              <th>Ngày bắt đầu</th><th>Ngày kết thúc</th><th>Trạng thái</th><th class="text-end">Hành động</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredVariantDiscounts.length === 0"><td colspan="11" class="text-center text-gray-600 py-5"><i class="icon icon-palette text-4xl block mb-2 opacity-50"></i>Không có giảm giá biến thể phù hợp.</td></tr>
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
              <td><span class="badge rounded-1" :class="vd.discount_type === 'Cố định' ? 'bg-gray-100 text-gray-900' : 'bg-gray-100 text-gray-900'" v-text="vd.discount_type"></span></td>
              <td class="text-end font-bold text-gray-900 text-sm" v-text="formatVariantDiscountValue(vd)"></td>
              <td class="text-center text-sm" v-text="Number(vd.quantity) > 0 ? vd.quantity : '∞'"></td>
              <td class="text-center text-sm">
                <span v-text="vd.used || 0"></span>
                <div class="text-gray-600" style="font-size:0.7rem;" v-text="(Number(vd.quantity) > 0 ? Math.min(100, Math.round((Number(vd.used || 0) / Number(vd.quantity)) * 100)) : 0) + '%'"></div>
              </td>
              <td class="text-sm text-gray-600" v-text="formatDateOnly(vd.start_date)"></td>
              <td class="text-sm text-gray-600" v-text="formatDateOnly(vd.end_date)"></td>
              <td><span class="badge rounded-1" :class="getVariantDiscountStatus(vd).cls" v-text="getVariantDiscountStatus(vd).label"></span></td>
              <td class="text-end">
                <button @click="openVariantDiscountForm(vd)" class="btn btn-sm btn-light border rounded-2 mr-1" type="button" title="Chỉnh sửa giảm giá" aria-label="Chỉnh sửa giảm giá"><i class="icon icon-pencil"></i></button>
                <button v-if="vd.active" @click="deleteItem('variantDiscounts', vd.id, getVariantInfo(vd).product_name)" class="btn btn-sm btn-light border rounded-2 text-red-600" type="button" title="Tạm dừng giảm giá" aria-label="Tạm dừng giảm giá"><i class="icon icon-x-circle"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL Thêm / Sửa -->
    <div v-if="variantDiscountModal.open" class="custom-modal-overlay" @click.self="closeVariantDiscountForm()">
      <div class="custom-modal-box fade-in-scale" style="max-width:640px;">
        <div class="p-4 border-b flex justify-between items-center">
          <h6 class="font-bold mb-0 text-gray-900" v-text="variantDiscountModal.data.id ? 'Chỉnh sửa giảm giá biến thể' : 'Thêm giảm giá biến thể'"></h6>
          <button @click="closeVariantDiscountForm()" class="btn btn-sm btn-light border-0" type="button" aria-label="Đóng"><i class="icon icon-x-lg"></i></button>
        </div>
        <div class="p-4" style="max-height:65vh;overflow:auto;">
          <div class="mb-3">
            <label class="block text-sm font-medium">Phạm vi áp dụng</label>
            <select v-model="variantDiscountModal.data.apply_scope" class="sg-input rounded-2" @change="resetVariantDiscountSelection">
              <option v-for="scope in variantDiscountScopes" :key="scope.value" :value="scope.value" v-text="scope.label"></option>
            </select>
            <small class="text-gray-600" style="font-size:0.72rem;">Chọn “mọi size” để cùng một ưu đãi áp dụng cho toàn bộ size của màu đó.</small>
          </div>

          <!-- Chọn biến thể -->
          <div class="mb-3">
            <label class="block text-sm font-medium" v-text="variantDiscountModal.data.apply_scope === 'variant' ? 'Chọn màu và size sản phẩm' : 'Chọn màu sản phẩm'"></label>
            <select v-model="variantDiscountModal.data.variant_id" class="sg-input rounded-2">
              <option value="" v-text="variantDiscountModal.data.apply_scope === 'variant' ? '-- Chọn màu và size --' : '-- Chọn màu (mọi size) --'"></option>
              <option
                v-for="o in variantDiscountOptionsForScope(variantDiscountModal.data.apply_scope)"
                :key="variantDiscountModal.data.apply_scope + '-' + o.variant_id"
                :value="o.variant_id"
                v-text="variantDiscountModal.data.apply_scope === 'variant'
                  ? o.product_name + ' — ' + o.color + ' — Size ' + o.size + ' (tồn: ' + o.stock + ')'
                  : o.product_name + ' — ' + o.color + ' — Mọi size (tổng tồn: ' + o.stock + ')'"
              ></option>
            </select>
          </div>
          <!-- Cảnh báo trùng -->
          <div v-if="variantDiscountModal.data.active && variantAlreadyDiscounted(variantDiscountModal.data.variant_id, variantDiscountModal.data.id, variantDiscountModal.data.start_date, variantDiscountModal.data.end_date, variantDiscountModal.data.apply_scope)" class="alert alert-warning py-2 px-3 text-sm rounded-2 flex items-start gap-2">
            <i class="icon icon-exclamation-triangle-fill mt-1"></i>
            <span>Phạm vi này đã có chương trình giảm giá trùng thời gian. Hãy đổi phạm vi, thời gian hoặc tạm dừng chương trình cũ.</span>
          </div>

          <div class="grid grid-cols-12 gap-3">
            <div class="col-span-12 md:col-span-6"><label class="block text-sm font-medium">Loại giảm giá</label><select v-model="variantDiscountModal.data.discount_type" class="sg-input rounded-2"><option v-for="t in variantDiscountTypes" :key="t" :value="t" v-text="t"></option></select></div>
            <div class="col-span-12 md:col-span-6"><label class="block text-sm font-medium" v-text="variantDiscountModal.data.discount_type === 'Cố định' ? 'Giá bán mới (VNĐ)' : 'Phần trăm giảm (%)'"></label><input v-model.number="variantDiscountModal.data.value" type="number" min="1" :max="variantDiscountModal.data.discount_type === 'Theo phần trăm' ? 99 : undefined" :step="variantDiscountModal.data.discount_type === 'Theo phần trăm' ? 1 : 1000" class="sg-input rounded-2" :placeholder="variantDiscountModal.data.discount_type === 'Cố định' ? 'Ví dụ: 499000' : 'Từ 1 đến 99'"><small class="text-gray-600" style="font-size:0.72rem;">Cố định: giá bán mới · Phần trăm: giảm trực tiếp từ giá gốc của từng size</small></div>
            <div class="col-span-12 md:col-span-6"><label class="block text-sm font-medium">Số lượng được giảm</label><input v-model.number="variantDiscountModal.data.quantity" type="number" min="0" step="1" class="sg-input rounded-2" placeholder="0 = không giới hạn"><small class="text-gray-600" style="font-size:0.72rem;">Nhập 0 nếu không giới hạn số lượng.</small></div>
            <div class="col-span-12 md:col-span-6"><label class="block text-sm font-medium">Ngày bắt đầu</label><input v-model="variantDiscountModal.data.start_date" type="date" class="sg-input rounded-2" :max="variantDiscountModal.data.end_date || undefined"></div>
            <div class="col-span-12 md:col-span-6"><label class="block text-sm font-medium">Ngày kết thúc</label><input v-model="variantDiscountModal.data.end_date" type="date" class="sg-input rounded-2" :min="variantDiscountModal.data.start_date || undefined"><small class="text-gray-600" style="font-size:0.72rem;">Ưu đãi có hiệu lực đến hết ngày đã chọn.</small></div>
            <div class="col-span-12 md:col-span-6"><label class="block text-sm font-medium">Lý do giảm giá</label><select v-model="variantDiscountModal.data.reason" class="sg-input rounded-2"><option v-for="r in variantReasons" :key="r" :value="r" v-text="r"></option></select></div>
            <div class="col-span-12 md:col-span-6 flex items-end"><div class="flex items-center gap-2"><input v-model="variantDiscountModal.data.active" class="accent-black" type="checkbox" id="vdActive"><label class="text-sm" for="vdActive">Kích hoạt</label></div></div>
            <div class="col-span-12"><label class="block text-sm font-medium text-sm font-medium">Mô tả (tùy chọn)</label><textarea v-model="variantDiscountModal.data.description" rows="2" class="sg-input rounded-2"></textarea></div>
          </div>
        </div>
        <div class="p-4 border-t flex justify-end gap-2"><button @click="closeVariantDiscountForm()" class="btn btn-light border rounded-2" type="button" :disabled="variantDiscountModal.saving">Hủy</button><button @click="saveVariantDiscount" class="btn btn-dark rounded-2 font-bold" type="button" :disabled="variantDiscountModal.saving" v-text="variantDiscountModal.saving ? 'Đang lưu…' : 'Lưu'"></button></div>
      </div>
    </div>
  </div>
</template>
