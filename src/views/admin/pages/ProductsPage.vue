<!-- Trang: Quản Lý Sản Phẩm (danh sách + form thêm/sửa) -->
<script setup>
import {
  productSearch,
  filterCategory,
  db,
  openProductForm,
  filteredProducts,
  formatPrice,
  deleteItem,
  restoreItem,
  deleteProduct,
  isProductSoftDeleted,
  onProductImageFile,
  colorImageDraft,
  onColorDraftImageFile,
  activeCategories,
  SHOE_SIZES,
  productFormOpen,
  closeProductForm,
  productForm,
  colorDraft,
  colorNoteDraft,
  addColor,
  removeColor,
  toggleColorSize,
  colorHasSize,
  colorHex,
  saveProduct,
  productDetailModal,
  openProductDetail,
  closeProductDetail,
  productVariants,
  productVariantCount,
  productStockTotal,
  getMaterialName,
  getBrandName,
  LOW_STOCK_THRESHOLD,
  productFormVariantCount,
  productFormStockTotal,
  productFormColorCount,
  colorStockTotal,
} from "../adminStore";
</script>

<template>
  <!-- DANH SÁCH -->
  <div v-if="!productFormOpen" class="fade-in">
    <div
      class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4"
    >
      <div
        class="input-group bg-white rounded-3 shadow-sm"
        style="max-width: 320px"
      >
        <span class="input-group-text bg-white border-0"
          ><i class="bi bi-search text-secondary"></i></span
        ><input
          v-model="productSearch"
          type="text"
          class="form-control border-0"
          placeholder="Tìm sản phẩm..."
        />
      </div>
      <div class="d-flex gap-2">
        <select
          v-model="filterCategory"
          class="form-select form-select-sm rounded-3 shadow-sm"
          style="width: auto"
        >
          <option value="">Tất cả danh mục</option>
          <option
            v-for="c in activeCategories"
            :key="c.id"
            :value="c.id"
            v-text="c.name"
          ></option>
        </select>
        <button
          @click="openProductForm()"
          class="btn btn-dark btn-sm rounded-3 fw-bold shadow-sm px-3"
        >
          <i class="bi bi-plus-lg me-1"></i> Thêm Sản Phẩm
        </button>
      </div>
    </div>
    <div class="bg-white rounded-4 shadow-sm p-0 overflow-hidden">
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead>
            <tr class="text-secondary small text-uppercase">
              <th class="ps-4">STT</th>
              <th>Tên Sản Phẩm</th>
              <th>Mô Tả</th>
              <th>Thương Hiệu</th>
              <th>Chất Liệu</th>
              <th class="text-center">Số Biến Thể</th>
              <th class="text-center">Tổng Sản Phẩm</th>
              <th>Trạng Thái</th>
              <th class="text-end pe-4">Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, idx) in filteredProducts" :key="p.id">
              <td class="ps-4 text-secondary small" v-text="idx + 1"></td>
              <td>
                <div class="d-flex align-items-center gap-3">
                  <img
                    :src="p.image_url || 'https://via.placeholder.com/44'"
                    class="rounded-3 border"
                    style="width: 44px; height: 44px; object-fit: cover"
                    @error="
                      $event.target.src = 'https://via.placeholder.com/44'
                    "
                  />
                  <div>
                    <p
                      class="fw-medium mb-0 text-dark small"
                      v-text="p.name"
                    ></p>
                    <p
                      class="text-secondary mb-0"
                      style="font-size: 0.75rem"
                      v-text="'#' + p.id"
                    ></p>
                  </div>
                </div>
              </td>
              <td
                class="small text-secondary text-truncate"
                style="max-width: 240px"
                v-text="p.description || '—'"
              ></td>
              <td class="small" v-text="p.brand || '—'"></td>
              <td class="small" v-text="getMaterialName(p.material_id)"></td>
              <td class="text-center">
                <span
                  class="badge rounded-pill bg-secondary-subtle text-secondary"
                  v-text="productVariantCount(p.id)"
                ></span>
              </td>
              <td class="text-center">
                <span
                  class="badge rounded-pill"
                  :class="
                    productStockTotal(p.id) <= 0
                      ? 'bg-danger-subtle text-danger'
                      : productStockTotal(p.id) <= LOW_STOCK_THRESHOLD
                        ? 'bg-warning-subtle text-warning-emphasis'
                        : 'bg-secondary-subtle text-secondary'
                  "
                  v-text="productStockTotal(p.id)"
                ></span>
              </td>
              <td>
                <span
                  class="badge rounded-pill"
                  :class="
                    p.active ? 'badge-active' : 'bg-danger-subtle text-danger'
                  "
                  v-text="p.active ? 'Đang hoạt động' : 'Đã xoá mềm (ẩn)'"
                ></span>
              </td>
              <td class="text-end pe-4">
                <button
                  @click="openProductForm(p)"
                  class="btn btn-sm btn-light border rounded-3 me-1"
                >
                  <i class="bi bi-pencil"></i></button
                ><button
                  v-if="isProductSoftDeleted(p)"
                  @click="restoreItem('products', p)"
                  class="btn btn-sm btn-light border border-success text-success rounded-3 me-1"
                  title="Khôi phục sản phẩm"
                >
                  <i class="bi bi-arrow-counterclockwise"></i></button
                ><button
                  @click="deleteProduct(p)"
                  class="btn btn-sm btn-light border rounded-3"
                  :class="
                    isProductSoftDeleted(p)
                      ? 'text-danger fw-bold border-danger'
                      : 'text-danger'
                  "
                  :title="
                    isProductSoftDeleted(p)
                      ? 'Bấm để XOÁ CỨNG vĩnh viễn'
                      : 'Bấm để xoá mềm (ẩn)'
                  "
                >
                  <i
                    class="bi"
                    :class="
                      isProductSoftDeleted(p) ? 'bi-trash-fill' : 'bi-trash'
                    "
                  ></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- FORM THÊM/SỬA -->
  <div v-else class="fade-in">
    <div class="d-flex align-items-center gap-2 mb-4">
      <button @click="closeProductForm" class="btn btn-light border rounded-3">
        <i class="bi bi-arrow-left"></i>
      </button>
      <h5
        class="fw-bold mb-0 text-dark"
        v-text="productForm.id ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'"
      ></h5>
    </div>
    <div class="row g-4">
      <div class="col-lg-7">
        <div class="bg-white rounded-4 shadow-sm p-4 mb-4">
          <h6 class="fw-bold mb-3 text-dark">Thông Tin Sản Phẩm</h6>
          <div class="mb-3">
            <label class="form-label small fw-medium">Tên sản phẩm</label
            ><input
              v-model="productForm.name"
              type="text"
              class="form-control rounded-3"
              placeholder="Ví dụ: Giày Sneaker Classic"
            />
          </div>
          <div class="mb-3">
            <label class="form-label small fw-medium">Mô tả</label
            ><textarea
              v-model="productForm.description"
              rows="3"
              class="form-control rounded-3"
              placeholder="Mô tả chi tiết sản phẩm..."
            ></textarea>
          </div>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label small fw-medium">Danh mục</label
              ><select
                v-model="productForm.category_id"
                class="form-select rounded-3"
              >
                <option value="">-- Chọn --</option>
                <option
                  v-for="c in activeCategories"
                  :key="c.id"
                  :value="c.id"
                  v-text="c.name"
                ></option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-medium">Thương hiệu</label
              ><select
                v-model="productForm.brand_id"
                class="form-select rounded-3"
              >
                <option value="">-- Chọn --</option>
                <option
                  v-for="b in db.brands"
                  :key="b.id"
                  :value="b.id"
                  v-text="b.name"
                ></option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-medium">Chất liệu</label
              ><select
                v-model="productForm.material_id"
                class="form-select rounded-3"
              >
                <option value="">-- Chọn --</option>
                <option
                  v-for="m in db.materials"
                  :key="m.id"
                  :value="m.id"
                  v-text="m.name"
                ></option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-medium">Giá bán (VNĐ)</label
              ><input
                v-model.number="productForm.price"
                type="number"
                class="form-control rounded-3"
              />
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-medium"
                >Giá khuyến mãi (VNĐ)</label
              ><input
                v-model.number="productForm.sale_price"
                type="number"
                class="form-control rounded-3"
              />
            </div>
          </div>
        </div>

        <div class="bg-white rounded-4 shadow-sm p-4">
          <h6 class="fw-bold mb-3 text-dark">Màu Sắc &amp; Kích Cỡ</h6>

          <!-- TONG HOP: tach theo bien the -->
          <div class="d-flex flex-wrap gap-2 mb-3">
            <span
              class="badge rounded-pill bg-dark-subtle text-dark border px-3 py-2"
            >
              <i class="bi bi-palette me-1"></i>Số màu:
              <b v-text="productFormColorCount"></b>
            </span>
            <span
              class="badge rounded-pill bg-primary-subtle text-primary-emphasis border px-3 py-2"
            >
              <i class="bi bi-diagram-3 me-1"></i>Số biến thể:
              <b v-text="productFormVariantCount"></b>
            </span>
            <span
              class="badge rounded-pill bg-success-subtle text-success-emphasis border px-3 py-2"
            >
              <i class="bi bi-box-seam me-1"></i>Tổng sản phẩm (tồn kho):
              <b v-text="productFormStockTotal"></b>
            </span>
          </div>

          <!-- MAU SAC: moi mau kem 1 anh -->
          <label class="form-label small fw-medium"
            >Màu sắc (mỗi màu kèm 1 ảnh)</label
          >
          <p class="text-secondary mb-2" style="font-size: 0.75rem">
            Khi khách đổi màu ở cửa hàng, ảnh sản phẩm sẽ đổi theo màu đó.
          </p>
          <div class="d-flex flex-column gap-2 mb-2">
            <div
              v-for="(c, i) in productForm.colors"
              :key="i"
              class="border rounded-3 p-3"
            >
              <div class="d-flex align-items-center gap-3">
                <img
                  :src="c.image || 'https://via.placeholder.com/44'"
                  class="rounded-2 border"
                  style="width: 44px; height: 44px; object-fit: cover"
                  @error="$event.target.src = 'https://via.placeholder.com/44'"
                />
                <span class="color-dot" :style="{ background: c.hex }"></span>
                <span class="small fw-medium" v-text="c.name"></span>
                <span
                  class="badge rounded-pill bg-light text-secondary border fw-normal"
                  v-text="
                    (c.variants ? c.variants.length : 0) +
                    ' size · ' +
                    colorStockTotal(c) +
                    ' sp'
                  "
                ></span>
                <span
                  v-if="c.note"
                  class="badge rounded-pill bg-light text-secondary border fw-normal"
                  v-text="c.note"
                ></span>
                <span v-else class="text-secondary small fst-italic"
                  >(không có chú thích)</span
                >
                <button
                  @click="removeColor(i)"
                  class="btn btn-sm btn-link text-danger p-0 ms-auto"
                  title="Bỏ màu"
                >
                  <i class="bi bi-x-circle-fill"></i>
                </button>
              </div>
              <div class="mt-2 pt-2 border-top">
                <label class="form-label small fw-medium mb-1"
                  >Kích cỡ &amp; số lượng cho màu này</label
                >
                <div class="d-flex flex-wrap gap-1 mb-2">
                  <button
                    v-for="s in SHOE_SIZES"
                    :key="s"
                    type="button"
                    @click="toggleColorSize(i, s)"
                    class="btn btn-sm rounded-3"
                    :class="colorHasSize(c, s) ? 'btn-dark' : 'btn-outline-secondary'"
                    v-text="s"
                  ></button>
                </div>
                <div v-if="c.variants && c.variants.length" class="row g-2">
                  <div
                    v-for="(sv, si) in c.variants"
                    :key="si"
                    class="col-6 col-sm-4 col-md-3"
                  >
                    <div class="input-group input-group-sm">
                      <span
                        class="input-group-text"
                        v-text="'Size ' + sv.size"
                      ></span>
                      <input
                        v-model.number="sv.stock"
                        type="number"
                        min="0"
                        class="form-control text-end"
                        placeholder="SL"
                      />
                    </div>
                  </div>
                </div>
                <span v-else class="text-secondary small fst-italic"
                  >Chọn size ở trên rồi nhập số lượng.</span
                >
              </div>
            </div>
            <span
              v-if="!productForm.colors.length"
              class="text-secondary small fst-italic"
              >Chưa có màu nào.</span
            >
          </div>

          <!-- 1 KHUNG: them mau + anh -->
          <div class="border rounded-3 p-3 mb-3 bg-light-gray">
            <div class="row g-2 align-items-end">
              <div class="col-12 col-sm-3">
                <label class="form-label small fw-medium mb-1">Màu</label>
                <select
                  v-model="colorDraft"
                  class="form-select form-select-sm rounded-3"
                >
                  <option value="">-- Chọn màu --</option>
                  <option
                    v-for="c in db.colors"
                    :key="c.id"
                    :value="c.id"
                    v-text="c.name"
                  ></option>
                </select>
              </div>
              <div class="col-12 col-sm-4">
                <label class="form-label small fw-medium mb-1"
                  >Ảnh của màu</label
                >
                <div class="d-flex align-items-center gap-2">
                  <img
                    :src="colorImageDraft || 'https://via.placeholder.com/40'"
                    class="rounded-2 border"
                    style="width: 40px; height: 40px; object-fit: cover"
                    @error="
                      $event.target.src = 'https://via.placeholder.com/40'
                    "
                  />
                  <input
                    v-model="colorImageDraft"
                    type="text"
                    class="form-control form-control-sm rounded-3"
                    placeholder="URL ảnh..."
                  />
                  <label
                    class="btn btn-sm btn-outline-dark rounded-3 mb-0"
                    title="Chọn ảnh trên máy"
                    ><i class="bi bi-upload"></i
                    ><input
                      type="file"
                      accept="image/*"
                      class="d-none"
                      @change="onColorDraftImageFile"
                  /></label>
                </div>
              </div>
              <div class="col-12 col-sm-3">
                <label class="form-label small fw-medium mb-1"
                  >Chú thích (không bắt buộc)</label
                >
                <input
                  v-model="colorNoteDraft"
                  type="text"
                  class="form-control form-control-sm rounded-3"
                  placeholder="VD: Đỏ đô, Trắng kem..."
                />
              </div>
              <div class="col-12 col-sm-2 d-grid">
                <button @click="addColor" class="btn btn-sm btn-dark rounded-3">
                  Thêm màu
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div class="col-lg-5">
        <div class="bg-white rounded-4 shadow-sm p-4 mb-4">

        </div>
        <div class="bg-white rounded-4 shadow-sm p-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="fw-bold mb-0 text-dark">Trạng Thái</h6>
            <span
              class="badge rounded-pill"
              :class="
                productForm.active
                  ? 'badge-active'
                  : 'bg-secondary-subtle text-secondary'
              "
              v-text="productForm.active ? 'Đang hoạt động' : 'Đã ẩn'"
            ></span>
          </div>
          <div class="form-check form-switch mb-2">
            <input
              v-model="productForm.active"
              class="form-check-input"
              type="checkbox"
              id="activeSwitch"
            /><label class="form-check-label small" for="activeSwitch"
              >Hiển thị trên cửa hàng</label
            >
          </div>
          <div class="form-check form-switch">
            <input
              v-model="productForm.is_featured"
              class="form-check-input"
              type="checkbox"
              id="featSwitch"
            /><label class="form-check-label small" for="featSwitch"
              >Sản phẩm nổi bật</label
            >
          </div>
        </div>
        <button
          @click="saveProduct"
          class="btn btn-dark w-100 rounded-3 fw-bold py-2 mt-4 shadow-sm"
        >
          <i class="bi bi-check2-circle me-2"></i> Lưu Sản Phẩm
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL CHI TIẾT SẢN PHẨM (đầy đủ thuộc tính) -->
  <div
    v-if="productDetailModal.open"
    class="custom-modal-overlay"
    @click.self="closeProductDetail"
  >
    <div class="custom-modal-box fade-in-scale" style="max-width: 760px">
      <div v-if="productDetailModal.product">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div class="d-flex gap-3">
            <img
              :src="
                productDetailModal.product.image_url ||
                'https://via.placeholder.com/72'
              "
              class="rounded-3 border"
              style="width: 72px; height: 72px; object-fit: cover"
              @error="$event.target.src = 'https://via.placeholder.com/72'"
            />
            <div>
              <h5
                class="fw-bold mb-1 text-dark"
                v-text="productDetailModal.product.name"
              ></h5>
              <p
                class="text-secondary small mb-1"
                v-text="
                  '#' +
                  productDetailModal.product.id +
                  ' · SKU: ' +
                  (productDetailModal.product.parent_sku || '—')
                "
              ></p>
              <span
                class="badge rounded-pill"
                :class="
                  productDetailModal.product.active
                    ? 'badge-active'
                    : 'bg-secondary-subtle text-secondary'
                "
                v-text="
                  productDetailModal.product.active ? 'Đang hoạt động' : 'Đã ẩn'
                "
              ></span>
              <span
                v-if="productDetailModal.product.is_featured"
                class="badge rounded-pill bg-warning-subtle text-warning-emphasis ms-1"
                >Nổi bật</span
              >
            </div>
          </div>
          <button
            @click="closeProductDetail"
            class="btn btn-light border rounded-3"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="d-flex gap-3 mb-3">
          <div class="bg-light-gray rounded-3 p-2 px-3">
            <p class="text-secondary mb-0" style="font-size: 0.7rem">Giá bán</p>
            <p
              class="fw-bold mb-0"
              v-text="formatPrice(productDetailModal.product.price)"
            ></p>
          </div>
          <div
            v-if="productDetailModal.product.sale_price"
            class="bg-light-gray rounded-3 p-2 px-3"
          >
            <p class="text-secondary mb-0" style="font-size: 0.7rem">Giá KM</p>
            <p
              class="fw-bold mb-0 text-danger"
              v-text="formatPrice(productDetailModal.product.sale_price)"
            ></p>
          </div>
          <div class="bg-light-gray rounded-3 p-2 px-3">
            <p class="text-secondary mb-0" style="font-size: 0.7rem">
              Tổng tồn kho
            </p>
            <p
              class="fw-bold mb-0"
              v-text="productStockTotal(productDetailModal.product.id)"
            ></p>
          </div>
        </div>

        <p
          v-if="productDetailModal.product.description"
          class="small text-secondary"
          v-text="productDetailModal.product.description"
        ></p>

        <h6 class="fw-bold mb-2 text-dark">Thuộc Tính</h6>
        <div class="row g-2 mb-3 small">
          <div class="col-6">
            <span class="text-secondary">Danh mục: </span
            ><span v-text="productDetailModal.product.category || '—'"></span>
          </div>
          <div class="col-6">
            <span class="text-secondary">Thương hiệu: </span
            ><span
              v-text="
                productDetailModal.product.brand ||
                getBrandName(productDetailModal.product.brand_id)
              "
            ></span>
          </div>
          <div class="col-6">
            <span class="text-secondary">Chất liệu: </span
            ><span
              v-text="getMaterialName(productDetailModal.product.material_id)"
            ></span>
          </div>
        </div>

        <h6 class="fw-bold mb-2 text-dark">Biến Thể &amp; Tồn Kho</h6>
        <div class="table-responsive border rounded-3">
          <table class="table table-sm mb-0 align-middle">
            <thead>
              <tr class="text-secondary small text-uppercase">
                <th class="ps-3">Màu</th>
                <th>Size</th>
                <th>SKU</th>
                <th class="text-end pe-3">Tồn</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="v in productVariants(productDetailModal.product.id)"
                :key="v.id"
              >
                <td class="ps-3">
                  <span
                    class="color-dot me-1"
                    :style="{ background: v.color_hex || '#ccc' }"
                  ></span
                  ><span v-text="v.color"></span>
                </td>
                <td v-text="v.size"></td>
                <td class="text-secondary" v-text="v.sku"></td>
                <td
                  class="text-end pe-3 fw-medium"
                  :class="
                    Number(v.stock) <= 0
                      ? 'text-danger'
                      : Number(v.stock) <= LOW_STOCK_THRESHOLD
                        ? 'text-warning-emphasis'
                        : ''
                  "
                  v-text="v.stock"
                ></td>
              </tr>
              <tr v-if="!productVariants(productDetailModal.product.id).length">
                <td colspan="4" class="text-center text-secondary py-3 small">
                  Chưa có biến thể. Thêm màu/size và tạo biến thể trong màn
                  chỉnh sửa.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex justify-content-end gap-2 mt-3">
          <button
            @click="closeProductDetail"
            class="btn btn-white border rounded-3"
          >
            Đóng
          </button>
          <button
            @click="
              openProductForm(productDetailModal.product);
              closeProductDetail();
            "
            class="btn btn-dark rounded-3"
          >
            <i class="bi bi-pencil me-1"></i> Chỉnh sửa
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
