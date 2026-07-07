<!-- Trang: Quản Lý Sản Phẩm (danh sách + form thêm/sửa) -->
<script setup>
import {
  productSearch, filterCategory, db, openProductForm, filteredProducts,
  formatPrice, deleteItem, productFormOpen, closeProductForm, productForm,
  collectionsOfBrand, colorDraft, addColor, removeColor, sizeDraft, addSize,
  removeSize, generateVariants, saveProduct
} from '../adminStore'
</script>

<template>
  <!-- DANH SÁCH -->
  <div v-if="!productFormOpen" class="fade-in">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
      <div class="input-group bg-white rounded-3 shadow-sm" style="max-width:320px;"><span class="input-group-text bg-white border-0"><i class="bi bi-search text-secondary"></i></span><input v-model="productSearch" type="text" class="form-control border-0" placeholder="Tìm sản phẩm..."></div>
      <div class="d-flex gap-2">
        <select v-model="filterCategory" class="form-select form-select-sm rounded-3 shadow-sm" style="width:auto;"><option value="">Tất cả danh mục</option><option v-for="c in db.categories" :key="c.id" :value="c.id" v-text="c.name"></option></select>
        <button @click="openProductForm()" class="btn btn-dark btn-sm rounded-3 fw-bold shadow-sm px-3"><i class="bi bi-plus-lg me-1"></i> Thêm Sản Phẩm</button>
      </div>
    </div>
    <div class="bg-white rounded-4 shadow-sm p-0 overflow-hidden">
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead><tr class="text-secondary small text-uppercase"><th class="ps-4">Sản Phẩm</th><th>Danh Mục</th><th>Thương Hiệu</th><th class="text-end">Giá</th><th>Trạng Thái</th><th class="text-end pe-4">Hành Động</th></tr></thead>
          <tbody>
            <tr v-for="p in filteredProducts" :key="p.id">
              <td class="ps-4"><div class="d-flex align-items-center gap-3"><img :src="p.image_url || 'https://via.placeholder.com/44'" class="rounded-3 border" style="width:44px;height:44px;object-fit:cover;" @error="$event.target.src='https://via.placeholder.com/44'"><div><p class="fw-medium mb-0 text-dark small" v-text="p.name"></p><p class="text-secondary mb-0" style="font-size:0.75rem;" v-text="'#' + p.id"></p></div></div></td>
              <td class="small" v-text="p.category"></td>
              <td class="small" v-text="p.brand"></td>
              <td class="text-end fw-medium small" v-text="formatPrice(p.price)"></td>
              <td><span class="badge rounded-pill" :class="p.active ? 'badge-active' : 'bg-secondary-subtle text-secondary'" v-text="p.active ? 'Đang hoạt động' : 'Đã ẩn'"></span></td>
              <td class="text-end pe-4"><button @click="openProductForm(p)" class="btn btn-sm btn-light border rounded-3 me-1"><i class="bi bi-pencil"></i></button><button @click="deleteItem('products', p.id, p.name)" class="btn btn-sm btn-light border rounded-3 text-danger"><i class="bi bi-trash"></i></button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- FORM THÊM/SỬA -->
  <div v-else class="fade-in">
    <div class="d-flex align-items-center gap-2 mb-4">
      <button @click="closeProductForm" class="btn btn-light border rounded-3"><i class="bi bi-arrow-left"></i></button>
      <h5 class="fw-bold mb-0 text-dark" v-text="productForm.id ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'"></h5>
    </div>
    <div class="row g-4">
      <div class="col-lg-7">
        <div class="bg-white rounded-4 shadow-sm p-4 mb-4">
          <h6 class="fw-bold mb-3 text-dark">Thông Tin Sản Phẩm</h6>
          <div class="mb-3"><label class="form-label small fw-medium">Tên sản phẩm</label><input v-model="productForm.name" type="text" class="form-control rounded-3" placeholder="Ví dụ: Giày Sneaker Classic"></div>
          <div class="mb-3"><label class="form-label small fw-medium">Mô tả</label><textarea v-model="productForm.description" rows="3" class="form-control rounded-3" placeholder="Mô tả chi tiết sản phẩm..."></textarea></div>
          <div class="row g-3">
            <div class="col-md-6"><label class="form-label small fw-medium">Danh mục</label><select v-model="productForm.category_id" class="form-select rounded-3"><option value="">-- Chọn --</option><option v-for="c in db.categories" :key="c.id" :value="c.id" v-text="c.name"></option></select></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Thương hiệu</label><select v-model="productForm.brand_id" class="form-select rounded-3"><option value="">-- Chọn --</option><option v-for="b in db.brands" :key="b.id" :value="b.id" v-text="b.name"></option></select></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Bộ sưu tập</label><select v-model="productForm.collection_id" class="form-select rounded-3"><option value="">-- Chọn --</option><option v-for="col in collectionsOfBrand" :key="col.id" :value="col.id" v-text="col.name"></option></select></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Chất liệu</label><input v-model="productForm.upper_material" type="text" class="form-control rounded-3" placeholder="Ví dụ: Da tổng hợp"></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Giá bán (VNĐ)</label><input v-model.number="productForm.price" type="number" class="form-control rounded-3"></div>
            <div class="col-md-6"><label class="form-label small fw-medium">Giá khuyến mãi (VNĐ)</label><input v-model.number="productForm.sale_price" type="number" class="form-control rounded-3"></div>
          </div>
        </div>

        <div class="bg-white rounded-4 shadow-sm p-4">
          <h6 class="fw-bold mb-3 text-dark">Màu Sắc &amp; Kích Cỡ</h6>
          <label class="form-label small fw-medium">Màu sắc</label>
          <div class="d-flex flex-wrap gap-2 mb-2">
            <span v-for="(c, i) in productForm.colors" :key="i" class="color-swatch d-flex align-items-center gap-2"><span class="color-dot" :style="{ background: c.hex }"></span><span v-text="c.name"></span><i class="bi bi-x-circle-fill swatch-remove" @click="removeColor(i)"></i></span>
          </div>
          <div class="d-flex gap-2 mb-3"><input v-model="colorDraft.name" type="text" class="form-control form-control-sm rounded-3" placeholder="Tên màu (Ví dụ: Hồng)" style="max-width:180px;"><input v-model="colorDraft.hex" type="color" class="form-control form-control-sm form-control-color"><button @click="addColor" class="btn btn-sm btn-dark rounded-3">Thêm màu</button></div>
          <label class="form-label small fw-medium">Kích cỡ</label>
          <div class="d-flex flex-wrap gap-2 mb-2">
            <span v-for="(s, i) in productForm.sizes" :key="i" class="color-swatch d-flex align-items-center gap-2"><span v-text="s"></span><i class="bi bi-x-circle-fill swatch-remove" @click="removeSize(i)"></i></span>
          </div>
          <div class="d-flex gap-2 mb-3"><input v-model="sizeDraft" type="text" class="form-control form-control-sm rounded-3" placeholder="Ví dụ: M, L, 40, 41" style="max-width:180px;"><button @click="addSize" class="btn btn-sm btn-dark rounded-3">Thêm size</button></div>
          <button @click="generateVariants" class="btn btn-sm btn-outline-dark rounded-3 mb-3"><i class="bi bi-magic me-1"></i> Tạo biến thể từ màu × size</button>
          <div v-if="productForm.variants.length" class="table-responsive border rounded-3">
            <table class="table table-sm mb-0 align-middle">
              <thead><tr class="text-secondary small text-uppercase"><th class="ps-3">Màu</th><th>Size</th><th>SKU</th><th class="text-end">Tồn kho</th><th></th></tr></thead>
              <tbody>
                <tr v-for="(v, i) in productForm.variants" :key="i">
                  <td class="ps-3"><span class="color-dot me-1" :style="{ background: v.hex }"></span><span v-text="v.color"></span></td>
                  <td v-text="v.size"></td>
                  <td><input v-model="v.sku" type="text" class="form-control form-control-sm" style="min-width:120px;"></td>
                  <td class="text-end" style="width:110px;"><input v-model.number="v.stock" type="number" class="form-control form-control-sm text-end"></td>
                  <td><button @click="productForm.variants.splice(i,1)" class="btn btn-sm btn-link text-danger p-0"><i class="bi bi-trash"></i></button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="col-lg-5">
        <div class="bg-white rounded-4 shadow-sm p-4 mb-4">
          <h6 class="fw-bold mb-3 text-dark">Ảnh Sản Phẩm</h6>
          <div class="border rounded-3 d-flex align-items-center justify-content-center mb-3 bg-light-gray" style="height:200px;overflow:hidden;"><img v-if="productForm.image_url" :src="productForm.image_url" style="max-height:100%;max-width:100%;object-fit:contain;"><span v-else class="text-secondary small text-center"><i class="bi bi-image fs-1 d-block opacity-50"></i>Chưa có ảnh</span></div>
          <input v-model="productForm.image_url" type="text" class="form-control form-control-sm rounded-3" placeholder="Dán URL ảnh...">
        </div>
        <div class="bg-white rounded-4 shadow-sm p-4">
          <div class="d-flex justify-content-between align-items-center mb-3"><h6 class="fw-bold mb-0 text-dark">Trạng Thái</h6><span class="badge rounded-pill" :class="productForm.active ? 'badge-active' : 'bg-secondary-subtle text-secondary'" v-text="productForm.active ? 'Đang hoạt động' : 'Đã ẩn'"></span></div>
          <div class="form-check form-switch mb-2"><input v-model="productForm.active" class="form-check-input" type="checkbox" id="activeSwitch"><label class="form-check-label small" for="activeSwitch">Hiển thị trên cửa hàng</label></div>
          <div class="form-check form-switch"><input v-model="productForm.is_featured" class="form-check-input" type="checkbox" id="featSwitch"><label class="form-check-label small" for="featSwitch">Sản phẩm nổi bật</label></div>
        </div>
        <button @click="saveProduct" class="btn btn-dark w-100 rounded-3 fw-bold py-2 mt-4 shadow-sm"><i class="bi bi-check2-circle me-2"></i> Lưu Sản Phẩm</button>
      </div>
    </div>
  </div>
</template>
