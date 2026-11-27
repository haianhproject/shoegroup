<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Search, RotateCcw, ArrowRight, CheckCircle2 } from 'lucide-vue-next'
import { afterSalesApi, formatAfterSalesMoney as money } from '../services/afterSales'
const props=defineProps({initialCode:String})
const emit=defineEmits(['updated','history'])
const code=ref(props.initialCode||''),order=ref(null),loading=ref(false),busy=ref(false),error=ref(''),saved=ref(null)
const form=reactive({lines:[],reason:'',shipping:false,method:'CASH',key:''})
const selected=computed(()=>form.lines.filter(i=>i.quantity>0))
const validLines=computed(()=>selected.value.length>0&&form.lines.every(i=>Number.isSafeInteger(i.quantity)&&i.quantity>=0&&i.quantity<=i.remaining_quantity))
const wholeOrder=computed(()=>validLines.value&&form.lines.every(i=>i.quantity===i.remaining_quantity))
const lineRefund=i=>Math.round(Number(i.net_line_total)*(i.returned_quantity+i.quantity)/i.quantity_original)-Math.round(Number(i.net_line_total)*i.returned_quantity/i.quantity_original)
const refund=computed(()=>validLines.value?selected.value.reduce((sum,i)=>sum+lineRefund(i),0)+(form.shipping&&wholeOrder.value?Number(order.value?.shipping_refundable_amount||0):0):0)
const ready=computed(()=>order.value?.can_request&&validLines.value&&['CASH','BANK'].includes(form.method)&&refund.value<=Number(order.value.remaining_refundable_amount))
function seed(snapshot){order.value=snapshot;Object.assign(form,{lines:snapshot.items.map(i=>({...i,quantity_original:i.quantity,quantity:0})),reason:'',shipping:false,method:/bank|chuyển khoản/i.test(snapshot.payment_method||'')?'BANK':'CASH',key:crypto.randomUUID()})}
async function lookup(){
  if(busy.value||loading.value||!code.value.trim())return
  loading.value=true;error.value='';saved.value=null;order.value=null
  try{seed(await afterSalesApi.lookup(code.value.trim()))}catch(e){error.value=e.message||'Không tìm thấy đơn hàng.'}finally{loading.value=false}
}
async function save(){
  if(busy.value)return
  if(!ready.value){error.value=validLines.value?'Vui lòng chọn hình thức hoàn tiền và tải lại số liệu của đơn.':'Nhập số lượng cần trả cho ít nhất một sản phẩm. Số lượng phải là số nguyên, không vượt phần còn được trả.';return}
  busy.value=true;error.value=''
  const body={simple:true,request_key:form.key,reason:form.reason.trim(),refund_method:form.method,refund_shipping:form.shipping&&wholeOrder.value,items:selected.value.map(i=>({order_detail_id:i.order_detail_id,quantity:i.quantity}))}
  try{saved.value=await afterSalesApi.register(order.value.order_id,body);order.value={...order.value,can_request:false};emit('updated')}
  catch(e){error.value=e.message||'Chưa nhận được kết quả. Giữ nguyên phiếu và thử lại để tránh ghi nhận trùng.'}finally{busy.value=false}
}
onMounted(()=>{if(code.value)lookup()})
watch(()=>props.initialCode,value=>{if(value&&!busy.value){code.value=value;lookup()}})
</script>
<template>
  <div class="return-entry">
    <div class="entry-intro"><span class="entry-step">TRẢ HÀNG THEO ĐƠN GỐC</span><h2>Nhập mã. Chọn hàng. Hoàn tiền.</h2><p>Dành cho đơn đã giao thành công, sau khi khách liên hệ cửa hàng qua Zalo.</p></div>
    <form class="entry-lookup" @submit.prevent="lookup"><label for="return-order-code">Mã đơn hàng</label><div><Search :size="18" :stroke-width="1.5" /><input id="return-order-code" v-model="code" maxlength="100" placeholder="Nhập mã SGVN… hoặc số đơn" :disabled="busy||loading" required /><button type="submit" :disabled="busy||loading||!code.trim()">{{ loading?'Đang tìm…':'Tìm đơn' }}<ArrowRight :size="16" /></button></div></form>
    <p v-if="error" class="entry-note danger" role="alert">{{ error }}</p>
    <div v-if="saved" class="entry-success" role="status"><CheckCircle2 :size="25" :stroke-width="1.5" /><div><strong>Đã nhận trả & hoàn tiền</strong><p>Phiếu #{{ saved.return_id }} · {{ money(saved.refund_amount) }} · {{ form.method==='CASH'?'Tiền mặt':'Chuyển khoản' }}</p><button type="button" @click="emit('history',order)">Xem chi tiết sản phẩm đã trả</button></div></div>
    <template v-if="order&&!saved">
      <div class="entry-order"><div><span>ĐƠN HÀNG GỐC</span><strong>{{ order.order_code }}</strong><small>{{ order.status }}</small></div><div><span>GIÁ TRỊ BAN ĐẦU</span><strong>{{ money(order.total) }}</strong><small>Còn được hoàn {{ money(order.remaining_refundable_amount) }}</small></div></div>
      <p v-if="!order.can_request" class="entry-note">Đơn chưa đủ điều kiện trả hàng, đã trả hết hoặc còn phiếu chưa hoàn tất. <button type="button" @click="emit('history',order)">Xem lịch sử & tiền hoàn</button></p>
      <form v-else novalidate @submit.prevent="save"><fieldset :disabled="busy"><legend>Sản phẩm cần trả</legend><p>Nhập số lượng cần trả. Để 0 với sản phẩm không trả.</p>
        <div v-for="i in form.lines" :key="i.order_detail_id" class="entry-line" :class="{selected:i.quantity>0}"><div><strong>{{ i.name }}</strong><small>{{ i.color }} / {{ i.size }} · Đã mua {{ i.quantity_original }} · Đã trả {{ i.returned_quantity }}</small><small>Còn được trả {{ i.remaining_quantity }}</small></div><label>Số lượng trả<input v-model.number="i.quantity" type="number" min="0" :max="i.remaining_quantity" step="1" :disabled="!i.remaining_quantity" :aria-label="`Số lượng trả dòng ${i.order_detail_id}`" /></label><span class="entry-line-money">Tiền hoàn<strong>{{ i.quantity>0&&validLines?money(lineRefund(i)):money(0) }}</strong></span></div>
        <div class="entry-settings"><label>Hình thức hoàn tiền<select v-model="form.method"><option value="CASH">Tiền mặt</option><option value="BANK">Chuyển khoản</option></select></label><label v-if="wholeOrder&&order.shipping_refundable_amount">Phí vận chuyển<select v-model="form.shipping"><option :value="false">Giữ nguyên phí vận chuyển</option><option :value="true">Hoàn thêm {{ money(order.shipping_refundable_amount) }}</option></select></label></div>
        <label class="entry-field">Ghi chú <small>(không bắt buộc)</small><textarea v-model="form.reason" maxlength="500" rows="2" placeholder="Nội dung đã trao đổi với khách qua Zalo…" /></label>
        <div class="entry-total"><span>Tổng tiền hoàn</span><strong>{{ money(refund) }}</strong></div><p>Bấm xác nhận sau khi cửa hàng đã nhận lại hàng và hoàn tiền cho khách. Hệ thống cập nhật tồn kho, doanh thu và lịch sử đơn.</p>
        <button class="entry-submit" type="submit" :disabled="busy"><RotateCcw :size="17" :stroke-width="1.5" />{{ busy?'Đang lưu…':'Xác nhận trả hàng & hoàn tiền' }}</button>
      </fieldset></form>
    </template>
  </div>
</template>
<style scoped>
.return-entry{color:#263247}.entry-step{font-size:9px;font-weight:650;letter-spacing:.12em;color:#d4001a}.entry-intro h2{font-size:25px;line-height:1.5;margin:10px 0}.return-entry p{font-size:12px;line-height:1.9;color:#8290a1;margin:8px 0 16px}.entry-lookup{max-width:620px;margin:22px 0}.entry-lookup>label{display:block;font-size:11px;font-weight:550;margin-bottom:8px}.entry-lookup>div{display:flex;align-items:center;gap:11px;padding:5px 5px 5px 14px;border:1px solid #dce3eb;border-radius:9px}.entry-lookup svg{flex-shrink:0;color:#8b95a5}.entry-lookup input{flex:1;min-width:0;border:0;outline:0;padding:10px 0;font:inherit;font-size:12px}.entry-lookup button,.entry-submit{display:flex;align-items:center;justify-content:center;gap:9px;padding:12px 17px;border:0;border-radius:7px;background:#d4001a;color:#fff;font:inherit;font-size:12px;cursor:pointer}.entry-lookup button svg{color:#fff}.entry-order{display:flex;justify-content:space-between;gap:20px;padding:18px;background:#f8fafc;border:1px solid #e5eaf1;border-radius:10px;margin:22px 0}.entry-order>div{display:grid;gap:7px}.entry-order>div:last-child{text-align:right}.entry-order span{font-size:9px;letter-spacing:.06em;color:#8d97a7}.entry-order strong{font-size:15px;font-weight:650}.return-entry small{font-size:10px;color:#8b96a6;line-height:1.8}fieldset{border:0;padding:0;margin:0;min-width:0}legend{font-size:15px;font-weight:600;padding:0}.entry-line{display:grid;grid-template-columns:minmax(0,1fr) 100px 150px;align-items:center;gap:22px;border:1px solid #e5eaf0;border-radius:10px;padding:17px;margin:12px 0}.entry-line.selected{border-color:#d4001a45;background:#fffafb}.entry-line>div strong{display:block;font-size:13px;font-weight:600}.entry-line small{display:block;margin-top:4px}.entry-line label,.entry-settings label,.entry-field{display:grid;gap:7px;font-size:11px;color:#7c899a}.entry-line input,.entry-settings select,.entry-field textarea{width:100%;min-width:0;border:1px solid #dce3eb;background:#fff;border-radius:7px;padding:10px;font:inherit;font-size:12px;color:#263247}.entry-line-money{font-size:10px;color:#8c96a6;text-align:right}.entry-line-money strong{display:block;font-size:13px;font-weight:600;color:#34445b;margin-top:6px}.entry-settings{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:22px 0}.entry-field{margin:18px 0}.entry-field small{display:inline}.entry-total{display:flex;justify-content:space-between;align-items:center;gap:15px;padding:18px;border-radius:9px;background:#f8fafc;border:1px solid #e5eaf1;font-size:13px;margin-top:22px}.entry-total strong{font-size:24px;color:#101827;font-variant-numeric:tabular-nums}.entry-note{padding:13px;border:1px solid #e1e7ee;border-radius:8px;background:#f8fafc;font-size:12px;line-height:1.8}.entry-note.danger{color:#ab3b53;background:#fff5f7;border-color:#f1d6de}.entry-note button,.entry-success button{border:0;padding:0;background:none;color:#d4001a;text-decoration:underline;font:inherit;cursor:pointer}.entry-success{display:flex;gap:14px;padding:20px;border:1px solid #d3e9dc;border-radius:10px;background:#f4fbf6;color:#36754f}.entry-success svg{flex-shrink:0}.entry-success p{color:#6b8775;margin:6px 0}.entry-success button{font-size:12px}.return-entry button:disabled{opacity:.5;cursor:wait}.return-entry :focus-visible{outline:2px solid #d4001a;outline-offset:3px}@media(max-width:700px){.entry-line{grid-template-columns:minmax(0,1fr) 85px;gap:13px}.entry-line-money{grid-column:1/-1;text-align:left;display:flex;gap:12px;align-items:center}.entry-line-money strong{margin:0}.entry-settings{grid-template-columns:1fr}.entry-order{flex-direction:column}.entry-order>div:last-child{text-align:left}.entry-total strong{font-size:21px}.entry-submit{width:100%}.entry-intro h2{font-size:22px}}
</style>
