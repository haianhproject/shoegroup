<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  addToCart,
  formatCurrency,
  showDrawer
} from '../stores/cartStore'
import { notify } from '../stores/uiStore'
import { api } from '../services/apiClient'

const route = useRoute()
const router = useRouter()

const product = ref(null)
const variants = ref([])
const colorList = ref([])
const sizeList = ref([])
const isLoading = ref(true)
const loadError = ref('')

const selSize = ref(null)
const selColor = ref(null)
const activeImage = ref('')
const qty = ref(1)

const originalPrice = computed(() => {
  const value = Number(product.value?.price ?? product.value?.BasePrice ?? 0)
  return Number.isFinite(value) && value > 0 ? value : 0
})
const salePrice = computed(() => {
  const value = Number(product.value?.sale_price ?? product.value?.SalePrice ?? 0)
  return Number.isFinite(value) && value > 0 ? value : 0
})
const hasDiscount = computed(() =>
  originalPrice.value > 0 && salePrice.value > 0 && salePrice.value < originalPrice.value,
)
const displayPrice = computed(() => hasDiscount.value ? salePrice.value : originalPrice.value)
const discountPercent = computed(() => hasDiscount.value
  ? ((originalPrice.value - salePrice.value) / originalPrice.value) * 100
  : 0)
const discountLabel = computed(() => {
  if (!discountPercent.value) return ''
  const rounded = Math.round(discountPercent.value * 1000) / 1000
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(rounded)
})

// ============================================================
// FETCH PRODUCT
// ============================================================

const fetchData = async () => {
  const id = Number(route.params.id)

  isLoading.value = true
  product.value = null
  variants.value = []
  colorList.value = []
  sizeList.value = []
  loadError.value = ''
  if (!Number.isSafeInteger(id) || id <= 0) {
    loadError.value = 'Sản phẩm không hợp lệ.'
    isLoading.value = false
    return
  }

  try {
    const [productsResult, categoriesResult, brandsResult, materialsResult, collectionsResult] = await Promise.allSettled([
      api.get('/products'),
      api.get('/categories'),
      api.get('/brands'),
      api.get('/materials'),
      api.get('/collections'),
    ])
    const dp = productsResult.status === 'fulfilled' ? productsResult.value : []
    const rowsOf = (result) => {
      const payload = result?.status === 'fulfilled' ? result.value : []
      return Array.isArray(payload) ? payload : (payload?.data || payload?.items || [])
    }
    const categories = rowsOf(categoriesResult)
    const brands = rowsOf(brandsResult)
    const materials = rowsOf(materialsResult)
    const collections = rowsOf(collectionsResult)
    const findName = (rows, id, names) => {
      if (id == null) return ''
      const row = rows.find((item) => String(item.id ?? item.id_category ?? item.id_brand ?? item.id_material ?? item.id_collection) === String(id))
      return row ? (names.map((key) => row[key]).find(Boolean) || '') : ''
    }

    const raw = Array.isArray(dp)
      ? dp.find((p) => Number(p.id) === id)
      : null

    if (raw) {
      const categoryId = raw.category_id ?? raw.id_category
      const brandId = raw.brand_id ?? raw.id_brand
      const categoryRow = categories.find((item) => String(item.id ?? item.id_category) === String(categoryId))
      product.value = {
        id_product: raw.id,
        product_name: raw.name ?? raw.product_name,
        price: raw.price ?? raw.base_price ?? raw.BasePrice,
        sale_price: raw.sale_price ?? raw.discount_price ?? raw.SalePrice,
        category_name: raw.category_name ?? raw.category ?? findName(categories, categoryId, ['name', 'category_name']),
        sport: raw.sport ?? categoryRow?.sport ?? '',
        description: raw.description ?? raw.Description ?? '',
        material_name: raw.material_name ?? raw.material ?? findName(materials, raw.material_id, ['name', 'material_name']),
        brand_name: raw.brand_name ?? raw.brand ?? findName(brands, brandId, ['name', 'brand_name']),
        collection_name: raw.collection_name ?? raw.collection ?? findName(collections, raw.collection_id, ['name', 'collection_name']),
        image_url: raw.image_url ?? raw.image ?? raw.ImageURL,
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
    } else {
      loadError.value = 'Không tìm thấy sản phẩm này.'
    }
  } catch (error) {
    console.error(
      'Lỗi tải sản phẩm:',
      error
    )

    // Không tự tạo biến thể giả
    product.value = null
    loadError.value = 'Không thể tải sản phẩm. Vui lòng thử lại.'
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
      icon: 'icon-tag',
      label: 'Thương hiệu',
      value: p.brand_name
    },
    {
      icon: 'icon-grid',
      label: 'Danh mục',
      value: p.category_name
    },
    {
      icon: 'icon-activity',
      label: 'Bộ môn',
      value: p.sport
    },
    {
      icon: 'icon-layers',
      label: 'Chất liệu',
      value: p.material_name
    },
    {
      icon: 'icon-collection',
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

const handleAdd = ({ openDrawer = true } = {}) => {
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

  if (openDrawer) showDrawer()

  notify({
    type: 'success',
    title:
      'Đã thêm vào giỏ hàng',
    message:
      `${product.value.product_name} - Size ${selSize.value} - ${selColor.value.color_name}`,
    duration: 3000
  })

  return true
}

const handleBuyNow = () => {
  // Cả hai CTA dùng cùng payload, kiểm tra variant và tồn kho của giỏ hàng.
  if (handleAdd({ openDrawer: false })) {
    router.push('/checkout')
  }
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
  <main class="detail-page">
    <div class="detail-container">
      <div v-if="isLoading" class="detail-loading" role="status">
        <div class="sg-spinner" aria-hidden="true"></div>
        <span class="sr-only">Đang tải sản phẩm</span>
      </div>

      <template v-else-if="product">
        <nav class="detail-breadcrumb" aria-label="Đường dẫn">
          <router-link to="/">Trang chủ</router-link>
          <span aria-hidden="true">/</span>
          <router-link to="/products">Sản phẩm</router-link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{{ product.product_name }}</span>
        </nav>

        <div class="detail-grid">
          <section class="detail-gallery" aria-label="Hình ảnh sản phẩm">
            <div class="detail-media">
              <span v-if="product.sport" class="detail-tag">{{ product.sport }}</span>
              <img :src="activeImage || product.image_url" :alt="product.product_name" />
            </div>
            <div v-if="galleryImages.length > 1" class="thumb-row">
              <button
                v-for="(img, i) in galleryImages"
                :key="img"
                type="button"
                class="thumb"
                :class="{ active: activeImage === img }"
                :aria-label="`Xem ảnh ${i + 1} của ${product.product_name}`"
                :aria-pressed="activeImage === img"
                @click="activeImage = img"
              >
                <img :src="img" :alt="`Ảnh ${i + 1} của ${product.product_name}`" />
              </button>
            </div>
          </section>

          <section class="detail-info" aria-labelledby="product-name">
            <div v-if="product.brand_name || product.category_name" class="detail-meta">
              <span v-if="product.brand_name">{{ product.brand_name }}</span>
              <span v-if="product.brand_name && product.category_name" aria-hidden="true">·</span>
              <span v-if="product.category_name">{{ product.category_name }}</span>
            </div>
            <h1 id="product-name" class="detail-name">{{ product.product_name }}</h1>

            <div class="detail-price">
              <span class="detail-price-current">{{ formatCurrency(displayPrice) }}</span>
              <span v-if="hasDiscount" class="detail-price-old">{{ formatCurrency(originalPrice) }}</span>
              <span v-if="hasDiscount" class="detail-discount">-{{ discountLabel }}%</span>
            </div>
            <p v-if="product.description" class="detail-desc">{{ product.description }}</p>

            <fieldset v-if="colorList.length" class="picker">
              <legend>Màu sắc: <span>{{ selColor?.color_label }}</span></legend>
              <div class="color-wrap">
                <button
                  v-for="c in colorList"
                  :key="c.color_name"
                  type="button"
                  class="color-dot"
                  :class="{
                    active: selColor?.color_name === c.color_name,
                    'color-oos': isColorOutOfStock(c)
                  }"
                  :style="{ background: c.hex }"
                  :title="isColorOutOfStock(c) ? `${c.color_label} - HẾT HÀNG` : c.color_label"
                  :aria-label="isColorOutOfStock(c) ? `${c.color_label} - hết hàng` : c.color_label"
                  :aria-pressed="selColor?.color_name === c.color_name"
                  @click="selectColor(c)"
                >
                  <span v-if="isColorOutOfStock(c)" class="color-oos-line" aria-hidden="true"></span>
                </button>
              </div>
            </fieldset>

            <fieldset v-if="availableSizes.length" class="picker">
              <legend>Chọn kích cỡ <span v-if="selSize">· {{ selSize }}</span></legend>
              <div class="size-wrap">
                <button
                  v-for="s in availableSizes"
                  :key="s.size_name"
                  type="button"
                  class="size-box"
                  :class="{
                    active: selSize === s.size_name,
                    'size-oos': isSizeOutOfStock(s.size_name)
                  }"
                  :title="isSizeOutOfStock(s.size_name)
                    ? `Size ${s.size_name} - HẾT HÀNG`
                    : `Size ${s.size_name} - Còn ${getSizeStock(s.size_name)} sản phẩm`"
                  :aria-label="isSizeOutOfStock(s.size_name) ? `Size ${s.size_name} - hết hàng` : `Size ${s.size_name}`"
                  :aria-pressed="selSize === s.size_name"
                  @click="selSize = s.size_name; qty = 1"
                >
                  {{ s.size_name }}
                  <span v-if="isSizeOutOfStock(s.size_name)" class="size-oos-text">Hết</span>
                </button>
              </div>
              <div v-if="selSize && selColor" class="stock-info" aria-live="polite">
                <template v-if="selectedVariantOutOfStock">
                  <i class="icon icon-x-circle-fill" aria-hidden="true"></i>
                  <span>Size {{ selSize }} - {{ selColor.color_name }} đã hết hàng</span>
                </template>
                <template v-else>
                  <i class="icon icon-box-seam" aria-hidden="true"></i>
                  <span>Tồn kho: <strong>{{ availableStock }}</strong> sản phẩm</span>
                </template>
              </div>
            </fieldset>
            <p v-else class="detail-desc">Sản phẩm chưa cấu hình biến thể.</p>

            <div v-if="isEntireProductOutOfStock" class="purchase-unavailable">
              <button type="button" class="detail-cta detail-cta-primary" disabled>Hết hàng</button>
              <div class="oos-notice">
                <p>Tất cả biến thể của sản phẩm hiện đã hết hàng.</p>
                <router-link to="/products">Xem sản phẩm khác →</router-link>
              </div>
            </div>
            <div v-else-if="selectedVariantOutOfStock" class="purchase-unavailable">
              <button type="button" class="detail-cta detail-cta-primary" disabled>Biến thể này hết hàng</button>
              <p class="oos-notice">
                Size <strong>{{ selSize }}</strong> - <strong>{{ selColor?.color_name }}</strong> đã hết hàng.
                Vui lòng chọn size hoặc màu khác.
              </p>
            </div>
            <div v-else class="purchase-actions">
              <div class="buy-row">
                <div class="qty-box" role="group" aria-label="Số lượng">
                  <button type="button" aria-label="Giảm số lượng" :disabled="qty <= 1" @click="decrementQty">
                    <i class="icon icon-dash" aria-hidden="true"></i>
                  </button>
                  <span aria-live="polite">{{ qty }}</span>
                  <button type="button" aria-label="Tăng số lượng" @click="incrementQty">
                    <i class="icon icon-plus" aria-hidden="true"></i>
                  </button>
                </div>
                <button type="button" class="detail-cta detail-cta-outline" @click="handleAdd()">Thêm vào giỏ</button>
              </div>
              <button type="button" class="detail-cta detail-cta-primary" @click="handleBuyNow">Mua ngay</button>
            </div>

            <div class="trust-row">
              <div><i class="icon icon-shield-check" aria-hidden="true"></i><span>Chính hãng</span></div>
              <div><i class="icon icon-truck" aria-hidden="true"></i><span>Giao 24h</span></div>
              <div><i class="icon icon-arrow-repeat" aria-hidden="true"></i><span>Đổi trả 14 ngày</span></div>
            </div>

            <dl v-if="attributes.length" class="attr-grid">
              <div v-for="a in attributes" :key="a.label" class="attr-item">
                <dt>{{ a.label }}</dt>
                <dd>{{ a.value }}</dd>
              </div>
            </dl>
          </section>
        </div>
      </template>

      <div v-else class="detail-empty">
        <i class="icon icon-search" aria-hidden="true"></i>
        <h1>Không tìm thấy sản phẩm</h1>
        <p>{{ loadError || 'Sản phẩm này không còn khả dụng.' }}</p>
        <router-link to="/products" class="detail-cta detail-cta-primary">Quay lại sản phẩm</router-link>
      </div>
    </div>
  </main>
</template>

<style scoped>
.detail-page {
  background: var(--sg-surface);
  min-height: calc(100vh - 69px);
}
.detail-container {
  max-width: 1200px;
  margin-inline: auto;
  padding: 24px 24px 80px;
}
.detail-loading {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}
.detail-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
  color: var(--sg-muted);
  font-size: 12px;
  line-height: 1.7;
}
.detail-breadcrumb a {
  color: inherit;
  text-decoration: none;
  transition: color .2s ease;
}
.detail-breadcrumb a:hover,
.detail-breadcrumb [aria-current="page"] {
  color: var(--sg-ink);
}
.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: 32px;
}
.detail-gallery,
.detail-info {
  min-width: 0;
}
.detail-page .detail-media {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border: 0;
  border-radius: 16px;
  background: var(--sg-soft);
}
.detail-media img,
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.detail-page .detail-tag {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--sg-ink);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
}
.thumb-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.thumb {
  aspect-ratio: 1;
  overflow: hidden;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 12px;
  background: var(--sg-soft);
  cursor: pointer;
  transition: border-color .2s ease;
}
.thumb:hover { border-color: #d4d4d4; }
.thumb.active { border-color: var(--sg-ink); }
.detail-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
  color: var(--sg-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .15em;
  text-transform: uppercase;
}
.detail-name {
  margin: 0 0 20px;
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -.025em;
}
.detail-price {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}
.detail-price-current {
  color: var(--sg-ink);
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 600;
  line-height: 1.2;
}
.detail-price-old {
  color: var(--sg-muted);
  font-size: 16px;
  text-decoration: line-through;
}
.detail-page .detail-discount {
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--sg-soft);
  color: var(--sg-ink);
  font-size: 10px;
  font-weight: 700;
}
.detail-desc {
  margin: 0 0 24px;
  color: var(--sg-muted);
  font-size: 14px;
  line-height: 1.75;
}
.picker {
  min-width: 0;
  margin: 0 0 24px;
  padding: 0;
  border: 0;
}
.picker legend {
  margin-bottom: 10px;
  padding: 0;
  color: var(--sg-ink);
  font-size: 13px;
  font-weight: 600;
}
.picker legend span {
  color: var(--sg-muted);
  font-weight: 400;
}
.color-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 3px;
}
.color-dot {
  position: relative;
  width: 36px;
  height: 36px;
  border: 1px solid var(--sg-line);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.color-dot:hover { border-color: var(--sg-ink); }
.color-dot.active {
  box-shadow: 0 0 0 2px #fff, 0 0 0 3px var(--sg-ink);
}
.color-dot.color-oos { opacity: .5; }
.color-oos-line {
  position: absolute;
  inset: 50% 0 auto;
  height: 1px;
  background: var(--sg-muted);
  transform: rotate(-45deg);
}
.size-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.size-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 44px;
  padding: 0 10px;
  border: 1px solid var(--sg-line);
  border-radius: 8px;
  background: #fff;
  color: var(--sg-ink);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color .2s ease, background-color .2s ease, color .2s ease;
}
.size-box:hover { border-color: var(--sg-ink); }
.size-box.active {
  border-color: var(--sg-ink);
  background: var(--sg-ink);
  color: #fff;
}
.size-box.size-oos {
  background: var(--sg-soft);
  color: var(--sg-muted);
  text-decoration: line-through;
}
.size-box.size-oos.active { border-color: var(--sg-ink); }
.size-oos-text {
  position: absolute;
  right: 4px;
  bottom: 3px;
  color: var(--sg-muted);
  font-size: 8px;
  line-height: 1;
  text-decoration: none;
}
.stock-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  color: var(--sg-muted);
  font-size: 12px;
  line-height: 1.6;
}
.stock-info i { color: var(--sg-ink); }
.stock-info strong { font-weight: 600; }
.purchase-actions,
.purchase-unavailable { margin-bottom: 24px; }
.buy-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.qty-box {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  height: 48px;
  overflow: hidden;
  border: 1px solid var(--sg-line);
  border-radius: 8px;
}
.qty-box button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 100%;
  border: 0;
  background: #fff;
  cursor: pointer;
  transition: background-color .2s ease;
}
.qty-box button:hover:not(:disabled) { background: var(--sg-soft); }
.qty-box button:disabled { color: #a3a3a3; cursor: default; }
.qty-box span {
  width: 40px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
}
.detail-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 10px 16px;
  border: 1px solid var(--sg-ink);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition: background-color .2s ease;
}
.detail-cta-outline {
  flex: 1;
  background: #fff;
  color: var(--sg-ink);
}
.detail-cta-outline:hover { background: var(--sg-soft); }
.detail-cta-primary {
  width: 100%;
  background: var(--sg-ink);
  color: #fff;
}
.detail-cta-primary:hover { background: #333; }
.detail-cta:disabled {
  border-color: var(--sg-line);
  background: var(--sg-soft);
  color: var(--sg-muted);
  cursor: not-allowed;
}
.trust-row {
  display: grid;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid var(--sg-line);
}
.trust-row > div {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--sg-ink);
  font-size: 13px;
  font-weight: 600;
}
.trust-row i { font-size: 17px; }
.attr-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--sg-line);
}
.attr-item dt {
  margin-bottom: 4px;
  color: var(--sg-muted);
  font-size: 11px;
}
.attr-item dd {
  margin: 0;
  color: var(--sg-ink);
  font-size: 13px;
  line-height: 1.6;
}
.oos-notice {
  margin-top: 12px;
  padding: 12px 14px;
  border: 1px solid var(--sg-line);
  border-radius: 8px;
  background: #fafafa;
  color: var(--sg-muted);
  font-size: 12px;
  line-height: 1.7;
}
.oos-notice a {
  display: inline-block;
  margin-top: 4px;
  color: var(--sg-ink);
  text-underline-offset: 4px;
}
.detail-empty {
  max-width: 480px;
  margin-inline: auto;
  padding: 80px 0;
  text-align: center;
}
.detail-empty > i { font-size: 32px; }
.detail-empty h1 {
  margin: 20px 0 12px;
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 600;
}
.detail-empty p {
  color: var(--sg-muted);
  font-size: 14px;
  line-height: 1.7;
}
.detail-empty .detail-cta { width: auto; margin-top: 24px; }
.detail-page button:focus-visible,
.detail-page a:focus-visible {
  outline: 2px solid var(--sg-ink);
  outline-offset: 4px;
}
@media (min-width: 768px) {
  .detail-name { font-size: 36px; }
}
@media (min-width: 1024px) {
  .detail-container { padding-inline: 40px; }
  .detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 56px; }
  .detail-gallery { position: sticky; top: 92px; }
}
@media (max-width: 374px) {
  .detail-container { padding-inline: 16px; }
  .qty-box button { width: 36px; }
  .qty-box span { width: 32px; }
  .detail-cta { padding-inline: 12px; font-size: 13px; }
}
@media (prefers-reduced-motion: reduce) {
  .detail-page button,
  .detail-page a { transition: none; }
}
</style>
