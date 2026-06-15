<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { currentUser } from '../stores/authStore'
import { createOrder } from '../stores/orderStore'
import {
  cartItems,
  cartSubtotal,
  formatCurrency,
  clearCart,
  increaseQuantity,
  decreaseQuantity,
  removeFromCart
} from '../stores/cartStore'

const router = useRouter()

const form = reactive({
  fullName: '',
  phone: '',
  email: '',
  country: 'Vietnam',
  address: '',
  province: '',
  note: ''
})

const shippingMethods = [
  {
    id: 'standard',
    name: 'Giao hàng tiêu chuẩn',
    description: 'Nhận hàng trong 3 - 5 ngày làm việc',
    fee: 30000
  },
  {
    id: 'express',
    name: 'Giao hàng nhanh',
    description: 'Nhận hàng trong 1 - 2 ngày làm việc',
    fee: 60000
  }
]

const paymentMethods = {
  cod: 'Thanh toán khi giao hàng (COD)',
  atm: 'OnePay ATM nội địa',
  card: 'OnePay Visa/Master/JCB/American Express/CUP'
}

const selectedShipping = ref('standard')
const selectedPayment = ref('cod')
const couponCode = ref('')
const discount = ref(0)

const canChooseShipping = computed(() => {
  return form.address.trim() && form.province.trim()
})

const selectedShippingMethod = computed(() => {
  return shippingMethods.find((method) => method.id === selectedShipping.value) || shippingMethods[0]
})

const shippingFee = computed(() => {
  if (!canChooseShipping.value || cartItems.value.length === 0) return 0
  return selectedShippingMethod.value.fee
})

const total = computed(() => {
  return Math.max(cartSubtotal.value + shippingFee.value - discount.value, 0)
})

const shippingFeeText = computed(() => {
  return shippingFee.value > 0 ? formatCurrency(shippingFee.value) : '-'
})

const discountText = computed(() => {
  return discount.value > 0 ? `- ${formatCurrency(discount.value)}` : '-'
})

onMounted(() => {
  if (!currentUser.value) {
    router.push({ path: '/login', query: { redirect: '/checkout' } })
    return
  }

  form.fullName = currentUser.value.full_name || ''
  form.phone = currentUser.value.phone || ''
  form.email = currentUser.value.email || ''
  form.address = currentUser.value.address || ''
})

const applyCoupon = () => {
  const code = couponCode.value.trim().toUpperCase()

  if (!code) {
    alert('Vui lòng nhập mã khuyến mãi.')
    return
  }

  if (code === 'SG100') {
    discount.value = Math.min(100000, cartSubtotal.value)
    alert('Áp dụng mã giảm giá thành công.')
    return
  }

  discount.value = 0
  alert('Mã khuyến mãi không hợp lệ.')
}

const handleIncrease = (detailId) => {
  const result = increaseQuantity(detailId)

  if (!result.ok) {
    alert(result.message)
  }
}

const handleDecrease = (detailId) => {
  const result = decreaseQuantity(detailId)

  if (!result.ok) {
    alert(result.message)
  }
}

const handleRemove = (detailId) => {
  removeFromCart(detailId)

  if (cartItems.value.length === 0) {
    discount.value = 0
  }
}

const validateForm = () => {
  if (!currentUser.value) {
    alert('Vui lòng đăng nhập trước khi thanh toán.')
    router.push({ path: '/login', query: { redirect: '/checkout' } })
    return false
  }

  if (cartItems.value.length === 0) {
    alert('Giỏ hàng đang trống.')
    return false
  }

  if (!form.fullName.trim()) {
    alert('Vui lòng nhập họ và tên.')
    return false
  }

  if (!form.phone.trim()) {
    alert('Vui lòng nhập số điện thoại.')
    return false
  }

  if (!/^[0-9]{9,11}$/.test(form.phone.trim())) {
    alert('Số điện thoại không hợp lệ.')
    return false
  }

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    alert('Email không hợp lệ.')
    return false
  }

  if (!form.address.trim()) {
    alert('Vui lòng nhập địa chỉ, tên đường.')
    return false
  }

  if (!form.province.trim()) {
    alert('Vui lòng nhập Tỉnh/TP, Quận/Huyện, Phường/Xã.')
    return false
  }

  return true
}

const placeOrder = () => {
  if (!validateForm()) return

  const result = createOrder({
    customer: form,
    items: cartItems.value,
    subtotal: cartSubtotal.value,
    shippingFee: shippingFee.value,
    discount: discount.value,
    total: total.value,
    shippingMethod: selectedShippingMethod.value.name,
    paymentMethod: paymentMethods[selectedPayment.value],
    note: form.note
  })

  if (!result.ok) {
    alert(result.message)
    return
  }

  clearCart()
  alert(`Đặt hàng thành công! Mã đơn hàng: ${result.order.id}`)
  router.push('/orders')
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
                Bạn đang thanh toán bằng tài khoản: {{ currentUser?.email }}
              </span>

              <router-link to="/account" class="btn btn-light border fw-bold px-4">
                Tài khoản
              </router-link>
            </div>
          </div>

          <form @submit.prevent="placeOrder">
            <div class="card border-0 rounded-4 shadow-sm mb-3">
              <div class="card-body p-4">
                <h5 class="fw-bold mb-3">Thông tin giao hàng</h5>

                <div class="d-flex flex-column gap-3">
                  <input v-model="form.fullName" type="text" class="form-control checkout-input" placeholder="Nhập họ và tên">

                  <div class="position-relative">
                    <input v-model="form.phone" type="tel" class="form-control checkout-input pe-5" placeholder="Nhập số điện thoại">
                    <span class="vn-flag">VN</span>
                  </div>

                  <input v-model="form.email" type="email" class="form-control checkout-input" placeholder="Nhập email (không bắt buộc)">
                  <input v-model="form.country" type="text" class="form-control checkout-input" readonly>
                  <input v-model="form.address" type="text" class="form-control checkout-input" placeholder="Địa chỉ, tên đường">
                  <input v-model="form.province" type="text" class="form-control checkout-input" placeholder="Tỉnh/TP, Quận/Huyện, Phường/Xã">
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
                  <label
                    v-for="method in shippingMethods"
                    :key="method.id"
                    class="shipping-card border rounded-3 p-3 cursor-pointer"
                    :class="selectedShipping === method.id ? 'border-warning bg-warning-subtle' : 'bg-white'"
                  >
                    <div class="d-flex align-items-center justify-content-between gap-3">
                      <div class="form-check mb-0">
                        <input v-model="selectedShipping" class="form-check-input" type="radio" name="shipping" :value="method.id">
                        <span class="form-check-label fw-bold">{{ method.name }}</span>
                        <p class="text-secondary small mb-0 mt-1">{{ method.description }}</p>
                      </div>

                      <strong>{{ formatCurrency(method.fee) }}</strong>
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
                    <span class="payment-icon"><i class="bi bi-cash-stack"></i></span>
                    <span class="fw-semibold">Thanh toán khi giao hàng (COD)</span>
                  </label>

                  <div v-if="selectedPayment === 'cod'" class="payment-note px-3 py-2 small">
                    - Khách hàng được kiểm tra hàng trước khi thanh toán cho bưu tá
                  </div>

                  <label class="payment-item p-3 d-flex align-items-center gap-3 cursor-pointer" :class="selectedPayment === 'atm' ? 'active-payment' : ''">
                    <input v-model="selectedPayment" class="form-check-input m-0" type="radio" name="payment" value="atm">
                    <span class="payment-brand">OnePay</span>
                    <span class="fw-semibold">Thanh toán online qua cổng OnePay bằng thẻ ATM nội địa</span>
                  </label>

                  <label class="payment-item p-3 d-flex align-items-center gap-3 cursor-pointer" :class="selectedPayment === 'card' ? 'active-payment' : ''">
                    <input v-model="selectedPayment" class="form-check-input m-0" type="radio" name="payment" value="card">
                    <span class="payment-brand">OnePay</span>
                    <span class="fw-semibold">Thanh toán online qua cổng OnePay bằng thẻ Visa/Master/JCB/American Express/CUP</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="card border-0 rounded-4 shadow-sm">
              <div class="card-body p-4">
                <textarea v-model="form.note" rows="2" class="form-control checkout-input" placeholder="Ghi chú đơn hàng"></textarea>
              </div>
            </div>
          </form>
        </div>

        <div class="col-lg-5">
          <div class="checkout-sidebar sticky-top" style="top: 95px;">
            <div class="card border-0 rounded-4 shadow-sm mb-3">
              <div class="card-body p-4">
                <h5 class="fw-bold mb-3">Giỏ hàng</h5>

                <div v-if="cartItems.length === 0" class="text-center py-4">
                  <i class="bi bi-cart-x fs-2 text-secondary"></i>
                  <p class="text-secondary mb-0 mt-2">Giỏ hàng đang trống.</p>
                </div>

                <div v-else>
                  <div v-for="item in cartItems" :key="item.id_product_detail" class="d-flex gap-3 align-items-start pb-3 mb-3 border-bottom">
                    <div class="cart-img bg-light rounded-3 overflow-hidden border flex-shrink-0">
                      <img :src="item.product.image_url" :alt="item.product.product_name" class="w-100 h-100 object-fit-cover mix-blend-multiply">
                    </div>

                    <div class="flex-grow-1">
                      <div class="d-flex justify-content-between gap-2">
                        <h6 class="fw-semibold mb-1 small">{{ item.product.product_name }}</h6>
                        <button type="button" class="btn btn-sm btn-light text-danger rounded-circle flex-shrink-0" @click="handleRemove(item.id_product_detail)">
                          <i class="bi bi-x"></i>
                        </button>
                      </div>

                      <p class="text-secondary small mb-2">
                        {{ item.color?.color_label || item.color?.color_name }} / Size {{ item.size?.size_name }}
                      </p>

                      <div class="d-flex justify-content-between align-items-center gap-2">
                        <strong class="small">{{ formatCurrency(item.subtotal) }}</strong>

                        <div class="input-group input-group-sm rounded border" style="width: 98px;">
                          <button class="btn btn-light border-0" type="button" :disabled="item.quantity <= 1" @click="handleDecrease(item.id_product_detail)">
                            <i class="bi bi-dash"></i>
                          </button>

                          <input type="text" class="form-control text-center border-0 bg-transparent fw-bold px-0" :value="item.quantity" readonly>

                          <button class="btn btn-light border-0" type="button" :disabled="item.quantity >= item.stockQuantity" @click="handleIncrease(item.id_product_detail)">
                            <i class="bi bi-plus"></i>
                          </button>
                        </div>
                      </div>

                      <p class="text-secondary small mb-0 mt-1">Tồn kho: {{ item.stockQuantity }}</p>
                    </div>
                  </div>

                  <p class="fw-semibold mb-0">Xuất hóa đơn: <span class="fw-normal">không</span></p>
                </div>
              </div>
            </div>

            <div class="card border-0 rounded-4 shadow-sm mb-3">
              <div class="card-body p-4">
                <h5 class="fw-bold mb-3">Mã khuyến mãi</h5>

                <div class="coupon-box mb-3">
                  <span><i class="bi bi-ticket-perforated me-1"></i> Chọn mã</span>
                  <span class="coupon-suggest">Giảm giá 100,000đ</span>
                </div>

                <div class="input-group">
                  <input v-model="couponCode" type="text" class="form-control checkout-input" placeholder="Nhập mã khuyến mãi">
                  <button type="button" class="btn btn-warning fw-bold px-3" @click="applyCoupon">Áp dụng</button>
                </div>

                <p class="text-secondary small mt-2 mb-0">Mã thử nghiệm: <strong>SG100</strong></p>
              </div>
            </div>

            <div class="card border-0 rounded-4 shadow-sm">
              <div class="card-body p-4">
                <h5 class="fw-bold mb-3">Tóm tắt đơn hàng</h5>

                <div class="d-flex justify-content-between mb-2">
                  <span>Tổng tiền hàng</span>
                  <span>{{ formatCurrency(cartSubtotal) }}</span>
                </div>

                <div class="d-flex justify-content-between mb-2">
                  <span>Phí vận chuyển</span>
                  <span>{{ shippingFeeText }}</span>
                </div>

                <div class="d-flex justify-content-between mb-3">
                  <span>Giảm giá</span>
                  <span>{{ discountText }}</span>
                </div>

                <div class="d-flex justify-content-between fw-bold fs-5 mb-4">
                  <span>Tổng thanh toán</span>
                  <span>{{ formatCurrency(total) }}</span>
                </div>

                <button type="button" class="btn btn-warning w-100 fw-bold py-3 rounded-3" :disabled="cartItems.length === 0" @click="placeOrder">
                  Đặt hàng
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
.checkout-page {
  font-size: 14px;
}

.checkout-input {
  min-height: 46px;
  border-radius: 10px;
  border-color: #dee2e6;
  font-size: 14px;
}

.checkout-input:focus {
  box-shadow: none;
  border-color: #212529;
}

.vn-flag {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background-color: #dc3545;
  color: #fff;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 700;
}

.shipping-card {
  transition: 0.2s ease;
}

.shipping-card:hover {
  border-color: #ffc107 !important;
}

.payment-item {
  border-bottom: 1px solid #eee;
  transition: 0.2s ease;
}

.payment-item:last-child {
  border-bottom: 0;
}

.active-payment {
  background-color: #fff8e1;
  outline: 1px solid #ffc107;
}

.payment-note {
  background-color: #fff;
  border-bottom: 1px solid #eee;
}

.payment-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background-color: #f8f9fa;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.payment-brand {
  font-size: 11px;
  color: #0d6efd;
  background-color: #eef6ff;
  border-radius: 6px;
  padding: 4px 6px;
  font-weight: 700;
}

.cart-img {
  width: 72px;
  height: 72px;
}

.coupon-box {
  min-height: 40px;
  border: 1px solid #dee2e6;
  border-radius: 10px;
  padding: 8px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #6c757d;
  font-weight: 600;
}

.coupon-suggest {
  background-color: #dff4ff;
  color: #0d6efd;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12px;
}

.object-fit-cover {
  object-fit: cover;
}

.mix-blend-multiply {
  mix-blend-mode: multiply;
}
</style>
