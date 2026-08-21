<!-- Trang: Quản Lý Xác Nhận Thanh Toán (Online / Offline + Chi tiết + Hóa đơn) -->
<script setup>
import { onMounted } from 'vue'
import {
  paymentChannel, paymentSearch,
  paymentChannelOrders, paymentChannelCount, paymentTotalCount, countOrdersByChannel,
  getPaymentMethodPill, getPaymentStatusPill, getOrderStatusPill,
  getOrderChannel, getTrackingCode, getShipperCode,
  orderDetail, openOrderDetail, closeOrderDetail,
  buildOrderHistory, printInvoice, getOrderActions, runOrderAction,
  formatDate, formatPrice, fetchAllData,
} from '../adminStore'

onMounted(fetchAllData)
</script>

<template>
  <div class="fade-in">

    <!-- ================= DANH SÁCH ================= -->
    <div v-if="!orderDetail.open">
      <!-- Tiêu đề -->
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
        <div>
          <h5 class="fw-bold mb-1 text-dark">Xác Nhận Thanh Toán</h5>
          <p class="text-secondary small mb-0">Online: khách mua trên mạng &nbsp;|&nbsp; Tại quầy: khách lẻ mua tại quầy</p>
          <p class="text-secondary mb-0" style="font-size:0.75rem;"><i class="bi bi-info-circle me-1"></i>Đơn chuyển khoản: khách phải chuyển TRƯỚC rồi mới xác nhận &amp; hoàn thành. Đơn COD: xác nhận → giao → thu tiền → hoàn thành.</p>
        </div>
        <span class="badge bg-dark text-white px-3 py-2" style="border-radius:3px;" v-text="'Tổng ' + paymentTotalCount + ' đơn'"></span>
      </div>

      <div class="bg-white p-3 p-md-4" style="border-radius: 4px;">
        <!-- Tabs Online / Offline + Tìm kiếm -->
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div class="d-flex gap-2">
            <button @click="paymentChannel = 'Online'" class="btn btn-sm fw-medium border px-3"
              style="border-radius: 4px;"
              :class="paymentChannel === 'Online' ? 'btn-dark text-white border-dark' : 'btn-white text-secondary'">
              <i class="bi bi-globe2 me-1"></i> Online
              <span class="ms-1 opacity-75" v-text="'(' + countOrdersByChannel('Online') + ')'"></span>
            </button>
            <button @click="paymentChannel = 'Offline'" class="btn btn-sm fw-medium border px-3"
              style="border-radius: 4px;"
              :class="paymentChannel === 'Offline' ? 'btn-dark text-white border-dark' : 'btn-white text-secondary'">
              <i class="bi bi-shop-window me-1"></i> Tại quầy
              <span class="ms-1 opacity-75" v-text="'(' + countOrdersByChannel('Offline') + ')'"></span>
            </button>
          </div>
          <div class="position-relative" style="max-width:280px;width:100%;">
            <i class="bi bi-search position-absolute text-secondary" style="left:10px;top:50%;transform:translateY(-50%);"></i>
            <input v-model="paymentSearch" type="text" class="form-control form-control-sm ps-4" style="border-radius:4px;" placeholder="Tìm mã đơn / khách hàng...">
          </div>
        </div>

        <!-- Bảng đơn hàng -->
        <div v-if="paymentChannelOrders.length === 0" class="text-center text-secondary py-5">
          <i class="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>Không có đơn hàng nào ở kênh này.
        </div>
        <div v-else class="table-responsive">
          <table class="table align-middle mb-0">
            <thead>
              <tr class="text-secondary small text-uppercase bg-light">
                <th>Đơn hàng</th>
                <th>Phương thức</th>
                <th>Thanh toán</th>
                <th>Trạng thái đơn</th>
                <th class="text-end">Tổng tiền</th>
                <th class="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ord in paymentChannelOrders" :key="ord.id">
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <span class="fw-bold text-dark small" v-text="getTrackingCode(ord)"></span>
                    <span v-if="ord.address_changed" class="badge bg-warning text-dark" style="font-size:0.65rem;">Đã đổi địa chỉ</span>
                  </div>
                  <div class="text-secondary" style="font-size:0.78rem;">
                    <span v-text="ord.handled_by || ord.customer_name || 'Khách lẻ'"></span>
                    <span class="mx-1">|</span>
                    <span v-text="formatDate(ord.date)"></span>
                  </div>
                </td>
                <td>
                  <span class="badge" style="border-radius:2px;font-size:0.72rem;"
                    :class="getPaymentMethodPill(ord.payment_method).cls"
                    v-text="getPaymentMethodPill(ord.payment_method).code"></span>
                </td>
                <td>
                  <span class="badge" style="border-radius:2px;font-size:0.72rem;"
                    :class="getPaymentStatusPill(ord).cls"
                    v-text="getPaymentStatusPill(ord).label"></span>
                </td>
                <td>
                  <span class="badge" style="border-radius:2px;font-size:0.72rem;"
                    :class="getOrderStatusPill(ord).cls"
                    v-text="getOrderStatusPill(ord).label"></span>
                </td>
                <td class="text-end fw-bold text-dark small" v-text="formatPrice(ord.total)"></td>
                <td class="text-end">
                  <button @click="openOrderDetail(ord)" class="btn btn-sm btn-outline-dark fw-medium" style="border-radius:4px;"><i class="bi bi-eye me-1"></i> Chi tiết</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ================= CHI TIẾT ================= -->
    <div v-else-if="orderDetail.order">
      <!-- Thanh tiêu đề -->
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div class="d-flex align-items-center gap-2">
          <button @click="closeOrderDetail()" class="btn btn-sm btn-light border" style="border-radius:4px;"><i class="bi bi-arrow-left"></i></button>
          <h5 class="fw-bold mb-0 text-dark">Chi tiết đơn <span class="text-secondary fw-normal">/</span> <span v-text="getTrackingCode(orderDetail.order)"></span></h5>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="badge px-3 py-2" style="border-radius:3px;font-size:0.75rem;"
            :class="getPaymentStatusPill(orderDetail.order).cls"
            v-text="getPaymentStatusPill(orderDetail.order).label"></span>
          <button @click="printInvoice(orderDetail.order)" class="btn btn-sm btn-dark fw-medium" style="border-radius:4px;"><i class="bi bi-printer me-1"></i> In hóa đơn</button>
        </div>
      </div>

      <!-- Lịch sử đơn hàng (timeline ngang) -->
      <div class="bg-white p-4 mb-3" style="border-radius:4px;">
        <h6 class="fw-bold text-dark mb-4 small text-uppercase text-secondary">Lịch sử đơn hàng</h6>
        <div class="d-flex justify-content-between position-relative flex-nowrap overflow-auto pb-2" style="gap:8px;">
          <div v-for="(step, i) in buildOrderHistory(orderDetail.order)" :key="i" class="text-center position-relative flex-fill" style="min-width:100px;">
            <div v-if="i > 0" class="position-absolute" :style="{ height: '2px', top: '18px', left: '-50%', width: '100%', background: step.done ? '#0A0A0A' : '#e5e7eb', zIndex: 0 }"></div>
            <div class="d-flex align-items-center justify-content-center mx-auto position-relative border"
              :class="step.done ? 'bg-dark text-white' : 'bg-white text-secondary'"
              style="width:36px;height:36px;z-index:1;border-radius:4px;">
              <i class="bi" :class="step.icon"></i>
            </div>
            <div class="small fw-medium mt-2" style="font-size:0.78rem;" :class="step.done ? 'text-dark' : 'text-secondary'" v-text="step.label"></div>
            <div class="text-secondary" style="font-size:0.7rem;" v-text="step.date ? formatDate(step.date) : '—'"></div>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <!-- Thông tin đơn hàng -->
        <div class="col-lg-8">
          <div class="bg-white p-4 mb-3" style="border-radius:4px;">
            <h6 class="fw-bold text-dark mb-3 small text-uppercase text-secondary">Thông tin đơn hàng</h6>
            <div class="row g-3 small">
              <div class="col-md-6"><span class="text-secondary d-block mb-1">Mã vận đơn</span><span class="fw-medium text-dark" v-text="getTrackingCode(orderDetail.order)"></span></div>
              <div class="col-md-6"><span class="text-secondary d-block mb-1">Mã lấy hàng (shipper)</span><span class="fw-medium text-dark" v-text="getShipperCode(orderDetail.order)"></span></div>
              <div class="col-md-6"><span class="text-secondary d-block mb-1">Kênh bán</span><span class="fw-medium text-dark" v-text="getOrderChannel(orderDetail.order) === 'Offline' ? 'Tại quầy' : 'Online'"></span></div>
              <div class="col-md-6"><span class="text-secondary d-block mb-1">Ngày tạo</span><span class="fw-medium text-dark" v-text="formatDate(orderDetail.order.date)"></span></div>
              <div class="col-md-6"><span class="text-secondary d-block mb-1">Nhân viên xử lý</span><span class="fw-medium text-dark" v-text="orderDetail.order.handled_by || 'Admin'"></span></div>
              <div class="col-md-6"><span class="text-secondary d-block mb-1">Khách hàng</span><span class="fw-medium text-dark" v-text="orderDetail.order.customer_name || 'Khách lẻ'"></span></div>
              <div class="col-md-6"><span class="text-secondary d-block mb-1">Số điện thoại</span><span class="fw-medium text-dark" v-text="orderDetail.order.customer_phone || '—'"></span></div>
              <div class="col-md-6">
                <span class="text-secondary d-block mb-1">Địa chỉ nhận hàng</span>
                <span class="fw-medium text-dark" v-text="orderDetail.order.customer_address || '—'"></span>
                <span v-if="orderDetail.order.address_changed" class="badge bg-warning text-dark ms-2">Đã đổi địa chỉ</span>
              </div>
            </div>
          </div>

          <!-- Sản phẩm -->
          <div class="bg-white p-4" style="border-radius:4px;">
            <h6 class="fw-bold text-dark mb-3 small text-uppercase text-secondary">Sản phẩm trong đơn</h6>
            <div v-for="(p, idx) in orderDetail.order.products" :key="idx" class="d-flex align-items-center gap-3 py-2 border-bottom border-light">
              <img :src="p.image || 'https://via.placeholder.com/44'" style="width:44px;height:44px;object-fit:cover;border-radius:2px;border:1px solid #eee;" @error="$event.target.src='https://via.placeholder.com/44'">
              <div class="flex-grow-1">
                <p class="fw-medium mb-0 text-dark small" v-text="p.name"></p>
                <p class="text-secondary mb-0" style="font-size:0.78rem;"><span v-text="p.color"></span> / Size <span v-text="p.size"></span> · SL: <span v-text="p.quantity"></span></p>
              </div>
              <span class="fw-medium text-dark small" v-text="formatPrice(p.price)"></span>
            </div>
            <div class="d-flex justify-content-between align-items-center pt-3 mt-1">
              <span class="text-secondary small">Tổng tiền</span>
              <span class="fw-bolder fs-5 text-dark" v-text="formatPrice(orderDetail.order.total)"></span>
            </div>
          </div>
        </div>

        <!-- Trạng thái & Hành động -->
        <div class="col-lg-4">
          <div class="bg-white p-4" style="border-radius:4px;">
            <h6 class="fw-bold text-dark mb-3 small text-uppercase text-secondary">Trạng thái</h6>

            <div class="mb-3 pb-3 border-bottom">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="text-secondary small">Trạng thái đơn</span>
                <span class="badge" style="border-radius:2px;font-size:0.72rem;"
                  :class="getOrderStatusPill(orderDetail.order).cls"
                  v-text="getOrderStatusPill(orderDetail.order).label"></span>
              </div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="text-secondary small">Thanh toán</span>
                <span class="badge" style="border-radius:2px;font-size:0.72rem;"
                  :class="getPaymentStatusPill(orderDetail.order).cls"
                  v-text="getPaymentStatusPill(orderDetail.order).label"></span>
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <span class="text-secondary small">Phương thức</span>
                <span class="badge" style="border-radius:2px;font-size:0.72rem;"
                  :class="getPaymentMethodPill(orderDetail.order.payment_method).cls"
                  v-text="getPaymentMethodPill(orderDetail.order.payment_method).code"></span>
              </div>
            </div>

            <div class="mb-3 pb-3 border-bottom">
              <p class="text-secondary mb-2" style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">Tiến trình đơn hàng</p>
              <div class="d-grid gap-2">
                <button v-for="act in getOrderActions(orderDetail.order)" :key="act.key"
                  @click="runOrderAction(orderDetail.order, act)"
                  :disabled="act.locked"
                  class="btn btn-sm fw-medium"
                  style="border-radius:4px;"
                  :class="act.class"
                  v-text="act.text"></button>
                <div v-if="getOrderActions(orderDetail.order).length === 0" class="text-secondary small text-center py-1">Đơn đã hoàn tất hoặc đã hủy.</div>
              </div>
            </div>

            <button @click="printInvoice(orderDetail.order)" class="btn btn-dark w-100 fw-medium btn-sm" style="border-radius:4px;"><i class="bi bi-printer me-1"></i> In hóa đơn</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
