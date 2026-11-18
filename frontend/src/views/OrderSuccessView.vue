<!-- Mục đích: Trang xác nhận đặt hàng thành công và tóm tắt đơn vừa tạo. -->
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { orderState, formatCurrency, getCustomerOrderCode } from '../stores/orderStore'
import FigmaProductCard from '../components/figma/product/FigmaProductCard.vue'
import FigmaProductGrid from '../components/figma/product/FigmaProductGrid.vue'
import { api } from '../services/apiClient'

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
        id_product: p.id,
        product_name: p.name,
        price: p.price,
        id_category: p.category_id,
        category_name: p.category,
        sport: p.sport,
        material_name: p.material_name,
        image_url: p.image_url,
        brand_name: p.brand_name || p.brand || '',
        id_brand: p.id_brand || 1,
        colors: p.colors || [],
        variants: p.variants || [],
        total_stock: p.total_stock ?? p.stock ?? null,
      }))
  } catch (e) {
    // Trang xác nhận đơn vẫn giữ đúng hợp đồng dữ liệu: khi API lỗi thì
    // hiển thị trạng thái rỗng thay vì đưa dữ liệu sản phẩm mẫu lên UI.
    suggested.value = []
  } finally {
    isLoadingSuggested.value = false
  }
}

const goOrders = () => router.push('/account?tab=orders')
const goHome = () => router.push('/')

onMounted(() => {
  window.scrollTo(0, 0)
  if (!order.value) {
    router.replace('/')
    return
  }
  fetchSuggested()
})
</script>

<template>
  <div class="success-page">
    <div v-if="order" class="w-full px-4 py-8 max-w-[1100px] mx-auto">

      <!-- Success hero -->
      <div class="suc-hero">
        <div class="suc-badge-ring">
          <div class="suc-icon">
            <svg class="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
        </div>
        <span class="suc-pill">XÁC NHẬN THÀNH CÔNG</span>
        <h1 class="suc-title">CẢM ƠN BẠN ĐÃ ĐẶT HÀNG!</h1>
        <p class="suc-sub">Hệ thống đã tiếp nhận đơn hàng của bạn. Chúng tôi sẽ sớm chuẩn bị và giao hàng tới bạn trong thời gian sớm nhất.</p>
      </div>

      <!-- Order Summary Card -->
      <div class="suc-card">
        <div class="suc-card-header">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-[#D4001A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m7.5 4.27 9 5.15" />
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
            <span class="font-bold text-sm tracking-wide text-slate-900 uppercase">Thông tin đơn hàng</span>
          </div>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            ĐÃ GHI NHẬN
          </span>
        </div>

        <div class="suc-info-grid">
          <div class="info-item">
            <span class="label">Mã đơn hàng</span>
            <span class="val font-mono font-bold text-slate-900">#{{ getCustomerOrderCode(order) }}</span>
          </div>
          <div class="info-item">
            <span class="label">Tổng thanh toán</span>
            <span class="val font-bold text-[#D4001A] text-lg">{{ formatCurrency(order.total) }}</span>
          </div>
          <div class="info-item">
            <span class="label">Hình thức giao hàng</span>
            <span class="val text-slate-800 font-semibold">{{ order.shippingMethod?.name || 'Giao hàng tiêu chuẩn' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Dự kiến giao hàng</span>
            <span class="val text-slate-800 font-semibold">{{ order.shippingMethod?.eta || '2 - 3 ngày làm việc' }}</span>
          </div>
        </div>

        <div class="suc-actions">
          <button class="btn-sg grow" @click="goOrders">
            <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="16" height="20" x="4" y="2" rx="2" />
              <line x1="8" x2="16" y1="6" y2="6" />
              <line x1="8" x2="16" y1="10" y2="10" />
              <line x1="8" x2="12" y1="14" y2="14" />
            </svg>
            XEM CHI TIẾT ĐƠN HÀNG
          </button>
          <button class="btn-sg-outline grow" @click="goHome">
            <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            TIẾP TỤC MUA SẮM
          </button>
        </div>
      </div>

      <!-- Suggested products -->
      <section class="suc-suggest">
        <div class="sec-head">
          <div>
            <div class="flex items-center gap-2 mb-1.5">
              <span class="w-6 h-0.5 bg-[#D4001A]"></span>
              <span class="text-xs font-bold uppercase tracking-wider text-[#D4001A]">DÀNH CHO BẠN</span>
            </div>
            <h2 class="sec-title">Có thể bạn cũng thích</h2>
            <p class="text-sm text-slate-500 mt-1 mb-0">Khám phá thêm các mẫu sneaker ấn tượng đang được săn đón.</p>
          </div>
          <router-link to="/products" class="btn-sg-outline hidden md:inline-flex items-center gap-1.5">
            <span>Xem tất cả</span>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </router-link>
        </div>

        <div v-if="isLoadingSuggested" class="text-center py-12">
          <div class="sg-spinner text-slate-900 mx-auto"></div>
        </div>
        <FigmaProductGrid v-else :columns="4">
          <div v-for="product in suggested" :key="product.id_product" class="min-w-0">
            <FigmaProductCard :product="product" />
          </div>
        </FigmaProductGrid>
      </section>

    </div>
  </div>
</template>

<style scoped>
.success-page {
  background: radial-gradient(circle at 50% 0%, #FFFFFF 0%, #F8FAFC 100%);
  min-height: 100vh;
  font-family: 'Be Vietnam Pro', sans-serif;
}

.suc-hero {
  text-align: center;
  padding: 32px 0 24px;
}
.suc-badge-ring {
  display: inline-flex;
  padding: 8px;
  border-radius: 9999px;
  background: rgba(220, 252, 231, 0.6);
  margin-bottom: 16px;
  animation: pulse-ring 2s infinite ease-in-out;
}
@keyframes pulse-ring {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.2); }
  50% { box-shadow: 0 0 0 12px rgba(34, 197, 94, 0); }
}
.suc-icon {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: #16A34A;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 25px -5px rgba(22, 163, 74, 0.4);
}
.suc-pill {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #16A34A;
  background: #DCFCE7;
  padding: 4px 12px;
  border-radius: 9999px;
  margin-bottom: 12px;
}
.suc-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.8rem, 3.5vw, 2.4rem);
  letter-spacing: -0.02em;
  color: #0F172A;
  margin-bottom: 10px;
}
.suc-sub {
  color: #64748B;
  font-size: 0.95rem;
  max-width: 580px;
  margin: 0 auto;
  line-height: 1.6;
}

.suc-card {
  max-width: 620px;
  margin: 28px auto 0;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.06);
}
.suc-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid #F1F5F9;
  margin-bottom: 20px;
}
.suc-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #F8FAFC;
  border: 1px solid #F1F5F9;
}
.info-item .label {
  font-size: 0.78rem;
  color: #64748B;
  font-weight: 500;
}
.info-item .val {
  font-size: 0.95rem;
}

.suc-actions {
  display: flex;
  gap: 12px;
}

.suc-suggest {
  margin-top: 56px;
  padding-top: 40px;
  border-top: 1px solid #E2E8F0;
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
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.75rem;
  letter-spacing: -0.02em;
  color: #0F172A;
  margin: 0;
}

@media (max-width: 640px) {
  .suc-info-grid {
    grid-template-columns: 1fr;
  }
  .suc-actions {
    flex-direction: column;
  }
}
</style>
