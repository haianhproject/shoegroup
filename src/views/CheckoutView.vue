<script setup>
import { computed, reactive, ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  cartItems, cartCount, cartSubtotal, formatCurrency, clearCart,
  refreshCartAvailability, cartHasUnavailableItems,
} from '../stores/cartStore'
import { createOrder, setServerId, removeOrder, orderState, saveOrders } from '../stores/orderStore'
import { currentUser } from '../stores/authStore'
import { notify } from '../stores/uiStore'
import { api } from '../services/apiClient'
import { addressBookApi, formatAddress, vietnamAddressApi } from '../services/addressService'
import { shippingApi } from '../services/shippingService'

const router = useRouter()

const form = reactive({
  fullName: '',
  phone: '',
  email: '',
  province: '',
  address: '',
  note: '',
})

const formErrors = reactive({ email: '' })

const savedAddresses = ref([])
const addressesLoading = ref(false)
const addressSaving = ref(false)
const selectedAddressId = ref(null)
const selectedAddress = computed(() => savedAddresses.value.find(a => a.id === selectedAddressId.value) || null)
const selectedAddressText = computed(() => formatAddress(selectedAddress.value))

const shippingCode = ref('STANDARD')
const shippingMethods = ref([])
const shippingQuotes = reactive({})
const shippingLoading = ref(false)
const shippingQuoteError = ref('')
let shippingQuoteRequestId = 0
const paymentCode = ref('COD')
const placing = ref(false)

const payments = [
  { code: 'COD', name: 'Thanh toán khi nhận hàng (COD)', icon: 'bi-cash-coin', desc: 'Trả tiền mặt khi shipper giao đến.' },
  { code: 'BANK', name: 'Chuyển khoản ngân hàng', icon: 'bi-bank', desc: 'VietQR / Internet Banking, xác nhận tự động.' },
]

// Hàm kiểm tra định dạng email
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())

// BỘ LỌC PHONE NGHIÊM NGẶT
const isValidPhone = (phone) => {
  const p = String(phone || '').trim()
  if (!/^0(?:3|5|7|8|9)[0-9]{8}$/.test(p)) return false
  if (/(\d)\1{5,}/.test(p)) return false
  return true
}

// Đồng bộ User Email
watch(() => currentUser.value, (user) => {
  if (!user) return
  form.email = form.email || user.email || ''
}, { immediate: true })

const loadAddresses = async () => {
  addressesLoading.value = true
  try {
    savedAddresses.value = await addressBookApi.list()
  } catch (error) {
    savedAddresses.value = []
    notify({ type: 'error', message: error.message || 'Không tải được sổ địa chỉ.' })
  } finally {
    addressesLoading.value = false
  }

  if (savedAddresses.value.length > 0) {
    const def = savedAddresses.value.find((a) => a.isDefault) || savedAddresses.value[0]
    selectedAddressId.value = def.id
  } else {
    selectedAddressId.value = null
  }
}

onMounted(async () => {
  const stockResult = await refreshCartAvailability()
  if (!stockResult.ok) {
    notify({ type: 'warning', title: 'Chưa kiểm tra được tồn kho', message: 'Vui lòng quay lại giỏ hàng và thử lại.' })
    router.replace('/cart')
    return
  }
  if (stockResult.outOfStock.length || stockResult.insufficient.length || cartHasUnavailableItems.value) {
    notify({
      type: 'error',
      title: 'Giỏ hàng đã thay đổi',
      message: 'Có sản phẩm vừa hết hàng hoặc không còn đủ số lượng. Vui lòng kiểm tra lại giỏ hàng.',
    })
    router.replace('/cart')
    return
  }
  await Promise.all([loadAddresses(), fetchProvinces()])
  await loadShippingMethods()
})

watch(selectedAddressId, (newId) => {
  const a = savedAddresses.value.find(x => x.id === newId)
  if (a) {
    form.fullName = a.recipient || a.fullName || ''
    form.phone = a.phone || ''
    form.province = a.provinceName || a.province || ''
    form.address = a.line || a.address || ''
  } else {
    form.fullName = ''
    form.phone = ''
    form.province = ''
    form.address = ''
  }
})

/* ---- API ĐỊA CHỈ MỚI & TÌM KIẾM NHANH ---- */
const addrModal = reactive({
  open: false, recipient: '', phone: '', provinceId: '', provinceName: '', communeId: '', communeName: '', line: '', isDefault: false
})
const provinces = ref([])
const communes = ref([])
const loadingCommunes = ref(false)

// State tìm kiếm & Dropdown
const searchProvince = ref('')
const searchCommune = ref('')
const showProvinceDropdown = ref(false)
const showCommuneDropdown = ref(false)

// Lọc Tỉnh/Thành phố theo từ khóa gõ vào 🔍
const filteredProvinces = computed(() => {
  if (!searchProvince.value) return provinces.value
  const kw = searchProvince.value.toLowerCase().trim()
  return provinces.value.filter(p => p.name.toLowerCase().includes(kw))
})

// Lọc Phường/Xã theo từ khóa gõ vào 🔍
const filteredCommunes = computed(() => {
  if (!searchCommune.value) return communes.value
  const kw = searchCommune.value.toLowerCase().trim()
  return communes.value.filter(c => c.name.toLowerCase().includes(kw))
})

const fetchProvinces = async () => {
  try {
    provinces.value = await vietnamAddressApi.provinces()
  } catch (error) {
    provinces.value = []
    notify({ type: 'error', message: error.message || 'Không tải được danh sách Tỉnh/Thành.' })
  }
}

const selectProvince = async (p) => {
  addrModal.provinceId = p.code
  addrModal.provinceName = p.name
  searchProvince.value = p.name
  showProvinceDropdown.value = false

  addrModal.communeId = ''
  addrModal.communeName = ''
  searchCommune.value = ''
  communes.value = []

  loadingCommunes.value = true
  try {
    const rows = await vietnamAddressApi.wards(p.code)
    if (String(addrModal.provinceId) === String(p.code)) communes.value = rows
  } catch (error) {
    if (String(addrModal.provinceId) === String(p.code)) communes.value = []
    notify({ type: 'error', message: error.message || 'Không tải được danh sách Phường/Xã.' })
  } finally {
    if (String(addrModal.provinceId) === String(p.code)) loadingCommunes.value = false
  }
}

const selectCommune = (c) => {
  addrModal.communeId = c.code
  addrModal.communeName = c.name
  searchCommune.value = c.name
  showCommuneDropdown.value = false
}

const openAddAddress = () => {
  addrModal.recipient = currentUser.value?.full_name || ''
  addrModal.phone = currentUser.value?.phone || ''
  addrModal.provinceId = ''
  addrModal.provinceName = ''
  addrModal.communeId = ''
  addrModal.communeName = ''
  addrModal.line = ''
  addrModal.isDefault = savedAddresses.value.length === 0
  communes.value = []
  searchProvince.value = ''
  searchCommune.value = ''
  showProvinceDropdown.value = false
  showCommuneDropdown.value = false
  addrModal.open = true
}

const saveNewAddress = async () => {
  if (addressSaving.value) return
  const cleanPhone = addrModal.phone.trim()

  if (!addrModal.recipient.trim()) {
    notify({ type: 'error', message: 'Vui lòng nhập tên người nhận.' })
    return
  }

  if (!isValidPhone(cleanPhone)) {
    notify({ type: 'error', title: 'SĐT không hợp lệ', message: 'Vui lòng nhập đúng 10 số, đúng nhà mạng Việt Nam và không dùng chuỗi số ảo.' })
    return
  }

  if (!addrModal.provinceId || !addrModal.communeId || !addrModal.line.trim()) {
    notify({ type: 'error', message: 'Vui lòng chọn đầy đủ Tỉnh/Thành, Phường/Xã và nhập số nhà.' })
    return
  }

  const payload = {
    recipient: addrModal.recipient.trim(),
    phone: cleanPhone,
    province: addrModal.provinceName,
    ward: addrModal.communeName,
    line: addrModal.line.trim(),
    isDefault: addrModal.isDefault
  }

  addressSaving.value = true
  try {
    const newAddr = await addressBookApi.create(payload)
    const others = savedAddresses.value
      .filter(address => address.id !== newAddr.id)
      .map(address => newAddr.isDefault ? { ...address, isDefault: false } : address)
    savedAddresses.value = [newAddr, ...others].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
    selectedAddressId.value = newAddr.id
    addrModal.open = false
    notify({ type: 'success', message: 'Đã thêm địa chỉ vào sổ và tự động chọn cho đơn hàng.' })
  } catch (error) {
    notify({ type: 'error', message: error.message || 'Không thể thêm địa chỉ.' })
  } finally {
    addressSaving.value = false
  }
}

function validateForm() {
  let ok = true
  if (form.email.trim() && !isValidEmail(form.email)) {
    formErrors.email = 'Email không đúng định dạng.'
    ok = false
  } else {
    formErrors.email = ''
  }
  return ok
}

/* ---- API báo giá vận chuyển ---- */
const shippingAddressPayload = computed(() => {
  const address = selectedAddress.value
  if (!address) return null
  return {
    province: address.provinceName || address.province || '',
    district: address.district || '',
    ward: address.communeName || address.ward || '',
    address: formatAddress(address),
  }
})

const loadShippingMethods = async () => {
  const methods = await shippingApi.methods()
  shippingMethods.value = methods
  if (!methods.some((method) => method.code === shippingCode.value)) {
    shippingCode.value = methods[0]?.code || 'STANDARD'
  }
  await refreshShippingQuotes()
}

const refreshShippingQuotes = async () => {
  const location = shippingAddressPayload.value
  const methods = shippingMethods.value
  const requestId = ++shippingQuoteRequestId

  Object.keys(shippingQuotes).forEach((code) => { delete shippingQuotes[code] })
  shippingQuoteError.value = ''
  if (!location || !methods.length) {
    shippingLoading.value = false
    return
  }

  shippingLoading.value = true
  const results = await Promise.allSettled(
    methods.map((method) => shippingApi.quote({ ...location, methodCode: method.code })),
  )
  // Bỏ qua kết quả cũ nếu khách vừa đổi địa chỉ/phương thức.
  if (requestId !== shippingQuoteRequestId) return

  let successCount = 0
  results.forEach((result, index) => {
    if (result.status !== 'fulfilled' || !result.value) return
    const method = methods[index]
    shippingQuotes[method.code] = {
      ...result.value,
      methodCode: method.code,
      fee: Number(result.value.fee) || Number(method.basePrice) || 0,
      eta: result.value.eta || method.eta,
    }
    successCount += 1
  })
  if (!successCount) {
    shippingQuoteError.value = 'Chưa lấy được giá theo địa chỉ; hệ thống sẽ kiểm tra lại khi đặt hàng.'
  }
  shippingLoading.value = false
}

watch([selectedAddressId, shippingCode], () => {
  refreshShippingQuotes()
})

/* ---- Map & Shipping Calculation ---- */
const addressVerified = computed(() => {
  const address = selectedAddressText.value
  return /\d+/.test(address) && address.length >= 10
})

const mapUrl = computed(() => {
  const query = encodeURIComponent(`${selectedAddressText.value}, Việt Nam`)
  return `https://www.google.com/maps?q=${query}&output=embed`
})

const selectedShippingMethod = computed(() =>
  shippingMethods.value.find((method) => method.code === shippingCode.value) || null,
)

const selectedShippingQuote = computed(() => shippingQuotes[shippingCode.value] || null)

const shippingFee = computed(() => {
  if (selectedShippingQuote.value) return Number(selectedShippingQuote.value.fee) || 0
  return Number(selectedShippingMethod.value?.basePrice) || 0
})

const etaText = computed(() =>
  selectedShippingQuote.value?.eta || selectedShippingMethod.value?.eta || '',
)

const shippingPrice = (method) => {
  const quote = shippingQuotes[method.code]
  return quote ? Number(quote.fee) || 0 : Number(method.basePrice) || 0
}

const shippingDistance = (method) => {
  const quote = shippingQuotes[method.code]
  if (!quote || !Number(quote.distanceKm)) return ''
  return `${Number(quote.distanceKm).toLocaleString('vi-VN')} km${quote.estimatedDistance ? ' (ước tính)' : ''}`
}

/* ---- Coupons ---- */
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
      dbCoupons.value = list.filter((d) => {
        if (!d.active) return false
        if (d.expiry && new Date(d.expiry) < now) return false
        if (d.start_date && new Date(d.start_date) > now) return false
        return true
      })
    }
  } catch { dbCoupons.value = [] } finally { couponsLoading.value = false }
}
loadCoupons()

const applyCoupon = () => {
  couponError.value = ''
  const code = couponCode.value.trim().toUpperCase()
  if (!code) { couponError.value = 'Vui lòng nhập mã giảm giá.'; return }

  const c = dbCoupons.value.find((x) => (x.code || '').toUpperCase() === code)
  if (!c) {
    couponError.value = 'Mã giảm giá không hợp lệ hoặc đã hết hạn.'
    appliedCoupon.value = null
    return
  }

  const limit = Number(c.limit ?? c.quantity ?? 0)
  const used = Number(c.used ?? 0)
  if (limit > 0 && used >= limit) {
    couponError.value = 'Mã giảm giá này đã hết lượt sử dụng.'
    appliedCoupon.value = null
    return
  }

  const minOrder = Number(c.min_order ?? 0)
  if (minOrder > 0 && cartSubtotal.value < minOrder) {
    couponError.value = `Đơn tối thiểu ${formatCurrency(minOrder)} để áp dụng mã này.`
    appliedCoupon.value = null
    return
  }

  if (appliedCoupon.value?.code === c.code) return

  appliedCoupon.value = c
  couponCode.value = c.code
  const desc = c.name || (c.discount_type === 'Cố định' ? `Giảm ${Number(c.value).toLocaleString('vi-VN')}đ` : `Giảm ${c.value}%`)
  notify({ type: 'success', title: 'Áp dụng thành công!', message: desc })
}

const removeCoupon = () => {
  appliedCoupon.value = null
  couponCode.value = ''
  couponError.value = ''
}

const discountAmount = computed(() => {
  if (!appliedCoupon.value) return 0
  const c = appliedCoupon.value
  const sub = cartSubtotal.value
  let amt = 0

  const type = (c.discount_type || c.type || '').toLowerCase()
  const val = Number(c.value) || 0

  if (type === 'cố định' || type === 'fixed') amt = val
  else if (type === 'phần trăm' || type === 'percent') amt = Math.round((sub * val) / 100)
  else if (type === 'freeship') return shippingFee.value

  const maxDisc = Number(c.max_discount || 0)
  if (maxDisc > 0 && amt > maxDisc) amt = maxDisc
  return Math.min(amt, sub)
})

const total = computed(() => Math.max(0, cartSubtotal.value + shippingFee.value - discountAmount.value))

/* ---- Order & Modal Action ---- */
const payModal = reactive({ open: false, orderId: null, serverId: null, total: 0 })

const confirmPaid = async () => {
  if (payModal.serverId) {
    try {
      // Chuyển khoản online được ghi nhận ngay sau khi khách xác nhận đã thanh toán.
      // Không tạo thêm một bước duyệt trùng ở màn hình quản trị.
      await api.put(`/orders/${payModal.serverId}/payment`, { payment_status: 'Đã thanh toán' })
    } catch (error) {
      notify({ type: 'error', message: error.message || 'Không thể ghi nhận thanh toán. Vui lòng thử lại.' })
      return
    }
  }
  const order = orderState.orders.find((x) => x.id === payModal.orderId)
  if (order) { order.payment_status = 'Đã thanh toán'; saveOrders() }
  payModal.open = false
  router.push({ path: '/order-success', query: { orderId: payModal.orderId } })
}

const payLater = () => {
  payModal.open = false
  router.push({ path: '/order-success', query: { orderId: payModal.orderId } })
}

const placeOrder = async () => {
  if (placing.value) return
  const stockResult = await refreshCartAvailability()
  if (!stockResult.ok) {
    notify({ type: 'warning', title: 'Chưa kiểm tra được tồn kho', message: 'Vui lòng thử lại sau ít phút.' })
    return
  }
  if (stockResult.outOfStock.length || stockResult.insufficient.length || cartHasUnavailableItems.value) {
    notify({
      type: 'error',
      title: 'Sản phẩm vừa hết hàng',
      message: 'Khách khác đã mua trước một sản phẩm trong giỏ. Vui lòng chọn sản phẩm khác.',
    })
    router.push('/cart')
    return
  }

  const deliveryAddress = selectedAddress.value
  const deliveryAddressText = formatAddress(deliveryAddress)
  if (!selectedAddressId.value || !deliveryAddress || !deliveryAddressText) {
    notify({ type: 'error', title: 'Chưa chọn địa chỉ', message: 'Vui lòng chọn hoặc thêm địa chỉ nhận hàng.' })
    return
  }

  if (!validateForm()) {
    notify({ type: 'error', title: 'Thông tin chưa hợp lệ', message: 'Vui lòng kiểm tra lại các trường được đánh dấu đỏ.' })
    return
  }

  placing.value = true
  const shipMethod = selectedShippingMethod.value || {
    code: shippingCode.value,
    name: 'Giao hàng tiêu chuẩn',
    eta: '',
  }
  const payMethod = payments.find((p) => p.code === paymentCode.value)

  const clientOrder = createOrder({
    customer: { ...form, address: deliveryAddressText, country: 'Việt Nam' },
    items: cartItems.value,
    subtotal: cartSubtotal.value,
    shippingFee: shippingFee.value,
    discount: discountAmount.value,
    total: total.value,
    shippingMethod: {
      code: shipMethod.code,
      name: shipMethod.name,
      eta: etaText.value,
      distanceKm: Number(selectedShippingQuote.value?.distanceKm) || 0,
    },
    paymentMethod: { code: payMethod.code, name: payMethod.name },
    note: form.note,
  })

  if (!clientOrder.ok) {
    placing.value = false
    notify({ type: 'error', message: clientOrder.message })
    return
  }

  clientOrder.order.shippingAddress = deliveryAddressText
  clientOrder.order.addressId = selectedAddressId.value
  saveOrders()

  let createdServerId = null
  try {
    const payload = {
      userId: currentUser.value?.id ?? currentUser.value?.id_user ?? currentUser.value?.UserID ?? null,
      totalAmount: total.value,
      customerName: form.fullName.trim(),
      customerPhone: form.phone.trim().replace(/\s+/g, ''),
      shippingAddress: deliveryAddressText,
      addressId: selectedAddressId.value,
      shippingMethodCode: shippingCode.value,
      shippingFee: shippingFee.value,
      discountAmount: discountAmount.value,
      paymentMethod: payMethod.name,
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
    }
    const data = await api.post('/orders', payload)
    createdServerId = data?.orderId ?? data?.OrderID ?? null
    if (createdServerId) setServerId(clientOrder.order.id, createdServerId)
    const serverTotal = Number(data?.totalAmount)
    if (Number.isFinite(serverTotal)) {
      clientOrder.order.subtotal = Number(data?.subtotalAmount) || 0
      clientOrder.order.shippingFee = Number(data?.shippingFee) || 0
      clientOrder.order.discount = Number(data?.discountAmount) || 0
      clientOrder.order.total = serverTotal
      if (clientOrder.order.shippingMethod) {
        clientOrder.order.shippingMethod.distanceKm = Number(data?.distanceKm) || clientOrder.order.shippingMethod.distanceKm || 0
        clientOrder.order.shippingMethod.eta = data?.eta || clientOrder.order.shippingMethod.eta
      }
      saveOrders()
    }
  } catch (error) {
    removeOrder(clientOrder.order.id)
    if (error?.status === 409) {
      const refreshed = await refreshCartAvailability()
      if (refreshed.ok && (refreshed.outOfStock.length || refreshed.insufficient.length || cartHasUnavailableItems.value)) {
        notify({
          type: 'error',
          title: 'Sản phẩm vừa hết hàng',
          message: 'Khách khác đã mua sản phẩm trước bạn. Giỏ hàng đã được cập nhật; vui lòng chọn sản phẩm khác.',
        })
        router.push('/cart')
      } else {
        notify({
          type: 'error',
          title: 'Không thể đặt hàng',
          message: error.message || 'Thông tin đơn hàng vừa thay đổi. Vui lòng kiểm tra lại.',
        })
      }
    } else {
      notify({
        type: 'error',
        title: 'Không thể đặt hàng',
        message: error.message || 'Không thể tạo đơn trên máy chủ. Giỏ hàng của bạn vẫn được giữ nguyên.'
      })
    }
    return
  } finally {
    placing.value = false
  }

  if (paymentCode.value === 'BANK' || paymentCode.value === 'MOMO') {
    payModal.orderId = clientOrder.order.id
    payModal.serverId = createdServerId
    payModal.total = clientOrder.order.total
    payModal.open = true
    clearCart()
    return
  }

  clearCart()
  router.push({ path: '/order-success', query: { orderId: clientOrder.order.id } })
}
</script>

<template>
  <div class="checkout-page">
    <div class="container-fluid px-4 py-5 page-container">
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
            <h6 class="co-h"><span class="co-num">1</span> THÔNG TIN GIAO HÀNG</h6>

            <div class="mt-4">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <label class="co-label text-primary mb-0"><i class="bi bi-journal-bookmark-fill me-1"></i>SỔ ĐỊA CHỈ NHẬN HÀNG <span class="text-danger">*</span></label>
                <button class="btn-add-quick text-danger fw-bold border-0 bg-transparent" style="font-size: 0.85rem;" @click="openAddAddress">
                  <i class="bi bi-plus-lg"></i> Thêm địa chỉ mới
                </button>
              </div>
              <select v-model="selectedAddressId" class="sg-input w-100 bg-light fw-semibold text-dark" :disabled="addressesLoading">
                <option v-if="addressesLoading" :value="null" disabled>Đang tải sổ địa chỉ…</option>
                <option v-else :value="null" disabled>-- Chọn địa chỉ đã lưu trong sổ --</option>
                <option v-for="a in savedAddresses" :key="a.id" :value="a.id">
                  {{ a.recipient || a.fullName }} - {{ a.phone }} ({{ formatAddress(a) }}) {{ a.isDefault ? ' [Mặc định]' : '' }}
                </option>
              </select>
            </div>

            <!-- Preview địa chỉ -->
            <div v-if="selectedAddress" class="mt-3 p-3 rounded" style="background: #f8fafc; border: 1px solid #e2e8f0;">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <strong class="text-dark">{{ selectedAddress.recipient || selectedAddress.fullName }}</strong>
                  <span class="text-muted">|</span>
                  <span class="text-dark">{{ selectedAddress.phone }}</span>
                  <span v-if="selectedAddress.isDefault" class="badge bg-dark ms-2" style="font-size: 0.65rem;">Mặc định</span>
                </div>
                <div class="text-secondary small">
                  {{ formatAddress(selectedAddress) }}
                </div>
            </div>
            <div v-else class="text-danger mt-2 small">Vui lòng chọn hoặc thêm địa chỉ nhận hàng.</div>

            <!-- Email & Ghi chú -->
            <div class="row g-4 mt-1">
              <div class="col-md-6">
                <label class="co-label">EMAIL <span class="text-muted fw-normal">(Không bắt buộc)</span></label>
                <input v-model="form.email" type="email" class="sg-input w-100" :class="{ 'input-error': formErrors.email }" @blur="validateForm" placeholder="you@example.com" />
                <div v-if="formErrors.email" class="field-error">{{ formErrors.email }}</div>
              </div>

              <div class="col-12">
                <label class="co-label">GHI CHÚ GIAO HÀNG <span class="text-muted fw-normal">(Không bắt buộc)</span></label>
                <textarea v-model="form.note" class="sg-input w-100" rows="2" placeholder="Ghi chú giao hàng cho shipper hoặc cửa hàng..."></textarea>
              </div>
            </div>

            <!-- Bản đồ -->
            <div v-if="addressVerified" class="map-wrap mt-4">
              <iframe :src="mapUrl" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            </div>
          </div>

          <!-- 2. Vận chuyển -->
          <div class="co-block">
            <h6 class="co-h"><span class="co-num">2</span> PHƯƠNG THỨC VẬN CHUYỂN</h6>
            <div v-if="shippingQuoteError" class="shipping-quote-warning mt-3">
              <i class="bi bi-info-circle me-1"></i>{{ shippingQuoteError }}
            </div>
            <div class="ship-grid mt-4">
              <label v-for="m in shippingMethods" :key="m.code" class="ship-opt" :class="{ active: shippingCode === m.code }">
                <input type="radio" :value="m.code" v-model="shippingCode" hidden />
                <div class="flex-grow-1">
                  <div class="ship-name">{{ m.name }}</div>
                  <div class="ship-desc">{{ m.desc }}</div>
                  <div class="ship-eta">Dự kiến: {{ shippingQuotes[m.code]?.eta || m.eta }}</div>
                  <div v-if="shippingDistance(m)" class="ship-distance">
                    <i class="bi bi-geo-alt me-1"></i>{{ shippingDistance(m) }} từ kho Hai Bà Trưng, Hà Nội
                  </div>
                  <div v-else-if="shippingLoading" class="ship-distance text-muted">
                    <i class="bi bi-arrow-repeat me-1"></i>Đang tính theo địa chỉ…
                  </div>
                </div>
                <div class="ship-fee">{{ formatCurrency(shippingPrice(m)) }}</div>
                <div class="ship-check"></div>
              </label>
            </div>
          </div>

          <!-- 3. Thanh toán -->
          <div class="co-block">
            <h6 class="co-h"><span class="co-num">3</span> PHƯƠNG THỨC THANH TOÁN</h6>
            <div class="pay-grid mt-4">
              <label v-for="p in payments" :key="p.code" class="pay-opt" :class="{ active: paymentCode === p.code }">
                <input type="radio" :value="p.code" v-model="paymentCode" hidden />
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

        <!-- Tóm tắt đơn hàng -->
        <div class="col-lg-5">
          <div class="co-summary-box">
            <h6 class="summary-title">ĐƠN HÀNG ({{ cartCount }})</h6>

            <div class="co-items mt-4">
              <div class="co-item" v-for="item in cartItems" :key="item.id_product_detail">
                <div class="co-item-img">
                  <img :src="item.product?.image_url" :alt="item.product?.product_name || 'Product'" />
                  <span class="co-qty">{{ item.quantity }}</span>
                </div>
                <div class="flex-grow-1">
                  <div class="co-item-name">{{ item.product?.product_name }}</div>
                  <div class="co-item-attr">Size {{ item.size?.size_name || item.size }} · {{ item.color?.color_label || item.color?.color_name || item.color }}</div>
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
                  <span class="ca-desc">
                    {{ appliedCoupon.name || (appliedCoupon.discount_type === 'Cố định' ? `Giảm ${Number(appliedCoupon.value).toLocaleString('vi-VN')}đ` : `Giảm ${appliedCoupon.value}%`) }}
                  </span>
                </div>
                <button class="ca-remove" @click="removeCoupon"><i class="bi bi-x"></i></button>
              </div>

              <div v-else class="coupon-input-row mt-2">
                <input v-model="couponCode" class="sg-input flex-grow-1 uppercase" placeholder="Nhập mã..." @keyup.enter="applyCoupon" />
                <button class="btn-sg-outline" @click="applyCoupon" :disabled="couponsLoading">
                  {{ couponsLoading ? '...' : 'ÁP DỤNG' }}
                </button>
              </div>

              <div v-if="couponError" class="text-danger mt-2 small-error">{{ couponError }}</div>

              <div v-if="dbCoupons.length > 0" class="coupon-hints mt-3">
                <div class="ch-list">
                  <button
                    v-for="c in dbCoupons"
                    :key="c.id"
                    class="ch-btn"
                    :class="{ sel: appliedCoupon?.code === c.code }"
                    @click="couponCode = c.code; applyCoupon()"
                  >
                    {{ c.code }}
                  </button>
                </div>
              </div>
            </div>

            <hr class="summary-divider mt-4" />

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

            <hr class="summary-divider" />

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

    <!-- Modal Thêm Địa Chỉ Mới (Có Tìm Kiếm Tỉnh/Xã) -->
    <transition name="suc">
      <div v-if="addrModal.open" class="modal-overlay" @click.self="addrModal.open = false">
        <div class="sg-card modal-box">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="fw-bold mb-0">Thêm địa chỉ mới</h5>
            <button class="btn-close-modal" @click="addrModal.open = false"><i class="bi bi-x-lg"></i></button>
          </div>

          <div class="row g-3">
            <div class="col-md-6">
              <label class="co-label">Tên người nhận <span class="text-danger">*</span></label>
              <input v-model="addrModal.recipient" class="sg-input w-100" placeholder="Ví dụ: Nguyễn Văn A">
            </div>
            <div class="col-md-6">
              <label class="co-label">Số điện thoại <span class="text-danger">*</span></label>
              <input
                v-model="addrModal.phone"
                class="sg-input w-100"
                maxlength="10"
                placeholder="Ví dụ: 0901234567"
                @input="addrModal.phone = addrModal.phone.replace(/[^0-9]/g, '')"
              >
            </div>

            <!-- Tỉnh / Thành phố (Có tìm kiếm) -->
            <div class="col-md-6 position-relative">
              <label class="co-label">Tỉnh / Thành phố <span class="text-danger">*</span></label>
              <div class="search-input-wrapper">
                <input
                  type="text"
                  v-model="searchProvince"
                  class="sg-input w-100 pe-4"
                  placeholder="Nhập để tìm Tỉnh/TP..."
                  @focus="showProvinceDropdown = true"
                  @blur="showProvinceDropdown = false"
                  @input="showProvinceDropdown = true; addrModal.provinceId = ''"
                />
                <i class="bi bi-chevron-down select-arrow"></i>
              </div>

              <!-- Dropdown gợi ý Tỉnh/TP -->
              <ul v-if="showProvinceDropdown" class="dropdown-search-list">
                <li
                  v-for="p in filteredProvinces"
                  :key="p.code"
                  :class="{ selected: String(addrModal.provinceId) === String(p.code) }"
                  @mousedown.prevent="selectProvince(p)"
                >
                  {{ p.name }}
                </li>
                <li v-if="filteredProvinces.length === 0" class="no-result">
                  ❌ Không tìm thấy tỉnh/thành phù hợp
                </li>
              </ul>
            </div>

            <!-- Phường / Xã (Có tìm kiếm) -->
            <div class="col-md-6 position-relative">
              <label class="co-label">Phường / Xã <span class="text-danger">*</span></label>
              <div class="search-input-wrapper">
                <input
                  type="text"
                  v-model="searchCommune"
                  class="sg-input w-100 pe-4"
                  :disabled="!addrModal.provinceId || loadingCommunes"
                  :placeholder="loadingCommunes ? 'Đang tải dữ liệu...' : 'Nhập để tìm Phường/Xã...'"
                  @focus="showCommuneDropdown = true"
                  @blur="showCommuneDropdown = false"
                  @input="showCommuneDropdown = true; addrModal.communeId = ''"
                />
                <i class="bi bi-chevron-down select-arrow"></i>
              </div>

              <!-- Dropdown gợi ý Phường/Xã -->
              <ul v-if="showCommuneDropdown && addrModal.provinceId" class="dropdown-search-list">
                <li
                  v-for="w in filteredCommunes"
                  :key="w.code"
                  :class="{ selected: String(addrModal.communeId) === String(w.code) }"
                  @mousedown.prevent="selectCommune(w)"
                >
                  {{ w.name }}
                </li>
                <li v-if="filteredCommunes.length === 0 && !loadingCommunes" class="no-result">
                  ❌ Không tìm thấy phường/xã phù hợp
                </li>
              </ul>
            </div>

            <!-- Địa chỉ cụ thể -->
            <div class="col-12">
              <label class="co-label">Số nhà, ngõ, tên đường <span class="text-danger">*</span></label>
              <input v-model="addrModal.line" class="sg-input w-100" placeholder="Ví dụ: Số 123 Đường Cầu Giấy">
            </div>

            <div class="col-12">
              <label class="check-row">
                <input type="checkbox" v-model="addrModal.isDefault">
                <span class="fw-semibold">Lưu làm địa chỉ nhận hàng mặc định</span>
              </label>
            </div>
          </div>

          <div class="d-flex gap-2 mt-4 justify-content-end">
            <button class="btn-sg-outline" @click="addrModal.open = false">Hủy bỏ</button>
            <button class="btn-sg" :disabled="addressSaving" @click="saveNewAddress">
              <i class="bi bi-save me-1"></i>{{ addressSaving ? 'Đang lưu…' : 'Lưu & Chọn' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- QR Modal Bank Transfer -->
    <transition name="suc">
      <div v-if="payModal.open" class="modal-overlay" @click.self="payLater">
        <div class="sg-card modal-box text-center">
          <h5 class="fw-bold mb-2">Thanh toán đơn hàng</h5>
          <p class="text-secondary mb-4">Mã đơn: <strong>#{{ payModal.orderId }}</strong></p>
          <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" alt="QR Code" class="qr-img mx-auto mb-4" />
          <h4 class="fw-bold text-danger mb-4">{{ formatCurrency(payModal.total) }}</h4>
          <p class="text-secondary small mb-4">Quét mã QR để chuyển khoản. Sau khi thanh toán, bấm xác nhận để hệ thống ghi nhận ngay.</p>
          <div class="d-flex flex-column gap-2">
            <button class="btn-sg-warm w-100" @click="confirmPaid">TÔI ĐÃ THANH TOÁN</button>
            <button class="btn-sg-outline w-100" @click="payLater">ĐỂ SAU (CÒN 24 GIỜ)</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.checkout-page { background: #ffffff; min-height: 100vh; }
.page-container { max-width: 1200px; margin: 0 auto; }
.co-title { font-weight: 700; font-size: 1.5rem; letter-spacing: 0.12em; color: #1a1a1a; margin: 0 0 4px; }
.uppercase { text-transform: uppercase; }
.small-error { font-size: 0.8rem; }

.input-error { border-color: #D4001A !important; background: #fff8f8; }
.field-error { color: #D4001A; font-size: 0.78rem; margin-top: 4px; font-weight: 500; }

.empty-state { text-align: center; padding: 80px 20px; background: #fafafa; border: 1px solid #e5e5e5; border-radius: 4px; }
.empty-state i { font-size: 2.5rem; color: #ccc; display: block; margin-bottom: 16px; }

.co-block { margin-bottom: 40px; }
.co-h { font-weight: 700; font-size: 0.9rem; letter-spacing: 0.1em; color: #1a1a1a; display: flex; align-items: center; gap: 12px; margin: 0; padding-bottom: 12px; border-bottom: 1px solid #1a1a1a; }
.co-num { width: 24px; height: 24px; background: #1a1a1a; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600; }
.co-label { font-weight: 600; font-size: 0.75rem; letter-spacing: 0.05em; color: #555; margin-bottom: 8px; display: block; }
.addr-status { font-size: 0.8rem; font-weight: 500; }

.btn-add-quick:hover { text-decoration: underline; cursor: pointer; }

.map-wrap { border: 1px solid #e5e5e5; border-radius: 4px; overflow: hidden; }
.map-wrap iframe { width: 100%; height: 250px; border: 0; display: block; }

.ship-grid, .pay-grid { display: flex; flex-direction: column; gap: 16px; }
.ship-opt, .pay-opt { display: flex; align-items: center; gap: 16px; border: 1px solid #e5e5e5; border-radius: 4px; padding: 20px; cursor: pointer; transition: all 0.2s; background: #fff; }
.ship-opt:hover, .pay-opt:hover { border-color: #1a1a1a; }
.ship-opt.active, .pay-opt.active { border-color: #1a1a1a; border-width: 2px; padding: 19px; }

.ship-name, .pay-name { font-weight: 700; font-size: 0.9rem; color: #1a1a1a; margin-bottom: 4px; }
.ship-desc, .pay-desc { font-size: 0.8rem; color: #666; }
.ship-eta { font-size: 0.75rem; color: #1a1a1a; font-weight: 600; margin-top: 6px; }
.ship-distance { font-size: 0.72rem; color: #64748b; margin-top: 4px; }
.shipping-quote-warning { padding: 10px 12px; border: 1px solid #fde68a; border-radius: 4px; background: #fffbeb; color: #92400e; font-size: 0.8rem; }
.ship-fee { font-weight: 600; color: #1a1a1a; font-size: 0.95rem; margin-right: 16px; }

.ship-check, .pay-check { width: 20px; height: 20px; border: 1px solid #d0d0d0; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.ship-opt.active .ship-check, .pay-opt.active .pay-check { border: 6px solid #1a1a1a; }
.pay-opt i { font-size: 1.5rem; color: #1a1a1a; width: 40px; text-align: center; }

.co-summary-box { background: #fafafa; border: 1px solid #e5e5e5; border-radius: 4px; padding: 32px; position: sticky; top: 100px; }
.summary-title { font-weight: 700; font-size: 0.9rem; letter-spacing: 0.1em; color: #1a1a1a; margin: 0; }
.co-items { display: flex; flex-direction: column; gap: 16px; max-height: 400px; overflow-y: auto; padding-right: 8px; }
.co-item { display: flex; gap: 16px; align-items: center; }
.co-item-img { position: relative; width: 64px; height: 64px; background: #fff; border: 1px solid #e5e5e5; border-radius: 4px; }
.co-item-img img { width: 100%; height: 100%; object-fit: cover; }
.co-qty { position: absolute; top: -8px; right: -8px; width: 20px; height: 20px; background: #1a1a1a; color: #fff; border-radius: 50%; font-size: 0.7rem; font-weight: 600; display: flex; align-items: center; justify-content: center; }
.co-item-name { font-weight: 600; font-size: 0.9rem; line-height: 1.3; color: #1a1a1a; }
.co-item-attr { font-size: 0.8rem; color: #666; margin-top: 4px; }
.co-item-price { font-weight: 600; font-size: 0.9rem; color: #1a1a1a; }

.coupon-section { border-top: 1px solid #e5e5e5; padding-top: 24px; }
.coupon-label { font-weight: 600; font-size: 0.8rem; letter-spacing: 0.05em; color: #1a1a1a; }
.coupon-input-row { display: flex; gap: 8px; }
.coupon-applied { display: flex; align-items: center; justify-content: space-between; background: #fff; border: 1px solid #1a1a1a; padding: 12px 16px; border-radius: 4px; }
.ca-code { font-weight: 700; font-size: 0.9rem; color: #1a1a1a; display: block; }
.ca-desc { font-size: 0.8rem; color: #666; }
.ca-remove { border: 0; background: transparent; color: #888; font-size: 1.2rem; cursor: pointer; }
.ca-remove:hover { color: #D4001A; }

.ch-list { display: flex; flex-wrap: wrap; gap: 8px; }
.ch-btn { border: 1px solid #e5e5e5; background: #fff; padding: 6px 12px; font-size: 0.75rem; font-weight: 600; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
.ch-btn:hover { border-color: #1a1a1a; }
.ch-btn.sel { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }

.summary-divider { border-top: 1px solid #e5e5e5; margin: 0; }
.sum-row { display: flex; justify-content: space-between; margin-bottom: 12px; color: #555; font-size: 0.95rem; }
.sum-row.total { font-size: 1.1rem; color: #1a1a1a; font-weight: 600; }

.modal-overlay { position: fixed; inset: 0; z-index: 3000; background: rgba(10,20,45,0.55); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 18px; }
.modal-box { max-width: 600px; width: 100%; padding: 28px; border-radius: 8px; background: #fff; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
.btn-close-modal { border: 0; background: transparent; font-size: 1.1rem; color: #6b7280; cursor: pointer; padding: 4px; }
.check-row { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.check-row input { width: 16px; height: 16px; accent-color: #0A0A0A; cursor: pointer; }

/* Styles cho Dropdown tìm kiếm thông minh */
.position-relative { position: relative; }
.search-input-wrapper { position: relative; display: flex; align-items: center; }
.search-input-wrapper input { width: 100%; }
.select-arrow { position: absolute; right: 12px; pointer-events: none; font-size: 0.75rem; color: #888; }
.dropdown-search-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 220px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  list-style: none;
  padding: 4px 0;
  margin: 0;
}
.dropdown-search-list li {
  padding: 8px 14px;
  font-size: 0.88rem;
  color: #1a1a1a;
  cursor: pointer;
  transition: background 0.15s ease;
}
.dropdown-search-list li:hover {
  background: #f1f5f9;
  font-weight: 600;
}
.dropdown-search-list li.selected {
  background: #0A0A0A;
  color: #ffffff;
  font-weight: 700;
}
.dropdown-search-list .no-result {
  color: #94a3b8;
  font-size: 0.82rem;
  text-align: center;
  padding: 12px;
  cursor: default;
}

.qr-img { width: 200px; height: 200px; object-fit: contain; }
.suc-enter-active, .suc-leave-active { transition: opacity 0.3s; }
.suc-enter-from, .suc-leave-to { opacity: 0; }
</style>
