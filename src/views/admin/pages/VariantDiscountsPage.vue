<!-- Trang: Giảm Giá Biến Thể Màu -->
<script setup>
import { variantDiscountDraft, db, colorsOfProduct, saveVariantDiscount, getProductName, deleteItem } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="row g-4">
      <div class="col-lg-5">
        <div class="bg-white rounded-4 shadow-sm p-4">
          <h6 class="fw-bold mb-3 text-dark">Thêm Giảm Giá Theo Màu</h6>
          <div class="mb-3"><label class="form-label small fw-medium">Sản phẩm</label><select v-model="variantDiscountDraft.product_id" class="form-select rounded-3"><option value="">-- Chọn sản phẩm --</option><option v-for="p in db.products" :key="p.id" :value="p.id" v-text="p.name"></option></select></div>
          <div class="mb-3"><label class="form-label small fw-medium">Màu (tùy chọn)</label><select v-model="variantDiscountDraft.color" class="form-select rounded-3"><option value="">Tất cả màu</option><option v-for="c in colorsOfProduct" :key="c" :value="c" v-text="c"></option></select></div>
          <div class="mb-3"><label class="form-label small fw-medium">Phần trăm giảm (%)</label><input v-model.number="variantDiscountDraft.percent" type="number" class="form-control rounded-3"></div>
          <button @click="saveVariantDiscount" class="btn btn-dark w-100 rounded-3 fw-bold">Lưu Giảm Giá</button>
        </div>
      </div>
      <div class="col-lg-7">
        <div class="bg-white rounded-4 shadow-sm overflow-hidden"><div class="table-responsive"><table class="table align-middle mb-0">
          <thead><tr class="text-secondary small text-uppercase"><th class="ps-4">Sản Phẩm</th><th>Màu</th><th class="text-center">Giảm</th><th class="text-end pe-4"></th></tr></thead>
          <tbody>
            <tr v-if="db.variantDiscounts.length === 0"><td colspan="4" class="text-center text-secondary py-4">Chưa có giảm giá biến thể nào.</td></tr>
            <tr v-for="vd in db.variantDiscounts" :key="vd.id">
              <td class="ps-4 fw-medium small" v-text="getProductName(vd.product_id)"></td>
              <td class="small" v-text="vd.color || 'Tất cả'"></td>
              <td class="text-center" v-text="vd.percent + '%'"></td>
              <td class="text-end pe-4"><button @click="deleteItem('variantDiscounts', vd.id, getProductName(vd.product_id))" class="btn btn-sm btn-light border rounded-3 text-danger"><i class="bi bi-trash"></i></button></td>
            </tr>
          </tbody>
        </table></div></div>
      </div>
    </div>
  </div>
</template>
