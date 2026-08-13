<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { cartItems, cartCount, cartSubtotal, formatCurrency, clearCart } from '../stores/cartStore'
import { createOrder, setServerId, orderState, saveOrders } from '../stores/orderStore'
import { currentUser } from '../stores/authStore'
import { notify } from '../stores/uiStore'
import { shippingMethods } from '../data/mockData'
import { api } from "../services/apiClient";

const router = useRouter()

const form = reactive({
  fullName: currentUser.value?.full_name || '',
  phone: currentUser.value?.phone || '',
  email: currentUser.value?.email || '',
  province: '',
  address: currentUser.value?.address || '',
  note: '',
})

const ADDR_KEY = 'shoegroup_addresses_v1'
const savedAddresses = ref([])

onMounted(() => {
  try {
    savedAddresses.value = JSON.parse(localStorage.getItem(ADDR_KEY) || '[]')
  } catch (e) {
    savedAddresses.value = []
  }
  if (savedAddresses.value.length > 0 && !form.fullName && !form.phone) {
    const def = savedAddresses.value.find(a => a.isDefault) || savedAddresses.value[0]
    selectAddress(def)
  }
})

function selectAddress(a) {
  if (!a) return
  form.fullName = a.recipient || ''
  form.phone = a.phone || ''
  form.province = a.province || ''
  form.address = a.line || ''
  validateForm()
}

const shippingCode = ref('STANDARD')
const paymentCode = ref('COD')
const placing = ref(false)

const payments = [
  { code: 'COD', name: 'Thanh toán khi nhận hàng (COD)', icon: 'bi-cash-coin', desc: 'Trả tiền mặt khi shipper giao đến.' },
  { code: 'BANK', name: 'Chuyển khoản ngân hàng', icon: 'bi-bank', desc: 'VietQR / Internet Banking, xác nhận tự động.' },
]

/* ---- Validate helpers ---- */
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
const isValidPhone = (phone) => /^(0[3|5|7|8|9])[0-9]{8}$/.test(String(phone || '').replace(/\s/g, ''))

const formErrors = reactive({ fullName: '', phone: '', email: '', province: '', address: '' })

function validateForm() {
  let ok = true
  formErrors.fullName = form.fullName.trim() ? '' : 'Vui lòng nhập họ tên.'
  if (formErrors.fullName) ok = false

  if (!form.phone.trim()) {
    formErrors.phone = 'Vui lòng nhập số điện thoại.'
    ok = false
  } else if (!isValidPhone(form.phone)) {
    formErrors.phone = 'Số điện thoại không hợp lệ (10 số, bắt đầu 03/05/07/08/09).'
    ok = false
  } else {
    formErrors.phone = ''
  }

  if (form.email.trim() && !isValidEmail(form.email)) {
    formErrors.email = 'Email không đúng định dạng.'
    ok = false
  } else {
    formErrors.email = ''
  }

  formErrors.province = form.province.trim() ? '' : 'Vui lòng chọn tỉnh/thành phố.'
  if (formErrors.province) ok = false

  formErrors.address = form.address.trim() ? '' : 'Vui lòng nhập địa chỉ chi tiết.'
  if (formErrors.address) ok = false

  return ok
}

/* ---- Address verification ---- */
const addressVerified = computed(() => {
  const a = (form.address || '').trim()
  const hasNumber = /\d+/.test(a)
  const longEnough = a.length >= 12
  const hasProvince = form.province.trim().length >= 2
  return hasNumber && longEnough && hasProvince
})

const mapUrl = computed(() => {
  const q = encodeURIComponent(`${form.address}, ${form.province}, Việt Nam`)
  return `https://www.google.com/maps?q=${q}&output=embed`
})

const shippingFee = computed(() => {
  const m = shippingMethods.find((s) => s.code === shippingCode.value)
  if (!m) return 0
  return m.basePrice
})

/* ---- Coupon from DB ---- */
const couponCode = ref('')
const appliedCoupon = ref(null)
const couponError = ref('')
const dbCoupons = ref([])
const couponsLoading = ref(false)

async function loadCoupons() {
  couponsLoading.value = true
  try {
    const list = await api.get('/discounts')
    if (Array.isArray(list)) {
      const now = new Date()
      dbCoupons.value = list.filter(d => {
        if (!d.active) return false
        if (d.expiry && new Date(d.expiry) < now) return false
        return true
      })
    }
  } catch (e) {
    // Nếu không lấy được từ server, bỏ qua
  } finally {
    couponsLoading.value = false
  }
}
loadCoupons()

const applyCoupon = () => {
  couponError.value = ''
  const code = couponCode.value.trim().toUpperCase()
  if (!code) { couponError.value = 'Vui lòng nhập mã giảm giá.'; return }

  // Tìm mã trong danh sách từ DB
  const c = dbCoupons.value.find(x => (x.code || '').toUpperCase() === code)
  if (!c) { couponError.value = 'Mã giảm giá không hợp lệ hoặc đã hết hạn.'; appliedCoupon.value = null; return }

  // Kiểm tra giới hạn lượt dùng
  const limit = Number(c.limit || c.quantity || 0)
  const used = Number(c.used || 0)
  if (limit > 0 && used >= limit) {
    couponError.value = 'Mã giảm giá này đã hết lượt sử dụng.'
    appliedCoupon.value = null
    return
  }

  // Kiểm tra đơn tối thiểu
  const minOrder = Number(c.min_order || 0)
  if (minOrder > 0 && cartSubtotal.value < minOrder) {
    couponError.value = `Đơn tối thiểu ${minOrder.toLocaleString('vi-VN')}đ để dùng mã này.`
    appliedCoupon.value = null
    return
  }

  if (appliedCoupon.value?.code === c.code) return // Chống spam

  appliedCoupon.value = c
  couponCode.value = c.code
  const desc = c.name || (c.discount_type === 'Cố định' ? `Giảm ${Number(c.value).toLocaleString('vi-VN')}đ` : `Giảm ${c.value}%`)
  notify({ type: 'success', title: 'Áp dụng thành công!', message: desc })
}
const removeCoupon = () => { appliedCoupon.value = null; couponCode.value = ''; couponError.value = '' }

const discountAmount = computed(() => {
  if (!appliedCoupon.value) return 0
  const c = appliedCoupon.value
  const sub = cartSubtotal.value
  let amt = 0
  if (c.discount_type === 'Cố định' || c.type === 'fixed') {
    amt = Number(c.value) || 0
  } else if (c.discount_type === 'Phần trăm' || c.type === 'percent') {
    amt = Math.round(sub * (Number(c.value) || 0) / 100)
  } else if (c.type === 'freeship') {
    return shippingFee.value
  }
  // Giới hạn giảm tối đa
  const maxDisc = Number(c.max_discount || 0)
  if (maxDisc > 0 && amt > maxDisc) amt = maxDisc
  return Math.min(amt, sub)
})

const etaText = computed(() => shippingMethods.find((s) => s.code === shippingCode.value)?.eta || '')
const total = computed(() => Math.max(0, cartSubtotal.value + shippingFee.value - discountAmount.value))

const payModal = reactive({ open: false, orderId: null, serverId: null, total: 0 })

const confirmPaid = async () => {
  if (payModal.serverId) {
    try {
      await api.put(`/orders/${payModal.serverId}/payment`, { payment_status: 'Chờ thanh toán' })
    } catch(e) {}
  }
  const order = orderState.orders.find(x => x.id === payModal.orderId)
  if (order) {
    order.payment_status = 'Chờ thanh toán'
    saveOrders()
  }
  payModal.open = false
  router.push({ path: '/order-success', query: { orderId: payModal.orderId } })
}

const payLater = () => {
  payModal.open = false
  router.push({ path: '/order-success', query: { orderId: payModal.orderId } })
}

const placeOrder = async () => {
  if (!validateForm()) {
    notify({ type: 'error', title: 'Thông tin chưa hợp lệ', message: 'Vui lòng kiểm tra lại các trường được đánh dấu đỏ.' })
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
    shippingMethod: { code: m.code, name: m.name, eta: etaText.value, distanceKm: 0 },
    paymentMethod: { code: pay.code, name: pay.name },
    note: form.note,
  })
  if (!r.ok) { placing.value = false; notify({ type: 'error', message: r.message }); return }
  
  let createdServerId = null;
  try {
    const payload = {
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
      couponCode: appliedCoupon.value?.code || null,
      items: cartItems.value.map((it) => ({
        product_id: Number(it.id_product ?? it.product?.id_product ?? it.product_id) || null,
        variant_id: it.variant_id != null ? Number(it.variant_id) : null,
        quantity: it.quantity ?? 1,
        price: it.unitPrice ?? it.price ?? 0,
        size: it.size?.size_name ?? it.size ?? '',
        color: it.color?.color_label ?? it.color?.color_name ?? it.color ?? '',
        name: it.product?.product_name ?? it.product_name ?? it.name ?? '',
      })),
    };
    const data = await api.post('/orders', payload);
    createdServerId = data?.orderId ?? data?.OrderID;
    if (createdServerId) setServerId(r.order.id, createdServerId);
  } catch (e) {
    // backend offline
  }
  placing.value = false
  
  if (paymentCode.value === 'BANK' || paymentCode.value === 'MOMO') {
    payModal.orderId = r.order.id
    payModal.serverId = createdServerId
    payModal.total = total.value
    payModal.open = true
    clearCart()
    return
  }

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
            <div v-if="savedAddresses.length > 0" class="mt-3">
              <label class="co-label text-primary"><i class="bi bi-journal-bookmark-fill me-1"></i>CHỌN TỪ SỔ ĐỊA CHỈ</label>
              <select class="sg-input w-100 bg-light" @change="e => selectAddress(savedAddresses[e.target.value])">
                <option value="" disabled selected>-- Chọn địa chỉ đã lưu --</option>
                <option v-for="(a, i) in savedAddresses" :key="a.id" :value="i">
                  {{ a.recipient }} - {{ a.phone }} ({{ a.province }})
                </option>
              </select>
            </div>
            <div class="row g-4 mt-2">
              <div class="col-md-6">
                <label class="co-label">HỌ TÊN <span class="text-danger">*</span></label>
                <input v-model="form.fullName" class="sg-input w-100" :class="formErrors.fullName ? 'input-error' : ''" @blur="validateForm">
                <div v-if="formErrors.fullName" class="field-error">{{ formErrors.fullName }}</div>
              </div>
              <div class="col-md-6">
                <label class="co-label">SỐ ĐIỆN THOẠI <span class="text-danger">*</span></label>
                <input v-model="form.phone" class="sg-input w-100" :class="formErrors.phone ? 'input-error' : ''" @blur="validateForm" placeholder="VD: 0901234567">
                <div v-if="formErrors.phone" class="field-error">{{ formErrors.phone }}</div>
              </div>
              <div class="col-md-6">
                <label class="co-label">EMAIL</label>
                <input v-model="form.email" type="email" class="sg-input w-100" :class="formErrors.email ? 'input-error' : ''" @blur="validateForm" placeholder="you@example.com">
                <div v-if="formErrors.email" class="field-error">{{ formErrors.email }}</div>
              </div>
              <div class="col-md-6">
                <label class="co-label">TỈNH / THÀNH PHỐ <span class="text-danger">*</span></label>
                <input v-model="form.province" class="sg-input w-100" :class="formErrors.province ? 'input-error' : ''" @blur="validateForm" placeholder="VD: Hà Nội">
                <div v-if="formErrors.province" class="field-error">{{ formErrors.province }}</div>
              </div>
              <div class="col-12">
                <label class="co-label">ĐỊA CHỈ CHI TIẾT <span class="text-danger">*</span></label>
                <input v-model="form.address" class="sg-input w-100" :class="formErrors.address ? 'input-error' : ''" @blur="validateForm" placeholder="Số nhà, ngõ, đường, phường/xã…">
                <div v-if="formErrors.address" class="field-error">{{ formErrors.address }}</div>
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
                  </div>
                </div>
                <div class="ship-fee">{{ formatCurrency(m.basePrice) }}</div>
                <div class="ship-check"></div>
              </label>
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
                  <span class="ca-desc">{{ appliedCoupon.name || (appliedCoupon.discount_type === 'Cố định' ? 'Giảm ' + Number(appliedCoupon.value).toLocaleString('vi-VN') + 'đ' : 'Giảm ' + appliedCoupon.value + '%') }}</span>
                </div>
                <button class="ca-remove" @click="removeCoupon"><i class="bi bi-x"></i></button>
              </div>
              <div v-else class="coupon-input-row mt-2">
                <input v-model="couponCode" class="sg-input flex-grow-1" placeholder="Nhập mã..." @keyup.enter="applyCoupon" style="text-transform:uppercase">
                <button class="btn-sg-outline" @click="applyCoupon" :disabled="couponsLoading">{{ couponsLoading ? '...' : 'ÁP DỤNG' }}</button>
              </div>
              <div v-if="couponError" class="text-danger mt-2" style="font-size: 0.8rem;">{{ couponError }}</div>
              
              <!-- Gợi ý mã từ DB -->
              <div v-if="dbCoupons.length > 0" class="coupon-hints mt-3">
                <div class="ch-list">
                  <button v-for="c in dbCoupons" :key="c.id" class="ch-btn" :class="{ sel: appliedCoupon?.code === c.code }" @click="couponCode = c.code; applyCoupon()">
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
    
    <!-- Payment QR Modal -->
    <transition name="suc">
      <div v-if="payModal.open" class="modal-overlay" @click.self="payLater">
        <div class="sg-card modal-box text-center">
          <h5 class="fw-bold mb-2">Thanh toán đơn hàng</h5>
          <p class="text-secondary mb-4">Mã đơn: <strong>#{{ payModal.orderId }}</strong></p>
          <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" alt="QR Code" class="qr-img mx-auto mb-4" />
          <h4 class="fw-bold text-danger mb-4">{{ formatCurrency(payModal.total) }}</h4>
          <p class="text-secondary small mb-4">Vui lòng quét mã QR trên bằng ứng dụng ngân hàng hoặc MoMo. Giao dịch sẽ tự động được ghi nhận, hoặc bạn có thể xác nhận thủ công bên dưới.</p>
          <div class="d-flex flex-column gap-2">
            <button class="btn-sg-warm w-100" @click="confirmPaid">TÔI ĐÃ THANH TOÁN</button>
            <button class="btn-sg-outline w-100" @click="payLater">ĐỂ SAU (CÒN 12H)</button>
          </div>
        </div>
      </div>
    </transition>
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

/* Validate styles */
.input-error {
  border-color: #D4001A !important;
  background: #fff8f8;
}
.field-error {
  color: #D4001A;
  font-size: 0.78rem;
  margin-top: 4px;
  font-weight: 500;
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

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; z-index: 3000;
  background: rgba(10,20,45,0.55); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: 18px;
}
.modal-box {
  max-width: 400px; width: 100%; padding: 28px; border-radius: 22px;
  background: #fff;
}
.qr-img {
  width: 200px; height: 200px; object-fit: contain;
}
.suc-enter-active, .suc-leave-active { transition: opacity 0.3s; }
.suc-enter-from, .suc-leave-to { opacity: 0; }
</style>
