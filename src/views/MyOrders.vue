<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { currentUser, logout } from '../stores/authStore'
import { ordersByCurrentUser } from '../stores/orderStore'
import { formatCurrency } from '../stores/cartStore'

const router = useRouter()
const selectedOrder = ref(null)

const displayName = computed(() => currentUser.value?.full_name || 'Khách hàng')

const handleLogout = () => {
  logout()
  router.push('/login')
}

const openOrder = (order) => {
  selectedOrder.value = order
}

</script>

<template>
  <div class="container-fluid px-4 py-5 bg-light min-vh-100">
    <div class="container">
      <h1 class="fw-bold mb-4 fs-2">Tài Khoản Của Tôi</h1>

      <div class="row g-4">
        <div class="col-md-4 col-lg-3">
          <div class="d-flex flex-column gap-2 bg-white rounded-4 p-3 shadow-sm">
            <div class="px-3 py-2">
              <p class="small text-secondary mb-1">Xin chào</p>
              <h6 class="fw-bold mb-0">{{ displayName }}</h6>
            </div>

            <router-link to="/account" class="btn btn-light text-start border-0 fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2 text-secondary" active-class="btn-dark text-white">
              <i class="bi bi-person"></i> Hồ sơ
            </router-link>

            <router-link to="/orders" class="btn btn-dark text-start border-0 fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2">
              <i class="bi bi-box"></i> Đơn hàng
            </router-link>

            <button class="btn btn-light text-start border-0 fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2 text-secondary">
              <i class="bi bi-gear"></i> Cài đặt
            </button>

            <hr class="my-2 text-secondary">

            <button
              type="button"
              class="btn btn-outline-danger text-start fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2 border-0 bg-danger-hover"
              @click="handleLogout"
            >
              <i class="bi bi-box-arrow-right"></i> Đăng xuất
            </button>
          </div>
        </div>

        <div class="col-md-8 col-lg-9">
          <div class="card border-0 rounded-4 shadow-sm overflow-hidden">
            <div class="p-4 border-bottom bg-white d-flex align-items-center justify-content-between">
              <h2 class="fw-bold fs-4 m-0">Lịch sử đơn hàng</h2>
            </div>

            <div v-if="ordersByCurrentUser.length === 0" class="text-center py-5 px-4">
              <i class="bi bi-receipt fs-1 text-secondary"></i>
              <h5 class="fw-bold mt-3">Chưa có đơn hàng</h5>
              <p class="text-secondary mb-4">Sau khi đặt hàng thành công, đơn hàng sẽ hiển thị tại đây.</p>
              <router-link to="/" class="btn btn-dark fw-bold rounded-3 px-4">
                Tiếp tục mua sắm
              </router-link>
            </div>

            <div v-else class="table-responsive">
              <table class="table table-hover mb-0 align-middle">
                <thead class="table-light text-secondary text-uppercase small bg-light">
                  <tr>
                    <th scope="col" class="py-3 px-4 fw-bold">Mã đơn</th>
                    <th scope="col" class="py-3 px-4 fw-bold">Ngày đặt</th>
                    <th scope="col" class="py-3 px-4 fw-bold">Sản phẩm</th>
                    <th scope="col" class="py-3 px-4 fw-bold">Trạng thái</th>
                    <th scope="col" class="py-3 px-4 fw-bold">Tổng tiền</th>
                    <th scope="col" class="py-3 px-4 fw-bold text-end">Thao tác</th>
                  </tr>
                </thead>

                <tbody class="border-top-0">
                  <tr v-for="order in ordersByCurrentUser" :key="order.id">
                    <td class="py-3 px-4 fw-bold text-dark">{{ order.id }}</td>
                    <td class="py-3 px-4 text-secondary fw-semibold">{{ order.date }}</td>
                    <td class="py-3 px-4 text-secondary fw-semibold">{{ order.items.length }} sản phẩm</td>
                    <td class="py-3 px-4">
                      <span class="badge rounded-pill fw-bold text-uppercase px-3 py-2 bg-warning text-dark">
                        {{ order.status }}
                      </span>
                    </td>
                    <td class="py-3 px-4 fw-bold text-dark">{{ formatCurrency(order.total) }}</td>
                    <td class="py-3 px-4 text-end">
                      <div class="d-flex justify-content-end gap-2">
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-primary fw-bold px-3 py-1 rounded-3 d-inline-flex gap-1 align-items-center border-0"
                          style="background-color: #e7f1ff;"
                          @click="openOrder(order)"
                        >
                          <i class="bi bi-eye"></i> Xem
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="selectedOrder" class="card border-0 rounded-4 shadow-sm mt-4 overflow-hidden">
            <div class="p-4 border-bottom bg-white d-flex justify-content-between align-items-center gap-3">
              <div>
                <h3 class="fw-bold fs-5 mb-1">Chi tiết đơn hàng {{ selectedOrder.id }}</h3>
                <p class="text-secondary mb-0 small">Ngày đặt: {{ selectedOrder.date }}</p>
              </div>

              <button type="button" class="btn btn-light rounded-circle" @click="selectedOrder = null">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>

            <div class="card-body p-4">
              <div class="row g-4">
                <div class="col-lg-7">
                  <h5 class="fw-bold mb-3">Sản phẩm</h5>

                  <div class="d-flex flex-column gap-3">
                    <div
                      v-for="item in selectedOrder.items"
                      :key="`${item.id_product_detail}-${item.product_name}`"
                      class="d-flex gap-3 align-items-center border rounded-3 p-3"
                    >
                      <div class="bg-light rounded-3 overflow-hidden border flex-shrink-0" style="width: 70px; height: 70px;">
                        <img :src="item.image_url" :alt="item.product_name" class="w-100 h-100 object-fit-cover mix-blend-multiply">
                      </div>

                      <div class="flex-grow-1">
                        <h6 class="fw-bold mb-1">{{ item.product_name }}</h6>
                        <p class="text-secondary small mb-1">
                          Size {{ item.size_name }} / {{ item.color_name }} / SL: {{ item.quantity }}
                        </p>
                        <p class="fw-bold mb-0">{{ formatCurrency(item.subtotal) }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="col-lg-5">
                  <h5 class="fw-bold mb-3">Thông tin đơn hàng</h5>

                  <div class="bg-light rounded-3 p-3 mb-3">
                    <p class="mb-1"><strong>Người nhận:</strong> {{ selectedOrder.customer.fullName }}</p>
                    <p class="mb-1"><strong>SĐT:</strong> {{ selectedOrder.customer.phone }}</p>
                    <p class="mb-0"><strong>Địa chỉ:</strong> {{ selectedOrder.customer.address }}, {{ selectedOrder.customer.province }}</p>
                  </div>

                  <div class="d-flex justify-content-between mb-2">
                    <span>Tổng tiền hàng</span>
                    <strong>{{ formatCurrency(selectedOrder.subtotal) }}</strong>
                  </div>

                  <div class="d-flex justify-content-between mb-2">
                    <span>Phí vận chuyển</span>
                    <strong>{{ formatCurrency(selectedOrder.shippingFee) }}</strong>
                  </div>

                  <div class="d-flex justify-content-between mb-2">
                    <span>Giảm giá</span>
                    <strong>- {{ formatCurrency(selectedOrder.discount) }}</strong>
                  </div>

                  <hr>

                  <div class="d-flex justify-content-between fs-5 fw-bold">
                    <span>Tổng thanh toán</span>
                    <span>{{ formatCurrency(selectedOrder.total) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-danger-hover:hover {
  background-color: #f8d7da;
}

.object-fit-cover {
  object-fit: cover;
}

.mix-blend-multiply {
  mix-blend-mode: multiply;
}
</style>
