<!-- Mục đích: Quản lý mã giảm giá theo đơn hàng với bảng gọn và panel xem/thêm/sửa bên phải. -->
<script setup>
import { nextTick } from 'vue'
import AdminDrawer from '../components/AdminDrawer.vue'
import {
  filteredDiscountsList, discountSearch, discountStatusFilter, discountStatuses, discountTypes,
  discountModal, openDiscountForm, closeDiscountForm, saveDiscount,
  getDiscountStatus, formatDiscountValue, formatPromotionDate, formatPrice,
  couponFinished, toggleDiscountStatus, discountDetail, openDiscountDetail,
} from '../adminStore'

async function editDetail() {
  const item=discountDetail.item
  discountDetail.open=false
  await nextTick()
  openDiscountForm(item)
}
</script>

<template>
  <div class="fade-in discount-page promotion-page">
    <section class="bg-white p-4 rounded-2 border">
      <header class="flex flex-wrap justify-between items-start gap-2 mb-4">
        <div><h1 class="text-xl font-bold mb-1">Quản lý mã giảm giá</h1><p class="text-gray-600 text-sm mb-0">Tạo, chỉnh sửa và theo dõi mã giảm giá theo đơn hàng.</p></div>
        <button type="button" class="btn btn-dark" @click="openDiscountForm()"><i class="icon icon-plus-lg" aria-hidden="true"></i>Thêm mã giảm giá</button>
      </header>
      <div class="flex flex-wrap gap-2 mb-3">
        <input v-model="discountSearch" type="search" class="sg-input promotion-search" placeholder="Tìm mã hoặc tên chương trình" aria-label="Tìm mã giảm giá">
        <select v-model="discountStatusFilter" class="sg-input promotion-filter" aria-label="Lọc trạng thái mã giảm giá"><option v-for="s in discountStatuses" :key="s" :value="s">{{ s === 'Tất cả' ? 'Tất cả trạng thái' : s }}</option></select>
      </div>
      <div class="table-responsive" tabindex="0" role="region" aria-label="Danh sách mã giảm giá, có thể cuộn ngang">
        <table class="table align-middle mb-0 promotion-table">
          <thead><tr><th scope="col">Mã</th><th scope="col">Tên chương trình</th><th scope="col">Giá trị</th><th scope="col" class="promotion-time">Thời gian</th><th scope="col">Trạng thái</th><th scope="col" class="text-end">Thao tác</th></tr></thead>
          <tbody>
            <tr v-if="!filteredDiscountsList.length"><td colspan="6" class="text-center text-gray-600 py-5">Không có mã giảm giá phù hợp.</td></tr>
            <tr v-for="d in filteredDiscountsList" :key="d.id">
              <td class="font-bold">{{ d.code }}</td><td>{{ d.name || '—' }}</td><td class="whitespace-nowrap">{{ formatDiscountValue(d) }}</td>
              <td class="promotion-time"><div class="promotion-period"><span>Từ {{ formatPromotionDate(d.start_date) }}</span><span>Đến {{ formatPromotionDate(d.expiry, true) }}</span></div></td>
              <td><span class="badge" :class="getDiscountStatus(d).cls">{{ getDiscountStatus(d).label }}</span></td>
              <td><div class="promotion-actions">
                <button type="button" class="btn btn-sm btn-light border" @click="openDiscountDetail(d)" :aria-label="'Xem mã '+d.code" title="Xem chi tiết"><i class="icon icon-eye" aria-hidden="true"></i></button>
                <button type="button" class="btn btn-sm btn-light border" @click="openDiscountForm(d)" :disabled="couponFinished(d)" :aria-label="'Sửa mã '+d.code" title="Chỉnh sửa"><i class="icon icon-pencil" aria-hidden="true"></i></button>
                <input type="checkbox" role="switch" :checked="d.active" :disabled="couponFinished(d)" @change="toggleDiscountStatus(d,$event)" :aria-label="'Trạng thái mã '+d.code" :title="d.active?'Ngừng hoạt động':'Bật hoạt động'">
              </div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <AdminDrawer :open="discountModal.open" :title="discountModal.data.id ? 'Chỉnh sửa mã giảm giá' : 'Thêm mã giảm giá'" :busy="discountModal.saving" @close="closeDiscountForm">
      <form id="coupon-editor" @submit.prevent="saveDiscount" @input="discountModal.error=''">
        <fieldset :disabled="discountModal.saving" class="promotion-fields">
          <div class="promotion-field-wide"><label for="coupon-code">Mã giảm giá <span class="form-required" aria-hidden="true">*</span></label><input id="coupon-code" v-model="discountModal.data.code" type="text" maxlength="50" pattern="[A-Za-z0-9][A-Za-z0-9_\-]{1,49}" required class="sg-input" placeholder="VD: NEW200"></div>
          <div class="promotion-field-wide"><label for="coupon-name">Tên chương trình <span class="form-required" aria-hidden="true">*</span></label><input id="coupon-name" v-model="discountModal.data.name" type="text" maxlength="200" required class="sg-input"></div>
          <div><label for="coupon-type">Loại giảm giá <span class="form-required" aria-hidden="true">*</span></label><select id="coupon-type" v-model="discountModal.data.discount_type" required class="sg-input"><option v-for="t in discountTypes" :key="t" :value="t">{{ t }}</option></select></div>
          <div><label for="coupon-value">Giá trị giảm <span class="form-required" aria-hidden="true">*</span></label><input id="coupon-value" v-model.number="discountModal.data.value" type="number" min="0.01" :max="discountModal.data.discount_type==='Phần trăm'?100:1000000000000" step="any" required class="sg-input"></div>
          <div><label for="coupon-min">Đơn tối thiểu</label><input id="coupon-min" v-model.number="discountModal.data.min_order" type="number" min="0" max="1000000000000" step="any" class="sg-input"></div>
          <div><label for="coupon-max">Giảm tối đa</label><input id="coupon-max" v-model.number="discountModal.data.max_discount" type="number" min="0" max="1000000000000" step="any" class="sg-input"></div>
          <div class="promotion-field-wide">
            <label for="coupon-quantity">Tổng số lượt <span v-if="discountModal.data.quantity!=null" class="form-required" aria-hidden="true">*</span></label>
            <label class="promotion-check"><input type="checkbox" :checked="discountModal.data.quantity==null" @change="discountModal.data.quantity=$event.target.checked?null:1">Không giới hạn</label>
            <input id="coupon-quantity" v-model.number="discountModal.data.quantity" :disabled="discountModal.data.quantity==null" :required="discountModal.data.quantity!=null" type="number" min="0" max="2147483647" step="1" class="sg-input">
          </div>
          <div><label for="coupon-start">Bắt đầu <span class="form-required" aria-hidden="true">*</span></label><input id="coupon-start" v-model="discountModal.data.start_date" type="datetime-local" step="0.001" required class="sg-input"></div>
          <div><label for="coupon-end">Kết thúc <span class="form-required" aria-hidden="true">*</span></label><input id="coupon-end" v-model="discountModal.data.expiry" type="datetime-local" step="0.001" :min="discountModal.data.start_date || undefined" required class="sg-input"></div>
          <div class="promotion-field-wide"><label for="coupon-description">Mô tả</label><textarea id="coupon-description" v-model="discountModal.data.description" rows="2" class="sg-input"></textarea></div>
          <label class="promotion-check promotion-field-wide"><input v-model="discountModal.data.active" type="checkbox" role="switch">{{ discountModal.data.active ? 'Hoạt động' : 'Ngừng hoạt động' }}</label>
        </fieldset>
        <p v-if="discountModal.error" class="text-sm text-red-600 mt-3" role="alert">{{ discountModal.error }}</p>
      </form>
      <template #footer><button type="button" class="btn btn-light border" :disabled="discountModal.saving" @click="closeDiscountForm">Hủy</button><button type="submit" form="coupon-editor" class="btn btn-dark" :disabled="discountModal.saving">{{ discountModal.saving ? 'Đang lưu…' : 'Lưu' }}</button></template>
    </AdminDrawer>

    <AdminDrawer :open="discountDetail.open" title="Chi tiết mã giảm giá" @close="discountDetail.open=false">
      <dl v-if="discountDetail.item" class="promotion-detail">
        <div><dt>Mã giảm giá</dt><dd>{{ discountDetail.item.code }}</dd></div><div><dt>Tên chương trình</dt><dd>{{ discountDetail.item.name || '—' }}</dd></div>
        <div><dt>Giá trị giảm</dt><dd>{{ formatDiscountValue(discountDetail.item) }}</dd></div>
        <div><dt>Đơn tối thiểu</dt><dd>{{ formatPrice(discountDetail.item.min_order) }}</dd></div><div><dt>Giảm tối đa</dt><dd>{{ Number(discountDetail.item.max_discount)>0 ? formatPrice(discountDetail.item.max_discount) : 'Không giới hạn' }}</dd></div>
        <div><dt>Đã dùng / Tổng lượt</dt><dd>{{ discountDetail.item.used || 0 }} / {{ discountDetail.item.quantity ?? 'Không giới hạn' }}</dd></div>
        <div><dt>Bắt đầu</dt><dd>{{ formatPromotionDate(discountDetail.item.start_date) }}</dd></div><div><dt>Kết thúc</dt><dd>{{ formatPromotionDate(discountDetail.item.expiry,true) }}</dd></div>
        <div><dt>Trạng thái</dt><dd>{{ getDiscountStatus(discountDetail.item).label }}</dd></div><div><dt>Mô tả</dt><dd class="whitespace-pre-wrap">{{ discountDetail.item.description || '—' }}</dd></div>
      </dl>
      <template #footer><button type="button" class="btn btn-light border" @click="discountDetail.open=false">Đóng</button><button v-if="discountDetail.item && !couponFinished(discountDetail.item)" type="button" class="btn btn-dark" @click="editDetail">Chỉnh sửa</button></template>
    </AdminDrawer>
  </div>
</template>
