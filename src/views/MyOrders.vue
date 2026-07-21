<script setup>
import { computed, onMounted, onUnmounted, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import {
  ordersByCurrentUser, ORDER_STATUS, ORDER_STATUS_LIST, REVENUE_HOLD_DAYS,
  loadOrders, confirmReceived, cancelOrder, runAutoCancel, daysUntilRevenue, formatCurrency,
} from '../stores/orderStore'
import { notify } from '../stores/uiStore'

const router = useRouter()
const search = ref('')
const statusFilter = ref('ALL')
const expanded = ref(null)
const isLoading = ref(true)

const statusMeta = {
  PENDING: { color: 'amber', icon: 'bi-hourglass-split' },
  CONFIRMED: { color: 'blue', icon: 'bi-check2-circle' },
  SHIPPING: { color: 'cyan', icon: 'bi-truck' },
  DELIVERED: { color: 'lime', icon: 'bi-box-seam' },
  RECEIVED: { color: 'green', icon: 'bi-bag-check' },
  COMPLETED: { color: 'green', icon: 'bi-patch-check-fill' },
  CANCELLED: { color: 'red', icon: 'bi-x-circle' },
  RETURNED: { color: 'gray', icon: 'bi-arrow-return-left' },
}

// Luồng trạng thái chuẩn để vẽ thanh tiến trình (stepper).
const FLOW = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'RECEIVED', 'COMPLETED']
const stepIndex = (s) => FLOW.indexOf(s)

const filtered = computed(() => {
  let list = [...ordersByCurrentUser.value]
  if (statusFilter.value !== 'ALL') list = list.filter((o) => o.status === statusFilter.value)
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter((o) => (o.items || []).some((it) => (it.product_name || it.product?.product_name || '').toLowerCase().includes(q)) || String(o.id).includes(q))
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

const toggle = (id) => { expanded.value = expanded.value === id ? null : id }

const handleReceived = (order) => {
  const r = confirmReceived(order.id)
  if (r?.ok === false) { notify({ type: 'error', message: r.message }); return }
  notify({ type: 'success', title: 'Đã xác nhận nhận hàng', message: `Đơn ${order.id} hoàn tất. Cảm ơn bạn!` })
}
const cancelModal = reactive({ open: false, orderId: null, reason: '', serverId: null })

const handleCancel = (order) => {
  cancelModal.orderId = order.id
  cancelModal.serverId = order.serverId
  cancelModal.reason = ''
  cancelModal.open = true
}

const closeCancelModal = () => { cancelModal.open = false }

const submitCancel = async () => {
  const reason = cancelModal.reason.trim() || 'Khách hàng hủy đơn.'
  cancelOrder(cancelModal.orderId, reason)
  notify({ type: 'success', title: 'Đã hủy đơn', message: `Đơn ${cancelModal.orderId} đã được hủy.` })
  if (cancelModal.serverId) {
    try {
      await fetch(`http://localhost:5000/api/orders/${cancelModal.serverId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Đã hủy', reason }),
      })
    } catch (e) { /* offline */ }
  }
  closeCancelModal()
}

const goReturn = (order) => { window.open('https://zalo.me/0123456789', '_blank') }
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

let pollTimer = null
onMounted(async () => { await loadOrders(); runAutoCancel(); isLoading.value = false; pollTimer = setInterval(loadOrders, 8000) })
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })
</script>

<template>
  <div class="orders-page">
    <div class="container-fluid px-4 py-4">
      <div class="sg-title-bar mb-2"></div>
      <h1 class="op-title">Đơn hàng của tôi</h1>

      <!-- Toolbar -->
      <div class="op-toolbar sg-card">
        <div class="op-search">
          <i class="bi bi-search"></i>
          <input v-model="search" type="search" placeholder="Tìm đơn theo tên sản phẩm hoặc mã đơn…">
        </div>
        <div class="op-filters">
          <button class="stat-pill" :class="{ active: statusFilter === 'ALL' }" @click="statusFilter = 'ALL'">Tất cả</button>
          <button v-for="s in ORDER_STATUS_LIST" :key="s.key" class="stat-pill" :class="{ active: statusFilter === s.key }" @click="statusFilter = s.key">{{ s.label }}</button>
        </div>
      </div>

      <div v-if="isLoading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="filtered.length === 0" class="empty sg-card">
        <i class="bi bi-inbox"></i><h5>Không có đơn hàng</h5>
        <p class="text-secondary">Bạn chưa có đơn hàng nào ở trạng thái này.</p>
        <router-link to="/products" class="btn-sg">Mua sắm ngay</router-link>
      </div>

      <div v-else class="order-list">
        <div v-for="o in filtered" :key="o.id" class="order-card sg-card">
          <!-- Header -->
          <div class="oc-head" @click="toggle(o.id)">
            <div class="oc-head-l">
              <span class="oc-id">#{{ o.id }}</span>
              <span class="oc-date"><i class="bi bi-calendar3"></i> {{ fmtDate(o.createdAt) }}</span>
            </div>
            <div class="oc-head-r">
              <span class="stat-badge" :class="statusMeta[o.status]?.color"><i class="bi" :class="statusMeta[o.status]?.icon"></i> {{ ORDER_STATUS[o.status] }}</span>
              <strong class="oc-total">{{ formatCurrency(o.total) }}</strong>
              <i class="bi bi-chevron-down oc-caret" :class="{ open: expanded === o.id }"></i>
            </div>
          </div>

          <!-- Preview thumbnails -->
          <div class="oc-thumbs">
            <img v-for="(it, i) in (o.items || []).slice(0, 4)" :key="i" :src="it.image_url || it.product?.image_url" :alt="it.product_name">
            <span v-if="(o.items || []).length > 4" class="more">+{{ o.items.length - 4 }}</span>
            <span class="oc-count">{{ (o.items || []).length }} sản phẩm</span>
          </div>

          <!-- Thanh tiến trình trạng thái -->
          <div v-if="!['CANCELLED','RETURNED'].includes(o.status)" class="oc-steps">
            <div v-for="(st, i) in FLOW" :key="st" class="oc-step" :class="{ done: stepIndex(o.status) >= i, current: o.status === st }">
              <span class="oc-step-dot"><i class="bi" :class="statusMeta[st]?.icon"></i></span>
              <small>{{ ORDER_STATUS[st] }}</small>
            </div>
          </div>
          <div v-else class="oc-status-flat" :class="statusMeta[o.status]?.color">
            <i class="bi" :class="statusMeta[o.status]?.icon"></i> {{ ORDER_STATUS[o.status] }}
          </div>

          <!-- Auto-cancel reason -->
          <div v-if="o.status === 'CANCELLED' && o.cancelReason" class="oc-cancel">
            <i class="bi bi-exclamation-triangle"></i> {{ o.cancelReason }}
          </div>

          <!-- Revenue hold notice -->
          <div v-if="o.status === 'RECEIVED' && !o.isCountedAsRevenue" class="oc-hold">
            <i class="bi bi-shield-check"></i> Đơn đã nhận. Đang trong thời gian bảo đảm đổi trả {{ REVENUE_HOLD_DAYS }} ngày — còn <strong>{{ daysUntilRevenue(o) }}</strong> ngày.
          </div>

          <!-- Quick actions (always visible) -->
          <div class="oc-actions" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
            <button v-if="['PENDING','CONFIRMED'].includes(o.status)" class="btn-sg-outline" style="color:#b91c1c;border-color:#fecaca;" @click.stop="handleCancel(o)"><i class="bi bi-x-circle me-1"></i>Hủy đơn</button>
            <button v-if="o.status === 'DELIVERED'" class="btn-sg" @click.stop="handleReceived(o)"><i class="bi bi-bag-check me-1"></i>Đã nhận hàng</button>
            <button v-if="o.status === 'RECEIVED'" class="btn-sg-outline" @click.stop="goReturn(o)"><i class="bi bi-chat-dots me-1"></i>Liên hệ shop</button>
            <button v-if="o.status === 'CANCELLED'" class="btn-sg" @click.stop="router.push('/products')"><i class="bi bi-arrow-repeat me-1"></i>Đặt lại</button>
          </div>

          <!-- Expanded detail -->
          <transition name="exp">
            <div v-if="expanded === o.id" class="oc-detail">
              <div class="oc-line" v-for="(it, i) in o.items" :key="i">
                <img :src="it.image_url || it.product?.image_url" class="oc-line-img">
                <div class="flex-grow-1">
                  <div class="oc-line-name">{{ it.product_name || it.product?.product_name }}</div>
                  <div class="oc-line-attr">
                    <span v-if="it.size">Size {{ it.size?.size_name || it.size }}</span>
                    <span v-if="it.color">· {{ it.color?.color_label || it.color }}</span>
                    <span v-if="it.attributes?.material_name">· {{ it.attributes.material_name }}</span>
                  </div>
                </div>
                <div class="oc-line-qty">x{{ it.quantity }}</div>
                <div class="oc-line-price">{{ formatCurrency(it.subtotal || it.unitPrice * it.quantity) }}</div>
              </div>
              <div class="oc-meta">
                <div><span>Giao đến</span><strong>{{ o.customer?.address }}, {{ o.customer?.province }}</strong></div>
                <div><span>Vận chuyển</span><strong>{{ o.shippingMethod?.name }} ({{ o.shippingMethod?.eta }})</strong></div>
                <div><span>Thanh toán</span><strong>{{ o.paymentMethod?.name }}</strong></div>
                <div><span>Phí giao</span><strong>{{ formatCurrency(o.shippingFee) }}</strong></div>
              </div>

            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- Cancel Order Modal -->
    <transition name="suc">
      <div v-if="cancelModal.open" class="modal-overlay" @click.self="closeCancelModal">
        <div class="sg-card modal-box">
          <h5 class="fw-bold mb-3">Lý do hủy đơn</h5>
          <p class="text-secondary mb-3">Vui lòng cho chúng tôi biết lý do bạn muốn hủy đơn hàng này (không bắt buộc).</p>
          <textarea v-model="cancelModal.reason" class="sg-input w-100" rows="3" placeholder="Nhập lý do hủy đơn..."></textarea>
          <div class="d-flex gap-2 mt-4 justify-content-end">
            <button class="btn-sg-outline" @click="closeCancelModal">Đóng</button>
            <button class="btn-sg" style="background: #ef4444; box-shadow: 0 10px 24px rgba(239, 68, 68, 0.3);" @click="submitCancel">Xác nhận hủy</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.orders-page { background: var(--sg-canvas); min-height: 100vh; }
.op-title { font-weight: 900; font-size: 1.9rem; letter-spacing: -.02em; }
.op-toolbar { padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; margin: 14px 0 20px; }
.op-search { display: flex; align-items: center; gap: 10px; background: var(--sg-canvas); border: 1.5px solid var(--sg-line); border-radius: 12px; padding: 8px 14px; }
.op-search i { color: var(--sg-muted); }
.op-search input { border: 0; background: transparent; outline: none; width: 100%; font-weight: 500; }
.op-filters { display: flex; flex-wrap: wrap; gap: 8px; }
.stat-pill { border: 1.5px solid var(--sg-line); background: #fff; border-radius: 999px; padding: .35rem .9rem; font-size: .82rem; font-weight: 700; color: var(--sg-ink-2); transition: .2s; }
.stat-pill:hover { border-color: #1a3a6b; color: #1a3a6b; }
.stat-pill.active { background: var(--sg-ink); color: #fff; border-color: var(--sg-ink); }
.empty { text-align: center; padding: 60px; }
.empty i { font-size: 3rem; color: var(--sg-muted); }
.order-list { display: flex; flex-direction: column; gap: 14px; }
.order-card { padding: 18px; }
.oc-head { display: flex; justify-content: space-between; align-items: center; cursor: pointer; gap: 12px; flex-wrap: wrap; }
.oc-head-l { display: flex; align-items: center; gap: 14px; }
.oc-id { font-weight: 900; font-size: 1.05rem; }
.oc-date { font-size: .82rem; color: var(--sg-muted); }
.oc-head-r { display: flex; align-items: center; gap: 14px; }
.oc-total { font-size: 1.1rem; color: #1a3a6b; }
.oc-caret { transition: transform .3s; color: var(--sg-muted); }
.oc-caret.open { transform: rotate(180deg); }
.stat-badge { font-size: .76rem; font-weight: 800; padding: .3rem .7rem; border-radius: 999px; display: inline-flex; align-items: center; gap: 5px; }
.stat-badge.amber { background: #fef3c7; color: #b45309; }
.stat-badge.blue { background: #dbeafe; color: #1d4ed8; }
.stat-badge.cyan { background: #cffafe; color: #0e7490; }
.stat-badge.lime { background: #ecfccb; color: #4d7c0f; }
.stat-badge.green { background: #dcfce7; color: #15803d; }
.stat-badge.red { background: #fee2e2; color: #b91c1c; }
.stat-badge.gray { background: #e5e7eb; color: #374151; }
.oc-thumbs { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
.oc-thumbs img { width: 52px; height: 52px; border-radius: 10px; object-fit: cover; background: var(--sg-canvas); mix-blend-mode: multiply; }
.oc-thumbs .more { width: 52px; height: 52px; border-radius: 10px; background: var(--sg-canvas); display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--sg-muted); }
.oc-count { margin-left: auto; font-size: .82rem; color: var(--sg-muted); }
.oc-cancel { margin-top: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 10px 12px; font-size: .82rem; color: #b91c1c; }
.oc-hold { margin-top: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 10px 12px; font-size: .82rem; color: #1d4ed8; }
.oc-detail { margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--sg-line); }
.oc-line { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.oc-line-img { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; background: var(--sg-canvas); mix-blend-mode: multiply; }
.oc-line-name { font-weight: 700; font-size: .9rem; }
.oc-line-attr { font-size: .76rem; color: var(--sg-muted); }
.oc-line-qty { font-weight: 700; color: var(--sg-ink-2); }
.oc-line-price { font-weight: 800; min-width: 90px; text-align: right; }
.oc-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; background: var(--sg-canvas); border-radius: 12px; padding: 14px; }
.oc-meta span { display: block; font-size: .72rem; color: var(--sg-muted); }
.oc-meta strong { font-size: .85rem; }
.oc-actions { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
.exp-enter-active, .exp-leave-active { transition: all .3s ease; overflow: hidden; }
.exp-enter-from, .exp-leave-to { opacity: 0; max-height: 0; }
.exp-enter-to, .exp-leave-from { opacity: 1; max-height: 1200px; }
.oc-steps { display: flex; align-items: flex-start; justify-content: space-between; gap: 4px; margin-top: 16px; }
.oc-step { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; text-align: center; }
.oc-step:not(:last-child)::after { content: ''; position: absolute; top: 15px; left: 50%; width: 100%; height: 3px; background: var(--sg-line); z-index: 0; }
.oc-step.done:not(:last-child)::after { background: #1a3a6b; }
.oc-step-dot { width: 32px; height: 32px; border-radius: 50%; background: #fff; border: 2px solid var(--sg-line); color: var(--sg-muted); display: flex; align-items: center; justify-content: center; font-size: .85rem; z-index: 1; }
.oc-step.done .oc-step-dot { background: #1a3a6b; border-color: #1a3a6b; color: #fff; }
.oc-step.current .oc-step-dot { box-shadow: 0 0 0 4px rgba(26,58,107,.2); }
.oc-step small { font-size: .68rem; color: var(--sg-muted); font-weight: 700; line-height: 1.1; }
.oc-step.done small { color: var(--sg-ink); }
.oc-status-flat { margin-top: 14px; padding: 10px 14px; border-radius: 10px; font-weight: 800; font-size: .85rem; display: inline-flex; align-items: center; gap: 6px; }
.oc-status-flat.red { background: #fee2e2; color: #b91c1c; }
.oc-status-flat.gray { background: #e5e7eb; color: #374151; }
@media (max-width: 576px) { .oc-meta { grid-template-columns: 1fr; } .oc-step small { display: none; } }
.modal-overlay { position: fixed; inset: 0; z-index: 3000; background: rgba(10,20,45,.55); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 18px; }
.modal-box { max-width: 520px; width: 100%; padding: 28px; border-radius: 22px; }
.suc-enter-active { transition: opacity .3s; }
.suc-enter-from { opacity: 0; }
</style>
