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
import FigmaProductCard from '../components/figma/product/FigmaProductCard.vue'

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
const relatedProducts = ref([])

const trustItems = [
  { icon: 'truck', title: 'Giao hàng toàn quốc', sub: 'Xem phí khi thanh toán' },
  { icon: 'return', title: 'Yêu cầu trả hàng', sub: 'Trong 14 ngày từ khi nhận' },
  { icon: 'shield', title: 'Chính hãng 100%', sub: 'Cam kết hoàn tiền' },
  { icon: 'support', title: 'Hỗ trợ 24/7', sub: 'Luôn sẵn sàng' }
]
const trustIcons = {
  truck: '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  return: '<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>',
  support: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-3v-8h3a2 2 0 0 1 2 2z"/><path d="M3 19a2 2 0 0 0 2 2h3v-8H5a2 2 0 0 0-2 2z"/>'
}

const fetchRelatedProducts = async (currentId, categoryId, brandId) => {
  try {
    const list = await api.get('/products')
    const rows = Array.isArray(list) ? list : (list?.data || list?.products || [])

    const getStock = (p) => {
      let ts = p.total_stock ?? p.stock_quantity ?? p.stock
      if (ts === null || ts === undefined || ts === '' || ts === 'null') {
        const vars = p.variants || []
        ts = vars.length > 0 ? vars.reduce((s, v) => s + (Number(v.stock) || 0), 0) : 0
      }
      const n = Number(ts)
      return isNaN(n) ? 0 : n
    }

    // Lọc sản phẩm khác sản phẩm hiện tại và đang active
    const candidates = rows.filter((p) => {
      const pid = Number(p.id ?? p.id_product)
      if (pid === Number(currentId)) return false
      if (p.active === false || p.active === 0 || p.active === '0') return false
      return true
    })

    const currentPrice = Number(product.value?.price || 0)

    // Thuật toán đề xuất thông minh: Ưu tiên còn hàng + cùng danh mục/thương hiệu/môn thể thao
    const scored = candidates.map((p) => {
      const pStock = getStock(p)
      const pCat = p.category_id ?? p.id_category
      const pBrand = p.brand_id ?? p.id_brand
      let score = 0

      // Ưu tiên sản phẩm còn hàng
      if (pStock > 0) score += 1000

      if (categoryId && String(pCat) === String(categoryId)) score += 50
      if (brandId && String(pBrand) === String(brandId)) score += 30
      if (product.value?.sport && p.sport === product.value.sport) score += 20

      const price = Number(p.price || 0)
      if (currentPrice > 0 && price > 0 && Math.abs(price - currentPrice) / currentPrice < 0.3) {
        score += 10
      }

      return { p, stock: pStock, score }
    })

    scored.sort((a, b) => b.score - a.score)

    // Lấy 5 sản phẩm đề xuất (ưu tiên tuyệt đối sản phẩm còn hàng)
    let selected = scored.filter(item => item.stock > 0).slice(0, 5)
    if (selected.length < 5) {
      const existingIds = new Set(selected.map(i => Number(i.p.id ?? i.p.id_product)))
      for (const item of scored) {
        if (!existingIds.has(Number(item.p.id ?? item.p.id_product))) {
          selected.push(item)
          if (selected.length >= 5) break
        }
      }
    }

    relatedProducts.value = selected.map(({ p, stock }) => ({
      id_product: p.id ?? p.id_product,
      product_name: p.name ?? p.product_name,
      price: p.price,
      sale_price: p.sale_price,
      image_url: p.image_url ?? p.img,
      brand_name: p.brand_name ?? p.brand ?? '',
      sport: p.sport,
      tag: p.tag,
      is_new: p.is_new ?? p.new_arrival,
      is_featured: p.is_featured,
      total_stock: stock,
      stock_quantity: stock,
      stock: stock,
      variants: p.variants || [],
      colors: p.colors || [],
      sizes: p.sizes || []
    }))
  } catch (_) {
    relatedProducts.value = []
  }
}

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
          null,

        note:
          c.note ??
          ''
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
      if (product.value) {
        fetchRelatedProducts(id, categoryId, brandId)
      }
    } else {
      loadError.value = 'Không tìm thấy sản phẩm này.'
    }
  } catch (error) {
    console.error(
      'Lỗi tải sản phẩm:',
      error
    )

    product.value = null
    loadError.value = 'Không thể tải sản phẩm. Vui lòng thử lại.'
    variants.value = []
    colorList.value = []
    sizeList.value = []
  } finally {
    isLoading.value = false

    if (colorList.value.length > 0) {
      selColor.value = colorList.value[0]
    } else {
      selColor.value = null
    }

    activeImage.value =
      selColor.value?.image ||
      product.value?.image_url ||
      ''

    // Tự động chọn size nếu chỉ còn đúng 1 size (hoặc chỉ 1 size còn hàng)
    const inStock = availableSizes.value.filter((s) => !isSizeOutOfStock(s.size_name))
    if (inStock.length === 1) {
      selSize.value = inStock[0].size_name
    } else if (availableSizes.value.length === 1) {
      selSize.value = availableSizes.value[0]?.size_name || null
    } else if (sizeList.value.length === 1) {
      selSize.value = sizeList.value[0]?.size_name || null
    } else if (inStock.length > 0) {
      selSize.value = inStock[0].size_name
    } else {
      selSize.value = availableSizes.value[0]?.size_name || null
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
    activeImage.value = color.image
  }

  const sizes = availableSizes.value
  const inStock = sizes.filter((s) => !isSizeOutOfStock(s.size_name))

  // Tự động chọn size nếu chỉ còn đúng 1 size (hoặc 1 size còn hàng)
  if (inStock.length === 1) {
    selSize.value = inStock[0].size_name
  } else if (sizes.length === 1) {
    selSize.value = sizes[0].size_name
  } else if (!sizes.some((s) => String(s.size_name) === String(selSize.value))) {
    const available = inStock[0] || sizes[0]
    selSize.value = available?.size_name ?? null
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
  // CHƯA CHỌN SIZE -> TỰ ĐỘNG CHỌN NẾU CHỈ CÒN 1 SIZE
  // ----------------------------------------------------------

  if (!selSize.value) {
    const inStock = availableSizes.value.filter((s) => !isSizeOutOfStock(s.size_name))
    if (inStock.length === 1) {
      selSize.value = inStock[0].size_name
    } else if (availableSizes.value.length === 1) {
      selSize.value = availableSizes.value[0]?.size_name || null
    } else if (sizeList.value.length === 1) {
      selSize.value = sizeList.value[0]?.size_name || null
    }
  }

  if (!selSize.value) {
    notify({
      type: 'error',
      message: 'Vui lòng chọn kích cỡ.'
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
  <main class="min-h-screen bg-white pt-6 pb-20">
    <div class="max-w-[1200px] mx-auto px-6 lg:px-10">

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center py-32" role="status">
        <div class="sg-spinner" aria-hidden="true"></div>
        <span class="sr-only">Đang tải sản phẩm</span>
      </div>

      <!-- Detail Content -->
      <template v-else-if="product">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-xs text-[#737373] mb-6" aria-label="Đường dẫn">
          <router-link to="/" class="hover:text-[#0E0E0E] transition-colors">Trang chủ</router-link>
          <span>/</span>
          <router-link to="/products" class="hover:text-[#0E0E0E] transition-colors">Sản phẩm</router-link>
          <span>/</span>
          <span class="text-[#0E0E0E] font-medium truncate max-w-xs">{{ product.product_name }}</span>
        </nav>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-start">
          <!-- Gallery -->
          <div class="lg:sticky lg:top-[92px]">
            <div class="aspect-square rounded-2xl overflow-hidden bg-[#F0F0F0] mb-3 relative">
              <span v-if="product.sport || hasDiscount" class="absolute top-4 left-4 z-10 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded"
                :class="hasDiscount ? 'bg-[#0E0E0E] text-white' : 'bg-white text-[#0E0E0E] shadow-sm'">
                {{ hasDiscount ? `Giảm ${discountLabel}%` : product.sport }}
              </span>
              <img :src="activeImage || product.image_url" :alt="product.product_name" class="w-full h-full object-cover transition-all duration-300" />
            </div>

            <!-- Thumbnail gallery -->
            <div v-if="galleryImages.length > 1" class="grid grid-cols-4 gap-3">
              <button
                v-for="(g, gi) in galleryImages"
                :key="gi"
                type="button"
                @click="activeImage = g"
                class="aspect-square rounded-xl overflow-hidden bg-[#F0F0F0] border-2 transition-colors cursor-pointer p-0"
                :class="activeImage === g ? 'border-[#0E0E0E]' : 'border-transparent hover:border-[#D4D4D4]'"
                :aria-label="`Xem ảnh ${gi + 1}`"
              >
                <img :src="g" :alt="`Ảnh ${gi + 1}`" class="w-full h-full object-cover" />
              </button>
            </div>
          </div>

          <!-- Product Info -->
          <div>
            <div class="flex items-center gap-2.5 mb-3">
              <span class="text-[11px] font-bold tracking-[0.15em] uppercase text-[#737373]">
                {{ product.brand_name || 'ShoeGroup' }}
              </span>
              <span v-if="product.category_name" class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#F0F0F0] text-[#0E0E0E]">
                {{ product.category_name }}
              </span>
            </div>

            <h1 style="font-family:'Fraunces',serif" class="text-3xl md:text-4xl font-semibold leading-tight mb-4 text-[#0E0E0E]">
              {{ product.product_name }}
            </h1>

            <!-- Price -->
            <div class="flex items-baseline gap-3 mb-6">
              <span style="font-family:'Fraunces',serif" class="text-3xl font-semibold text-[#0E0E0E]">
                {{ formatCurrency(displayPrice) }}
              </span>
              <span v-if="hasDiscount" class="text-base text-[#737373] line-through">
                {{ formatCurrency(originalPrice) }}
              </span>
            </div>

            <!-- Description -->
            <p class="text-sm text-[#737373] leading-relaxed mb-6">
              {{ product.description || `${product.product_name} thuộc dòng ${product.category_name || 'Sneaker'} của ${product.brand_name || 'ShoeGroup'} — thiết kế tối giản, êm ái, bám sàn tốt cho cả tập luyện lẫn dạo phố hằng ngày.` }}
            </p>

            <!-- Màu sắc -->
            <div v-if="colorList.length" class="mb-6">
              <div class="text-[13px] font-semibold mb-2 text-[#0E0E0E] flex items-center flex-wrap gap-2">
                <span>Màu sắc: <span class="text-[#737373] font-normal">{{ selColor?.color_label || selColor?.color_name || 'Chọn màu' }}</span></span>
                <span v-if="selColor?.note" class="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  {{ selColor.note }}
                </span>
              </div>
              <div class="flex flex-wrap gap-2.5">
                <button
                  v-for="c in colorList"
                  :key="c.color_name"
                  type="button"
                  class="h-8 w-8 rounded-full border border-white transition-all cursor-pointer relative"
                  :class="[
                    selColor?.color_name === c.color_name ? 'ring-2 ring-[#0E0E0E] ring-offset-2 scale-105' : 'ring-1 ring-[#D4D4D4] hover:ring-[#737373]',
                    isColorOutOfStock(c) ? 'opacity-40' : ''
                  ]"
                  :style="{ background: c.hex || '#ccc' }"
                  :title="isColorOutOfStock(c) ? `${c.color_label} (Hết hàng)` : (c.note ? `${c.color_label} · ${c.note}` : c.color_label)"
                  @click="selectColor(c)"
                >
                  <span v-if="isColorOutOfStock(c)" class="absolute inset-0 m-auto w-full h-0.5 bg-red-500 rotate-45 pointer-events-none"></span>
                </button>
              </div>
            </div>

            <!-- Chọn size (UK) -->
            <div v-if="availableSizes.length" class="mb-6">
              <div class="mb-2.5">
                <span class="text-[13px] font-semibold text-[#0E0E0E]">
                  Chọn size (UK) <span v-if="selSize" class="text-[#737373] font-normal">· {{ selSize }}</span>
                </span>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="s in availableSizes"
                  :key="s.size_name"
                  type="button"
                  @click="selSize = s.size_name; qty = 1"
                  :disabled="isSizeOutOfStock(s.size_name)"
                  class="w-12 h-11 flex items-center justify-center text-sm font-semibold rounded-lg border transition-colors cursor-pointer relative"
                  :class="[
                    selSize === s.size_name ? 'bg-[#0E0E0E] text-white border-[#0E0E0E]' : 'bg-white text-[#0E0E0E] border-[#E5E5E5] hover:border-[#0E0E0E]',
                    isSizeOutOfStock(s.size_name) ? 'opacity-35 cursor-not-allowed bg-[#F9F9F9]' : ''
                  ]"
                >
                  {{ s.size_name }}
                  <span v-if="isSizeOutOfStock(s.size_name)" class="absolute -top-1 -right-1 text-[8px] bg-red-100 text-red-700 px-1 rounded font-bold">Hết</span>
                </button>
              </div>
              <div v-if="selSize && selColor" class="mt-2 text-xs" :class="selectedVariantOutOfStock ? 'text-red-600 font-semibold' : 'text-[#737373]'">
                <span v-if="selectedVariantOutOfStock">Biến thể size {{ selSize }} - {{ selColor.color_name }} đã hết hàng</span>
                <span v-else>Còn lại: <strong>{{ availableStock }}</strong> đôi trong kho</span>
              </div>
            </div>

            <!-- Số lượng + Thêm vào giỏ + Mua ngay -->
            <div v-if="isEntireProductOutOfStock" class="mb-6 p-4 rounded-xl bg-[#F5F5F5] text-center">
              <p class="text-sm font-semibold text-[#0E0E0E] mb-1">Sản phẩm hiện đã hết hàng</p>
              <router-link to="/products" class="text-xs text-[#737373] hover:underline">Xem các sản phẩm khác →</router-link>
            </div>
            <div v-else class="space-y-3 mb-6">
              <div class="flex items-center gap-3">
                <!-- Quantity Counter -->
                <div class="flex items-center border border-[#E5E5E5] rounded-lg h-12">
                  <button type="button" @click="decrementQty" :disabled="qty <= 1" aria-label="Giảm" class="w-11 h-full flex items-center justify-center hover:bg-[#F0F0F0] transition-colors bg-transparent border-none cursor-pointer rounded-l-lg disabled:opacity-40">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>
                  </button>
                  <span class="w-10 text-center text-sm font-semibold">{{ qty }}</span>
                  <button type="button" @click="incrementQty" aria-label="Tăng" class="w-11 h-full flex items-center justify-center hover:bg-[#F0F0F0] transition-colors bg-transparent border-none cursor-pointer rounded-r-lg">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                </div>

                <!-- Add to cart -->
                <button
                  type="button"
                  @click="handleAdd()"
                  :disabled="selectedVariantOutOfStock"
                  class="flex-1 h-12 bg-white text-[#0E0E0E] border border-[#0E0E0E] rounded-lg text-[14px] font-semibold hover:bg-[#F0F0F0] transition-colors cursor-pointer disabled:opacity-40"
                >
                  {{ selectedVariantOutOfStock ? 'Biến thể hết hàng' : 'Thêm vào giỏ' }}
                </button>
              </div>

              <!-- Buy now -->
              <button
                type="button"
                @click="handleBuyNow"
                :disabled="selectedVariantOutOfStock"
                class="w-full h-12 bg-[#0E0E0E] text-white rounded-lg text-[14px] font-semibold hover:bg-[#333] transition-colors border-none cursor-pointer disabled:opacity-40"
              >
                Mua ngay
              </button>
            </div>

            <!-- Cam kết dịch vụ phong cách Figma -->
            <div class="border-t border-[#E5E5E5] pt-5 space-y-3">
              <div v-for="item in trustItems" :key="item.title" class="flex items-center gap-3">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="text-[#0E0E0E] flex-shrink-0" v-html="trustIcons[item.icon]"></svg>
                <span class="text-[13px]"><span class="font-semibold text-[#0E0E0E]">{{ item.title }}</span> · <span class="text-[#737373]">{{ item.sub }}</span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sản phẩm tương tự -->
        <div v-if="relatedProducts.length" class="mt-16 pt-10 border-t border-[#E5E5E5]">
          <h2 style="font-family:'Fraunces',serif" class="text-2xl md:text-3xl font-semibold mb-6">Sản phẩm tương tự</h2>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
            <FigmaProductCard v-for="rp in relatedProducts" :key="rp.id_product" :product="rp" />
          </div>
        </div>
      </template>

      <!-- Not found -->
      <div v-else class="text-center py-28">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mx-auto text-[#D4D4D4] mb-3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <h1 style="font-family:'Fraunces',serif" class="text-2xl font-semibold mb-2">Không tìm thấy sản phẩm</h1>
        <p class="text-sm text-[#737373] mb-6">{{ loadError || 'Sản phẩm này không còn khả dụng hoặc đã bị ẩn.' }}</p>
        <router-link to="/products" class="inline-flex items-center justify-center px-6 py-3 bg-[#0E0E0E] text-white text-xs font-bold rounded-full hover:bg-[#333] transition-colors">Quay lại danh sách sản phẩm</router-link>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Clean scoped styles */
</style>
