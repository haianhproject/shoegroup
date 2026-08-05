<!-- Trang: Bán Hàng Tại Quầy (POS) -->
<script setup>
import { ref } from 'vue'
import {
  activePosOrder, resetPosOrder,
  posPayModal, confirmPosPaid, cancelPosPay,
  posSearch, posVariants, addToCart, removeCartItem,
  posSubtotal, posDiscountAmount, posGrandTotal,
  posCouponList, applyPosCoupon, clearPosCoupon,
  posCustomerSearch, posCustomerResults, pickPosCustomer, savePosCustomer,
  checkoutPos, formatPrice,
} from '../adminStore'

const qtyInputs = ref({})
const savingCustomer = ref(false)
function addWithQty(v) {
  const n = Number(qtyInputs.value[v.id]) || 1
  addToCart(v, n)
  qtyInputs.value[v.id] = 1
}
</script>

<template>
  <div class="fade-in">
    <div class="row g-4">
      <!-- CỘT TRÁI -->
      <div class="col-lg-7">
        <!-- Khách hàng -->
        <div class="bg-white rounded-4 shadow-sm p-4 mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-person-circle me-2"></i>Khách hàng</h6>
            
          </div>
          <div class="d-flex gap-2 mb-3">
            <button @click="activePosOrder.customer_type = 'Có tài khoản'" class="btn btn-sm rounded-pill px-3 border" :class="activePosOrder.customer_type === 'Có tài khoản' ? 'btn-dark text-white border-dark' : 'btn-white text-secondary'">Có tài khoản</button>
            <button @click="activePosOrder.customer_type = 'Khách lẻ'" class="btn btn-sm rounded-pill px-3 border" :class="activePosOrder.customer_type === 'Khách lẻ' ? 'btn-dark text-white border-dark' : 'btn-white text-secondary'">Khách lẻ</button>
          </div>

          <!-- Khách lẻ: nút "Lưu thông tin" nằm NGAY BÊN DƯỚI trong khung khách lẻ -->
          <div v-if="activePosOrder.customer_type === 'Khách lẻ'" class="row g-3">
            <div class="col-md-6"><label class="form-label small fw-medium text-uppercase text-secondary">Tên khách</label><input v-model="activePosOrder.customer_name" type="text" class="form-control rounded-3" placeholder="Họ tên khách hàng"></div>
            <div class="col-md-6"><label class="form-label small fw-medium text-uppercase text-secondary">Số điện thoại</label><input v-model="activePosOrder.customer_phone" type="text" class="form-control rounded-3" placeholder="0901 234 567"></div>
            <div class="col-12"><label class="form-label small fw-medium text-uppercase text-secondary">Ghi chú</label><textarea v-model="activePosOrder.customer_note" rows="2" class="form-control rounded-3" placeholder="Ghi chú đơn hàng..."></textarea></div>
            <div class="col-12 d-flex justify-content-end align-items-center gap-2 pt-1 border-top">
              <span class="text-secondary small me-auto">Lưu khách này vào trang Khách hàng (CRM)</span>
              <button @click="savePosCustomer()" :disabled="savingCustomer" class="btn btn-sm btn-dark rounded-pill px-3">
                <i class="bi bi-save me-1"></i>Lưu thông tin
              </button>
            </div>
          </div>

          <!-- Có tài khoản: chỉ hiện danh sách KHI ĐÃ TÌM KIẾM -->
          <div v-else>
            <label class="form-label small fw-medium text-uppercase text-secondary">Tìm khách hàng</label>
            <div class="position-relative mb-2">
              <i class="bi bi-search position-absolute text-secondary" style="left:12px;top:50%;transform:translateY(-50%);"></i>
              <input v-model="posCustomerSearch" type="text" class="form-control rounded-3 ps-4" placeholder="Nhập tên hoặc SĐT để tìm...">
            </div>
            <!-- Chưa gõ gì: ẩn hoàn toàn danh sách khách hàng -->
            <p v-if="!posCustomerSearch.trim()" class="text-secondary small fst-italic mb-0">
              Nhập từ khóa để hiển thị danh sách khách hàng có tên gần giống.
            </p>
            <template v-else>
              <!-- Khung cuộn cao vừa đủ 3 khách hàng gần nhất -->
              <div class="border rounded-3" style="max-height:159px;overflow-y:auto;">
                <div v-if="posCustomerResults.length === 0" class="text-center text-secondary small py-3">Không có khách phù hợp.</div>
                <button v-for="c in posCustomerResults" :key="c.id" @click="pickPosCustomer(c)" class="btn w-100 text-start d-flex align-items-center gap-2 border-0 border-bottom rounded-0 py-2" style="height:53px;" :class="String(activePosOrder.customer_id) === String(c.id) ? 'bg-light-gray' : 'bg-white'">
                  <span class="rounded-circle bg-light-gray d-inline-flex align-items-center justify-content-center flex-shrink-0" style="width:34px;height:34px;"><i class="bi bi-person text-secondary"></i></span>
                  <span class="flex-grow-1 overflow-hidden">
                    <span class="d-block small fw-medium text-dark text-truncate" v-text="c.name"></span>
                    <span class="d-block text-secondary text-truncate" style="font-size:0.72rem;" v-text="c.phone || '—'"></span>
                  </span>
                  <i v-if="String(activePosOrder.customer_id) === String(c.id)" class="bi bi-check-circle-fill text-dark"></i>
                </button>
              </div>
              <p v-if="posCustomerResults.length > 3" class="text-secondary mb-0 mt-1" style="font-size:0.72rem;">
                Cuộn để xem thêm (<span v-text="posCustomerResults.length"></span> kết quả)
              </p>
            </template>
          </div>
        </div>

        <!-- Sản phẩm -->
        <div class="bg-white rounded-4 shadow-sm p-4">
          <h6 class="fw-bold mb-3 text-dark"><i class="bi bi-box-seam me-2"></i>Sản phẩm</h6>
          <div class="position-relative mb-3">
            <i class="bi bi-search position-absolute text-secondary" style="left:12px;top:50%;transform:translateY(-50%);"></i>
            <input v-model="posSearch" type="text" class="form-control rounded-3 ps-4" placeholder="Tìm theo tên, mã, màu, size...">
          </div>
          <div class="row g-3" style="max-height:52vh;overflow:auto;">
            <div v-if="posVariants.length === 0" class="text-center text-secondary py-4 small">Không tìm thấy sản phẩm.</div>
            <div v-for="v in posVariants" :key="v.id" class="col-6 col-md-4">
              <div class="border rounded-3 p-2 h-100 d-flex flex-column">
                <div class="position-relative mb-2">
                  <img :src="v.image || 'https://via.placeholder.com/160'" class="rounded-2 w-100" style="height:96px;object-fit:cover;" @error="$event.target.src='https://via.placeholder.com/160'">
                  <span class="rounded-circle border position-absolute" :style="{ width:'16px', height:'16px', bottom:'6px', right:'6px', background: v.color_hex || '#d1d5db' }"></span>
                </div>
                <p class="small fw-medium mb-0 text-dark text-truncate" v-text="v.product_name"></p>
                <p class="text-secondary mb-1 text-truncate" style="font-size:0.72rem;" v-text="[v.color, v.size, v.sku].filter(Boolean).join(' · ')"></p>
                <p class="fw-bold text-dark mb-1 small" v-text="formatPrice(v.price)"></p>
                <p class="text-secondary mb-2" style="font-size:0.72rem;">Tồn kho: <span v-text="v.stock"></span></p>
                <div class="d-flex gap-1 mt-auto">
                  <input type="number" min="1" v-model.number="qtyInputs[v.id]" class="form-control form-control-sm text-center rounded-3" style="width:52px;" placeholder="1">
                  <button @click="addWithQty(v)" :disabled="v.stock <= 0" class="btn btn-sm btn-dark rounded-3 flex-grow-1"><i class="bi bi-plus-lg"></i> Thêm</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CỘT PHẢI -->
      <div class="col-lg-5">
        <!-- Đơn hiện tại -->
        <div class="bg-white rounded-4 shadow-sm p-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-receipt me-2"></i>Đơn hiện tại</h6>
            <div class="d-flex align-items-center gap-2">
              <span class="badge rounded-pill bg-light text-secondary border" v-text="'#' + activePosOrder.code"></span>
              <button @click="resetPosOrder()" class="btn btn-sm btn-white border rounded-pill px-3" title="Làm mới đơn">
                <i class="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>
          </div>
          <div class="row g-2 mb-3">
            <div class="col-4"><div class="bg-light-gray rounded-3 p-2"><div class="text-secondary text-uppercase" style="font-size:0.62rem;">Khách hàng</div><div class="small fw-medium text-truncate" v-text="activePosOrder.customer_name || 'Khách lẻ'"></div></div></div>
            <div class="col-4"><div class="bg-light-gray rounded-3 p-2"><div class="text-secondary text-uppercase" style="font-size:0.62rem;">SĐT</div><div class="small fw-medium text-truncate" v-text="activePosOrder.customer_phone || '—'"></div></div></div>
            <div class="col-4"><div class="bg-light-gray rounded-3 p-2"><div class="text-secondary text-uppercase" style="font-size:0.62rem;">Loại đơn</div><div class="small fw-medium">OFFLINE</div></div></div>
          </div>

          <div class="text-secondary text-uppercase mb-2" style="font-size:0.68rem;">Sản phẩm trong đơn</div>
          <div v-if="activePosOrder.cart.length === 0" class="text-center text-secondary small py-3 border rounded-3 mb-3">Chưa có sản phẩm trong đơn</div>
          <div v-else class="mb-3" style="max-height:200px;overflow:auto;">
            <div v-for="(c, i) in activePosOrder.cart" :key="i" class="d-flex align-items-center gap-2 py-2 border-bottom">
              <span class="rounded-circle border d-inline-block" :style="{ width:'14px', height:'14px', background: c.color_hex || '#d1d5db' }"></span>
              <div class="flex-grow-1">
                <p class="small fw-medium mb-0 text-dark text-truncate" v-text="c.name"></p>
                <p class="text-secondary mb-0" style="font-size:0.72rem;" v-text="[c.color, c.size].filter(Boolean).join(' · ') + ' · ' + formatPrice(c.price)"></p>
              </div>
              <input type="number" min="1" v-model.number="c.quantity" class="form-control form-control-sm text-center rounded-3" style="width:56px;">
              <button @click="removeCartItem(i)" class="btn btn-sm btn-link text-danger p-0"><i class="bi bi-trash"></i></button>
            </div>
          </div>

          <!-- Ưu đãi -->
          <div class="text-secondary text-uppercase mb-2" style="font-size:0.68rem;">Ưu đãi</div>
          <div class="d-flex gap-2 mb-3">
            <select v-model="activePosOrder.coupon_code" class="form-select form-select-sm rounded-3">
              <option value="">Chọn ưu đãi có sẵn...</option>
              <option v-for="d in posCouponList" :key="d.id" :value="d.code" v-text="d.code + ' — ' + (d.name || (d.discount_type === 'Cố định' ? formatPrice(d.value) : d.value + '%'))"></option>
            </select>
            <button @click="applyPosCoupon()" class="btn btn-sm btn-dark rounded-3">Áp dụng</button>
            <button @click="clearPosCoupon()" class="btn btn-sm btn-light border rounded-3">Bỏ</button>
          </div>

          <!-- Tổng -->
          <div class="d-flex justify-content-between mb-1 small"><span class="text-secondary">Tạm tính</span><span class="fw-medium" v-text="formatPrice(posSubtotal)"></span></div>
          <div class="d-flex justify-content-between mb-2 small"><span class="text-secondary">Giảm giá</span><span class="fw-medium text-danger" v-text="'- ' + formatPrice(posDiscountAmount)"></span></div>
          <div class="d-flex justify-content-between align-items-center mb-3"><span class="fw-bold text-dark">Tổng thanh toán</span><h5 class="fw-bolder mb-0 text-dark" v-text="formatPrice(posGrandTotal)"></h5></div>

          <!-- Thanh toán -->
          <div class="text-secondary text-uppercase mb-2" style="font-size:0.68rem;">Phương thức thanh toán</div>
          <div class="row g-2 mb-3">
            <div class="col-6"><button @click="activePosOrder.payment_method = 'Tiền mặt'" class="btn w-100 rounded-3 border py-2" :class="activePosOrder.payment_method === 'Tiền mặt' ? 'btn-dark text-white border-dark' : 'btn-white text-secondary'"><i class="bi bi-cash-coin me-1"></i>Tiền mặt</button></div>
            <div class="col-6"><button @click="activePosOrder.payment_method = 'Chuyển khoản'" class="btn w-100 rounded-3 border py-2" :class="activePosOrder.payment_method === 'Chuyển khoản' ? 'btn-dark text-white border-dark' : 'btn-white text-secondary'"><i class="bi bi-bank me-1"></i>Chuyển khoản</button></div>
          </div>

          <button @click="checkoutPos()" :disabled="activePosOrder.cart.length === 0" class="btn btn-dark w-100 rounded-3 fw-bold py-2"><i class="bi bi-check2-circle me-2"></i>Tạo đơn / Thanh toán</button>
        </div>
      </div>
    </div>

    <!-- MODAL QR chuyển khoản tại quầy (hiện 1 lần khi bấm thanh toán) -->
    <Teleport to="body">
      <div v-if="posPayModal.open" class="custom-modal-overlay" @click.self="cancelPosPay()">
        <div class="custom-modal-box fade-in-scale" style="max-width:380px;">
          <div class="p-4 text-center">
            <h6 class="fw-bold text-dark mb-1"><i class="bi bi-qr-code me-2"></i>Quét mã chuyển khoản</h6>
            <p class="text-secondary small mb-3">Khách quét mã QR để chuyển khoản. Nhấn "Đã thanh toán" sau khi nhận được tiền.</p>
            <img :src="posPayModal.qr" class="rounded-3 border mb-3" style="width:240px;height:240px;object-fit:contain;" alt="QR">
            <div class="mb-3"><span class="text-secondary small">Số tiền</span><h4 class="fw-bolder text-dark mb-0" v-text="formatPrice(posPayModal.amount)"></h4></div>
            <div class="d-grid gap-2">
              <button @click="confirmPosPaid()" class="btn btn-dark rounded-3 fw-bold py-2"><i class="bi bi-check2-circle me-2"></i>Đã thanh toán</button>
              <button @click="cancelPosPay()" class="btn btn-light border rounded-3">Hủy</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
