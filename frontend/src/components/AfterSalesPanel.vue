<!-- Tiếp nhận trả hàng / hoàn kho cùng lịch sử tiền hoàn của một đơn, dùng chung hai phía. -->
<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { RotateCcw, X, RefreshCw, Package, Check, AlertTriangle, Wallet } from 'lucide-vue-next'
import { afterSalesApi, returnStatuses, formatAfterSalesMoney as money, validateInspection } from '../services/afterSales'

const props = defineProps({ orderId: [Number, String], orderCode: String, admin: Boolean, readOnly: Boolean, triggerLabel: String, startOpen: Boolean })
const emit = defineEmits(['updated', 'close'])
const panel = ref(null), opened = ref(false), data = ref(null), loading = ref(false), busy = ref(false), error = ref(''), success = ref('')
const request = reactive({ reason: '', quantities: {}, key: '' })
const inspections = reactive({}), reviews = reactive({}), refunds = reactive({})
const warehouse = reactive({ lines: [], reason: '', confirmed: false })
let previousFocus, previousOverflow, controller, generation = 0, timer
const pendingRefunds = computed(() => (data.value?.refunds || []).filter(r => r.status === 'PENDING'))
const requestedItems = computed(() => (data.value?.items || []).map(i => ({ order_detail_id: i.order_detail_id, quantity: Number(request.quantities[i.order_detail_id] || 0) })).filter(i => i.quantity > 0))
const requestReady = computed(() => requestedItems.value.length > 0 && request.reason.trim().length >= 5 && request.reason.length <= 500
  && (data.value?.items || []).every(i => Number.isSafeInteger(Number(request.quantities[i.order_detail_id] || 0)) && Number(request.quantities[i.order_detail_id] || 0) >= 0 && Number(request.quantities[i.order_detail_id] || 0) <= i.remaining_quantity))
const isOpenCase = r => ['REQUESTED', 'APPROVED', 'REFUND_PENDING'].includes(r.status)
const date = value => value ? new Date(value).toLocaleString('vi-VN') : '—'

function seedForms(snapshot) {
  if (!request.key) request.key = crypto.randomUUID()
  for (const item of snapshot.items) request.quantities[item.order_detail_id] ??= 0
  if (!warehouse.lines.length) warehouse.lines = snapshot.items.map(i => ({ ...i, expected_quantity: i.quantity, good_quantity: i.quantity, damaged_quantity: 0 }))
  for (const r of snapshot.returns) {
    reviews[r.id] ??= ''
    inspections[r.id] ??= { note: '', confirmed: false, refund_shipping: false, lines: r.items.map(i => ({ ...i, return_item_id: i.id, expected_quantity: i.requested_quantity, good_quantity: i.requested_quantity, damaged_quantity: 0 })) }
  }
  for (const r of snapshot.refunds) refunds[r.id] ??= { reference: '', note: '', confirmed: false }
}
async function load(silent = false) {
  const current = ++generation
  controller?.abort(); controller = new AbortController()
  if (!silent) loading.value = true
  try {
    const snapshot = await afterSalesApi.detail(props.orderId, { signal: controller.signal })
    if (current !== generation) return
    data.value = snapshot; seedForms(snapshot)
  } catch (e) { if (current === generation && e.name !== 'AbortError') error.value = e.message || 'Chưa tải được thông tin hậu mãi.' }
  finally { if (current === generation) loading.value = false }
}
async function open() {
  if (opened.value) return
  previousFocus = document.activeElement; opened.value = true; error.value = ''; success.value = ''
  previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'
  await nextTick(); panel.value?.showModal(); await load()
  clearInterval(timer); timer = setInterval(() => { if (!busy.value && !document.hidden) load(true) }, 15000)
}
function close() {
  if (busy.value) return
  clearInterval(timer); controller?.abort(); generation++; loading.value = false
  panel.value?.close(); opened.value = false; previousFocus?.focus?.(); emit('close')
  document.body.style.overflow = previousOverflow ?? ''; previousOverflow = undefined
}
async function mutate(action, message, after) {
  if (busy.value) return
  busy.value = true; error.value = ''; success.value = ''
  try { await action(); after?.(); success.value = message; await load(true); emit('updated') }
  catch (e) { error.value = e.message || 'Chưa lưu được thao tác. Vui lòng kiểm tra trạng thái mới nhất trước khi thử lại.'; await load(true) }
  finally { busy.value = false }
}
function submitRequest() {
  if (!requestReady.value) return
  const items = requestedItems.value
  if (items.some(i => !Number.isSafeInteger(i.quantity) || i.quantity > Number(data.value.items.find(row => row.order_detail_id === i.order_detail_id)?.remaining_quantity))) { error.value = 'Số lượng trả không hợp lệ.'; return }
  return mutate(() => afterSalesApi.request(props.orderId, { items, reason: request.reason.trim(), request_key: request.key }), 'Yêu cầu đã được gửi. Cửa hàng sẽ kiểm tra và phản hồi.', () => { request.reason = ''; request.key = crypto.randomUUID(); Object.keys(request.quantities).forEach(k => request.quantities[k] = 0) })
}
function review(r, decision) {
  if (decision === 'REJECT' && reviews[r.id].trim().length < 5) { error.value = 'Nhập lý do từ chối để khách biết cách xử lý.'; return }
  mutate(() => afterSalesApi.review(r.id, { decision, note: reviews[r.id] }), decision === 'APPROVE' ? 'Đã duyệt tiếp nhận. Chờ hàng thực tế về để kiểm nhận.' : 'Đã lưu lý do từ chối.')
}
function receive(r) {
  const f = inspections[r.id]
  if (!f.confirmed || !validateInspection(f.lines) || f.note.trim().length < 5) { error.value = 'Kiểm tra số thực nhận, nhập ghi chú và xác nhận đã kiểm hàng.'; return }
  mutate(() => afterSalesApi.receive(r.id, { items: f.lines.map(i => ({ return_item_id: i.id, good_quantity: Number(i.good_quantity), damaged_quantity: Number(i.damaged_quantity) })), note: f.note, refund_shipping: f.refund_shipping, confirm_received: true }), 'Đã kiểm nhận, cập nhật tồn và điều chỉnh doanh thu. Khoản cần hoàn tiền được theo dõi riêng.')
}
function rejectAfterInspection(r) { reviews[r.id] = inspections[r.id].note; review(r, 'REJECT') }
function closeWarehouse() {
  if (!warehouse.confirmed || !validateInspection(warehouse.lines, true) || warehouse.reason.trim().length < 5) { error.value = 'Cần kiểm nhận đủ kiện, nhập lý do và xác nhận hàng đã về.'; return }
  mutate(() => afterSalesApi.warehouse(props.orderId, { items: warehouse.lines.map(i => ({ order_detail_id: i.order_detail_id, good_quantity: Number(i.good_quantity), damaged_quantity: Number(i.damaged_quantity) })), reason: warehouse.reason, confirm_received: true }), 'Đã hoàn tồn hàng tốt và đóng đơn giao không thành công.')
}
function confirmRefund(r) {
  const f = refunds[r.id]
  if (!f.confirmed || f.reference.trim().length < 3 || f.note.trim().length < 5) { error.value = 'Cần chứng từ, ghi chú và xác nhận tiền đã thực sự được hoàn.'; return }
  mutate(() => afterSalesApi.refund(props.orderId, r.id, { reference: f.reference.trim(), note: f.note.trim(), confirm_paid: true }), 'Đã lưu đối soát khoản hoàn. Lịch sử và trạng thái yêu cầu đã cập nhật.')
}
watch(() => props.orderId, () => { data.value = null; request.key = ''; warehouse.lines = []; if (opened.value) load() })
watch(() => props.startOpen, value => { if (value) open() }, { immediate: true })
onBeforeUnmount(() => { clearInterval(timer); controller?.abort(); generation++; panel.value?.close(); if (previousOverflow !== undefined) document.body.style.overflow = previousOverflow })
defineExpose({ open })
</script>

<template>
  <button v-if="!startOpen" type="button" class="as-trigger" @click="open"><RotateCcw :size="16" :stroke-width="1.6" />{{ triggerLabel || (admin ? 'Trả hàng, hoàn kho & tiền hoàn' : 'Yêu cầu trả hàng') }}</button>
  <Teleport to="body">
    <dialog v-if="opened" ref="panel" class="as-dialog" :aria-label="admin ? 'Xử lý hậu mãi đơn hàng' : 'Trả hàng và hỗ trợ'" :aria-busy="busy" @cancel.prevent="close" @click="e => { if (e.target === panel) close() }">
      <header class="as-head"><div><span class="as-eyebrow">SHOEGROUP / SAU MUA HÀNG</span><h2>{{ admin ? (data?.can_warehouse || data?.warehouse_closed ? 'Kiểm nhận & hoàn kho' : 'Hỗ trợ sau bán & tiền hoàn') : 'Trả hàng & hỗ trợ' }}</h2><p>Đơn {{ orderCode || `#${orderId}` }}</p></div><button type="button" class="as-icon-btn" aria-label="Đóng thông tin hậu mãi" :disabled="busy" @click="close"><X :size="20" /></button></header>
      <div class="as-body">
        <div class="as-tools"><span>Thông tin đồng bộ từ cửa hàng</span><button type="button" :disabled="loading || busy" @click="error = ''; load()"><RefreshCw :size="14" />Làm mới</button></div>
        <p v-if="error" class="as-note error" role="alert">{{ error }}</p>
        <p v-if="success" class="as-note success" role="status">{{ success }}</p>
        <p v-if="loading" class="as-note" role="status">Đang tải thông tin…</p>
        <template v-if="data">
          <p v-if="readOnly" class="as-note">Tài khoản này có quyền xem. Quản trị viên xử lý kiểm nhận và đối soát khoản hoàn.</p>
          <section v-if="data.can_warehouse && admin && !readOnly" class="as-section as-warehouse">
            <div class="as-section-title"><Package :size="19" /><h3>Kiểm nhận kiện giao không thành công</h3></div>
            <p>Chỉ thực hiện khi đã nhận lại kiện hàng. Hàng tốt được cộng tồn bán; hàng hỏng được ghi riêng. Thao tác này đóng đơn và giữ lịch sử.</p>
            <p v-if="data.already_restocked" class="as-note">Đơn cũ đã từng hoàn tồn. Hệ thống sẽ đối chiếu dấu vết và không cộng lại lần nữa.</p>
            <div v-for="line in warehouse.lines" :key="line.order_detail_id" class="as-inspection-row">
              <div><strong>{{ line.name }}</strong><small>{{ line.color }} / {{ line.size }} · Đã xuất {{ line.quantity }}</small></div>
              <label>Hàng tốt<input v-model.number="line.good_quantity" type="number" min="0" :max="line.quantity" step="1" :aria-label="`Hàng tốt hoàn kho dòng ${line.order_detail_id}`" /></label>
              <label>Hàng hỏng<input v-model.number="line.damaged_quantity" type="number" min="0" :max="line.quantity" step="1" :aria-label="`Hàng hỏng hoàn kho dòng ${line.order_detail_id}`" /></label>
            </div>
            <label class="as-field">Lý do đóng đơn / kết quả kiểm hàng<textarea v-model="warehouse.reason" maxlength="500" rows="2" placeholder="Ví dụ: Khách từ chối nhận, kiện đã về và được kiểm tra…" /></label>
            <label class="as-check"><input v-model="warehouse.confirmed" type="checkbox" />Tôi đã nhận và kiểm tra đủ số hàng trong kiện</label>
            <button type="button" class="as-btn primary" :disabled="busy || !warehouse.confirmed || !validateInspection(warehouse.lines, true) || warehouse.reason.trim().length < 5" @click="closeWarehouse">Hoàn kho và đóng đơn</button>
          </section>

          <section v-if="pendingRefunds.length" class="as-section">
            <div class="as-section-title"><Wallet :size="19" /><h3>Khoản chờ hoàn tiền</h3></div>
            <p>Hoàn tồn và hoàn tiền được xử lý riêng. Khoản dưới đây chưa được ghi nhận là đã trả cho khách.</p>
            <article v-for="r in pendingRefunds" :key="r.id" class="as-refund">
              <div class="as-case-head"><strong>{{ money(r.amount) }}</strong><span class="as-badge REFUND_PENDING">Chờ hoàn tiền</span></div>
              <template v-if="admin && !readOnly">
                <p class="as-note">Thực hiện hoàn tiền qua ngân hàng hoặc tiền mặt trước, sau đó lưu chứng từ đối soát tại đây.</p>
                <label class="as-field">Mã giao dịch / chứng từ<input v-model="refunds[r.id].reference" maxlength="100" :aria-label="`Chứng từ hoàn tiền ${r.id}`" /></label>
                <label class="as-field">Ghi chú đối soát<textarea v-model="refunds[r.id].note" maxlength="500" rows="2" :aria-label="`Ghi chú hoàn tiền ${r.id}`" /></label>
                <label class="as-check"><input v-model="refunds[r.id].confirmed" type="checkbox" />Tôi đã hoàn tiền thực tế và kiểm tra chứng từ</label>
                <button type="button" class="as-btn primary" :disabled="busy || !refunds[r.id].confirmed || refunds[r.id].reference.trim().length < 3 || refunds[r.id].note.trim().length < 5" @click="confirmRefund(r)">Lưu xác nhận đã hoàn tiền</button>
              </template>
            </article>
          </section>

          <section v-if="data.can_request && !readOnly" class="as-section">
            <h3>{{ admin ? 'Tạo yêu cầu theo phản ánh của khách' : 'Chọn hàng muốn trả' }}</h3>
            <p>Chọn đúng màu, size và số lượng. Yêu cầu cần được cửa hàng duyệt và kiểm nhận trước khi hoàn tồn, hoàn tiền.</p>
            <div v-for="line in data.items.filter(i => i.remaining_quantity > 0)" :key="line.order_detail_id" class="as-request-row">
              <div><strong>{{ line.name }}</strong><small>{{ line.color }} / {{ line.size }} · Còn được yêu cầu {{ line.remaining_quantity }}</small></div>
              <label>Số lượng<input v-model.number="request.quantities[line.order_detail_id]" type="number" min="0" :max="line.remaining_quantity" step="1" :aria-label="`Số lượng trả dòng ${line.order_detail_id}`" /></label>
            </div>
            <label class="as-field">Lý do trả hàng<textarea v-model="request.reason" maxlength="500" rows="3" placeholder="Mô tả vấn đề hoặc nhu cầu đổi trả của bạn…" /></label>
            <button type="button" class="as-btn primary" :disabled="busy || !requestReady" @click="submitRequest">{{ busy ? 'Đang gửi…' : 'Gửi yêu cầu trả hàng' }}</button>
          </section>

          <section v-if="data.returns.length" class="as-section">
            <h3>Lịch sử yêu cầu</h3>
            <article v-for="r in data.returns" :key="r.id" class="as-case">
              <div class="as-case-head"><div><strong>Phiếu #{{ r.id }}</strong><small>{{ date(r.created_at) }}</small></div><span class="as-badge" :class="r.status">{{ returnStatuses[r.status] || r.status }}</span></div>
              <p>{{ r.reason }}</p>
              <ul class="as-case-lines"><li v-for="i in r.items" :key="i.id"><span>{{ i.name }} · {{ i.color }} / {{ i.size }}</span><strong>{{ i.requested_quantity }} sản phẩm</strong><small v-if="r.received_at">Đã nhận: {{ i.good_quantity }} tốt · {{ i.damaged_quantity }} hỏng</small></li></ul>
              <p v-if="r.refund_amount > 0">Khoản hoàn được duyệt: <strong>{{ money(r.refund_amount) }}</strong><span v-if="r.shipping_refund_amount > 0"> · Gồm phí giao {{ money(r.shipping_refund_amount) }}</span></p>
              <template v-if="admin && !readOnly && r.status === 'REQUESTED'">
                <label class="as-field">Phản hồi của cửa hàng<textarea v-model="reviews[r.id]" maxlength="500" rows="2" :aria-label="`Phản hồi phiếu ${r.id}`" /></label>
                <div class="as-actions"><button type="button" class="as-btn primary" :disabled="busy" @click="review(r, 'APPROVE')"><Check :size="16" />Duyệt tiếp nhận</button><button type="button" class="as-btn" :disabled="busy" @click="review(r, 'REJECT')">Từ chối có lý do</button></div>
              </template>
              <template v-if="admin && !readOnly && r.status === 'APPROVED'">
                <h4>Kiểm nhận thực tế</h4><p>Nhập số đã nhận. Phần chưa nhận không được cộng kho hoặc tính hoàn tiền trong phiếu này.</p>
                <div v-for="line in inspections[r.id].lines" :key="line.id" class="as-inspection-row">
                  <div><strong>{{ line.name }}</strong><small>{{ line.color }} / {{ line.size }} · Yêu cầu {{ line.requested_quantity }}</small></div>
                  <label>Hàng tốt<input v-model.number="line.good_quantity" type="number" min="0" :max="line.requested_quantity" step="1" :aria-label="`Hàng tốt phiếu dòng ${line.id}`" /></label>
                  <label>Hàng hỏng<input v-model.number="line.damaged_quantity" type="number" min="0" :max="line.requested_quantity" step="1" :aria-label="`Hàng hỏng phiếu dòng ${line.id}`" /></label>
                </div>
                <label class="as-field">Kết quả kiểm nhận<textarea v-model="inspections[r.id].note" maxlength="500" rows="2" :aria-label="`Kết quả kiểm nhận phiếu ${r.id}`" /></label>
                <label class="as-check"><input v-model="inspections[r.id].refund_shipping" type="checkbox" />Hoàn cả phí giao hàng khi đã nhận lại toàn bộ hàng</label>
                <label class="as-check"><input v-model="inspections[r.id].confirmed" type="checkbox" />Tôi đã kiểm hàng và xác nhận các số lượng trên</label>
                <button type="button" class="as-btn primary" :disabled="busy || !inspections[r.id].confirmed || !validateInspection(inspections[r.id].lines) || inspections[r.id].note.trim().length < 5" @click="receive(r)">Lưu kiểm nhận & tính tiền hoàn</button>
                <p>Trường hợp không đủ điều kiện và cửa hàng không nhận lại hàng, ghi rõ lý do ở kết quả kiểm nhận rồi chọn từ chối. Hàng sẽ không được nhập kho hoặc tính tiền hoàn.</p>
                <button type="button" class="as-btn" :disabled="busy || inspections[r.id].note.trim().length < 5" @click="rejectAfterInspection(r)">Không tiếp nhận — từ chối có lý do</button>
              </template>
              <ol class="as-timeline"><li v-for="(e, index) in r.events" :key="index"><span>{{ returnStatuses[e.status] || e.status }}</span><small>{{ date(e.created_at) }}</small><p>{{ e.note }}</p></li></ol>
            </article>
          </section>
          <p v-if="data.warehouse_closed" class="as-note">Kiện đã được kiểm nhận và đóng đơn. Tồn hàng tốt và hàng hỏng đã được ghi riêng; không thể hoàn kho lần nữa.</p>
          <p v-else-if="!data.can_request && !data.returns.length && !pendingRefunds.length && !data.can_warehouse" class="as-note">Chưa có yêu cầu hậu mãi. Bạn có thể liên hệ cửa hàng nếu cần đối soát điều kiện của đơn.</p>
          <div v-if="data.refunds.some(r => r.status === 'SUCCESS')" class="as-section"><h3>Khoản đã hoàn</h3><div v-for="r in data.refunds.filter(r => r.status === 'SUCCESS')" :key="r.id" class="as-completed-refund"><Check :size="17" /><strong>{{ money(r.amount) }}</strong><span>{{ date(r.completed_at) }}</span><span v-if="admin && r.reference">{{ r.reference }}</span></div></div>
          <p class="as-help"><AlertTriangle :size="15" />Cần hỗ trợ thêm? <a href="https://zalo.me/0375990871" target="_blank" rel="noopener noreferrer">Liên hệ cửa hàng qua Zalo</a></p>
        </template>
      </div>
      <footer class="as-footer"><span>{{ busy ? 'Đang lưu thao tác…' : 'Mọi thao tác được lưu lịch sử theo đơn hàng' }}</span><button type="button" class="as-btn" :disabled="busy" @click="close">Đóng</button></footer>
    </dialog>
  </Teleport>
</template>

<style scoped>
.as-trigger,.as-btn,.as-icon-btn,.as-tools button{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:inherit;cursor:pointer;transition:background .18s,border-color .18s}
.as-trigger{min-height:40px;padding:9px 13px;color:#26303c;border:1px solid #dce1e7;border-radius:8px;background:#fff;font-size:12px;font-weight:600}.as-trigger:hover{border-color:#d4001a;color:#d4001a}
.as-dialog{width:min(800px,calc(100vw - 24px));max-height:calc(100dvh - 28px);margin:auto;padding:0;border:1px solid #e2e6ec;border-radius:18px;background:#fff;color:#18202e;box-shadow:0 24px 100px #0f172a30;overflow:hidden}.as-dialog[open]{display:flex;flex-direction:column}.as-dialog::backdrop{background:#0f172a66;backdrop-filter:blur(4px)}
.as-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding:24px;border-bottom:1px solid #e8ebef}.as-eyebrow{font-size:9px;letter-spacing:.14em;font-weight:700;color:#d4001a}.as-head h2{margin:7px 0;font-family:inherit;font-size:23px;font-weight:700;line-height:1.4}.as-head p{margin:0;font-size:12px;color:#6b7280}.as-icon-btn{width:36px;height:36px;flex-shrink:0;border:1px solid #e5e7eb;background:#fff;border-radius:9px}
.as-body{overflow:auto;padding:20px 24px 28px;overscroll-behavior:contain}.as-tools{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:11px;color:#7a8290;margin-bottom:16px}.as-tools button{background:#fff;border:0;color:#596274;font-size:11px}.as-note{padding:12px 14px;font-size:12px;line-height:1.8;background:#f6f7f9;border:1px solid #e5e8ee;border-radius:9px;margin:10px 0}.as-note.error{background:#fff5f6;border-color:#ffd9df;color:#a52b42}.as-note.success{background:#f1faf4;border-color:#d2eadb;color:#286c42}
.as-section{margin:18px 0;padding:18px;border:1px solid #e4e8ed;border-radius:12px}.as-section-title{display:flex;align-items:center;gap:9px}.as-section h3{font-family:inherit;font-weight:700;font-size:15px;line-height:1.6;margin:0 0 8px}.as-section h4{margin:18px 0 8px;font-size:13px}.as-section p{font-size:12px;line-height:1.8;color:#667080;margin:8px 0 14px}.as-warehouse{background:#fafbfc}.as-field{display:grid;gap:7px;font-size:12px;font-weight:600;margin:14px 0}.as-field input,.as-field textarea,.as-inspection-row input,.as-request-row input{width:100%;padding:10px 11px;border:1px solid #dce1e8;border-radius:8px;font-family:inherit;font-weight:400;font-size:13px;line-height:1.5;background:#fff;color:#172033;outline:none;box-sizing:border-box}.as-field textarea{resize:vertical;min-height:66px}.as-field :focus,.as-inspection-row input:focus,.as-request-row input:focus{border-color:#d4001a;box-shadow:0 0 0 3px #d4001a0b}
.as-request-row,.as-inspection-row{display:grid;grid-template-columns:minmax(0,1fr) 100px;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid #edf0f3}.as-inspection-row{grid-template-columns:minmax(0,1fr) 90px 90px}.as-request-row strong,.as-inspection-row strong{display:block;font-size:12px;line-height:1.6}.as-request-row small,.as-inspection-row small{display:block;color:#7b8290;font-size:11px;margin-top:4px}.as-request-row label,.as-inspection-row label{font-size:10px;color:#687181;display:grid;gap:4px}.as-check{display:flex;align-items:flex-start;gap:9px;font-size:12px;line-height:1.7;color:#536071;margin:13px 0}.as-check input{margin-top:4px;accent-color:#d4001a;flex:0 0 auto}
.as-btn{border:1px solid #dce1e7;border-radius:8px;background:#fff;color:#26303c;padding:10px 14px;min-height:41px;font-size:12px;font-weight:600}.as-btn.primary{background:#d4001a;border-color:#d4001a;color:#fff}.as-btn:hover{background:#f7f8fa}.as-btn.primary:hover{background:#b90018}.as-btn:disabled,.as-icon-btn:disabled{cursor:wait;opacity:.45}.as-actions{display:flex;gap:8px;flex-wrap:wrap}.as-btn:focus-visible,.as-trigger:focus-visible,.as-icon-btn:focus-visible{outline:2px solid #d4001a;outline-offset:3px}
.as-case{padding:16px;margin-top:12px;border:1px solid #e6e9ee;border-radius:10px}.as-case-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.as-case-head strong{font-size:13px}.as-case-head small{display:block;margin-top:5px;font-size:10px;color:#89909b}.as-badge{padding:5px 9px;border:1px solid #e2e6eb;background:#f6f7f9;color:#647083;border-radius:20px;font-size:10px;white-space:nowrap}.as-badge.REQUESTED,.as-badge.REFUND_PENDING{background:#fff8ed;border-color:#f3dfb9;color:#91651d}.as-badge.COMPLETED{background:#eff9f3;border-color:#cfe8d9;color:#287c48}.as-badge.REJECTED{background:#fff4f5;color:#a64657;border-color:#f4dce1}.as-case-lines{margin:10px 0;padding:0;list-style:none}.as-case-lines li{display:flex;gap:5px 12px;justify-content:space-between;flex-wrap:wrap;padding:8px 0;border-top:1px solid #f0f2f5;font-size:11px}.as-case-lines small{width:100%;color:#7b8290}.as-timeline{list-style:none;margin:18px 0 0;padding:0 0 0 13px;border-left:1px solid #e1e6ec}.as-timeline li{position:relative;margin:0 0 14px;padding-left:9px;font-size:11px}.as-timeline li::before{content:'';position:absolute;width:7px;height:7px;border-radius:50%;background:#b6bec9;left:-17px;top:4px}.as-timeline span{font-weight:600}.as-timeline small{display:block;color:#9aa1ad;font-size:10px;margin-top:3px}.as-timeline p{font-size:11px;margin:4px 0 0}.as-refund{padding:14px 0;border-top:1px solid #e6e9ee}.as-completed-refund{display:flex;align-items:center;gap:9px;flex-wrap:wrap;font-size:12px;padding:9px 0;color:#32714b}.as-completed-refund span{font-size:10px;color:#7c8692}.as-help{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;font-size:11px;color:#78818e}.as-help a{color:#a82c40;text-decoration:underline}.as-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 24px;border-top:1px solid #e6e9ef;background:#fafbfc}.as-footer>span{font-size:10px;color:#828b98}
@media(max-width:540px){.as-head{padding:18px}.as-head h2{font-size:20px}.as-body{padding:16px}.as-section{padding:13px}.as-inspection-row{grid-template-columns:1fr 1fr}.as-inspection-row>div{grid-column:1/-1}.as-request-row{grid-template-columns:minmax(0,1fr) 76px}.as-case{padding:12px}.as-footer{padding:12px 16px}.as-case-head{flex-wrap:wrap}.as-btn.primary{width:100%}}
</style>
