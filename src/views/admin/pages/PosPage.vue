<!-- Mục đích: Màn hình bán hàng tại quầy, lập đơn và thanh toán trực tiếp. -->
<!-- Trang: Bán Hàng Tại Quầy (POS) -->
<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  activePosOrder, resetPosOrder,
  posPayModal, confirmPosPaid, cancelPosPay, markPosQrFailed,
  posSearch, posVariants, addToCart, removeCartItem,
  posSubtotal, posDiscountAmount, posGrandTotal,
  posCouponList, applyPosCoupon, clearPosCoupon,
  posCustomerSearch, posCustomerResults, pickPosCustomer,
  checkoutPos, formatPrice, formatDate, validateCartItemQty, posSubmitting,
  posInvoiceModal, closePosInvoice, openLastPosInvoice, printPosInvoice,
  posCartBusy, posCartReady, loadPosCart, posCartItemMax, fetchAllData,
} from '../adminStore'

const qtyInputs = ref({})
const posControlsLocked = computed(() => posCartBusy.value || posSubmitting.value || posPayModal.open || !posCartReady.value)
const productPlaceholder = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="#f4f4f5"/><text x="120" y="85" text-anchor="middle" fill="#71717a" font-size="14">ShoeGroup</text></svg>')}`
function clampQuantity(value, max) {
  return Math.min(max, Math.max(1, Math.floor(Number(value) || 1)))
}
function updateProductQty(v, event) {
  const quantity = clampQuantity(event.target.value, v.stock)
  qtyInputs.value[v.id] = quantity
  event.target.value = quantity
}
async function updateCartQty(c, event) {
  const input = event.target
  input.value = clampQuantity(input.value, posCartItemMax(c))
  await validateCartItemQty(c, input.value)
  input.value = activePosOrder.value.cart.find(item => item.key === c.key)?.quantity ?? c.quantity
}
async function addWithQty(v) {
  if (await addToCart(v, clampQuantity(qtyInputs.value[v.id] ?? 1, v.stock))) delete qtyInputs.value[v.id]
}
function imageError(event) {
  event.target.onerror = null
  event.target.src = productPlaceholder
}
function updateCustomerPhone(event) {
  activePosOrder.value.customer_phone = event.target.value.replace(/\D/g, '').slice(0, 10)
}
watch(posVariants, variants => {
  for (const v of variants) {
    if (qtyInputs.value[v.id] !== undefined) qtyInputs.value[v.id] = clampQuantity(qtyInputs.value[v.id], v.stock)
  }
})
onMounted(async () => {
  await fetchAllData()
  await loadPosCart()
})
</script>

<template>
  <div class="fade-in pos-page">
    <div v-if="!posCartReady" class="pos-sync-notice" role="status">
      <span>{{ posCartBusy ? 'Đang tải giỏ tại quầy...' : 'Giỏ chưa được đồng bộ. Tải lại để tiếp tục bán hàng.' }}</span>
      <button type="button" class="btn btn-sm btn-light border" :disabled="posCartBusy" @click="loadPosCart()">Tải lại giỏ</button>
    </div>
    <div class="pos-layout">
      <!-- CỘT TRÁI -->
      <div class="pos-catalog">
        <!-- Khách hàng -->
        <div class="bg-white rounded-1 shadow-sm p-4 mb-4">
          <div class="flex justify-between items-center mb-3">
            <h6 class="font-bold mb-0 text-gray-900"><i class="icon icon-person-circle mr-2"></i>Khách hàng</h6>
          </div>
          <div class="flex gap-2 mb-3">
            <button @click="activePosOrder.customer_type = 'Có tài khoản'" class="btn btn-sm rounded-1 px-3 border" :class="activePosOrder.customer_type === 'Có tài khoản' ? 'btn-dark text-white border-dark' : 'btn-white text-gray-600'">Có tài khoản</button>
            <button @click="activePosOrder.customer_type = 'Khách lẻ'" class="btn btn-sm rounded-1 px-3 border" :class="activePosOrder.customer_type === 'Khách lẻ' ? 'btn-dark text-white border-dark' : 'btn-white text-gray-600'">Khách lẻ</button>
          </div>

          <!-- Khách lẻ: không cần nút lưu thủ công, hệ thống tự động lưu đơn hàng khi thanh toán -->
          <div v-if="activePosOrder.customer_type === 'Khách lẻ'" class="grid grid-cols-12 gap-3">
            <div class="col-span-12 md:col-span-6">
              <label class="block text-sm font-medium uppercase text-gray-600">Tên khách hàng <span class="text-red-600">*</span></label>
              <input v-model="activePosOrder.customer_name" type="text" class="sg-input rounded-2" placeholder="Nhập tên khách hàng" maxlength="100" autocomplete="name" required>
            </div>
            <div class="col-span-12 md:col-span-6">
              <label class="block text-sm font-medium uppercase text-gray-600">Số điện thoại <span class="text-red-600">*</span></label>
              <input :value="activePosOrder.customer_phone" @input="updateCustomerPhone" type="tel" inputmode="numeric" class="sg-input rounded-2" placeholder="VD: 0901234567" maxlength="10" autocomplete="tel" required>
            </div>
            <div class="col-span-12"><label class="block text-sm font-medium uppercase text-gray-600">Ghi chú</label><textarea v-model="activePosOrder.customer_note" rows="2" class="sg-input rounded-2" placeholder="Ghi chú đơn hàng..."></textarea></div>
          </div>

          <!-- Có tài khoản: chỉ hiện danh sách KHI ĐÃ TÌM KIẾM -->
          <div v-else>
            <label class="block text-sm font-medium uppercase text-gray-600">Tìm khách hàng</label>
            <div class="relative mb-2">
              <i class="icon icon-search absolute text-gray-600" style="left:12px;top:50%;transform:translateY(-50%);"></i>
              <input v-model="posCustomerSearch" type="text" class="sg-input rounded-2 pl-5" placeholder="Nhập tên hoặc SĐT để tìm...">
            </div>
            <!-- Chưa gõ gì: ẩn hoàn toàn danh sách khách hàng -->
            <p v-if="!posCustomerSearch.trim()" class="text-gray-600 text-sm fst-italic mb-0">
              Nhập từ khóa để hiển thị danh sách khách hàng có tên gần giống.
            </p>
            <template v-else>
              <!-- Khung cuộn cao vừa đủ 3 khách hàng gần nhất -->
              <div class="border rounded-2" style="max-height:159px;overflow-y:auto;">
                <div v-if="posCustomerResults.length === 0" class="text-center text-gray-600 text-sm py-3">Không có khách phù hợp.</div>
                <button v-for="c in posCustomerResults" :key="c.id" @click="pickPosCustomer(c)" class="btn w-full text-start flex items-center gap-2 border-0 border-b rounded-0 py-2" style="height:53px;" :class="String(activePosOrder.customer_id) === String(c.id) ? 'bg-light-gray' : 'bg-white'">
                  <span class="rounded-full bg-light-gray inline-flex items-center justify-center shrink-0" style="width:34px;height:34px;"><i class="icon icon-person text-gray-600"></i></span>
                  <span class="grow overflow-hidden">
                    <span class="block text-sm font-medium text-gray-900 text-truncate" v-text="c.name"></span>
                    <span class="block text-gray-600 text-truncate" style="font-size:0.72rem;" v-text="c.phone || '—'"></span>
                  </span>
                  <i v-if="String(activePosOrder.customer_id) === String(c.id)" class="icon icon-check-circle-fill text-gray-900"></i>
                </button>
              </div>
              <p v-if="posCustomerResults.length > 3" class="text-gray-600 mb-0 mt-1" style="font-size:0.72rem;">
                Cuộn để xem thêm (<span v-text="posCustomerResults.length"></span> kết quả)
              </p>
            </template>
          </div>
        </div>

        <!-- Sản phẩm -->
        <div class="bg-white rounded-1 shadow-sm p-4">
          <h6 class="font-bold mb-3 text-gray-900"><i class="icon icon-box-seam mr-2"></i>Sản phẩm</h6>
          <div class="relative mb-3">
            <i class="icon icon-search absolute text-gray-600" style="left:12px;top:50%;transform:translateY(-50%);"></i>
            <input v-model="posSearch" type="text" class="sg-input rounded-2 pl-5" placeholder="Tìm tên, màu, size, thương hiệu, chất liệu...">
          </div>
          <p class="pos-stock-hint">Thêm vào giỏ sẽ trừ kho ngay. Xóa sản phẩm hoặc làm mới đơn sẽ hoàn kho.</p>
          <div class="pos-products-grid">
            <div v-if="posVariants.length === 0" class="pos-products-empty">Không tìm thấy sản phẩm.</div>
            <article v-for="v in posVariants" :key="v.id" class="pos-product-card" :class="{ 'is-unavailable': v.stock <= 0 }">
              <img :src="v.image || productPlaceholder" class="pos-product-image" :alt="v.product_name" loading="lazy" @error="imageError">
              <div class="pos-product-info">
                <h3 class="pos-product-name">{{ v.product_name }}</h3>
                <div class="pos-product-attributes">
                  <span><i class="pos-color-dot" :style="{ background: v.color_hex || '#d1d5db' }"></i>Màu: {{ v.color || 'Chưa cập nhật' }}</span>
                  <span>Size <strong>{{ v.size || '—' }}</strong></span>
                </div>
                <dl class="pos-product-details">
                  <div><dt>Thương hiệu</dt><dd>{{ v.brand || 'Chưa cập nhật' }}</dd></div>
                  <div><dt>Danh mục</dt><dd>{{ v.category || 'Chưa cập nhật' }}</dd></div>
                  <div><dt>Chất liệu</dt><dd>{{ v.material || 'Chưa cập nhật' }}</dd></div>
                  <div v-if="v.description"><dt>Mô tả</dt><dd class="pos-product-description">{{ v.description }}</dd></div>
                </dl>
              </div>
              <div class="pos-product-footer">
              <div class="pos-product-price-row">
                <strong>{{ formatPrice(v.price) }}</strong>
                <span class="pos-stock-count" :class="{ 'is-empty': v.stock <= 0 }">{{ v.no_variant ? 'Chưa có biến thể' : v.stock > 0 ? `Còn ${v.stock}` : 'Hết hàng' }}</span>
              </div>
              <div class="pos-product-actions">
                <div class="pos-quantity-control">
                  <button type="button" :disabled="posControlsLocked || v.stock <= 0 || (qtyInputs[v.id] ?? 1) <= 1" @click="qtyInputs[v.id] = Math.max(1, (qtyInputs[v.id] ?? 1) - 1)" :aria-label="'Giảm số lượng ' + v.product_name">−</button>
                  <input type="number" min="1" :max="v.stock" step="1" inputmode="numeric" :value="qtyInputs[v.id] ?? (v.stock > 0 ? 1 : 0)" :disabled="posControlsLocked || v.stock <= 0" @input="updateProductQty(v, $event)" :aria-label="'Số lượng thêm ' + v.product_name + ', size ' + v.size + ', màu ' + v.color">
                  <button type="button" :disabled="posControlsLocked || v.stock <= 0 || (qtyInputs[v.id] ?? 1) >= v.stock" @click="qtyInputs[v.id] = Math.min(v.stock, (qtyInputs[v.id] ?? 1) + 1)" :aria-label="'Tăng số lượng ' + v.product_name">+</button>
                </div>
                <button type="button" @click="addWithQty(v)" :disabled="posControlsLocked || v.stock <= 0" class="btn btn-dark pos-add-button"><i class="icon icon-plus-lg"></i> Thêm</button>
              </div>
              </div>
            </article>
          </div>
        </div>
      </div>

      <!-- CỘT PHẢI -->
      <div class="pos-checkout">
        <!-- Đơn hiện tại -->
        <div class="bg-white rounded-1 shadow-sm p-4">
          <div class="pos-current-title-row">
            <h6 class="font-bold mb-0 text-gray-900"><i class="icon icon-receipt mr-2"></i>Đơn hiện tại</h6>
            <button @click="resetPosOrder()" :disabled="posControlsLocked" class="btn btn-sm btn-white border rounded-1 pos-reset-order" title="Làm mới đơn và hoàn hàng về kho" aria-label="Làm mới đơn hiện tại và hoàn kho">
              <i class="icon icon-arrow-counterclockwise"></i>
            </button>
          </div>
          <div class="pos-current-toolbar">
            <span class="badge rounded-1 bg-gray-100 text-gray-600 border pos-current-code" :title="activePosOrder.code" v-text="'#' + activePosOrder.code"></span>
            <button
              v-if="posInvoiceModal.orderId"
              type="button"
              @click="openLastPosInvoice()"
              class="btn btn-sm btn-white border rounded-1 pos-last-invoice"
              :title="'Xem lại hóa đơn #' + posInvoiceModal.orderId"
            >
              <i class="icon icon-receipt"></i>
              <span>Hóa đơn #{{ posInvoiceModal.orderId }}</span>
            </button>
          </div>
          <div class="grid grid-cols-12 gap-2 mb-3">
            <div class="col-span-4"><div class="bg-light-gray rounded-2 p-2"><div class="text-gray-600 uppercase" style="font-size:0.62rem;">Khách hàng</div><div class="text-sm font-medium text-truncate" v-text="activePosOrder.customer_name || 'Khách lẻ'"></div></div></div>
            <div class="col-span-4"><div class="bg-light-gray rounded-2 p-2"><div class="text-gray-600 uppercase" style="font-size:0.62rem;">SĐT</div><div class="text-sm font-medium text-truncate" v-text="activePosOrder.customer_phone || '—'"></div></div></div>
            <div class="col-span-4"><div class="bg-light-gray rounded-2 p-2"><div class="text-gray-600 uppercase" style="font-size:0.62rem;">Loại đơn</div><div class="text-sm font-medium">TẠI QUẦY</div></div></div>
          </div>

          <div class="text-gray-600 uppercase mb-2" style="font-size:0.68rem;">Sản phẩm trong đơn</div>
          <div v-if="activePosOrder.cart.length === 0" class="text-center text-gray-600 text-sm py-3 border rounded-2 mb-3">Chưa có sản phẩm trong đơn</div>
          <div v-else class="pos-cart-lines">
            <div v-for="(c, i) in activePosOrder.cart" :key="c.key" class="pos-cart-line">
              <img :src="c.image || productPlaceholder" class="pos-cart-image" :alt="c.name" @error="imageError">
              <div class="pos-cart-description">
                <p class="pos-cart-name">{{ c.name }}</p>
                <p class="pos-cart-variant">{{ c.color }} · Size {{ c.size }}</p>
                <strong>{{ formatPrice(c.price) }}</strong>
              </div>
              <button @click="removeCartItem(i)" :disabled="posControlsLocked" class="btn pos-remove-button" :aria-label="'Xóa ' + c.name + ' khỏi giỏ và hoàn kho'"><i class="icon icon-trash"></i></button>
              <div class="pos-cart-quantity-row">
                <span>Đã giữ {{ c.quantity }} sản phẩm</span>
                <div class="pos-quantity-control">
                  <button type="button" :disabled="posControlsLocked || c.quantity <= 1" @click="validateCartItemQty(c, c.quantity - 1)" :aria-label="'Giảm số lượng ' + c.name">−</button>
                  <input type="number" min="1" :max="posCartItemMax(c)" step="1" inputmode="numeric" :value="c.quantity" :disabled="posControlsLocked" @input="$event.target.value = clampQuantity($event.target.value, posCartItemMax(c))" @change="updateCartQty(c, $event)" :aria-label="'Số lượng trong giỏ ' + c.name">
                  <button type="button" :disabled="posControlsLocked || c.quantity >= posCartItemMax(c)" @click="validateCartItemQty(c, c.quantity + 1)" :aria-label="'Tăng số lượng ' + c.name">+</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Ưu đãi -->
          <div class="text-gray-600 uppercase mb-2" style="font-size:0.68rem;">Ưu đãi</div>
          <div class="flex gap-2 mb-3">
            <select v-model="activePosOrder.coupon_code" class="sg-input sg-input rounded-2">
              <option value="">Chọn ưu đãi có sẵn...</option>
              <option v-for="d in posCouponList" :key="d.id" :value="d.code" v-text="d.code + ' — ' + (d.name || (d.discount_type === 'Cố định' ? formatPrice(d.value) : d.value + '%'))"></option>
            </select>
            <button @click="applyPosCoupon()" class="btn btn-sm btn-dark rounded-2">Áp dụng</button>
            <button @click="clearPosCoupon()" class="btn btn-sm btn-light border rounded-2">Bỏ</button>
          </div>

          <!-- Tổng -->
          <div class="flex justify-between mb-1 text-sm"><span class="text-gray-600">Tạm tính</span><span class="font-medium" v-text="formatPrice(posSubtotal)"></span></div>
          <div class="flex justify-between mb-2 text-sm"><span class="text-gray-600">Giảm giá</span><span class="font-medium text-red-600" v-text="'- ' + formatPrice(posDiscountAmount)"></span></div>
          <div class="flex justify-between items-center mb-3"><span class="font-bold text-gray-900">Tổng thanh toán</span><h5 class="font-extrabold mb-0 text-gray-900" v-text="formatPrice(posGrandTotal)"></h5></div>

          <!-- Thanh toán -->
          <div class="text-gray-600 uppercase mb-2" style="font-size:0.68rem;">Phương thức thanh toán</div>
          <div class="grid grid-cols-12 gap-2 mb-3">
            <div class="col-span-6"><button @click="activePosOrder.payment_method = 'Tiền mặt'" class="btn w-full rounded-2 border py-2" :class="activePosOrder.payment_method === 'Tiền mặt' ? 'btn-dark text-white border-dark' : 'btn-white text-gray-600'"><i class="icon icon-cash-coin mr-1"></i>Tiền mặt</button></div>
            <div class="col-span-6"><button @click="activePosOrder.payment_method = 'Chuyển khoản'" class="btn w-full rounded-2 border py-2" :class="activePosOrder.payment_method === 'Chuyển khoản' ? 'btn-dark text-white border-dark' : 'btn-white text-gray-600'"><i class="icon icon-bank mr-1"></i>Chuyển khoản</button></div>
          </div>

          <p v-if="posCartBusy" class="text-gray-600 text-xs mb-2" role="status">Đang cập nhật giỏ và tồn kho...</p>
          <button @click="checkoutPos()" :disabled="posControlsLocked || activePosOrder.cart.length === 0" class="btn btn-dark w-full rounded-2 font-bold py-2"><i class="icon icon-check2-circle mr-2"></i>{{ posSubmitting ? 'Đang xử lý...' : 'Tạo đơn / Thanh toán' }}</button>
        </div>
      </div>
    </div>

    <!-- MODAL QR chuyển khoản tại quầy (hiện 1 lần khi bấm thanh toán) -->
    <div v-if="posPayModal.open" class="custom-modal-overlay" @click.self="cancelPosPay()">
        <div class="custom-modal-box fade-in-scale" style="max-width:380px;">
          <div class="p-4 text-center">
            <h6 class="font-bold text-gray-900 mb-1"><i class="icon icon-qr-code mr-2"></i>Quét mã chuyển khoản</h6>
            <p v-if="posPayModal.bankConfigured" class="text-gray-600 text-sm mb-3">Khách quét VietQR để chuyển đúng số tiền và nội dung.</p>
            <p v-else class="text-gray-600 text-sm mb-3">Mã QR hiển thị mã đơn và số tiền chuyển khoản. Bấm “Hoàn thành” để ghi nhận đơn đã thanh toán.</p>
            <img v-if="!posPayModal.qrFailed" :src="posPayModal.qr" class="rounded-2 border mb-3 mx-auto" style="width:270px;max-width:100%;height:320px;object-fit:contain;" alt="QR thanh toán chuyển khoản" @error="markPosQrFailed()">
            <div v-else class="rounded-2 border bg-yellow-50 text-yellow-800 text-sm p-3 mb-3 text-start">
              <template v-if="posPayModal.bankConfigured">Không tải được ảnh VietQR. Khách vẫn có thể chuyển khoản bằng thông tin bên dưới.</template>
              <template v-else>Không tải được ảnh QR. Kiểm tra số tiền rồi bấm “Hoàn thành” để ghi nhận thanh toán.</template>
            </div>
            <div class="mb-3"><span class="text-gray-600 text-sm">Số tiền</span><h4 class="font-extrabold text-gray-900 mb-0" v-text="formatPrice(posPayModal.amount)"></h4></div>
            <dl class="rounded-2 bg-light-gray p-3 mb-3 text-sm text-start">
              <template v-if="posPayModal.bankConfigured">
                <div class="flex justify-between gap-3 mb-1"><dt class="text-gray-600">Ngân hàng</dt><dd class="font-medium text-gray-900 text-end" v-text="posPayModal.bankName"></dd></div>
                <div class="flex justify-between gap-3 mb-1"><dt class="text-gray-600">Số tài khoản</dt><dd class="font-bold text-gray-900 text-end" v-text="posPayModal.accountNo"></dd></div>
                <div class="flex justify-between gap-3 mb-1"><dt class="text-gray-600">Chủ tài khoản</dt><dd class="font-medium text-gray-900 text-end" v-text="posPayModal.accountName"></dd></div>
              </template>
              <div v-else class="flex justify-between gap-3 mb-1"><dt class="text-gray-600">Hình thức</dt><dd class="font-medium text-gray-900 text-end">Chuyển khoản tại quầy</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-gray-600">Nội dung</dt><dd class="font-bold text-gray-900 text-end" v-text="posPayModal.transferContent"></dd></div>
            </dl>
            <div class="grid gap-2">
              <button @click="confirmPosPaid()" :disabled="posSubmitting" class="btn btn-dark rounded-2 font-bold py-2"><i class="icon icon-check2-circle mr-2"></i>{{ posSubmitting ? 'Đang ghi nhận...' : 'Hoàn thành' }}</button>
              <button @click="cancelPosPay()" :disabled="posSubmitting" class="btn btn-light border rounded-2">Hủy</button>
            </div>
          </div>
        </div>
      </div>

    <!-- MODAL HÓA ĐƠN sau khi thanh toán thành công -->
    <div v-if="posInvoiceModal.open" class="custom-modal-overlay" @click.self="closePosInvoice()">
        <div class="custom-modal-box fade-in-scale pos-invoice-dialog" role="dialog" aria-modal="true" aria-label="Hóa đơn thanh toán">
          <!-- Header hóa đơn -->
          <div class="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2 pos-invoice-header">
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-black text-white inline-flex items-center justify-center shrink-0" style="width:32px;height:32px;">
                <i class="icon icon-receipt text-sm"></i>
              </span>
              <div>
                <h6 class="font-bold mb-0 text-gray-900 leading-tight">HÓA ĐƠN BÁN HÀNG</h6>
                <small class="text-gray-600" style="font-size:0.72rem;">Cửa hàng giày dép ShoeGroup</small>
              </div>
            </div>
            <button @click="closePosInvoice()" class="btn btn-sm btn-light border-0" type="button" aria-label="Đóng hóa đơn">
              <i class="icon icon-x-lg"></i>
            </button>
          </div>

          <!-- Thân hóa đơn -->
          <div class="p-4 pos-invoice-body">
            <!-- Badge trạng thái thành công -->
            <div class="text-center mb-4 pb-3 border-b">
              <div class="mx-auto mb-2 rounded-full inline-flex items-center justify-center bg-green-50 text-green-700" style="width:50px;height:50px;">
                <i class="icon icon-check-circle-fill" style="font-size:1.75rem;"></i>
              </div>
              <h6 class="font-bold text-gray-900 mb-0">Thanh toán thành công!</h6>
              <p class="text-gray-600 text-sm mb-0">Mã đơn hàng: <strong class="text-gray-900">#{{ posInvoiceModal.orderId }}</strong></p>
            </div>

            <!-- Thông tin đơn hàng & Khách hàng -->
            <div class="bg-light-gray rounded-2 p-3 mb-3 text-sm">
              <div class="flex justify-between mb-1.5">
                <span class="text-gray-600">Thời gian:</span>
                <span class="font-medium text-gray-900">{{ formatDate(posInvoiceModal.created_at) }}</span>
              </div>
              <div class="flex justify-between mb-1.5">
                <span class="text-gray-600">Khách hàng:</span>
                <span class="font-medium text-gray-900">{{ posInvoiceModal.customer_name || 'Khách lẻ' }}</span>
              </div>
              <div v-if="posInvoiceModal.customer_phone" class="flex justify-between mb-1.5">
                <span class="text-gray-600">Số điện thoại:</span>
                <span class="font-medium text-gray-900">{{ posInvoiceModal.customer_phone }}</span>
              </div>
              <div class="flex justify-between mb-1.5">
                <span class="text-gray-600">Phương thức:</span>
                <span class="font-medium text-gray-900">{{ posInvoiceModal.payment_method }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Thu ngân:</span>
                <span class="font-medium text-gray-900">{{ posInvoiceModal.handled_by || 'Quầy' }}</span>
              </div>
            </div>

            <!-- Danh sách sản phẩm -->
            <div class="text-gray-600 uppercase mb-2" style="font-size:0.68rem;letter-spacing:0.5px;">Chi tiết sản phẩm</div>
            <div class="border rounded-2 mb-3 pos-invoice-products">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-gray-100 text-gray-600 border-b" style="font-size:0.75rem;">
                    <th class="py-2 px-3 text-start">Sản phẩm</th>
                    <th class="py-2 px-2 text-center" style="width:48px;">SL</th>
                    <th class="py-2 px-3 text-end" style="width:90px;">Đơn giá</th>
                    <th class="py-2 px-3 text-end" style="width:100px;">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, i) in posInvoiceModal.items" :key="i" class="border-b last:border-b-0">
                    <td class="py-2 px-3">
                      <div class="font-medium text-gray-900 leading-snug">{{ item.name }}</div>
                      <div class="text-gray-600" style="font-size:0.72rem;">{{ [item.color, item.size ? 'Size ' + item.size : ''].filter(Boolean).join(' · ') }}</div>
                    </td>
                    <td class="py-2 px-2 text-center text-gray-700">{{ item.quantity }}</td>
                    <td class="py-2 px-3 text-end text-gray-700">{{ formatPrice(item.price) }}</td>
                    <td class="py-2 px-3 text-end font-medium text-gray-900">{{ formatPrice(item.price * item.quantity) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Tổng kết tiền -->
            <div class="border-t pt-2.5 text-sm space-y-1.5">
              <div class="flex justify-between text-gray-600">
                <span>Tạm tính:</span>
                <span class="font-medium text-gray-900">{{ formatPrice(posInvoiceModal.subtotal) }}</span>
              </div>
              <div v-if="posInvoiceModal.discount > 0" class="flex justify-between text-red-600">
                <span>Giảm giá:</span>
                <span class="font-medium">- {{ formatPrice(posInvoiceModal.discount) }}</span>
              </div>
              <div class="flex justify-between items-baseline pt-2 border-t mt-2">
                <span class="font-bold text-gray-900 text-base">Tổng thanh toán:</span>
                <h4 class="font-extrabold text-gray-900 mb-0">{{ formatPrice(posInvoiceModal.total) }}</h4>
              </div>
            </div>

            <p class="text-center text-gray-600 text-xs fst-italic mt-4 mb-0">Cảm ơn quý khách đã mua hàng tại ShoeGroup!</p>
          </div>

          <!-- Nút bấm Xem / In / Đóng -->
          <div class="p-4 border-t flex gap-2 bg-gray-50 rounded-b-2 pos-invoice-footer">
            <button @click="closePosInvoice()" type="button" class="btn btn-light border rounded-2 grow font-medium">
              <i class="icon icon-x-lg mr-1"></i> Đóng
            </button>
            <button @click="printPosInvoice()" type="button" class="btn btn-dark rounded-2 grow font-bold">
              <i class="icon icon-printer mr-1"></i> In hóa đơn
            </button>
          </div>
        </div>
      </div>
  </div>
</template>

<style scoped>
.pos-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; align-items: start; }
.pos-catalog, .pos-checkout { min-width: 0; }
.pos-sync-notice { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; padding: 12px 16px; border: 1px solid #ddd; border-radius: 10px; background: #fff; font-size: 13px; }
.pos-stock-hint { color: #606068; font-size: 12px; line-height: 1.5; margin: 0 0 10px; }
.pos-products-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); align-content: start; gap: 8px; max-height: 68vh; overflow-y: auto; scrollbar-gutter: stable; padding: 2px 5px 8px 2px; }
.pos-products-empty { grid-column: 1 / -1; padding: 36px 12px; text-align: center; color: #71717a; }
.pos-product-card { display: grid; grid-template-columns: 64px minmax(0, 1fr); align-content: start; gap: 8px 10px; padding: 10px; border: 1px solid #dddde1; border-radius: 12px; background: #fff; }
.pos-product-card:hover { border-color: #aaaab3; }
.pos-product-card.is-unavailable { background: #fafafa; }
.pos-product-image { width: 64px; height: 72px; object-fit: contain; border-radius: 8px; background: #f4f4f5; }
.pos-product-info { min-width: 0; }
.pos-product-name { margin: 0 0 4px; color: #18181b; font-size: 14px; font-weight: 650; line-height: 1.4; overflow-wrap: anywhere; }
.pos-product-attributes { display: flex; flex-wrap: wrap; gap: 6px; }
.pos-product-attributes > span { display: inline-flex; align-items: center; gap: 5px; padding: 2px 6px; background: #f1f1f3; border-radius: 5px; font-size: 12px; line-height: 1.5; }
.pos-color-dot { display: inline-block; flex-shrink: 0; width: 12px; height: 12px; border: 1px solid #a1a1aa; border-radius: 50%; }
.pos-product-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; margin: 6px 0 0; }
.pos-product-details > div { display: flex; flex-wrap: wrap; align-content: start; gap: 0 4px; min-width: 0; font-size: 12px; line-height: 1.5; }
.pos-product-details dt { color: #71717a; flex-shrink: 0; }
.pos-product-details dt::after { content: ':'; }
.pos-product-details dd { margin: 0; color: #27272a; font-weight: 500; overflow-wrap: anywhere; }
.pos-product-description { white-space: pre-line; }
.pos-product-footer { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; padding-top: 8px; border-top: 1px solid #ededf0; }
.pos-product-price-row, .pos-product-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.pos-product-price-row > strong { color: #18181b; font-size: 15px; }
.pos-product-actions { margin-left: auto; }
.pos-product-actions .pos-add-button { min-width: 84px; padding-inline: 12px; }
.pos-stock-count { padding: 4px 8px; border-radius: 5px; background: #f1f1f3; color: #33333b; font-size: 12px; font-weight: 600; }
.pos-stock-count.is-empty { color: #8b3434; background: #fceeee; }
.pos-quantity-control { display: inline-flex; flex: 0 0 auto; height: 42px; border: 1px solid #d4d4d8; border-radius: 8px; overflow: hidden; background: #fff; }
.pos-quantity-control button { width: 34px; border: 0; background: #f5f5f6; color: #18181b; font-size: 20px; cursor: pointer; }
.pos-quantity-control input { width: 46px; min-width: 0; border: 0; border-radius: 0; padding: 4px; text-align: center; color: #18181b; font-size: 14px; appearance: textfield; -moz-appearance: textfield; }
.pos-quantity-control input::-webkit-inner-spin-button, .pos-quantity-control input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.pos-quantity-control button:disabled, .pos-quantity-control input:disabled { color: #a1a1aa; cursor: not-allowed; }
.pos-quantity-control button:focus-visible, .pos-quantity-control input:focus-visible { outline: 2px solid #18181b; outline-offset: -2px; }
.pos-add-button { flex: 1 1 auto; min-height: 42px; justify-content: center; gap: 6px; }
.pos-cart-lines { max-height: 380px; overflow-y: auto; margin-bottom: 20px; padding-right: 4px; }
.pos-cart-line { display: grid; grid-template-columns: 52px minmax(0, 1fr) 36px; gap: 10px; padding: 14px 0; border-bottom: 1px solid #e4e4e7; }
.pos-cart-image { width: 52px; height: 58px; border-radius: 8px; background: #f4f4f5; object-fit: contain; }
.pos-cart-description { min-width: 0; font-size: 13px; }
.pos-cart-name { margin: 0 0 4px; font-weight: 600; line-height: 1.4; overflow-wrap: anywhere; }
.pos-cart-variant { margin: 0 0 5px; color: #666670; font-size: 12px; }
.pos-remove-button { width: 36px; min-height: 42px; padding: 0; color: #a33; align-self: start; }
.pos-cart-quantity-row { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.pos-cart-quantity-row > span { color: #666670; font-size: 12px; }
@media (min-width: 1280px) { .pos-layout { grid-template-columns: minmax(0, 1fr) minmax(350px, 400px); } }
@media (max-width: 480px) { .pos-product-actions { flex: 1 1 100%; } }
</style>
