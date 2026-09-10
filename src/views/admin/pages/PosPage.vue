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
  checkoutPos, formatPrice, validateCartItemQty, posSubmitting,
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
    <div class="grid grid-cols-12 gap-4">
      <!-- CỘT TRÁI -->
      <div class="lg:col-span-7">
        <!-- Khách hàng -->
        <div class="bg-white rounded-1 shadow-sm p-4 mb-4">
          <div class="flex justify-between items-center mb-3">
            <h6 class="font-bold mb-0 text-gray-900"><i class="icon icon-person-circle mr-2"></i>Khách hàng</h6>
            
          </div>
          <div class="flex gap-2 mb-3">
            <button @click="activePosOrder.customer_type = 'Có tài khoản'" class="btn btn-sm rounded-1 px-3 border" :class="activePosOrder.customer_type === 'Có tài khoản' ? 'btn-dark text-white border-dark' : 'btn-white text-gray-600'">Có tài khoản</button>
            <button @click="activePosOrder.customer_type = 'Khách lẻ'" class="btn btn-sm rounded-1 px-3 border" :class="activePosOrder.customer_type === 'Khách lẻ' ? 'btn-dark text-white border-dark' : 'btn-white text-gray-600'">Khách lẻ</button>
          </div>

          <!-- Khách lẻ: nút "Lưu thông tin" nằm NGAY BÊN DƯỚI trong khung khách lẻ -->
          <div v-if="activePosOrder.customer_type === 'Khách lẻ'" class="grid grid-cols-12 gap-3">
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium uppercase text-gray-600">Tên khách</label><input v-model="activePosOrder.customer_name" type="text" class="sg-input rounded-2" placeholder="Họ tên khách hàng"></div>
            <div class="md:col-span-6"><label class="block text-sm font-medium text-sm font-medium uppercase text-gray-600">Số điện thoại</label><input v-model="activePosOrder.customer_phone" type="tel" class="sg-input rounded-2" placeholder="VD: 0901234567" maxlength="11"></div>
            <div class="col-span-12"><label class="block text-sm font-medium text-sm font-medium uppercase text-gray-600">Ghi chú</label><textarea v-model="activePosOrder.customer_note" rows="2" class="sg-input rounded-2" placeholder="Ghi chú đơn hàng..."></textarea></div>
            <div class="col-span-12 flex justify-end items-center gap-2 pt-1 border-t">
              <span class="text-gray-600 text-sm ml-auto">Lưu khách này vào trang Khách hàng (CRM)</span>
              <button @click="savePosCustomer()" :disabled="savingCustomer" class="btn btn-sm btn-dark rounded-1 px-3">
                <i class="icon icon-save mr-1"></i>Lưu thông tin
              </button>
            </div>
          </div>

          <!-- Có tài khoản: chỉ hiện danh sách KHI ĐÃ TÌM KIẾM -->
          <div v-else>
            <label class="block text-sm font-medium text-sm font-medium uppercase text-gray-600">Tìm khách hàng</label>
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
            <input v-model="posSearch" type="text" class="sg-input rounded-2 pl-5" placeholder="Tìm theo tên, mã, màu, size...">
          </div>
          <div class="grid grid-cols-12 gap-3" style="max-height:52vh;overflow:auto;">
            <div v-if="posVariants.length === 0" class="col-span-12 text-center text-gray-600 py-4 text-sm">Không tìm thấy sản phẩm.</div>
            <div v-for="v in posVariants" :key="v.id" class="col-span-6 md:col-span-4">
              <div class="admin-pos-product border rounded-2 p-2 h-full flex flex-col">
                <div class="relative mb-2">
                  <img :src="v.image || 'https://via.placeholder.com/160'" class="rounded-2 w-full" style="height:96px;object-fit:cover;" @error="$event.target.src='https://via.placeholder.com/160'">
                  <span class="rounded-full border absolute" :style="{ width:'16px', height:'16px', bottom:'6px', right:'6px', background: v.color_hex || '#d1d5db' }"></span>
                </div>
                <p class="text-sm font-medium mb-0 text-gray-900 text-truncate" v-text="v.product_name"></p>
                <p class="text-gray-600 mb-1 text-truncate" style="font-size:0.72rem;" v-text="[v.color, v.size, v.sku].filter(Boolean).join(' · ')"></p>
                <p class="font-bold text-gray-900 mb-1 text-sm" v-text="formatPrice(v.price)"></p>
                <p class="text-gray-600 mb-2" style="font-size:0.72rem;">Tồn kho: <span v-text="v.stock"></span></p>
                <div class="flex gap-1 mt-auto">
                  <input type="number" min="1" v-model.number="qtyInputs[v.id]" class="sg-input sg-input text-center rounded-2" style="width:52px;" placeholder="1">
                  <button @click="addWithQty(v)" :disabled="v.stock <= 0" class="btn btn-sm btn-dark rounded-2 grow"><i class="icon icon-plus-lg"></i> Thêm</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CỘT PHẢI -->
      <div class="lg:col-span-5">
        <!-- Đơn hiện tại -->
        <div class="bg-white rounded-1 shadow-sm p-4">
          <div class="flex justify-between items-center mb-3">
            <h6 class="font-bold mb-0 text-gray-900"><i class="icon icon-receipt mr-2"></i>Đơn hiện tại</h6>
            <div class="flex items-center gap-2">
              <span class="badge rounded-1 bg-gray-100 text-gray-600 border" v-text="'#' + activePosOrder.code"></span>
              <button @click="resetPosOrder()" class="btn btn-sm btn-white border rounded-1 px-3" title="Làm mới đơn">
                <i class="icon icon-arrow-counterclockwise"></i>
              </button>
            </div>
          </div>
          <div class="grid grid-cols-12 gap-2 mb-3">
            <div class="col-span-4"><div class="bg-light-gray rounded-2 p-2"><div class="text-gray-600 uppercase" style="font-size:0.62rem;">Khách hàng</div><div class="text-sm font-medium text-truncate" v-text="activePosOrder.customer_name || 'Khách lẻ'"></div></div></div>
            <div class="col-span-4"><div class="bg-light-gray rounded-2 p-2"><div class="text-gray-600 uppercase" style="font-size:0.62rem;">SĐT</div><div class="text-sm font-medium text-truncate" v-text="activePosOrder.customer_phone || '—'"></div></div></div>
            <div class="col-span-4"><div class="bg-light-gray rounded-2 p-2"><div class="text-gray-600 uppercase" style="font-size:0.62rem;">Loại đơn</div><div class="text-sm font-medium">TẠI QUẦY</div></div></div>
          </div>

          <div class="text-gray-600 uppercase mb-2" style="font-size:0.68rem;">Sản phẩm trong đơn</div>
          <div v-if="activePosOrder.cart.length === 0" class="text-center text-gray-600 text-sm py-3 border rounded-2 mb-3">Chưa có sản phẩm trong đơn</div>
          <div v-else class="mb-3" style="max-height:200px;overflow:auto;">
            <div v-for="(c, i) in activePosOrder.cart" :key="i" class="flex items-center gap-2 py-2 border-b">
              <img :src="c.image || 'https://via.placeholder.com/40'" class="rounded-2 border" style="width:40px;height:40px;object-fit:cover;" @error="$event.target.src='https://via.placeholder.com/40'">
              <div class="grow">
                <p class="text-sm font-medium mb-0 text-gray-900 text-truncate" v-text="c.name"></p>
                <p class="text-gray-600 mb-0" style="font-size:0.72rem;" v-text="[c.color, c.size].filter(Boolean).join(' · ') + ' · ' + formatPrice(c.price)"></p>
              </div>
              <input type="number" min="1" @change="validateCartItemQty(c)" v-model.number="c.quantity" class="sg-input sg-input text-center rounded-2" style="width:56px;">
              <button @click="removeCartItem(i)" class="btn btn-sm btn-link text-red-600 p-0"><i class="icon icon-trash"></i></button>
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

          <button @click="checkoutPos()" :disabled="posSubmitting || activePosOrder.cart.length === 0" class="btn btn-dark w-full rounded-2 font-bold py-2"><i class="icon icon-check2-circle mr-2"></i>{{ posSubmitting ? 'Đang xử lý...' : 'Tạo đơn / Thanh toán' }}</button>
        </div>
      </div>
    </div>

    <!-- MODAL QR chuyển khoản tại quầy (hiện 1 lần khi bấm thanh toán) -->
    <Teleport to="body">
      <div v-if="posPayModal.open" class="custom-modal-overlay" @click.self="cancelPosPay()">
        <div class="custom-modal-box fade-in-scale" style="max-width:380px;">
          <div class="p-4 text-center">
            <h6 class="font-bold text-gray-900 mb-1"><i class="icon icon-qr-code mr-2"></i>Quét mã chuyển khoản</h6>
            <p class="text-gray-600 text-sm mb-3">Khách quét mã QR để chuyển khoản. Nhấn "Đã thanh toán" sau khi nhận được tiền.</p>
            <img :src="posPayModal.qr" class="rounded-2 border mb-3" style="width:240px;height:240px;object-fit:contain;" alt="QR">
            <div class="mb-3"><span class="text-gray-600 text-sm">Số tiền</span><h4 class="font-extrabold text-gray-900 mb-0" v-text="formatPrice(posPayModal.amount)"></h4></div>
            <div class="grid gap-2">
              <button @click="confirmPosPaid()" class="btn btn-dark rounded-2 font-bold py-2"><i class="icon icon-check2-circle mr-2"></i>Đã thanh toán</button>
              <button @click="cancelPosPay()" class="btn btn-light border rounded-2">Hủy</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
