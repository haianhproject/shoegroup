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
</script>

<template>
  <div class="container-fluid px-4 py-5 bg-light min-vh-100">
    <h1 class="fw-bold mb-4 fs-2">Giỏ Hàng Của Bạn</h1>

    <div v-if="cartItems.length === 0" class="card border-0 rounded-4 shadow-sm">
      <div class="card-body text-center py-5">
        <i class="bi bi-cart-x display-4 text-secondary"></i>
        <h3 class="fw-bold mt-3">Giỏ hàng đang trống</h3>
        <p class="text-secondary">Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm.</p>

        <router-link to="/" class="btn btn-dark fw-bold rounded-3 px-4">
          Tiếp tục mua sắm
        </router-link>
      </div>
    </div>

    <div v-else class="row g-4">
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
                      <router-link
                        :to="`/product/${item.product.id_product}`"
                        class="bg-light rounded-3 overflow-hidden border flex-shrink-0"
                        style="width: 90px; height: 90px;"
                      >
                        <img
                          :src="item.product.image_url"
                          :alt="item.product.product_name"
                          class="w-100 h-100 object-fit-cover mix-blend-multiply"
                        >
                      </router-link>

                      <div>
                        <router-link
                          :to="`/product/${item.product.id_product}`"
                          class="text-dark fw-bold text-decoration-none hover-primary"
                        >
                          {{ item.product.product_name }}
                        </router-link>

                        <p class="text-secondary small mb-1 fw-semibold">
                          Size: {{ item.size?.size_name }} |
                          Màu: {{ item.color?.color_label || item.color?.color_name }}
                        </p>

                        <p class="text-secondary small mb-0">
                          Tồn kho: {{ item.stockQuantity }}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td class="p-4 text-center fw-bold">
                    {{ formatCurrency(item.unitPrice) }}
                  </td>

                  <td class="p-4">
                    <div class="input-group input-group-sm mx-auto rounded border" style="width: 110px;">
                      <button
                        class="btn btn-light border-0"
                        type="button"
                        :disabled="item.quantity <= 1"
                        @click="handleDecrease(item.id_product_detail)"
                      >
                        <i class="bi bi-dash"></i>
                      </button>

                      <input
                        type="text"
                        class="form-control text-center border-0 bg-transparent fw-bold px-0"
                        :value="item.quantity"
                        readonly
                      >

                      <button
                        class="btn btn-light border-0"
                        type="button"
                        :disabled="item.quantity >= item.stockQuantity"
                        @click="handleIncrease(item.id_product_detail)"
                      >
                        <i class="bi bi-plus"></i>
                      </button>
                    </div>
                  </td>

                  <td class="p-4 text-end fw-bold">
                    {{ formatCurrency(item.subtotal) }}
                  </td>

                  <td class="p-4 text-end">
                    <button
                      class="btn btn-outline-danger border-0 rounded-3 text-danger bg-danger-hover"
                      type="button"
                      @click="removeFromCart(item.id_product_detail)"
                    >
                      <i class="bi bi-trash fs-5"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card border-0 rounded-4 shadow-sm sticky-top" style="top: 100px;">
          <div class="card-body p-4">
            <h4 class="fw-bold fs-4 mb-4">Tóm tắt đơn hàng</h4>

            <div class="d-flex justify-content-between mb-3 text-secondary">
              <span class="fw-bold">Tạm tính</span>
              <span class="text-dark fw-bold">{{ formatCurrency(cartSubtotal) }}</span>
            </div>

            <div class="d-flex justify-content-between mb-3 text-secondary">
              <span class="fw-bold">Phí vận chuyển dự kiến</span>
              <span class="text-dark fw-bold">{{ formatCurrency(cartShippingFee) }}</span>
            </div>

            <hr class="my-4 text-secondary">

            <div class="d-flex justify-content-between align-items-center mb-4">
              <span class="fw-bold fs-5">Tổng thanh toán</span>
              <span class="text-dark fw-bold display-6 mb-0 fs-3">
                {{ formatCurrency(cartTotal) }}
              </span>
            </div>

            <router-link
              to="/checkout"
              class="btn btn-dark w-100 py-3 rounded-3 fw-bold fs-5 shadow-hover"
            >
              Tiến hành thanh toán
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.object-fit-cover {
  object-fit: cover;
}

.mix-blend-multiply {
  mix-blend-mode: multiply;
}

.hover-primary:hover {
  color: #0d6efd !important;
}

.bg-danger-hover:hover {
  background-color: #f8d7da;
}
</style>
