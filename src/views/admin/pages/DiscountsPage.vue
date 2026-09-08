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
      <div class="flex flex-wrap justify-between items-start gap-2 mb-4">
        <div>
          <h5 class="font-bold mb-1 text-gray-900">Quản lý mã giảm giá</h5>
          <p class="text-gray-600 text-sm mb-0">Tạo, chỉnh sửa và theo dõi mã khuyến mãi</p>
        </div>
        <button @click="openDiscountForm()" class="btn btn-dark font-medium px-3" style="border-radius:4px;"><i class="icon icon-plus-lg mr-1"></i> Thêm mã giảm giá</button>
      </div>

      <!-- Bộ lọc -->
      <div class="flex flex-wrap gap-2 mb-3">
        <div class="relative grow" style="min-width:240px;max-width:420px;">
          <i class="icon icon-search absolute text-gray-600" style="left:12px;top:50%;transform:translateY(-50%);"></i>
          <input v-model="discountSearch" type="text" class="sg-input rounded-2 pl-4" placeholder="Tìm theo mã hoặc tên chương trình">
        </div>
        <select v-model="discountStatusFilter" class="sg-input rounded-2" style="max-width:200px;">
          <option v-for="s in discountStatuses" :key="s" :value="s" v-text="s === 'Tất cả' ? 'Lọc trạng thái' : s"></option>
        </select>
      </div>

      <!-- Bảng -->
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead>
            <tr class="text-gray-600 text-sm uppercase">
              <th>Mã</th><th>Tên chương trình</th><th>Loại</th>
              <th class="text-center">Giá trị</th><th class="text-end">Đơn tối thiểu</th>
              <th class="text-end">Giảm tối đa</th><th>Thời gian</th>
              <th class="text-center">Số lượng</th><th>Trạng thái</th><th class="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredDiscountsList.length === 0"><td colspan="10" class="text-center text-gray-600 py-5"><i class="icon icon-ticket-perforated text-4xl block mb-2 opacity-50"></i>Không có mã giảm giá nào.</td></tr>
            <tr v-for="d in filteredDiscountsList" :key="d.id">
              <td class="font-bold text-gray-900" v-text="d.code"></td>
              <td class="text-sm" v-text="d.name || '—'"></td>
              <td><span class="badge bg-gray-100 text-gray-600 border" style="border-radius:2px;font-size:0.72rem;" v-text="d.discount_type"></span></td>
              <td class="text-center font-bold text-gray-900" v-text="formatDiscountValue(d)"></td>
              <td class="text-end text-sm" v-text="Number(d.min_order) > 0 ? formatPrice(d.min_order) : '—'"></td>
              <td class="text-end text-sm" v-text="Number(d.max_discount) > 0 ? formatPrice(d.max_discount) : '—'"></td>
              <td class="text-sm text-gray-600">
                <span v-text="d.start_date ? formatDate(d.start_date) : '—'"></span>
                <span class="mx-1">→</span>
                <span v-text="d.expiry ? formatDate(d.expiry) : '—'"></span>
              </td>
              <td class="text-center text-sm" v-text="Number(d.quantity) > 0 ? d.quantity : '∞'"></td>
              <td><span class="badge" style="border-radius:2px;font-size:0.72rem;" :class="getDiscountStatus(d).cls" v-text="getDiscountStatus(d).label"></span></td>
              <td class="text-end">
                <button v-if="d.active === false" @click="restoreItem('discounts', d)" class="btn btn-sm btn-light border text-green-600 mr-1" style="border-radius:3px;" title="Khôi phục"><i class="icon icon-arrow-counterclockwise"></i></button>
                <button @click="openDiscountForm(d)" class="btn btn-sm btn-light border mr-1" style="border-radius:3px;"><i class="icon icon-pencil"></i></button>
                <button @click="deleteItem('discounts', d.id, d.code)" class="btn btn-sm btn-light border text-red-600" style="border-radius:3px;"><i class="icon icon-trash"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL Thêm / Sửa -->
    <div v-if="discountModal.open" class="custom-modal-overlay" @click.self="closeDiscountForm()">
      <div class="custom-modal-box fade-in-scale" style="max-width:640px;">
        <div class="p-4 border-b flex justify-between items-center">
          <h6 class="font-bold mb-0 text-gray-900" v-text="discountModal.data.id ? 'Chỉnh sửa mã giảm giá' : 'Thêm mã giảm giá'"></h6>
          <button @click="closeDiscountForm()" class="btn btn-sm btn-light border-0"><i class="icon icon-x-lg"></i></button>
        </div>
        <div class="p-4" style="max-height:65vh;overflow:auto;">
          <div class="grid grid-cols-12 gap-3">
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium">Mã giảm giá</label><input v-model="discountModal.data.code" type="text" class="sg-input rounded-2" placeholder="VD: NEW200"></div>
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium">Tên chương trình</label><input v-model="discountModal.data.name" type="text" class="sg-input rounded-2" placeholder="VD: Giảm giá sập sàn"></div>
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium">Loại giảm giá</label><select v-model="discountModal.data.discount_type" class="sg-input rounded-2"><option v-for="t in discountTypes" :key="t" :value="t" v-text="t"></option></select></div>
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium">Giá trị giảm</label><input v-model.number="discountModal.data.value" type="number" class="sg-input rounded-2" placeholder="0"></div>
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium">Đơn tối thiểu</label><input v-model.number="discountModal.data.min_order" type="number" class="sg-input rounded-2" placeholder="0"></div>
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium">Giảm tối đa</label><input v-model.number="discountModal.data.max_discount" type="number" class="sg-input rounded-2" placeholder="0"></div>
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium">Số lượng</label><input v-model.number="discountModal.data.quantity" type="number" class="sg-input rounded-2" placeholder="0"></div>
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium">Ngày bắt đầu</label><input v-model="discountModal.data.start_date" type="date" class="sg-input rounded-2"></div>
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium">Ngày kết thúc</label><input v-model="discountModal.data.expiry" type="date" class="sg-input rounded-2"></div>
            <div class="col-span-12"><label class="block text-sm font-medium text-sm font-medium">Mô tả (tùy chọn)</label><textarea v-model="discountModal.data.description" rows="2" class="sg-input rounded-2"></textarea></div>
            <div class="col-span-12"><div class="flex items-center gap-2 flex items-center"><input v-model="discountModal.data.active" class="accent-black" type="checkbox" id="dscActive"><label class="text-sm text-sm" for="dscActive">Kích hoạt mã giảm giá</label></div></div>
          </div>
        </div>
        <div class="p-4 border-t flex justify-end gap-2"><button @click="closeDiscountForm()" class="btn btn-light border rounded-2">Hủy</button><button @click="saveDiscount" class="btn btn-dark rounded-2 font-bold">Lưu</button></div>
      </div>
    </div>
  </div>
</template>
