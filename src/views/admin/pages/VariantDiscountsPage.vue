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
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
        <div>
          <h5 class="fw-bold mb-1 text-dark">Quản Lý Giảm Giá Biến Thể Màu</h5>
          <p class="text-secondary small mb-0">Cập nhật giảm giá cho những biến thể màu sản phẩm bán ế và còn tồn kho</p>
        </div>
        <button @click="openVariantDiscountForm()" class="btn btn-dark rounded-2 fw-bold shadow-sm px-3"><i class="bi bi-plus-lg me-1"></i> Thêm Giảm Giá</button>
      </div>

      <!-- Bộ lọc -->
      <div class="d-flex flex-wrap gap-2 mb-3">
        <div class="position-relative flex-grow-1" style="min-width:220px;max-width:360px;">
          <i class="bi bi-search position-absolute text-secondary" style="left:12px;top:50%;transform:translateY(-50%);"></i>
          <input v-model="variantDiscountSearch" type="text" class="form-control rounded-2 ps-4" placeholder="Tìm theo sản phẩm / màu">
        </div>
        <select v-model="variantReasonFilter" class="form-select rounded-2" style="max-width:200px;">
          <option value="Tất cả">Lọc theo lý do</option>
          <option v-for="r in variantReasons" :key="r" :value="r" v-text="r"></option>
        </select>
        <select v-model="variantStatusFilter" class="form-select rounded-2" style="max-width:200px;">
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
            <tr class="text-secondary small text-uppercase">
              <th>Hình ảnh</th><th>Sản phẩm</th><th>Biến thể</th><th>Loại giảm</th>
              <th class="text-end">Giá trị</th><th class="text-center">Số lượng</th><th class="text-center">Đã dùng</th>
              <th>Ngày bắt đầu</th><th>Ngày kết thúc</th><th>Trạng thái</th><th class="text-end">Hành động</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredVariantDiscounts.length === 0"><td colspan="11" class="text-center text-secondary py-5"><i class="bi bi-palette fs-1 d-block mb-2 opacity-50"></i>Chưa có giảm giá biến thể nào.</td></tr>
            <tr v-for="vd in filteredVariantDiscounts" :key="vd.id">
              <td><img :src="getVariantInfo(vd).image || 'https://via.placeholder.com/44'" class="rounded-2 border" style="width:44px;height:44px;object-fit:cover;" @error="$event.target.src='https://via.placeholder.com/44'"></td>
              <td>
                <div class="fw-medium text-dark small" v-text="getVariantInfo(vd).product_name"></div>
                <div class="text-secondary" style="font-size:0.75rem;">
                  <span v-text="'- ' + getVariantInfo(vd).color"></span>
                  <span v-if="getVariantInfo(vd).color_hex" v-text="' (' + getVariantInfo(vd).color_hex + ')'"></span>
                </div>
                <span v-if="vd.reason" class="badge rounded-1 bg-light text-secondary border mt-1" style="font-size:0.68rem;" v-text="vd.reason"></span>
              </td>
              <td><span class="rounded-circle border d-inline-block align-middle" :style="{ width:'16px', height:'16px', background: getVariantInfo(vd).color_hex || '#d1d5db' }" :title="getVariantInfo(vd).color"></span></td>
              <td><span class="badge rounded-1" :class="vd.discount_type === 'Cố định' ? 'bg-light text-dark' : 'bg-light text-dark'" v-text="vd.discount_type"></span></td>
              <td class="text-end fw-bold text-dark small" v-text="formatVariantDiscountValue(vd)"></td>
              <td class="text-center small" v-text="Number(vd.quantity) > 0 ? vd.quantity : '∞'"></td>
              <td class="text-center small">
                <span v-text="vd.used || 0"></span>
                <div class="text-secondary" style="font-size:0.7rem;" v-text="(Number(vd.quantity) > 0 ? Math.round((Number(vd.used || 0) / Number(vd.quantity)) * 100) : 0) + '%'"></div>
              </td>
              <td class="small text-secondary" v-text="vd.start_date ? formatDate(vd.start_date) : '—'"></td>
              <td class="small text-secondary" v-text="vd.end_date ? formatDate(vd.end_date) : '—'"></td>
              <td><span class="badge rounded-1" :class="getVariantDiscountStatus(vd).cls" v-text="getVariantDiscountStatus(vd).label"></span></td>
              <td class="text-end">
                <button @click="openVariantDiscountForm(vd)" class="btn btn-sm btn-light border rounded-2 me-1"><i class="bi bi-pencil"></i></button>
                <button @click="deleteItem('variantDiscounts', vd.id, getVariantInfo(vd).product_name)" class="btn btn-sm btn-light border rounded-2 text-danger"><i class="bi bi-trash"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL Thêm / Sửa -->
    <div v-if="variantDiscountModal.open" class="custom-modal-overlay" @click.self="closeVariantDiscountForm()">
      <div class="custom-modal-box fade-in-scale" style="max-width:640px;">
        <div class="p-4 border-bottom d-flex justify-content-between align-items-center">
          <h6 class="fw-bold mb-0 text-dark" v-text="variantDiscountModal.data.id ? 'Chỉnh sửa giảm giá biến thể màu' : 'Thêm giảm giá biến thể màu'"></h6>
          <button @click="closeVariantDiscountForm()" class="btn btn-sm btn-light border-0"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="p-4" style="max-height:65vh;overflow:auto;">
          <!-- Chọn biến thể -->
          <div class="mb-3">
            <label class="form-label small fw-medium">Chọn biến thể màu sản phẩm</label>
            <select v-model="variantDiscountModal.data.variant_id" class="form-select rounded-2">
              <option value="">-- Chọn biến thể màu --</option>
              <option v-for="o in variantColorOptions" :key="o.variant_id" :value="o.variant_id" v-text="o.product_name + ' — ' + o.color + ' (tồn: ' + o.stock + ')'"></option>
            </select>
          </div>
          <!-- Cảnh báo trùng -->
          <div v-if="variantAlreadyDiscounted(variantDiscountModal.data.variant_id) && !variantDiscountModal.data.id" class="alert alert-warning py-2 px-3 small rounded-2 d-flex align-items-start gap-2">
            <i class="bi bi-exclamation-triangle-fill mt-1"></i>
            <span>Biến thể này đã có chương trình giảm giá đang chạy. Vui lòng chọn biến thể khác hoặc chỉnh sửa chương trình hiện tại.</span>
          </div>

          <div class="row g-3">
            <div class="col-md-6"><label class="form-label small fw-medium">Loại giảm giá</label><select v-model="variantDiscountModal.data.discount_type" class="form-select rounded-2"><option v-for="t in variantDiscountTypes" :key="t" :value="t" v-text="t"></option></select></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Giá trị giảm</label><input v-model.number="variantDiscountModal.data.value" type="number" class="form-control rounded-2" placeholder="Nhập số tiền (VNĐ) hoặc %"><small class="text-secondary" style="font-size:0.72rem;">Cố định: nhập số tiền · Phần trăm: nhập %</small></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Giảm tối đa (nếu %)</label><input v-model.number="variantDiscountModal.data.max_discount" type="number" class="form-control rounded-2" placeholder="0"></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Số lượng</label><input v-model.number="variantDiscountModal.data.quantity" type="number" class="form-control rounded-2" placeholder="Phải lớn hơn 0"></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Ngày bắt đầu</label><input v-model="variantDiscountModal.data.start_date" type="date" class="form-control rounded-2"></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Ngày kết thúc</label><input v-model="variantDiscountModal.data.end_date" type="date" class="form-control rounded-2"></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Lý do giảm giá</label><select v-model="variantDiscountModal.data.reason" class="form-select rounded-2"><option v-for="r in variantReasons" :key="r" :value="r" v-text="r"></option></select></div>
            <div class="col-md-6 d-flex align-items-end"><div class="form-check form-switch"><input v-model="variantDiscountModal.data.active" class="form-check-input" type="checkbox" id="vdActive"><label class="form-check-label small" for="vdActive">Kích hoạt</label></div></div>
            <div class="col-12"><label class="form-label small fw-medium">Mô tả (tùy chọn)</label><textarea v-model="variantDiscountModal.data.description" rows="2" class="form-control rounded-2"></textarea></div>
          </div>
        </div>
        <div class="p-4 border-top d-flex justify-content-end gap-2"><button @click="closeVariantDiscountForm()" class="btn btn-light border rounded-2">Hủy</button><button @click="saveVariantDiscount" class="btn btn-dark rounded-2 fw-bold">Lưu</button></div>
      </div>
    </div>
  </div>
</template>
