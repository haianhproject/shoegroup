<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { orderState, formatCurrency } from '../stores/orderStore'
import ShoeCard from '../components/ShoeCard.vue'
import { products as mockProducts } from '../data/mockData'
import { api } from "../services/apiClient";

const route = useRoute()
const router = useRouter()

const order = computed(() => orderState.orders.find((o) => o.id === route.query.orderId))

const suggested = ref([])
const isLoadingSuggested = ref(true)

const fetchSuggested = async () => {
  try {
    const data = await api.get('/products')
    if (!Array.isArray(data)) throw new Error('Dữ liệu sản phẩm không hợp lệ')
    suggested.value = data
      .filter((p) => p.active)
      .slice(0, 4)
      .map((p) => ({
        id_product: p.id, product_name: p.name, price: p.price,
        id_category: p.category_id, category_name: p.category, sport: p.sport,
        material_name: p.material_name, image_url: p.image_url,
        brand_name: p.brand_name || p.brand || '', id_brand: p.id_brand || 1, colors: p.colors || [], variants: p.variants || [], total_stock: p.total_stock ?? p.stock ?? null,
      }))
  } catch (e) {
    suggested.value = mockProducts.slice(0, 4)
  } finally {
    isLoadingSuggested.value = false
  }
}

const goOrders = () => router.push('/account?tab=orders')
const goHome = () => router.push('/')

onMounted(() => {
  window.scrollTo(0, 0)
  if (!order.value) { router.replace('/') ; return }
  fetchSuggested()
})
</script>

<template>
  <div class="success-page">
    <div v-if="order" class="container-fluid px-4 py-5" style="max-width: 1200px; margin: 0 auto;">

      <!-- Success header -->
      <div class="suc-hero">
        <div class="suc-icon"><i class="bi bi-check-lg"></i></div>
        <h1 class="suc-title">ĐẶT HÀNG THÀNH CÔNG</h1>
        <p class="text-secondary mb-0">Cảm ơn bạn đã mua sắm tại ShoeGroup. Đơn hàng đang được xử lý.</p>
      </div>

      <!-- Order info -->
      <div class="suc-info">
        <div class="suc-info-row"><span>Mã đơn:</span><strong>{{ order.id }}</strong></div>
        <div class="suc-info-row"><span>Tổng tiền:</span><strong>{{ formatCurrency(order.total) }}</strong></div>
        <div class="suc-info-row"><span>Giao hàng:</span><strong>{{ order.shippingMethod?.name }}</strong></div>
        <div class="suc-info-row"><span>Dự kiến:</span><strong>{{ order.shippingMethod?.eta }}</strong></div>
      </div>

      <div class="d-flex gap-3 mt-4 suc-actions">
        <button class="btn-sg flex-grow-1" @click="goOrders">XEM ĐƠN HÀNG</button>
        <button class="btn-sg-outline flex-grow-1" @click="goHome">VỀ TRANG CHỦ</button>
      </div>

      <!-- Suggested products -->
      <section class="suc-suggest">
        <div class="sec-head">
          <div>
            <div class="sg-title-bar mb-2"></div>
            <h2 class="sec-title">Có thể bạn cũng thích</h2>
            <p class="text-secondary mb-0">Khám phá thêm các mẫu giày nổi bật khác.</p>
          </div>
          <router-link to="/products" class="btn-sg-outline d-none d-md-inline-flex">Xem tất cả <i class="bi bi-arrow-right ms-1"></i></router-link>
        </div>

        <div v-if="isLoadingSuggested" class="text-center py-5">
          <div class="spinner-border text-primary"></div>
        </div>
        <div v-else class="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-4">
          <div class="col" v-for="product in suggested" :key="product.id_product">
            <ShoeCard :product="product" />
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
.success-page {
  background: #ffffff;
  min-height: 100vh;
}

.suc-hero {
  text-align: center;
  padding: 20px 0 32px;
}
.suc-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: #D4001A;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
}
.suc-title {
  font-weight: 700;
  font-size: 1.6rem;
  letter-spacing: 0.1em;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.suc-info {
  max-width: 560px;
  margin: 0 auto;
  background: #fafafa;
  border: 1px solid #e5e5e5;
  padding: 24px;
  border-radius: 4px;
  text-align: left;
}
.suc-info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 0.9rem;
}
.suc-info-row:last-child {
  margin-bottom: 0;
}
.suc-info-row span {
  color: #666;
}
.suc-info-row strong {
  color: #1a1a1a;
  font-weight: 600;
}

.suc-actions {
  max-width: 560px;
  margin: 16px auto 0;
}

.suc-suggest {
  margin-top: 64px;
  padding-top: 40px;
  border-top: 1px solid #e5e5e5;
}
.sec-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 12px;
}
.sec-title {
  font-weight: 900;
  font-size: 1.6rem;
  letter-spacing: -0.02em;
  margin: 0;
}
</style>
