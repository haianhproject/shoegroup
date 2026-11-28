<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { RotateCcw, X, RefreshCw } from 'lucide-vue-next'
import { afterSalesApi, returnStatuses, formatAfterSalesMoney as money } from '../services/afterSales'
const props=defineProps({orderId:[Number,String],orderCode:String,admin:Boolean,readOnly:Boolean,triggerLabel:String,startOpen:Boolean})
const emit=defineEmits(['updated','close'])
const panel=ref(null),opened=ref(false),data=ref(null),busy=ref(false),loading=ref(false),error=ref(''),success=ref('')
const methods=reactive({})
const pending=computed(()=>(data.value?.refunds||[]).filter(r=>r.status==='PENDING'))
const methodLabel=value=>value==='BANK'?'Chuyển khoản':value==='CASH'?'Tiền mặt':'Đã ghi nhận'
const date=value=>value?new Date(value).toLocaleString('vi-VN'):'—'
let controller,generation=0,timer,previousFocus,previousOverflow
async function load(silent=false){
  const version=++generation;controller?.abort();controller=new AbortController();if(!silent)loading.value=true
  try{const snapshot=await afterSalesApi.detail(props.orderId,{signal:controller.signal});if(version!==generation)return;data.value=snapshot
    for(const r of snapshot.refunds)methods[r.id]??=/bank|chuyển khoản/i.test(snapshot.payment_method||'')?'BANK':'CASH'
  }catch(e){if(version===generation&&e.name!=='AbortError')error.value=e.message||'Chưa tải được lịch sử trả hàng.'}finally{if(version===generation)loading.value=false}
}
async function open(){
  if(opened.value)return;previousFocus=document.activeElement;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';opened.value=true;error.value='';success.value=''
  await nextTick();panel.value?.showModal();await load();clearInterval(timer);timer=setInterval(()=>{if(!busy.value&&!document.hidden)load(true)},15000)
}
function close(){if(busy.value)return;clearInterval(timer);controller?.abort();generation++;panel.value?.close();opened.value=false;document.body.style.overflow=previousOverflow??'';previousOverflow=undefined;previousFocus?.focus?.();emit('close')}
async function refund(r){
  if(busy.value)return;busy.value=true;error.value='';success.value=''
  try{await afterSalesApi.refund(props.orderId,r.id,{refund_method:methods[r.id]});success.value='Đã ghi nhận hoàn tiền bằng '+methodLabel(methods[r.id]).toLowerCase()+'.';await load(true);emit('updated')}
  catch(e){error.value=e.message||'Chưa ghi nhận được khoản hoàn. Vui lòng tải lại trạng thái trước khi thử tiếp.';await load(true)}finally{busy.value=false}
}
watch(()=>props.orderId,()=>{data.value=null;if(opened.value)load()})
watch(()=>props.startOpen,value=>{if(value)open()},{immediate:true})
onBeforeUnmount(()=>{clearInterval(timer);controller?.abort();generation++;panel.value?.close();if(previousOverflow!==undefined)document.body.style.overflow=previousOverflow})
defineExpose({open})
</script>
<template>
  <button v-if="!startOpen" type="button" class="as-trigger" @click="open"><RotateCcw :size="16" :stroke-width="1.5" />{{ triggerLabel||'Chi tiết hàng trả & tiền hoàn' }}</button>
  <Teleport to="body"><dialog v-if="opened" ref="panel" class="as-dialog" aria-label="Lịch sử trả hàng và hoàn tiền" :aria-busy="busy" @cancel.prevent="close" @click="e=>{if(e.target===panel)close()}">
    <header><div><span>SHOEGROUP / SAU MUA HÀNG</span><h2>Hàng trả & tiền hoàn</h2><p>Đơn {{ orderCode||`#${orderId}` }}</p></div><button type="button" class="as-close" aria-label="Đóng lịch sử trả hàng" :disabled="busy" @click="close"><X :size="20" /></button></header>
    <div class="as-body"><div class="as-tools"><span>Lịch sử theo đơn hàng</span><button type="button" :disabled="busy||loading" @click="load()"><RefreshCw :size="14" />Làm mới</button></div>
      <p v-if="error" class="as-note error" role="alert">{{ error }}</p><p v-if="success" class="as-note success" role="status">{{ success }}</p><p v-if="loading" role="status">Đang tải…</p>
      <template v-if="data">
        <dl class="as-amounts" aria-label="Giá trị đơn hàng gốc"><div><dt>Tiền hàng sau giảm giá</dt><dd>{{ money(data.goods_total) }}</dd></div><div><dt>Phí vận chuyển</dt><dd>{{ money(data.shipping_fee) }}</dd></div><div class="as-amount-total"><dt>Tổng tiền đơn gốc</dt><dd>{{ money(data.total) }}</dd></div></dl>
        <section v-if="pending.length"><h3>Chờ hoàn tiền</h3><article v-for="r in pending" :key="r.id"><strong>{{ money(r.amount) }}</strong><p>Khoản này chưa được ghi nhận là đã hoàn.</p><div v-if="admin&&!readOnly" class="as-refund"><label>Hình thức hoàn tiền<select v-model="methods[r.id]" :disabled="busy"><option value="CASH">Tiền mặt</option><option value="BANK">Chuyển khoản</option></select></label><button type="button" class="as-primary" :disabled="busy" @click="refund(r)">Xác nhận đã hoàn tiền</button></div></article></section>
        <section v-if="data.returns.length"><h3>Sản phẩm đã trả</h3><article v-for="r in data.returns" :key="r.id">
          <div class="as-case-head"><div><strong>Phiếu #{{ r.id }}</strong><small>{{ date(r.created_at) }}</small></div><span>{{ returnStatuses[r.status]||r.status }}</span></div><p>{{ r.reason }}</p>
          <ul><li v-for="i in r.items" :key="i.id"><span>{{ i.name }} · {{ i.color }} / {{ i.size }}</span><strong>{{ r.received_at?i.good_quantity+i.damaged_quantity:i.requested_quantity }} sản phẩm</strong><small v-if="r.received_at">{{ r.status==='COMPLETED'?'Đã hoàn':'Chờ hoàn' }} {{ money(i.refund_amount) }}</small></li></ul>
          <dl v-if="r.received_at" class="as-amounts" :aria-label="`Chi tiết tiền hoàn phiếu ${r.id}`"><div><dt>Tiền sản phẩm hoàn</dt><dd>{{ money(Math.max(0,Number(r.refund_amount||0)-Number(r.shipping_refund_amount||0))) }}</dd></div><div><dt>Phí vận chuyển hoàn</dt><dd>{{ money(r.shipping_refund_amount) }}</dd></div><div class="as-amount-total"><dt>Tổng tiền hoàn</dt><dd>{{ money(r.refund_amount) }}</dd></div></dl>
        </article></section>
        <section v-if="data.refunds.some(r=>r.status==='SUCCESS')"><h3>Đã hoàn tiền</h3><article v-for="r in data.refunds.filter(r=>r.status==='SUCCESS')" :key="r.id" class="as-completed"><strong>{{ money(r.amount) }}</strong><span>{{ methodLabel(r.refund_method) }}</span><small>{{ date(r.completed_at) }}</small></article></section>
        <p v-if="!data.returns.length&&!data.refunds.length" class="as-note">Chưa có phiếu trả hàng hoặc khoản hoàn tiền của đơn này.</p>
      </template>
    </div><footer><span>Lịch sử được lưu theo đơn gốc</span><button type="button" :disabled="busy" @click="close">Đóng</button></footer>
  </dialog></Teleport>
</template>
<style scoped>
.as-trigger,.as-dialog button{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;border:1px solid #dce3eb;border-radius:8px;background:#fff;color:#354155;font:inherit;font-size:12px;cursor:pointer}.as-trigger:hover{border-color:#d4001a;color:#d4001a}.as-dialog{width:min(760px,calc(100vw - 24px));max-height:calc(100dvh - 28px);margin:auto;padding:0;border:1px solid #e2e6ec;border-radius:16px;background:#fff;color:#18202e;overflow:hidden}.as-dialog[open]{display:flex;flex-direction:column}.as-dialog::backdrop{background:#0f172a66;backdrop-filter:blur(4px)}header{display:flex;justify-content:space-between;align-items:flex-start;gap:15px;padding:24px;border-bottom:1px solid #e8ebef}header>div>span{font-size:9px;letter-spacing:.12em;color:#d4001a}header h2{font:inherit;font-size:23px;font-weight:650;line-height:1.5;margin:8px 0}header p{margin:0;font-size:12px;color:#8a94a3}.as-close{padding:8px!important}.as-body{padding:20px 24px;overflow:auto;font-size:12px;line-height:1.8}.as-tools{display:flex;justify-content:space-between;align-items:center;color:#8a94a3;font-size:11px}.as-tools button{border:0;font-size:11px}.as-note{border:1px solid #e3e8ef;background:#f8fafc;border-radius:8px;padding:12px}.as-note.error{color:#a52b42;background:#fff5f7;border-color:#f2d5dc}.as-note.success{color:#32724e;background:#f3faf5}section{margin:22px 0}h3{font:inherit;font-size:15px;font-weight:600;margin:0 0 12px}article{border:1px solid #e4e9ef;border-radius:10px;padding:16px;margin:10px 0}article p{color:#8791a1;font-size:11px;margin:8px 0}.as-case-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.as-case-head span{font-size:10px;padding:4px 8px;border-radius:12px;background:#f2f6f3;color:#477255}small{display:block;color:#8d96a4;font-size:10px;line-height:1.8;margin-top:4px}ul{list-style:none;margin:12px 0 0;padding:0}li{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;padding:10px 0;border-top:1px solid #edf0f4;font-size:11px}li small{width:100%;margin:0}.as-refund{display:flex;align-items:flex-end;gap:14px;margin-top:14px}.as-refund label{display:grid;gap:6px;flex:1;font-size:11px;color:#7f8999}.as-refund select{font:inherit;color:#28364b;padding:10px;border:1px solid #dce3ed;border-radius:7px;background:#fff}.as-dialog .as-primary{color:#fff;background:#d4001a;border-color:#d4001a}.as-completed{display:flex;align-items:center;gap:15px;flex-wrap:wrap}.as-completed>span{font-size:11px;color:#798696}.as-completed small{margin:0}footer{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:16px 24px;border-top:1px solid #e7ebf1;background:#fafbfc}footer>span{font-size:10px;color:#8d96a4}button:disabled{opacity:.5;cursor:wait}:focus-visible{outline:2px solid #d4001a;outline-offset:3px}@media(max-width:540px){header{padding:18px}.as-body{padding:16px}.as-refund{flex-direction:column;align-items:stretch}footer{padding:14px 16px}.as-case-head{flex-wrap:wrap}}
.as-amounts{display:grid;gap:8px;margin:16px 0 0;padding:14px;border:1px solid #e7ebf1;border-radius:8px;background:#f8fafc;font-size:11px}.as-amounts>div{display:flex;justify-content:space-between;align-items:baseline;gap:16px}.as-amounts dt{color:#7b8799}.as-amounts dd{margin:0;color:#34445b;font-weight:550;font-variant-numeric:tabular-nums;white-space:nowrap}.as-amount-total{padding-top:9px;border-top:1px solid #e2e8f0}.as-amount-total dt,.as-amount-total dd{color:#18202e;font-weight:650}
</style>
