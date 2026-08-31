<!-- Trang: Trả Hàng / Đổi Trả -->
<script setup>
import { computed } from 'vue'
import {
  returnSearchCode, returnFoundOrder, returnItems, returnNote,
  searchReturnOrder, submitReturn, resetReturnForm, returnRefundTotal, returnSelectedCount,
  returnFilter, filteredReturns, getReturnBadgeClass, processReturn,
  formatPrice, getReturnTypeLabel, getPaymentMethodPill,
} from '../adminStore'

const returnStatuses = ['Tất cả', 'Chờ xử lý', 'Đã tiếp nhận', 'Đang kiểm tra', 'Chấp nhận hoàn tiền', 'Đã hoàn tiền', 'Sự cố', 'Từ chối', 'Hủy', 'Đã hoàn tất']
const isNotReceivedOrder = computed(() => ['Đang vận chuyển', 'Giao hàng thất bại', 'Về kho'].includes(returnFoundOrder.value?.status))
const canSubmitFoundReturn = computed(() => isNotReceivedOrder.value || returnSelectedCount.value > 0)
const isBankPaymentOrder = computed(() => getPaymentMethodPill(returnFoundOrder.value?.payment_method).code === 'Chuyển khoản')
const notReceivedOrderRefundTotal = computed(() => returnItems.value.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.max) || 0), 0))
const displayedRefundTotal = computed(() => {
  if (!isNotReceivedOrder.value) return returnRefundTotal.value
  return isBankPaymentOrder.value ? notReceivedOrderRefundTotal.value : 0
})

function conditionLabel(request) {
  if (getReturnTypeLabel(request?.return_type) === 'Chưa nhận được hàng') return 'Không áp dụng (chưa nhận hàng)'
  const conditions = (request?.details || []).map((detail) => String(detail.Condition ?? detail.condition ?? '').toUpperCase())
  if (conditions.includes('DAMAGED')) return 'Hư hỏng / tai nạn'
  if (conditions.includes('OPENED')) return 'Đã mở / đã thử'
  if (conditions.includes('UNOPENED')) return 'Còn nguyên'
  return 'Chưa phân loại'
}

function refundAmountLabel(request) {
  const notReceived = getReturnTypeLabel(request?.return_type) === 'Chưa nhận được hàng'
  const bank = getPaymentMethodPill(request?.payment_method).code === 'Chuyển khoản'
  return formatPrice(notReceived && !bank ? 0 : request?.refund_amount)
}
</script>

<template>
  <div class="fade-in">
    <!-- Ô tra cứu hóa đơn -->
    <div class="bg-white p-4 mb-4" style="border-radius:4px;">
      <h5 class="fw-bold mb-1 text-dark">Trả hàng</h5>
      <p class="text-secondary small mb-3">Nhập mã đơn hoặc mã vận đơn rồi bấm <b>Tìm kiếm</b> (có thể nhấn Enter). Đơn đã giao có thể trả sản phẩm; đơn đang giao, giao thất bại hoặc đã về kho có thể báo <b>chưa nhận được hàng</b>.</p>
      <div class="d-flex flex-wrap align-items-center gap-2">
        <label class="fw-medium text-dark mb-0">Mã đơn / mã vận đơn:</label>
        <div class="position-relative flex-grow-1" style="min-width:240px;max-width:440px;">
          <input v-model="returnSearchCode" @keyup.enter="searchReturnOrder()" type="text" class="form-control ps-4" style="border-radius:4px;" placeholder="VD: SGVN..., HD13 hoặc mã đơn">
        </div>
        <button @click="searchReturnOrder()" class="btn btn-dark fw-bold px-3" style="border-radius:4px;">Tìm kiếm</button>
      </div>
    </div>

    <!-- Chưa tìm thấy: trạng thái rỗng -->
    <div v-if="!returnFoundOrder" class="bg-white p-5 text-center mb-4" style="border-radius:4px;">
      <h6 class="fw-bold text-secondary mt-3 mb-1">TRẢ HÀNG</h6>
      <p class="text-secondary small mb-0">Nhập mã đơn hoặc mã vận đơn phía trên để bắt đầu. Đơn đã giao có thể trả sản phẩm; đơn đang giao, giao thất bại hoặc đã về kho có thể báo chưa nhận hàng.</p>
    </div>

    <!-- Đã tìm thấy đơn -->
    <div v-else class="row g-4 mb-4">
      <div class="col-lg-8">
        <div class="bg-white rounded-1 shadow-sm p-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="fw-bold mb-0 text-dark">{{ isNotReceivedOrder ? 'Chi tiết kiện hàng cần kiểm tra' : 'Danh sách sản phẩm trả' }}</h6>
            <span class="badge rounded-1 bg-light text-secondary border" v-text="'Đơn #' + returnFoundOrder.id"></span>
          </div>
          <div class="table-responsive">
            <table class="table align-middle mb-0">
              <thead><tr class="text-secondary small text-uppercase"><th>Sản phẩm</th><th class="text-center">SL có thể trả</th><th class="text-center" style="width:120px;">SL trả</th><th class="text-end">Đơn giá</th><th class="text-end">Thành tiền</th></tr></thead>
              <tbody>
                <tr v-if="returnItems.length === 0"><td colspan="5" class="text-center text-secondary py-4">Chưa chọn sản phẩm trả</td></tr>
                <tr v-for="it in returnItems" :key="it.idx">
                  <td>
                    <div class="fw-medium text-dark small" v-text="it.name"></div>
                    <div class="text-secondary" style="font-size:0.75rem;" v-text="[it.color, it.size].filter(Boolean).join(' · ')"></div>
                  </td>
                  <td class="text-center small" v-text="it.max"></td>
                  <td class="text-center"><input type="number" min="0" :max="it.max" v-model.number="it.return_qty" class="form-control form-control-sm text-center rounded-2"></td>
                  <td class="text-end small" v-text="formatPrice(it.price)"></td>
                  <td class="text-end fw-medium" v-text="formatPrice(it.price * (Number(it.return_qty) || 0))"></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="mt-3">
            <label class="form-label small fw-medium">Ghi chú</label>
            <textarea v-model="returnNote" rows="3" class="form-control rounded-2" placeholder="Lý do trả hàng, tình trạng sản phẩm..."></textarea>
          </div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="bg-white rounded-1 shadow-sm p-4">
          <h6 class="fw-bold text-center mb-3 text-dark">Thông tin hoàn trả</h6>
          <div class="small mb-2"><i class="bi bi-person me-2 text-secondary"></i><span class="text-secondary">Khách hàng:</span> <span class="fw-medium" v-text="returnFoundOrder.customer_name || '—'"></span></div>
          <div class="small mb-2"><i class="bi bi-telephone me-2 text-secondary"></i><span class="text-secondary">SĐT:</span> <span class="fw-medium" v-text="returnFoundOrder.customer_phone || '—'"></span></div>
          <div class="small mb-3"><i class="bi bi-geo-alt me-2 text-secondary"></i><span class="text-secondary">Địa chỉ:</span> <span class="fw-medium" v-text="returnFoundOrder.customer_address || '—'"></span></div>
          <hr>
          <div class="d-flex justify-content-between mb-2"><span class="text-secondary">Tổng tiền đơn</span><span class="fw-medium" v-text="formatPrice(returnFoundOrder.total)"></span></div>
          <div class="d-flex justify-content-between mb-2"><span class="text-secondary">Thanh toán</span><span class="fw-medium" v-text="getPaymentMethodPill(returnFoundOrder.payment_method).code"></span></div>
          <div class="d-flex justify-content-between mb-2"><span class="text-secondary">Số SP chọn trả</span><span class="fw-medium" v-text="returnSelectedCount + ' sản phẩm'"></span></div>
          <div class="d-flex justify-content-between align-items-center mb-3"><span class="fw-bold text-dark">{{ isNotReceivedOrder && !isBankPaymentOrder ? 'Không hoàn tiền COD' : 'Số tiền hoàn trả' }}</span><h5 class="fw-bolder mb-0 text-dark" v-text="formatPrice(displayedRefundTotal)"></h5></div>
          <div v-if="isNotReceivedOrder" class="small text-secondary mb-2">Không cần chọn từng sản phẩm; nếu để trống, hệ thống sẽ ghi nhận toàn bộ kiện hàng chưa nhận. {{ isBankPaymentOrder ? 'Đơn chuyển khoản đủ điều kiện sẽ hoàn về Ví ShoeGroup sau khi xử lý.' : 'Đơn COD chưa thu tiền nên không phát sinh khoản hoàn.' }}</div>
          <button @click="submitReturn()" :disabled="!canSubmitFoundReturn" class="btn btn-dark w-100 rounded-2 fw-bold py-2">{{ isNotReceivedOrder ? 'Báo chưa nhận được hàng' : 'Tạo yêu cầu trả hàng' }}</button>
          <button @click="resetReturnForm()" class="btn btn-light border w-100 rounded-2 mt-2">Hủy</button>
        </div>
      </div>
    </div>

    <!-- Danh sách yêu cầu trả hàng (quản lý) -->
    <div class="bg-white p-4" style="border-radius:4px;">
      <h6 class="fw-bold mb-3 text-dark">Yêu cầu trả hàng</h6>
      <div class="d-flex flex-wrap gap-2 mb-3">
        <button v-for="s in returnStatuses" :key="s" @click="returnFilter = s" class="btn btn-sm fw-medium border px-3" style="border-radius:4px;" :class="returnFilter === s ? 'btn-dark text-white border-dark' : 'btn-white text-secondary'" v-text="s"></button>
      </div>
      <div v-if="filteredReturns.length === 0" class="text-center text-secondary py-5">Không có yêu cầu trả hàng nào.</div>
      <div v-else class="table-responsive">
        <table class="table align-middle mb-0">
          <thead><tr class="text-secondary small text-uppercase"><th>Mã</th><th>Đơn Gốc</th><th>Loại</th><th>Lý Do</th><th>Tình trạng</th><th class="text-end">Hoàn Tiền</th><th>Trạng Thái</th><th class="text-end">Hành Động</th></tr></thead>
          <tbody>
            <tr v-for="r in filteredReturns" :key="r.id">
              <td class="fw-bold text-dark" v-text="'#' + r.id"></td>
              <td v-text="'#' + r.order_id"></td>
              <td v-text="getReturnTypeLabel(r.return_type)"></td>
              <td class="small text-secondary" style="max-width:220px;" v-text="r.reason"></td>
              <td>
                <span class="small fw-medium" v-text="conditionLabel(r)"></span>
                <span v-if="r.restocked_at" class="d-block text-secondary" style="font-size:0.7rem;">Đã xử lý kho</span>
              </td>
              <td class="text-end fw-medium" v-text="refundAmountLabel(r)"></td>
              <td><span class="badge" style="border-radius:2px;font-size:0.72rem;" :class="getReturnBadgeClass(r.status)" v-text="r.status"></span></td>
              <td class="text-end">
                <div v-if="r.status === 'Chờ xử lý'" class="d-flex gap-1 justify-content-end">
                  <button @click="processReturn(r, 'Đã tiếp nhận')" class="btn btn-sm btn-dark" style="border-radius:4px;">Tiếp nhận</button>
                  <button @click="processReturn(r, 'Từ chối')" class="btn btn-sm btn-light border text-danger" style="border-radius:4px;">Từ chối</button>
                </div>
                <div v-else-if="r.status === 'Đã tiếp nhận'" class="d-flex gap-1 justify-content-end">
                  <button @click="processReturn(r, 'Đang kiểm tra')" class="btn btn-sm btn-dark" style="border-radius:4px;">Bắt đầu kiểm tra</button>
                  <button @click="processReturn(r, 'Sự cố', { inspection_note: 'Cần bổ sung bằng chứng hoặc kiện hàng gặp sự cố.' })" class="btn btn-sm btn-light border" style="border-radius:4px;">Ghi nhận sự cố</button>
                </div>
                <div v-else-if="r.status === 'Đang kiểm tra'" class="d-flex gap-1 justify-content-end">
                  <button @click="processReturn(r, 'Chấp nhận hoàn tiền')" class="btn btn-sm btn-dark" style="border-radius:4px;">Chấp nhận hoàn</button>
                  <button @click="processReturn(r, 'Từ chối')" class="btn btn-sm btn-light border text-danger" style="border-radius:4px;">Từ chối</button>
                </div>
                <div v-else-if="r.status === 'Sự cố'" class="d-flex gap-1 justify-content-end">
                  <button @click="processReturn(r, 'Đang kiểm tra')" class="btn btn-sm btn-dark" style="border-radius:4px;">Kiểm tra lại</button>
                  <button @click="processReturn(r, 'Từ chối')" class="btn btn-sm btn-light border text-danger" style="border-radius:4px;">Từ chối</button>
                </div>
                <button v-else-if="r.status === 'Chấp nhận hoàn tiền'" @click="processReturn(r, 'Đã hoàn tiền')" class="btn btn-sm btn-dark" style="border-radius:4px;">Xác nhận hoàn tiền</button>
                <span v-else class="text-secondary small">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-white, .admin-surface { border: 1px solid #e5e7eb; box-shadow: 0 8px 24px rgba(15, 23, 42, .04); }
.rounded-1, .rounded-2, .btn, .form-control, textarea { border-radius: 3px !important; }
table th { font-size: .72rem; letter-spacing: .04em; font-weight: 700; }
table td { border-color: #edf0f2; }
</style>
