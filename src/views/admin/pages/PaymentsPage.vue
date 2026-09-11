<!-- Trang: Quản Lý Xác Nhận Thanh Toán (Online / Offline + Chi tiết + Hóa đơn) -->
<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
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
const paymentImagePlaceholder = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 88 88"><rect width="88" height="88" rx="8" fill="#f7f7f8"/><path d="M25 27h38v34H25z M25 53l12-12 11 11 7-7 8 8" fill="none" stroke="#b5b5bc" stroke-width="2" stroke-linejoin="round"/><circle cx="51" cy="37" r="4" fill="#b5b5bc"/></svg>')}`

function onPaymentImageError(event) {
  event.target.onerror = null
  event.target.src = paymentImagePlaceholder
}

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

const confirmPanel = ref(null)
let previousFocus = null

watch(() => transitionConfirm.open, async (open) => {
  if (open) {
    previousFocus = document.activeElement
    await nextTick()
    confirmPanel.value?.focus()
  } else if (previousFocus?.isConnected) {
    await nextTick()
    previousFocus.focus()
  }
})

function onConfirmKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeTransitionConfirm()
    return
  }
  if (event.key !== 'Tab') return
  const controls = [...(confirmPanel.value?.querySelectorAll('button:not([disabled])') || [])]
  if (!controls.length) {
    event.preventDefault()
    return
  }
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (document.activeElement === confirmPanel.value || (event.shiftKey && document.activeElement === first)) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

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
  <div class="fade-in payments-page">

    <!-- ================= DANH SÁCH ================= -->
    <div v-if="!orderDetail.open">
      <div class="payments-intro">
        <div>
          <p v-if="queueView === 'ALL'" class="payments-intro-description">Tra cứu tất cả đơn hàng, từ mới nhất đến cũ nhất.</p>
          <p v-if="apiErrors.length" class="payments-sync-note" role="status">
            Hàng đợi vẫn hiển thị; một số dữ liệu phụ đang tạm thời chưa đồng bộ.
          </p>
        </div>
        <span class="payments-total"><strong>{{ paymentTotalCount }}</strong> đơn hàng</span>
      </div>

      <div class="admin-surface payments-list-panel">
        <!-- Tabs Online / Offline + Tìm kiếm -->
        <div class="payments-toolbar">
          <div class="payments-toggle-group" role="group" aria-label="Kênh bán hàng">
            <button @click="paymentChannel = 'Online'" type="button" class="btn btn-sm font-medium border px-3"
              :aria-pressed="paymentChannel === 'Online'"
              :class="paymentChannel === 'Online' ? 'btn-dark text-white border-dark' : 'btn-white text-gray-600'">
              Online
              <span class="ml-1 opacity-75" v-text="'(' + countOrdersByChannel('Online') + ')'"></span>
            </button>
            <button @click="paymentChannel = 'Offline'" type="button" class="btn btn-sm font-medium border px-3"
              :aria-pressed="paymentChannel === 'Offline'"
              :class="paymentChannel === 'Offline' ? 'btn-dark text-white border-dark' : 'btn-white text-gray-600'">
              Tại quầy
              <span class="ml-1 opacity-75" v-text="'(' + countOrdersByChannel('Offline') + ')'"></span>
            </button>
          </div>
          <div class="payments-toggle-group payments-scope" role="group" aria-label="Phạm vi đơn hàng">
            <button type="button" class="btn btn-sm border px-3" :aria-pressed="queueView === 'ACTIVE'" :class="queueView === 'ACTIVE' ? 'btn-dark' : 'btn-white text-gray-600'" @click="queueView = 'ACTIVE'">Đang xử lý</button>
            <button type="button" class="btn btn-sm border px-3" :aria-pressed="queueView === 'ALL'" :class="queueView === 'ALL' ? 'btn-dark' : 'btn-white text-gray-600'" @click="queueView = 'ALL'">Tất cả</button>
          </div>
          <div class="payments-search">
            <i class="icon icon-search" aria-hidden="true"></i>
            <input v-model="paymentSearch" type="search" class="sg-input" aria-label="Tìm theo mã đơn hoặc khách hàng" placeholder="Tìm mã đơn / khách hàng...">
          </div>
        </div>

        <!-- Bảng đơn hàng -->
        <div class="queue-summary" role="status">
          <span><strong>{{ displayedOrders.length }}</strong> đơn trong danh sách</span>
          <span><strong>{{ actionableCount }}</strong> đơn có thể xử lý ngay</span>
        </div>

        <div v-if="displayedOrders.length === 0" class="admin-empty">
          <strong>Không có đơn cần xử lý</strong>
          <span>Thử đổi kênh bán, phạm vi hoặc từ khóa tìm kiếm.</span>
        </div>
        <div v-else class="table-responsive payments-table-scroll" tabindex="0" role="region" aria-label="Danh sách đơn hàng, có thể cuộn ngang">
          <table class="table align-middle mb-0 payments-table">
            <thead>
              <tr class="text-gray-600 text-sm uppercase bg-gray-100">
                <th scope="col" style="width:60px;">STT</th>
                <th scope="col">Đơn hàng</th>
                <th scope="col">Phương thức</th>
                <th scope="col">Thanh toán</th>
                <th scope="col">Trạng thái đơn</th>
                <th scope="col" class="text-end">Tổng tiền</th>
                <th scope="col" class="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(ord, index) in displayedOrders" :key="ord.id" :class="{ 'queue-next': index === 0 && queueView === 'ACTIVE' }">
                <td>
                  <span class="queue-no">{{ String(queueNumber(ord, index)).padStart(2, '0') }}</span>
                </td>
                <td>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-bold text-gray-900 text-sm" v-text="getTrackingCode(ord)"></span>
                    <span v-if="ord.address_changed" class="badge bg-red-600 text-white" style="font-size:0.65rem;">Đã đổi địa chỉ</span>
                    <span v-if="ord.stock_issue_status === 'NEEDS_REVIEW'" class="badge bg-warning text-gray-900" style="font-size:0.65rem;">Cần xử lý tồn kho</span>
                  </div>
                  <div class="text-gray-600" style="font-size:0.78rem;">
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
                    <i class="icon icon-info-circle mr-1" aria-hidden="true"></i>
                    <span v-text="getOrderResolutionReason(ord)"></span>
                  </div>
                </td>
                <td class="text-end font-bold text-gray-900 text-sm" v-text="formatPrice(ord.total)"></td>
                <td class="text-end">
                  <button @click="openOrderDetail(ord)" type="button" class="btn btn-sm btn-outline-dark font-medium" :aria-label="'Mở đơn ' + getTrackingCode(ord)">Mở đơn</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ================= CHI TIẾT ================= -->
    <div v-else-if="orderDetail.order" class="payment-detail">
      <!-- Thanh tiêu đề -->
      <div class="payment-detail-head">
        <div class="payment-detail-heading">
          <button @click="closeOrderDetail()" type="button" class="btn btn-sm btn-light border">Quay lại</button>
          <h2>Chi tiết đơn <span class="text-gray-600 font-normal">/</span> <span v-text="getTrackingCode(orderDetail.order)"></span></h2>
        </div>
        <div class="payment-detail-tools">
          <span class="badge px-3 py-2" style="border-radius:3px;font-size:0.75rem;"
            :class="getPaymentStatusPill(orderDetail.order).cls"
            v-text="getPaymentStatusPill(orderDetail.order).label"></span>
          <button @click="printInvoice(orderDetail.order)" type="button" class="btn btn-sm btn-dark font-medium">In hóa đơn</button>
        </div>
      </div>

      <!-- Lịch sử đơn hàng (timeline ngang) -->
      <div class="payment-panel mb-3">
        <h6 class="font-bold text-gray-900 mb-4 text-sm uppercase text-gray-600">Lịch sử đơn hàng</h6>
        <div class="flex justify-between relative flex-nowrap overflow-auto pb-2 payment-history" style="gap:8px;" tabindex="0" role="region" aria-label="Lịch sử đơn hàng, có thể cuộn ngang">
          <div v-for="(step, i) in buildOrderHistory(orderDetail.order)" :key="i" class="text-center relative flex-fill" style="min-width:100px;">
            <div v-if="i > 0" class="absolute" :style="{ height: '2px', top: '18px', left: '-50%', width: '100%', background: step.done ? '#0A0A0A' : '#e5e7eb', zIndex: 0 }"></div>
            <div class="flex items-center justify-center mx-auto relative border"
              :class="step.done ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'"
              style="width:36px;height:36px;z-index:1;border-radius:4px;">
              <i class="icon" :class="step.icon" aria-hidden="true"></i>
            </div>
            <div class="text-sm font-medium mt-2" style="font-size:0.78rem;" :class="step.done ? 'text-gray-900' : 'text-gray-600'" v-text="step.label"></div>
            <div class="text-gray-600" style="font-size:0.7rem;" v-text="step.date ? formatDate(step.date) : '—'"></div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-3">
        <!-- Thông tin đơn hàng -->
        <div class="col-span-12 lg:col-span-8 payment-main-column">
          <div class="payment-panel mb-3">
            <h6 class="font-bold text-gray-900 mb-3 text-sm uppercase text-gray-600">Thông tin đơn hàng</h6>
            <div class="grid grid-cols-12 gap-3 text-sm payment-order-info">
              <div class="col-span-12 md:col-span-6"><span class="text-gray-600 block mb-1">Mã vận đơn</span><span class="font-medium text-gray-900" v-text="getTrackingCode(orderDetail.order)"></span></div>
              <div class="col-span-12 md:col-span-6"><span class="text-gray-600 block mb-1">Mã lấy hàng (shipper)</span><span class="font-medium text-gray-900" v-text="getShipperCode(orderDetail.order)"></span></div>
              <div class="col-span-12 md:col-span-6"><span class="text-gray-600 block mb-1">Kênh bán</span><span class="font-medium text-gray-900" v-text="getOrderChannel(orderDetail.order) === 'Offline' ? 'Tại quầy' : 'Online'"></span></div>
              <div class="col-span-12 md:col-span-6"><span class="text-gray-600 block mb-1">Ngày tạo</span><span class="font-medium text-gray-900" v-text="formatDate(orderDetail.order.date)"></span></div>
              <div class="col-span-12 md:col-span-6"><span class="text-gray-600 block mb-1">Nhân viên xử lý</span><span class="font-medium text-gray-900" v-text="orderDetail.order.handled_by || 'Admin'"></span></div>
              <div class="col-span-12 md:col-span-6"><span class="text-gray-600 block mb-1">Khách hàng</span><span class="font-medium text-gray-900" v-text="orderDetail.order.customer_name || 'Khách lẻ'"></span></div>
              <div class="col-span-12 md:col-span-6"><span class="text-gray-600 block mb-1">Số điện thoại</span><span class="font-medium text-gray-900" v-text="orderDetail.order.customer_phone || '—'"></span></div>
              <div class="col-span-12 md:col-span-6">
                <span class="text-gray-600 block mb-1">Địa chỉ nhận hàng</span>
                <span class="font-medium text-gray-900" v-text="orderDetail.order.customer_address || '—'"></span>
                <span v-if="orderDetail.order.address_changed" class="badge bg-red-600 text-white ml-2">Đã đổi địa chỉ</span>
              </div>
            </div>
          </div>

          <!-- Sản phẩm -->
          <div class="payment-panel">
            <h6 class="font-bold text-gray-900 mb-3 text-sm uppercase text-gray-600">Sản phẩm trong đơn</h6>
            <div v-for="(p, idx) in orderDetail.order.products" :key="idx" class="payment-order-product">
              <img :src="p.image || paymentImagePlaceholder" :alt="p.name" @error="onPaymentImageError">
              <div class="payment-order-product-info">
                <p class="font-medium mb-0 text-gray-900 text-sm" v-text="p.name"></p>
                <p class="text-gray-600 mb-0" style="font-size:0.78rem;"><span v-text="p.color"></span> / Size <span v-text="p.size"></span> · SL: <span v-text="p.quantity"></span></p>
              </div>
              <span class="font-medium text-gray-900 text-sm payment-product-price" v-text="formatPrice(p.price)"></span>
            </div>
            <div class="flex justify-between items-center pt-3 mt-1">
              <span class="text-gray-600 text-sm">Tổng tiền</span>
              <span class="font-extrabold text-lg text-gray-900" v-text="formatPrice(orderDetail.order.total)"></span>
            </div>
          </div>
        </div>

        <!-- Trạng thái & Hành động -->
        <div class="col-span-12 lg:col-span-4 payment-status-column">
          <div class="payment-panel payment-status-panel">
            <h6 class="font-bold text-gray-900 mb-3 text-sm uppercase text-gray-600">Trạng thái</h6>

            <div class="mb-3 pb-3 border-b payment-status-summary">
              <div class="flex justify-between items-center mb-2">
                <span class="text-gray-600 text-sm">Trạng thái đơn</span>
                <span class="badge" style="border-radius:2px;font-size:0.72rem;"
                  :class="getOrderStatusPill(orderDetail.order).cls"
                  v-text="getOrderStatusPill(orderDetail.order).label"></span>
              </div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-gray-600 text-sm">Thanh toán</span>
                <span class="badge" style="border-radius:2px;font-size:0.72rem;"
                  :class="getPaymentStatusPill(orderDetail.order).cls"
                  v-text="getPaymentStatusPill(orderDetail.order).label"></span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600 text-sm">Phương thức</span>
                <span class="badge" style="border-radius:2px;font-size:0.72rem;"
                  :class="getPaymentMethodPill(orderDetail.order.payment_method).cls"
                  v-text="getPaymentMethodPill(orderDetail.order.payment_method).code"></span>
              </div>
            </div>

            <div v-if="getOrderResolutionReason(orderDetail.order)" class="order-reason-alert" :class="isCancelledOrder(orderDetail.order) ? 'cancel' : 'failure'">
              <strong>
                <i class="icon icon-exclamation-triangle mr-1" aria-hidden="true"></i>
                <span v-text="isCancelledOrder(orderDetail.order) ? 'Lý do hủy đơn' : 'Lý do giao thất bại'"></span>
              </strong>
              <span v-text="getOrderResolutionReason(orderDetail.order)"></span>
            </div>

            <div v-if="orderDetail.order.stock_issue_status === 'NEEDS_REVIEW'" class="alert alert-warning py-2 px-3 text-sm mb-3">
              <strong>Cần xử lý tồn kho.</strong>
              <span class="block mt-1">{{ orderDetail.order.stock_issue_reason || 'Kiểm tra lại biến thể trước khi tiếp tục xử lý.' }}</span>
              <span class="block mt-1">Nếu hủy đơn, hệ thống chỉ hoàn kho một lần.</span>
            </div>

            <div class="mb-3 pb-3 border-b">
              <p class="text-gray-600 mb-2" style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">Tiến trình đơn hàng</p>
              <div class="grid gap-2">
                <button v-for="act in getOrderActions(orderDetail.order)" :key="act.key"
                  type="button"
                  @click="requestOrderAction(orderDetail.order, act)"
                  :disabled="act.locked || transitionConfirm.open || transitionConfirm.busy"
                  class="btn btn-sm font-medium"
                  style="border-radius:4px;"
                  :class="act.class"
                  v-text="act.text"></button>
                <div v-if="getOrderActions(orderDetail.order).length === 0" class="text-gray-600 text-sm text-center py-1">Đơn đã hoàn tất hoặc đã hủy.</div>
              </div>
            </div>

            <button @click="printInvoice(orderDetail.order)" type="button" class="btn btn-dark w-full font-medium btn-sm">In hóa đơn</button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="transitionConfirm.open"
        class="payment-confirm-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transition-confirm-title"
        aria-describedby="transition-confirm-description"
        :aria-busy="transitionConfirm.busy"
        @click.self="closeTransitionConfirm"
        @keydown="onConfirmKeydown"
      >
        <div ref="confirmPanel" class="payment-confirm-panel" tabindex="-1">
          <h6 id="transition-confirm-title" class="font-bold text-gray-900 mb-2">Xác nhận chuyển trạng thái</h6>
          <p id="transition-confirm-description" class="text-gray-600 text-sm mb-4" v-text="transitionMessage()"></p>
          <div v-if="transitionConfirm.action?.menu" class="grid gap-2 mb-3">
            <button
              v-for="option in transitionConfirm.action.menu"
              :key="option.key"
              type="button"
              class="btn btn-sm font-medium text-start"
              style="border-radius:4px;"
              :class="option.class"
              :disabled="transitionConfirm.busy"
              @click="chooseFailureResolution(option)"
            >{{ option.text }}</button>
            <div class="flex justify-end mt-1">
              <button type="button" class="btn btn-sm btn-white border border-dark text-gray-900 px-3" :disabled="transitionConfirm.busy" @click="closeTransitionConfirm">Hủy bỏ</button>
            </div>
          </div>
          <div v-if="!transitionConfirm.action?.menu" class="flex justify-end gap-2 payment-confirm-actions">
            <button
              type="button"
              class="btn btn-sm btn-white border border-dark text-gray-900 px-3"
              :disabled="transitionConfirm.busy"
              @click="closeTransitionConfirm"
            >Hủy bỏ</button>
            <button
              type="button"
              class="btn btn-sm btn-dark text-white px-3"
              :disabled="transitionConfirm.busy"
              @click="confirmTransition"
            >
              <span v-if="transitionConfirm.busy" class="sg-spinner sg-spinner sg-spinner-sm mr-1" aria-hidden="true"></span>
              <span v-text="transitionConfirm.busy ? 'Đang cập nhật...' : 'Xác nhận chuyển'"></span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.payments-page,
.payment-detail,
.payment-main-column,
.payment-status-column { min-width: 0; }
.payments-intro { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.payments-intro-description { margin: 0; color: #737373; font-size: 12px; line-height: 1.7; }
.payments-sync-note { margin: 5px 0 0; color: #846018; font-size: 12px; line-height: 1.7; }
.payments-total { display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0; padding: 7px 11px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff; color: #737373; font-size: 11px; }
.payments-total strong { color: #0e0e0e; font-size: 14px; font-variant-numeric: tabular-nums; }
.payments-list-panel { padding: 20px; overflow: hidden; }
.payments-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 18px; }
.payments-toggle-group { display: flex; align-items: center; gap: 7px; min-width: 0; }
.payments-toggle-group .btn { min-height: 38px; white-space: nowrap; }
.payments-scope { margin-left: auto; }
.payments-search { position: relative; flex: 1 1 220px; max-width: 300px; min-width: 0; }
.payments-search > .icon { position: absolute; top: 50%; left: 12px; color: #848489; transform: translateY(-50%); pointer-events: none; }
.payments-search .sg-input { width: 100%; min-width: 0; min-height: 38px; padding-left: 36px; font-size: 12px; }
.payments-table-scroll { max-width: 100%; }
.payments-table { min-width: 980px; }
.payments-table th { font-size: 11px; letter-spacing: .04em; font-weight: 600; }
.payments-table td { border-color: #ededee; }
.payments-table td:nth-child(2) { min-width: 250px; }
.payments-table td:nth-child(6) { white-space: nowrap; font-variant-numeric: tabular-nums; }
.payments-table .badge,
.payment-detail .badge { border-radius: 6px !important; }

.queue-summary { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; background: #f7f7f8; padding: 12px 15px; border-radius: 8px; font-size: 12px; color: #737373; border: 1px solid #ededee; }
.queue-summary > span { display: flex; align-items: center; gap: 6px; }
.queue-summary strong { color: #0e0e0e; font-weight: 650; }
.queue-summary > span:not(:last-child)::after { content: "•"; color: #ccc; margin-left: 10px; }

.queue-no { font-weight: 650; font-size: 15px; font-variant-numeric: tabular-nums; color: #0e0e0e; display: block; }

.queue-next td { background-color: #fafafa; }
.badge { font-weight: 600; padding: 4px 8px; }

.payment-detail-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 20px; }
.payment-detail-heading { display: flex; align-items: center; gap: 12px; min-width: 0; }
.payment-detail-heading h2 { margin: 0; color: #0e0e0e; font-size: 18px; font-weight: 650; line-height: 1.5; overflow-wrap: anywhere; }
.payment-detail-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; }
.payment-panel { min-width: 0; padding: 24px; border: 1px solid #e5e5e5; border-radius: 12px; background: #fff; box-shadow: 0 1px 2px rgb(14 14 14 / 2%); }
.payment-panel h6 { font-size: 11px; font-weight: 600; letter-spacing: .055em; }
.payment-history { isolation: isolate; scrollbar-width: thin; scrollbar-color: #cfcfd2 transparent; overscroll-behavior-x: contain; }
.payment-history > div { flex: 1 0 100px; }
.payment-order-info > div { overflow-wrap: anywhere; font-size: 12px; line-height: 1.7; }
.payment-order-info > div > span:first-child { font-size: 11px; color: #83838a; }
.payment-order-product { display: grid; grid-template-columns: 48px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid #ededee; }
.payment-order-product img { width: 48px; height: 48px; border: 1px solid #ededee; border-radius: 8px; object-fit: cover; background: #f7f7f8; }
.payment-order-product-info { min-width: 0; overflow-wrap: anywhere; }
.payment-order-product-info p:first-child { margin-bottom: 4px; font-size: 12px; }
.payment-product-price { white-space: nowrap; font-size: 12px; font-variant-numeric: tabular-nums; }
.payment-status-summary > div { flex-wrap: wrap; gap: 8px; }
.payment-status-summary > div > span:first-child { font-size: 12px; }
.payment-status-panel .btn { white-space: normal; overflow-wrap: anywhere; }

.payment-confirm-overlay { position: fixed; inset: 0; z-index: 2050; display: flex; align-items: center; justify-content: center; height: 100dvh; padding: 20px; overflow-y: auto; background: rgb(14 14 14 / 55%); backdrop-filter: blur(3px); color: #0e0e0e; font-family: 'Be Vietnam Pro', system-ui, sans-serif; }
.payment-confirm-panel { width: 100%; max-width: 460px; max-height: calc(100dvh - 40px); overflow-y: auto; padding: 26px; border: 1px solid #e5e5e5; border-radius: 12px; background: #fff; box-shadow: 0 20px 70px rgb(14 14 14 / 20%); }
.payment-confirm-panel:focus { outline: none; }
.payment-confirm-panel h6 { font-size: 17px; line-height: 1.5; }
.payment-confirm-panel p { font-size: 13px; line-height: 1.8; }
.payment-confirm-panel .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 0; min-height: 38px; padding: 9px 13px; border: 1px solid #e5e5e5; border-radius: 8px !important; background: #fff; color: #404040; font: 600 12px/1.5 'Be Vietnam Pro', system-ui, sans-serif; white-space: normal; cursor: pointer; }
.payment-confirm-panel .btn.text-start { justify-content: flex-start; text-align: left; }
.payment-confirm-panel .btn:hover:not(:disabled) { background: #f7f7f8; border-color: #bfbfc4; }
.payment-confirm-panel :is(.btn-dark, .btn-primary) { background: #0e0e0e; border-color: #0e0e0e; color: #fff; }
.payment-confirm-panel :is(.btn-dark, .btn-primary):hover:not(:disabled) { background: #303030; border-color: #303030; }
.payment-confirm-panel .btn-outline-dark { border-color: #0e0e0e; color: #0e0e0e; }
.payment-confirm-panel .btn-outline-danger { border-color: #f1bac2; color: #d4001a; }
.payment-confirm-panel .btn-outline-danger:hover:not(:disabled) { background: #fff1f2; border-color: #d4001a; }
.payment-confirm-panel .btn:disabled { cursor: wait; opacity: .5; }
.payment-confirm-panel .btn:focus-visible { outline: 2px solid #d4001a; outline-offset: 3px; }
.payment-confirm-panel .btn-dark .sg-spinner { border-color: rgb(255 255 255 / 35%); border-top-color: #fff; }

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
  border-radius: 8px;
  font-size: .8rem;
  line-height: 1.4;
}
.order-reason-alert strong,
.order-reason-alert span { display: block; }
.order-reason-alert strong { margin-bottom: 3px; }
.order-reason-alert.cancel { background: #fff1f2; color: #991b1b; border-color: #fecdd3; }
.order-reason-alert.failure { background: #fffbeb; color: #92400e; border-color: #fde68a; }

@media (max-width: 1100px) {
  .payments-search { flex-basis: 100%; max-width: none; }
  .payment-panel { padding: 20px; }
}

@media (max-width: 640px) {
  .payments-intro { align-items: flex-start; gap: 10px; }
  .payments-intro-description { font-size: 11px; }
  .payments-total { gap: 5px; padding: 6px 8px; font-size: 10px; }
  .payments-total strong { font-size: 12px; }
  .payments-list-panel { padding: 12px; }
  .payments-toolbar { gap: 10px; margin-bottom: 12px; }
  .payments-toggle-group { width: 100%; gap: 7px; }
  .payments-toggle-group .btn { flex: 1 1 0; min-width: 0; padding-inline: 8px; }
  .payments-scope { margin-left: 0; }
  .payments-search { flex-basis: 100%; }
  .queue-summary { gap: 7px; padding: 11px 12px; font-size: 11px; }
  .queue-summary > span { width: 100%; }
  .queue-summary > span:not(:last-child)::after { content: none; }
  .payment-detail-heading { align-items: flex-start; gap: 10px; }
  .payment-detail-heading h2 { font-size: 15px; }
  .payment-detail-tools { width: 100%; justify-content: space-between; }
  .payment-panel { padding: 16px; }
  .payment-order-product { grid-template-columns: 44px minmax(0, 1fr); gap: 7px 10px; }
  .payment-order-product img { width: 44px; height: 44px; grid-row: span 2; }
  .payment-product-price { grid-column: 2; }
  .payment-confirm-overlay { padding: 14px; }
  .payment-confirm-panel { max-height: calc(100dvh - 28px); padding: 20px; }
  .payment-confirm-actions { flex-wrap: wrap; }
  .payment-confirm-actions .btn { flex: 1 1 auto; }
}
</style>
