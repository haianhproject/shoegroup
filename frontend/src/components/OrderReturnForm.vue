<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Search, PackageCheck, ArrowRight, CheckCircle2 } from 'lucide-vue-next'
import { afterSalesApi, formatAfterSalesMoney as money } from '../services/afterSales'

const props = defineProps({ initialCode: String })
const emit = defineEmits(['updated', 'history'])
const code = ref(props.initialCode || ''), order = ref(null), loading = ref(false), busy = ref(false), error = ref(''), saved = ref(null)
const form = reactive({ lines: [], reason: '', confirmed: false, shipping: false, paid: false, reference: '', note: '', key: '' })
let lookupVersion = 0
const selected = computed(() => form.lines.filter(i => i.selected))
const validLines = computed(() => selected.value.length > 0 && selected.value.every(i => Number.isSafeInteger(i.quantity) && i.quantity > 0 && i.quantity <= i.remaining_quantity && Number.isSafeInteger(i.damaged) && i.damaged >= 0 && i.damaged <= i.quantity))
const wholeOrder = computed(() => validLines.value && form.lines.every(i => i.remaining_quantity === 0 || i.selected && i.quantity === i.remaining_quantity))
// Cumulative rounding matches ReturnAmounts.portion; each return receives only its share of the original discount.
const lineRefund = i => Math.round(Number(i.net_line_total) * (i.returned_quantity + i.quantity) / i.quantity_original) - Math.round(Number(i.net_line_total) * i.returned_quantity / i.quantity_original)
const refund = computed(() => validLines.value ? selected.value.reduce((sum, i) => sum + lineRefund(i), 0) + (form.shipping && wholeOrder.value ? Number(order.value?.shipping_refundable_amount || 0) : 0) : 0)
const ready = computed(() => order.value?.can_request && validLines.value && form.confirmed && form.reason.trim().length >= 5 && form.reason.length <= 500 && refund.value <= Number(order.value.remaining_refundable_amount)
  && (!form.paid || refund.value === 0 || form.reference.trim().length >= 3 && form.note.trim().length >= 5))

function seed(snapshot) {
  order.value = snapshot
  Object.assign(form, { lines: snapshot.items.map(i => ({ ...i, quantity_original: i.quantity, selected: false, quantity: 1, damaged: 0 })), reason: '', confirmed: false, shipping: false, paid: false, reference: '', note: '', key: crypto.randomUUID() })
}
async function lookup() {
  if (busy.value || loading.value || !code.value.trim()) return
  const version = ++lookupVersion
  loading.value = true; error.value = ''; saved.value = null; order.value = null
  try { const snapshot = await afterSalesApi.lookup(code.value.trim()); if (version === lookupVersion) seed(snapshot) }
  catch (e) { if (version === lookupVersion) error.value = e.message || 'Chưa tìm được đơn hàng.' }
  finally { if (version === lookupVersion) loading.value = false }
}
async function save() {
  if (busy.value || !ready.value) return
  busy.value = true; error.value = ''
  const body = { request_key: form.key, reason: form.reason.trim(), confirm_received: true,
    items: selected.value.map(i => ({ order_detail_id: i.order_detail_id, quantity: i.quantity, damaged_quantity: i.damaged })),
    refund_shipping: form.shipping && wholeOrder.value, confirm_paid: form.paid && refund.value > 0,
    reference: form.paid ? form.reference.trim() : '', refund_note: form.paid ? form.note.trim() : '' }
  try {
    saved.value = await afterSalesApi.register(order.value.order_id, body)
    order.value = { ...order.value, can_request: false }
    emit('updated')
  } catch (e) {
    error.value = e.message || 'Chưa nhận được kết quả. Giữ nguyên phiếu và thử lại để đối chiếu thao tác đã gửi.'
    // Keep the UUID and payload after an ambiguous response: retrying cannot receive or refund twice.
  } finally { busy.value = false }
}
onMounted(() => { if (code.value) lookup() })
watch(() => props.initialCode, value => { if (value && !busy.value) { code.value = value; lookup() } })
</script>

<template>
  <div class="return-entry">
    <div class="return-entry-intro"><span class="entry-step">01 / TRA CỨU</span><h2>Nhận lại đúng sản phẩm.</h2><p>Khách đã trao đổi qua Zalo? Nhập mã đơn, kiểm hàng thực nhận và lưu phiếu tại đây.</p></div>
    <form class="entry-lookup" @submit.prevent="lookup"><label for="return-order-code">Mã đơn hàng gốc</label><div><Search :size="18" :stroke-width="1.5" /><input id="return-order-code" v-model="code" maxlength="100" placeholder="Ví dụ: SGVN… hoặc số đơn" :disabled="busy || loading" required /><button type="submit" :disabled="busy || loading || !code.trim()">{{ loading ? 'Đang tìm…' : 'Tìm đơn' }}<ArrowRight :size="16" /></button></div></form>
    <p v-if="error" class="entry-note danger" role="alert">{{ error }}</p>
    <div v-if="saved" class="entry-success" role="status"><CheckCircle2 :size="26" :stroke-width="1.5" /><div><strong>Đã lưu phiếu #{{ saved.return_id }}</strong><p>{{ saved.status === 'COMPLETED' ? 'Đã nhận hàng và ghi nhận khoản hoàn.' : 'Đã nhận hàng, điều chỉnh tồn kho và doanh thu. Khoản hoàn đang chờ chi trả.' }} {{ money(saved.refund_amount) }}</p><button type="button" @click="emit('history', order)">Xem sản phẩm & tiền hoàn</button></div></div>
    <template v-if="order && !saved">
      <div class="entry-order"><div><span>ĐƠN HÀNG GỐC</span><strong>{{ order.order_code }}</strong><small>{{ order.status }} · {{ order.payment_status }}</small></div><div><span>GIÁ TRỊ BAN ĐẦU</span><strong>{{ money(order.total) }}</strong><small>Còn được hoàn {{ money(order.remaining_refundable_amount) }}</small></div></div>
      <p v-if="!order.can_request" class="entry-note">Đơn chưa đủ điều kiện nhận trả hoặc đang có phiếu cần xử lý. <button type="button" @click="emit('history', order)">Mở lịch sử & khoản chờ hoàn</button></p>
      <form v-else class="entry-form" @submit.prevent="save">
        <fieldset :disabled="busy"><legend><span class="entry-step">02 / KIỂM HÀNG</span>Chọn hàng đã nhận lại</legend>
          <div v-for="i in form.lines" :key="i.order_detail_id" class="entry-line" :class="{ selected: i.selected, exhausted: !i.remaining_quantity }">
            <label class="entry-product"><input v-model="i.selected" type="checkbox" :disabled="!i.remaining_quantity" :aria-label="`Chọn trả ${i.name} size ${i.size}`" /><span><strong>{{ i.name }}</strong><small>{{ i.color }} / {{ i.size }} · Đã mua {{ i.quantity_original }} · Đã trả {{ i.returned_quantity }}</small><small>Còn được trả {{ i.remaining_quantity }}{{ i.selected && validLines ? ` · Khoản hoàn ${money(lineRefund(i))}` : '' }}</small></span></label>
            <label>Số nhận trả<input v-model.number="i.quantity" type="number" min="1" :max="i.remaining_quantity" step="1" :disabled="!i.selected" :aria-label="`Số nhận trả dòng ${i.order_detail_id}`" /></label>
            <label>Trong đó hàng hỏng<input v-model.number="i.damaged" type="number" min="0" :max="i.quantity" step="1" :disabled="!i.selected" :aria-label="`Số hàng hỏng dòng ${i.order_detail_id}`" /></label>
            <span class="entry-good">Nhập tồn bán <strong>{{ i.selected ? Math.max(0, i.quantity - i.damaged) : 0 }} đôi</strong></span>
          </div>
          <label class="entry-field">Lý do / kết quả kiểm hàng theo trao đổi qua Zalo<textarea v-model="form.reason" rows="3" minlength="5" maxlength="500" required placeholder="Sản phẩm khách gửi lại, tình trạng và phương án đã thống nhất…" /></label>
          <label class="entry-check"><input v-model="form.shipping" type="checkbox" :disabled="!wholeOrder || !order.shipping_refundable_amount" />Hoàn cả phí giao hàng {{ money(order.shipping_refundable_amount) }} <small>(khi đã nhận lại toàn bộ phần hàng còn lại)</small></label>
          <label class="entry-check"><input v-model="form.confirmed" type="checkbox" required />Tôi đã nhận hàng thực tế và kiểm tra số hàng tốt / hỏng ở trên</label>
          <div class="entry-settlement"><span class="entry-step">03 / TIỀN HOÀN</span><div class="entry-total"><span>Khoản hoàn cho phiếu này</span><strong>{{ money(refund) }}</strong></div><p>Tính theo giá thực trả của sản phẩm sau giảm giá. Hàng hỏng được giữ riêng, không cộng vào tồn bán.</p>
            <label class="entry-check"><input v-model="form.paid" type="checkbox" :disabled="!refund" />Tôi đã hoàn tiền thực tế cho khách</label>
            <div v-if="form.paid && refund > 0" class="entry-proof"><label class="entry-field">Mã giao dịch / chứng từ<input v-model="form.reference" minlength="3" maxlength="100" required /></label><label class="entry-field">Ghi chú đối soát<input v-model="form.note" minlength="5" maxlength="500" required /></label></div>
            <p v-else>Phiếu được lưu ở trạng thái <strong>Chờ hoàn tiền</strong>. Chỉ ghi “Đã hoàn tiền” sau khi đã chi trả và lưu chứng từ.</p>
          </div>
          <button class="entry-submit" type="submit" :disabled="!ready || busy"><PackageCheck :size="18" :stroke-width="1.5" />{{ busy ? 'Đang lưu…' : 'Xác nhận nhận trả & lưu phiếu' }}</button>
        </fieldset>
      </form>
    </template>
  </div>
</template>

<style scoped>
.return-entry{max-width:100%;color:#253145}.return-entry-intro{margin-bottom:22px}.entry-step{display:block;color:#d4001a;font-size:9px;font-weight:650;letter-spacing:.12em;margin-bottom:8px}.return-entry h2{font-size:26px;line-height:1.45;margin:0 0 8px}.return-entry p{font-size:12px;line-height:1.9;color:#7b8697;margin:7px 0}.entry-lookup{max-width:620px;margin-bottom:24px}.entry-lookup>label{display:block;font-size:11px;font-weight:550;margin-bottom:8px}.entry-lookup>div{display:flex;align-items:center;gap:10px;border:1px solid #dce3eb;border-radius:9px;padding:5px 5px 5px 14px;background:#fff}.entry-lookup svg{flex-shrink:0;color:#8c95a4}.entry-lookup input{flex:1;min-width:0;border:0;outline:0;font:inherit;font-size:12px;padding:9px 0;background:none}.entry-lookup button,.entry-submit{display:flex;align-items:center;justify-content:center;gap:9px;border:0;border-radius:6px;background:#d4001a;color:#fff;padding:12px 17px;font:inherit;font-size:12px;cursor:pointer}.entry-lookup button svg{color:#fff}.entry-order{display:flex;justify-content:space-between;gap:20px;padding:18px 20px;background:#f8fafc;border:1px solid #e5eaf1;border-radius:10px;margin-bottom:25px}.entry-order>div{display:grid;gap:7px}.entry-order>div:last-child{text-align:right}.entry-order span{font-size:8px;letter-spacing:.1em;color:#8b94a3}.entry-order strong{font-size:15px;font-weight:650}.entry-order small{font-size:11px;color:#7e899a}.entry-form fieldset{border:0;padding:0;margin:0;min-width:0}.entry-form legend{font-size:15px;font-weight:600;padding:0;margin:0 0 17px}.entry-line{display:grid;grid-template-columns:minmax(150px,1fr) 95px 130px 105px;gap:16px;align-items:center;padding:17px 13px;border:1px solid #e7ebf1;border-radius:9px;margin-bottom:10px}.entry-line.selected{border-color:#d4001a50;background:#fffafb}.entry-line.exhausted{opacity:.6}.entry-product{display:flex;gap:12px;align-items:flex-start;min-width:0}.entry-product input{margin-top:4px;flex-shrink:0}.entry-product span{min-width:0}.entry-product strong{display:block;font-size:12px;font-weight:600;overflow-wrap:anywhere}.entry-product small{display:block;font-size:10px;color:#8a94a3;line-height:1.8;margin-top:4px}.entry-line>label:not(.entry-product){display:grid;gap:7px;font-size:10px;color:#8b94a2}.entry-line input[type=number],.entry-field input,.entry-field textarea{width:100%;min-width:0;border:1px solid #dfe5ed;border-radius:7px;padding:10px;background:#fff;color:#263247;font:inherit;font-size:12px}.entry-line input:disabled{background:#f5f6f8;color:#a0a7b2}.entry-good{font-size:9px;color:#8a94a3;line-height:1.8}.entry-good strong{display:block;font-size:12px;font-weight:550;color:#506175}.entry-field{display:grid;gap:8px;margin:19px 0;font-size:11px;font-weight:550}.entry-check{display:flex;align-items:flex-start;gap:9px;font-size:11px;line-height:1.9;color:#627085;margin:14px 0}.entry-check input{margin-top:4px;flex-shrink:0}.entry-check small{font-size:10px;color:#969eaa}.return-entry input[type=checkbox]{accent-color:#d4001a}.entry-settlement{padding:20px;border:1px solid #e5e9ef;border-radius:10px;margin:22px 0;background:#fafbfc}.entry-total{display:flex;justify-content:space-between;gap:15px;align-items:center;font-size:13px}.entry-total strong{font-size:23px;color:#111827;font-variant-numeric:tabular-nums}.entry-proof{display:grid;grid-template-columns:1fr 1fr;gap:15px}.entry-note{border:1px solid #e3e8ef;padding:13px 16px;background:#f8fafc;border-radius:8px;font-size:12px;line-height:1.8}.entry-note.danger{color:#a13c51;background:#fff5f7;border-color:#f0d9df}.entry-note button,.entry-success button{border:0;padding:0;background:none;color:#d4001a;text-decoration:underline;cursor:pointer;font:inherit}.entry-success{display:flex;gap:14px;padding:20px;border:1px solid #cfe7d8;border-radius:10px;background:#f3fbf6;color:#32724e}.entry-success svg{flex-shrink:0}.entry-success strong{font-size:15px}.entry-success p{color:#5d7c69}.entry-success button{font-size:12px}.return-entry button:disabled{opacity:.45;cursor:not-allowed}.return-entry :focus-visible{outline:2px solid #d4001a;outline-offset:3px}
@media(max-width:1100px){.entry-line{grid-template-columns:minmax(140px,1fr) 75px 100px;gap:11px}.entry-good{grid-column:2/4;display:flex;gap:10px}}@media(max-width:600px){.entry-line{grid-template-columns:1fr 1fr;gap:13px}.entry-product{grid-column:1/-1}.entry-good{grid-column:1/-1}.entry-order{padding:15px;flex-direction:column}.entry-order>div:last-child{text-align:left}.entry-proof{grid-template-columns:1fr;gap:0}.entry-total{align-items:flex-start;flex-direction:column;gap:6px}.entry-check{flex-wrap:wrap}.entry-submit{width:100%;padding:14px}.return-entry h2{font-size:23px}}
</style>
