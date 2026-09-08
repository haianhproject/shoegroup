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
      class="flex flex-wrap justify-between items-center gap-2 mb-4"
    >
      <div
        class="flex bg-white rounded-2 shadow-sm"
        style="max-width: 320px"
      >
        <span class="flex items-center bg-white border-0"
          ><i class="icon icon-search text-gray-600"></i></span
        ><input
          v-model="productSearch"
          type="text"
          class="sg-input border-0"
          placeholder="Tìm sản phẩm..."
        />
      </div>
      <div class="flex gap-2">
        <select
          v-model="filterCategory"
          class="sg-input sg-input rounded-2 shadow-sm"
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
          class="btn btn-dark btn-sm rounded-2 font-bold shadow-sm px-3"
        >
          <i class="icon icon-plus-lg mr-1"></i> Thêm Sản Phẩm
        </button>
      </div>
    </div>
    <div class="bg-white rounded-1 shadow-sm p-0 overflow-hidden">
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead>
            <tr class="text-gray-600 text-sm uppercase">
              <th class="pl-4">STT</th>
              <th>Tên Sản Phẩm</th>
              <th>Mô Tả</th>
              <th>Thương Hiệu</th>
              <th>Chất Liệu</th>
              <th class="text-center">Số Biến Thể</th>
              <th class="text-center">Tổng Sản Phẩm</th>
              <th>Trạng Thái</th>
              <th class="text-end pr-4">Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, idx) in filteredProducts" :key="p.id">
              <td class="pl-4 text-gray-600 text-sm" v-text="idx + 1"></td>
              <td>
                <div class="flex items-center gap-3">
                  <img
                    :src="p.image_url || 'https://via.placeholder.com/44'"
                    class="rounded-2 border"
                    style="width: 44px; height: 44px; object-fit: cover"
                    @error="
                      $event.target.src = 'https://via.placeholder.com/44'
                    "
                  />
                  <div>
                    <p
                      class="font-medium mb-0 text-gray-900 text-sm"
                      v-text="p.name"
                    ></p>
                    <p
                      class="text-gray-600 mb-0"
                      style="font-size: 0.75rem"
                      v-text="'#' + p.id"
                    ></p>
                  </div>
                </div>
              </td>
              <td
                class="text-sm text-gray-600 text-truncate"
                style="max-width: 240px"
                v-text="p.description || '—'"
              ></td>
              <td class="text-sm" v-text="p.brand || '—'"></td>
              <td class="text-sm" v-text="getMaterialName(p.material_id)"></td>
              <td class="text-center">
                <span
                  class="badge rounded-1 bg-secondary-subtle text-gray-600"
                  v-text="productVariantCount(p.id)"
                ></span>
              </td>
              <td class="text-center">
                <span
                  class="badge rounded-1"
                  :class="
                    productStockTotal(p.id) <= 0
                      ? 'bg-red-100 text-red-600'
                      : productStockTotal(p.id) <= LOW_STOCK_THRESHOLD
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-secondary-subtle text-gray-600'
                  "
                  v-text="productStockTotal(p.id)"
                ></span>
              </td>
              <td>
                <span
                  class="badge rounded-1"
                  :class="
                    p.active ? 'badge-active' : 'bg-red-100 text-red-600'
                  "
                  v-text="p.active ? 'Đang hoạt động' : 'Đã xoá mềm (ẩn)'"
                ></span>
              </td>
              <td class="text-end pr-4">
                <button
                  @click="openProductForm(p)"
                  class="btn btn-sm btn-light border rounded-2 mr-1"
                >
                  <i class="icon icon-pencil"></i></button
                ><button
                  v-if="isProductSoftDeleted(p)"
                  @click="restoreItem('products', p)"
                  class="btn btn-sm btn-light border border-success text-green-600 rounded-2 mr-1"
                  title="Khôi phục sản phẩm"
                >
                  <i class="icon icon-arrow-counterclockwise"></i></button
                ><button
                  @click="deleteProduct(p)"
                  class="btn btn-sm btn-light border rounded-2"
                  :class="
                    isProductSoftDeleted(p)
                      ? 'text-red-600 font-bold border-danger'
                      : 'text-red-600'
                  "
                  :title="
                    isProductSoftDeleted(p)
                      ? 'Bấm để XOÁ CỨNG vĩnh viễn'
                      : 'Bấm để xoá mềm (ẩn)'
                  "
                >
                  <i
                    class="icon"
                    :class="
                      isProductSoftDeleted(p) ? 'icon-trash-fill' : 'icon-trash'
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
    <div class="flex items-center gap-2 mb-4">
      <button @click="closeProductForm" class="btn btn-light border rounded-2">
        <i class="icon icon-arrow-left"></i>
      </button>
      <h5
        class="font-bold mb-0 text-gray-900"
        v-text="productForm.id ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'"
      ></h5>
    </div>
    <div class="grid grid-cols-12 gap-4">
      <div class="lg:col-span-7">
        <div class="bg-white rounded-1 shadow-sm p-4 mb-4">
          <h6 class="font-bold mb-3 text-gray-900">Thông Tin Sản Phẩm</h6>
          <div class="mb-3">
            <label class="block text-sm font-medium text-sm font-medium">Tên sản phẩm</label
            ><input
              v-model="productForm.name"
              type="text"
              class="sg-input rounded-2"
              placeholder="Ví dụ: Giày Sneaker Classic"
            />
          </div>
          <div class="mb-3">
            <label class="block text-sm font-medium text-sm font-medium">Mô tả</label
            ><textarea
              v-model="productForm.description"
              rows="3"
              class="sg-input rounded-2"
              placeholder="Mô tả chi tiết sản phẩm..."
            ></textarea>
          </div>
          <div class="grid grid-cols-12 gap-3">
            <div class="md:col-span-6">
              <label class="block text-sm font-medium text-sm font-medium">Danh mục</label
              ><select
                v-model="productForm.category_id"
                class="sg-input rounded-2"
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
            <div class="md:col-span-6">
              <label class="block text-sm font-medium text-sm font-medium">Thương hiệu</label
              ><select
                v-model="productForm.brand_id"
                class="sg-input rounded-2"
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
            <div class="md:col-span-6">
              <label class="block text-sm font-medium text-sm font-medium">Chất liệu</label
              ><select
                v-model="productForm.material_id"
                class="sg-input rounded-2"
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
            <div class="md:col-span-6">
              <label class="block text-sm font-medium text-sm font-medium">Giá bán (VNĐ)</label
              ><input
                v-model.number="productForm.price"
                type="number"
                class="sg-input rounded-2"
              />
            </div>
            <div class="md:col-span-6">
              <label class="block text-sm font-medium text-sm font-medium"
                >Giá khuyến mãi (VNĐ)</label
              ><input
                v-model.number="productForm.sale_price"
                type="number"
                class="sg-input rounded-2"
              />
            </div>
          </div>
        </div>

        <div class="bg-white rounded-1 shadow-sm p-4">
          <h6 class="font-bold mb-3 text-gray-900">Màu Sắc &amp; Kích Cỡ</h6>

          <!-- TONG HOP: tach theo bien the -->
          <div class="flex flex-wrap gap-2 mb-3">
            <span
              class="badge rounded-1 bg-dark-subtle text-gray-900 border px-3 py-2"
            >
              <i class="icon icon-palette mr-1"></i>Số màu:
              <b v-text="productFormColorCount"></b>
            </span>
            <span
              class="badge rounded-1 bg-gray-100 text-gray-900 border px-3 py-2"
            >
              <i class="icon icon-diagram-3 mr-1"></i>Số biến thể:
              <b v-text="productFormVariantCount"></b>
            </span>
            <span
              class="badge rounded-1 bg-gray-100 text-gray-900 border px-3 py-2"
            >
              <i class="icon icon-box-seam mr-1"></i>Tổng sản phẩm (tồn kho):
              <b v-text="productFormStockTotal"></b>
            </span>
          </div>

          <!-- MAU SAC: moi mau kem 1 anh -->
          <label class="block text-sm font-medium text-sm font-medium"
            >Màu sắc (mỗi màu kèm 1 ảnh)</label
          >
          <p class="text-gray-600 mb-2" style="font-size: 0.75rem">
            Khi khách đổi màu ở cửa hàng, ảnh sản phẩm sẽ đổi theo màu đó.
          </p>
          <div class="flex flex-col gap-2 mb-2">
            <div
              v-for="(c, i) in productForm.colors"
              :key="i"
              class="border rounded-2 p-3"
            >
              <div class="flex items-center gap-3">
                <img
                  :src="c.image || 'https://via.placeholder.com/44'"
                  class="rounded-2 border"
                  style="width: 44px; height: 44px; object-fit: cover"
                  @error="$event.target.src = 'https://via.placeholder.com/44'"
                />
                <span class="color-dot" :style="{ background: c.hex }"></span>
                <span class="text-sm font-medium" v-text="c.name"></span>
                <span
                  class="badge rounded-1 bg-gray-100 text-gray-600 border font-normal"
                  v-text="
                    (c.variants ? c.variants.length : 0) +
                    ' size · ' +
                    colorStockTotal(c) +
                    ' sp'
                  "
                ></span>
                <span
                  v-if="c.note"
                  class="badge rounded-1 bg-gray-100 text-gray-600 border font-normal"
                  v-text="c.note"
                ></span>
                <span v-else class="text-gray-600 text-sm fst-italic"
                  >(không có chú thích)</span
                >
                <button
                  @click="removeColor(i)"
                  class="btn btn-sm btn-link text-red-600 p-0 ml-auto"
                  title="Bỏ màu"
                >
                  <i class="icon icon-x-circle-fill"></i>
                </button>
              </div>
              <div class="mt-2 pt-2 border-t">
                <label class="block text-sm font-medium text-sm font-medium mb-1"
                  >Kích cỡ &amp; số lượng cho màu này</label
                >
                <div class="flex flex-wrap gap-1 mb-2">
                  <button
                    v-for="s in SHOE_SIZES"
                    :key="s"
                    type="button"
                    @click="toggleColorSize(i, s)"
                    class="btn btn-sm rounded-2"
                    :class="colorHasSize(c, s) ? 'btn-dark' : 'btn-outline-secondary'"
                    v-text="s"
                  ></button>
                </div>
                <div v-if="c.variants && c.variants.length" class="grid grid-cols-12 gap-2">
                  <div
                    v-for="(sv, si) in c.variants"
                    :key="si"
                    class="col-span-6 sm:col-span-4 md:col-span-3"
                  >
                    <div class="flex input-group-sm">
                      <span
                        class="flex items-center"
                        v-text="'Size ' + sv.size"
                      ></span>
                      <input
                        v-model.number="sv.stock"
                        type="number"
                        min="0"
                        class="sg-input text-end"
                        placeholder="SL"
                      />
                    </div>
                  </div>
                </div>
                <span v-else class="text-gray-600 text-sm fst-italic"
                  >Chọn size ở trên rồi nhập số lượng.</span
                >
              </div>
            </div>
            <span
              v-if="!productForm.colors.length"
              class="text-gray-600 text-sm fst-italic"
              >Chưa có màu nào.</span
            >
          </div>

          <!-- 1 KHUNG: them mau + anh -->
          <div class="border rounded-2 p-3 mb-3 bg-light-gray">
            <div class="grid grid-cols-12 gap-2 items-end">
              <div class="col-span-12 sm:col-span-3">
                <label class="block text-sm font-medium text-sm font-medium mb-1">Màu</label>
                <select
                  v-model="colorDraft"
                  class="sg-input sg-input rounded-2"
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
              <div class="col-span-12 sm:col-span-4">
                <label class="block text-sm font-medium text-sm font-medium mb-1"
                  >Ảnh của màu</label
                >
                <div class="flex items-center gap-2">
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
                    class="sg-input sg-input rounded-2"
                    placeholder="URL ảnh..."
                  />
                  <label
                    class="btn btn-sm btn-outline-dark rounded-2 mb-0"
                    title="Chọn ảnh trên máy"
                    ><i class="icon icon-upload"></i
                    ><input
                      type="file"
                      accept="image/*"
                      class="hidden"
                      @change="onColorDraftImageFile"
                  /></label>
                </div>
              </div>
              <div class="col-span-12 sm:col-span-3">
                <label class="block text-sm font-medium text-sm font-medium mb-1"
                  >Chú thích (không bắt buộc)</label
                >
                <input
                  v-model="colorNoteDraft"
                  type="text"
                  class="sg-input sg-input rounded-2"
                  placeholder="VD: Đỏ đô, Trắng kem..."
                />
              </div>
              <div class="col-span-12 sm:col-span-2 grid">
                <button @click="addColor" class="btn btn-sm btn-dark rounded-2">
                  Thêm màu
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div class="lg:col-span-5">

        <div class="bg-white rounded-1 shadow-sm p-4">
          <div class="flex justify-between items-center mb-3">
            <h6 class="font-bold mb-0 text-gray-900">Trạng Thái</h6>
            <span
              class="badge rounded-1"
              :class="
                productForm.active
                  ? 'badge-active'
                  : 'bg-secondary-subtle text-gray-600'
              "
              v-text="productForm.active ? 'Đang hoạt động' : 'Đã ẩn'"
            ></span>
          </div>
          <div class="flex items-center gap-2 flex items-center mb-2">
            <input
              v-model="productForm.active"
              class="accent-black"
              type="checkbox"
              id="activeSwitch"
            /><label class="text-sm text-sm" for="activeSwitch"
              >Hiển thị trên cửa hàng</label
            >
          </div>
          <div class="flex items-center gap-2 flex items-center">
            <input
              v-model="productForm.is_featured"
              class="accent-black"
              type="checkbox"
              id="featSwitch"
            /><label class="text-sm text-sm" for="featSwitch"
              >Sản phẩm nổi bật</label
            >
          </div>
        </div>
        <button
          @click="saveProduct"
          class="btn btn-dark w-full rounded-2 font-bold py-2 mt-4 shadow-sm"
        >
          <i class="icon icon-check2-circle mr-2"></i> Lưu Sản Phẩm
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
        <div class="flex justify-between items-start mb-3">
          <div class="flex gap-3">
            <img
              :src="
                productDetailModal.product.image_url ||
                'https://via.placeholder.com/72'
              "
              class="rounded-2 border"
              style="width: 72px; height: 72px; object-fit: cover"
              @error="$event.target.src = 'https://via.placeholder.com/72'"
            />
            <div>
              <h5
                class="font-bold mb-1 text-gray-900"
                v-text="productDetailModal.product.name"
              ></h5>
              <p
                class="text-gray-600 text-sm mb-1"
                v-text="
                  '#' +
                  productDetailModal.product.id +
                  ' · SKU: ' +
                  (productDetailModal.product.parent_sku || '—')
                "
              ></p>
              <span
                class="badge rounded-1"
                :class="
                  productDetailModal.product.active
                    ? 'badge-active'
                    : 'bg-secondary-subtle text-gray-600'
                "
                v-text="
                  productDetailModal.product.active ? 'Đang hoạt động' : 'Đã ẩn'
                "
              ></span>
              <span
                v-if="productDetailModal.product.is_featured"
                class="badge rounded-1 bg-gray-100 text-gray-900 ml-1"
                >Nổi bật</span
              >
            </div>
          </div>
          <button
            @click="closeProductDetail"
            class="btn btn-light border rounded-2"
          >
            <i class="icon icon-x-lg"></i>
          </button>
        </div>

        <div class="flex gap-3 mb-3">
          <div class="bg-light-gray rounded-2 p-2 px-3">
            <p class="text-gray-600 mb-0" style="font-size: 0.7rem">Giá bán</p>
            <p
              class="font-bold mb-0"
              v-text="formatPrice(productDetailModal.product.price)"
            ></p>
          </div>
          <div
            v-if="productDetailModal.product.sale_price"
            class="bg-light-gray rounded-2 p-2 px-3"
          >
            <p class="text-gray-600 mb-0" style="font-size: 0.7rem">Giá KM</p>
            <p
              class="font-bold mb-0 text-red-600"
              v-text="formatPrice(productDetailModal.product.sale_price)"
            ></p>
          </div>
          <div class="bg-light-gray rounded-2 p-2 px-3">
            <p class="text-gray-600 mb-0" style="font-size: 0.7rem">
              Tổng tồn kho
            </p>
            <p
              class="font-bold mb-0"
              v-text="productStockTotal(productDetailModal.product.id)"
            ></p>
          </div>
        </div>

        <p
          v-if="productDetailModal.product.description"
          class="text-sm text-gray-600"
          v-text="productDetailModal.product.description"
        ></p>

        <h6 class="font-bold mb-2 text-gray-900">Thuộc Tính</h6>
        <div class="grid grid-cols-12 gap-2 mb-3 text-sm">
          <div class="col-span-6">
            <span class="text-gray-600">Danh mục: </span
            ><span v-text="productDetailModal.product.category || '—'"></span>
          </div>
          <div class="col-span-6">
            <span class="text-gray-600">Thương hiệu: </span
            ><span
              v-text="
                productDetailModal.product.brand ||
                getBrandName(productDetailModal.product.brand_id)
              "
            ></span>
          </div>
          <div class="col-span-6">
            <span class="text-gray-600">Chất liệu: </span
            ><span
              v-text="getMaterialName(productDetailModal.product.material_id)"
            ></span>
          </div>
        </div>

        <h6 class="font-bold mb-2 text-gray-900">Biến Thể &amp; Tồn Kho</h6>
        <div class="table-responsive border rounded-2">
          <table class="table table-sm mb-0 align-middle">
            <thead>
              <tr class="text-gray-600 text-sm uppercase">
                <th class="pl-3">Màu</th>
                <th>Size</th>
                <th>SKU</th>
                <th class="text-end pr-3">Tồn</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="v in productVariants(productDetailModal.product.id)"
                :key="v.id"
              >
                <td class="pl-3">
                  <span
                    class="color-dot mr-1"
                    :style="{ background: v.color_hex || '#ccc' }"
                  ></span
                  ><span v-text="v.color"></span>
                </td>
                <td v-text="v.size"></td>
                <td class="text-gray-600" v-text="v.sku"></td>
                <td
                  class="text-end pr-3 font-medium"
                  :class="
                    Number(v.stock) <= 0
                      ? 'text-red-600'
                      : Number(v.stock) <= LOW_STOCK_THRESHOLD
                        ? 'text-gray-900'
                        : ''
                  "
                  v-text="v.stock"
                ></td>
              </tr>
              <tr v-if="!productVariants(productDetailModal.product.id).length">
                <td colspan="4" class="text-center text-gray-600 py-3 text-sm">
                  Chưa có biến thể. Thêm màu/size và tạo biến thể trong màn
                  chỉnh sửa.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-end gap-2 mt-3">
          <button
            @click="closeProductDetail"
            class="btn btn-white border rounded-2"
          >
            Đóng
          </button>
          <button
            @click="
              openProductForm(productDetailModal.product);
              closeProductDetail();
            "
            class="btn btn-dark rounded-2"
          >
            <i class="icon icon-pencil mr-1"></i> Chỉnh sửa
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
