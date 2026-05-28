<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { products, sizes, colors, brands } from '../data/mockData'

const route = useRoute()
const product = computed(() => products.find(p => p.id_product === Number(route.params.id)))
const brand = computed(() => product.value ? brands.find(b => b.id_brand === product.value.id_brand) : null)

const selectedSize = ref(sizes[1].id_size)
const selectedColor = ref(colors[0].id_color)
const quantity = ref(1)

const decreaseQuantity = () => {
  if (quantity.value > 1) quantity.value--
}
const increaseQuantity = () => {
  quantity.value++
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
      
      <!-- Cột trái: Ảnh -->
      <div class="col-lg-6 d-flex flex-column gap-3">
        <div class="bg-light rounded-4 overflow-hidden border">
          <img :src="product.image_url" :alt="product.product_name" class="w-100 object-fit-cover ratio-1x1 mix-blend-multiply">
        </div>
        <div class="row g-3">
          <div class="col-3" v-for="i in 4" :key="i">
            <div 
              class="bg-light rounded-3 overflow-hidden border-2 cursor-pointer transition-all h-100"
              :class="i === 1 ? 'border-dark' : 'border-transparent border-hover-dark'"
            >
              <img :src="product.image_url" alt="thumbnail" class="w-100 object-fit-cover mix-blend-multiply h-100">
            </div>
          </div>
        </div>
      </div>
      
      <!-- Cột phải: Thông tin -->
      <div class="col-lg-6 d-flex flex-column">
        <h1 class="display-5 fw-bold text-dark mb-2">{{ product.product_name }}</h1>
        <p class="fs-1 fw-bold text-dark mb-4">${{ product.price.toFixed(2) }}</p>
        
        <!-- Chọn Size -->
        <div class="mb-4">
          <h5 class="fw-bold fs-6 text-uppercase mb-3">Chọn Size: <span class="fw-normal">{{ sizes.find(s=>s.id_size === selectedSize)?.size_name }}</span></h5>
          <div class="d-flex flex-wrap gap-2">
            <button 
              v-for="size in sizes" 
              :key="size.id_size"
              @click="selectedSize = size.id_size"
              class="btn fw-bold d-flex align-items-center justify-content-center size-btn"
              :class="selectedSize === size.id_size ? 'btn-dark' : 'btn-outline-secondary text-dark'"
            >
              {{ size.size_name.replace('US ', '') }}
            </button>
          </div>
        </div>
        
        <!-- Chọn Màu -->
        <div class="mb-4">
          <h5 class="fw-bold fs-6 text-uppercase mb-3">Chọn Màu: <span class="fw-normal">{{ colors.find(c=>c.id_color === selectedColor)?.color_name }}</span></h5>
          <div class="d-flex flex-wrap gap-3">
            <button 
              v-for="color in colors" 
              :key="color.id_color"
              @click="selectedColor = color.id_color"
              class="color-btn rounded-circle transition-all position-relative"
              :class="selectedColor === color.id_color ? 'border-dark active-scale' : 'border-transparent'"
              :style="{ backgroundColor: color.color_name === 'Black' ? '#1e293b' : color.color_name === 'White' ? '#f8fafc' : '#ef4444' }"
              :title="color.color_name"
            >
              <i v-if="selectedColor === color.id_color" class="bi bi-check position-absolute top-50 start-50 translate-middle" :class="color.color_name === 'White' ? 'text-dark' : 'text-white'"></i>
            </button>
          </div>
        </div>

        <!-- Số lượng -->
        <div class="mb-5">
           <h5 class="fw-bold fs-6 text-uppercase mb-3">Số lượng</h5>
           <div class="input-group" style="width: 140px;">
             <button @click="decreaseQuantity" class="btn btn-outline-secondary d-flex align-items-center justify-content-center" type="button"><i class="bi bi-dash"></i></button>
             <input type="text" class="form-control text-center fw-bold" :value="quantity" readonly>
             <button @click="increaseQuantity" class="btn btn-outline-secondary d-flex align-items-center justify-content-center" type="button"><i class="bi bi-plus"></i></button>
           </div>
        </div>
        
        <!-- Nút thêm vào giỏ -->
        <button class="btn btn-dark w-100 py-3 rounded-4 fw-bold fs-5 mb-4 shadow-hover d-flex align-items-center justify-content-center gap-2">
          <i class="bi bi-bag"></i> THÊM VÀO GIỎ HÀNG
        </button>

        <!-- Tabs Mô tả -->
        <div class="border-top pt-4 mt-auto">
          <ul class="nav nav-tabs mb-3" id="productTabs" role="tablist">
            <li class="nav-item" role="presentation">
              <button class="nav-link active fw-bold text-dark border-0 border-bottom border-dark border-3 bg-transparent rounded-0" id="detail-tab" data-bs-toggle="tab" data-bs-target="#detail" type="button" role="tab">Chi tiết sản phẩm</button>
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
  width: 50px;
  height: 50px;
  border-width: 2px !important;
}
.color-btn {
  width: 40px;
  height: 40px;
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
