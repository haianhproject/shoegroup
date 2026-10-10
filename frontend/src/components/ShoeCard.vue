<!-- Mục đích: Thẻ sản phẩm dùng chung, hiển thị giá, ảnh và thao tác thêm vào giỏ. -->
<script setup>
import { computed, nextTick, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { api } from "../services/apiClient"
import { variantSizeLabel } from "../services/variantSize"
import { addToCart, cartState, formatCurrency, showDrawer } from "../stores/cartStore"
import { notify } from "../stores/uiStore"
import fallbackProductImage from "../../img/hero-sneakers.jpg"

const props = defineProps({
  product: { type: Object, required: true },
})

const brandName = computed(() => props.product.brand_name || props.product.brand || "")
const baseName = computed(() => props.product.product_name || props.product.name || "")
const sportName = computed(() => props.product.sport || "")
const displayName = computed(() => (sportName.value ? `${sportName.value} - ${baseName.value}` : baseName.value))

const router = useRouter()
const productLink = computed(() => `/product/${props.product.id_product || props.product.id}`)
const onProductImageError = (event) => {
  if (event.target.dataset.fallbackApplied) return
  event.target.dataset.fallbackApplied = "true"
  event.target.src = fallbackProductImage
}

const normalizeText = (value) => String(value ?? '').trim().toLocaleLowerCase('vi-VN')
const isEnabled = (value) => !(value === false || value === 0 || value === '0')
const toStock = (value) => {
  const stock = Number(value)
  return Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0
}
const normalizeVariant = (variant) => ({
  ...variant,
  id: variant.id ?? variant.variant_id ?? variant.id_variant ?? variant.ProductVariantID ?? null,
  color: String(variant.color ?? variant.color_name ?? variant.color_label ?? variant.ColorName ?? '').trim(),
  size: String(variant.size ?? variant.size_name ?? variant.SizeName ?? '').trim(),
  stock: toStock(variant.stock ?? variant.stock_quantity ?? variant.quantity ?? variant.StockQuantity),
  active: isEnabled(variant.active ?? variant.is_active ?? variant.IsActive),
  image: variant.image ?? variant.image_url ?? variant.ImageURL ?? '',
})

const freshProduct = ref(null)
const activeProduct = computed(() => freshProduct.value || props.product)
const variants = computed(() => Array.isArray(activeProduct.value?.variants)
  ? activeProduct.value.variants.map(normalizeVariant)
  : [])
const hasVariants = computed(() => variants.value.length > 0)
const productTotalStock = computed(() => {
  if (hasVariants.value) {
    return variants.value.reduce((total, variant) => total + (variant.active ? variant.stock : 0), 0)
  }
  return toStock(activeProduct.value?.total_stock ?? activeProduct.value?.stock_quantity ?? activeProduct.value?.stock)
})
const isOutOfStock = computed(() => !isEnabled(activeProduct.value?.active ?? activeProduct.value?.IsActive)
  || productTotalStock.value <= 0)

/* Modal chon bien the */
const showVariantModal = ref(false)
const selectedColor = ref(null)
const selectedSize = ref(null)
const selectedQty = ref(1)
const isInventoryLoading = ref(false)
const isSubmitting = ref(false)
const inventoryVerified = ref(false)
const validationMessage = ref('')
const detailsPanel = ref(null)

const colorList = computed(() => {
  const options = new Map()
  for (const color of (activeProduct.value?.colors || [])) {
    const name = String(color.name ?? color.color_name ?? color.color_label ?? color.ColorName ?? '').trim()
    if (!name) continue
    options.set(normalizeText(name), {
      name,
      hex: color.hex ?? color.color_hex ?? color.ColorHex ?? '',
      image: color.image ?? color.image_url ?? color.ImageURL ?? '',
    })
  }
  for (const variant of variants.value) {
    if (!variant.color) continue
    const key = normalizeText(variant.color)
    const current = options.get(key)
    options.set(key, {
      name: current?.name || variant.color,
      hex: current?.hex || variant.hex || variant.color_hex || '',
      image: current?.image || variant.image || '',
    })
  }
  return [...options.values()]
})

const sizeList = computed(() => {
  if (!hasVariants.value) {
    return (activeProduct.value?.sizes || [])
      .map((size) => String(size?.size_name ?? size?.name ?? size).trim())
      .filter(Boolean)
  }
  const rows = selectedColor.value
    ? variants.value.filter((variant) => normalizeText(variant.color) === normalizeText(selectedColor.value.name))
    : variants.value
  return [...new Set(rows.map(variantSizeLabel).filter(Boolean))]
})

const getVariant = (colorName, sizeName) => {
  return variants.value.find((variant) =>
    normalizeText(variant.color) === normalizeText(colorName)
      && normalizeText(variantSizeLabel(variant)) === normalizeText(sizeName),
  ) || null
}

const isVariantOos = (colorName, sizeName) => {
  if (!hasVariants.value) return productTotalStock.value <= 0
  const variant = getVariant(colorName, sizeName)
  return !variant || !variant.active || variant.stock <= 0
}

const isColorOos = (colorName) => {
  if (!hasVariants.value) return productTotalStock.value <= 0
  const colorVariants = variants.value.filter((variant) => normalizeText(variant.color) === normalizeText(colorName))
  return !colorVariants.length || colorVariants.every((variant) => !variant.active || variant.stock <= 0)
}

const selectedVariantStock = computed(() => {
  if (!hasVariants.value) return productTotalStock.value
  if (!selectedColor.value || !selectedSize.value) return 0
  const v = getVariant(selectedColor.value.name, selectedSize.value)
  return v?.active ? v.stock : 0
})

const selectedVariantId = computed(() => {
  if (!selectedColor.value || !selectedSize.value) return null
  const v = getVariant(selectedColor.value.name, selectedSize.value)
  return v?.id ?? null
})
const selectedVariant = computed(() => {
  if (!selectedColor.value || !selectedSize.value) return null
  return getVariant(selectedColor.value.name, selectedSize.value)
})

const previewImage = computed(() => selectedColor.value?.image || activeProduct.value?.image_url || "")

const originalPrice = computed(() => {
  const value = Number(selectedVariant.value?.price ?? activeProduct.value?.price ?? activeProduct.value?.BasePrice ?? 0)
  return Number.isFinite(value) && value > 0 ? value : 0
})
const salePrice = computed(() => {
  const value = Number(selectedVariant.value?.sale_price ?? activeProduct.value?.sale_price ?? 0)
  return Number.isFinite(value) && value > 0 ? value : 0
})
const hasDiscount = computed(() =>
  originalPrice.value > 0 && salePrice.value > 0 && salePrice.value < originalPrice.value,
)
const badgeLabel = computed(() => {
  const tag = props.product.tag || props.product.badge || props.product.label
  if (tag) return String(tag)
  if (props.product.is_new || props.product.isNew) return 'MỚI'
  if (props.product.is_featured || props.product.IsFeatured) return 'BÁN CHẠY'
  if (hasDiscount.value) return 'SALE'
  return props.product.sport || props.product.category_name || props.product.category || ''
})
const badgeTone = computed(() => {
  const label = badgeLabel.value.toLowerCase()
  return /mới|new|limited/.test(label) ? 'dark' : 'light'
})
const colorText = computed(() => {
  const value = props.product.color_name || props.product.color || props.product.color_label
  if (value) return String(value)
  return (props.product.f_colors || []).map((color) => {
    if (typeof color === 'string') return color
    return color?.name || color?.color_label || color?.color_name || ''
  }).filter(Boolean).join(' / ')
})
const displayPrice = computed(() => hasDiscount.value ? salePrice.value : originalPrice.value)
const discountPercent = computed(() => {
  if (!hasDiscount.value) return 0
  // Không làm tròn về 0: ví dụ 100.000đ -> 99.999đ vẫn phải cho khách biết
  // đây là giá khuyến mãi (0,001%), thay vì mất luôn nhãn giảm giá.
  return ((originalPrice.value - salePrice.value) / originalPrice.value) * 100
})
const discountLabel = computed(() => {
  if (!discountPercent.value) return ''
  const rounded = Math.round(discountPercent.value * 1000) / 1000
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(rounded)
})

const productId = computed(() => Number(activeProduct.value?.id_product ?? activeProduct.value?.id))

const chooseAvailableSelection = () => {
  selectedColor.value = colorList.value.find((color) => !isColorOos(color.name)) ?? colorList.value[0] ?? null
  const firstAvailableSize = sizeList.value.find((size) => !isVariantOos(selectedColor.value?.name, size))
  selectedSize.value = firstAvailableSize ?? sizeList.value[0] ?? null
  selectedQty.value = 1
}

const refreshInventory = async ({ resetSelection = false } = {}) => {
  isInventoryLoading.value = true
  inventoryVerified.value = false
  validationMessage.value = ''
  try {
    const response = await api.get('/products')
    const rows = Array.isArray(response) ? response : (response?.data || response?.products || [])
    const wantedId = Number(props.product.id_product ?? props.product.id)
    const current = rows.find((row) => Number(row.id ?? row.id_product) === wantedId)
    if (!current) throw new Error('Sản phẩm không còn được bán.')
    freshProduct.value = { ...props.product, ...current }
    inventoryVerified.value = true
    if (resetSelection) chooseAvailableSelection()
    return true
  } catch (error) {
    validationMessage.value = error?.message === 'Sản phẩm không còn được bán.'
      ? error.message
      : 'Không thể đồng bộ tồn kho. Vui lòng thử lại.'
    return false
  } finally {
    isInventoryLoading.value = false
  }
}

async function openVariantModal() {
  showVariantModal.value = true
  freshProduct.value = null
  selectedColor.value = null
  selectedSize.value = null
  selectedQty.value = 1
  await refreshInventory({ resetSelection: true })
  await nextTick()
  if (detailsPanel.value) detailsPanel.value.scrollTop = 0
}

watch(selectedColor, (color, previousColor) => {
  if (normalizeText(color?.name) === normalizeText(previousColor?.name)) return
  const firstAvailableSize = sizeList.value.find((size) => !isVariantOos(color?.name, size))
  selectedSize.value = firstAvailableSize ?? sizeList.value[0] ?? null
  selectedQty.value = 1
  validationMessage.value = ''
})
watch(selectedSize, () => {
  selectedQty.value = 1
  validationMessage.value = ''
})
watch(() => props.product.id_product ?? props.product.id, () => {
  freshProduct.value = null
  inventoryVerified.value = false
  showVariantModal.value = false
})

const galleryImages = computed(() => {
  const imgs = []
  colorList.value.forEach(c => { if (c.image && !imgs.includes(c.image)) imgs.push(c.image) })
  // thêm ảnh variant nếu có
  variants.value.slice(0, 3).forEach((variant) => {
    if (variant.image && !imgs.includes(variant.image)) imgs.push(variant.image)
  })
  if (!imgs.length && activeProduct.value?.image_url) imgs.push(activeProduct.value.image_url)
  return [...new Set(imgs)].slice(0,5)
})
const galleryIndex = computed(() => {
  const idx = galleryImages.value.indexOf(previewImage.value)
  return idx >=0 ? idx : 0
})
function galleryPrev() {
  const imgs = galleryImages.value
  if (!imgs.length) return
  const idx = galleryIndex.value
  const prev = (idx - 1 + imgs.length) % imgs.length
  const col = colorList.value.find(c=>c.image===imgs[prev])
  if (col) selectedColor.value = col
}
function galleryNext() {
  const imgs = galleryImages.value
  if (!imgs.length) return
  const idx = galleryIndex.value
  const next = (idx + 1) % imgs.length
  const col = colorList.value.find(c=>c.image===imgs[next])
  if (col) selectedColor.value = col
}
function selectThumb(img) {
  const col = colorList.value.find(c=>c.image===img)
  if (col) selectedColor.value = col
}

const stockStatus = computed(() => {
  if (isInventoryLoading.value) return { text: 'Đang kiểm tra kho…', cls: 'neutral' }
  if (!inventoryVerified.value) return { text: 'Chưa xác minh tồn kho', cls: 'neutral' }
  if (isOutOfStock.value || (hasVariants.value && selectedSize.value && !selectedVariant.value)) {
    return { text: 'Hết hàng', cls: 'oos' }
  }
  if (hasVariants.value && !selectedSize.value) return { text: 'Chọn kích thước', cls: 'neutral' }
  const stock = selectedVariantStock.value
  if (stock <= 0) return { text: 'Hết hàng', cls: 'oos' }
  if (remainingStock.value <= 0) return { text: 'Đã đạt giới hạn trong giỏ', cls: 'oos' }
  if (cartQuantityForSelection.value > 0) return { text: `Có thể thêm ${remainingStock.value}`, cls: 'low' }
  if (stock > 0 && stock <= 5) return { text: 'Sắp hết hàng', cls: 'low' }
  return { text: 'Còn hàng', cls: 'in' }
})

const cartQuantityForSelection = computed(() => {
  const variantId = selectedVariantId.value
  const line = cartState.items.find((item) => {
    if (Number(item.id_product ?? item.product?.id_product) !== productId.value) return false
    if (variantId !== null && variantId !== undefined) return Number(item.variant_id) === Number(variantId)
    return normalizeText(item.size?.size_name ?? item.size) === normalizeText(selectedSize.value)
      && normalizeText(item.color?.color_label ?? item.color?.color_name ?? item.color) === normalizeText(selectedColor.value?.name ?? 'Tiêu chuẩn')
  })
  return toStock(line?.quantity)
})
const remainingStock = computed(() => Math.max(0, selectedVariantStock.value - cartQuantityForSelection.value))
const displayedStock = computed(() => {
  if (hasVariants.value && selectedVariant.value) return selectedVariantStock.value
  if (hasVariants.value && selectedColor.value) {
    return variants.value
      .filter((variant) => normalizeText(variant.color) === normalizeText(selectedColor.value.name) && variant.active)
      .reduce((total, variant) => total + variant.stock, 0)
  }
  return productTotalStock.value
})
const selectionError = computed(() => {
  if (!inventoryVerified.value) return validationMessage.value || 'Tồn kho chưa được xác minh.'
  if (colorList.value.length && !selectedColor.value) return 'Vui lòng chọn màu sắc.'
  if (sizeList.value.length && !selectedSize.value) return 'Vui lòng chọn kích thước.'
  if (hasVariants.value && !selectedVariant.value) return 'Biến thể đã chọn không tồn tại.'
  if (selectedVariantStock.value <= 0) return 'Màu và kích thước này đã hết hàng.'
  if (remainingStock.value <= 0) return `Bạn đã có đủ ${selectedVariantStock.value} sản phẩm này trong giỏ.`
  if (!Number.isInteger(selectedQty.value) || selectedQty.value < 1) return 'Số lượng không hợp lệ.'
  if (selectedQty.value > remainingStock.value) return `Bạn chỉ có thể thêm tối đa ${remainingStock.value} sản phẩm.`
  return ''
})
const visibleValidation = computed(() => validationMessage.value || selectionError.value)
const canSubmit = computed(() => !isInventoryLoading.value && !isSubmitting.value && !selectionError.value)

function decreaseSelectedQuantity() {
  selectedQty.value = Math.max(1, selectedQty.value - 1)
  validationMessage.value = ''
}

function increaseSelectedQuantity() {
  if (selectionError.value && remainingStock.value <= 0) {
    validationMessage.value = selectionError.value
    return
  }
  if (selectedQty.value >= remainingStock.value) {
    validationMessage.value = `Bạn chỉ có thể thêm tối đa ${remainingStock.value} sản phẩm.`
    return
  }
  selectedQty.value += 1
  validationMessage.value = ''
}

const buildCartPayload = () => {
  const colorObj = selectedColor.value
    ? { color_label: selectedColor.value.name, color_name: selectedColor.value.name, color_hex: selectedColor.value.hex || "", image: selectedColor.value.image || "" }
    : { color_label: "Tiêu chuẩn", color_name: "Tieu chuan" }
  return {
    product: {
      ...activeProduct.value,
      id_product: activeProduct.value?.id_product ?? activeProduct.value?.id,
      product_name: activeProduct.value?.product_name ?? activeProduct.value?.name,
      price: selectedVariant.value?.price ?? activeProduct.value?.price,
      sale_price: selectedVariant.value?.sale_price ?? 0,
    }, quantity: selectedQty.value,
    size: { size_name: selectedVariant.value?.size || selectedSize.value || activeProduct.value?.default_size || "", standard:selectedVariant.value?.standard }, color: colorObj,
    variantId: selectedVariantId.value,
    stockQuantity: selectedVariantStock.value,
  }
}

async function addSelection({ buyNow = false } = {}) {
  if (isSubmitting.value) return
  isSubmitting.value = true
  const refreshed = await refreshInventory()
  if (!refreshed || selectionError.value) {
    validationMessage.value = selectionError.value || validationMessage.value
    notify({ type: 'warning', title: 'Chưa thể thêm sản phẩm', message: validationMessage.value })
    isSubmitting.value = false
    return
  }
  const result = await addToCart(buildCartPayload())
  isSubmitting.value = false
  if (!result.ok) {
    validationMessage.value = result.message
    notify({ type: "warning", title: 'Số lượng chưa hợp lệ', message: result.message })
    return
  }
  showVariantModal.value = false
  if (buyNow) router.push('/checkout')
  else showDrawer()
  notify({
    type: "success",
    title: buyNow ? "Mua ngay" : "Đã thêm vào giỏ",
    message: activeProduct.value?.product_name || activeProduct.value?.name,
    duration: 2200,
  })
}

const confirmAddToCart = () => addSelection()
const handleBuyNow = () => addSelection({ buyNow: true })
</script>

<template>
  <div class="shoe-card" :class="{ 'shoe-card-oos': isOutOfStock }">
    <div class="shoe-media">
      <span v-if="badgeLabel" class="shoe-tag" :class="`shoe-tag-${badgeTone}`">{{ badgeLabel }}</span>
      <router-link :to="productLink" class="shoe-image-link" tabindex="-1" aria-hidden="true">
        <img :src="product.image_url" :alt="product.product_name || product.name" @error="onProductImageError">
      </router-link>
      <div v-if="isOutOfStock" class="shoe-oos-overlay">
        <span class="shoe-oos-badge"><i class="icon icon-x-circle mr-1"></i>Hết hàng</span>
      </div>
      <!-- Figma hover action: thêm vào giỏ -->
      <div v-if="!isOutOfStock" class="hover-actions">
        <button class="hover-add-btn" type="button" @click.prevent.stop="openVariantModal">Thêm vào giỏ</button>
      </div>
      <span class="shoe-shine"></span>
    </div>
    <div class="shoe-body">
      <span v-if="brandName" class="shoe-brand">{{ brandName }}</span>
      <router-link :to="productLink" class="shoe-name">{{ displayName }}</router-link>
      <span v-if="colorText" class="shoe-color">{{ colorText }}</span>
      <div class="shoe-price">
        <span v-if="hasDiscount" class="price-sale">{{ formatCurrency(displayPrice) }}</span>
        <span v-else class="price-regular">{{ formatCurrency(displayPrice) }}</span>
        <span v-if="hasDiscount" class="price-original">{{ formatCurrency(originalPrice) }}</span>
      </div>
      <button v-if="!isOutOfStock" class="mobile-add-btn" type="button" @click.prevent.stop="openVariantModal">Thêm vào giỏ</button>
    </div>
  </div>

  <Teleport to="body">
    <transition name="vm-fade">
      <div v-if="showVariantModal" class="vm-overlay" @click.self="showVariantModal = false">
        <div class="vm-box-quick" role="dialog" aria-modal="true" :aria-label="`Chọn phân loại cho ${baseName}`">
          <button type="button" class="vm-close-quick" aria-label="Đóng" @click="showVariantModal = false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          <div class="vm-quick-grid">
            <!-- Gallery -->
            <div class="vm-gallery">
              <div class="vm-main-wrap">
                <img :src="previewImage" :alt="baseName" class="vm-main-img" @error="onProductImageError">
                <button v-if="galleryImages.length > 1" type="button" class="vm-nav vm-nav-prev" aria-label="Ảnh trước" @click="galleryPrev">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <button v-if="galleryImages.length > 1" type="button" class="vm-nav vm-nav-next" aria-label="Ảnh tiếp theo" @click="galleryNext">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </div>
              <div class="vm-thumbs">
                <button v-for="img in galleryImages" :key="img" type="button" class="vm-thumb" :class="{ active: previewImage === img }" @click="selectThumb(img)">
                  <img :src="img" :alt="baseName" @error="onProductImageError">
                </button>
              </div>
            </div>
            <!-- Details -->
            <div ref="detailsPanel" class="vm-details">
              <h2 class="vm-title-quick">{{ displayName }}</h2>
              <div class="vm-brand-line">Thương hiệu: <strong>{{ activeProduct.brand_name || activeProduct.brand || brandName || 'ShoeGroup' }}</strong> · Loại: <strong>{{ activeProduct.category_name || activeProduct.category || activeProduct.sport || 'Giày' }}</strong></div>
              <div class="vm-stock-line">
                {{ selectedVariant ? 'Tồn kho biến thể' : 'Tồn kho' }}: <strong>{{ isInventoryLoading ? '…' : displayedStock }}</strong>
                <span v-if="activeProduct.material_name"> · Chất liệu: {{ activeProduct.material_name }}</span>
              </div>
              <div class="vm-price-row">
                <span class="vm-price-now">{{ formatCurrency(displayPrice) }}</span>
                <span v-if="hasDiscount" class="vm-price-old">{{ formatCurrency(originalPrice) }}</span>
                <span v-if="hasDiscount" class="vm-discount-tag">-{{ discountLabel }}%</span>
              </div>

              <div v-if="colorList.length > 0" class="vm-section">
                <div class="vm-label">Màu sắc<span v-if="selectedColor">: {{ selectedColor.name }}</span></div>
                <div class="vm-color-list">
                  <button v-for="c in colorList" :key="c.name" type="button" class="vm-color-btn"
                    :class="{ active: selectedColor?.name === c.name, oos: isColorOos(c.name) }"
                    :disabled="isInventoryLoading" @click="selectedColor = c"
                    :title="isColorOos(c.name) ? `${c.name} đã hết hàng, vẫn có thể xem ảnh` : c.name">
                    <img v-if="c.image" :src="c.image" :alt="c.name" class="vm-color-img">
                    <span v-else-if="c.hex" class="vm-color-swatch" :style="{ background: c.hex }"></span>
                    <span class="vm-color-name">{{ c.name }}</span>
                    <svg class="vm-color-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
                  </button>
                </div>
              </div>

              <div v-if="sizeList.length > 0" class="vm-section">
                <div class="vm-label">Kích thước<span v-if="selectedSize"> : {{ selectedSize }}</span></div>
                <div class="vm-size-list">
                  <button v-for="sz in sizeList" :key="sz" type="button" class="vm-size-btn"
                    :class="{ active: selectedSize === sz, oos: isVariantOos(selectedColor?.name, sz) }"
                    :disabled="isInventoryLoading || isVariantOos(selectedColor?.name, sz)" @click="selectedSize = sz"
                    :title="isVariantOos(selectedColor?.name, sz) ? `Kích thước ${sz} đã hết hàng` : `Chọn kích thước ${sz}`">
                    {{ sz }}
                  </button>
                </div>
              </div>

              <div class="vm-section">
                <div class="vm-label">Số lượng</div>
                <div class="vm-qty-row">
                  <div class="vm-qty-box">
                    <button type="button" class="vm-qty-btn" aria-label="Giảm số lượng"
                      :disabled="isInventoryLoading || selectedQty <= 1 || selectedVariantStock <= 0" @click="decreaseSelectedQuantity">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg>
                    </button>
                    <span class="vm-qty-val">{{ selectedQty }}</span>
                    <button type="button" class="vm-qty-btn" aria-label="Tăng số lượng"
                      :disabled="isInventoryLoading || !inventoryVerified || selectedVariantStock <= 0 || selectedQty >= remainingStock"
                      @click="increaseSelectedQuantity">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                    </button>
                  </div>
                  <span class="vm-stock-status" :class="stockStatus.cls">{{ stockStatus.text }}</span>
                </div>
                <p v-if="cartQuantityForSelection > 0 && selectedVariantStock > 0" class="vm-cart-stock-note">
                  Đã có {{ cartQuantityForSelection }} trong giỏ · Còn có thể thêm {{ remainingStock }}
                </p>
              </div>

              <div v-if="visibleValidation" class="vm-validation" :class="{ 'is-loading': isInventoryLoading }" role="status" aria-live="polite">
                <svg v-if="!isInventoryLoading" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
                <span v-else class="vm-spinner" aria-hidden="true"></span>
                <span>{{ isInventoryLoading ? 'Đang đồng bộ tồn kho mới nhất…' : visibleValidation }}</span>
              </div>

              <div class="vm-actions">
                <button type="button" class="vm-btn-buy" :disabled="!canSubmit" @click="handleBuyNow">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l1 13H5L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>
                  {{ isSubmitting ? 'ĐANG KIỂM TRA…' : 'MUA NGAY' }}
                </button>
                <button type="button" class="vm-btn-add" :disabled="!canSubmit" @click="confirmAddToCart">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M3 4h2l2.4 10.5a2 2 0 0 0 2 1.5h7.7a2 2 0 0 0 1.9-1.4L21 8H7m6-3v6m-3-3h6" /></svg>
                  {{ isSubmitting ? 'ĐANG KIỂM TRA…' : 'THÊM VÀO GIỎ' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.shoe-card { display: flex; flex-direction: column; height: 100%; min-width: 0; background: transparent; border: 0; border-radius: 0; overflow: visible; }
.shoe-card:hover { border-color: transparent; box-shadow: none; }
.shoe-card-oos { opacity: 0.82; }
.shoe-media { position: relative; display: block; aspect-ratio: 4 / 5; margin-bottom: 12px; background: #F0F0F0; overflow: hidden; border: 0; padding: 0; border-radius: 0; }
.shoe-image-link { position: absolute; inset: 0; display: block; }
.shoe-media img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s ease; }
.shoe-card:hover .shoe-media img { transform: scale(1.05); }
.shoe-tag { position: absolute; top: 12px; left: 12px; z-index: 2; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 6px 9px; border-radius: 0; line-height: 1.15; }
.shoe-tag-light { background: #fff; color: #0E0E0E; }
.shoe-tag-dark { background: #0E0E0E; color: #fff; }
.shoe-tag-sale { background: #fff; color: #0E0E0E; }
.hover-actions { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity .18s ease; z-index: 3; }
.shoe-card:hover .hover-actions { opacity: 1; }
.hover-add-btn { position: absolute; bottom: 0; left: 0; right: 0; transform: translateY(100%); pointer-events: auto; background: #0E0E0E; color: #fff; border: 0; padding: 12px 16px; font-size: 13px; font-weight: 600; letter-spacing: .01em; cursor: pointer; transition: transform .3s ease, background-color .2s ease; }
.shoe-card:hover .hover-add-btn { transform: translateY(0); }
.hover-add-btn:hover { background: #333; }
.price-sale { font-weight: 900; font-size: 1rem; color: #0E0E0E; }
.price-original { font-size: .74rem; color: #888; text-decoration: line-through; font-weight: 400; }
.price-regular { font-weight: 900; font-size: 1rem; color: #0A0A0A; }
.shoe-oos-overlay { position: absolute; inset: 0; z-index: 3; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.38); backdrop-filter: blur(1.5px); }
.shoe-oos-badge { background: rgba(239,68,68,0.95); color: #fff; font-size: .85rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; padding: .5rem 1.4rem; border-radius: 2px; }
.shoe-shine { display: none; }
.shoe-body { display: flex; flex-direction: column; gap: 4px; padding: 0; flex: 1; min-height: 0; }
.shoe-brand { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #737373; margin-bottom: 0; }
.shoe-name { font-family: "Fraunces", Georgia, serif; font-weight: 500; color: #0E0E0E; text-decoration: none; font-size: 15px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; min-height: 0; transition: color .2s; }
.shoe-name:hover { color: #555; }
.shoe-color { font-size: 12px; line-height: 1.3; color: #737373; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.shoe-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.shoe-meta .sg-chip { font-size: .68rem; padding: .16rem .55rem; border-radius: 999px; background: #f9f9f9; color: #000; border: 1px solid var(--sg-line); }
.shoe-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; }
.shoe-price { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; margin-top: 2px; line-height: 1.2; }
.mobile-add-btn { display: none; width: 100%; margin-top: 10px; padding: 10px 16px; border: 0; background: #0E0E0E; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; }
.shoe-add { width: 38px; height: 38px; border-radius: 10px; border: 1px solid #0A0A0A; background: #0A0A0A; color: #fff; font-size: 1rem; display: flex; align-items: center; justify-content: center; transition: all .3s ease; text-decoration: none; cursor: pointer; }
.shoe-add:hover { background: #fff; color: #0A0A0A; }
.shoe-add-oos { background: #6b7280 !important; border-color: #6b7280 !important; }
.shoe-add-oos:hover { background: #4b5563 !important; color: #fff !important; border-color: #4b5563 !important; }
@media (max-width: 1023px) { .mobile-add-btn { display: block; } }
@media (max-width: 768px) { .shoe-name { font-size: 15px; } .shoe-price { font-size: 1.1rem; } }
@media (max-width: 576px) { .shoe-brand { font-size: 10px; } .shoe-name { font-size: 14px; } .shoe-color { font-size: 11px; } .shoe-price { font-size: 1rem; gap: 6px; } }

/* VARIANT MODAL */
.vm-overlay { position: fixed; inset: 0; z-index: 9000; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; overflow-y: auto; padding: 16px; }
@media (min-width: 600px) { .vm-overlay { align-items: center; } }
.vm-box { background: #fff; border-radius: 20px 20px 0 0; width: 100%; max-width: 520px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 -8px 40px rgba(0,0,0,.18); }
@media (min-width: 600px) { .vm-box { border-radius: 16px; max-height: 85vh; } }
.vm-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 14px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
.vm-title { font-weight: 700; font-size: 1rem; color: #111; }
.vm-close { width: 32px; height: 32px; border: none; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.85rem; color: #555; transition: background .2s; }
.vm-close:hover { background: #e0e0e0; }
.vm-preview { display: flex; gap: 14px; padding: 16px 20px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
.vm-img { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e5e5; flex-shrink: 0; transition: all 0.3s; }
.vm-pinfo { flex: 1; min-width: 0; }
.vm-pname { font-weight: 700; font-size: 0.9rem; color: #111; line-height: 1.3; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.vm-pprice { font-weight: 900; font-size: 1.1rem; color: #0A0A0A; margin-bottom: 6px; }
.vm-pattr { font-size: 0.8rem; color: #666; }
.vm-body { flex: 1; overflow-y: auto; }
.vm-section { padding: 14px 20px; border-bottom: 1px solid #f5f5f5; }
.vm-label { font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin-bottom: 10px; }
.vm-color-list { display: flex; flex-wrap: wrap; gap: 8px; }
.vm-color-btn { display: flex; align-items: center; gap: 7px; border: 1.5px solid #e5e5e5; border-radius: 8px; padding: 6px 12px 6px 6px; cursor: pointer; background: #fff; transition: all 0.18s; position: relative; }
.vm-color-btn:hover:not(:disabled) { border-color: #aaa; }
.vm-color-btn.active { border-color: #111; border-width: 2px; background: #fafafa; }
.vm-color-btn.oos { color: #aaa; background: #f7f7f7; opacity: .62; cursor: pointer; }
.vm-color-btn.oos .vm-color-name { color: #aaa; }
.vm-color-img { width: 32px; height: 32px; object-fit: cover; border-radius: 5px; border: 1px solid #e5e5e5; }
.vm-color-swatch { width: 24px; height: 24px; border-radius: 50%; border: 1px solid rgba(0,0,0,.12); }
.vm-color-name { font-size: 0.82rem; font-weight: 600; color: #111; }
.vm-color-check { display: none; width: 14px; height: 14px; flex: 0 0 14px; margin-left: 2px; color: #111; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.vm-color-btn.active .vm-color-check { display: block; }
.vm-size-list { display: flex; flex-wrap: wrap; gap: 8px; }
.vm-size-btn { min-width: 52px; height: 40px; padding: 0 12px; border: 1.5px solid #e0e0e0; border-radius: 8px; background: #fff; cursor: pointer; font-weight: 600; font-size: 0.88rem; color: #111; transition: all 0.18s; display: flex; align-items: center; justify-content: center; gap: 4px; }
.vm-size-btn:hover:not(.oos) { border-color: #111; }
.vm-size-btn.active { border-color: #111; border-width: 2px; background: #111; color: #fff; }
.vm-size-btn.oos { color: #bbb; border-color: #e5e5e5; cursor: not-allowed; background: #fafafa; }
.vm-oos-tag { font-size: 0.6rem; color: #e74c3c; font-weight: 700; }
.vm-qty-row { display: flex; align-items: center; gap: 12px; }
.vm-qty-btn { width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid #e0e0e0; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1rem; color: #111; transition: all 0.15s; }
.vm-qty-btn:hover:not(:disabled) { border-color: #111; background: #f5f5f5; }
.vm-qty-btn:disabled { color: #b8b8b8; background: #f7f7f7; cursor: not-allowed; }
.vm-qty-btn svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.vm-qty-val { font-size: 1.1rem; font-weight: 700; min-width: 28px; text-align: center; }
.vm-stock-hint { font-size: 0.78rem; color: #999; }
.vm-footer { padding: 16px 20px; border-top: 1px solid #f0f0f0; flex-shrink: 0; }
.vm-btn-add { width: 100%; height: 50px; background: #111; color: #fff; border: none; border-radius: 10px; font-weight: 700; font-size: 0.95rem; letter-spacing: 0.06em; cursor: pointer; transition: background 0.2s; }
.vm-btn-add:hover { background: #333; }
.vm-fade-enter-active, .vm-fade-leave-active { transition: opacity 0.25s; }
.vm-fade-enter-from, .vm-fade-leave-to { opacity: 0; }
.vm-fade-enter-active .vm-box, .vm-fade-leave-active .vm-box,
.vm-fade-enter-active .vm-box-quick, .vm-fade-leave-active .vm-box-quick { transition: transform 0.25s; }
.vm-fade-enter-from .vm-box, .vm-fade-leave-to .vm-box,
.vm-fade-enter-from .vm-box-quick, .vm-fade-leave-to .vm-box-quick { transform: translateY(30px); }

/* ——— Quick view như mẫu JapanSport — gọn, không dài ——— */
.vm-box-quick { background: #fff; border-radius: 16px; width: 100%; max-width: 820px; max-height: 72vh; display: flex; flex-direction: column; overflow: hidden; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,.22); }
.vm-close-quick { position: absolute; top: 10px; right: 10px; width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid #e5e7eb; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 5; color: #111; }
.vm-close-quick:hover { background: #f3f4f6; }
.vm-close-quick svg, .vm-nav svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.vm-quick-grid { display: grid; grid-template-columns: 0.98fr 1.02fr; max-height: 72vh; overflow: hidden; }
.vm-gallery { background: #f3f5f7; padding: 10px; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }
.vm-main-wrap { position: relative; background: #eef1f4; border-radius: 12px; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; max-height: 340px; flex-shrink: 0; }
.vm-main-img { width: 84%; height: 84%; object-fit: contain; }
.vm-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 30px; height: 30px; border-radius: 50%; border: 1px solid #e5e7eb; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.12); color: #333; font-size: .85rem; }
.vm-nav-prev { left: 8px; }
.vm-nav-next { right: 8px; }
.vm-thumbs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
.vm-thumb { width: 52px; height: 52px; border-radius: 8px; border: 1.5px solid #e5e7eb; overflow: hidden; background: #fff; flex-shrink: 0; cursor: pointer; padding: 2px; }
.vm-thumb.active { border-color: #0A0A0A; }
.vm-thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
.vm-details { padding: 14px 18px 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 7px; max-height: 72vh; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
.vm-details > * { flex-shrink: 0; }
.vm-details .vm-section { padding: 5px 0; border: none; margin: 0; }
.vm-title-quick { max-height: 2.64em; font-weight: 800; font-size: 1.18rem; line-height: 1.32; color: #111; margin: 0; display: block; overflow: hidden; }
.vm-brand-line { font-size: .82rem; color: #666; line-height: 1.4; }
.vm-stock-line { font-size: .82rem; color: #555; line-height: 1.4; }
.vm-price-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0; }
.vm-price-now { font-weight: 900; font-size: 1.28rem; color: #e53935; }
.vm-price-old { font-size: .9rem; color: #888; text-decoration: line-through; }
.vm-discount-tag { background: #e53935; color: #fff; font-size: .72rem; font-weight: 800; padding: 3px 6px; border-radius: 4px; }
.vm-qty-box { display: inline-flex; align-items: center; border: 1px solid #e5e7eb; border-radius: 999px; overflow: hidden; background: #fff; }
.vm-stock-status { font-size: .85rem; font-weight: 600; margin-left: 12px; }
.vm-stock-status.low { color: #d97706; }
.vm-stock-status.in { color: #16a34a; }
.vm-stock-status.oos { color: #e53935; }
.vm-stock-status.neutral { color: #737373; }
.vm-cart-stock-note { margin: 7px 0 0; color: #737373; font-size: .75rem; line-height: 1.4; }
.vm-validation { display: flex; align-items: flex-start; gap: 8px; padding: 9px 11px; border: 1px solid #fecaca; border-radius: 8px; background: #fff7f7; color: #b91c1c; font-size: .78rem; line-height: 1.4; }
.vm-validation.is-loading { border-color: #e5e7eb; background: #f7f7f7; color: #555; }
.vm-validation svg { width: 16px; height: 16px; flex: 0 0 auto; margin-top: 1px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.vm-spinner { width: 15px; height: 15px; flex: 0 0 auto; border: 2px solid #d4d4d4; border-top-color: #0e0e0e; border-radius: 50%; animation: vm-spin .7s linear infinite; }
.vm-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
.vm-btn-buy, .vm-btn-add { height: 48px; border-radius: 999px; font-weight: 800; font-size: .86rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: background-color .18s, color .18s, opacity .18s; }
.vm-btn-buy { border: 1.5px solid #0A0A0A; background: #fff; color: #0A0A0A; }
.vm-btn-buy:hover:not(:disabled) { background: #f3f4f6; }
.vm-btn-add { border: 1.5px solid #0A0A0A; background: #0A0A0A; color: #fff; }
.vm-btn-add:hover:not(:disabled) { background: #262626; }
.vm-btn-buy:disabled, .vm-btn-add:disabled { border-color: #d4d4d4; background: #eeeeee; color: #9a9a9a; cursor: not-allowed; opacity: 1; }
.vm-btn-buy svg, .vm-btn-add svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
@keyframes vm-spin { to { transform: rotate(360deg); } }
@media (max-width: 768px) {
  .vm-box-quick { max-width: 96vw; max-height: 92vh; }
  .vm-quick-grid { grid-template-columns: 1fr; overflow-y: auto; }
  .vm-gallery { padding: 12px; }
  .vm-main-wrap { aspect-ratio: 1.15; }
  .vm-details { padding: 16px; }
  .vm-actions { grid-template-columns: 1fr; }
}
</style>
