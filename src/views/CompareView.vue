<script setup>
import { ref, onMounted, watch } from 'vue'
import { compareState, removeFromCompare, clearCompare } from '../stores/compareStore'
import { formatCurrency, addToCart, showMiniCart } from '../stores/cartStore'
import { notify } from '../stores/uiStore'
import apiClient from '../services/apiClient' // Không viết cứng địa chỉ server

const products = ref([])
const isLoading = ref(true)

const fetchCompareProducts = async () => {
  if (compareState.compareIds.length === 0) {
    products.value = []
    isLoading.value = false
    return
  }

  isLoading.value = true
  try {
    const ids = compareState.compareIds.join(',')
    const res = await apiClient.get(`/api/v2/products/compare?ids=${ids}`)
    products.value = res.data.items || []
  } catch (error) {
    console.error('Lỗi tải dữ liệu so sánh:', error)
  } finally {
    isLoading.value = false
  }
}

const handleRemove = (id) => {
  removeFromCompare(id)
  notify({ type: 'info', message: 'Đã xóa sản phẩm khỏi bảng so sánh' })
}

const handleAddToCart = (prod) => {
  addToCart({
    product: prod,
    quantity: 1,
    size: { size_name: '42' },
    color: { color_label: 'Tiêu chuẩn', color_name: 'Tiêu chuẩn' }
  })
  showMiniCart()
  notify({ type: 'success', title: 'Đã thêm vào giỏ', message: prod.product_name })
}

watch(() => compareState.compareIds, fetchCompareProducts, { deep: true, immediate: true })
</script>

<template>
  <div class="compare-page py-5">
    <div class="container">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-extrabold text-uppercase m-0">So Sánh Sản Phẩm</h2>
          <p class="text-secondary m-0">Bảng đối chiếu thông số kỹ thuật chi tiết</p>
        </div>
        <button v-if="products.length > 0" class="btn btn-outline-danger btn-sm" @click="clearCompare">
          Xóa tất cả
        </button>
      </div>

      <div v-if="isLoading" class="text-center py-5">
        <div class="spinner-border text-dark"></div>
      </div>

      <div v-else-if="products.length === 0" class="empty-compare text-center py-5 bg-white rounded border">
        <i class="bi bi-arrow-left-right display-3 text-muted"></i>
        <h4 class="mt-3 fw-bold">Chưa có sản phẩm nào để so sánh</h4>
        <p class="text-secondary">Hãy bấm vào biểu tượng so sánh trên thẻ sản phẩm ở danh sách.</p>
        <router-link to="/products" class="btn btn-dark fw-bold px-4 mt-2">Xem danh sách sản phẩm</router-link>
      </div>

      <div v-else class="table-responsive">
        <table class="table table-bordered compare-table bg-white align-middle text-center">
          <thead>
            <tr>
              <th style="min-width: 180px;" class="bg-light align-middle">Tiêu chí</th>
              <th v-for="prod in products" :key="prod.id_product" style="min-width: 220px;" class="position-relative p-3">
                <button class="btn-remove-col" @click="handleRemove(prod.id_product)" title="Xóa">
                  <i class="bi bi-x-circle-fill"></i>
                </button>
                <img :src="prod.image_url" :alt="prod.product_name" class="compare-img mb-2 rounded">
                <h6 class="fw-bold mb-1 text-truncate">{{ prod.product_name }}</h6>
                <div class="text-danger fw-extrabold mb-2">{{ formatCurrency(prod.price) }}</div>
                <button class="btn btn-dark btn-sm w-100" @click="handleAddToCart(prod)">
                  <i class="bi bi-bag-plus me-1"></i> Thêm vào giỏ
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="fw-bold bg-light">Thương hiệu</td>
              <td v-for="p in products" :key="p.id_product">{{ p.brand_name || '-' }}</td>
            </tr>
            <tr>
              <td class="fw-bold bg-light">Danh mục</td>
              <td v-for="p in products" :key="p.id_product">{{ p.category_name || '-' }}</td>
            </tr>
            <tr>
              <td class="fw-bold bg-light">Bộ môn</td>
              <td v-for="p in products" :key="p.id_product">{{ p.sport || '-' }}</td>
            </tr>
            <tr>
              <td class="fw-bold bg-light">Đánh giá trung bình</td>
              <td v-for="p in products" :key="p.id_product">
                ⭐ {{ Number(p.AvgRating).toFixed(1) }} / 5.0 ({{ p.ReviewCount }} đánh giá)
              </td>
            </tr>
            <tr>
              <td class="fw-bold bg-light">Chất liệu thân giày</td>
              <td v-for="p in products" :key="p.id_product">{{ p.material_name || '-' }}</td>
            </tr>
            <tr>
              <td class="fw-bold bg-light">Chất liệu đế</td>
              <td v-for="p in products" :key="p.id_product">{{ p.sole_name || '-' }}</td>
            </tr>
            <tr>
              <td class="fw-bold bg-light">Công nghệ đệm</td>
              <td v-for="p in products" :key="p.id_product">{{ p.cushioning_name || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compare-page { background: #f8f9fa; min-height: 80vh; }
.compare-table { border-color: #e5e5e5; }
.compare-img { width: 130px; height: 130px; object-fit: cover; }
.btn-remove-col { position: absolute; top: 8px; right: 8px; border: none; background: transparent; color: #dc3545; font-size: 1.1rem; cursor: pointer; }
</style>