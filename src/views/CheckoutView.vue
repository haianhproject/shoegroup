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
import { getCheckoutAttempt, clearCheckoutAttempt } from '../services/checkoutAttempt'

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
  {
    code: 'BANK',
    name: 'Chuyển khoản ngân hàng (VietQR)',
    desc: 'Bạn sẽ quét mã VietQR hoặc chuyển khoản trực tiếp qua ứng dụng ngân hàng để hoàn tất mua hàng.',
    badges: ['VietQR', 'MC', 'VISA'],
  },
  {
    code: 'COD',
    name: 'Thanh toán khi nhận hàng (COD)',
    desc: 'Bạn sẽ thanh toán tiền mặt trực tiếp cho nhân viên giao hàng khi nhận được kiện hàng.',
  },
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

// Lọc Tỉnh/Thành phố theo từ khóa gõ vào.
const filteredProvinces = computed(() => {
  if (!searchProvince.value) return provinces.value
  const kw = searchProvince.value.toLowerCase().trim()
  return provinces.value.filter(p => p.name.toLowerCase().includes(kw))
})

// Lọc Phường/Xã theo từ khóa gõ vào.
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
const showCouponInput = ref(false)

const couponValueLabel = (coupon) => {
  const type = String(coupon?.discount_type || coupon?.type || '').toLowerCase()
  const value = Number(coupon?.value) || 0
  if (type.includes('freeship')) return 'Miễn phí vận chuyển'
  if (type.includes('cố định') || type.includes('co dinh') || type.includes('fixed')) return `Giảm ${formatCurrency(value)}`
  return `Giảm ${value}%`
}
const couponMinOrderLabel = (coupon) => {
  const min = Number(coupon?.min_order) || 0
  return min > 0 ? `Đơn tối thiểu ${formatCurrency(min)}` : 'Không yêu cầu đơn tối thiểu'
}
const couponExpiryLabel = (coupon) => coupon?.expiry
  ? `HSD ${new Date(coupon.expiry).toLocaleDateString('vi-VN')}`
  : 'Không giới hạn thời gian'
const couponUsageLabel = (coupon) => {
  const limit = Number(coupon?.limit ?? coupon?.quantity ?? 0)
  const used = Number(coupon?.used) || 0
  return limit > 0 ? `Còn ${Math.max(0, limit - used)} lượt` : 'Dùng không giới hạn'
}
const selectCoupon = (coupon) => {
  couponCode.value = coupon?.code || ''
  applyCoupon()
  showCouponInput.value = false
}

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
  if (!payModal.serverId) {
    notify({ type: 'error', message: 'Đơn hàng chưa được máy chủ xác nhận. Vui lòng tải lại danh sách đơn hàng.' })
    return
  }
  let paymentStatus = 'Chờ thanh toán'
  if (payModal.serverId) {
    try {
      const result = await api.put(`/orders/${payModal.serverId}/payment`, { payment_status: 'Chờ thanh toán' })
      paymentStatus = result?.payment_status || 'Chờ thanh toán'
    } catch (error) {
      notify({ type: 'error', message: error.message || 'Không thể ghi nhận thanh toán. Vui lòng thử lại.' })
      return
    }
  }
  const order = orderState.orders.find((x) => x.id === payModal.orderId)
  if (order) { order.payment_status = paymentStatus; saveOrders() }
  notify({ type: 'info', message: 'Đã gửi thông báo chuyển khoản. Cửa hàng sẽ đối soát và xác nhận khi nhận được tiền.' })
  payModal.open = false
  router.push({ path: '/order-success', query: { orderId: payModal.orderId } })
}

const payLater = () => {
  payModal.open = false
  router.push({ path: '/order-success', query: { orderId: payModal.orderId } })
}

const placeOrder = async () => {
  if (placing.value) return
  placing.value = true
  try {
  const stockResult = await refreshCartAvailability()
  if (!stockResult.ok) {
    notify({ type: 'warning', title: 'Chưa kiểm tra được tồn kho', message: 'Vui lòng thử lại sau ít phút.' })
    return
  }
  if (stockResult.priceChanged?.length) {
    notify({ type: 'warning', title: 'Giá sản phẩm đã thay đổi', message: 'Giỏ hàng đã cập nhật giá mới. Vui lòng kiểm tra tổng tiền rồi bấm đặt hàng lần nữa.' })
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
    const attempt = getCheckoutAttempt(payload)
    const data = await api.post('/orders', payload, { headers: { 'Idempotency-Key': attempt.key } })
    createdServerId = data?.orderId ?? data?.OrderID ?? null
    if (!createdServerId) throw new Error('Máy chủ chưa trả mã đơn hợp lệ. Vui lòng kiểm tra danh sách đơn trước khi thử lại.')
    setServerId(clientOrder.order.id, createdServerId)
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
  }

  clearCheckoutAttempt()
  if (paymentCode.value === 'BANK') {
    payModal.orderId = clientOrder.order.id
    payModal.serverId = createdServerId
    payModal.total = clientOrder.order.total
    payModal.open = true
    clearCart()
    return
  }

  clearCart()
  router.push({ path: '/order-success', query: { orderId: clientOrder.order.id } })
  } finally {
    placing.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-white" style="font-family:'Be Vietnam Pro',sans-serif">

    <!-- ── Giỏ trống ── -->
    <div v-if="cartCount === 0" class="pt-24 flex flex-col items-center justify-center py-24 px-6 text-center">
      <div class="w-16 h-16 mb-4 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center text-[#737373]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      </div>
      <h2 style="font-family:'Fraunces',serif" class="text-2xl font-semibold text-[#0E0E0E] mb-2">Giỏ hàng của bạn đang trống</h2>
      <p class="text-sm text-[#737373] mb-6">Không có sản phẩm nào để tiến hành thanh toán.</p>
      <router-link to="/products" class="inline-block px-8 py-3.5 bg-[#0E0E0E] text-white text-sm font-semibold rounded-lg hover:bg-[#333] transition-colors">MUA SẮM NGAY</router-link>
    </div>

    <!-- ── Giao diện thanh toán Split-Screen chuẩn Shopify / Reference ── -->
    <div v-else class="min-h-screen flex flex-col lg:flex-row">

      <!-- ══ CỘT TRÁI: Form thông tin thanh toán (chiếm 52% màn hình, cân đối sang trái) ══ -->
      <div class="w-full lg:w-[52%] xl:w-[52%] bg-white flex justify-end order-2 lg:order-1 lg:border-r border-[#E5E5E5]">
        <div class="w-full max-w-[580px] px-6 sm:px-8 lg:pl-6 lg:pr-10 xl:pl-4 xl:pr-14 py-8 lg:py-10">

          <!-- Header thương hiệu & icon giỏ hàng -->
          <div class="flex items-center justify-between pb-6 mb-6 border-b border-[#F0F0F0]">
            <router-link to="/" class="inline-flex items-center gap-2 no-underline">
              <span style="font-family:'Fraunces',serif" class="text-2xl font-bold text-[#0E0E0E] tracking-tight leading-none">ShoeGroup</span>
            </router-link>
            <router-link to="/cart" aria-label="Giỏ hàng" class="text-[#16a34a] hover:text-[#15803d] transition-colors p-1" title="Quay lại giỏ hàng">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </router-link>
          </div>

          <!-- ── 1. LIÊN HỆ ── -->
          <div class="mb-7">
            <div class="flex items-center justify-between mb-2">
              <h2 class="text-base sm:text-lg font-bold text-[#0E0E0E]">Liên hệ</h2>
              <router-link v-if="!currentUser" to="/account" class="text-xs sm:text-sm font-medium text-[#16a34a] hover:underline underline-offset-4">Đăng nhập</router-link>
              <span v-else class="text-xs text-[#737373] font-medium">{{ currentUser.name || currentUser.email }}</span>
            </div>
            <div class="relative">
              <input
                v-model="form.email"
                type="email"
                placeholder="Email"
                class="w-full border border-[#D9D9D9] rounded-lg px-3.5 py-3 text-sm outline-none focus:border-[#0E0E0E] transition-colors pr-10 bg-white"
                :class="{ 'border-red-400': formErrors.email }"
                @blur="validateForm"
              />
              <div class="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999999]" title="Dùng để gửi thông tin và mã vận đơn theo dõi đơn hàng">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
            </div>
            <div v-if="formErrors.email" class="text-xs text-red-500 mt-1">{{ formErrors.email }}</div>
            <label class="flex items-center gap-2.5 mt-3 cursor-pointer select-none">
              <span class="w-4 h-4 rounded-full bg-[#16a34a] flex items-center justify-center flex-shrink-0">
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2.5"><path d="M2 6l3 3 5-5"/></svg>
              </span>
              <span class="text-[13px] text-[#0E0E0E]">Gửi cho tôi tin tức và ưu đãi qua email</span>
            </label>
          </div>

          <!-- ── 2. GIAO HÀNG & SỔ ĐỊA CHỈ ── -->
          <div class="mb-7">
            <div class="flex items-center justify-between mb-1">
              <h2 class="text-base sm:text-lg font-bold text-[#0E0E0E]">Giao hàng</h2>
              <button
                type="button"
                @click="openAddAddress"
                class="inline-flex items-center gap-1 text-xs font-semibold text-[#16a34a] hover:underline underline-offset-4 cursor-pointer bg-transparent border-none p-0"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Thêm địa chỉ mới
              </button>
            </div>
            <p class="text-xs text-[#737373] mb-3">Địa chỉ này cũng sẽ được dùng làm địa chỉ thanh toán cho đơn hàng này.</p>

            <!-- Loading sổ địa chỉ -->
            <div v-if="addressesLoading" class="text-xs text-[#737373] py-2 flex items-center gap-2">
              <svg class="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
              Đang tải sổ địa chỉ…
            </div>

            <!-- Danh sách Sổ Địa Chỉ đã lưu -->
            <div v-else-if="savedAddresses.length > 0" class="flex flex-col gap-2 mb-4">
              <div
                v-for="a in savedAddresses"
                :key="a.id"
                @click="selectedAddressId = a.id"
                class="flex items-start gap-3 border rounded-xl p-3.5 transition-all cursor-pointer bg-white"
                :class="selectedAddressId === a.id
                  ? 'border-[#16a34a] bg-[#f0fdf4]/50 shadow-xs'
                  : 'border-[#E5E5E5] hover:border-[#B0B0B0]'"
              >
                <!-- Radio xanh tròn -->
                <span
                  class="mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
                  :class="selectedAddressId === a.id ? 'border-[#16a34a]' : 'border-[#D4D4D4]'"
                >
                  <span v-if="selectedAddressId === a.id" class="w-2 h-2 rounded-full bg-[#16a34a]"></span>
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                    <span class="text-sm font-semibold text-[#0E0E0E]">{{ a.recipient || a.fullName }} · {{ a.phone }}</span>
                    <span v-if="a.isDefault" class="text-[10px] font-bold text-white bg-[#0E0E0E] px-1.5 py-0.5 rounded leading-none">Mặc định</span>
                  </div>
                  <div class="text-xs text-[#737373] mt-1 leading-relaxed">{{ formatAddress(a) }}</div>
                </div>
              </div>
            </div>

            <!-- Khi chưa có địa chỉ nào trong sổ -->
            <div v-else class="border border-dashed border-[#D9D9D9] rounded-xl p-5 text-center mb-4">
              <p class="text-xs text-[#737373] mb-3">Bạn chưa có địa chỉ nhận hàng nào được lưu.</p>
              <button
                type="button"
                @click="openAddAddress"
                class="px-4 py-2 text-xs font-semibold bg-[#0E0E0E] text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer border-none"
              >+ Thêm địa chỉ mới vào sổ</button>
            </div>

            <!-- Ghi chú đơn hàng -->
            <div class="mt-3">
              <label class="block text-[11px] font-bold text-[#737373] uppercase tracking-wider mb-1.5">Ghi chú giao hàng (không bắt buộc)</label>
              <textarea
                v-model="form.note"
                rows="2"
                placeholder="Ghi chú thêm cho shipper hoặc cửa hàng..."
                class="w-full border border-[#D9D9D9] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#0E0E0E] transition-colors resize-none bg-white"
              ></textarea>
            </div>

            <!-- Bản đồ vị trí giao hàng -->
            <div v-if="addressVerified" class="mt-3 rounded-xl overflow-hidden border border-[#E5E5E5] h-40">
              <iframe :src="mapUrl" title="Vị trí giao hàng" class="w-full h-full border-0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            </div>
          </div>

          <!-- ── 3. PHƯƠNG THỨC VẬN CHUYỂN ── -->
          <div class="mb-7">
            <h2 class="text-base sm:text-lg font-bold text-[#0E0E0E] mb-2.5">Phương thức vận chuyển</h2>
            <div v-if="shippingQuoteError" class="p-3 mb-2.5 text-xs bg-amber-50 text-amber-800 rounded-lg border border-amber-200 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ shippingQuoteError }}
            </div>
            <div class="flex flex-col gap-2">
              <div
                v-for="m in shippingMethods"
                :key="m.code"
                @click="shippingCode = m.code"
                class="flex items-center justify-between border rounded-xl px-4 py-3.5 transition-all cursor-pointer"
                :class="shippingCode === m.code
                  ? 'border-[#16a34a] bg-[#f0fdf4]/50 shadow-xs'
                  : 'border-[#E5E5E5] bg-white hover:border-[#B0B0B0]'"
              >
                <div>
                  <div class="text-sm font-semibold text-[#0E0E0E]">{{ m.name }}</div>
                  <div class="text-xs text-[#737373] mt-0.5">Thời gian nhận: {{ shippingQuotes[m.code]?.eta || m.eta || '3-5 ngày' }}</div>
                  <div v-if="shippingDistance(m)" class="text-[11px] text-[#737373] mt-0.5 flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                    {{ shippingDistance(m) }}
                  </div>
                </div>
                <span class="text-[13px] font-bold text-[#0E0E0E] uppercase ml-3 whitespace-nowrap">
                  {{ shippingPrice(m) === 0 ? 'MIỄN PHÍ' : formatCurrency(shippingPrice(m)) }}
                </span>
              </div>
            </div>
          </div>

          <!-- ── 4. THANH TOÁN (Chỉ COD & Chuyển khoản ngân hàng) ── -->
          <div class="mb-8">
            <h2 class="text-base sm:text-lg font-bold text-[#0E0E0E] mb-1">Thanh toán</h2>
            <p class="text-xs text-[#737373] mb-3">Địa chỉ thanh toán của phương thức thanh toán phải khớp với địa chỉ giao hàng. Toàn bộ các giao dịch được bảo mật và mã hóa.</p>
            <div class="border border-[#E5E5E5] rounded-xl overflow-hidden divide-y divide-[#E5E5E5] bg-white">
              <div
                v-for="p in payments"
                :key="p.code"
                @click="paymentCode = p.code"
                class="cursor-pointer transition-all"
                :class="paymentCode === p.code ? 'bg-[#f0fdf4]/40 ring-1 ring-inset ring-[#16a34a]' : 'bg-white hover:bg-[#FAFAFA]'"
              >
                <div class="flex items-center justify-between px-4 py-3.5">
                  <span class="flex items-center gap-3">
                    <span
                      class="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
                      :class="paymentCode === p.code ? 'border-[#16a34a]' : 'border-[#D4D4D4]'"
                    >
                      <span v-if="paymentCode === p.code" class="w-2 h-2 rounded-full bg-[#16a34a]"></span>
                    </span>
                    <span class="text-sm font-semibold text-[#0E0E0E]">{{ p.name }}</span>
                  </span>
                  <!-- Badges ngân hàng/thẻ -->
                  <div v-if="p.badges" class="flex items-center gap-1">
                    <span class="text-[9px] font-bold text-white bg-[#005BAA] rounded px-1.5 py-0.5 leading-none">VietQR</span>
                    <span class="text-[9px] font-bold text-white bg-[#EB001B] rounded px-1 py-0.5 leading-none">MC</span>
                    <span class="text-[9px] font-bold text-white bg-[#1A1F71] rounded px-1 py-0.5 leading-none">VISA</span>
                  </div>
                </div>
                <div v-if="paymentCode === p.code && p.desc" class="px-4 pb-3.5 -mt-0.5">
                  <div class="bg-white border border-[#E5E5E5] rounded-lg p-3 text-xs text-[#737373] leading-relaxed text-center shadow-2xs">
                    {{ p.desc }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Nút Đặt hàng ── -->
          <button
            type="button"
            class="w-full bg-[#0E0E0E] text-white py-4 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-[#262626] active:bg-black transition-colors border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            :disabled="placing"
            @click="placeOrder"
          >
            <svg v-if="placing" class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path d="M4 12a8 8 0 018-8v8H4z"/></svg>
            {{ placing ? 'Đang xử lý đặt hàng…' : 'Thanh toán ngay' }}
          </button>

          <p class="text-[11px] text-[#737373] text-center mt-3">
            Bằng cách đặt hàng, bạn đồng ý với <span class="underline cursor-pointer">Điều khoản dịch vụ</span> và <span class="underline cursor-pointer">Chính sách bảo mật</span> của ShoeGroup.
          </p>
        </div>
      </div>

      <!-- ══ CỘT PHẢI: Tóm tắt đơn hàng (chiếm 48% màn hình, nền xám #FAFAFA, sticky) ══ -->
      <div class="w-full lg:w-[48%] xl:w-[48%] bg-[#FAFAFA] flex justify-start order-1 lg:order-2 flex-shrink-0">
        <div class="w-full max-w-[480px] px-6 sm:px-8 lg:pl-10 lg:pr-6 xl:pl-14 xl:pr-8 py-8 lg:py-10 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto">

          <!-- Danh sách sản phẩm -->
          <div class="space-y-4 mb-5">
            <div v-for="item in cartItems" :key="item.id_product_detail" class="flex items-center gap-3">
              <div class="relative flex-shrink-0 w-16 h-16 rounded-xl border border-[#E5E5E5] bg-white p-1 flex items-center justify-center shadow-xs">
                <img
                  :src="item.color?.image || item.product?.image_url || '/placeholder.png'"
                  :alt="item.product?.product_name || 'Product'"
                  class="w-full h-full object-contain"
                />
                <span class="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 bg-[#0E0E0E] text-white text-[11px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                  {{ item.quantity }}
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-bold text-[#0E0E0E] leading-snug line-clamp-2 uppercase tracking-tight">{{ item.product?.product_name }}</div>
                <div class="text-[11px] text-[#737373] mt-0.5">UK {{ item.size?.size_name || item.size }} · {{ item.color?.color_label || item.color?.color_name || item.color }}</div>
              </div>
              <div class="text-sm font-semibold text-[#0E0E0E] whitespace-nowrap">
                {{ formatCurrency(item.subtotal) }}
              </div>
            </div>
          </div>

          <!-- Mã giảm giá -->
          <div class="border-t border-[#E5E5E5] pt-4 mb-4">
            <div class="flex gap-2 mb-2">
              <input
                v-model="couponCode"
                type="text"
                placeholder="Mã giảm giá hoặc thẻ quà tặng"
                class="flex-1 border border-[#D9D9D9] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#0E0E0E] transition-colors bg-white"
                @keyup.enter="applyCoupon"
              />
              <button
                type="button"
                class="px-4 text-xs font-semibold rounded-lg border border-[#D9D9D9] text-[#737373] hover:border-[#0E0E0E] hover:text-[#0E0E0E] transition-colors bg-white cursor-pointer whitespace-nowrap disabled:opacity-50"
                :disabled="couponsLoading"
                @click="applyCoupon"
              >
                {{ couponsLoading ? '...' : 'Áp dụng' }}
              </button>
            </div>

            <div v-if="couponError" class="text-xs text-red-600 mb-2">{{ couponError }}</div>

            <!-- Thẻ mã đã áp dụng -->
            <div v-if="appliedCoupon" class="flex items-center justify-between p-2.5 mb-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div class="min-w-0 text-xs">
                <span class="font-bold text-emerald-800 tracking-wide uppercase">{{ appliedCoupon.code }}</span>
                <span class="text-emerald-700 ml-1.5">{{ appliedCoupon.name || couponValueLabel(appliedCoupon) }}</span>
              </div>
              <button type="button" @click="removeCoupon" class="text-emerald-600 hover:text-emerald-900 text-xs font-bold cursor-pointer p-1 border-none bg-transparent">✕</button>
            </div>

            <!-- Gợi ý mã có sẵn -->
            <div v-if="dbCoupons.length > 0 && !appliedCoupon" class="mb-2">
              <div class="text-[10px] font-bold text-[#737373] uppercase tracking-wider mb-1.5">Mã ưu đãi có sẵn:</div>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="c in dbCoupons.slice(0, 4)"
                  :key="c.id"
                  type="button"
                  @click="selectCoupon(c)"
                  class="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-dashed border-[#0E0E0E]/40 text-[#0E0E0E] hover:bg-[#0E0E0E] hover:text-white transition-colors cursor-pointer bg-white"
                  :title="c.name"
                >
                  {{ c.code }} ({{ couponValueLabel(c) }})
                </button>
              </div>
            </div>
          </div>

          <!-- Bảng tính tiền chi tiết -->
          <div class="space-y-2.5 pb-4 border-t border-[#E5E5E5] pt-4">
            <div class="flex items-center justify-between text-sm">
              <span class="text-[#737373]">Tổng tiền {{ cartCount }} mặt hàng</span>
              <span class="font-semibold text-[#0E0E0E]">{{ formatCurrency(cartSubtotal) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-[#737373] inline-flex items-center gap-1">
                Vận chuyển
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="text-[#B0B0B0]"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              </span>
              <span class="font-semibold text-[#0E0E0E]">
                {{ shippingFee === 0 ? 'MIỄN PHÍ' : formatCurrency(shippingFee) }}
              </span>
            </div>
            <div v-if="appliedCoupon" class="flex items-center justify-between text-sm text-emerald-600 font-medium">
              <span>Giảm giá ({{ appliedCoupon.code }})</span>
              <span>-{{ formatCurrency(discountAmount) }}</span>
            </div>
            <div class="flex items-center justify-between text-xs text-[#737373]">
              <span>Dự kiến nhận hàng</span>
              <span>{{ etaText }}</span>
            </div>
          </div>

          <!-- Dòng Tổng thanh toán lớn -->
          <div class="flex items-end justify-between pt-4 border-t border-[#E5E5E5]">
            <span class="text-base font-bold text-[#0E0E0E]">Tổng</span>
            <span class="flex items-baseline gap-1.5">
              <span class="text-xs text-[#737373] font-medium">VND</span>
              <span class="text-2xl font-bold text-[#0E0E0E]">{{ formatCurrency(total) }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Modal Thêm địa chỉ mới vào sổ ── -->
    <transition name="suc">
      <div v-if="addrModal.open" class="modal-overlay" @click.self="addrModal.open = false">
        <div class="modal-box">
          <div class="flex justify-between items-center mb-4">
            <h3 style="font-family:'Fraunces',serif" class="text-xl font-semibold text-[#0E0E0E] m-0">Thêm địa chỉ mới</h3>
            <button class="btn-close-modal" @click="addrModal.open = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="grid grid-cols-12 gap-3">
            <div class="col-span-12 md:col-span-6">
              <label class="block text-xs font-semibold text-[#737373] mb-1.5">Tên người nhận <span class="text-red-500">*</span></label>
              <input v-model="addrModal.recipient" class="w-full border border-[#D9D9D9] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#0E0E0E] transition-colors bg-white" placeholder="Ví dụ: Nguyễn Văn A">
            </div>
            <div class="col-span-12 md:col-span-6">
              <label class="block text-xs font-semibold text-[#737373] mb-1.5">Số điện thoại <span class="text-red-500">*</span></label>
              <input
                v-model="addrModal.phone"
                class="w-full border border-[#D9D9D9] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#0E0E0E] transition-colors bg-white"
                maxlength="10"
                placeholder="Ví dụ: 0901234567"
                @input="addrModal.phone = addrModal.phone.replace(/[^0-9]/g, '')"
              >
            </div>

            <!-- Tỉnh / Thành phố -->
            <div class="col-span-12 md:col-span-6 relative">
              <label class="block text-xs font-semibold text-[#737373] mb-1.5">Tỉnh / Thành phố <span class="text-red-500">*</span></label>
              <div class="search-input-wrapper">
                <input
                  type="text"
                  v-model="searchProvince"
                  class="w-full border border-[#D9D9D9] rounded-lg px-3.5 py-2.5 pr-8 text-sm outline-none focus:border-[#0E0E0E] transition-colors bg-white"
                  placeholder="Nhập để tìm Tỉnh/TP..."
                  @focus="showProvinceDropdown = true"
                  @blur="showProvinceDropdown = false"
                  @input="showProvinceDropdown = true; addrModal.provinceId = ''"
                />
                <svg class="select-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
              </div>
              <ul v-if="showProvinceDropdown" class="dropdown-search-list">
                <li v-for="p in filteredProvinces" :key="p.code" :class="{ selected: String(addrModal.provinceId) === String(p.code) }" @mousedown.prevent="selectProvince(p)">{{ p.name }}</li>
                <li v-if="filteredProvinces.length === 0" class="no-result">❌ Không tìm thấy tỉnh/thành</li>
              </ul>
            </div>

            <!-- Phường / Xã -->
            <div class="col-span-12 md:col-span-6 relative">
              <label class="block text-xs font-semibold text-[#737373] mb-1.5">Phường / Xã <span class="text-red-500">*</span></label>
              <div class="search-input-wrapper">
                <input
                  type="text"
                  v-model="searchCommune"
                  class="w-full border border-[#D9D9D9] rounded-lg px-3.5 py-2.5 pr-8 text-sm outline-none focus:border-[#0E0E0E] transition-colors bg-white"
                  :disabled="!addrModal.provinceId || loadingCommunes"
                  :placeholder="loadingCommunes ? 'Đang tải...' : 'Nhập để tìm Phường/Xã...'"
                  @focus="showCommuneDropdown = true"
                  @blur="showCommuneDropdown = false"
                  @input="showCommuneDropdown = true; addrModal.communeId = ''"
                />
                <svg class="select-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
              </div>
              <ul v-if="showCommuneDropdown && addrModal.provinceId" class="dropdown-search-list">
                <li v-for="w in filteredCommunes" :key="w.code" :class="{ selected: String(addrModal.communeId) === String(w.code) }" @mousedown.prevent="selectCommune(w)">{{ w.name }}</li>
                <li v-if="filteredCommunes.length === 0 && !loadingCommunes" class="no-result">❌ Không tìm thấy phường/xã</li>
              </ul>
            </div>

            <!-- Số nhà, tên đường -->
            <div class="col-span-12">
              <label class="block text-xs font-semibold text-[#737373] mb-1.5">Số nhà, ngõ, tên đường <span class="text-red-500">*</span></label>
              <input v-model="addrModal.line" class="w-full border border-[#D9D9D9] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#0E0E0E] transition-colors bg-white" placeholder="Ví dụ: Số 123 Đường Cầu Giấy">
            </div>

            <div class="col-span-12 mt-1">
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" v-model="addrModal.isDefault" class="w-4 h-4 accent-[#16a34a] cursor-pointer">
                <span class="text-xs font-semibold text-[#0E0E0E]">Lưu làm địa chỉ nhận hàng mặc định</span>
              </label>
            </div>
          </div>

          <div class="flex gap-2 mt-6 justify-end">
            <button class="px-5 py-2.5 text-sm font-semibold border border-[#D9D9D9] rounded-lg text-[#737373] hover:text-[#0E0E0E] hover:border-[#0E0E0E] transition-colors cursor-pointer bg-white" @click="addrModal.open = false">Hủy bỏ</button>
            <button class="px-6 py-2.5 text-sm font-semibold bg-[#0E0E0E] text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer disabled:opacity-50 border-none" :disabled="addressSaving" @click="saveNewAddress">
              {{ addressSaving ? 'Đang lưu…' : 'Lưu & Chọn' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ── Modal QR Chuyển khoản ngân hàng (VietQR) ── -->
    <transition name="suc">
      <div v-if="payModal.open" class="modal-overlay" @click.self="payLater">
        <div class="modal-box text-center max-w-[460px]">
          <h3 style="font-family:'Fraunces',serif" class="text-xl font-semibold text-[#0E0E0E] mb-2">Thanh toán đơn hàng</h3>
          <p class="text-xs text-[#737373] mb-4">Mã đơn: <strong class="text-[#0E0E0E]">#{{ payModal.orderId }}</strong></p>
          <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" alt="QR Code" class="qr-img mx-auto mb-4" />
          <h4 style="font-family:'Fraunces',serif" class="text-2xl font-bold text-[#0E0E0E] mb-3">{{ formatCurrency(payModal.total) }}</h4>
          <p class="text-xs text-[#737373] mb-5 leading-relaxed">Quét mã QR để chuyển khoản. Sau khi thanh toán, bấm xác nhận để hệ thống ghi nhận ngay.</p>
          <div class="flex flex-col gap-2.5">
            <button class="w-full py-3.5 bg-[#0E0E0E] text-white rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors border-none cursor-pointer" @click="confirmPaid">TÔI ĐÃ THANH TOÁN</button>
            <button class="w-full py-3 border border-[#E5E5E5] text-[#737373] hover:text-[#0E0E0E] hover:border-[#0E0E0E] rounded-lg text-sm font-semibold transition-colors bg-white cursor-pointer" @click="payLater">ĐỂ SAU (CÒN 24 GIỜ)</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(10, 20, 45, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}
.modal-box {
  max-width: 600px;
  width: 100%;
  padding: 28px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
.btn-close-modal {
  border: 0;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
}
.btn-close-modal:hover {
  color: #0E0E0E;
}
.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.search-input-wrapper input {
  width: 100%;
}
.select-arrow {
  position: absolute;
  right: 12px;
  pointer-events: none;
  color: #888;
}
.dropdown-search-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 220px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
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
  background: #0E0E0E;
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
.suc-enter-active, .suc-leave-active {
  transition: opacity 0.3s ease;
}
.suc-enter-from, .suc-leave-to {
  opacity: 0;
}
</style>
