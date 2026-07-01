<script setup>
import {
  cartItems,
  cartSubtotal,
  cartShippingFee,
  cartTotal,
  formatCurrency,
  increaseQuantity,
  decreaseQuantity,
  removeFromCart
} from '../stores/cartStore'

const handleIncrease = (detailId) => {
  const result = increaseQuantity(detailId)
  if (!result.ok) alert(result.message)
}

const handleDecrease = (detailId) => {
  const result = decreaseQuantity(detailId)
  if (!result.ok) alert(result.message)
}
</script>

<template>
  <div class="container-fluid px-4 py-5 bg-light min-vh-100">
    <div class="container">
      <h1 class="fw-bold mb-4 fs-2">Giỏ Hàng Của Bạn</h1>
      
      <div v-if="cartItems.length === 0" class="card border-0 rounded-4 shadow-sm">
        <div class="card-body text-center py-5">
          <i class="bi bi-cart-x display-1 text-secondary opacity-50 mb-3"></i>
          <h3 class="fw-bold mt-3">Giỏ hàng đang trống</h3>
          <p class="text-secondary mb-4">Hãy thêm sản phẩm vào giỏ để tiếp tục mua sắm nhé.</p>
          <router-link to="/products" class="btn btn-dark fw-bold rounded-3 px-5 py-2">
            Tiếp tục mua sắm
          </router-link>
        </div>
      </div>

      <div v-else class="row g-4">
        <!-- Bảng Giỏ hàng -->
        <div class="col-lg-8">
          <div class="card border-0 rounded-4 shadow-sm overflow-hidden">
            <div class="table-responsive">
              <table class="table align-middle mb-0">
                <thead class="table-light text-secondary text-uppercase small">
                  <tr>
                    <th class="py-3 px-4 fw-bold">Sản phẩm</th>
                    <th class="py-3 px-4 fw-bold text-center">Đơn giá</th>
                    <th class="py-3 px-4 fw-bold text-center">Số lượng</th>
                    <th class="py-3 px-4 fw-bold text-end">Tạm tính</th>
                    <th class="py-3 px-4 fw-bold text-end">Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in cartItems" :key="item.id_product_detail">
                    <td class="p-4">
                      <div class="d-flex align-items-center gap-3">
                        <router-link :to="`/product/${item.product?.id_product || item.id_product}`" class="bg-light rounded-3 overflow-hidden border flex-shrink-0" style="width: 80px; height: 80px;">
                          <img :src="item.product?.image_url || 'https://via.placeholder.com/90'" class="w-100 h-100 object-fit-cover mix-blend-multiply">
                        </router-link>
                        <div>
                          <router-link :to="`/product/${item.product?.id_product || item.id_product}`" class="text-dark fw-bold text-decoration-none hover-primary">
                            {{ item.product?.product_name || item.product?.name || 'Sản phẩm giày' }}
                          </router-link>
                          <p class="text-secondary small mb-1 mt-1">
                            Size: <span class="fw-bold text-dark">{{ item.size?.size_name || '42' }}</span> | 
                            Màu: <span class="fw-bold text-dark">{{ item.color?.color_label || item.color?.color_name || 'Mặc định' }}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td class="p-4 text-center fw-semibold text-secondary">
                      {{ formatCurrency(item.unitPrice) }}
                    </td>
                    <td class="p-4">
                      <div class="input-group input-group-sm mx-auto rounded border bg-white" style="width: 100px;">
                        <button class="btn btn-light border-0" type="button" :disabled="item.quantity <= 1" @click="handleDecrease(item.id_product_detail)">
                          <i class="bi bi-dash"></i>
                        </button>
                        <input type="text" class="form-control text-center border-0 bg-transparent fw-bold px-0" :value="item.quantity" readonly>
                        <button class="btn btn-light border-0" type="button" @click="handleIncrease(item.id_product_detail)">
                          <i class="bi bi-plus"></i>
                        </button>
                      </div>
                    </td>
                    <td class="p-4 text-end fw-bold text-dark">
                      {{ formatCurrency(item.subtotal) }}
                    </td>
                    <td class="p-4 text-end">
                      <button class="btn btn-sm btn-outline-danger border-0 rounded-3 bg-danger-hover" type="button" @click="removeFromCart(item.id_product_detail)">
                        <i class="bi bi-trash fs-5"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <!-- Summary Giỏ hàng -->
        <div class="col-lg-4">
          <div class="card border-0 rounded-4 shadow-sm sticky-top" style="top: 100px; z-index: 1;">
            <div class="card-body p-4">
              <h4 class="fw-bold fs-5 mb-4 border-bottom pb-3">Tổng Đơn Hàng</h4>
              <div class="d-flex justify-content-between mb-3 text-secondary">
                <span class="fw-medium">Tạm tính</span>
                <span class="text-dark fw-bold">{{ formatCurrency(cartSubtotal) }}</span>
              </div>
              <div class="d-flex justify-content-between mb-3 text-secondary">
                <span class="fw-medium">Phí vận chuyển</span>
                <span class="text-dark fw-bold">Chưa tính</span>
              </div>
              <hr class="my-4 text-secondary opacity-25">
              <div class="d-flex justify-content-between align-items-center mb-4">
                <span class="fw-bold fs-6">Tổng cộng</span>
                <span class="text-danger fw-black fs-4">
                  {{ formatCurrency(cartSubtotal) }}
                </span>
              </div>
              <router-link to="/checkout" class="btn btn-dark w-100 py-3 rounded-3 fw-bold fs-6 shadow-hover text-uppercase tracking-wide text-center d-block text-decoration-none">
                Tiến hành thanh toán
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.object-fit-cover { object-fit: cover; }
.mix-blend-multiply { mix-blend-mode: multiply; }
.hover-primary:hover { color: #0d6efd !important; }
.bg-danger-hover:hover { background-color: #f8d7da; }
.tracking-wide { letter-spacing: 1px; }
.fw-black { font-weight: 900; }
</style>