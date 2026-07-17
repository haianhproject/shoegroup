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
const successOrder = ref(null)

const payments = [
  { code: 'COD', name: 'Thanh toán khi nhận hàng (COD)', icon: 'bi-cash-coin', desc: 'Trả tiền mặt khi shipper giao đến.' },
  { code: 'BANK', name: 'Chuyển khoản ngân hàng', icon: 'bi-bank', desc: 'VietQR / Internet Banking, xác nhận tự động.' },
  { code: 'MOMO', name: 'Ví MoMo', icon: 'bi-wallet2', desc: 'Thanh toán nhanh qua ứng dụng MoMo.' },
]

/* ---- Address verification + distance (Express) ---- */
// Nhận biết địa chỉ "thật": cần có số nhà, tên đường/phường, và tỉnh/TP.
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
  return 150 // mặc định cho tỉnh chưa có trong bảng
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

const etaText = computed(() => shippingMethods.find((s) => s.code === shippingCode.value)?.eta || '')
const total = computed(() => cartSubtotal.value + shippingFee.value)

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
    discount: 0,
    total: total.value,
    shippingMethod: { code: m.code, name: m.name, eta: etaText.value, distanceKm: shippingCode.value === 'EXPRESS' ? detectedDistance.value : null },
    paymentMethod: { code: pay.code, name: pay.name },
    note: form.note,
  })
  if (!r.ok) { placing.value = false; notify({ type: 'error', message: r.message }); return }
  // Lưu đơn lên server để trang Quản lý (Admin) nhận được đơn của khách.
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
        discountAmount: 0,
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
  } catch (e) { /* offline: đã lưu cục bộ qua orderStore */ }
  placing.value = false
  successOrder.value = r.order
  clearCart()
}

const goOrders = () => { successOrder.value = null; router.push('/account?tab=orders') }
const goHome = () => { successOrder.value = null; router.push('/') }
</script>

<template>
  <div class="checkout-page">
    <div class="container-fluid px-4 py-4">
      <div class="sg-title-bar mb-2"></div>
      <h1 class="co-title">Thanh toán</h1>

      <div v-if="cartCount === 0 && !successOrder" class="empty sg-card">
        <i class="bi bi-bag-x"></i><h5>Không có sản phẩm để thanh toán</h5>
        <router-link to="/products" class="btn-sg">Mua sắm ngay</router-link>
      </div>

      <div v-else-if="!successOrder" class="row g-4 mt-1">
        <div class="col-lg-7">
          <!-- Shipping info -->
          <div class="sg-card co-block">
            <h6 class="co-h"><span class="co-num">1</span> Thông tin giao hàng</h6>
            <div class="row g-3">
              <div class="col-md-6"><label class="co-label">Họ tên</label><input v-model="form.fullName" class="sg-input w-100"></div>
              <div class="col-md-6"><label class="co-label">Số điện thoại</label><input v-model="form.phone" class="sg-input w-100"></div>
              <div class="col-md-6"><label class="co-label">Email</label><input v-model="form.email" class="sg-input w-100"></div>
              <div class="col-md-6"><label class="co-label">Tỉnh / Thành phố</label><input v-model="form.province" class="sg-input w-100" placeholder="VD: Hà Nội"></div>
              <div class="col-12"><label class="co-label">Địa chỉ chi tiết</label>
                <input v-model="form.address" class="sg-input w-100" placeholder="Số nhà, ngõ, đường, phường/xã…">
                <div class="addr-status" :class="addressVerified ? 'ok' : 'warn'">
                  <i class="bi" :class="addressVerified ? 'bi-patch-check-fill' : 'bi-exclamation-circle'"></i>
                  {{ addressVerified ? 'Địa chỉ hợp lệ, đã xác minh.' : 'Cần số nhà và tỉnh/TP để xác minh địa chỉ thật.' }}
                </div>
              </div>
              <div class="col-12"><label class="co-label">Ghi chú</label><textarea v-model="form.note" class="sg-input w-100" rows="2"></textarea></div>
            </div>
            <!-- Map preview -->
            <div v-if="addressVerified" class="map-wrap">
              <iframe :src="mapUrl" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            </div>
          </div>

          <!-- Shipping method -->
          <div class="sg-card co-block">
            <h6 class="co-h"><span class="co-num">2</span> Phương thức vận chuyển</h6>
            <div class="ship-grid">
              <label v-for="m in shippingMethods" :key="m.code" class="ship-opt" :class="{ active: shippingCode === m.code }">
                <input type="radio" :value="m.code" v-model="shippingCode" hidden>
                <div class="ship-ic" :class="m.code === 'EXPRESS' ? 'warm' : 'blue'"><i class="bi" :class="m.code === 'EXPRESS' ? 'bi-lightning-charge-fill' : 'bi-truck'"></i></div>
                <div class="flex-grow-1">
                  <div class="ship-name">{{ m.name }}</div>
                  <div class="ship-desc">{{ m.desc }}</div>
                  <div class="ship-eta"><i class="bi bi-clock"></i> {{ m.eta }}
                    <template v-if="m.code === 'EXPRESS' && detectedDistance"> · ~{{ detectedDistance }}km từ Hà Nội</template>
                  </div>
                </div>
                <div class="ship-fee">{{ formatCurrency(m.code === 'EXPRESS' ? (m.basePrice + (detectedDistance || 0) * m.pricePerKm) : m.basePrice) }}</div>
              </label>
            </div>
            <div v-if="shippingCode === 'EXPRESS'" class="express-note">
              <i class="bi bi-info-circle"></i> Giao hỏa tốc tính phí theo khoảng cách từ kho <strong>Hà Nội</strong>: {{ formatCurrency(shippingMethods[1].basePrice) }} + {{ formatCurrency(shippingMethods[1].pricePerKm) }}/km. Thời gian dự kiến khoảng 24 giờ.
            </div>
          </div>

          <!-- Payment -->
          <div class="sg-card co-block">
            <h6 class="co-h"><span class="co-num">3</span> Phương thức thanh toán</h6>
            <div class="pay-grid">
              <label v-for="p in payments" :key="p.code" class="pay-opt" :class="{ active: paymentCode === p.code }">
                <input type="radio" :value="p.code" v-model="paymentCode" hidden>
                <i class="bi" :class="p.icon"></i>
                <div><div class="pay-name">{{ p.name }}</div><div class="pay-desc">{{ p.desc }}</div></div>
                <span class="pay-check"><i class="bi bi-check-lg"></i></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div class="col-lg-5">
          <div class="sg-card co-summary">
            <h6 class="fw-bold mb-3">Đơn hàng ({{ cartCount }})</h6>
            <div class="co-items">
              <div class="co-item" v-for="item in cartItems" :key="item.id_product_detail">
                <div class="co-item-img"><img :src="item.product?.image_url"><span class="co-qty">{{ item.quantity }}</span></div>
                <div class="flex-grow-1">
                  <div class="co-item-name">{{ item.product?.product_name }}</div>
                  <div class="co-item-attr">Size {{ item.size?.size_name }} · {{ item.color?.color_label }}</div>
                </div>
                <div class="co-item-price">{{ formatCurrency(item.subtotal) }}</div>
              </div>
            </div>
            <hr>
            <div class="sum-row"><span>Tạm tính</span><strong>{{ formatCurrency(cartSubtotal) }}</strong></div>
            <div class="sum-row"><span>Phí vận chuyển</span><strong>{{ formatCurrency(shippingFee) }}</strong></div>
            <div class="sum-row eta"><span>Dự kiến giao</span><strong>{{ etaText }}</strong></div>
            <hr>
            <div class="sum-row total"><span>Tổng thanh toán</span><strong>{{ formatCurrency(total) }}</strong></div>
            <button class="btn-sg w-100 mt-3" :disabled="placing" @click="placeOrder">
              <i class="bi bi-lock-fill me-2"></i>{{ placing ? 'Đang xử lý…' : 'Đặt hàng' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- CENTERED SUCCESS (not a local alert) -->
    <transition name="suc">
      <div v-if="successOrder" class="suc-overlay">
        <div class="suc-card sg-card">
          <div class="suc-check"><i class="bi bi-check-lg"></i></div>
          <h3>Đặt hàng thành công!</h3>
          <p class="text-secondary">Cảm ơn bạn đã mua sắm tại ShoeGroup. Đơn hàng đang được xử lý.</p>
          <div class="suc-info">
            <div><span>Mã đơn</span><strong>{{ successOrder.id }}</strong></div>
            <div><span>T���ng tiền</span><strong>{{ formatCurrency(successOrder.total) }}</strong></div>
            <div><span>Giao hàng</span><strong>{{ successOrder.shippingMethod.name }}</strong></div>
            <div><span>Dự kiến</span><strong>{{ successOrder.shippingMethod.eta }}</strong></div>
          </div>
          <div class="d-flex gap-2 mt-3">
            <button class="btn-sg flex-grow-1" @click="goOrders">Xem đơn hàng</button>
            <button class="btn-sg-outline" @click="goHome">Về trang chủ</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.checkout-page { background: var(--sg-canvas); min-height: 100vh; }
.co-title { font-weight: 900; font-size: 1.9rem; letter-spacing: -.02em; }
.empty { text-align: center; padding: 60px; }
.empty i { font-size: 3rem; color: var(--sg-muted); }
.co-block { padding: 22px; margin-bottom: 18px; }
.co-h { font-weight: 800; display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.co-num { width: 28px; height: 28px; border-radius: 50%; background: var(--sg-grad-primary); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: .9rem; }
.co-label { font-weight: 700; font-size: .82rem; color: var(--sg-ink-2); margin-bottom: 6px; display: block; }
.addr-status { font-size: .8rem; font-weight: 600; margin-top: 6px; }
.addr-status.ok { color: #16a34a; }
.addr-status.warn { color: #f59e0b; }
.map-wrap { margin-top: 14px; border-radius: 14px; overflow: hidden; border: 1px solid var(--sg-line); }
.map-wrap iframe { width: 100%; height: 220px; border: 0; display: block; }

.ship-grid, .pay-grid { display: flex; flex-direction: column; gap: 12px; }
.ship-opt { display: flex; align-items: center; gap: 14px; border: 2px solid var(--sg-line); border-radius: 16px; padding: 14px; cursor: pointer; transition: .2s; }
.ship-opt:hover { border-color: var(--sg-blue); }
.ship-opt.active { border-color: var(--sg-blue); background: var(--sg-soft); }
.ship-ic { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.2rem; flex-shrink: 0; }
.ship-ic.blue { background: var(--sg-grad-primary); } .ship-ic.warm { background: var(--sg-grad-warm); }
.ship-name { font-weight: 800; }
.ship-desc { font-size: .8rem; color: var(--sg-muted); }
.ship-eta { font-size: .78rem; color: var(--sg-blue-700); font-weight: 600; margin-top: 3px; }
.ship-fee { font-weight: 900; color: var(--sg-ink); }
.express-note { margin-top: 12px; background: #fff1eb; border: 1px solid #ffd9c7; border-radius: 12px; padding: 12px 14px; font-size: .82rem; color: var(--sg-orange-600); }

.pay-opt { display: flex; align-items: center; gap: 14px; border: 2px solid var(--sg-line); border-radius: 16px; padding: 14px; cursor: pointer; transition: .2s; }
.pay-opt:hover { border-color: var(--sg-blue); }
.pay-opt.active { border-color: var(--sg-blue); background: var(--sg-soft); }
.pay-opt > i { font-size: 1.6rem; color: var(--sg-blue); width: 36px; text-align: center; }
.pay-name { font-weight: 800; }
.pay-desc { font-size: .8rem; color: var(--sg-muted); }
.pay-check { margin-left: auto; width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--sg-line); color: #fff; display: flex; align-items: center; justify-content: center; transition: .2s; }
.pay-opt.active .pay-check { background: var(--sg-blue); border-color: var(--sg-blue); }

.co-summary { padding: 22px; position: sticky; top: 90px; }
.co-items { display: flex; flex-direction: column; gap: 12px; max-height: 300px; overflow-y: auto; }
.co-item { display: flex; gap: 10px; align-items: center; }
.co-item-img { position: relative; width: 54px; height: 54px; border-radius: 10px; overflow: hidden; background: var(--sg-canvas); flex-shrink: 0; }
.co-item-img img { width: 100%; height: 100%; object-fit: cover; mix-blend-mode: multiply; }
.co-qty { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; background: var(--sg-ink); color: #fff; border-radius: 50%; font-size: .7rem; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.co-item-name { font-weight: 700; font-size: .85rem; line-height: 1.2; }
.co-item-attr { font-size: .74rem; color: var(--sg-muted); }
.co-item-price { font-weight: 800; font-size: .85rem; }
.sum-row { display: flex; justify-content: space-between; margin-bottom: 8px; color: var(--sg-ink-2); }
.sum-row.eta strong { color: var(--sg-blue-700); }
.sum-row.total { font-size: 1.2rem; color: var(--sg-ink); }
.sum-row.total strong { color: var(--sg-blue-700); }

/* Success overlay */
.suc-overlay { position: fixed; inset: 0; z-index: 3000; background: rgba(10,20,45,.55); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 18px; }
.suc-card { max-width: 440px; width: 100%; padding: 34px; text-align: center; border-radius: 24px; box-shadow: var(--sg-shadow-lg); }
.suc-check { width: 80px; height: 80px; margin: 0 auto 18px; border-radius: 50%; background: linear-gradient(135deg,#22c55e,#16a34a); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 2.6rem; box-shadow: 0 12px 30px rgba(22,163,74,.4); animation: sucPop .5s cubic-bezier(.34,1.56,.64,1); }
@keyframes sucPop { from { transform: scale(0); } to { transform: scale(1); } }
.suc-card h3 { font-weight: 900; }
.suc-info { background: var(--sg-canvas); border-radius: 14px; padding: 16px; margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: left; }
.suc-info span { display: block; font-size: .74rem; color: var(--sg-muted); }
.suc-info strong { font-size: .92rem; }
.suc-enter-active { transition: opacity .3s; }
.suc-enter-from { opacity: 0; }
</style>
