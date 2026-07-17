<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ordersByCurrentUser, loadOrders, formatCurrency, requestReturn } from '../stores/orderStore'
import { notify } from '../stores/uiStore'
import { postOffices as mockPO } from '../data/mockData'

const route = useRoute()
const router = useRouter()
const order = ref(null)
const postOffices = ref([])
const isLoading = ref(true)
const submitted = ref(false)
const API = 'http://localhost:5000/api'

const form = reactive({
  method: 'SHIPPER',       // SHIPPER = shipper tự lấy | POST_OFFICE = gửi tại bưu cục
  postOfficeId: null,
  reason: '',
  trackingCode: '',
  items: [],
})

const genTracking = () => 'SG' + Date.now().toString().slice(-9) + Math.floor(Math.random() * 90 + 10)

const fetchData = async () => {
  const id = String(route.params.orderId || '')
  try {
    const r = await fetch(`${API}/postoffices`)
    postOffices.value = (await r.json()).map((p) => ({ id: p.PostOfficeID || p.id, name: p.Name || p.name, address: p.Address || p.address, phone: p.Phone || p.phone }))
  } catch { postOffices.value = mockPO }
  await loadOrders()
  order.value = ordersByCurrentUser.value.find((o) => String(o.id) === id) || null
  if (order.value) form.items = order.value.items.map((it) => ({ ...it, checked: true }))
  form.postOfficeId = postOffices.value[0]?.id
  isLoading.value = false
}

const selectedPO = computed(() => postOffices.value.find((p) => p.id === form.postOfficeId))
const refundAmount = computed(() => form.items.filter((i) => i.checked).reduce((s, i) => s + (i.subtotal || i.unitPrice * i.quantity), 0))

const submit = () => {
  if (!form.reason.trim()) { notify({ type: 'error', message: 'Vui lòng nhập lý do trả hàng.' }); return }
  if (!form.items.some((i) => i.checked)) { notify({ type: 'error', message: 'Chọn ít nhất 1 sản phẩm để trả.' }); return }
  if (form.method === 'POST_OFFICE' && !form.postOfficeId) { notify({ type: 'error', message: 'Chọn bưu cục để gửi trả.' }); return }
  form.trackingCode = genTracking()
  const r = requestReturn(order.value.id, {
    method: form.method,
    postOffice: form.method === 'POST_OFFICE' ? selectedPO.value : null,
    reason: form.reason,
    trackingCode: form.trackingCode,
    refundAmount: refundAmount.value,
    items: form.items.filter((i) => i.checked),
  })
  if (r?.ok === false) { notify({ type: 'error', message: r.message }); return }
  submitted.value = true
  notify({ type: 'success', title: 'Đã tạo yêu cầu trả hàng', message: `Mã vận đơn: ${form.trackingCode}` })
}
</script>

<template>
  <div class="return-page">
    <div class="container-fluid px-4 py-4">
      <div class="sg-title-bar mb-2"></div>
      <h1 class="rt-title">Yêu cầu trả hàng</h1>

      <div v-if="isLoading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="!order" class="empty sg-card"><i class="bi bi-inbox"></i><h5>Không tìm thấy đơn hàng</h5><router-link to="/orders" class="btn-sg">Về đơn hàng</router-link></div>

      <!-- Success -->
      <div v-else-if="submitted" class="sg-card rt-success">
        <div class="suc-check"><i class="bi bi-check-lg"></i></div>
        <h3>Yêu cầu trả hàng đã được ghi nhận</h3>
        <p class="text-secondary">Vui lòng lưu lại mã vận đơn để theo dõi.</p>
        <div class="rt-track"><span>Mã vận đơn</span><strong>{{ form.trackingCode }}</strong></div>
        <div class="rt-guide">
          <template v-if="form.method === 'SHIPPER'">
            <p><i class="bi bi-truck"></i> Shipper sẽ đến lấy hàng tại địa chỉ của bạn. Vui lòng đóng gói sản phẩm và ghi mã vận đơn <strong>{{ form.trackingCode }}</strong> lên kiện hàng.</p>
          </template>
          <template v-else>
            <p><i class="bi bi-shop"></i> Vui lòng mang hàng đến bưu cục: <strong>{{ selectedPO?.name }}</strong> — {{ selectedPO?.address }}.</p>
            <p>Ghi mã vận đơn <strong>{{ form.trackingCode }}</strong> và mã đơn <strong>#{{ order.id }}</strong> lên kiện hàng.</p>
          </template>
        </div>
        <router-link to="/orders" class="btn-sg mt-2">Về đơn hàng</router-link>
      </div>

      <div v-else class="row g-4 mt-1">
        <div class="col-lg-7">
          <!-- Method -->
          <div class="sg-card rt-block">
            <h6 class="rt-h"><span class="co-num">1</span> Hình thức trả hàng</h6>
            <div class="method-grid">
              <label class="method-opt" :class="{ active: form.method === 'SHIPPER' }">
                <input type="radio" value="SHIPPER" v-model="form.method" hidden>
                <div class="m-ic blue"><i class="bi bi-truck"></i></div>
                <div><div class="m-name">Shipper tự lấy</div><div class="m-desc">Nhân viên giao hàng đến tận nơi lấy hàng.</div></div>
              </label>
              <label class="method-opt" :class="{ active: form.method === 'POST_OFFICE' }">
                <input type="radio" value="POST_OFFICE" v-model="form.method" hidden>
                <div class="m-ic warm"><i class="bi bi-shop"></i></div>
                <div><div class="m-name">Gửi tại bưu cục</div><div class="m-desc">Bạn tự mang hàng đến bưu cục gần nhất.</div></div>
              </label>
            </div>

            <!-- Post office list -->
            <div v-if="form.method === 'POST_OFFICE'" class="po-list">
              <label v-for="p in postOffices" :key="p.id" class="po-item" :class="{ active: form.postOfficeId === p.id }">
                <input type="radio" :value="p.id" v-model="form.postOfficeId" hidden>
                <i class="bi bi-geo-alt-fill"></i>
                <div class="flex-grow-1"><div class="po-name">{{ p.name }}</div><div class="po-addr">{{ p.address }}</div><div class="po-phone"><i class="bi bi-telephone"></i> {{ p.phone }}</div></div>
                <i class="bi bi-check-circle-fill po-check"></i>
              </label>
            </div>
          </div>

          <!-- Items + reason -->
          <div class="sg-card rt-block">
            <h6 class="rt-h"><span class="co-num">2</span> Sản phẩm & lý do</h6>
            <div class="ret-item" v-for="(it, i) in form.items" :key="i">
              <input type="checkbox" v-model="it.checked">
              <img :src="it.image_url || it.product?.image_url">
              <div class="flex-grow-1"><div class="ret-name">{{ it.product_name || it.product?.product_name }}</div><div class="ret-attr">Size {{ it.size?.size_name || it.size }} · x{{ it.quantity }}</div></div>
              <div class="ret-price">{{ formatCurrency(it.subtotal || it.unitPrice * it.quantity) }}</div>
            </div>
            <label class="co-label mt-3">Lý do trả hàng</label>
            <textarea v-model="form.reason" class="sg-input w-100" rows="3" placeholder="Mô tả lý do (sản phẩm lỗi, sai size, không đúng mô tả…)"></textarea>
          </div>
        </div>

        <!-- Summary -->
        <div class="col-lg-5">
          <div class="sg-card rt-summary">
            <h6 class="fw-bold mb-3">Thông tin hoàn trả</h6>
            <div class="sum-row"><span>Mã đơn gốc</span><strong>#{{ order.id }}</strong></div>
            <div class="sum-row"><span>Hình thức</span><strong>{{ form.method === 'SHIPPER' ? 'Shipper tự lấy' : 'Gửi bưu cục' }}</strong></div>
            <div class="sum-row" v-if="form.method === 'POST_OFFICE' && selectedPO"><span>Bưu cục</span><strong>{{ selectedPO.name }}</strong></div>
            <hr>
            <div class="sum-row total"><span>Hoàn tiền dự kiến</span><strong>{{ formatCurrency(refundAmount) }}</strong></div>
            <div class="rt-note"><i class="bi bi-info-circle"></i> Mã vận đơn sẽ được cấp sau khi gửi yêu cầu. Vui lòng ghi mã vận đơn và mã đơn lên kiện hàng.</div>
            <button class="btn-sg w-100 mt-3" @click="submit"><i class="bi bi-send me-2"></i>Gửi yêu cầu trả hàng</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.return-page { background: var(--sg-canvas); min-height: 100vh; }
.rt-title { font-weight: 900; font-size: 1.9rem; letter-spacing: -.02em; }
.empty { text-align: center; padding: 60px; }
.empty i { font-size: 3rem; color: var(--sg-muted); }
.rt-block { padding: 22px; margin-bottom: 18px; }
.rt-h { font-weight: 800; display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.co-num { width: 28px; height: 28px; border-radius: 50%; background: var(--sg-grad-primary); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: .9rem; }
.co-label { font-weight: 700; font-size: .82rem; color: var(--sg-ink-2); margin-bottom: 6px; display: block; }
.method-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.method-opt { display: flex; gap: 12px; align-items: center; border: 2px solid var(--sg-line); border-radius: 16px; padding: 16px; cursor: pointer; transition: .2s; }
.method-opt:hover { border-color: var(--sg-blue); }
.method-opt.active { border-color: var(--sg-blue); background: var(--sg-soft); }
.m-ic { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.2rem; flex-shrink: 0; }
.m-ic.blue { background: var(--sg-grad-primary); } .m-ic.warm { background: var(--sg-grad-warm); }
.m-name { font-weight: 800; } .m-desc { font-size: .78rem; color: var(--sg-muted); }
.po-list { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.po-item { display: flex; gap: 12px; align-items: center; border: 1.5px solid var(--sg-line); border-radius: 14px; padding: 14px; cursor: pointer; transition: .2s; }
.po-item:hover { border-color: var(--sg-blue); }
.po-item.active { border-color: var(--sg-blue); background: var(--sg-soft); }
.po-item > i { font-size: 1.3rem; color: var(--sg-orange); }
.po-name { font-weight: 800; } .po-addr { font-size: .82rem; color: var(--sg-ink-2); } .po-phone { font-size: .78rem; color: var(--sg-muted); }
.po-check { color: var(--sg-blue); opacity: 0; font-size: 1.3rem; }
.po-item.active .po-check { opacity: 1; }
.ret-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px dashed var(--sg-line); }
.ret-item input { width: 18px; height: 18px; accent-color: var(--sg-blue); }
.ret-item img { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; background: var(--sg-canvas); mix-blend-mode: multiply; }
.ret-name { font-weight: 700; font-size: .9rem; } .ret-attr { font-size: .76rem; color: var(--sg-muted); }
.ret-price { font-weight: 800; }
.rt-summary { padding: 22px; position: sticky; top: 90px; }
.sum-row { display: flex; justify-content: space-between; margin-bottom: 8px; color: var(--sg-ink-2); }
.sum-row.total { font-size: 1.15rem; color: var(--sg-ink); } .sum-row.total strong { color: var(--sg-blue-700); }
.rt-note { background: var(--sg-canvas); border-radius: 12px; padding: 12px; font-size: .8rem; color: var(--sg-muted); margin-top: 12px; }
.rt-success { text-align: center; padding: 40px; max-width: 560px; margin: 20px auto; }
.suc-check { width: 76px; height: 76px; margin: 0 auto 16px; border-radius: 50%; background: linear-gradient(135deg,#22c55e,#16a34a); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 2.4rem; }
.rt-track { background: var(--sg-canvas); border-radius: 14px; padding: 16px; margin: 16px 0; }
.rt-track span { display: block; font-size: .74rem; color: var(--sg-muted); } .rt-track strong { font-size: 1.3rem; letter-spacing: .04em; color: var(--sg-blue-700); }
.rt-guide { text-align: left; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px 16px; font-size: .86rem; color: var(--sg-ink-2); }
.rt-guide i { color: var(--sg-blue); margin-right: 6px; }
@media (max-width: 576px) { .method-grid { grid-template-columns: 1fr; } }
</style>
