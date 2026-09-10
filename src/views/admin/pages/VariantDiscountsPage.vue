<!-- Trang: Giảm Giá Biến Thể Màu -->
<script setup>
import {
  filteredVariantDiscounts, variantDiscountSearch, variantStatusFilter, variantReasonFilter,
  variantColorOptions, variantDiscountTypes, variantReasons,
  variantDiscountModal, openVariantDiscountForm, closeVariantDiscountForm, saveVariantDiscount,
  getVariantInfo, formatVariantDiscountValue, getVariantDiscountStatus, variantAlreadyDiscounted,
  formatDate, deleteItem,
} from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="bg-white rounded-1 shadow-sm p-4">
      <!-- Tiêu đề -->
      <div class="flex flex-wrap justify-between items-start gap-2 mb-4">
        <div>
          <h5 class="font-bold mb-1 text-gray-900">Quản Lý Giảm Giá Biến Thể Màu</h5>
          <p class="text-gray-600 text-sm mb-0">Cập nhật giảm giá cho những biến thể màu sản phẩm bán ế và còn tồn kho</p>
        </div>
        <button @click="openVariantDiscountForm()" class="btn btn-dark rounded-2 font-bold shadow-sm px-3"><i class="icon icon-plus-lg mr-1"></i> Thêm Giảm Giá</button>
      </div>

      <!-- Bộ lọc -->
      <div class="flex flex-wrap gap-2 mb-3">
        <div class="relative grow" style="min-width:220px;max-width:360px;">
          <i class="icon icon-search absolute text-gray-600" style="left:12px;top:50%;transform:translateY(-50%);"></i>
          <input v-model="variantDiscountSearch" type="text" class="sg-input rounded-2 pl-4" placeholder="Tìm theo sản phẩm / màu">
        </div>
        <select v-model="variantReasonFilter" class="sg-input rounded-2" style="max-width:200px;">
          <option value="Tất cả">Lọc theo lý do</option>
          <option v-for="r in variantReasons" :key="r" :value="r" v-text="r"></option>
        </select>
        <select v-model="variantStatusFilter" class="sg-input rounded-2" style="max-width:200px;">
          <option value="Tất cả">Lọc theo trạng thái</option>
          <option value="Hoạt động">Hoạt động</option>
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
            <tr v-if="filteredVariantDiscounts.length === 0"><td colspan="11" class="text-center text-gray-600 py-5"><i class="icon icon-palette text-4xl block mb-2 opacity-50"></i>Chưa có giảm giá biến thể nào.</td></tr>
            <tr v-for="vd in filteredVariantDiscounts" :key="vd.id">
              <td><img :src="getVariantInfo(vd).image || 'https://via.placeholder.com/44'" class="rounded-2 border" style="width:44px;height:44px;object-fit:cover;" @error="$event.target.src='https://via.placeholder.com/44'"></td>
              <td>
                <div class="font-medium text-gray-900 text-sm" v-text="getVariantInfo(vd).product_name"></div>
                <div class="text-gray-600" style="font-size:0.75rem;">
                  <span v-text="'- ' + getVariantInfo(vd).color"></span>
                  <span v-if="getVariantInfo(vd).color_hex" v-text="' (' + getVariantInfo(vd).color_hex + ')'"></span>
                </div>
                <span v-if="vd.reason" class="badge rounded-1 bg-gray-100 text-gray-600 border mt-1" style="font-size:0.68rem;" v-text="vd.reason"></span>
              </td>
              <td><span class="rounded-full border inline-block align-middle" :style="{ width:'16px', height:'16px', background: getVariantInfo(vd).color_hex || '#d1d5db' }" :title="getVariantInfo(vd).color"></span></td>
              <td><span class="badge rounded-1" :class="vd.discount_type === 'Cố định' ? 'bg-gray-100 text-gray-900' : 'bg-gray-100 text-gray-900'" v-text="vd.discount_type"></span></td>
              <td class="text-end font-bold text-gray-900 text-sm" v-text="formatVariantDiscountValue(vd)"></td>
              <td class="text-center text-sm" v-text="Number(vd.quantity) > 0 ? vd.quantity : '∞'"></td>
              <td class="text-center text-sm">
                <span v-text="vd.used || 0"></span>
                <div class="text-gray-600" style="font-size:0.7rem;" v-text="(Number(vd.quantity) > 0 ? Math.round((Number(vd.used || 0) / Number(vd.quantity)) * 100) : 0) + '%'"></div>
              </td>
              <td class="text-sm text-gray-600" v-text="vd.start_date ? formatDate(vd.start_date) : '—'"></td>
              <td class="text-sm text-gray-600" v-text="vd.end_date ? formatDate(vd.end_date) : '—'"></td>
              <td><span class="badge rounded-1" :class="getVariantDiscountStatus(vd).cls" v-text="getVariantDiscountStatus(vd).label"></span></td>
              <td class="text-end">
                <button @click="openVariantDiscountForm(vd)" class="btn btn-sm btn-light border rounded-2 mr-1"><i class="icon icon-pencil"></i></button>
                <button @click="deleteItem('variantDiscounts', vd.id, getVariantInfo(vd).product_name)" class="btn btn-sm btn-light border rounded-2 text-red-600"><i class="icon icon-trash"></i></button>
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
          <h6 class="font-bold mb-0 text-gray-900" v-text="variantDiscountModal.data.id ? 'Chỉnh sửa giảm giá biến thể màu' : 'Thêm giảm giá biến thể màu'"></h6>
          <button @click="closeVariantDiscountForm()" class="btn btn-sm btn-light border-0"><i class="icon icon-x-lg"></i></button>
        </div>
        <div class="p-4" style="max-height:65vh;overflow:auto;">
          <!-- Chọn biến thể -->
          <div class="mb-3">
            <label class="block text-sm font-medium text-sm font-medium">Chọn biến thể màu sản phẩm</label>
            <select v-model="variantDiscountModal.data.variant_id" class="sg-input rounded-2">
              <option value="">-- Chọn biến thể màu --</option>
              <option v-for="o in variantColorOptions" :key="o.variant_id" :value="o.variant_id" v-text="o.product_name + ' — ' + o.color + ' (tồn: ' + o.stock + ')'"></option>
            </select>
          </div>
          <!-- Cảnh báo trùng -->
          <div v-if="variantAlreadyDiscounted(variantDiscountModal.data.variant_id) && !variantDiscountModal.data.id" class="alert alert-warning py-2 px-3 text-sm rounded-2 flex items-start gap-2">
            <i class="icon icon-exclamation-triangle-fill mt-1"></i>
            <span>Biến thể này đã có chương trình giảm giá đang chạy. Vui lòng chọn biến thể khác hoặc chỉnh sửa chương trình hiện tại.</span>
          </div>

          <div class="grid grid-cols-12 gap-3">
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium">Loại giảm giá</label><select v-model="variantDiscountModal.data.discount_type" class="sg-input rounded-2"><option v-for="t in variantDiscountTypes" :key="t" :value="t" v-text="t"></option></select></div>
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium">Giá trị giảm</label><input v-model.number="variantDiscountModal.data.value" type="number" class="sg-input rounded-2" placeholder="Nhập số tiền (VNĐ) hoặc %"><small class="text-gray-600" style="font-size:0.72rem;">Cố định: nhập số tiền · Phần trăm: nhập %</small></div>
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium">Giảm tối đa (nếu %)</label><input v-model.number="variantDiscountModal.data.max_discount" type="number" class="sg-input rounded-2" placeholder="0"></div>
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium">Số lượng</label><input v-model.number="variantDiscountModal.data.quantity" type="number" class="sg-input rounded-2" placeholder="Phải lớn hơn 0"></div>
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium">Ngày bắt đầu</label><input v-model="variantDiscountModal.data.start_date" type="date" class="sg-input rounded-2"></div>
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium">Ngày kết thúc</label><input v-model="variantDiscountModal.data.end_date" type="date" class="sg-input rounded-2"></div>
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium">Lý do giảm giá</label><select v-model="variantDiscountModal.data.reason" class="sg-input rounded-2"><option v-for="r in variantReasons" :key="r" :value="r" v-text="r"></option></select></div>
            <div class="md:col-span-6 flex items-end"><div class="flex items-center gap-2 flex items-center"><input v-model="variantDiscountModal.data.active" class="accent-black" type="checkbox" id="vdActive"><label class="text-sm text-sm" for="vdActive">Kích hoạt</label></div></div>
            <div class="col-span-12"><label class="block text-sm font-medium text-sm font-medium">Mô tả (tùy chọn)</label><textarea v-model="variantDiscountModal.data.description" rows="2" class="sg-input rounded-2"></textarea></div>
          </div>
        </div>
        <div class="p-4 border-t flex justify-end gap-2"><button @click="closeVariantDiscountForm()" class="btn btn-light border rounded-2">Hủy</button><button @click="saveVariantDiscount" class="btn btn-dark rounded-2 font-bold">Lưu</button></div>
      </div>
    </div>
  </div>
</template>
