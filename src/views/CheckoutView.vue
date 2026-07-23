<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { cartItems, cartCount, cartSubtotal, formatCurrency, clearCart } from '../stores/cartStore'
import { createOrder, setServerId } from '../stores/orderStore'
import { currentUser } from '../stores/authStore'
import { notify } from '../stores/uiStore'
import { shippingMethods, distanceFromHanoi } from '../data/mockData'

const router = useRouter()

const form = reactive({
  fullName: currentUser.value?.full_name || '',
  phone: currentUser.value?.phone || '',
  email: currentUser.value?.email || '',
  province: '',
  address: currentUser.value?.address || '',
  note: '',
})

const shippingCode = ref('STANDARD')
const paymentCode = ref('COD')
const placing = ref(false)

const payments = [
  { code: 'COD', name: 'Thanh toán khi nhận hàng (COD)', icon: 'bi-cash-coin', desc: 'Trả tiền mặt khi shipper giao đến.' },
  { code: 'BANK', name: 'Chuyển khoản ngân hàng', icon: 'bi-bank', desc: 'VietQR / Internet Banking, xác nhận tự động.' },
  { code: 'MOMO', name: 'Ví MoMo', icon: 'bi-wallet2', desc: 'Thanh toán nhanh qua ứng dụng MoMo.' },
]

/* ---- Address verification + distance (Express) ---- */
const addressVerified = computed(() => {
  const a = (form.address || '').trim()
  const hasNumber = /\d+/.test(a)
  const longEnough = a.length >= 12
  const hasProvince = form.province.trim().length >= 2
  return hasNumber && longEnough && hasProvince
})

const detectedDistance = computed(() => {
  const key = (form.province || '').trim().toLowerCase()
  if (!key) return null
  for (const k in distanceFromHanoi) {
    if (key.includes(k)) return distanceFromHanoi[k]
  }
  return 150
})

const mapUrl = computed(() => {
  const q = encodeURIComponent(`${form.address}, ${form.province}, Việt Nam`)
  return `https://www.google.com/maps?q=${q}&output=embed`
})

const shippingFee = computed(() => {
  const m = shippingMethods.find((s) => s.code === shippingCode.value)
  if (!m) return 0
  if (m.code === 'EXPRESS') {
    const km = detectedDistance.value ?? 0
    return m.basePrice + km * m.pricePerKm
  }
  return m.basePrice
})

const couponCode = ref('')
const appliedCoupon = ref(null)
const couponError = ref('')

const VALID_COUPONS = [
  { code: 'WELCOME30', type: 'percent', value: 30, desc: 'Giảm 30%', minOrder: 500000 },
  { code: 'FREESHIP', type: 'freeship', value: 0, desc: 'Miễn phí vận chuyển', minOrder: 300000 },
  { code: 'SUMMER20', type: 'percent', value: 20, desc: 'Giảm 20%', minOrder: 400000 },
  { code: 'FLASH50K', type: 'fixed', value: 50000, desc: 'Giảm 50.000đ', minOrder: 800000 },
  { code: 'GIAMGIA10', type: 'percent', value: 10, desc: 'Giảm 10%', minOrder: 0 },
]

const applyCoupon = () => {
  couponError.value = ''
  const c = VALID_COUPONS.find(x => x.code === couponCode.value.trim().toUpperCase())
  if (!c) { couponError.value = 'Mã giảm giá không hợp lệ'; appliedCoupon.value = null; return }
  if (cartSubtotal.value < c.minOrder) { couponError.value = `Đơn tối thiểu ${c.minOrder.toLocaleString('vi-VN')}đ để dùng mã này`; appliedCoupon.value = null; return }
  
  if (appliedCoupon.value?.code === c.code) return; // Prevent spam

  appliedCoupon.value = c
  couponCode.value = c.code
  notify({ type: 'success', title: 'Áp dụng thành công!', message: c.desc })
}
const removeCoupon = () => { appliedCoupon.value = null; couponCode.value = ''; couponError.value = '' }

const discountAmount = computed(() => {
  if (!appliedCoupon.value) return 0
  if (appliedCoupon.value.type === 'percent') return Math.round(cartSubtotal.value * appliedCoupon.value.value / 100)
  if (appliedCoupon.value.type === 'fixed') return appliedCoupon.value.value
  if (appliedCoupon.value.type === 'freeship') return shippingFee.value
  return 0
})

const etaText = computed(() => shippingMethods.find((s) => s.code === shippingCode.value)?.eta || '')
const total = computed(() => Math.max(0, cartSubtotal.value + shippingFee.value - discountAmount.value))

const placeOrder = async () => {
  if (!form.fullName || !form.phone || !form.address || !form.province) {
    notify({ type: 'error', title: 'Thiếu thông tin', message: 'Vui lòng điền đầy đủ thông tin giao hàng.' })
    return
  }
  if (shippingCode.value === 'EXPRESS' && !addressVerified.value) {
    notify({ type: 'warning', title: 'Địa chỉ chưa hợp lệ', message: 'Giao hỏa tốc cần địa chỉ có số nhà và tỉnh/TP rõ ràng.' })
    return
  }
  placing.value = true
  const m = shippingMethods.find((s) => s.code === shippingCode.value)
  const pay = payments.find((p) => p.code === paymentCode.value)
  const r = createOrder({
    customer: { ...form, country: 'Việt Nam' },
    items: cartItems.value,
    subtotal: cartSubtotal.value,
    shippingFee: shippingFee.value,
    discount: discountAmount.value,
    total: total.value,
    shippingMethod: { code: m.code, name: m.name, eta: etaText.value, distanceKm: shippingCode.value === 'EXPRESS' ? detectedDistance.value : null },
    paymentMethod: { code: pay.code, name: pay.name },
    note: form.note,
  })
  if (!r.ok) { placing.value = false; notify({ type: 'error', message: r.message }); return }
  try {
    const res = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.value?.id ?? currentUser.value?.id_user ?? currentUser.value?.UserID ?? null,
        totalAmount: total.value,
        customerName: form.fullName,
        customerPhone: form.phone,
        shippingAddress: `${form.address}, ${form.province}`.trim(),
        shippingFee: shippingFee.value,
        discountAmount: discountAmount.value,
        paymentMethod: pay.name,
        paymentStatus: 'Chưa thanh toán',
        status: 'Chờ xác nhận',
        note: form.note || '',
        items: cartItems.value.map((it) => ({
          product_id: Number(it.id_product ?? it.product?.id_product ?? it.product_id) || null,
          variant_id: Number.isInteger(it.variant_id) ? it.variant_id : null,
          quantity: it.quantity ?? 1,
          price: it.unitPrice ?? it.price ?? 0,
          size: it.size?.size_name ?? it.size ?? '',
          color: it.color?.color_label ?? it.color?.color_name ?? it.color ?? '',
          name: it.product?.product_name ?? it.product_name ?? it.name ?? '',
        })),
      }),
    })
    const data = await res.json().catch(() => ({}))
    const serverId = data.orderId ?? data.OrderID
    if (serverId) setServerId(r.order.id, serverId)
  } catch (e) { }
  placing.value = false
  await router.push({ path: '/order-success', query: { orderId: r.order.id } })
  clearCart()
}
</script>

<template>
  <div class="checkout-page">
    <div class="container-fluid px-4 py-5" style="max-width: 1200px; margin: 0 auto;">
      <h1 class="co-title">THANH TOÁN</h1>
      <div class="sg-title-bar mb-5"></div>

      <div v-if="cartCount === 0" class="empty-state">
        <i class="bi bi-bag"></i>
        <h5>Không có sản phẩm để thanh toán</h5>
        <router-link to="/products" class="btn-sg mt-3">MUA SẮM NGAY</router-link>
      </div>

      <div v-else class="row g-5">
        <div class="col-lg-7">
          
          <!-- 1. Giao hàng -->
          <div class="co-block">
            <h6 class="co-h">
              <span class="co-num">1</span> THÔNG TIN GIAO HÀNG
            </h6>
            <div class="row g-4 mt-2">
              <div class="col-md-6">
                <label class="co-label">HỌ TÊN</label>
                <input v-model="form.fullName" class="sg-input w-100">
              </div>
              <div class="col-md-6">
                <label class="co-label">SỐ ĐIỆN THOẠI</label>
                <input v-model="form.phone" class="sg-input w-100">
              </div>
              <div class="col-md-6">
                <label class="co-label">EMAIL</label>
                <input v-model="form.email" class="sg-input w-100">
              </div>
              <div class="col-md-6">
                <label class="co-label">TỈNH / THÀNH PHỐ</label>
                <input v-model="form.province" class="sg-input w-100" placeholder="VD: Hà Nội">
              </div>
              <div class="col-12">
                <label class="co-label">ĐỊA CHỈ CHI TIẾT</label>
                <input v-model="form.address" class="sg-input w-100" placeholder="Số nhà, ngõ, đường, phường/xã…">
                <div class="addr-status mt-2" :class="addressVerified ? 'text-success' : 'text-warning'">
                  <i class="bi" :class="addressVerified ? 'bi-check-circle' : 'bi-exclamation-circle'"></i>
                  {{ addressVerified ? 'Địa chỉ hợp lệ.' : 'Cần số nhà và tỉnh/TP để xác minh.' }}
                </div>
              </div>
              <div class="col-12">
                <label class="co-label">GHI CHÚ</label>
                <textarea v-model="form.note" class="sg-input w-100" rows="2"></textarea>
              </div>
            </div>
            
            <div v-if="addressVerified" class="map-wrap mt-4">
              <iframe :src="mapUrl" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            </div>
          </div>

          <!-- 2. Vận chuyển -->
          <div class="co-block">
            <h6 class="co-h">
              <span class="co-num">2</span> PHƯƠNG THỨC VẬN CHUYỂN
            </h6>
            <div class="ship-grid mt-4">
              <label v-for="m in shippingMethods" :key="m.code" class="ship-opt" :class="{ active: shippingCode === m.code }">
                <input type="radio" :value="m.code" v-model="shippingCode" hidden>
                <div class="flex-grow-1">
                  <div class="ship-name">{{ m.name }}</div>
                  <div class="ship-desc">{{ m.desc }}</div>
                  <div class="ship-eta">
                    Dự kiến: {{ m.eta }}
                    <template v-if="m.code === 'EXPRESS' && detectedDistance"> · ~{{ detectedDistance }}km</template>
                  </div>
                </div>
                <div class="ship-fee">{{ formatCurrency(m.code === 'EXPRESS' ? (m.basePrice + (detectedDistance || 0) * m.pricePerKm) : m.basePrice) }}</div>
                <div class="ship-check"></div>
              </label>
            </div>
            <div v-if="shippingCode === 'EXPRESS'" class="express-note">
              Giao hỏa tốc tính phí theo khoảng cách từ kho Hà Nội: {{ formatCurrency(shippingMethods[1].basePrice) }} + {{ formatCurrency(shippingMethods[1].pricePerKm) }}/km.
            </div>
          </div>

          <!-- 3. Thanh toán -->
          <div class="co-block">
            <h6 class="co-h">
              <span class="co-num">3</span> PHƯƠNG THỨC THANH TOÁN
            </h6>
            <div class="pay-grid mt-4">
              <label v-for="p in payments" :key="p.code" class="pay-opt" :class="{ active: paymentCode === p.code }">
                <input type="radio" :value="p.code" v-model="paymentCode" hidden>
                <i class="bi" :class="p.icon"></i>
                <div class="flex-grow-1">
                  <div class="pay-name">{{ p.name }}</div>
                  <div class="pay-desc">{{ p.desc }}</div>
                </div>
                <div class="pay-check"></div>
              </label>
            </div>
          </div>
          
        </div>

        <div class="col-lg-5">
          <div class="co-summary-box">
            <h6 class="summary-title">ĐƠN HÀNG ({{ cartCount }})</h6>
            
            <div class="co-items mt-4">
              <div class="co-item" v-for="item in cartItems" :key="item.id_product_detail">
                <div class="co-item-img">
                  <img :src="item.product?.image_url">
                  <span class="co-qty">{{ item.quantity }}</span>
                </div>
                <div class="flex-grow-1">
                  <div class="co-item-name">{{ item.product?.product_name }}</div>
                  <div class="co-item-attr">Size {{ item.size?.size_name }} · {{ item.color?.color_label }}</div>
                </div>
                <div class="co-item-price">{{ formatCurrency(item.subtotal) }}</div>
              </div>
            </div>
            
            <!-- Mã giảm giá -->
            <div class="coupon-section mt-4">
              <div class="coupon-label">MÃ GIẢM GIÁ</div>
              <div v-if="appliedCoupon" class="coupon-applied mt-2">
                <div class="ca-info">
                  <span class="ca-code">{{ appliedCoupon.code }}</span>
                  <span class="ca-desc">{{ appliedCoupon.desc }}</span>
                </div>
                <button class="ca-remove" @click="removeCoupon"><i class="bi bi-x"></i></button>
              </div>
              <div v-else class="coupon-input-row mt-2">
                <input v-model="couponCode" class="sg-input flex-grow-1" placeholder="Nhập mã..." @keyup.enter="applyCoupon" style="text-transform:uppercase">
                <button class="btn-sg-outline" @click="applyCoupon">ÁP DỤNG</button>
              </div>
              <div v-if="couponError" class="text-danger mt-2" style="font-size: 0.8rem;">{{ couponError }}</div>
              
              <div class="coupon-hints mt-3">
                <div class="ch-list">
                  <button v-for="c in VALID_COUPONS" :key="c.code" class="ch-btn" :class="{ sel: appliedCoupon?.code === c.code }" @click="couponCode = c.code; applyCoupon()">
                    {{ c.code }}
                  </button>
                </div>
              </div>
            </div>

            <hr class="summary-divider mt-4">
            
            <div class="sum-row mt-4">
              <span>Tạm tính</span>
              <span>{{ formatCurrency(cartSubtotal) }}</span>
            </div>
            <div class="sum-row">
              <span>Phí vận chuyển</span>
              <span>{{ formatCurrency(shippingFee) }}</span>
            </div>
            <div v-if="appliedCoupon" class="sum-row text-success">
              <span>Giảm giá ({{ appliedCoupon.code }})</span>
              <span>-{{ formatCurrency(discountAmount) }}</span>
            </div>
            <div class="sum-row">
              <span>Dự kiến giao</span>
              <span>{{ etaText }}</span>
            </div>
            
            <hr class="summary-divider">
            
            <div class="sum-row total">
              <span>TỔNG THANH TOÁN</span>
              <strong>{{ formatCurrency(total) }}</strong>
            </div>
            
            <button class="btn-sg-warm w-100 mt-4" :disabled="placing" @click="placeOrder">
              {{ placing ? 'ĐANG XỬ LÝ...' : 'ĐẶT HÀNG' }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.checkout-page {
  background: #ffffff;
  min-height: 100vh;
}
.co-title {
  font-weight: 700;
  font-size: 1.5rem;
  letter-spacing: 0.12em;
  color: #1a1a1a;
  margin: 0 0 4px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: #fafafa;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
}
.empty-state i {
  font-size: 2.5rem;
  color: #ccc;
  display: block;
  margin-bottom: 16px;
}

/* Blocks */
.co-block {
  margin-bottom: 40px;
}
.co-h {
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 0.1em;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #1a1a1a;
}
.co-num {
  width: 24px;
  height: 24px;
  background: #1a1a1a;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
}
.co-label {
  font-weight: 600;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  color: #555;
  margin-bottom: 8px;
  display: block;
}

.addr-status {
  font-size: 0.8rem;
  font-weight: 500;
}

.map-wrap {
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  overflow: hidden;
}
.map-wrap iframe {
  width: 100%;
  height: 250px;
  border: 0;
  display: block;
}

/* Grid Options (Shipping/Payment) */
.ship-grid, .pay-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ship-opt, .pay-opt {
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}
.ship-opt:hover, .pay-opt:hover {
  border-color: #1a1a1a;
}
.ship-opt.active, .pay-opt.active {
  border-color: #1a1a1a;
  border-width: 2px;
  padding: 19px; /* adjust for border */
}

.ship-name, .pay-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: #1a1a1a;
  margin-bottom: 4px;
}
.ship-desc, .pay-desc {
  font-size: 0.8rem;
  color: #666;
}
.ship-eta {
  font-size: 0.75rem;
  color: #1a1a1a;
  font-weight: 600;
  margin-top: 6px;
}
.ship-fee {
  font-weight: 600;
  color: #1a1a1a;
  font-size: 0.95rem;
  margin-right: 16px;
}

.ship-check, .pay-check {
  width: 20px;
  height: 20px;
  border: 1px solid #d0d0d0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ship-opt.active .ship-check, .pay-opt.active .pay-check {
  border: 6px solid #1a1a1a;
}

.pay-opt i {
  font-size: 1.5rem;
  color: #1a1a1a;
  width: 40px;
  text-align: center;
}

.express-note {
  margin-top: 16px;
  background: #fafafa;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  padding: 16px;
  font-size: 0.8rem;
  color: #555;
}

/* Summary */
.co-summary-box {
  background: #fafafa;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  padding: 32px;
  position: sticky;
  top: 100px;
}
.summary-title {
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 0.1em;
  color: #1a1a1a;
  margin: 0;
}

.co-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}
.co-item {
  display: flex;
  gap: 16px;
  align-items: center;
}
.co-item-img {
  position: relative;
  width: 64px;
  height: 64px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
}
.co-item-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.co-qty {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  background: #1a1a1a;
  color: #fff;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.co-item-name {
  font-weight: 600;
  font-size: 0.9rem;
  line-height: 1.3;
  color: #1a1a1a;
}
.co-item-attr {
  font-size: 0.8rem;
  color: #666;
  margin-top: 4px;
}
.co-item-price {
  font-weight: 600;
  font-size: 0.9rem;
  color: #1a1a1a;
}

.coupon-section {
  border-top: 1px solid #e5e5e5;
  padding-top: 24px;
}
.coupon-label {
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  color: #1a1a1a;
}
.coupon-input-row {
  display: flex;
  gap: 8px;
}
.coupon-applied {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border: 1px solid #1a1a1a;
  padding: 12px 16px;
  border-radius: 4px;
}
.ca-code {
  font-weight: 700;
  font-size: 0.9rem;
  color: #1a1a1a;
  display: block;
}
.ca-desc {
  font-size: 0.8rem;
  color: #666;
}
.ca-remove {
  border: 0;
  background: transparent;
  color: #888;
  font-size: 1.2rem;
  cursor: pointer;
}
.ca-remove:hover {
  color: #D4001A;
}

.ch-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ch-btn {
  border: 1px solid #e5e5e5;
  background: #fff;
  padding: 6px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.ch-btn:hover {
  border-color: #1a1a1a;
}
.ch-btn.sel {
  background: #1a1a1a;
  color: #fff;
  border-color: #1a1a1a;
}

.summary-divider {
  border-top: 1px solid #e5e5e5;
  margin: 0;
}
.sum-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  color: #555;
  font-size: 0.95rem;
}
.sum-row.total {
  font-size: 1.1rem;
  color: #1a1a1a;
  font-weight: 600;
}

</style>
