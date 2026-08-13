<!-- Trang: Trả Hàng / Đổi Trả -->
<script setup>
import {
  returnSearchCode, returnFoundOrder, returnItems, returnNote,
  searchReturnOrder, submitReturn, resetReturnForm, returnRefundTotal, returnSelectedCount,
  returnFilter, filteredReturns, getReturnBadgeClass, processReturn,
  formatPrice, notify,
} from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <!-- Ô tra cứu hóa đơn -->
    <div class="bg-white p-4 mb-4" style="border-radius:4px;">
      <h5 class="fw-bold mb-1 text-dark"><i class="bi bi-arrow-return-left me-2"></i>Trả hàng</h5>
      <p class="text-secondary small mb-3">Tra cứu theo mã vận đơn để tạo yêu cầu trả / hoàn tiền. Chỉ áp dụng với đơn đã <b>giao hàng thành công</b>.</p>
      <div class="d-flex flex-wrap align-items-center gap-2">
        <label class="fw-medium text-dark mb-0">Mã vận đơn:</label>
        <div class="position-relative flex-grow-1" style="min-width:240px;max-width:440px;">
          <i class="bi bi-search position-absolute text-secondary" style="left:12px;top:50%;transform:translateY(-50%);"></i>
          <input v-model="returnSearchCode" @keyup.enter="searchReturnOrder()" type="text" class="form-control ps-4" style="border-radius:4px;" placeholder="VD: SGVN..., HD13 hoặc mã đơn">
        </div>
        <button @click="searchReturnOrder()" class="btn btn-dark fw-bold px-3" style="border-radius:4px;"><i class="bi bi-search me-1"></i> Tìm kiếm</button>
        <button @click="notify('Đưa mã vào ô rồi bấm Tìm kiếm', 'info')" class="btn btn-outline-dark fw-bold px-3" style="border-radius:4px;"><i class="bi bi-upc-scan me-1"></i> Quét mã</button>
      </div>
    </div>

    <!-- Chưa tìm thấy: trạng thái rỗng -->
    <div v-if="!returnFoundOrder" class="bg-white p-5 text-center mb-4" style="border-radius:4px;">
      <i class="bi bi-box-seam text-secondary" style="font-size:4rem;opacity:0.4;"></i>
      <h6 class="fw-bold text-secondary mt-3 mb-1">TRẢ HÀNG</h6>
      <p class="text-secondary small mb-0">Nhập mã vận đơn phía trên để bắt đầu. Chỉ đơn đã giao thành công mới được trả hàng.</p>
    </div>

    <!-- Đã tìm thấy đơn -->
    <div v-else class="row g-4 mb-4">
      <div class="col-lg-8">
        <div class="bg-white rounded-1 shadow-sm p-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-list-check me-2"></i>Danh sách sản phẩm trả</h6>
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
          <div class="d-flex justify-content-between mb-2"><span class="text-secondary">Số SP chọn trả</span><span class="fw-medium" v-text="returnSelectedCount + ' sản phẩm'"></span></div>
          <div class="d-flex justify-content-between align-items-center mb-3"><span class="fw-bold text-dark">Số tiền hoàn trả</span><h5 class="fw-bolder mb-0 text-dark" v-text="formatPrice(returnRefundTotal)"></h5></div>
          <button @click="submitReturn()" :disabled="returnSelectedCount === 0" class="btn btn-dark w-100 rounded-2 fw-bold py-2"><i class="bi bi-arrow-return-left me-2"></i>Trả hàng</button>
          <button @click="resetReturnForm()" class="btn btn-light border w-100 rounded-2 mt-2">Hủy</button>
        </div>
      </div>
    </div>

    <!-- Danh sách yêu cầu trả hàng (quản lý) -->
    <div class="bg-white p-4" style="border-radius:4px;">
      <h6 class="fw-bold mb-3 text-dark">Yêu cầu trả hàng</h6>
      <div class="d-flex flex-wrap gap-2 mb-3">
        <button v-for="s in ['Tất cả', 'Chờ xử lý', 'Đã duyệt', 'Từ chối', 'Hoàn tất']" :key="s" @click="returnFilter = s" class="btn btn-sm fw-medium border px-3" style="border-radius:4px;" :class="returnFilter === s ? 'btn-dark text-white border-dark' : 'btn-white text-secondary'" v-text="s"></button>
      </div>
      <div v-if="filteredReturns.length === 0" class="text-center text-secondary py-5"><i class="bi bi-arrow-return-left fs-1 d-block mb-2 opacity-50"></i>Không có yêu cầu trả hàng nào.</div>
      <div v-else class="table-responsive">
        <table class="table align-middle mb-0">
          <thead><tr class="text-secondary small text-uppercase"><th>Mã</th><th>Đơn Gốc</th><th>Loại</th><th>Lý Do</th><th class="text-end">Hoàn Tiền</th><th>Trạng Thái</th><th class="text-end">Hành Động</th></tr></thead>
          <tbody>
            <tr v-for="r in filteredReturns" :key="r.id">
              <td class="fw-bold text-dark" v-text="'#' + r.id"></td>
              <td v-text="'#' + r.order_id"></td>
              <td v-text="r.return_type"></td>
              <td class="small text-secondary" style="max-width:220px;" v-text="r.reason"></td>
              <td class="text-end fw-medium" v-text="formatPrice(r.refund_amount)"></td>
              <td><span class="badge" style="border-radius:2px;font-size:0.72rem;" :class="getReturnBadgeClass(r.status)" v-text="r.status"></span></td>
              <td class="text-end">
                <div v-if="r.status === 'Chờ xử lý'" class="d-flex gap-1 justify-content-end">
                  <button @click="processReturn(r, 'Đã duyệt')" class="btn btn-sm btn-dark" style="border-radius:4px;">Duyệt</button>
                  <button @click="processReturn(r, 'Từ chối')" class="btn btn-sm btn-light border text-danger" style="border-radius:4px;">Từ chối</button>
                </div>
                <button v-else-if="r.status === 'Đã duyệt'" @click="processReturn(r, 'Hoàn tất')" class="btn btn-sm btn-dark" style="border-radius:4px;">Hoàn tất</button>
                <span v-else class="text-secondary small">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
