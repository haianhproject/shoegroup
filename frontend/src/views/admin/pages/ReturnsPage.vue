<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RotateCcw, Wallet, RefreshCw, ArrowUpRight, History } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import OrderReturnForm from '../../../components/OrderReturnForm.vue'
import AfterSalesPanel from '../../../components/AfterSalesPanel.vue'
import { afterSalesApi, returnStatuses, formatAfterSalesMoney as money } from '../../../services/afterSales'
import { formatOrderCode } from '../../../services/orderCode'
import { db, refreshOrders } from '../adminStore'
const route=useRoute(),tab=ref(route.query.tab==='REFUNDS'?'REFUNDS':'NEW'),scope=ref('ALL'),search=ref(''),cases=ref([]),loading=ref(false),error=ref(''),selected=ref(null)
const code=o=>o.order_code||formatOrderCode(o.order_id??o.id,o.order_date??o.created_at??o.date)
const pending=computed(()=>db.orders.filter(o=>Number(o.pending_refund_amount)>0))
const refunds=computed(()=>pending.value.filter(o=>!search.value.trim()||`${code(o)} ${o.customer_name||''}`.toLowerCase().includes(search.value.trim().toLowerCase())))
const date=value=>value?new Date(value).toLocaleString('vi-VN'):'—'
let timer,searchTimer,generation=0
async function reload(){
 const current=++generation;loading.value=true;error.value=''
 const result=await Promise.allSettled([afterSalesApi.list(scope.value,search.value.trim()),refreshOrders()]);if(current!==generation)return
 if(result[0].status==='fulfilled')cases.value=result[0].value;else error.value=result[0].reason.message||'Chưa tải được lịch sử trả hàng.'
 if(result[1].status==='rejected')error.value||='Chưa tải được khoản chờ hoàn.'
 loading.value=false
}
function show(o){selected.value={id:o.order_id??o.id,code:code(o)}}
watch(scope,reload);watch(search,()=>{clearTimeout(searchTimer);searchTimer=setTimeout(reload,300)})
watch(()=>route.query.tab,value=>{if(value==='REFUNDS')tab.value='REFUNDS'})
onMounted(()=>{reload();timer=setInterval(()=>{if(!document.hidden&&!selected.value)reload()},30000)})
onBeforeUnmount(()=>{generation++;clearInterval(timer);clearTimeout(searchTimer)})
</script>
<template>
 <div class="returns-page">
  <div class="returns-heading"><div><span>CHĂM SÓC SAU BÁN HÀNG</span><h1>Trả hàng & tiền hoàn</h1><p>Trả theo đơn gốc, cập nhật đúng tồn kho và doanh thu.</p></div><button type="button" :disabled="loading" @click="reload"><RefreshCw :size="15" />{{ loading?'Đang tải…':'Làm mới' }}</button></div>
  <div class="returns-tabs" role="group" aria-label="Nhóm trả hàng và hoàn tiền"><button type="button" :aria-pressed="tab==='NEW'" :class="{active:tab==='NEW'}" @click="tab='NEW'"><RotateCcw :size="20" :stroke-width="1.5" /><span>Trả theo mã đơn<strong>Nhận trả & hoàn tiền</strong></span></button><button type="button" :aria-pressed="tab==='HISTORY'" :class="{active:tab==='HISTORY'}" @click="tab='HISTORY'"><History :size="20" :stroke-width="1.5" /><span>Lịch sử phiếu trả<strong>{{ cases.length }} phiếu</strong></span></button><button type="button" :aria-pressed="tab==='REFUNDS'" :class="{active:tab==='REFUNDS'}" @click="tab='REFUNDS'"><Wallet :size="20" :stroke-width="1.5" /><span>Khoản chờ hoàn<strong>{{ pending.length }} đơn</strong></span></button></div>
  <p v-if="error" class="returns-note" role="alert">{{ error }}</p>
  <section class="admin-surface returns-surface"><OrderReturnForm v-if="tab==='NEW'" :initial-code="String(route.query.order||'')" @updated="reload" @history="show" />
   <template v-else><div class="returns-toolbar"><h2>{{ tab==='HISTORY'?'Lịch sử trả hàng':'Chờ hoàn tiền' }}</h2><select v-if="tab==='HISTORY'" v-model="scope" aria-label="Trạng thái phiếu trả"><option value="ALL">Tất cả</option><option value="CLOSED">Đã hoàn tất</option><option value="OPEN">Chưa hoàn tất</option></select><input v-model="search" type="search" maxlength="100" placeholder="Tìm mã đơn hoặc khách…" aria-label="Tìm dữ liệu trả hàng" /></div>
    <p v-if="loading" class="returns-empty" role="status">Đang tải…</p>
    <template v-else-if="tab==='HISTORY'"><p v-if="!cases.length" class="returns-empty">Chưa có phiếu trả hàng phù hợp.</p><table v-else><thead><tr><th>Phiếu / Đơn hàng</th><th>Khách hàng & sản phẩm</th><th>Trạng thái</th><th>Tiền hoàn</th><th></th></tr></thead><tbody><tr v-for="r in cases" :key="r.id"><td><strong>#{{ r.id }}</strong><small>{{ code(r) }}</small><small>{{ date(r.created_at) }}</small></td><td><strong>{{ r.customer_name||'Khách hàng' }}</strong><small v-for="(i,index) in r.items" :key="index">{{ i.name }} · {{ i.color }} / {{ i.size }} · Đã trả {{ i.good_quantity+i.damaged_quantity }}</small></td><td><span class="returns-status">{{ returnStatuses[r.status]||r.status }}</span></td><td>{{ money(r.refund_amount) }}</td><td><button type="button" :aria-label="`Chi tiết phiếu trả ${r.id}`" @click="show(r)">Chi tiết <ArrowUpRight :size="13" /></button></td></tr></tbody></table></template>
    <template v-else><p v-if="!refunds.length" class="returns-empty">Không còn đơn chờ hoàn tiền.</p><table v-else><thead><tr><th>Đơn hàng</th><th>Khách hàng</th><th>Trạng thái đơn</th><th>Cần hoàn</th><th></th></tr></thead><tbody><tr v-for="o in refunds" :key="o.id"><td><strong>{{ code(o) }}</strong><small>{{ date(o.date) }}</small></td><td>{{ o.customer_name }}</td><td>{{ o.status }}</td><td>{{ money(o.pending_refund_amount) }}</td><td><button type="button" :aria-label="`Hoàn tiền đơn ${code(o)}`" @click="show(o)">Hoàn tiền <ArrowUpRight :size="13" /></button></td></tr></tbody></table></template>
   </template>
  </section>
  <AfterSalesPanel v-if="selected" :key="selected.id" :order-id="selected.id" :order-code="selected.code" admin start-open @updated="reload" @close="selected=null" />
 </div>
</template>
<style scoped>
.returns-heading{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:24px}.returns-heading>div>span{font-size:9px;letter-spacing:.12em;color:#d4001a}.returns-heading h1{font-size:28px;line-height:1.5;margin:8px 0}.returns-heading p{font-size:12px;color:#8a95a5;margin:0}.returns-page button{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 12px;border:1px solid #dce3ed;border-radius:7px;background:#fff;color:#637087;font:inherit;font-size:11px;cursor:pointer}.returns-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;margin-bottom:22px}.returns-tabs>button{justify-content:flex-start;align-items:flex-start;gap:13px;padding:18px;text-align:left;border-radius:11px}.returns-tabs>button.active{border-color:#d4001a50;background:#fff9fa;color:#d4001a}.returns-tabs svg{flex-shrink:0;margin-top:3px}.returns-tabs span{font-size:10px;color:#8b95a5;line-height:1.7}.returns-tabs strong{display:block;font-size:17px;font-weight:600;line-height:1.7;color:#2c394d}.returns-surface{padding:20px;min-width:0}.returns-toolbar{display:flex;align-items:center;gap:13px;flex-wrap:wrap;margin-bottom:20px}.returns-toolbar h2{font:inherit;font-size:16px;font-weight:600;margin:0 auto 0 0}.returns-toolbar input,.returns-toolbar select{padding:10px 12px;border:1px solid #dce3ed;border-radius:8px;background:#fff;font:inherit;font-size:11px;color:#53647a}.returns-toolbar input{min-width:0;max-width:260px;flex:1}.returns-note{padding:13px;border:1px solid #f0dbe1;border-radius:8px;background:#fff6f8;color:#a44258;font-size:12px}.returns-empty{padding:40px 15px;text-align:center;font-size:12px;color:#8b95a5}table{width:100%;table-layout:fixed;border-collapse:collapse}th{text-align:left;font-size:9px;text-transform:uppercase;font-weight:500;color:#929bab;background:#f8fafc;padding:12px 9px}td{border-top:1px solid #e9edf2;padding:16px 9px;font-size:11px;color:#627186;overflow-wrap:anywhere}th:first-child{width:24%}th:nth-child(2){width:29%}th:last-child{width:90px}td strong{font-size:11px;font-weight:600;color:#37465d;line-height:1.8}td small{display:block;color:#949dac;font-size:10px;line-height:1.8;margin-top:4px}.returns-status{font-size:10px;line-height:1.6;color:#51705c;padding:5px 8px;border:1px solid #dce9e0;border-radius:13px;background:#f4faf6}button:disabled{opacity:.5;cursor:wait}:focus-visible{outline:2px solid #d4001a;outline-offset:3px}@media(max-width:750px){.returns-tabs{grid-template-columns:1fr;gap:8px}.returns-tabs>button{padding:12px 15px}.returns-tabs strong{font-size:14px}.returns-heading h1{font-size:24px}.returns-surface{padding:14px}.returns-toolbar input{flex-basis:100%;max-width:none}table,tbody{display:block;width:100%}thead{display:none}tr{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:15px;border:1px solid #e5eaf1;border-radius:10px;margin-bottom:12px}td{display:block;border:0;padding:0;font-size:12px;line-height:1.8}td:nth-child(1),td:nth-child(2),td:last-child{grid-column:1/-1}td:last-child button{width:100%}td small{font-size:11px}}
</style>
