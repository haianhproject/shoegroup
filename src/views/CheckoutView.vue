<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { currentUser } from '../stores/authStore'
import { cartItems, cartSubtotal, formatCurrency, clearCart } from '../stores/cartStore'

const router = useRouter()
const isLoading = ref(false)
const dbCoupons = ref([])

// Tuỳ chọn địa chỉ: 'default' (Mặc định) hoặc 'other' (Khác)
const addressOption = ref('default')

const form = reactive({
  fullName: '',
  phone: '',
  address: '',
  province: '',
  note: ''
})

const paymentMethods = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  atm: 'Thẻ ATM nội địa / Internet Banking',
  card: 'Thẻ Visa/MasterCard'
}

const shippingMethods = [
  { id: 'standard', name: 'Giao hàng tiêu chuẩn', description: 'Nhận hàng 3-5 ngày làm việc', fee: 30000 },
  { id: 'express', name: 'Giao hàng nhanh', description: 'Nhận hàng 1-2 ngày làm việc', fee: 60000 }
]

const selectedShipping = ref('standard')
const selectedPayment = ref('cod')
const couponCodeInput = ref('')
const appliedCoupon = ref(null)
const discountValue = ref(0)

const canChooseShipping = computed(() => form.address.trim() && form.province.trim())
const selectedShippingMethod = computed(() => shippingMethods.find((m) => m.id === selectedShipping.value) || shippingMethods[0])
const shippingFee = computed(() => (!canChooseShipping.value || cartItems.value.length === 0) ? 0 : selectedShippingMethod.value.fee)
const totalAmount = computed(() => Math.max(cartSubtotal.value + shippingFee.value - discountValue.value, 0))

// Hàm tự động điền địa chỉ mặc định từ Hồ sơ
const loadDefaultAddress = () => {
  form.fullName = currentUser.value?.full_name || currentUser.value?.name || ''
  form.phone = currentUser.value?.phone || ''
  
  const fullAdd = currentUser.value?.address || ''
  if(fullAdd.includes(',')){
     const parts = fullAdd.split(',')
     form.province = parts.pop().trim()
     form.address = parts.join(',').trim()
  } else {
     form.province = ''
     form.address = fullAdd
  }
}

// Khi thay đổi tuỳ chọn địa chỉ
watch(addressOption, (newVal) => {
  if (newVal === 'default') {
    loadDefaultAddress()
  } else {
    form.address = ''
    form.province = ''
  }
})

onMounted(async () => {
  if (!currentUser.value) {
    alert("Vui lòng đăng nhập để tiến hành thanh toán!");
    router.push({ path: '/login', query: { redirect: '/checkout' } })
    return
  }
  
  loadDefaultAddress()

  try {
    const res = await fetch('http://localhost:5000/api/discounts')
    dbCoupons.value = await res.json()
  } catch(e) {
    console.log("Không thể tải mã giảm giá từ CSDL")
  }
})

const applyCoupon = () => {
  const code = couponCodeInput.value.trim().toUpperCase()
  if (!code) return alert('Vui lòng nhập mã khuyến mãi.')
  
  const validCoupon = dbCoupons.value.find(c => c.code.toUpperCase() === code && c.active)
  if (!validCoupon) {
    discountValue.value = 0
    appliedCoupon.value = null
    return alert('Mã khuyến mãi không hợp lệ hoặc đã hết hạn.')
  }

  if (validCoupon.limit > 0 && validCoupon.used >= validCoupon.limit) return alert("Mã giảm giá đã hết lượt sử dụng.")
  if (new Date(validCoupon.expiry) < new Date()) return alert("Mã giảm giá đã hết hạn.")

  discountValue.value = (cartSubtotal.value * validCoupon.percent) / 100
  appliedCoupon.value = validCoupon
  alert(`Áp dụng thành công! Giảm ${validCoupon.percent}%`)
}

const validateForm = () => {
  if (cartItems.value.length === 0) {
    alert('Giỏ hàng đang trống.')
    return false
  }
  if (!form.fullName.trim() || !form.phone.trim() || !form.address.trim() || !form.province.trim()) {
    alert('Vui lòng điền đầy đủ thông tin giao hàng (Họ tên, SĐT, Địa chỉ, Tỉnh/TP).')
    return false
  }
  return true
}

const placeOrder = async () => {
  if (!validateForm()) return
  isLoading.value = true

  const payload = {
    userId: currentUser.value.id_user || currentUser.value.id,
    totalAmount: totalAmount.value,
    shippingFee: shippingFee.value,
    discountAmount: discountValue.value,
    paymentMethod: paymentMethods[selectedPayment.value],
    customerName: form.fullName, // Lưu tên nhập ở form
    customerPhone: form.phone,   // Lưu SĐT nhập ở form
    shippingAddress: `${form.address}, ${form.province}`, // Lấy địa chỉ thực tế từ form
    note: form.note,
    couponCode: appliedCoupon.value ? appliedCoupon.value.code : null,
    items: cartItems.value.map(item => ({
      productId: item.product.id_product || item.product.id || item.id_product,
      quantity: item.quantity,
      price: item.unitPrice || item.product.price || item.product.BasePrice,
      size: item.size?.size_name || '42',
      color: item.color?.color_label || item.color?.color_name || 'Mặc định'
    }))
  }

  try {
    const response = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    if (data.success) {
      clearCart() 
      alert(`🎉 Đặt hàng thành công! Mã đơn: #ORD-${data.orderId}`)
      router.push('/orders') 
    } else {
      alert("Lỗi máy chủ: " + data.message)
    }
  } catch (error) {
    alert("Không thể kết nối đến máy chủ. Hãy thử lại!")
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="checkout-page bg-light min-vh-100 py-4">
    <div class="container">
      <div class="row g-4 align-items-start">
        <div class="col-lg-7">
          <div class="card border-0 rounded-4 shadow-sm mb-3">
            <div class="card-body p-4 d-flex justify-content-between align-items-center gap-3">
              <span class="fw-semibold">
                Đang thanh toán bằng tài khoản: <span class="text-primary">{{ currentUser?.email }}</span>
              </span>
            </div>
          </div>
          <form @submit.prevent="placeOrder">
            <div class="card border-0 rounded-4 shadow-sm mb-3">
              <div class="card-body p-4">
                <h5 class="fw-bold mb-3">Thông tin giao hàng</h5>
                
                <!-- BỘ TÙY CHỌN ĐỊA CHỈ -->
                <div class="mb-4 p-3 bg-light rounded-3 border">
                  <div class="form-check mb-2">
                    <input class="form-check-input" type="radio" name="addressOption" id="addrDefault" value="default" v-model="addressOption">
                    <label class="form-check-label fw-bold cursor-pointer text-dark" for="addrDefault">
                      Giao đến địa chỉ mặc định trong Hồ sơ
                    </label>
                  </div>
                  <div class="form-check">
                    <input class="form-check-input" type="radio" name="addressOption" id="addrOther" value="other" v-model="addressOption">
                    <label class="form-check-label fw-bold cursor-pointer text-dark" for="addrOther">
                      Giao đến địa chỉ khác (Nhập mới bên dưới)
                    </label>
                  </div>
                </div>

                <div class="d-flex flex-column gap-3">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <input v-model="form.fullName" type="text" class="form-control checkout-input" placeholder="Họ và tên người nhận" :readonly="addressOption === 'default'">
                    </div>
                    <div class="col-md-6">
                      <input v-model="form.phone" type="tel" class="form-control checkout-input" placeholder="Số điện thoại" :readonly="addressOption === 'default'">
                    </div>
                  </div>
                  <input v-model="form.province" type="text" class="form-control checkout-input" placeholder="Tỉnh/TP, Quận/Huyện, Phường/Xã" :readonly="addressOption === 'default'">
                  <input v-model="form.address" type="text" class="form-control checkout-input" placeholder="Số nhà, Tên đường..." :readonly="addressOption === 'default'">
                </div>
              </div>
            </div>
            
            <div class="card border-0 rounded-4 shadow-sm mb-3">
              <div class="card-body p-4">
                <h5 class="fw-bold mb-3">Phương thức giao hàng</h5>
                <div v-if="!canChooseShipping">
                  <input type="text" class="form-control checkout-input bg-light" value="Nhập địa chỉ để xem các phương thức giao hàng" readonly>
                </div>
                <div v-else class="d-flex flex-column gap-2">
                  <label v-for="method in shippingMethods" :key="method.id" class="border rounded-3 p-3 cursor-pointer" :class="selectedShipping === method.id ? 'border-primary bg-primary bg-opacity-10' : 'bg-white'">
                    <div class="d-flex align-items-center justify-content-between gap-3">
                      <div class="form-check mb-0">
                        <input v-model="selectedShipping" class="form-check-input" type="radio" name="shipping" :value="method.id">
                        <span class="form-check-label fw-bold">{{ method.name }}</span>
                        <p class="text-secondary small mb-0 mt-1">{{ method.description }}</p>
                      </div>
                      <strong class="text-primary">{{ formatCurrency(method.fee) }}</strong>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div class="card border-0 rounded-4 shadow-sm mb-3">
              <div class="card-body p-4">
                <h5 class="fw-bold mb-3">Phương thức thanh toán</h5>
                <div class="payment-list border rounded-3 overflow-hidden">
                  <label class="payment-item p-3 d-flex align-items-center gap-3 cursor-pointer" :class="selectedPayment === 'cod' ? 'active-payment' : ''">
                    <input v-model="selectedPayment" class="form-check-input m-0" type="radio" name="payment" value="cod">
                    <span class="fw-semibold">Thanh toán khi nhận hàng (COD)</span>
                  </label>
                  <label class="payment-item p-3 d-flex align-items-center gap-3 cursor-pointer" :class="selectedPayment === 'atm' ? 'active-payment' : ''">
                    <input v-model="selectedPayment" class="form-check-input m-0" type="radio" name="payment" value="atm">
                    <span class="fw-semibold">Thẻ ATM nội địa / Internet Banking</span>
                  </label>
                  <label class="payment-item p-3 d-flex align-items-center gap-3 cursor-pointer" :class="selectedPayment === 'card' ? 'active-payment' : ''">
                    <input v-model="selectedPayment" class="form-check-input m-0" type="radio" name="payment" value="card">
                    <span class="fw-semibold">Thẻ Visa/MasterCard</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div class="card border-0 rounded-4 shadow-sm">
              <div class="card-body p-4">
                <textarea v-model="form.note" rows="2" class="form-control checkout-input" placeholder="Ghi chú đơn hàng (Không bắt buộc)"></textarea>
              </div>
            </div>
          </form>
        </div>

        <div class="col-lg-5">
          <div class="checkout-sidebar sticky-top" style="top: 95px;">
            <div class="card border-0 rounded-4 shadow-sm mb-3">
              <div class="card-body p-4">
                <h5 class="fw-bold mb-3 border-bottom pb-3">Sản phẩm</h5>
                <div v-if="cartItems.length === 0" class="text-center py-4">
                  <i class="bi bi-cart-x fs-2 text-secondary"></i>
                  <p class="text-secondary mb-0 mt-2">Giỏ hàng đang trống.</p>
                </div>
                <div v-else class="cart-items-scroll pe-2 mb-3" style="max-height: 350px; overflow-y: auto;">
                  <div v-for="item in cartItems" :key="item.id_product_detail" class="d-flex gap-3 align-items-start pb-3 mb-3 border-bottom">
                    <div class="cart-img bg-light rounded-3 overflow-hidden border flex-shrink-0" style="width: 72px; height: 72px;">
                      <img :src="item.product?.image_url" :alt="item.product?.product_name || item.product?.name" class="w-100 h-100 object-fit-cover mix-blend-multiply">
                    </div>
                    <div class="flex-grow-1">
                      <h6 class="fw-semibold mb-1 small">{{ item.product?.product_name || item.product?.name }}</h6>
                      <p class="text-secondary small mb-2">
                        Size {{ item.size?.size_name || '42' }} | {{ item.color?.color_label || item.color?.color_name || 'Mặc định' }} 
                      </p>
                      <div class="d-flex justify-content-between align-items-center gap-2">
                        <span class="small text-secondary fw-semibold">SL: x{{ item.quantity }}</span>
                        <strong class="small text-dark">{{ formatCurrency(item.subtotal) }}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="card border-0 rounded-4 shadow-sm mb-3">
              <div class="card-body p-4">
                <h5 class="fw-bold mb-3">Mã khuyến mãi</h5>
                <div class="input-group">
                  <input v-model="couponCodeInput" type="text" class="form-control checkout-input text-uppercase" placeholder="Nhập mã (VD: FLASH50)">
                  <button type="button" class="btn btn-dark fw-bold px-3" @click="applyCoupon">Áp dụng</button>
                </div>
                <p v-if="appliedCoupon" class="text-success small mt-2 fw-bold mb-0">
                  <i class="bi bi-check-circle"></i> Đã áp dụng mã giảm {{ appliedCoupon.percent }}%
                </p>
              </div>
            </div>

            <div class="card border-0 rounded-4 shadow-sm">
              <div class="card-body p-4">
                <h5 class="fw-bold mb-3">Tổng cộng</h5>
                <div class="d-flex justify-content-between mb-2">
                  <span class="text-secondary">Tạm tính</span>
                  <span class="fw-bold">{{ formatCurrency(cartSubtotal) }}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                  <span class="text-secondary">Phí vận chuyển</span>
                  <span class="fw-bold">{{ shippingFee > 0 ? formatCurrency(shippingFee) : '-' }}</span>
                </div>
                <div v-if="discountValue > 0" class="d-flex justify-content-between mb-3 text-success">
                  <span>Giảm giá</span>
                  <span class="fw-bold">- {{ formatCurrency(discountValue) }}</span>
                </div>
                <hr>
                <div class="d-flex justify-content-between fw-bold fs-5 mb-4">
                  <span>Thành tiền</span>
                  <span class="text-danger fs-4">{{ formatCurrency(totalAmount) }}</span>
                </div>
                <button type="button" class="btn btn-danger w-100 fw-bold py-3 rounded-3 shadow-hover fs-6 text-uppercase" :disabled="cartItems.length === 0 || isLoading" @click="placeOrder">
                  <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
                  {{ isLoading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN ĐẶT HÀNG' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.checkout-input { min-height: 46px; border-radius: 8px; border: 1px solid #e9ecef; font-size: 14px; background-color: #f8f9fa; }
.checkout-input[readonly] { background-color: #e9ecef; cursor: not-allowed; }
.checkout-input:focus { box-shadow: none; border-color: #0d6efd; background-color: #fff; }
.payment-item { border-bottom: 1px solid #eee; transition: 0.2s ease; }
.payment-item:last-child { border-bottom: 0; }
.active-payment { background-color: #f0f8ff; border-left: 4px solid #0d6efd; }
.cursor-pointer { cursor: pointer; }
.object-fit-cover { object-fit: cover; }
.mix-blend-multiply { mix-blend-mode: multiply; }
.cart-items-scroll::-webkit-scrollbar { width: 4px; }
.cart-items-scroll::-webkit-scrollbar-thumb { background-color: #ccc; border-radius: 4px; }
</style>