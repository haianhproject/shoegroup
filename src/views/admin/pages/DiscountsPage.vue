<!-- Trang: Mã Khuyến Mãi (Quản lý mã giảm giá) -->
<script setup>
import {
  filteredDiscountsList, discountSearch, discountStatusFilter, discountStatuses,
  discountTypes, discountModal, openDiscountForm, closeDiscountForm, saveDiscount,
  getDiscountStatus, formatDiscountValue, formatDate, formatPrice, deleteItem, restoreItem,
} from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="bg-white p-4" style="border-radius:4px;">
      <!-- Tiêu đề -->
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
        <div>
          <h5 class="fw-bold mb-1 text-dark">Quản lý mã giảm giá</h5>
          <p class="text-secondary small mb-0">Tạo, chỉnh sửa và theo dõi mã khuyến mãi</p>
        </div>
        <button @click="openDiscountForm()" class="btn btn-dark fw-medium px-3" style="border-radius:4px;"><i class="bi bi-plus-lg me-1"></i> Thêm mã giảm giá</button>
      </div>

      <!-- Bộ lọc -->
      <div class="d-flex flex-wrap gap-2 mb-3">
        <div class="position-relative flex-grow-1" style="min-width:240px;max-width:420px;">
          <i class="bi bi-search position-absolute text-secondary" style="left:12px;top:50%;transform:translateY(-50%);"></i>
          <input v-model="discountSearch" type="text" class="form-control rounded-2 ps-4" placeholder="Tìm theo mã hoặc tên chương trình">
        </div>
        <select v-model="discountStatusFilter" class="form-select rounded-2" style="max-width:200px;">
          <option v-for="s in discountStatuses" :key="s" :value="s" v-text="s === 'Tất cả' ? 'Lọc trạng thái' : s"></option>
        </select>
      </div>

      <!-- Bảng -->
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead>
            <tr class="text-secondary small text-uppercase">
              <th>Mã</th><th>Tên chương trình</th><th>Loại</th>
              <th class="text-center">Giá trị</th><th class="text-end">Đơn tối thiểu</th>
              <th class="text-end">Giảm tối đa</th><th>Thời gian</th>
              <th class="text-center">Số lượng</th><th>Trạng thái</th><th class="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredDiscountsList.length === 0"><td colspan="10" class="text-center text-secondary py-5"><i class="bi bi-ticket-perforated fs-1 d-block mb-2 opacity-50"></i>Không có mã giảm giá nào.</td></tr>
            <tr v-for="d in filteredDiscountsList" :key="d.id">
              <td class="fw-bold text-dark" v-text="d.code"></td>
              <td class="small" v-text="d.name || '—'"></td>
              <td><span class="badge bg-light text-secondary border" style="border-radius:2px;font-size:0.72rem;" v-text="d.discount_type"></span></td>
              <td class="text-center fw-bold text-dark" v-text="formatDiscountValue(d)"></td>
              <td class="text-end small" v-text="Number(d.min_order) > 0 ? formatPrice(d.min_order) : '—'"></td>
              <td class="text-end small" v-text="Number(d.max_discount) > 0 ? formatPrice(d.max_discount) : '—'"></td>
              <td class="small text-secondary">
                <span v-text="d.start_date ? formatDate(d.start_date) : '—'"></span>
                <span class="mx-1">→</span>
                <span v-text="d.expiry ? formatDate(d.expiry) : '—'"></span>
              </td>
              <td class="text-center small" v-text="Number(d.quantity) > 0 ? d.quantity : '∞'"></td>
              <td><span class="badge" style="border-radius:2px;font-size:0.72rem;" :class="getDiscountStatus(d).cls" v-text="getDiscountStatus(d).label"></span></td>
              <td class="text-end">
                <button v-if="d.active === false" @click="restoreItem('discounts', d)" class="btn btn-sm btn-light border text-success me-1" style="border-radius:3px;" title="Khôi phục"><i class="bi bi-arrow-counterclockwise"></i></button>
                <button @click="openDiscountForm(d)" class="btn btn-sm btn-light border me-1" style="border-radius:3px;"><i class="bi bi-pencil"></i></button>
                <button @click="deleteItem('discounts', d.id, d.code)" class="btn btn-sm btn-light border text-danger" style="border-radius:3px;"><i class="bi bi-trash"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL Thêm / Sửa -->
    <div v-if="discountModal.open" class="custom-modal-overlay" @click.self="closeDiscountForm()">
      <div class="custom-modal-box fade-in-scale" style="max-width:640px;">
        <div class="p-4 border-bottom d-flex justify-content-between align-items-center">
          <h6 class="fw-bold mb-0 text-dark" v-text="discountModal.data.id ? 'Chỉnh sửa mã giảm giá' : 'Thêm mã giảm giá'"></h6>
          <button @click="closeDiscountForm()" class="btn btn-sm btn-light border-0"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="p-4" style="max-height:65vh;overflow:auto;">
          <div class="row g-3">
            <div class="col-md-6"><label class="form-label small fw-medium">Mã giảm giá</label><input v-model="discountModal.data.code" type="text" class="form-control rounded-2" placeholder="VD: NEW200"></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Tên chương trình</label><input v-model="discountModal.data.name" type="text" class="form-control rounded-2" placeholder="VD: Giảm giá sập sàn"></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Loại giảm giá</label><select v-model="discountModal.data.discount_type" class="form-select rounded-2"><option v-for="t in discountTypes" :key="t" :value="t" v-text="t"></option></select></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Giá trị giảm</label><input v-model.number="discountModal.data.value" type="number" class="form-control rounded-2" placeholder="0"></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Đơn tối thiểu</label><input v-model.number="discountModal.data.min_order" type="number" class="form-control rounded-2" placeholder="0"></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Giảm tối đa</label><input v-model.number="discountModal.data.max_discount" type="number" class="form-control rounded-2" placeholder="0"></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Số lượng</label><input v-model.number="discountModal.data.quantity" type="number" class="form-control rounded-2" placeholder="0"></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Ngày bắt đầu</label><input v-model="discountModal.data.start_date" type="date" class="form-control rounded-2"></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Ngày kết thúc</label><input v-model="discountModal.data.expiry" type="date" class="form-control rounded-2"></div>
            <div class="col-12"><label class="form-label small fw-medium">Mô tả (tùy chọn)</label><textarea v-model="discountModal.data.description" rows="2" class="form-control rounded-2"></textarea></div>
            <div class="col-12"><div class="form-check form-switch"><input v-model="discountModal.data.active" class="form-check-input" type="checkbox" id="dscActive"><label class="form-check-label small" for="dscActive">Kích hoạt mã giảm giá</label></div></div>
          </div>
        </div>
        <div class="p-4 border-top d-flex justify-content-end gap-2"><button @click="closeDiscountForm()" class="btn btn-light border rounded-2">Hủy</button><button @click="saveDiscount" class="btn btn-dark rounded-2 fw-bold">Lưu</button></div>
      </div>
    </div>
  </div>
</template>
