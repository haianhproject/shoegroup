<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  addToCart,
  formatCurrency,
  showDrawer
} from '../stores/cartStore'
import { notify } from '../stores/uiStore'
import { API_BASE_URL } from '../services/apiClient'

const route = useRoute()

const product = ref(null)
const variants = ref([])
const colorList = ref([])
const sizeList = ref([])
const isLoading = ref(true)

const selSize = ref(null)
const selColor = ref(null)
const activeImage = ref('')
const qty = ref(1)

const API = API_BASE_URL

// ============================================================
// FETCH PRODUCT
// ============================================================

const fetchData = async () => {
  const id = Number(route.params.id)

  isLoading.value = true

  try {
    const rp = await fetch(`${API}/products`)
    const dp = await rp.json()

    const raw = Array.isArray(dp)
      ? dp.find((p) => Number(p.id) === id)
      : null

    if (raw) {
      product.value = {
        id_product: raw.id,
        product_name: raw.name,
        price: raw.price,
        sale_price: raw.sale_price,
        category_name: raw.category,
        sport: raw.sport,
        description: raw.description,
        material_name: raw.material_name,
        brand_name: raw.brand,
        collection_name: raw.collection_name,
        image_url: raw.image_url,
        stock_quantity: raw.stock_quantity ?? raw.stock ?? raw.total_stock ?? 0,
        total_stock: raw.total_stock ?? raw.stock_quantity ?? raw.stock ?? 0
      }

      // ======================================================
      // GIỮ NGUYÊN CÁC BIẾN THỂ THẬT TỪ API
      // ======================================================

      variants.value = Array.isArray(raw.variants)
        ? raw.variants.map((v) => ({
            ...v,

            id:
              v.id ??
              v.variant_id ??
              v.id_variant ??
              null,

            size:
              v.size ??
              v.size_name ??
              v.SizeName ??
              '',

            color:
              v.color ??
              v.color_name ??
              v.color_label ??
              v.ColorName ??
              '',

            stock: Number(
              v.stock ??
              v.stock_quantity ??
              v.quantity ??
              0
            )
          }))
        : []

      // ======================================================
      // MÀU
      // ======================================================

      colorList.value = (
        Array.isArray(raw.colors)
          ? raw.colors
          : []
      ).map((c) => ({
        color_label:
          c.name ??
          c.color_label ??
          c.color_name ??
          '',

        color_name:
          c.name ??
          c.color_name ??
          c.color_label ??
          '',

        hex:
          c.hex ??
          c.color_hex ??
          '#ccc',

        image:
          c.image ??
          c.image_url ??
          null
      }))

      // ======================================================
      // SIZE
      // ======================================================

      sizeList.value = (
        Array.isArray(raw.sizes)
          ? raw.sizes
          : []
      ).map((s) => ({
        size_name: String(
          s?.size_name ??
          s?.name ??
          s
        )
      }))
    }
  } catch (error) {
    console.error(
      'Lỗi tải sản phẩm:',
      error
    )

    // Không tự tạo biến thể giả
    product.value = null
    variants.value = []
    colorList.value = []
    sizeList.value = []
  } finally {
    isLoading.value = false

    if (colorList.value.length > 0) {
      selColor.value =
        colorList.value[0]
    } else {
      selColor.value = null
    }

    activeImage.value =
      selColor.value?.image ||
      product.value?.image_url ||
      ''

    if (availableSizes.value.length > 0) {
      selSize.value =
        availableSizes.value[0]
          ?.size_name || null
    } else {
      selSize.value =
        sizeList.value[0]
          ?.size_name || null
    }

    qty.value = 1
  }
}

// ============================================================
// GALLERY
// ============================================================

const galleryImages = computed(() => {
  const imgs = []

  for (const c of colorList.value) {
    if (
      c.image &&
      !imgs.includes(c.image)
    ) {
      imgs.push(c.image)
    }
  }

  if (
    imgs.length === 0 &&
    product.value?.image_url
  ) {
    imgs.push(
      product.value.image_url
    )
  }

  return imgs
})

// ============================================================
// LẤY CÁC SIZE THẬT CỦA MÀU ĐANG CHỌN
// ============================================================

const availableSizes = computed(() => {
  if (
    !selColor.value ||
    variants.value.length === 0
  ) {
    return sizeList.value
  }

  const colorName =
    selColor.value.color_name

  const sizes = variants.value
    .filter(
      (v) =>
        String(v.color) ===
        String(colorName)
    )
    .map((v) =>
      String(v.size)
    )

  return sizeList.value.filter(
    (s) =>
      sizes.includes(
        String(s.size_name)
      )
  )
})

// ============================================================
// VARIANT ĐANG CHỌN
// ============================================================

const selectedVariant = computed(() => {
  if (
    !selColor.value ||
    !selSize.value
  ) {
    return null
  }

  const colorName =
    selColor.value.color_name

  const sizeName =
    String(selSize.value)

  return (
    variants.value.find(
      (v) =>
        String(v.color) ===
          String(colorName) &&
        String(v.size) ===
          sizeName
    ) || null
  )
})

// ============================================================
// ID VARIANT
// ============================================================

const selectedVariantId = computed(() => {
  return (
    selectedVariant.value?.id ??
    selectedVariant.value?.variant_id ??
    selectedVariant.value?.id_variant ??
    null
  )
})

// ============================================================
// TỒN KHO THẬT CỦA BIẾN THỂ
// ============================================================
//
// QUAN TRỌNG:
//
// Không trừ cart quantity ở đây.
//
// Nếu DB/API báo 10:
//
// → giao diện luôn báo 10
//
// dù giỏ hàng đang có 1, 2, 5 hay 10.
// ============================================================

const maxStock = computed(() => {
  const variant =
    selectedVariant.value

  if (variant) {
    return Math.max(
      0,
      Number(variant.stock) || 0
    )
  }

  // Nếu không có biến thể
  if (
    !variants.value.length &&
    product.value
  ) {
    return Math.max(
      0,
      Number(
        product.value.stock_quantity ??
        product.value.total_stock ??
        0
      )
    )
  }

  return 0
})

// ============================================================
// AVAILABLE STOCK
// ============================================================
//
// KHÔNG TRỪ GIỎ HÀNG
// ============================================================

const availableStock = computed(() => {
  return maxStock.value
})

// ============================================================
// BIẾN THỂ ĐANG HẾT HÀNG
// ============================================================

const selectedVariantOutOfStock =
  computed(() => {
    if (!selColor.value || !selSize.value) {
      return false
    }

    // Có biến thể nhưng không tìm thấy
    const variant =
      selectedVariant.value

    if (!variant) {
      return true
    }

    return (
      Number(variant.stock) <= 0
    )
  })

// ============================================================
// TOÀN BỘ SẢN PHẨM HẾT HÀNG
// ============================================================
//
// Chỉ true khi TẤT CẢ biến thể đều hết.
// ============================================================

const isEntireProductOutOfStock =
  computed(() => {
    if (!variants.value.length) {
      return maxStock.value <= 0
    }

    return variants.value.every(
      (v) =>
        Number(v.stock) <= 0
    )
  })

// ============================================================
// KIỂM TRA TỪNG SIZE
// ============================================================

const getSizeStock = (sizeName) => {
  if (!selColor.value) {
    return 0
  }

  const variant =
    variants.value.find(
      (v) =>
        String(v.color) ===
          String(
            selColor.value.color_name
          ) &&
        String(v.size) ===
          String(sizeName)
    )

  return variant
    ? Number(variant.stock) || 0
    : 0
}

// ============================================================
// SIZE HẾT HÀNG
// ============================================================

const isSizeOutOfStock = (
  sizeName
) => {
  return (
    getSizeStock(sizeName) <= 0
  )
}

// ============================================================
// MÀU CÓ HẾT TOÀN BỘ SIZE KHÔNG
// ============================================================

const isColorOutOfStock = (
  color
) => {
  if (!variants.value.length) {
    return false
  }

  const colorVariants =
    variants.value.filter(
      (v) =>
        String(v.color) ===
        String(color.color_name)
    )

  if (!colorVariants.length) {
    return true
  }

  return colorVariants.every(
    (v) =>
      Number(v.stock) <= 0
  )
}

// ============================================================
// CHỌN MÀU
// ============================================================

const selectColor = (color) => {
  selColor.value = color

  if (color.image) {
    activeImage.value =
      color.image
  }

  const sizes =
    availableSizes.value

  if (
    !sizes.some(
      (s) =>
        String(s.size_name) ===
        String(selSize.value)
    )
  ) {
    // Ưu tiên size còn hàng
    const available =
      sizes.find(
        (s) =>
          !isSizeOutOfStock(
            s.size_name
          )
      )

    selSize.value =
      available?.size_name ??
      sizes[0]?.size_name ??
      null
  }

  qty.value = 1
}

// ============================================================
// ATTRIBUTES
// ============================================================

const attributes = computed(() => {
  if (!product.value) {
    return []
  }

  const p = product.value

  return [
    {
      icon: 'bi-tag',
      label: 'Thương hiệu',
      value: p.brand_name
    },
    {
      icon: 'bi-grid',
      label: 'Danh mục',
      value: p.category_name
    },
    {
      icon: 'bi-activity',
      label: 'Bộ môn',
      value: p.sport
    },
    {
      icon: 'bi-layers',
      label: 'Chất liệu',
      value: p.material_name
    },
    {
      icon: 'bi-collection',
      label: 'Bộ sưu tập',
      value:
        p.collection_name
    }
  ].filter(
    (a) => a.value
  )
})

// ============================================================
// QUANTITY WATCH
// ============================================================

watch(
  availableStock,
  (newVal) => {
    if (newVal <= 0) {
      qty.value = 1
      return
    }

    if (qty.value > newVal) {
      qty.value = newVal
    }

    if (qty.value < 1) {
      qty.value = 1
    }
  }
)

// ============================================================
// TĂNG QUANTITY
// ============================================================

const incrementQty = () => {
  if (
    selectedVariantOutOfStock.value
  ) {
    notify({
      type: 'warning',
      message:
        'Biến thể này đã hết hàng.'
    })

    return
  }

  if (
    qty.value <
    availableStock.value
  ) {
    qty.value++
  } else {
    notify({
      type: 'warning',
      message:
        `Biến thể này chỉ còn ${availableStock.value} sản phẩm trong kho.`
    })
  }
}

// ============================================================
// GIẢM QUANTITY
// ============================================================

const decrementQty = () => {
  if (qty.value > 1) {
    qty.value--
  }
}

// ============================================================
// ADD TO CART
// ============================================================

const handleAdd = () => {
  // ----------------------------------------------------------
  // CHƯA CHỌN MÀU
  // ----------------------------------------------------------

  if (!selColor.value) {
    notify({
      type: 'error',
      message:
        'Vui lòng chọn màu sắc.'
    })

    return
  }

  // ----------------------------------------------------------
  // CHƯA CHỌN SIZE
  // ----------------------------------------------------------

  if (!selSize.value) {
    notify({
      type: 'error',
      message:
        'Vui lòng chọn kích cỡ.'
    })

    return
  }

  // ----------------------------------------------------------
  // BIẾN THỂ KHÔNG TỒN TẠI
  // ----------------------------------------------------------

  if (
    variants.value.length &&
    !selectedVariant.value
  ) {
    notify({
      type: 'warning',
      message:
        `Size ${selSize.value} - ${selColor.value.color_name} không có trong kho.`
    })

    return
  }

  // ----------------------------------------------------------
  // BIẾN THỂ HẾT
  // ----------------------------------------------------------

  if (
    selectedVariantOutOfStock.value
  ) {
    notify({
      type: 'warning',
      title: 'Biến thể đã hết hàng',
      message:
        `Size ${selSize.value} - ${selColor.value.color_name} hiện đã hết hàng. Vui lòng chọn biến thể khác.`,
      duration: 4000
    })

    return
  }

  // ----------------------------------------------------------
  // SỐ LƯỢNG
  // ----------------------------------------------------------

  if (
    qty.value >
    availableStock.value
  ) {
    notify({
      type: 'warning',
      message:
        `Chỉ còn ${availableStock.value} sản phẩm của biến thể này trong kho.`
    })

    return
  }

  // ----------------------------------------------------------
  // PAYLOAD
  // ----------------------------------------------------------

  const payload = {
    product: product.value,

    quantity:
      Number(qty.value),

    size: {
      size_name:
        String(selSize.value)
    },

    color: {
      ...selColor.value
    },

    // QUAN TRỌNG:
    // Gửi ID biến thể thật
    variantId:
      selectedVariantId.value,

    // Đây là tồn kho THẬT
    // Không trừ cart quantity
    stockQuantity:
      maxStock.value
  }

  // ----------------------------------------------------------
  // ADD
  // ----------------------------------------------------------

  const result =
    addToCart(payload)

  if (!result.ok) {
    notify({
      type: 'error',
      message:
        result.message
    })

    return
  }

  // ----------------------------------------------------------
  // RESET SỐ LƯỢNG
  // ----------------------------------------------------------

  qty.value = 1

  // ----------------------------------------------------------
  // MINI CART
  // ----------------------------------------------------------

  showDrawer()

  notify({
    type: 'success',
    title:
      'Đã thêm vào giỏ hàng',
    message:
      `${product.value.product_name} - Size ${selSize.value} - ${selColor.value.color_name}`,
    duration: 3000
  })
}

// ============================================================
// ROUTE
// ============================================================

watch(
  () => route.params.id,
  fetchData
)

onMounted(fetchData)
</script>

<template>
  <div class="detail-page">
    <div class="container-fluid px-4 py-4">

      <!-- LOADING -->
      <div
        v-if="isLoading"
        class="text-center py-5"
      >
        <div
          class="spinner-border text-primary"
        ></div>
      </div>

      <!-- PRODUCT -->
      <div
        v-else-if="product"
        class="row g-5"
      >

        <!-- ================================================= -->
        <!-- GALLERY -->
        <!-- ================================================= -->

        <div class="col-lg-6">

          <div class="detail-media">

            <span
              v-if="product.sport"
              class="detail-tag"
            >
              {{ product.sport }}
            </span>

            <img
              :src="
                activeImage ||
                product.image_url
              "
              :alt="
                product.product_name
              "
            />
          </div>

          <div
            v-if="
              galleryImages.length > 1
            "
            class="thumb-row"
          >
            <button
              v-for="(
                img, i
              ) in galleryImages"
              :key="i"
              class="thumb"
              :class="{
                active:
                  activeImage === img
              }"
              @click="
                activeImage = img
              "
            >
              <img
                :src="img"
                alt="variant"
              />
            </button>
          </div>

        </div>

        <!-- ================================================= -->
        <!-- INFO -->
        <!-- ================================================= -->

        <div class="col-lg-6">

          <nav
            class="detail-breadcrumb"
          >
            <router-link to="/">
              Trang chủ
            </router-link>

            /

            <router-link
              to="/products"
            >
              Sản phẩm
            </router-link>

            /

            <span>
              {{ product.product_name }}
            </span>
          </nav>

          <h1 class="detail-name">
            {{ product.product_name }}
          </h1>

          <!-- PRICE -->
          <div
            class="detail-price d-flex flex-column"
          >
            <span
              v-if="
                Number(
                  product.sale_price
                ) > 0 &&
                Number(
                  product.sale_price
                ) <
                  Number(
                    product.price
                  )
              "
              class="text-danger text-decoration-line-through small"
              style="
                font-size: 1.1rem;
                font-weight: normal;
              "
            >
              {{
                formatCurrency(
                  product.price
                )
              }}
            </span>

            <span>
              {{
                formatCurrency(
                  Number(
                    product.sale_price
                  ) > 0
                    ? product.sale_price
                    : product.price
                )
              }}
            </span>
          </div>

          <!-- DESCRIPTION -->
          <p class="detail-desc">
            {{
              product.description ||
              'Sản phẩm giày thể thao nam chính hãng, thiết kế hiện đại, phù hợp mọi hoạt động.'
            }}
          </p>

          <!-- ATTRIBUTES -->
          <div class="attr-grid">

            <div
              class="attr-item"
              v-for="a in attributes"
              :key="a.label"
            >
              <i
                class="bi"
                :class="a.icon"
              ></i>

              <div>
                <span
                  class="attr-l"
                >
                  {{ a.label }}
                </span>

                <strong>
                  {{ a.value }}
                </strong>
              </div>
            </div>

          </div>

          <!-- ================================================= -->
          <!-- COLOR -->
          <!-- ================================================= -->

          <div
            class="picker"
            v-if="
              colorList.length
            "
          >

            <label>
              Màu sắc:

              <strong>
                {{
                  selColor?.color_label
                }}
              </strong>
            </label>

            <div class="color-wrap">

              <button
                v-for="c in colorList"
                :key="
                  c.color_name
                "
                class="color-dot"
                :class="{
                  active:
                    selColor?.color_name ===
                    c.color_name,

                  'color-oos':
                    isColorOutOfStock(
                      c
                    )
                }"
                :style="{
                  background:
                    c.hex
                }"
                :title="
                  isColorOutOfStock(c)
                    ? `${c.color_label} - HẾT HÀNG`
                    : c.color_label
                "
                @click="
                  selectColor(c)
                "
              >

                <i
                  v-if="
                    selColor?.color_name ===
                    c.color_name
                  "
                  class="bi bi-check-lg"
                ></i>

                <span
                  v-if="
                    isColorOutOfStock(c)
                  "
                  class="color-oos-line"
                ></span>

              </button>

            </div>

          </div>

          <!-- ================================================= -->
          <!-- SIZE -->
          <!-- ================================================= -->

          <div
            class="picker"
            v-if="
              availableSizes.length
            "
          >

            <label>
              Kích cỡ:

              <strong>
                {{ selSize }}
              </strong>
            </label>

            <div class="size-wrap">

              <button
                v-for="s in availableSizes"
                :key="
                  s.size_name
                "
                class="size-box"
                :class="{
                  active:
                    selSize ===
                    s.size_name,

                  'size-oos':
                    isSizeOutOfStock(
                      s.size_name
                    )
                }"
                :title="
                  isSizeOutOfStock(
                    s.size_name
                  )
                    ? `Size ${s.size_name} - HẾT HÀNG`
                    : `Size ${s.size_name} - Còn ${getSizeStock(s.size_name)} sản phẩm`
                "
                @click="
                  selSize =
                    s.size_name;
                  qty = 1
                "
              >

                {{ s.size_name }}

                <span
                  v-if="
                    isSizeOutOfStock(
                      s.size_name
                    )
                  "
                  class="size-oos-text"
                >
                  Hết
                </span>

              </button>

            </div>

            <!-- ================================================= -->
            <!-- STOCK CỦA RIÊNG BIẾN THỂ -->
            <!-- ================================================= -->

            <div
              v-if="
                selSize &&
                selColor
              "
              class="stock-info mt-3"
            >

              <template
                v-if="
                  selectedVariantOutOfStock
                "
              >
                <i
                  class="bi bi-x-circle-fill"
                ></i>

                <strong>
                  Size
                  {{ selSize }}
                  -
                  {{
                    selColor.color_name
                  }}
                  đã hết hàng
                </strong>
              </template>

              <template v-else>
                <i
                  class="bi bi-box-seam"
                ></i>

                <span>
                  Tồn kho:

                  <strong>
                    {{ availableStock }}
                  </strong>

                  sản phẩm
                </span>
              </template>

            </div>

          </div>

          <p
            v-else
            class="text-muted small"
          >
            Sản phẩm chưa cấu hình
            biến thể.
          </p>

          <!-- ================================================= -->
          <!-- ENTIRE PRODUCT OUT OF STOCK -->
          <!-- ================================================= -->

          <div
            v-if="
              isEntireProductOutOfStock
            "
            class="buy-row flex-column gap-2"
          >

            <button
              class="btn-sg btn-sg-oos flex-grow-1 w-100"
              disabled
            >
              <i
                class="bi bi-x-circle me-2"
              ></i>

              HẾT HÀNG
            </button>

            <div
              class="oos-notice"
            >
              <i
                class="bi bi-info-circle-fill me-1"
              ></i>

              Tất cả biến thể của
              sản phẩm hiện đã hết
              hàng.

              <router-link
                to="/products"
                class="oos-link"
              >
                Xem sản phẩm khác →
              </router-link>
            </div>

          </div>

          <!-- ================================================= -->
          <!-- SELECTED VARIANT OUT OF STOCK -->
          <!-- ================================================= -->

          <div
            v-else-if="
              selectedVariantOutOfStock
            "
            class="buy-row flex-column gap-2"
          >

            <button
              class="btn-sg btn-sg-oos flex-grow-1 w-100"
              disabled
            >
              <i
                class="bi bi-x-circle me-2"
              ></i>

              BIẾN THỂ NÀY HẾT HÀNG
            </button>

            <div
              class="oos-notice"
            >
              <i
                class="bi bi-info-circle-fill me-1"
              ></i>

              Size
              <strong>
                {{ selSize }}
              </strong>

              -
              <strong>
                {{
                  selColor?.color_name
                }}
              </strong>

              đã hết hàng.

              <span>
                Vui lòng chọn size hoặc
                màu khác.
              </span>
            </div>

          </div>

          <!-- ================================================= -->
          <!-- BUY -->
          <!-- ================================================= -->

          <div
            v-else
            class="buy-row"
          >

            <!-- QUANTITY -->
            <div class="qty-box">

              <button
                @click="
                  decrementQty
                "
              >
                <i
                  class="bi bi-dash"
                ></i>
              </button>

              <span>
                {{ qty }}
              </span>

              <button
                @click="
                  incrementQty
                "
              >
                <i
                  class="bi bi-plus"
                ></i>
              </button>

            </div>

            <!-- ADD -->
            <button
              class="btn-sg flex-grow-1"
              @click="
                handleAdd
              "
            >
              <i
                class="bi bi-bag-plus me-2"
              ></i>

              Thêm vào giỏ hàng
            </button>

          </div>

          <!-- TRUST -->
          <div class="trust-row">

            <span>
              <i
                class="bi bi-shield-check"
              ></i>

              Chính hãng
            </span>

            <span>
              <i
                class="bi bi-truck"
              ></i>

              Giao 24h
            </span>

            <span>
              <i
                class="bi bi-arrow-repeat"
              ></i>

              Đổi trả 14 ngày
            </span>

          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  background: var(--sg-canvas);
  min-height: 100vh;
}

.detail-media {
  position: relative;
  border-radius: 0;
  overflow: hidden;
  background: #f9f9f9;
  aspect-ratio: 1 / 1;
  box-shadow: none;
  border: 1px solid var(--sg-line);
}

.detail-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  mix-blend-mode: multiply;
}

.detail-tag {
  position: absolute;
  top: 16px;
  left: 16px;
  background: #000;
  color: #fff;
  font-size: .72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .06em;
  padding: .3rem .8rem;
  border-radius: 0;
  z-index: 2;
}

.thumb-row {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.thumb {
  width: 74px;
  height: 74px;
  border-radius: 0;
  overflow: hidden;
  border: 1px solid var(--sg-line);
  background: #f9f9f9;
  padding: 0;
  transition: .2s;
  cursor: pointer;
}

.thumb.active {
  border-color: var(--sg-blue);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, .25);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  mix-blend-mode: multiply;
}

.detail-breadcrumb {
  font-size: .82rem;
  color: var(--sg-muted);
  margin-bottom: 10px;
}

.detail-breadcrumb a {
  color: var(--sg-muted);
  text-decoration: none;
}

.detail-breadcrumb a:hover {
  color: var(--sg-blue);
}

.detail-name {
  font-weight: 900;
  font-size: 2rem;
  letter-spacing: -.02em;
}

.detail-price {
  font-weight: 900;
  font-size: 1.8rem;
  color: var(--sg-blue-700);
  margin: 6px 0 16px;
}

.detail-desc {
  color: var(--sg-ink-2);
  line-height: 1.7;
}

.attr-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 20px 0;
}

.attr-item {
  display: flex;
  gap: 10px;
  align-items: center;
  background: #fff;
  border: 1px solid var(--sg-line);
  border-radius: 0;
  padding: 10px 12px;
}

.attr-item i {
  font-size: 1.2rem;
  color: var(--sg-blue);
}

.attr-l {
  display: block;
  font-size: .72rem;
  color: var(--sg-muted);
}

.attr-item strong {
  font-size: .9rem;
}

.picker {
  margin: 16px 0;
}

.picker label {
  font-weight: 700;
  font-size: .9rem;
  margin-bottom: 8px;
  display: block;
}

.color-wrap {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.color-dot {
  width: 42px;
  height: 42px;
  border-radius: 0;
  border: 1px solid #ccc;
  color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: .2s;
  cursor: pointer;
  position: relative;
}

.color-dot:hover {
  border-color: #0A0A0A;
}

.color-dot.active {
  box-shadow: 0 0 0 2px #0A0A0A;
  border-color: #0A0A0A;
  color: #fff;
}

.color-dot.color-oos {
  opacity: .55;
}

.color-oos-line {
  position: absolute;
  width: 48px;
  height: 2px;
  background: #dc2626;
  transform: rotate(-45deg);
}

.size-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.size-box {
  width: 58px;
  height: 50px;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 0;
  font-weight: 700;
  transition: .2s;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0A0A0A;
  position: relative;
}

.size-box:hover {
  border-color: #0A0A0A;
}

.size-box.active {
  background: #0A0A0A;
  color: #fff;
  border-color: #0A0A0A;
}

.size-box.size-oos {
  color: #9ca3af;
  background: #f3f4f6;
  text-decoration: line-through;
  border-color: #e5e7eb;
}

.size-box.size-oos:hover {
  border-color: #dc2626;
}

.size-oos-text {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 8px;
  line-height: 1;
  color: #dc2626;
  text-decoration: none;
}

.stock-info {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  font-size: .9rem;
}

.stock-info i {
  color: #16a34a;
}

.stock-info strong {
  font-weight: 800;
}

.buy-row {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.qty-box {
  display: flex;
  align-items: center;
  border: 1px solid var(--sg-line);
  border-radius: 0;
  overflow: hidden;
}

.qty-box button {
  width: 44px;
  height: 48px;
  border: 0;
  background: #fff;
  font-size: 1.1rem;
}

.qty-box button:hover {
  background: var(--sg-canvas);
}

.qty-box span {
  width: 44px;
  text-align: center;
  font-weight: 800;
}

.trust-row {
  display: flex;
  gap: 18px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.trust-row span {
  font-size: .85rem;
  color: var(--sg-ink-2);
  font-weight: 600;
}

.trust-row i {
  color: #16a34a;
  margin-right: 5px;
}

.btn-sg-oos {
  background: #9ca3af !important;
  border-color: #9ca3af !important;
  cursor: not-allowed !important;
  opacity: .7;
}

.oos-notice {
  font-size: .88rem;
  color: #6b7280;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px 14px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  flex-wrap: wrap;
}

.oos-notice i {
  color: #f59e0b;
  flex-shrink: 0;
  margin-top: 2px;
}

.oos-link {
  display: inline-block;
  margin-left: 6px;
  color: #2563eb;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.oos-link:hover {
  text-decoration: underline;
}

@media (max-width: 576px) {
  .attr-grid {
    grid-template-columns: 1fr;
  }

  .detail-name {
    font-size: 1.6rem;
  }

  .detail-price {
    font-size: 1.5rem;
  }
}
</style>
