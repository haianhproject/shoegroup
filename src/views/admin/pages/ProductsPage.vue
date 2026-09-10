<!-- Trang: Quản Lý Sản Phẩm (danh sách + form thêm/sửa) -->
<script setup>
import { computed } from "vue";
import {
  productSearch,
  filterCategory,
  db,
  openProductForm,
  filteredProducts,
  formatPrice,
  restoreItem,
  deleteProduct,
  isProductSoftDeleted,
  onProductImageFile,
  colorImageDraft,
  onColorImageFile,
  setColorImage,
  onColorDraftImageFile,
  changeColor,
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

const activeProductCount = computed(() => db.products.filter((p) => p.active).length);
const featuredProductCount = computed(() => db.products.filter((p) => p.is_featured).length);
const productImagePlaceholder = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="12" fill="#f3f3f4"/><rect x="48" y="49" width="64" height="62" rx="8" fill="none" stroke="#b6b6bb" stroke-width="3"/><circle cx="68" cy="69" r="7" fill="#b6b6bb"/><path d="m50 99 23-23 15 15 9-9 14 17" fill="none" stroke="#b6b6bb" stroke-width="3" stroke-linejoin="round"/></svg>')}`;

function resetProductFilters() {
  productSearch.value = "";
  filterCategory.value = "";
}

function onProductImageError(event) {
  event.target.onerror = null;
  event.target.src = productImagePlaceholder;
}
</script>

<template>
  <!-- DANH SÁCH -->
  <div v-if="!productFormOpen" class="fade-in products-page">
    <header class="products-page-head">
      <div>
        <p class="products-eyebrow">DANH MỤC CỬA HÀNG</p>
        <h1>Quản lý sản phẩm</h1>
        <p class="products-subtitle">Theo dõi sản phẩm, biến thể và tồn kho trong một nơi.</p>
      </div>
      <button @click="openProductForm()" type="button" class="btn btn-dark products-add-button">
        <i class="icon icon-plus-lg" aria-hidden="true"></i> Thêm sản phẩm
      </button>
    </header>

    <div class="products-summary" aria-label="Tổng quan sản phẩm">
      <div><span>Tổng sản phẩm</span><strong>{{ db.products.length }}</strong></div>
      <div><span>Đang hiển thị</span><strong>{{ activeProductCount }}</strong></div>
      <div><span>Sản phẩm nổi bật</span><strong>{{ featuredProductCount }}</strong></div>
    </div>

    <section class="products-catalog" aria-label="Danh sách sản phẩm">
      <div class="products-toolbar">
        <div class="products-search">
          <i class="icon icon-search" aria-hidden="true"></i>
          <input v-model="productSearch" type="search" class="sg-input" placeholder="Tìm theo tên sản phẩm..." aria-label="Tìm theo tên sản phẩm" />
        </div>
        <select v-model="filterCategory" class="sg-input products-category" aria-label="Lọc sản phẩm theo danh mục">
          <option value="">Tất cả danh mục</option>
          <option v-for="c in activeCategories" :key="c.id" :value="c.id" v-text="c.name"></option>
        </select>
        <button v-if="productSearch || filterCategory" @click="resetProductFilters" type="button" class="products-reset">Xóa bộ lọc</button>
        <p class="products-result-count" role="status"><strong>{{ filteredProducts.length }}</strong> sản phẩm</p>
      </div>
      <div class="table-responsive products-table-scroll" tabindex="0" role="region" aria-label="Bảng sản phẩm, có thể cuộn ngang">
        <table class="table align-middle mb-0 products-table" :class="{ 'is-empty': !filteredProducts.length }">
          <thead v-if="filteredProducts.length">
            <tr>
              <th scope="col">Sản phẩm</th>
              <th scope="col">Thông tin</th>
              <th scope="col">Giá bán</th>
              <th scope="col" class="text-center">Biến thể</th>
              <th scope="col" class="text-center">Tồn kho</th>
              <th scope="col">Trạng thái</th>
              <th scope="col" class="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filteredProducts" :key="p.id">
              <td>
                <div class="products-item">
                  <img :src="p.image_url || productImagePlaceholder" :alt="p.name" class="products-thumbnail" loading="lazy" @error="onProductImageError" />
                  <div class="products-item-info">
                    <button type="button" class="products-name" @click="openProductDetail(p)" v-text="p.name"></button>
                    <p class="products-code">#{{ p.id }}<span v-if="p.is_featured" class="products-featured">Nổi bật</span></p>
                    <p v-if="p.description" class="products-description" :title="p.description" v-text="p.description"></p>
                  </div>
                </div>
              </td>
              <td>
                <span class="products-brand" v-text="p.brand || getBrandName(p.brand_id)"></span>
                <span class="products-material" v-text="getMaterialName(p.material_id)"></span>
              </td>
              <td class="products-price">
                <strong>{{ formatPrice(p.sale_price || p.price) }}</strong>
                <del v-if="p.sale_price && Number(p.sale_price) < Number(p.price)">{{ formatPrice(p.price) }}</del>
              </td>
              <td class="text-center products-variant-count" v-text="productVariantCount(p.id)"></td>
              <td class="text-center">
                <strong class="products-stock" :class="{ 'is-low': productStockTotal(p.id) <= LOW_STOCK_THRESHOLD }">{{ productStockTotal(p.id) }}</strong>
                <span v-if="productStockTotal(p.id) <= LOW_STOCK_THRESHOLD" class="products-stock-note">{{ productStockTotal(p.id) <= 0 ? 'Hết hàng' : 'Sắp hết' }}</span>
              </td>
              <td>
                <span class="products-status" :class="{ 'is-active': p.active }"><span aria-hidden="true"></span>{{ p.active ? 'Đang hiển thị' : 'Đã ẩn' }}</span>
              </td>
              <td>
                <div class="products-actions">
                  <button @click="openProductForm(p)" type="button" class="products-action" :aria-label="'Chỉnh sửa ' + p.name" title="Chỉnh sửa sản phẩm"><i class="icon icon-pencil" aria-hidden="true"></i></button>
                  <button v-if="isProductSoftDeleted(p)" @click="restoreItem('products', p)" type="button" class="products-action" :aria-label="'Khôi phục ' + p.name" title="Khôi phục sản phẩm"><i class="icon icon-arrow-counterclockwise" aria-hidden="true"></i></button>
                  <button @click="deleteProduct(p)" type="button" class="products-action products-action-danger" :aria-label="(isProductSoftDeleted(p) ? 'Xóa vĩnh viễn ' : 'Ẩn ') + p.name" :title="isProductSoftDeleted(p) ? 'Xóa vĩnh viễn sản phẩm' : 'Ẩn sản phẩm'"><i class="icon" :class="isProductSoftDeleted(p) ? 'icon-trash-fill' : 'icon-eye-slash'" aria-hidden="true"></i></button>
                </div>
              </td>
            </tr>
            <tr v-if="!filteredProducts.length">
              <td colspan="7">
                <div class="products-empty">
                  <span class="products-empty-icon"><i class="icon icon-box-seam" aria-hidden="true"></i></span>
                  <h2>{{ productSearch || filterCategory ? 'Không tìm thấy sản phẩm' : 'Danh mục đang trống' }}</h2>
                  <p>{{ productSearch || filterCategory ? 'Thử từ khóa khác hoặc xóa bộ lọc để xem thêm sản phẩm.' : 'Thêm sản phẩm đầu tiên để bắt đầu quản lý cửa hàng.' }}</p>
                  <button v-if="productSearch || filterCategory" @click="resetProductFilters" type="button" class="btn btn-light border rounded-2">Xóa bộ lọc</button>
                  <button v-else @click="openProductForm()" type="button" class="btn btn-dark rounded-2">Thêm sản phẩm</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer v-if="filteredProducts.length" class="products-table-footer">Hiển thị {{ filteredProducts.length }} trên {{ db.products.length }} sản phẩm</footer>
    </section>
  </div>

  <!-- FORM THÊM/SỬA -->
  <div v-else class="fade-in product-editor">
    <header class="products-page-head product-editor-head">
      <button @click="closeProductForm" type="button" class="btn btn-light border rounded-2 product-back" aria-label="Quay lại danh sách sản phẩm">
        <i class="icon icon-arrow-left" aria-hidden="true"></i>
      </button>
      <div>
        <p class="products-eyebrow">THÔNG TIN SẢN PHẨM</p>
        <h1>{{ productForm.id ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới' }}</h1>
        <p class="products-subtitle">Hoàn thiện thông tin và các lựa chọn hiển thị tại cửa hàng.</p>
      </div>
    </header>
    <div class="grid grid-cols-12 gap-4">
      <div class="col-span-12 lg:col-span-8">
        <div class="product-form-panel mb-4">
          <h2 class="product-panel-title">Thông tin cơ bản</h2>
          <div class="mb-3">
            <label for="product-name" class="block text-sm font-medium">Tên sản phẩm</label
            ><input
              id="product-name"
              v-model="productForm.name"
              type="text"
              class="sg-input rounded-2"
              placeholder="Ví dụ: Giày Sneaker Classic"
            />
          </div>
          <div class="mb-3">
            <label for="product-description" class="block text-sm font-medium">Mô tả</label
            ><textarea
              id="product-description"
              v-model="productForm.description"
              rows="3"
              class="sg-input rounded-2"
              placeholder="Mô tả chi tiết sản phẩm..."
            ></textarea>
          </div>
          <div class="grid grid-cols-12 gap-3">
            <div class="col-span-12 md:col-span-6">
              <label for="product-category" class="block text-sm font-medium">Danh mục</label
              ><select
                id="product-category"
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
            <div class="col-span-12 md:col-span-6">
              <label for="product-brand" class="block text-sm font-medium">Thương hiệu</label
              ><select
                id="product-brand"
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
            <div class="col-span-12 md:col-span-6">
              <label for="product-material" class="block text-sm font-medium">Chất liệu</label
              ><select
                id="product-material"
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
            <div class="col-span-12 md:col-span-6">
              <label for="product-price" class="block text-sm font-medium">Giá bán (VNĐ)</label
              ><input
                id="product-price"
                v-model.number="productForm.price"
                type="number"
                class="sg-input rounded-2"
              />
            </div>
            <div class="col-span-12 md:col-span-6">
              <label for="product-sale-price" class="block text-sm font-medium"
                >Giá khuyến mãi (VNĐ)</label
              ><input
                id="product-sale-price"
                v-model.number="productForm.sale_price"
                type="number"
                class="sg-input rounded-2"
              />
            </div>
          </div>
        </div>

        <div class="product-form-panel">
          <h2 class="product-panel-title">Màu sắc &amp; kích cỡ</h2>

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
          <div class="flex flex-col gap-3 mb-3">
            <div
              v-for="(c, i) in productForm.colors"
              :key="i"
              class="border rounded-2 p-3 bg-white shadow-2xs"
            >
              <!-- Dòng tiêu đề màu -->
              <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b">
                <div class="flex items-center gap-2.5">
                  <img
                    :src="c.image || productImagePlaceholder"
                    :alt="'Ảnh màu ' + c.name"
                    class="rounded-2 border object-cover"
                    style="width: 44px; height: 44px"
                    @error="onProductImageError"
                  />
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="color-dot" :style="{ background: c.hex }"></span>
                      <span class="font-bold text-gray-900" v-text="c.name"></span>
                      <span
                        class="badge rounded-1 bg-gray-100 text-gray-600 border font-normal text-xs"
                        v-text="
                          (c.variants ? c.variants.length : 0) +
                          ' size · ' +
                          colorStockTotal(c) +
                          ' sp'
                        "
                      ></span>
                    </div>
                    <div v-if="c.note" class="text-xs text-gray-500 mt-0.5" v-text="c.note"></div>
                  </div>
                </div>
                <button
                  type="button"
                  @click="removeColor(i)"
                  class="btn btn-sm btn-outline-danger rounded-2 py-1 px-2.5 text-xs ml-auto"
                  title="Xóa biến thể màu này"
                >
                  <i class="icon icon-trash mr-1"></i> Xóa màu
                </button>
              </div>

              <!-- Khu vực Sửa Ảnh, Sửa Màu, Sửa Mô Tả Biến Thể -->
              <div class="grid grid-cols-12 gap-2.5 p-2.5 rounded-2 bg-light-gray mb-3 text-xs">
                <!-- Sửa Ảnh biến thể -->
                <div class="col-span-12 sm:col-span-5">
                  <label class="block font-semibold text-gray-700 mb-1">
                    <i class="icon icon-image mr-1"></i>Ảnh biến thể
                  </label>
                  <div class="flex items-center gap-1.5">
                    <input
                      :value="c.image"
                      @input="setColorImage(i, $event.target.value)"
                      :aria-label="'Đường dẫn ảnh biến thể ' + c.name"
                      type="text"
                      class="sg-input sg-input-sm rounded-2 flex-1 text-xs"
                      placeholder="Dán link ảnh hoặc tải từ máy..."
                    />
                    <label class="btn btn-sm btn-outline-dark rounded-2 mb-0 px-2 cursor-pointer" title="Chọn ảnh từ máy tính">
                      <i class="icon icon-upload"></i>
                      <input type="file" accept="image/*" class="hidden" @change="onColorImageFile($event, i)" />
                    </label>
                  </div>
                </div>

                <!-- Sửa Màu sắc -->
                <div class="col-span-12 sm:col-span-3">
                  <label class="block font-semibold text-gray-700 mb-1">
                    <i class="icon icon-palette mr-1"></i>Đổi màu
                  </label>
                  <select
                    :value="c.id || ''"
                    @change="changeColor(i, $event.target.value)"
                    class="sg-input sg-input-sm rounded-2 w-full text-xs"
                  >
                    <option :value="c.id" v-text="c.name"></option>
                    <option
                      v-for="col in db.colors.filter(item => item.name !== c.name)"
                      :key="col.id"
                      :value="col.id"
                      v-text="col.name"
                    ></option>
                  </select>
                </div>

                <!-- Sửa Mô tả / Chú thích -->
                <div class="col-span-12 sm:col-span-4">
                  <label class="block font-semibold text-gray-700 mb-1">
                    <i class="icon icon-pencil mr-1"></i>Mô tả biến thể
                  </label>
                  <input
                    v-model="c.note"
                    type="text"
                    class="sg-input sg-input-sm rounded-2 w-full text-xs"
                    placeholder="VD: Phối màu Panda, Da lộn..."
                  />
                </div>
              </div>

              <!-- Kích cỡ & Số lượng cho màu này -->
              <div class="pt-2 border-t">
                <label class="block text-xs font-semibold text-gray-700 mb-1.5"
                  >Kích cỡ &amp; số lượng cho màu này</label
                >
                <div class="flex flex-wrap gap-1 mb-2">
                  <button
                    v-for="s in SHOE_SIZES"
                    :key="s"
                    type="button"
                    @click="toggleColorSize(i, s)"
                    class="btn btn-sm rounded-2 text-xs"
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
                        class="flex items-center text-xs"
                        v-text="'Size ' + sv.size"
                      ></span>
                      <input
                        v-model.number="sv.stock"
                        type="number"
                        min="0"
                        class="sg-input text-end text-xs"
                        placeholder="SL"
                      />
                    </div>
                  </div>
                </div>
                <span v-else class="text-gray-500 text-xs fst-italic"
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
                    :src="colorImageDraft || productImagePlaceholder"
                    alt="Ảnh màu mới"
                    class="rounded-2 border"
                    style="width: 40px; height: 40px; object-fit: cover"
                    @error="onProductImageError"
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

      <div class="col-span-12 lg:col-span-4 product-editor-aside">
        <div class="product-form-panel mb-4">
          <h2 class="product-panel-title">Ảnh đại diện</h2>
          <img :src="productForm.image_url || productImagePlaceholder" :alt="productForm.name || 'Ảnh đại diện sản phẩm'" class="product-cover-preview" @error="onProductImageError" />
          <label for="product-image-url" class="block text-sm font-medium">Đường dẫn ảnh</label>
          <input id="product-image-url" v-model="productForm.image_url" type="url" class="sg-input rounded-2" placeholder="https://..." />
          <label class="btn btn-light border rounded-2 product-upload">
            <i class="icon icon-upload" aria-hidden="true"></i> Tải ảnh từ thiết bị
            <input type="file" accept="image/*" class="product-file-input" @change="onProductImageFile" />
          </label>
          <p class="product-help">Ảnh đại diện hiển thị trên cửa hàng. Đổi ảnh biến thể đầu tiên sẽ cập nhật ảnh đại diện; đổi riêng ảnh đại diện không thay đổi ảnh biến thể.</p>
        </div>
        <div class="product-form-panel">
          <div class="flex justify-between items-center mb-3">
            <h2 class="product-panel-title mb-0">Xuất bản</h2>
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
        <div class="product-editor-save">
          <button @click="saveProduct" type="button" class="btn btn-dark w-full rounded-2 font-bold py-2">
            <i class="icon icon-check2-circle mr-2" aria-hidden="true"></i> Lưu sản phẩm
          </button>
          <button @click="closeProductForm" type="button" class="btn btn-light border w-full rounded-2">Hủy thay đổi</button>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL CHI TIẾT SẢN PHẨM (đầy đủ thuộc tính) -->
  <div
    v-if="productDetailModal.open"
    class="custom-modal-overlay product-detail-overlay"
    @click.self="closeProductDetail"
  >
    <div class="custom-modal-box fade-in-scale product-detail-dialog" style="max-width: 760px" role="dialog" aria-modal="true" aria-label="Chi tiết sản phẩm">
      <div v-if="productDetailModal.product">
        <div class="flex justify-between items-start mb-3">
          <div class="flex gap-3">
            <img
              :src="
                productDetailModal.product.image_url ||
                productImagePlaceholder
              "
              :alt="productDetailModal.product.name"
              class="rounded-2 border"
              style="width: 72px; height: 72px; object-fit: cover"
              @error="onProductImageError"
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
          <div class="flex items-center gap-2">
            <button
              @click="openProductForm(productDetailModal.product); closeProductDetail()"
              class="btn btn-sm btn-dark rounded-2 font-bold px-3 shadow-sm"
              title="Mở form chỉnh sửa sản phẩm và biến thể"
            >
              <i class="icon icon-pencil-square mr-1"></i> Sửa Sản Phẩm &amp; Biến Thể
            </button>
            <button
              @click="closeProductDetail"
              class="btn btn-light border rounded-2"
              aria-label="Đóng chi tiết sản phẩm"
            >
              <i class="icon icon-x-lg"></i>
            </button>
          </div>
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

<style scoped>
.products-page,
.product-editor {
  min-width: 0;
  color: #0e0e0e;
}

.products-page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.products-eyebrow {
  margin: 0 0 8px;
  color: #77777e;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.products-page-head h1 {
  margin: 0;
  font-size: clamp(23px, 2.2vw, 30px);
  font-weight: 750;
  letter-spacing: -0.035em;
  line-height: 1.3;
}

.products-subtitle {
  margin: 8px 0 0;
  color: #74747b;
  font-size: 13px;
  line-height: 1.7;
}

.products-add-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 43px;
  padding: 11px 17px;
  border-radius: 8px;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 650;
}

.products-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.products-summary > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 21px 24px;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  background: #fff;
}

.products-summary span {
  color: #73737a;
  font-size: 12px;
}

.products-summary strong {
  font-size: 25px;
  font-weight: 700;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

.products-catalog {
  overflow: hidden;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  background: #fff;
}

.products-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
}

.products-search {
  position: relative;
  flex: 1;
  max-width: 360px;
  min-width: 150px;
}

.products-search > .icon {
  position: absolute;
  top: 50%;
  left: 13px;
  transform: translateY(-50%);
  color: #72727a;
  pointer-events: none;
}

.products-search .sg-input {
  width: 100%;
  height: 40px;
  padding-left: 38px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fff;
  font-size: 12px;
}

.products-category.sg-input {
  width: 195px;
  min-height: 40px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 12px;
}

.products-reset {
  border: 0;
  background: transparent;
  color: #6c6c74;
  font-size: 11px;
  text-decoration: underline;
  text-underline-offset: 3px;
  white-space: nowrap;
  cursor: pointer;
}

.products-result-count {
  margin: 0 0 0 auto;
  color: #7a7a80;
  font-size: 11px;
  white-space: nowrap;
}

.products-result-count strong { color: #252529; }
.products-table-scroll { width: 100%; overflow-x: auto; }
.products-table { min-width: 1010px; width: 100%; }
.products-table.is-empty { min-width: 0; }

.products-table thead th {
  padding: 13px 16px;
  border-top: 1px solid #ededee;
  border-bottom: 1px solid #ededee;
  background: #fafafa;
  color: #73737a;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.035em;
  white-space: nowrap;
  text-transform: uppercase;
}

.products-table tbody td {
  padding: 18px 16px;
  border-bottom: 1px solid #f0f0f1;
  font-size: 12px;
  vertical-align: middle;
}

.products-table th:first-child,
.products-table td:first-child { padding-left: 22px; }
.products-table th:last-child,
.products-table td:last-child { padding-right: 22px; }
.products-table tbody tr:last-child td { border-bottom: 0; }
.products-table tbody tr:hover { background: #fcfcfc; }

.products-item {
  display: flex;
  align-items: center;
  gap: 13px;
}

.products-thumbnail {
  flex: 0 0 56px;
  width: 56px;
  height: 56px;
  border: 1px solid #ededee;
  border-radius: 8px;
  object-fit: cover;
  background: #f7f7f8;
}

.products-item-info { min-width: 170px; max-width: 250px; }
.products-name {
  display: block;
  padding: 0;
  border: 0;
  background: none;
  color: #19191c;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.55;
  text-align: left;
  cursor: pointer;
}
.products-name:hover { color: #d4001a; }
.products-code { margin: 4px 0 0; color: #7b7b83; font-size: 10px; }
.products-featured { margin-left: 8px; color: #b90016; font-size: 9px; }
.products-description {
  overflow: hidden;
  margin: 4px 0 0;
  color: #8a8a91;
  font-size: 10px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.products-brand { display: block; color: #343439; font-size: 12px; }
.products-material { display: block; margin-top: 5px; color: #83838b; font-size: 10px; }
.products-price { white-space: nowrap; }
.products-price strong { display: block; font-size: 12px; font-weight: 650; }
.products-price del { display: block; margin-top: 5px; color: #95959b; font-size: 10px; }
.products-variant-count { color: #67676f; font-variant-numeric: tabular-nums; }
.products-stock { display: block; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
.products-stock.is-low { color: #c00019; }
.products-stock-note { display: block; margin-top: 4px; color: #b80017; font-size: 9px; white-space: nowrap; }
.products-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border: 1px solid #e9e9ec;
  border-radius: 6px;
  background: #f7f7f8;
  color: #777780;
  font-size: 10px;
  white-space: nowrap;
}
.products-status > span { width: 5px; height: 5px; border-radius: 50%; background: #9c9ca3; }
.products-status.is-active { background: #f0f7f2; border-color: #e0eee5; color: #36744c; }
.products-status.is-active > span { background: #438259; }
.products-actions { display: flex; align-items: center; justify-content: flex-end; gap: 7px; }
.products-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid #e8e8ea;
  border-radius: 7px;
  background: #fff;
  color: #68686f;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.products-action:hover { border-color: #c8c8ce; background: #f5f5f6; color: #0e0e0e; }
.products-action-danger:hover { border-color: #efc9ce; background: #fff3f4; color: #d4001a; }
.products-table-footer { padding: 15px 22px; border-top: 1px solid #ededee; color: #84848b; font-size: 11px; }
.products-empty { display: flex; flex-direction: column; align-items: center; padding: 48px 20px; text-align: center; }
.products-empty-icon { display: grid; place-items: center; width: 52px; height: 52px; margin-bottom: 17px; border-radius: 12px; background: #f5f5f6; color: #6c6c74; font-size: 25px; }
.products-empty h2 { margin: 0 0 8px; font-size: 16px; font-weight: 650; }
.products-empty p { margin: 0 0 20px; color: #818189; font-size: 12px; }
.products-empty .btn { font-size: 12px; }

.product-editor-head { justify-content: flex-start; }
.product-back { flex-shrink: 0; width: 42px; height: 42px; }
.product-form-panel { padding: 24px; border: 1px solid #e5e5e5; border-radius: 12px; background: #fff; }
.product-panel-title { margin: 0 0 20px; font-size: 14px; font-weight: 650; }
.product-editor :deep(.sg-input) { min-width: 0; border-radius: 8px; font-size: 12px; }
.product-editor label { margin-bottom: 7px; font-size: 11px; }
.product-cover-preview { display: block; width: 100%; aspect-ratio: 1.25; margin-bottom: 20px; border: 1px solid #ededee; border-radius: 8px; object-fit: contain; background: #f7f7f8; }
.product-upload { position: relative; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; margin-top: 12px; min-height: 40px; cursor: pointer; }
.product-file-input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.product-upload:focus-within { outline: 2px solid #0e0e0e; outline-offset: 2px; }
.product-help { margin: 11px 0 0; color: #85858c; font-size: 10px; line-height: 1.8; }
.product-editor-save { display: grid; gap: 9px; margin-top: 16px; }
.product-editor-save .btn { min-height: 42px; font-size: 12px; }

.products-page :is(button, input, select, [tabindex]):focus-visible,
.product-editor :is(button, input, select, textarea):focus-visible { outline: 2px solid #0e0e0e; outline-offset: 3px; }

@media (max-width: 1100px) {
  .products-summary > div { padding: 18px; }
  .products-toolbar { flex-wrap: wrap; }
  .product-form-panel { padding: 20px; }
}

@media (max-width: 640px) {
  .products-page-head { flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
  .products-add-button { width: 100%; }
  .products-subtitle { font-size: 12px; }
  .products-summary { gap: 8px; margin-bottom: 18px; }
  .products-summary > div { flex-direction: column; align-items: flex-start; gap: 8px; padding: 13px 11px; }
  .products-summary span { font-size: 10px; line-height: 1.5; }
  .products-summary strong { font-size: 23px; }
  .products-toolbar { gap: 10px; padding: 14px; }
  .products-search { flex-basis: 100%; max-width: none; }
  .products-category.sg-input { flex: 1; width: auto; min-width: 0; }
  .products-table-footer { padding: 14px; }
  .product-editor-head { flex-wrap: nowrap; align-items: flex-start; gap: 12px; }
  .product-editor-head h1 { font-size: 23px; }
  .product-form-panel { padding: 18px; }
  .product-detail-dialog > div > .flex:first-child { flex-wrap: wrap; gap: 16px; }
  .product-detail-dialog > div > .flex { flex-wrap: wrap; }
}
</style>
