<!-- Trang: Quản Lý Xác Nhận Thanh Toán (Online / Offline + Chi tiết + Hóa đơn) -->
<script setup>
import { computed, reactive, ref } from 'vue'
import {
  paymentChannel, paymentSearch,
  paymentChannelOrders, paymentChannelCount, paymentTotalCount, countOrdersByChannel,
  getPaymentMethodPill, getPaymentStatusPill, getOrderStatusPill,
  getOrderResolutionReason,
  getOrderChannel, getTrackingCode, getShipperCode,
  orderDetail, openOrderDetail, closeOrderDetail,
  buildOrderHistory, printInvoice, getOrderActions, runOrderAction,
  formatDate, formatPrice, notify, apiErrors
} from '../adminStore'

const queueView = ref('ACTIVE')

// FIFO: hàng đợi xử lý ưu tiên đơn đặt TRƯỚC lên đầu (cũ nhất → mới nhất)
// Tab "Tất cả" vẫn giữ mới nhất lên đầu cho tiện tra cứu
function sortFIFO(list) {
  return [...list].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : (Number(a.id) || 0)
    const tb = b.created_at ? new Date(b.created_at).getTime() : (Number(b.id) || 0)
    if (ta !== tb) return ta - tb  // cũ nhất lên đầu
    return (Number(a.id) || 0) - (Number(b.id) || 0)
  })
}

const displayedOrders = computed(() => {
  if (queueView.value === 'ALL') return paymentChannelOrders.value
  const active = paymentChannelOrders.value.filter((order) =>
    !['Đã hủy', 'Đã nhận hàng', 'Đã giao hàng thành công', 'Yêu cầu trả hàng', 'Đã hoàn tất trả hàng', 'Về kho', 'Hoàn tất'].includes(order.status)
  )
  return sortFIFO(active)
})

const actionableCount = computed(() => displayedOrders.value.filter((order) =>
  getOrderActions(order).some((action) => !action.locked && !action.isCancel)
).length)

function queueNumber(order, index) {
  const supplied = Number(order?.queue_position ?? order?.priority_number)
  return Number.isFinite(supplied) && supplied > 0 ? supplied : index + 1
}

function isTransfer(order) {
  return getPaymentMethodPill(order?.payment_method).code === 'Chuyển khoản'
}

function isCancelledOrder(order) {
  const status = String(order?.status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .trim()
    .toLowerCase()
  return ['da huy', 'cancelled', 'canceled'].includes(status) || /(^|\s)huy(\s|$)/.test(status)
}



const transitionConfirm = reactive({
  open: false,
  order: null,
  action: null,
  busy: false,
})

function requestOrderAction(order, action) {
  if (!order || !action || action.locked || transitionConfirm.busy) return
  if (action.isCancel) {
    runOrderAction(order, action)
    return
  }
  transitionConfirm.order = order
  transitionConfirm.action = action
  transitionConfirm.open = true
}

function closeTransitionConfirm() {
  if (transitionConfirm.busy) return
  transitionConfirm.open = false
  transitionConfirm.order = null
  transitionConfirm.action = null
}

async function confirmTransition() {
  if (!transitionConfirm.order || !transitionConfirm.action || transitionConfirm.busy) return
  transitionConfirm.busy = true
  try {
    await runOrderAction(transitionConfirm.order, transitionConfirm.action)
    transitionConfirm.open = false
    transitionConfirm.order = null
    transitionConfirm.action = null
  } catch (e) {
    notify("Lỗi: " + e.message, "error")
  } finally {
    transitionConfirm.busy = false
  }
}

async function chooseFailureResolution(option) {
  const menuAction = transitionConfirm.action
  if (!menuAction || !Array.isArray(menuAction.menu) || transitionConfirm.busy) return
  transitionConfirm.action = option
  await confirmTransition()
  // Nếu API từ chối (ví dụ hết tồn kho khi giao lại), giữ menu để quản lý
  // chọn lại nguyên nhân thay vì biến thành một trạng thái trung gian.
  if (transitionConfirm.open) transitionConfirm.action = menuAction
}

function transitionMessage() {
  const order = transitionConfirm.order
  const action = transitionConfirm.action
  if (!order || !action) return ''
  if (action.markPaid) {
    return `Bạn chắc chắn muốn chuyển trạng thái thanh toán của đơn #${order.id} sang “Đã thanh toán”?`
  }
  if (action.key === 'return_warehouse') {
    return `Xác nhận khách không nghe máy/không nhận hàng ở đơn #${order.id}? Đơn sẽ được đưa về kho và dự kiến giao lại vào ngày gần nhất.`
  }
  if (action.key === 'delivery_failed_menu') {
    return `Chọn lý do giao hàng thất bại cho đơn #${order.id}. Hệ thống sẽ chốt và cập nhật đúng nhánh ngay sau khi bạn chọn.`
  }
  if (action.key === 'delivery_accident') {
    return `Xác nhận đơn #${order.id} giao thất bại do tai nạn hoặc trục trặc vận chuyển? Đơn sẽ được sắp xếp giao lại vào ngày gần nhất.`
  }
  if (action.key === 'lost_delivery_cancel') {
    return `Xác nhận đơn #${order.id} bị thất lạc khi vận chuyển? Đơn sẽ bị hủy, không ghi doanh thu và không cộng lại tồn kho.`
  }
  return `Bạn chắc chắn muốn chuyển đơn #${order.id} từ “${order.status}” sang “${action.next}”?`
}
</script>

<template>
  <div class="fade-in">

    <!-- ================= DANH SÁCH ================= -->
    <div v-if="!orderDetail.open">
      <!-- Tiêu đề -->
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
        <div>
          <p class="admin-eyebrow mb-2">Vận hành bán hàng</p>
          <h5 class="fw-bold mb-2 text-dark">Hàng đợi thanh toán</h5>
          <p v-if="apiErrors.length" class="text-warning-emphasis small mb-0">
            Hàng đợi vẫn hiển thị; một số dữ liệu phụ đang tạm thời chưa đồng bộ.
          </p>
        </div>
        <span class="badge bg-dark text-white px-3 py-2" style="border-radius:3px;" v-text="'Tổng ' + paymentTotalCount + ' đơn'"></span>
      </div>

      <div class="admin-surface p-3 p-md-4">
        <!-- Tabs Online / Offline + Tìm kiếm -->
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div class="d-flex gap-2">
            <button @click="paymentChannel = 'Online'" class="btn btn-sm fw-medium border px-3"
              style="border-radius: 4px;"
              :class="paymentChannel === 'Online' ? 'btn-dark text-white border-dark' : 'btn-white text-secondary'">
              Online
              <span class="ms-1 opacity-75" v-text="'(' + countOrdersByChannel('Online') + ')'"></span>
            </button>
            <button @click="paymentChannel = 'Offline'" class="btn btn-sm fw-medium border px-3"
              style="border-radius: 4px;"
              :class="paymentChannel === 'Offline' ? 'btn-dark text-white border-dark' : 'btn-white text-secondary'">
              Tại quầy
              <span class="ms-1 opacity-75" v-text="'(' + countOrdersByChannel('Offline') + ')'"></span>
            </button>
          </div>
          <div class="d-flex gap-2 ms-auto">
            <button class="btn btn-sm border px-3" :class="queueView === 'ACTIVE' ? 'btn-dark' : 'btn-white text-secondary'" @click="queueView = 'ACTIVE'">Đang xử lý</button>
            <button class="btn btn-sm border px-3" :class="queueView === 'ALL' ? 'btn-dark' : 'btn-white text-secondary'" @click="queueView = 'ALL'">Tất cả</button>
          </div>
          <div class="position-relative" style="max-width:280px;width:100%;">
            <input v-model="paymentSearch" type="text" class="form-control form-control-sm ps-4" style="border-radius:4px;" placeholder="Tìm mã đơn / khách hàng...">
          </div>
        </div>

        <!-- Bảng đơn hàng -->
        <div class="queue-summary mb-3">
          <span><strong>{{ displayedOrders.length }}</strong> đơn trong danh sách</span>
          <span><strong>{{ actionableCount }}</strong> đơn có thể xử lý ngay</span>
        </div>

        <div v-if="displayedOrders.length === 0" class="admin-empty">
          <strong>Không có đơn cần xử lý</strong>
          <span>Thử đổi kênh bán, phạm vi hoặc từ khóa tìm kiếm.</span>
        </div>
        <div v-else class="table-responsive">
          <table class="table align-middle mb-0">
            <thead>
              <tr class="text-secondary small text-uppercase bg-light">
                <th style="width:60px;">STT</th>
                <th>Đơn hàng</th>
                <th>Phương thức</th>
                <th>Thanh toán</th>
                <th>Trạng thái đơn</th>
                <th class="text-end">Tổng tiền</th>
                <th class="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(ord, index) in displayedOrders" :key="ord.id" :class="{ 'queue-next': index === 0 && queueView === 'ACTIVE' }">
                <td>
                  <span class="queue-no">{{ String(queueNumber(ord, index)).padStart(2, '0') }}</span>
                </td>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <span class="fw-bold text-dark small" v-text="getTrackingCode(ord)"></span>
                    <span v-if="ord.address_changed" class="badge bg-danger text-white" style="font-size:0.65rem;">Đã đổi địa chỉ</span>
                    <span v-if="ord.stock_issue_status === 'NEEDS_REVIEW'" class="badge bg-warning text-dark" style="font-size:0.65rem;">Cần xử lý tồn kho</span>
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
                  <div v-if="getOrderResolutionReason(ord)" class="order-reason-inline">
                    <i class="bi bi-info-circle me-1" aria-hidden="true"></i>
                    <span v-text="getOrderResolutionReason(ord)"></span>
                  </div>
                </td>
                <td class="text-end fw-bold text-dark small" v-text="formatPrice(ord.total)"></td>
                <td class="text-end">
                  <button @click="openOrderDetail(ord)" class="btn btn-sm btn-outline-dark fw-medium" style="border-radius:4px;">Mở đơn</button>
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
          <button @click="closeOrderDetail()" class="btn btn-sm btn-light border" style="border-radius:4px;">Quay lại</button>
          <h5 class="fw-bold mb-0 text-dark">Chi tiết đơn <span class="text-secondary fw-normal">/</span> <span v-text="getTrackingCode(orderDetail.order)"></span></h5>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="badge px-3 py-2" style="border-radius:3px;font-size:0.75rem;"
            :class="getPaymentStatusPill(orderDetail.order).cls"
            v-text="getPaymentStatusPill(orderDetail.order).label"></span>
          <button @click="printInvoice(orderDetail.order)" class="btn btn-sm btn-dark fw-medium" style="border-radius:4px;">In hóa đơn</button>
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
                <span v-if="orderDetail.order.address_changed" class="badge bg-danger text-white ms-2">Đã đổi địa chỉ</span>
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

            <div v-if="getOrderResolutionReason(orderDetail.order)" class="order-reason-alert" :class="isCancelledOrder(orderDetail.order) ? 'cancel' : 'failure'">
              <strong>
                <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
                <span v-text="isCancelledOrder(orderDetail.order) ? 'Lý do hủy đơn' : 'Lý do giao thất bại'"></span>
              </strong>
              <span v-text="getOrderResolutionReason(orderDetail.order)"></span>
            </div>

            <div v-if="orderDetail.order.stock_issue_status === 'NEEDS_REVIEW'" class="alert alert-warning py-2 px-3 small mb-3">
              <strong>Cần xử lý tồn kho.</strong>
              <span class="d-block mt-1">{{ orderDetail.order.stock_issue_reason || 'Kiểm tra lại biến thể trước khi tiếp tục xử lý.' }}</span>
              <span class="d-block mt-1">Nếu hủy đơn, hệ thống chỉ hoàn kho một lần.</span>
            </div>

            <div class="mb-3 pb-3 border-bottom">
              <p class="text-secondary mb-2" style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">Tiến trình đơn hàng</p>
              <div class="d-grid gap-2">
                <button v-for="act in getOrderActions(orderDetail.order)" :key="act.key"
                  @click="requestOrderAction(orderDetail.order, act)"
                  :disabled="act.locked || transitionConfirm.open || transitionConfirm.busy"
                  class="btn btn-sm fw-medium"
                  style="border-radius:4px;"
                  :class="act.class"
                  v-text="act.text"></button>
                <div v-if="getOrderActions(orderDetail.order).length === 0" class="text-secondary small text-center py-1">Đơn đã hoàn tất hoặc đã hủy.</div>
              </div>
            </div>

            <button @click="printInvoice(orderDetail.order)" class="btn btn-dark w-100 fw-medium btn-sm" style="border-radius:4px;">In hóa đơn</button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="transitionConfirm.open"
        class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
        style="z-index:2050;background:rgba(10,10,10,0.62);"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transition-confirm-title"
        @click.self="closeTransitionConfirm"
      >
        <div class="bg-white border border-dark p-4 w-100" style="max-width:440px;border-radius:4px;box-shadow:0 18px 48px rgba(0,0,0,0.2);">
          <h6 id="transition-confirm-title" class="fw-bold text-dark mb-2">Xác nhận chuyển trạng thái</h6>
          <p class="text-secondary small mb-4" v-text="transitionMessage()"></p>
          <div v-if="transitionConfirm.action?.menu" class="d-grid gap-2 mb-3">
            <button
              v-for="option in transitionConfirm.action.menu"
              :key="option.key"
              type="button"
              class="btn btn-sm fw-medium text-start"
              style="border-radius:4px;"
              :class="option.class"
              :disabled="transitionConfirm.busy"
              @click="chooseFailureResolution(option)"
            >{{ option.text }}</button>
            <div class="d-flex justify-content-end mt-1">
              <button type="button" class="btn btn-sm btn-white border border-dark text-dark px-3" :disabled="transitionConfirm.busy" @click="closeTransitionConfirm">Hủy bỏ</button>
            </div>
          </div>
          <div v-if="!transitionConfirm.action?.menu" class="d-flex justify-content-end gap-2">
            <button
              type="button"
              class="btn btn-sm btn-white border border-dark text-dark px-3"
              :disabled="transitionConfirm.busy"
              @click="closeTransitionConfirm"
            >Hủy bỏ</button>
            <button
              type="button"
              class="btn btn-sm btn-dark text-white px-3"
              :disabled="transitionConfirm.busy"
              @click="confirmTransition"
            >
              <span v-if="transitionConfirm.busy" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
              <span v-text="transitionConfirm.busy ? 'Đang cập nhật...' : 'Xác nhận chuyển'"></span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.bg-white, .admin-surface { border: 1px solid #e5e7eb; box-shadow: 0 8px 24px rgba(15, 23, 42, .04); }
.btn, .form-control { border-radius: 3px !important; }
table th { font-size: .72rem; letter-spacing: .04em; font-weight: 700; }
table td { border-color: #edf0f2; }

/* Thêm css fix lỗi dính chữ */
.queue-summary { display: flex; gap: 16px; flex-wrap: wrap; background: #f8f9fa; padding: 12px 16px; border-radius: 4px; font-size: 0.85rem; color: #444; border: 1px solid #eee; }
.queue-summary > span { display: flex; align-items: center; gap: 6px; }
.queue-summary > span:not(:last-child)::after { content: "•"; color: #ccc; margin-left: 10px; }

.queue-no { font-weight: 700; font-size: 1.1rem; color: #0A0A0A; display: block; }
.queue-next-label { font-size: 0.65rem; background: #0A0A0A; color: #fff; padding: 2px 6px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; display: inline-block; margin-top: 4px; }

/* Làm mỏng viền bảng */
.queue-next td { background-color: #fafafa; }
.badge { font-weight: 600; padding: 4px 8px; }

.order-reason-inline {
  max-width: 250px;
  margin-top: 4px;
  color: #991b1b;
  font-size: .72rem;
  line-height: 1.35;
  white-space: normal;
}
.order-reason-alert {
  margin-bottom: 1rem;
  padding: .7rem .8rem;
  border: 1px solid;
  border-radius: 4px;
  font-size: .8rem;
  line-height: 1.4;
}
.order-reason-alert strong,
.order-reason-alert span { display: block; }
.order-reason-alert strong { margin-bottom: 3px; }
.order-reason-alert.cancel { background: #fff1f2; color: #991b1b; border-color: #fecdd3; }
.order-reason-alert.failure { background: #fffbeb; color: #92400e; border-color: #fde68a; }
</style>
