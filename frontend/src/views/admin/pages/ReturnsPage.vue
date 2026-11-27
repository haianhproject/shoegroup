<!-- Không gian xử lý yêu cầu trả hàng, kiện về kho, khoản chờ hoàn và hàng hỏng. -->
<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { RotateCcw, PackageCheck, Wallet, TriangleAlert, RefreshCw, ArrowUpRight } from 'lucide-vue-next'
import AfterSalesPanel from '../../../components/AfterSalesPanel.vue'
import OrderReturnForm from '../../../components/OrderReturnForm.vue'
import { useRoute } from 'vue-router'
import AdminDrawer from '../components/AdminDrawer.vue'
import { afterSalesApi, returnStatuses, formatAfterSalesMoney as money } from '../../../services/afterSales'
import { formatOrderCode } from '../../../services/orderCode'
import { db, refreshOrders, notify } from '../adminStore'
const route = useRoute()
const tab = ref('NEW'), scope = ref('ALL'), search = ref(''), cases = ref([]), damaged = ref([]), history = ref([])
const loading = ref(false), error = ref(''), selected = ref(null)
const repair = reactive({ open: false, item: null, action: 'REPAIR', quantity: 1, note: '', confirmed: false, key: '', busy: false, error: '' })
let timer, searchTimer, generation = 0
const code = order => formatOrderCode(order.order_id ?? order.id, order.order_date ?? order.created_at ?? order.date)
const refundOrders = computed(() => db.orders.filter(o => Number(o.pending_refund_amount) > 0))
const matched = order => !search.value.trim() || `${code(order)} ${order.customer_name || ''} ${order.id || ''}`.toLowerCase().includes(search.value.trim().toLowerCase())
const refunds = computed(() => refundOrders.value.filter(matched))
const totalDamaged = computed(() => damaged.value.reduce((sum, i) => sum + Number(i.damaged_quantity), 0))
const movements = { RETURN_RECEIVED: 'Nhận hàng trả', WAREHOUSE_RECEIVED: 'Nhận kiện hoàn kho', DAMAGE_REPAIRED: 'Sửa đạt, đưa về bán', DAMAGE_WRITEOFF: 'Ghi giảm hàng hỏng' }
const date = value => value ? new Date(value).toLocaleString('vi-VN') : '—'
async function reload() {
  const current = ++generation; loading.value = true; error.value = ''
  const results = await Promise.allSettled([afterSalesApi.list(scope.value, search.value.trim()), afterSalesApi.damaged(), refreshOrders()])
  if (current !== generation) return
  if (results[0].status === 'fulfilled') cases.value = results[0].value
  else error.value = results[0].reason.message || 'Chưa tải được yêu cầu trả hàng.'
  if (results[1].status === 'fulfilled') { damaged.value = results[1].value.items; history.value = results[1].value.history }
  else error.value ||= results[1].reason.message || 'Chưa tải được thông tin hàng hỏng.'
  if (results[2].status === 'rejected') error.value ||= 'Danh sách đơn hàng chưa đồng bộ. Vui lòng thử tải lại.'
  loading.value = false
}
function show(order) { selected.value = { id: order.order_id ?? order.id, code: order.order_code || code(order) } }
function openRepair(item) { Object.assign(repair, { open: true, item, action: 'REPAIR', quantity: 1, note: '', confirmed: false, key: crypto.randomUUID(), busy: false, error: '' }) }
async function saveRepair() {
  if (repair.busy || !repair.confirmed) return
  if (!Number.isSafeInteger(Number(repair.quantity)) || repair.quantity < 1 || repair.quantity > repair.item.damaged_quantity || repair.note.trim().length < 5) { repair.error = 'Kiểm tra số lượng và nhập ghi chú ít nhất 5 ký tự.'; return }
  repair.busy = true; repair.error = ''
  try {
    await afterSalesApi.resolve(repair.item.id, { action: repair.action, quantity: Number(repair.quantity), note: repair.note.trim(), request_key: repair.key, confirm_checked: true })
    repair.open = false; notify('Đã lưu xử lý hàng hỏng và cập nhật lịch sử kho.', 'success'); await reload()
  } catch (e) { repair.error = e.message || 'Chưa lưu được xử lý hàng hỏng.'; await reload() }
  finally { repair.busy = false }
}
watch(scope, reload)
watch(search, () => { clearTimeout(searchTimer); searchTimer = setTimeout(reload, 300) })
onMounted(() => { reload(); timer = setInterval(() => { if (!document.hidden && !selected.value && !repair.open) reload() }, 30000) })
onBeforeUnmount(() => { generation++; clearInterval(timer); clearTimeout(searchTimer) })
</script>

<template>
  <div class="returns-page">
    <div class="returns-heading"><div><span class="returns-eyebrow">CHĂM SÓC SAU BÁN HÀNG</span><h1>Trả hàng & tiền hoàn</h1><p>Kiểm nhận đúng hàng, theo dõi đúng tiền và giữ trọn lịch sử.</p></div><button type="button" class="btn btn-light border" :disabled="loading" @click="reload"><RefreshCw :size="15" />{{ loading ? 'Đang đồng bộ…' : 'Làm mới' }}</button></div>
    <div class="returns-stats" role="group" aria-label="Nhóm xử lý hậu mãi">
      <button type="button" :class="{ active: tab === 'NEW' }" :aria-pressed="tab === 'NEW'" @click="tab = 'NEW'"><PackageCheck :size="21" :stroke-width="1.5" /><span>Tiếp nhận qua Zalo<strong>Nhận trả</strong></span></button>
      <button type="button" :class="{ active: tab === 'REQUESTS' }" :aria-pressed="tab === 'REQUESTS'" @click="tab = 'REQUESTS'"><RotateCcw :size="21" :stroke-width="1.5" /><span>Lịch sử phiếu trả<strong>{{ cases.length }}</strong></span></button>
      <button type="button" :class="{ active: tab === 'REFUNDS' }" :aria-pressed="tab === 'REFUNDS'" @click="tab = 'REFUNDS'"><Wallet :size="21" :stroke-width="1.5" /><span>Đơn chờ hoàn tiền<strong>{{ refundOrders.length }}</strong></span></button>
      <button type="button" :class="{ active: tab === 'DAMAGED' }" :aria-pressed="tab === 'DAMAGED'" @click="tab = 'DAMAGED'"><TriangleAlert :size="21" :stroke-width="1.5" /><span>Hàng hỏng chưa xử lý<strong>{{ totalDamaged }} <small>đôi</small></strong></span></button>
    </div>
    <p v-if="error" class="returns-error" role="alert">{{ error }}</p>
    <section class="admin-surface returns-surface">
      <OrderReturnForm v-if="tab === 'NEW'" :initial-code="String(route.query.order || '')" @updated="reload" @history="show" />
      <div v-if="tab !== 'NEW'" class="returns-toolbar"><h2>{{ { REQUESTS: 'Phiếu trả hàng', REFUNDS: 'Khoản cần đối soát', DAMAGED: 'Tồn hàng hỏng' }[tab] }}</h2><div v-if="tab === 'REQUESTS'" class="returns-scope"><button v-for="s in [{ key: 'OPEN', label: 'Đang xử lý' }, { key: 'CLOSED', label: 'Đã kết thúc' }, { key: 'ALL', label: 'Tất cả' }]" :key="s.key" type="button" :class="{ active: scope === s.key }" :aria-pressed="scope === s.key" @click="scope = s.key">{{ s.label }}</button></div><input v-if="tab !== 'DAMAGED'" v-model="search" type="search" maxlength="100" placeholder="Tìm mã đơn, phiếu hoặc khách…" aria-label="Tìm dữ liệu hậu mãi" /></div>
      <div v-if="tab !== 'NEW' && loading && !cases.length" class="returns-empty" role="status">Đang tải thông tin…</div>
      <template v-else-if="tab === 'REQUESTS'">
        <div v-if="!cases.length" class="returns-empty"><RotateCcw :size="30" :stroke-width="1.2" /><strong>Chưa có phiếu phù hợp</strong><span>Phiếu nhận trả và kết quả hoàn tiền được lưu tại đây.</span></div>
        <div v-else class="returns-table-wrap"><table class="returns-table"><thead><tr><th>Phiếu / Đơn hàng</th><th>Khách hàng & lý do</th><th>Trạng thái</th><th>Khoản hoàn</th><th>Thao tác</th></tr></thead><tbody><tr v-for="r in cases" :key="r.id"><td data-label="Phiếu / Đơn hàng"><strong>#{{ r.id }}</strong><small>{{ code(r) }}</small><small>{{ date(r.created_at) }}</small></td><td data-label="Khách hàng & lý do"><strong>{{ r.customer_name || 'Khách hàng' }}</strong><small>{{ r.reason }}</small><small v-for="(i, index) in r.items" :key="index">{{ i.name }} · {{ i.color }} / {{ i.size }} · {{ i.good_quantity + i.damaged_quantity }} đã trả <span v-if="i.damaged_quantity">({{ i.damaged_quantity }} hỏng)</span></small></td><td data-label="Trạng thái"><span class="returns-status" :class="r.status">{{ returnStatuses[r.status] }}</span></td><td class="returns-amount" data-label="Khoản hoàn">{{ r.refund_amount > 0 ? money(r.refund_amount) : 'Chưa phát sinh' }}</td><td data-label="Thao tác"><button type="button" class="returns-open" :aria-label="`Mở phiếu trả hàng ${r.id}`" @click="show(r)">Xử lý <ArrowUpRight :size="14" /></button></td></tr></tbody></table></div>
      </template>
      <template v-else-if="tab === 'REFUNDS'">
        <p class="returns-explanation">Chỉ lưu xác nhận sau khi đã thực sự hoàn tiền và có chứng từ đối soát. Đơn còn nghĩa vụ hoàn tiền vẫn ở hàng chờ.</p>
        <div v-if="!refunds.length" class="returns-empty"><strong>Không có đơn cần xử lý trong nhóm này</strong></div>
        <div v-else class="returns-table-wrap"><table class="returns-table"><thead><tr><th>Đơn hàng</th><th>Khách hàng</th><th>Trạng thái</th><th>Cần hoàn</th><th>Thao tác</th></tr></thead><tbody><tr v-for="o in refunds" :key="o.id"><td data-label="Đơn hàng"><strong>{{ code(o) }}</strong><small>{{ date(o.date) }}</small></td><td data-label="Khách hàng">{{ o.customer_name }}</td><td data-label="Trạng thái">{{ o.status }}</td><td class="returns-amount" data-label="Giá trị">{{ money(o.pending_refund_amount) }}</td><td data-label="Thao tác"><button type="button" class="returns-open" :aria-label="`Mở hậu mãi đơn ${code(o)}`" @click="show(o)">Mở đơn <ArrowUpRight :size="14" /></button></td></tr></tbody></table></div>
      </template>
      <template v-else-if="tab === 'DAMAGED'">
        <p class="returns-explanation">Hàng hỏng được giữ riêng và không xuất hiện trong tồn có thể bán. Sau khi xử lý, chọn đưa về bán hoặc ghi giảm có lý do.</p>
        <div v-if="!damaged.length" class="returns-empty"><PackageCheck :size="30" :stroke-width="1.3" /><strong>Không còn hàng hỏng chờ xử lý</strong></div>
        <div v-else class="returns-table-wrap"><table class="returns-table returns-stock-table"><thead><tr><th>Sản phẩm / biến thể</th><th>Tồn bán</th><th>Tồn hỏng</th><th>Thao tác</th></tr></thead><tbody><tr v-for="i in damaged" :key="i.id"><td data-label="Sản phẩm / biến thể"><strong>{{ i.name }}</strong><small>{{ i.color }} / {{ i.size }} · {{ i.sku }}</small></td><td data-label="Tồn bán">{{ i.available_quantity }} đôi</td><td data-label="Tồn hỏng"><span class="returns-status REFUND_PENDING">{{ i.damaged_quantity }} đôi</span></td><td data-label="Thao tác"><button type="button" class="returns-open" :aria-label="`Xử lý hàng hỏng ${i.sku || i.id}`" @click="openRepair(i)">Xử lý <ArrowUpRight :size="14" /></button></td></tr></tbody></table></div>
        <div v-if="history.length" class="returns-history"><h3>Lịch sử kho gần đây</h3><article v-for="m in history" :key="m.id"><div><strong>{{ movements[m.kind] || m.kind }}</strong><small>{{ m.name }} · {{ m.color }} / {{ m.size }} · {{ m.actor }}</small><p>{{ m.note }}</p></div><div><span>Tồn bán {{ m.available_delta > 0 ? '+' : '' }}{{ m.available_delta }}</span><span>Tồn hỏng {{ m.damaged_delta > 0 ? '+' : '' }}{{ m.damaged_delta }}</span><small>{{ date(m.created_at) }}</small></div></article></div>
      </template>
    </section>
    <AfterSalesPanel v-if="selected" :key="selected.id" :order-id="selected.id" :order-code="selected.code" admin start-open @updated="reload" @close="selected = null" />
    <AdminDrawer :open="repair.open" title="Xử lý hàng hỏng" :busy="repair.busy" @close="repair.open = false">
      <form id="damage-resolution" class="damage-form" @submit.prevent="saveRepair"><p><strong>{{ repair.item?.name }}</strong><br>{{ repair.item?.color }} / {{ repair.item?.size }} · Đang hỏng {{ repair.item?.damaged_quantity }} đôi</p><label>Cách xử lý<select v-model="repair.action"><option value="REPAIR">Đã sửa / kiểm đạt — đưa về bán</option><option value="WRITE_OFF">Ghi giảm hàng hỏng</option></select></label><label>Số lượng<input v-model.number="repair.quantity" type="number" min="1" :max="repair.item?.damaged_quantity" step="1" required /></label><label>Kết quả kiểm tra / lý do<textarea v-model="repair.note" rows="4" minlength="5" maxlength="500" required /></label><label class="damage-check"><input v-model="repair.confirmed" type="checkbox" required />{{ repair.action === 'REPAIR' ? 'Đã kiểm tra hàng đạt điều kiện để bán lại' : 'Đã kiểm tra và phê duyệt ghi giảm số hàng này' }}</label><p v-if="repair.error" class="returns-error" role="alert">{{ repair.error }}</p></form>
      <template #footer><button type="button" class="btn btn-light border" :disabled="repair.busy" @click="repair.open = false">Đóng</button><button type="submit" form="damage-resolution" class="btn btn-dark" :disabled="repair.busy || !repair.confirmed">{{ repair.busy ? 'Đang lưu…' : 'Lưu xử lý hàng hỏng' }}</button></template>
    </AdminDrawer>
  </div>
</template>

<style scoped>
.returns-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:22px}.returns-heading h1{font-size:29px;margin:7px 0;line-height:1.4}.returns-eyebrow{font-size:9px;font-weight:700;letter-spacing:.14em;color:#d4001a}.returns-heading p{margin:0;font-size:12px;color:#758092}.returns-heading>.btn{display:flex;align-items:center;gap:8px;font-size:11px}.returns-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:22px}.returns-stats>button{display:flex;align-items:flex-start;gap:12px;text-align:left;padding:18px 15px;background:#fff;color:#7a8493;border:1px solid #e1e6ed;border-radius:11px;cursor:pointer}.returns-stats>button.active{border-color:#d4001a50;background:#fff8f9;color:#d4001a}.returns-stats button>svg{flex:0 0 auto;margin-top:3px}.returns-stats span{font-size:10px;color:#7d8593;line-height:1.7}.returns-stats strong{display:block;font-size:25px;color:#18202e;font-weight:650;line-height:1.6}.returns-stats small{font-size:11px;font-weight:400;color:#9ca2ad}.returns-surface{padding:18px;min-width:0}.returns-toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:17px}.returns-toolbar h2{margin:0 auto 0 0;font:inherit;font-size:16px;font-weight:650}.returns-toolbar>input{flex:1 1 200px;max-width:270px;padding:10px 12px;border:1px solid #e0e5ed;border-radius:8px;font-size:11px;min-width:0}.returns-scope{display:flex;gap:3px;padding:3px;border:1px solid #e7eaf0;border-radius:8px}.returns-scope button{border:0;border-radius:5px;background:#fff;color:#8891a1;font-size:10px;padding:7px 9px;cursor:pointer}.returns-scope button.active{background:#d4001a;color:#fff}.returns-explanation{font-size:11px;color:#8a93a2;line-height:1.8;margin-bottom:16px}.returns-error{padding:11px 14px;border:1px solid #f1d9df;border-radius:8px;background:#fff5f7;color:#aa4156;font-size:12px;line-height:1.7}.returns-empty{display:grid;justify-items:center;gap:11px;text-align:center;padding:55px 15px;color:#9ca5b2;font-size:12px}.returns-empty strong{color:#636e80;font-size:13px;font-weight:500}.returns-table{width:100%;border-collapse:collapse;table-layout:fixed}.returns-table th{text-align:left;font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:#8e97a6;font-weight:500;background:#f9fafb;padding:12px 9px}.returns-table td{padding:15px 9px;border-top:1px solid #e9edf2;font-size:11px;color:#596679;overflow-wrap:anywhere;vertical-align:middle}.returns-table th:first-child{width:25%}.returns-table th:last-child{width:82px}.returns-table td strong{display:block;font-weight:600;color:#2a3547;font-size:11px;line-height:1.7}.returns-table td small{display:block;color:#949cab;font-size:10px;line-height:1.7;margin-top:3px}.returns-amount{font-variant-numeric:tabular-nums;font-weight:600}.returns-open{display:inline-flex;align-items:center;justify-content:center;gap:4px;padding:7px 8px;background:#fff;border:1px solid #dde3eb;border-radius:7px;font-size:10px;color:#556276;cursor:pointer}.returns-open:hover{border-color:#d4001a;color:#d4001a}.returns-status{display:inline-block;border:1px solid #e0e5ed;background:#f6f8fa;color:#7c8796;padding:5px 8px;border-radius:15px;font-size:9px;line-height:1.5}.returns-status.REQUESTED,.returns-status.REFUND_PENDING{background:#fff8ed;color:#947032;border-color:#f0dfbd}.returns-status.COMPLETED{background:#f0f9f3;color:#398055;border-color:#d7eadd}.returns-status.REJECTED{color:#a14e5f;background:#fff4f6;border-color:#f0dce2}.returns-history{margin-top:28px}.returns-history h3{font-size:13px;font-weight:600;margin-bottom:14px}.returns-history article{display:flex;justify-content:space-between;gap:18px;padding:13px 0;border-top:1px solid #ebeff3;font-size:11px;color:#8a93a2}.returns-history article>div:last-child{text-align:right;flex-shrink:0}.returns-history strong{font-size:11px;color:#556175}.returns-history small,.returns-history span{display:block;font-size:9px;line-height:1.8;margin-top:3px}.returns-history p{font-size:10px;line-height:1.8;margin:4px 0 0}.damage-form label:not(.damage-check){display:grid;gap:8px;margin:16px 0;font-size:12px;font-weight:500}.damage-form input[type=number],.damage-form select,.damage-form textarea{width:100%;padding:11px;border:1px solid #dce3ed;border-radius:8px;background:#fff;font:inherit}.damage-form>p{font-size:12px;line-height:1.9;color:#7d8797}.damage-check{display:flex;align-items:flex-start;gap:9px;font-size:12px;line-height:1.8}.damage-check input{margin-top:5px;accent-color:#d4001a}.returns-page button:focus-visible{outline:2px solid #d4001a;outline-offset:3px}
@media(max-width:1100px){.returns-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.returns-toolbar>input{max-width:none}}@media(max-width:600px){.returns-heading{align-items:flex-start}.returns-heading h1{font-size:24px}.returns-stats{gap:8px}.returns-stats>button{padding:12px;gap:8px}.returns-stats strong{font-size:22px}.returns-surface{padding:12px}.returns-toolbar{gap:10px}.returns-toolbar h2{width:100%}.returns-table th,.returns-table td{padding:10px 5px;font-size:10px}.returns-table th:last-child{width:62px}.returns-table th:first-child{width:25%}.returns-status{padding:4px 5px;font-size:8px}.returns-open{font-size:9px;padding:6px;gap:1px}.returns-history article{flex-direction:column;gap:6px}.returns-history article>div:last-child{text-align:left}}

@media(max-width:600px){
  .returns-table,.returns-table tbody{display:block;width:100%}
  .returns-table thead{display:none}
  .returns-table tbody{display:grid;gap:12px}
  .returns-table tr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:15px;border:1px solid #e5e9ef;border-radius:12px;background:#fff}
  .returns-table td{display:block;min-width:0;padding:0;border:0;font-size:12px;line-height:1.7;text-align:left}
  .returns-table td:before{content:attr(data-label);display:block;margin-bottom:4px;color:#9099a5;font-size:9px;font-weight:500}
  .returns-table td:first-child,.returns-table td:last-child,.returns-table:not(.returns-stock-table) td:nth-child(2){grid-column:1/-1}
  .returns-table td:last-child:before{display:none}
  .returns-table td strong{font-size:12px}
  .returns-table td small{font-size:11px;line-height:1.8;overflow-wrap:anywhere}
  .returns-table .returns-status{font-size:10px;padding:5px 8px}
  .returns-table .returns-open{width:100%;min-height:38px;font-size:12px;gap:7px}
}
</style>
