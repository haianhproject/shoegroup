<!-- Trang: Quản Lý Xác Nhận Thanh Toán (Online / Offline + Chi tiết + Hóa đơn) -->
<script setup>
import {
  paymentChannel, paymentSearch,
  paymentChannelOrders, paymentChannelCount, paymentTotalCount, countOrdersByChannel,
  getPaymentMethodPill, getPaymentStatusPill, getOrderStatusPill,
  getOrderChannel, getTrackingCode, getShipperCode,
  orderDetail, openOrderDetail, closeOrderDetail,
  buildOrderHistory, printInvoice, getOrderActions, runOrderAction,
  formatDate, formatPrice,
} from '../adminStore'
</script>

<template>
  <div class="fade-in">

    <!-- ================= DANH SÁCH ================= -->
    <div v-if="!orderDetail.open">
      <!-- Tiêu đề -->
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h5 class="fw-bold mb-1 text-dark">Quản lý xác nhận thanh toán</h5>
          <p class="text-secondary small mb-0">Online: khách mua trên mạng &nbsp;|&nbsp; Tại quầy: khách lẻ mua tại quầy</p>
          <p class="text-secondary mb-0" style="font-size:0.75rem;"><i class="bi bi-info-circle me-1"></i>Trạng thái thanh toán đĐơn chuyển khoản: khách phải chuyển khoản TRƯỚC rồi mới xác nhận & hoàn thành đơn. Đơn COD: xác nhận → giao → thu tiền → hoàn thành đơn.</p>
        </div>
        <span class="badge rounded-pill bg-dark text-white px-3 py-2" v-text="'Tổng ' + paymentTotalCount + ' đơn'"></span>
      </div>

      <div class="bg-white rounded-4 shadow-sm p-3 p-md-4">
        <!-- Tabs Online / Offline + Tìm kiếm -->
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div class="d-flex gap-2">
            <button @click="paymentChannel = 'Online'" class="btn btn-sm rounded-pill px-3 fw-medium border" :class="paymentChannel === 'Online' ? 'btn-dark text-white border-dark' : 'btn-white text-secondary'">
              <i class="bi bi-globe2 me-1"></i> Online
              <span class="ms-1 opacity-75" v-text="'(' + countOrdersByChannel('Online') + ')'"></span>
            </button>
            <button @click="paymentChannel = 'Offline'" class="btn btn-sm rounded-pill px-3 fw-medium border" :class="paymentChannel === 'Offline' ? 'btn-dark text-white border-dark' : 'btn-white text-secondary'">
              <i class="bi bi-shop-window me-1"></i> Tại quầy
              <span class="ms-1 opacity-75" v-text="'(' + countOrdersByChannel('Offline') + ')'"></span>
            </button>
          </div>
          <div class="position-relative" style="max-width:280px;width:100%;">
            <i class="bi bi-search position-absolute text-secondary" style="left:12px;top:50%;transform:translateY(-50%);"></i>
            <input v-model="paymentSearch" type="text" class="form-control form-control-sm rounded-3 ps-4" placeholder="Tìm kiếm mã đơn / khách hàng...">
          </div>
        </div>

        <!-- Bảng đơn hàng -->
        <div v-if="paymentChannelOrders.length === 0" class="text-center text-secondary py-5">
          <i class="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>Không có đơn hàng nào ở kênh này.
        </div>
        <div v-else class="table-responsive">
          <table class="table align-middle mb-0">
            <thead>
              <tr class="text-secondary small text-uppercase">
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
                  <div class="fw-bold text-dark" v-text="getTrackingCode(ord)"></div>
                  <div class="text-secondary" style="font-size:0.78rem;">
                    <span v-text="ord.handled_by || ord.customer_name || 'Khách lẻ'"></span>
                    <span class="mx-1">|</span>
                    <span v-text="formatDate(ord.date)"></span>
                  </div>
                </td>
                <td><span class="badge rounded-pill" :class="getPaymentMethodPill(ord.payment_method).cls" v-text="getPaymentMethodPill(ord.payment_method).code"></span></td>
                <td><span class="badge rounded-pill" :class="getPaymentStatusPill(ord).cls" v-text="getPaymentStatusPill(ord).label"></span></td>
                <td><span class="badge rounded-pill" :class="getOrderStatusPill(ord).cls" v-text="getOrderStatusPill(ord).label"></span></td>
                <td class="text-end fw-bold text-dark" v-text="formatPrice(ord.total)"></td>
                <td class="text-end">
                  <button @click="openOrderDetail(ord)" class="btn btn-sm btn-outline-dark rounded-3 fw-medium"><i class="bi bi-eye me-1"></i> Chi tiết</button>
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
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div class="d-flex align-items-center gap-2">
          <button @click="closeOrderDetail()" class="btn btn-sm btn-light border rounded-3"><i class="bi bi-arrow-left"></i></button>
          <h5 class="fw-bold mb-0 text-dark">Chi tiết đơn hàng <span class="text-secondary">/</span> <span v-text="getTrackingCode(orderDetail.order)"></span></h5>
        </div>
        <div class="d-flex gap-2">
          <span class="badge rounded-pill align-self-center px-3 py-2" :class="getPaymentStatusPill(orderDetail.order).cls" v-text="getPaymentStatusPill(orderDetail.order).label"></span>
          <button @click="printInvoice(orderDetail.order)" class="btn btn-sm btn-dark rounded-3 fw-medium"><i class="bi bi-printer me-1"></i> In hóa đơn</button>
        </div>
      </div>

      <!-- Lịch sử đơn hàng (timeline ngang) -->
      <div class="bg-white rounded-4 shadow-sm p-4 mb-3">
        <h6 class="fw-bold text-dark mb-4"><i class="bi bi-clock-history me-2"></i>Lịch sử đơn hàng</h6>
        <div class="d-flex justify-content-between position-relative flex-nowrap overflow-auto pb-2" style="gap:8px;">
          <div v-for="(step, i) in buildOrderHistory(orderDetail.order)" :key="i" class="text-center position-relative flex-fill" style="min-width:110px;">
            <div v-if="i > 0" class="position-absolute" :style="{ height: '2px', top: '19px', left: '-50%', width: '100%', background: step.done ? '#212529' : '#e5e7eb', zIndex: 0 }"></div>
            <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto position-relative" :class="step.done ? 'bg-dark text-white' : 'bg-light text-secondary border'" style="width:40px;height:40px;z-index:1;">
              <i class="bi" :class="step.icon"></i>
            </div>
            <div class="small fw-medium mt-2" :class="step.done ? 'text-dark' : 'text-secondary'" v-text="step.label"></div>
            <div class="text-secondary" style="font-size:0.72rem;" v-text="step.date ? formatDate(step.date) : '—'"></div>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <!-- Thông tin đơn hàng -->
        <div class="col-lg-8">
          <div class="bg-white rounded-4 shadow-sm p-4 mb-3">
            <h6 class="fw-bold text-dark mb-3"><i class="bi bi-receipt me-2"></i>Thông tin đơn hàng</h6>
            <div class="row g-3 small">
              <div class="col-md-6"><span class="text-secondary d-block">Mã vận đơn</span><span class="fw-medium text-dark" v-text="getTrackingCode(orderDetail.order)"></span></div>
              <div class="col-md-6"><span class="text-secondary d-block">Mã lấy hàng (shipper)</span><span class="fw-medium text-dark" v-text="getShipperCode(orderDetail.order)"></span></div>
              <div class="col-md-6"><span class="text-secondary d-block">Kênh bán</span><span class="fw-medium text-dark" v-text="getOrderChannel(orderDetail.order) === 'Offline' ? 'Tại quầy' : 'Online'"></span></div>
              <div class="col-md-6"><span class="text-secondary d-block">Ngày tạo</span><span class="fw-medium text-dark" v-text="formatDate(orderDetail.order.date)"></span></div>
              <div class="col-md-6"><span class="text-secondary d-block">Nhân viên xử lý</span><span class="fw-medium text-dark" v-text="orderDetail.order.handled_by || 'Admin'"></span></div>
              <div class="col-md-6"><span class="text-secondary d-block">Khách hàng</span><span class="fw-medium text-dark" v-text="orderDetail.order.customer_name || 'Khách lẻ'"></span></div>
              <div class="col-md-6"><span class="text-secondary d-block">Số điện thoại</span><span class="fw-medium text-dark" v-text="orderDetail.order.customer_phone || '—'"></span></div>
              <div class="col-md-6"><span class="text-secondary d-block">Địa chỉ nhận hàng</span><span class="fw-medium text-dark" v-text="orderDetail.order.customer_address || '—'"></span></div>
            </div>
          </div>

          <!-- Sản phẩm -->
          <div class="bg-white rounded-4 shadow-sm p-4">
            <h6 class="fw-bold text-dark mb-3"><i class="bi bi-box-seam me-2"></i>Sản phẩm</h6>
            <div v-for="(p, idx) in orderDetail.order.products" :key="idx" class="d-flex align-items-center gap-3 py-2 border-bottom border-light">
              <img :src="p.image || 'https://via.placeholder.com/48'" class="rounded-3 border" style="width:48px;height:48px;object-fit:cover;" @error="$event.target.src='https://via.placeholder.com/48'">
              <div class="flex-grow-1">
                <p class="fw-medium mb-0 text-dark small" v-text="p.name"></p>
                <p class="text-secondary mb-0" style="font-size:0.78rem;"><span v-text="p.color"></span> / Size <span v-text="p.size"></span> · SL: <span v-text="p.quantity"></span></p>
              </div>
              <span class="fw-medium text-dark small" v-text="formatPrice(p.price)"></span>
            </div>
            <div class="d-flex justify-content-between align-items-center pt-3">
              <span class="text-secondary">Tổng tiền</span>
              <span class="fw-bolder fs-5 text-dark" v-text="formatPrice(orderDetail.order.total)"></span>
            </div>
          </div>
        </div>

        <!-- Trạng thái -->
        <div class="col-lg-4">
          <div class="bg-white rounded-4 shadow-sm p-4">
            <h6 class="fw-bold text-dark mb-3"><i class="bi bi-info-circle me-2"></i>Trạng thái</h6>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="text-secondary small">Trạng thái đơn</span>
              <span class="badge rounded-pill" :class="getOrderStatusPill(orderDetail.order).cls" v-text="getOrderStatusPill(orderDetail.order).label"></span>
            </div>
            <div class="text-secondary text-uppercase mb-2" style="font-size:0.68rem;">Tiến trình đơn hàng</div>
            <div class="d-grid gap-2 mb-3">
              <button v-for="act in getOrderActions(orderDetail.order)" :key="act.key" @click="runOrderAction(orderDetail.order, act)" :disabled="act.locked" class="btn rounded-3 fw-bold" :class="act.class" v-text="act.text"></button>
              <div v-if="getOrderActions(orderDetail.order).length === 0" class="text-secondary small text-center py-1">Đơn đã hoàn tất hoặc đã hủy — không còn thao tác.</div>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="text-secondary small">Thanh toán</span>
              <span class="badge rounded-pill" :class="getPaymentStatusPill(orderDetail.order).cls" v-text="getPaymentStatusPill(orderDetail.order).label"></span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="text-secondary small">Phương thức</span>
              <span class="badge rounded-pill" :class="getPaymentMethodPill(orderDetail.order.payment_method).cls" v-text="getPaymentMethodPill(orderDetail.order.payment_method).code"></span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
              <span class="text-secondary small">Kênh bán</span>
              <span class="badge rounded-pill bg-dark text-white" v-text="getOrderChannel(orderDetail.order) === 'Offline' ? 'Tại quầy' : 'Online'"></span>
            </div>
            <hr class="my-3">
            <button @click="printInvoice(orderDetail.order)" class="btn btn-dark rounded-3 w-100 fw-medium"><i class="bi bi-printer me-1"></i> In hóa đơn</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
