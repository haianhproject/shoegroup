<!-- Mục đích: Khuyến mại theo sản phẩm/màu cho mọi size, giữ nguyên phạm vi các chương trình cũ. -->
<script setup>
import { computed } from 'vue'
import AdminDrawer from '../components/AdminDrawer.vue'
import {
  db, filteredVariantDiscounts, variantDiscountSearch, variantStatusFilter, variantReasonFilter,
  variantColorOptions, variantDiscountTypes, variantReasons,
  variantDiscountModal, openVariantDiscountForm, openVariantDiscountDetail, closeVariantDiscountForm, saveVariantDiscount,
  getVariantInfo, formatVariantDiscountValue, getVariantDiscountStatus, variantAlreadyDiscounted,
  formatPromotionDate, toggleVariantDiscount, isExpired,
} from '../adminStore'
import fallbackProductImage from '../../../../img/hero-sneakers.jpg'

const readOnly=computed(()=>variantDiscountModal.mode==='view')
const legacyScope=computed(()=>variantDiscountModal.data.apply_scope==='variant')
const productOptions=computed(()=>db.products.filter(p=>p.active!==false && variantColorOptions.value.some(c=>String(c.product_id)===String(p.id))))
const colorOptions=computed(()=>variantColorOptions.value.filter(c=>String(c.product_id)===String(variantDiscountModal.data.product_id)))
function selectProduct() {
  Object.assign(variantDiscountModal.data,{variant_id:'',color_id:'',color:'',color_hex:'',apply_scope:'color'})
}
function selectColor() {
  const selected=colorOptions.value.find(c=>String(c.variant_id)===String(variantDiscountModal.data.variant_id))
  if(selected) Object.assign(variantDiscountModal.data,{color_id:selected.color_id,color:selected.raw_color,color_hex:selected.color_hex})
}
function imageError(event) {
  event.target.onerror=null
  event.target.src=fallbackProductImage
}
</script>

<template>
  <div class="fade-in promotion-page">
    <section class="bg-white rounded-2 border p-4">
      <header class="flex flex-wrap justify-between items-start gap-2 mb-4">
        <div><h1 class="text-xl font-bold mb-1">Quản lý khuyến mại sản phẩm</h1><p class="text-gray-600 text-sm mb-0">Một mức ưu đãi áp dụng cho mọi kích cỡ của màu sản phẩm đã chọn.</p></div>
        <button type="button" class="btn btn-dark" @click="openVariantDiscountForm()"><i class="icon icon-plus-lg" aria-hidden="true"></i>Thêm khuyến mại</button>
      </header>
      <div class="flex flex-wrap gap-2 mb-3">
        <input v-model="variantDiscountSearch" type="search" class="sg-input promotion-search" placeholder="Tìm sản phẩm hoặc màu" aria-label="Tìm khuyến mại sản phẩm">
        <select v-model="variantReasonFilter" class="sg-input promotion-filter" aria-label="Lọc lý do khuyến mại"><option value="Tất cả">Tất cả lý do</option><option v-for="r in variantReasons" :key="r" :value="r">{{ r }}</option></select>
        <select v-model="variantStatusFilter" class="sg-input promotion-filter" aria-label="Lọc trạng thái khuyến mại"><option value="Tất cả">Tất cả trạng thái</option><option v-for="s in ['Hoạt động','Sắp diễn ra','Đã dùng hết','Hết hạn','Ngừng hoạt động']" :key="s" :value="s">{{ s }}</option></select>
      </div>
      <div class="table-responsive" tabindex="0" role="region" aria-label="Danh sách khuyến mại sản phẩm, có thể cuộn ngang">
        <table class="table align-middle mb-0 promotion-table">
          <thead><tr><th scope="col">Hình ảnh</th><th scope="col">Sản phẩm</th><th scope="col">Màu áp dụng</th><th scope="col">Giá trị</th><th scope="col" class="promotion-time">Thời gian</th><th scope="col">Trạng thái</th><th scope="col" class="text-end">Thao tác</th></tr></thead>
          <tbody>
            <tr v-if="!filteredVariantDiscounts.length"><td colspan="7" class="text-center text-gray-600 py-5">Không có khuyến mại sản phẩm phù hợp.</td></tr>
            <tr v-for="vd in filteredVariantDiscounts" :key="vd.id">
              <td><img :src="getVariantInfo(vd).image || fallbackProductImage" :alt="getVariantInfo(vd).product_name" width="44" height="44" class="promotion-image" @error="imageError"></td>
              <td><strong>{{ getVariantInfo(vd).product_name }}</strong><div v-if="vd.reason" class="text-gray-600 text-xs">{{ vd.reason }}</div></td>
              <td><div class="flex items-center gap-2"><span class="promotion-swatch" :style="{backgroundColor:getVariantInfo(vd).color_hex}"></span>{{ getVariantInfo(vd).color }}</div><small class="text-gray-600">{{ vd.apply_scope==='variant' ? 'Chương trình cũ: '+getVariantInfo(vd).size : 'Mọi kích cỡ' }}</small></td>
              <td class="whitespace-nowrap">{{ formatVariantDiscountValue(vd) }}</td>
              <td class="promotion-time"><div class="promotion-period"><span>Từ {{ formatPromotionDate(vd.start_date) }}</span><span>Đến {{ formatPromotionDate(vd.end_date,true) }}</span></div></td>
              <td><span class="badge" :class="getVariantDiscountStatus(vd).cls">{{ getVariantDiscountStatus(vd).label }}</span></td>
              <td><div class="promotion-actions">
                <button type="button" class="btn btn-sm btn-light border" @click="openVariantDiscountDetail(vd)" :aria-label="'Xem khuyến mại '+getVariantInfo(vd).product_name" title="Xem chi tiết"><i class="icon icon-eye" aria-hidden="true"></i></button>
                <button type="button" class="btn btn-sm btn-light border" @click="openVariantDiscountForm(vd)" :disabled="isExpired(vd.end_date)" :aria-label="'Sửa khuyến mại '+getVariantInfo(vd).product_name" title="Chỉnh sửa"><i class="icon icon-pencil" aria-hidden="true"></i></button>
                <input type="checkbox" role="switch" :checked="vd.active" :disabled="isExpired(vd.end_date)" @change="toggleVariantDiscount(vd,$event)" aria-label="Trạng thái khuyến mại" :title="vd.active?'Ngừng hoạt động':'Bật hoạt động'">
              </div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <AdminDrawer :open="variantDiscountModal.open" :title="readOnly ? 'Chi tiết khuyến mại sản phẩm' : variantDiscountModal.data.id ? 'Chỉnh sửa khuyến mại sản phẩm' : 'Thêm khuyến mại sản phẩm'" :busy="variantDiscountModal.saving" @close="closeVariantDiscountForm">
      <form id="product-promotion-editor" @submit.prevent="saveVariantDiscount" @input="variantDiscountModal.error=''">
        <fieldset :disabled="readOnly || variantDiscountModal.saving" class="promotion-fields">
          <template v-if="!legacyScope && !readOnly">
            <div class="promotion-field-wide"><label for="promotion-product">Sản phẩm <span class="form-required" aria-hidden="true">*</span></label><select id="promotion-product" v-model="variantDiscountModal.data.product_id" @change="selectProduct" class="sg-input" required><option value="" disabled>Chọn sản phẩm</option><option v-for="p in productOptions" :key="p.id" :value="p.id">{{ p.name }}</option></select></div>
            <div class="promotion-field-wide"><label for="promotion-color">Màu áp dụng <span class="form-required" aria-hidden="true">*</span></label><select id="promotion-color" v-model="variantDiscountModal.data.variant_id" @change="selectColor" class="sg-input" :disabled="!variantDiscountModal.data.product_id" required><option value="" disabled>Chọn màu — áp dụng mọi kích cỡ</option><option v-for="c in colorOptions" :key="c.variant_id" :value="c.variant_id">{{ c.color }} — Mọi kích cỡ</option></select></div>
          </template>
          <div v-else class="promotion-field-wide">
            <label>Sản phẩm và phạm vi áp dụng</label><p class="mb-1 font-medium">{{ getVariantInfo(variantDiscountModal.data).product_name }} — {{ getVariantInfo(variantDiscountModal.data).color }} — {{ legacyScope ? getVariantInfo(variantDiscountModal.data).size : 'Mọi kích cỡ' }}</p>
            <p v-if="legacyScope" class="text-sm text-gray-600">Giữ nguyên phạm vi của chương trình cũ. Chương trình mới được tạo theo màu, áp dụng mọi kích cỡ.</p>
          </div>
          <div><label for="promotion-type">Loại giảm giá <span class="form-required" aria-hidden="true">*</span></label><select id="promotion-type" v-model="variantDiscountModal.data.discount_type" class="sg-input" required><option v-for="t in variantDiscountTypes" :key="t" :value="t">{{ t }}</option></select></div>
          <div><label for="promotion-value">{{ variantDiscountModal.data.discount_type==='Cố định' ? 'Giá bán mới (VNĐ)' : 'Phần trăm giảm (%)' }} <span class="form-required" aria-hidden="true">*</span></label><input id="promotion-value" v-model.number="variantDiscountModal.data.value" type="number" min="1" :max="variantDiscountModal.data.discount_type==='Theo phần trăm'?99:1000000000000" step="1" required class="sg-input"></div>
          <div class="promotion-field-wide"><label for="promotion-quantity">Số lượng được giảm</label><input id="promotion-quantity" v-model.number="variantDiscountModal.data.quantity" type="number" min="0" max="2147483647" step="1" class="sg-input"><small class="text-gray-600">0 = không giới hạn số lượng.</small></div>
          <div><label for="promotion-start">Ngày bắt đầu</label><input id="promotion-start" v-model="variantDiscountModal.data.start_date" type="date" :max="variantDiscountModal.data.end_date || undefined" class="sg-input"></div>
          <div><label for="promotion-end">Ngày kết thúc</label><input id="promotion-end" v-model="variantDiscountModal.data.end_date" type="date" :min="variantDiscountModal.data.start_date || undefined" class="sg-input"></div>
          <div><label for="promotion-reason">Lý do khuyến mại</label><select id="promotion-reason" v-model="variantDiscountModal.data.reason" class="sg-input"><option v-for="r in variantReasons" :key="r" :value="r">{{ r }}</option></select></div>
          <label class="promotion-check"><input v-model="variantDiscountModal.data.active" type="checkbox" role="switch">{{ variantDiscountModal.data.active?'Hoạt động':'Ngừng hoạt động' }}</label>
        </fieldset>
        <p v-if="variantDiscountModal.error" class="text-sm text-red-600 mt-3" role="alert">{{ variantDiscountModal.error }}</p>
        <p v-if="!readOnly && variantDiscountModal.data.active && variantAlreadyDiscounted(variantDiscountModal.data.variant_id,variantDiscountModal.data.id,variantDiscountModal.data.start_date,variantDiscountModal.data.end_date,variantDiscountModal.data.apply_scope)" class="text-sm text-red-600 mt-3" role="alert">Màu/phạm vi này đã có ưu đãi trùng thời gian. Chọn thời gian khác hoặc tạm dừng chương trình cũ.</p>
      </form>
      <dl v-if="readOnly" class="promotion-detail mt-4"><div><dt>Đã dùng / Tổng số lượng</dt><dd>{{ variantDiscountModal.data.used || 0 }} / {{ Number(variantDiscountModal.data.quantity)>0 ? variantDiscountModal.data.quantity : 'Không giới hạn' }}</dd></div><div><dt>Trạng thái</dt><dd>{{ getVariantDiscountStatus(variantDiscountModal.data).label }}</dd></div></dl>
      <template #footer>
        <button type="button" class="btn btn-light border" :disabled="variantDiscountModal.saving" @click="closeVariantDiscountForm">{{ readOnly?'Đóng':'Hủy' }}</button>
        <button v-if="readOnly && !isExpired(variantDiscountModal.data.end_date)" type="button" class="btn btn-dark" @click="openVariantDiscountForm({...variantDiscountModal.data})">Chỉnh sửa</button>
        <button v-if="!readOnly" type="submit" form="product-promotion-editor" class="btn btn-dark" :disabled="variantDiscountModal.saving">{{ variantDiscountModal.saving?'Đang lưu…':'Lưu' }}</button>
      </template>
    </AdminDrawer>
  </div>
</template>
