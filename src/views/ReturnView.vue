<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ordersByCurrentUser, loadOrders, formatCurrency, requestReturn } from '../stores/orderStore'
import { notify } from '../stores/uiStore'
import { postOffices as mockPO } from '../data/mockData'
import { api } from "../services/apiClient";

const route = useRoute()
const router = useRouter()
const order = ref(null)
const postOffices = ref([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const submitted = ref(false)
const submittedNotReceived = ref(false)
const returnableOrders = computed(() => ordersByCurrentUser.value.filter((item) => ['SHIPPING', 'DELIVERY_FAILED', 'WAREHOUSE_RETURN', 'DELIVERED', 'RECEIVED'].includes(item.status)))
const requestMode = ref(route.query.type === 'NOT_RECEIVED' ? 'NOT_RECEIVED' : 'RETURN')
const isNotReceived = computed(() => requestMode.value === 'NOT_RECEIVED')
const canReportNotReceivedStatus = (status) => ['SHIPPING', 'DELIVERY_FAILED', 'WAREHOUSE_RETURN', 'DELIVERED'].includes(status)
const canProductReturnStatus = (status) => ['DELIVERED', 'RECEIVED'].includes(status)
const canReportNotReceived = computed(() => canReportNotReceivedStatus(order.value?.status))
const canRequestProductReturn = computed(() => canProductReturnStatus(order.value?.status))
const canChooseRequestMode = computed(() => Boolean(order.value) && (canReportNotReceived.value || canRequestProductReturn.value))
const isPaymentRecorded = computed(() => ['Đã thanh toán', 'Chờ thanh toán'].includes(String(order.value?.payment_status || '')))

const form = reactive({
  method: 'SHIPPER',       // SHIPPER = shipper tự lấy | POST_OFFICE = gửi tại bưu cục
  postOfficeId: null,
  reason: '',
  reasonCode: 'DEFECTIVE',
  trackingCode: '',
  items: [],
})

const returnReasons = [
  { value: 'DEFECTIVE', label: 'Sản phẩm lỗi / không hoạt động' },
  { value: 'SHIPPING_DAMAGE', label: 'Hư hỏng do vận chuyển' },
  { value: 'WRONG_ITEM', label: 'Giao sai sản phẩm hoặc màu' },
  { value: 'WRONG_SIZE', label: 'Không vừa / sai kích thước' },
  { value: 'CHANGE_OF_MIND', label: 'Đổi ý (sản phẩm còn nguyên)' },
]

const genTracking = () => 'SG' + Date.now().toString().slice(-9) + Math.floor(Math.random() * 90 + 10)

const useOrder = (selected) => {
  order.value = selected || null
  submittedNotReceived.value = false
  form.items = selected ? (selected.items || []).map((item) => ({ ...item, checked: true, return_qty: Number(item.quantity) || 1, condition: 'UNOPENED' })) : []
  const autoNotReceived = ['SHIPPING', 'DELIVERY_FAILED', 'WAREHOUSE_RETURN'].includes(selected?.status)
    || (route.query.type === 'NOT_RECEIVED' && selected?.status === 'DELIVERED')
  if (autoNotReceived) {
    requestMode.value = 'NOT_RECEIVED'
    form.method = 'NOT_RECEIVED'
    form.reasonCode = 'NOT_RECEIVED'
  } else {
    requestMode.value = 'RETURN'
    if (form.method === 'NOT_RECEIVED') form.method = 'SHIPPER'
    if (form.reasonCode === 'NOT_RECEIVED') form.reasonCode = 'DEFECTIVE'
  }
}

const setRequestMode = (mode) => {
  if (mode === 'NOT_RECEIVED' && !canReportNotReceived.value) {
    notify({ type: 'warning', message: 'Đơn đã xác nhận nhận hàng nên không thể báo chưa nhận hàng.' })
    return
  }
  if (mode !== 'NOT_RECEIVED' && !canRequestProductReturn.value) {
    notify({ type: 'warning', message: 'Đơn chưa giao thành công nên chưa thể tạo yêu cầu trả sản phẩm.' })
    return
  }
  requestMode.value = mode === 'NOT_RECEIVED' ? 'NOT_RECEIVED' : 'RETURN'
  if (requestMode.value === 'NOT_RECEIVED') {
    form.method = 'NOT_RECEIVED'
    form.reasonCode = 'NOT_RECEIVED'
  } else {
    form.method = 'SHIPPER'
    form.reasonCode = 'DEFECTIVE'
  }
}

const selectOrder = async (selected) => {
  useOrder(selected)
  await router.replace({ name: 'return-order', params: { orderId: selected.id } })
}

const fetchData = async () => {
  const rawId = String(route.params.orderId || '')
  const id = Number(rawId)
  try {
    const data = await api.get('/postoffices')
    if (!Array.isArray(data)) throw new Error('Dữ liệu bưu cục không hợp lệ')
    postOffices.value = data.map((p) => ({ id: p.PostOfficeID || p.id, name: p.Name || p.name, address: p.Address || p.address, phone: p.Phone || p.phone }))
  } catch { postOffices.value = mockPO }
  await loadOrders()
  useOrder(ordersByCurrentUser.value.find((o) => String(o.id) === rawId || (Number.isFinite(id) && Number(o.serverId) === id)) || null)
  form.postOfficeId = postOffices.value[0]?.id
  isLoading.value = false
}

const selectedPO = computed(() => postOffices.value.find((p) => p.id === form.postOfficeId))
const refundAmount = computed(() => form.items.filter((i) => i.checked).reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.return_qty || 0), 0))

const submit = async () => {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    const notReceivedRequest = isNotReceived.value
    if (!notReceivedRequest && !form.reason.trim()) { notify({ type: 'error', message: 'Vui lòng nhập lý do trả hàng.' }); return }
    // Khi chưa nhận hàng, báo cáo áp dụng cho cả kiện; khách không phải chọn
    // từng sản phẩm (và cũng không thể biết chính xác món nào trong kiện).
    const selectedItems = notReceivedRequest
      ? form.items.map((item) => ({ ...item, checked: true, return_qty: Number(item.quantity) || 1 }))
      : form.items.filter((i) => i.checked)
    if (!notReceivedRequest && selectedItems.length === 0) { notify({ type: 'error', message: 'Chọn ít nhất 1 sản phẩm để trả.' }); return }
    if (selectedItems.some((item) => item.checked && (!Number.isInteger(Number(item.return_qty)) || Number(item.return_qty) < 1 || Number(item.return_qty) > Number(item.quantity)))) {
      notify({ type: 'error', message: 'Số lượng trả phải từ 1 đến số lượng đã mua.' }); return
    }
    if (!notReceivedRequest && form.method === 'POST_OFFICE' && !form.postOfficeId) { notify({ type: 'error', message: 'Chọn bưu cục để gửi trả.' }); return }
    form.trackingCode = notReceivedRequest ? '' : genTracking()
    const reasonLabel = returnReasons.find((item) => item.value === form.reasonCode)?.label || 'Khác'
    const refundAmountForRequest = notReceivedRequest
      ? selectedItems.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.return_qty || 0), 0)
      : refundAmount.value
    const r = await requestReturn(order.value.id, {
      method: notReceivedRequest ? 'NOT_RECEIVED' : form.method,
      postOffice: !notReceivedRequest && form.method === 'POST_OFFICE' ? selectedPO.value : null,
      reason: notReceivedRequest
        ? `[Chưa nhận được hàng] ${form.reason.trim() || 'Khách hàng chưa nhận được kiện hàng.'}`
        : `[${reasonLabel}] ${form.reason.trim()}`,
      trackingCode: form.trackingCode,
      refundAmount: refundAmountForRequest,
      items: selectedItems,
    })
    if (r?.ok === false) { notify({ type: 'error', message: r.message }); return }
    submittedNotReceived.value = notReceivedRequest
    submitted.value = true
    notify({ type: 'success', title: notReceivedRequest ? 'Đã ghi nhận báo chưa nhận hàng' : 'Đã tạo yêu cầu trả hàng', message: notReceivedRequest ? 'Cửa hàng sẽ kiểm tra và phản hồi sớm.' : `Mã vận đơn: ${form.trackingCode}` })
  } finally {
    isSubmitting.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="return-page">
    <div class="container-fluid px-4 py-4">
      <div class="sg-title-bar mb-2"></div>
      <h1 class="rt-title">Yêu cầu trả hàng</h1>

      <div v-if="isLoading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="!order" class="sg-card rt-picker">
        <h5>Chọn đơn hàng cần trả</h5>
        <p class="text-secondary">Đơn đã giao/đã nhận đủ điều kiện trả hàng. Đơn đang giao hoặc giao thất bại có thể báo chưa nhận hàng để cửa hàng kiểm tra.</p>
        <div v-if="returnableOrders.length" class="picker-list">
          <button v-for="item in returnableOrders" :key="item.id" type="button" class="picker-row" @click="selectOrder(item)">
            <span><strong>#{{ item.serverId || item.id }}</strong><small>{{ item.date }}</small></span>
            <span>{{ formatCurrency(item.total) }}</span>
            <span>Chọn đơn</span>
          </button>
        </div>
        <div v-else class="empty-copy">Bạn chưa có đơn hàng nào đủ điều kiện trả.</div>
        <router-link to="/orders" class="btn-sg mt-3">Về đơn hàng</router-link>
      </div>

      <!-- Hai trường hợp dùng chung một luồng yêu cầu; khách chọn loại sự cố
           tại đây thay vì phải có nút "Đã nhận/Chưa nhận" rời rạc ở Đơn hàng.
           Thẻ này là nhánh độc lập với form bên dưới để cả hai cùng hiển thị. -->
      <div v-if="order && !submitted && canChooseRequestMode" class="sg-card request-mode-card">
        <div>
          <h6 class="request-mode-title">Bạn cần hỗ trợ trường hợp nào?</h6>
          <p class="request-mode-subtitle">Chọn một loại yêu cầu để cửa hàng xử lý đúng quy trình.</p>
        </div>
        <div class="request-mode-grid">
          <button v-if="canRequestProductReturn" type="button" class="request-mode-option" :class="{ active: requestMode === 'RETURN' }" @click="setRequestMode('RETURN')">
            <span class="request-mode-icon"><i class="bi bi-arrow-return-left"></i></span>
            <span><strong>Trả / đổi sản phẩm</strong><small>Sản phẩm lỗi, sai hàng hoặc không vừa</small></span>
            <i class="bi bi-check-circle-fill request-mode-check"></i>
          </button>
          <button v-if="canReportNotReceived" type="button" class="request-mode-option" :class="{ active: requestMode === 'NOT_RECEIVED' }" @click="setRequestMode('NOT_RECEIVED')">
            <span class="request-mode-icon"><i class="bi bi-truck"></i></span>
            <span><strong>Chưa nhận được hàng</strong><small>Đơn báo giao nhưng bạn chưa nhận kiện</small></span>
            <i class="bi bi-check-circle-fill request-mode-check"></i>
          </button>
        </div>
      </div>

      <!-- Success -->
      <div v-if="submitted" class="sg-card rt-success">
        <div class="suc-check">OK</div>
        <h3>{{ submittedNotReceived ? 'Báo chưa nhận được hàng đã được ghi nhận' : 'Yêu cầu trả hàng đã được ghi nhận' }}</h3>
        <p class="text-secondary">{{ submittedNotReceived ? 'Cửa hàng sẽ kiểm tra hành trình và phản hồi về đơn hàng.' : 'Vui lòng lưu lại mã vận đơn để theo dõi.' }}</p>
        <div v-if="!submittedNotReceived" class="rt-track"><span>Mã vận đơn</span><strong>{{ form.trackingCode }}</strong></div>
        <div class="rt-guide">
          <template v-if="submittedNotReceived">
            <p><i class="bi bi-headset"></i> Yêu cầu “chưa nhận được hàng” đã được gửi. Bạn không cần gửi lại sản phẩm; hãy giữ điện thoại để cửa hàng/đơn vị vận chuyển liên hệ.</p>
          </template>
          <template v-else-if="form.method === 'SHIPPER'">
            <p><i class="bi bi-truck"></i> Shipper sẽ đến lấy hàng tại địa chỉ của bạn. Vui lòng đóng gói sản phẩm và ghi mã vận đơn <strong>{{ form.trackingCode }}</strong> lên kiện hàng.</p>
          </template>
          <template v-else>
            <p><i class="bi bi-shop"></i> Vui lòng mang hàng đến bưu cục: <strong>{{ selectedPO?.name }}</strong> — {{ selectedPO?.address }}.</p>
            <p>Ghi mã vận đơn <strong>{{ form.trackingCode }}</strong> và mã đơn <strong>#{{ order.id }}</strong> lên kiện hàng.</p>
          </template>
        </div>
        <router-link to="/orders" class="btn-sg mt-2">Về đơn hàng</router-link>
      </div>

      <div v-else-if="order && !submitted && canChooseRequestMode" class="row g-4 mt-1">
        <div class="col-lg-7">
          <!-- Method -->
          <div v-if="!isNotReceived" class="sg-card rt-block">
            <h6 class="rt-h"><span class="co-num">1</span> Hình thức trả hàng</h6>
            <div class="method-grid">
              <label class="method-opt" :class="{ active: form.method === 'SHIPPER' }">
                <input type="radio" value="SHIPPER" v-model="form.method" hidden>
                <div class="m-ic blue">01</div>
                <div><div class="m-name">Shipper tự lấy</div><div class="m-desc">Nhân viên giao hàng đến tận nơi lấy hàng.</div></div>
              </label>
              <label class="method-opt" :class="{ active: form.method === 'POST_OFFICE' }">
                <input type="radio" value="POST_OFFICE" v-model="form.method" hidden>
                <div class="m-ic warm">02</div>
                <div><div class="m-name">Gửi tại bưu cục</div><div class="m-desc">Bạn tự mang hàng đến bưu cục gần nhất.</div></div>
              </label>
            </div>

            <!-- Post office list -->
            <div v-if="form.method === 'POST_OFFICE'" class="po-list">
              <label v-for="p in postOffices" :key="p.id" class="po-item" :class="{ active: form.postOfficeId === p.id }">
                <input type="radio" :value="p.id" v-model="form.postOfficeId" hidden>
                <span class="po-index">•</span>
                <div class="flex-grow-1"><div class="po-name">{{ p.name }}</div><div class="po-addr">{{ p.address }}</div><div class="po-phone"><i class="bi bi-telephone"></i> {{ p.phone }}</div></div>
                <span class="po-check">Chọn</span>
              </label>
            </div>
          </div>

          <div v-else class="sg-card rt-block not-received-card">
            <h6 class="rt-h"><span class="co-num">1</span> Báo chưa nhận được hàng</h6>
            <div class="not-received-note">
              <i class="bi bi-truck"></i>
              <div><strong>Chưa nhận được kiện hàng</strong><p class="mb-0">Gửi thông báo để cửa hàng kiểm tra với đơn vị vận chuyển. Không cần mang sản phẩm đến bưu cục.</p></div>
            </div>
            <label class="co-label mt-3">Mô tả thêm (không bắt buộc)</label>
            <textarea v-model="form.reason" class="sg-input w-100" rows="3" placeholder="Ví dụ: đơn đã báo giao nhưng tôi chưa nhận được hàng..."></textarea>
          </div>

          <!-- Items + reason -->
          <div v-if="!isNotReceived" class="sg-card rt-block">
            <h6 class="rt-h"><span class="co-num">2</span> Sản phẩm & lý do</h6>
            <div class="ret-item" v-for="(it, i) in form.items" :key="i">
              <input type="checkbox" v-model="it.checked">
              <img :src="it.image_url || it.product?.image_url">
              <div class="flex-grow-1">
                <div class="ret-name">{{ it.product_name || it.product?.product_name }}</div>
                <div class="ret-attr">Size {{ it.size?.size_name || it.size }} · Đã mua {{ it.quantity }}</div>
                <div v-if="it.checked" class="ret-controls">
                  <label>Số lượng <input v-model.number="it.return_qty" type="number" min="1" :max="it.quantity"></label>
                  <select v-model="it.condition">
                    <option value="UNOPENED">Còn nguyên, chưa sử dụng</option>
                    <option value="OPENED">Đã mở / thử sản phẩm</option>
                    <option value="DAMAGED">Bị hư hỏng hoặc tai nạn</option>
                  </select>
                </div>
              </div>
              <div class="ret-price">{{ formatCurrency(it.unitPrice * (it.checked ? it.return_qty : 0)) }}</div>
            </div>
            <label class="co-label mt-3">Lý do trả hàng</label>
            <select v-model="form.reasonCode" class="sg-input w-100 mb-2">
              <option v-for="item in returnReasons" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
            <textarea v-model="form.reason" class="sg-input w-100" rows="3" placeholder="Mô tả lý do (sản phẩm lỗi, sai size, không đúng mô tả…)"></textarea>
          </div>
        </div>

        <!-- Summary -->
        <div class="col-lg-5">
          <div class="sg-card rt-summary">
            <h6 class="fw-bold mb-3">Thông tin hoàn trả</h6>
            <div class="sum-row"><span>Mã đơn gốc</span><strong>#{{ order.id }}</strong></div>
            <div class="sum-row"><span>Hình thức</span><strong>{{ isNotReceived ? 'Báo chưa nhận được hàng' : (form.method === 'SHIPPER' ? 'Shipper tự lấy' : 'Gửi bưu cục') }}</strong></div>
            <div class="sum-row" v-if="form.method === 'POST_OFFICE' && selectedPO"><span>Bưu cục</span><strong>{{ selectedPO.name }}</strong></div>
            <hr>
            <div class="sum-row total"><span>{{ isNotReceived && !isPaymentRecorded ? 'Số tiền cần hoàn (nếu đã thu)' : 'Hoàn tiền dự kiến' }}</span><strong>{{ formatCurrency(refundAmount) }}</strong></div>
            <div v-if="isNotReceived" class="rt-note">Không cần gửi trả hàng. Yêu cầu sẽ được chuyển cho cửa hàng kiểm tra hành trình giao.</div>
            <div v-else class="rt-note">Mã vận đơn sẽ được cấp sau khi gửi yêu cầu. Vui lòng ghi mã vận đơn và mã đơn lên kiện hàng.</div>
            <button class="btn-sg w-100 mt-3" :disabled="isSubmitting" @click="submit">
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
              {{ isSubmitting ? 'Đang gửi...' : (isNotReceived ? 'Báo chưa nhận được hàng' : 'Gửi yêu cầu trả hàng') }}
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="order && !submitted" class="sg-card rt-picker">
        <h5>Đơn hàng chưa đủ điều kiện trả</h5>
        <p class="text-secondary mb-0">Chỉ đơn đã giao thành công mới có thể trả sản phẩm; đơn đang giao có thể báo chưa nhận hàng.</p>
        <router-link to="/orders" class="btn-sg mt-3">Về đơn hàng</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.return-page { background: var(--sg-canvas); min-height: 100vh; }
.rt-title { font-weight: 900; font-size: 1.9rem; letter-spacing: -.02em; }
.empty { text-align: center; padding: 60px; }
.empty i { font-size: 3rem; color: var(--sg-muted); }
.rt-picker { max-width: 760px; margin: 24px auto; padding: 28px; }
.request-mode-card { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 18px 22px; margin: 18px 0 4px; border-radius: 14px; }
.request-mode-title { margin: 0; font-size: .95rem; font-weight: 800; color: var(--sg-ink); }
.request-mode-subtitle { margin: 5px 0 0; color: var(--sg-muted); font-size: .78rem; }
.request-mode-grid { display: grid; grid-template-columns: repeat(2, minmax(190px, 1fr)); gap: 10px; flex: 1; max-width: 650px; }
.request-mode-option { position: relative; display: flex; align-items: center; gap: 10px; min-width: 0; padding: 11px 30px 11px 11px; border: 1px solid var(--sg-line); border-radius: 10px; background: #fff; color: var(--sg-ink); text-align: left; cursor: pointer; transition: border-color .2s ease, background .2s ease, box-shadow .2s ease; }
.request-mode-option:hover { border-color: var(--sg-ink); background: #fafafa; }
.request-mode-option.active { border-color: var(--sg-ink); background: #f8fafc; box-shadow: 0 0 0 1px var(--sg-ink); }
.request-mode-option strong, .request-mode-option small { display: block; }
.request-mode-option strong { font-size: .78rem; line-height: 1.25; }
.request-mode-option small { margin-top: 3px; color: var(--sg-muted); font-size: .68rem; line-height: 1.25; }
.request-mode-icon { width: 30px; height: 30px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; background: #111827; color: #fff; font-size: .8rem; }
.request-mode-check { position: absolute; top: 9px; right: 9px; display: none; color: #16803a; font-size: .8rem; }
.request-mode-option.active .request-mode-check { display: block; }
.picker-list { display: grid; border: 1px solid var(--sg-line); }
.picker-row { border: 0; border-bottom: 1px solid var(--sg-line); background: #fff; padding: 15px 16px; display: grid; grid-template-columns: 1fr auto auto; gap: 24px; align-items: center; text-align: left; color: var(--sg-ink); }
.picker-row:last-child { border-bottom: 0; }
.picker-row:hover { background: #f8fafc; }
.picker-row small { display: block; color: var(--sg-muted); margin-top: 2px; }
.picker-row > span:last-child { font-size: .8rem; font-weight: 800; }
.empty-copy { border: 1px solid var(--sg-line); background: #f8fafc; padding: 22px; color: var(--sg-muted); }
.rt-block { padding: 22px; margin-bottom: 18px; }
.not-received-card { border-color: #93c5fd; background: #eff6ff; }
.not-received-note { display: flex; gap: 12px; align-items: flex-start; padding: 14px; border: 1px solid #bfdbfe; border-radius: 6px; background: #fff; color: var(--sg-ink-2); font-size: .86rem; }
.not-received-note > i { color: var(--sg-blue); font-size: 1.5rem; }
.rt-h { font-weight: 800; display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.co-num { width: 28px; height: 28px; border-radius: 50%; background: var(--sg-grad-primary); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: .9rem; }
.co-label { font-weight: 700; font-size: .82rem; color: var(--sg-ink-2); margin-bottom: 6px; display: block; }
.method-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.method-opt { display: flex; gap: 12px; align-items: center; border: 2px solid var(--sg-line); border-radius: 3px; padding: 16px; cursor: pointer; transition: .2s; }
.method-opt:hover { border-color: var(--sg-blue); }
.method-opt.active { border-color: var(--sg-blue); background: var(--sg-soft); }
.m-ic { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.2rem; flex-shrink: 0; }
.m-ic.blue { background: var(--sg-grad-primary); } .m-ic.warm { background: var(--sg-grad-warm); }
.m-name { font-weight: 800; } .m-desc { font-size: .78rem; color: var(--sg-muted); }
.po-list { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.po-item { display: flex; gap: 12px; align-items: center; border: 1.5px solid var(--sg-line); border-radius: 3px; padding: 14px; cursor: pointer; transition: .2s; }
.po-item:hover { border-color: var(--sg-blue); }
.po-item.active { border-color: var(--sg-blue); background: var(--sg-soft); }
.po-index { font-size: 1.3rem; color: var(--sg-orange); width: 16px; text-align: center; }
.po-name { font-weight: 800; } .po-addr { font-size: .82rem; color: var(--sg-ink-2); } .po-phone { font-size: .78rem; color: var(--sg-muted); }
.po-check { color: var(--sg-blue); opacity: 0; font-size: .76rem; font-weight: 800; }
.po-item.active .po-check { opacity: 1; }
.ret-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px dashed var(--sg-line); }
.ret-item input { width: 18px; height: 18px; accent-color: var(--sg-blue); }
.ret-item img { width: 48px; height: 48px; border-radius: 3px; object-fit: cover; background: var(--sg-canvas); mix-blend-mode: multiply; }
.ret-name { font-weight: 700; font-size: .9rem; } .ret-attr { font-size: .76rem; color: var(--sg-muted); }
.ret-controls { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.ret-controls label { font-size: .74rem; color: var(--sg-muted); display: flex; align-items: center; gap: 6px; }
.ret-controls input { width: 58px; border: 1px solid var(--sg-line); border-radius: 2px; padding: 4px 6px; }
.ret-controls select { border: 1px solid var(--sg-line); border-radius: 2px; padding: 4px 7px; font-size: .74rem; background: #fff; }
.ret-price { font-weight: 800; }
.rt-summary { padding: 22px; position: sticky; top: 90px; }
.sum-row { display: flex; justify-content: space-between; margin-bottom: 8px; color: var(--sg-ink-2); }
.sum-row.total { font-size: 1.15rem; color: var(--sg-ink); } .sum-row.total strong { color: var(--sg-blue-700); }
.rt-note { background: var(--sg-canvas); border-radius: 3px; padding: 12px; font-size: .8rem; color: var(--sg-muted); margin-top: 12px; }
.rt-success { text-align: center; padding: 40px; max-width: 560px; margin: 20px auto; }
.suc-check { width: 76px; height: 76px; margin: 0 auto 16px; border-radius: 50%; background: linear-gradient(135deg,#22c55e,#16a34a); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 2.4rem; }
.rt-track { background: var(--sg-canvas); border-radius: 3px; padding: 16px; margin: 16px 0; }
.rt-track span { display: block; font-size: .74rem; color: var(--sg-muted); } .rt-track strong { font-size: 1.3rem; letter-spacing: .04em; color: var(--sg-blue-700); }
.rt-guide { text-align: left; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px 16px; font-size: .86rem; color: var(--sg-ink-2); }
.rt-guide i { color: var(--sg-blue); margin-right: 6px; }
@media (max-width: 768px) {
  .request-mode-card { display: block; }
  .request-mode-grid { grid-template-columns: 1fr; max-width: none; margin-top: 14px; }
}
@media (max-width: 576px) { .method-grid { grid-template-columns: 1fr; } }
</style>
