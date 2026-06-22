<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { products, sizes, colors, brands, product_details } from '../data/mockData'
import { addToCart, formatCurrency, showMiniCart } from '../stores/cartStore'

const route = useRoute()

const product = computed(() => {
  return products.find((p) => p.id_product === Number(route.params.id))
})

const brand = computed(() => {
  return product.value
    ? brands.find((b) => b.id_brand === product.value.id_brand)
    : null
})

const availableDetails = computed(() => {
  if (!product.value) return []
  return product_details.filter((detail) => detail.id_product === product.value.id_product)
})

const availableSizes = computed(() => {
  return sizes.filter((size) =>
    availableDetails.value.some((detail) => detail.id_size === size.id_size)
  )
})

const availableColors = computed(() => {
  return colors.filter((color) =>
    availableDetails.value.some((detail) => detail.id_color === color.id_color)
  )
})

const selectedSize = ref(null)
const selectedColor = ref(null)
const quantity = ref(1)

const selectedDetail = computed(() => {
  return availableDetails.value.find(
    (detail) =>
      detail.id_size === selectedSize.value &&
      detail.id_color === selectedColor.value
  )
})

const currentStock = computed(() => {
  return selectedDetail.value?.stock_quantity || 0
})

const selectedSizeName = computed(() => {
  return sizes.find((size) => size.id_size === selectedSize.value)?.size_name || ''
})

const selectedColorName = computed(() => {
  const color = colors.find((item) => item.id_color === selectedColor.value)
  return color?.color_label || color?.color_name || ''
})

watch(
  product,
  () => {
    const firstAvailable =
      availableDetails.value.find((detail) => detail.stock_quantity > 0) ||
      availableDetails.value[0]

    selectedSize.value = firstAvailable?.id_size || null
    selectedColor.value = firstAvailable?.id_color || null
    quantity.value = 1
  },
  { immediate: true }
)

const isSizeAvailable = (sizeId) => {
  return availableDetails.value.some(
    (detail) => detail.id_size === sizeId && detail.stock_quantity > 0
  )
}

const isColorAvailableForSelectedSize = (colorId) => {
  return availableDetails.value.some(
    (detail) =>
      detail.id_size === selectedSize.value &&
      detail.id_color === colorId &&
      detail.stock_quantity > 0
  )
}

const selectSize = (sizeId) => {
  if (!isSizeAvailable(sizeId)) return

  selectedSize.value = sizeId

  const sameColorDetail = availableDetails.value.find(
    (detail) =>
      detail.id_size === sizeId &&
      detail.id_color === selectedColor.value &&
      detail.stock_quantity > 0
  )

  const firstColorDetail = availableDetails.value.find(
    (detail) => detail.id_size === sizeId && detail.stock_quantity > 0
  )

  selectedColor.value = sameColorDetail?.id_color || firstColorDetail?.id_color || null
  quantity.value = 1
}

const selectColor = (colorId) => {
  if (!isColorAvailableForSelectedSize(colorId)) return

  selectedColor.value = colorId
  quantity.value = 1
}

const decreaseQuantity = () => {
  if (quantity.value > 1) {
    quantity.value -= 1
  }
}

const increaseQuantity = () => {
  if (quantity.value < currentStock.value) {
    quantity.value += 1
    return
  }

  alert(`Không thể vượt quá tồn kho hiện có (${currentStock.value}).`)
}

const handleAddToCart = () => {
  if (!selectedDetail.value) {
    alert('Vui lòng chọn size và màu hợp lệ.')
    return
  }

  if (currentStock.value <= 0) {
    alert('Sản phẩm đã hết hàng.')
    return
  }

  const result = addToCart({
    productId: product.value.id_product,
    detailId: selectedDetail.value.id_product_detail,
    quantity: quantity.value
  })

  if (!result.ok) {
    alert(result.message)
    return
  }

  showMiniCart()
}

onMounted(() => {
  window.scrollTo(0, 0)
})
</script>

<template>
  <div v-if="!product" class="container text-center py-5">
    <h2 class="fw-bold">Không tìm thấy sản phẩm</h2>
  </div>

  <div v-else class="container-fluid px-4 py-5 bg-light min-vh-100">
    <div class="row bg-white rounded-5 shadow-sm p-4 mx-0 g-5">
      <div class="col-lg-6 d-flex flex-column gap-3">
        <div class="bg-light rounded-4 overflow-hidden border">
          <img
            :src="product.image_url"
            :alt="product.product_name"
            class="w-100 object-fit-cover ratio-1x1 mix-blend-multiply"
          >
        </div>

        <div class="row g-3">
          <div class="col-3" v-for="i in 4" :key="i">
            <div
              class="bg-light rounded-3 overflow-hidden border-2 cursor-pointer transition-all h-100"
              :class="i === 1 ? 'border-dark' : 'border-transparent border-hover-dark'"
            >
              <img
                :src="product.image_url"
                alt="thumbnail"
                class="w-100 object-fit-cover mix-blend-multiply h-100"
              >
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-6 d-flex flex-column">
        <p class="text-secondary fw-bold text-uppercase mb-2">
          {{ brand?.brand_name }}
        </p>

        <h1 class="display-5 fw-bold text-dark mb-2">
          {{ product.product_name }}
        </h1>

        <p class="fs-1 fw-bold text-dark mb-4">
          {{ formatCurrency(product.price) }}
        </p>

        <div class="mb-4">
          <h5 class="fw-bold fs-6 text-uppercase mb-3">
            Chọn Size:
            <span class="fw-normal">{{ selectedSizeName }}</span>
          </h5>

          <div class="d-flex flex-wrap gap-2">
            <button
              v-for="size in availableSizes"
              :key="size.id_size"
              type="button"
              class="btn fw-bold d-flex align-items-center justify-content-center size-btn"
              :class="[
                selectedSize === size.id_size ? 'btn-dark' : 'btn-outline-secondary text-dark',
                !isSizeAvailable(size.id_size) ? 'disabled opacity-50' : ''
              ]"
              :disabled="!isSizeAvailable(size.id_size)"
              @click="selectSize(size.id_size)"
            >
              {{ size.size_name }}
            </button>
          </div>
        </div>

        <div class="mb-4">
          <h5 class="fw-bold fs-6 text-uppercase mb-3">
            Chọn Màu:
            <span class="fw-normal">{{ selectedColorName }}</span>
          </h5>

          <div class="d-flex flex-wrap gap-3">
            <button
              v-for="color in availableColors"
              :key="color.id_color"
              type="button"
              class="color-btn rounded-circle transition-all position-relative"
              :class="[
                selectedColor === color.id_color ? 'border-dark active-scale' : 'border-transparent',
                !isColorAvailableForSelectedSize(color.id_color) ? 'opacity-25' : ''
              ]"
              :style="{ backgroundColor: color.hex }"
              :title="color.color_label || color.color_name"
              :disabled="!isColorAvailableForSelectedSize(color.id_color)"
              @click="selectColor(color.id_color)"
            >
              <i
                v-if="selectedColor === color.id_color"
                class="bi bi-check position-absolute top-50 start-50 translate-middle"
                :class="color.color_name === 'White' ? 'text-dark' : 'text-white'"
              ></i>
            </button>
          </div>
        </div>

        <div class="mb-4">
          <h5 class="fw-bold fs-6 text-uppercase mb-3">Số lượng</h5>

          <div class="d-flex align-items-center gap-3">
            <div class="input-group" style="width: 140px;">
              <button
                type="button"
                class="btn btn-outline-secondary d-flex align-items-center justify-content-center"
                :disabled="quantity <= 1"
                @click="decreaseQuantity"
              >
                <i class="bi bi-dash"></i>
              </button>

              <input
                type="text"
                class="form-control text-center fw-bold"
                :value="quantity"
                readonly
              >

              <button
                type="button"
                class="btn btn-outline-secondary d-flex align-items-center justify-content-center"
                :disabled="quantity >= currentStock"
                @click="increaseQuantity"
              >
                <i class="bi bi-plus"></i>
              </button>
            </div>

            <span class="text-secondary small">
              Còn {{ currentStock }} sản phẩm
            </span>
          </div>
        </div>

        <button
          type="button"
          class="btn btn-dark w-100 py-3 rounded-4 fw-bold fs-5 mb-4 shadow-hover d-flex align-items-center justify-content-center gap-2"
          :disabled="!selectedDetail || currentStock <= 0"
          @click="handleAddToCart"
        >
          <i class="bi bi-bag"></i>
          THÊM VÀO GIỎ HÀNG
        </button>

        <div class="border-top pt-4 mt-auto">
          <ul class="nav nav-tabs mb-3" id="productTabs" role="tablist">
            <li class="nav-item" role="presentation">
              <button
                class="nav-link active fw-bold text-dark border-0 border-bottom border-dark border-3 bg-transparent rounded-0"
                id="detail-tab"
                data-bs-toggle="tab"
                data-bs-target="#detail"
                type="button"
                role="tab"
              >
                Chi tiết sản phẩm
              </button>
            </li>
          </ul>

          <div class="tab-content" id="productTabsContent">
            <div class="tab-pane fade show active text-secondary" id="detail" role="tabpanel">
              {{ product.description }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.object-fit-cover {
  object-fit: cover;
}

.mix-blend-multiply {
  mix-blend-mode: multiply;
}

.ratio-1x1 {
  aspect-ratio: 1 / 1;
}

.border-transparent {
  border-color: transparent !important;
}

.border-hover-dark:hover {
  border-color: #dee2e6 !important;
}

.size-btn {
  width: 54px;
  height: 50px;
  border-width: 2px !important;
}

.color-btn {
  width: 42px;
  height: 42px;
  border: 2px solid;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 .125rem .25rem rgba(0,0,0,.075);
}

.color-btn.active-scale {
  transform: scale(1.15);
  box-shadow: 0 .5rem 1rem rgba(0,0,0,.15);
}
</style>