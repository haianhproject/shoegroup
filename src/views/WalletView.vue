<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '../services/apiClient'
import { formatCurrency } from '../stores/cartStore'
import { notify } from '../stores/uiStore'

const loading = ref(true)
const submitting = ref(false)
const balance = ref(0)
const transactions = ref([])
const withdrawals = ref([])
const panel = ref('overview')

const form = reactive({ method: 'VISA', amount: '', destination: '', holderName: '' })

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN')
}

const signedAmount = (value) => {
  const amount = Number(value) || 0
  return `${amount >= 0 ? '+' : ''}${formatCurrency(amount)}`
}

const isValidLuhn = (value) => {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return false
  let sum = 0
  let alternate = false
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i])
    if (alternate) { n *= 2; if (n > 9) n -= 9 }
    sum += n
    alternate = !alternate
  }
  return sum % 10 === 0
}

const loadWallet = async () => {
  loading.value = true
  try {
    const [wallet, history] = await Promise.all([api.get('/wallet'), api.get('/wallet/transactions')])
    balance.value = Number(wallet?.balance) || 0
    transactions.value = Array.isArray(history?.transactions) ? history.transactions : []
    withdrawals.value = Array.isArray(history?.withdrawals) ? history.withdrawals : []
  } catch (error) {
    notify({ type: 'error', message: error?.message || 'Không thể tải Ví ShoeGroup.' })
  } finally {
    loading.value = false
  }
}

const resetForm = () => Object.assign(form, { method: 'VISA', amount: '', destination: '', holderName: '' })

const submitWithdrawal = async () => {
  if (submitting.value) return
  const amount = Number(form.amount)
  const destination = String(form.destination || '').trim()
  if (!Number.isFinite(amount) || amount <= 0) {
    notify({ type: 'error', message: 'Nhập số tiền muốn rút lớn hơn 0.' }); return
  }
  if (amount > balance.value) {
    notify({ type: 'error', message: 'Số dư Ví ShoeGroup không đủ.' }); return
  }
  if (form.method === 'VISA') {
    const card = destination.replace(/\s+/g, '')
    if (!/^4\d{12,18}$/.test(card) || !isValidLuhn(card)) {
      notify({ type: 'error', message: 'Số thẻ Visa không hợp lệ.' }); return
    }
    if (!String(form.holderName || '').trim()) {
      notify({ type: 'error', message: 'Vui lòng nhập tên chủ thẻ Visa.' }); return
    }
  } else if (!/^0(?:3|5|7|8|9)\d{8}$/.test(destination.replace(/\s+/g, ''))) {
    notify({ type: 'error', message: 'Số điện thoại MoMo không hợp lệ.' }); return
  }
  if (typeof window !== 'undefined' && !window.confirm(`Xác nhận rút ${formatCurrency(amount)} về ${form.method === 'VISA' ? 'thẻ Visa' : 'ví MoMo'}?`)) return
  submitting.value = true
  try {
    const result = await api.post('/wallet/withdrawals', {
      method: form.method,
      amount,
      destination,
      holder_name: String(form.holderName || '').trim(),
    })
    balance.value = Number(result?.balance) || Math.max(0, balance.value - amount)
    resetForm()
    panel.value = 'history'
    await loadWallet()
    notify({ type: 'success', message: 'Đã tạo yêu cầu rút tiền. ShoeGroup sẽ xử lý sớm.' })
  } catch (error) {
    notify({ type: 'error', message: error?.message || 'Không thể tạo yêu cầu rút tiền.' })
  } finally {
    submitting.value = false
  }
}

const allHistory = computed(() => [
  ...transactions.value.filter((item) => String(item.type || '').toUpperCase() !== 'WITHDRAWAL').map((item) => ({ ...item, kind: 'wallet' })),
  ...withdrawals.value.map((item) => ({ ...item, kind: 'withdrawal', amount: -Number(item.amount || 0), description: `Rút tiền về ${item.method === 'VISA' ? 'thẻ Visa' : 'ví MoMo'}`, created_at: item.created_at })),
].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()))

onMounted(loadWallet)
</script>

<template>
  <div class="wallet-page">
    <div class="container-fluid px-4 py-4">
      <div class="sg-title-bar mb-2"></div>
      <div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
        <div>
          <h1 class="wallet-title mb-1">Ví ShoeGroup</h1>
          <p class="text-secondary mb-0">Tiền hoàn từ các yêu cầu trả hàng đã được xử lý sẽ cộng vào ví của bạn.</p>
        </div>
        <span class="wallet-badge"><i class="bi bi-shield-check me-1"></i>Hoàn tiền an toàn</span>
      </div>

      <div v-if="loading" class="sg-card text-center py-5 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Đang tải ví…</div>
      <template v-else>
        <div class="wallet-balance sg-card">
          <div><div class="wallet-label">Số dư khả dụng</div><div class="wallet-amount">{{ formatCurrency(balance) }}</div><small>VND · cập nhật tự động sau khi trả hàng thành công</small></div>
          <i class="bi bi-wallet2 wallet-icon"></i>
        </div>
        <div class="wallet-actions">
          <button class="wallet-action" :class="{ active: panel === 'history' }" type="button" @click="panel = panel === 'history' ? 'overview' : 'history'"><i class="bi bi-clock-history"></i><span>Lịch sử</span></button>
          <button class="wallet-action" :class="{ active: panel === 'withdraw' }" type="button" @click="panel = panel === 'withdraw' ? 'overview' : 'withdraw'"><i class="bi bi-arrow-up-right-circle"></i><span>Rút tiền</span></button>
        </div>

        <div v-if="panel === 'withdraw'" class="sg-card wallet-panel">
          <h5 class="fw-bold mb-1">Rút tiền từ Ví ShoeGroup</h5>
          <p class="text-secondary small mb-3">Chọn thẻ Visa hoặc số điện thoại MoMo nhận tiền. Yêu cầu sẽ ở trạng thái chờ xử lý để đối soát.</p>
          <div class="row g-3">
            <div class="col-md-4"><label class="co-label">Phương thức</label><select v-model="form.method" class="sg-input w-100"><option value="VISA">Thẻ Visa</option><option value="MOMO">Ví MoMo</option></select></div>
            <div class="col-md-4"><label class="co-label">Số tiền (VND)</label><input v-model="form.amount" class="sg-input w-100" type="number" min="1" step="1" placeholder="Nhập số tiền muốn rút"></div>
            <div class="col-md-4"><label class="co-label">{{ form.method === 'VISA' ? 'Số thẻ Visa' : 'Số điện thoại MoMo' }}</label><input v-model="form.destination" class="sg-input w-100" :inputmode="form.method === 'VISA' ? 'numeric' : 'tel'" :maxlength="form.method === 'VISA' ? 23 : 10" :placeholder="form.method === 'VISA' ? '13–19 chữ số' : '09xxxxxxxx'"></div>
            <div v-if="form.method === 'VISA'" class="col-md-6"><label class="co-label">Tên chủ thẻ</label><input v-model="form.holderName" class="sg-input w-100" maxlength="120" placeholder="Nhập đúng như trên thẻ"></div>
          </div>
          <div class="d-flex justify-content-end mt-3"><button class="btn-sg" type="button" :disabled="submitting" @click="submitWithdrawal"><span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>{{ submitting ? 'Đang gửi…' : 'Xác nhận rút tiền' }}</button></div>
        </div>

        <div v-if="panel === 'history'" class="sg-card wallet-panel">
          <h5 class="fw-bold mb-3">Lịch sử Ví ShoeGroup</h5>
          <div v-if="allHistory.length === 0" class="text-center text-muted py-4">Chưa có giao dịch nào.</div>
          <div v-else class="wallet-history"><div v-for="item in allHistory" :key="`${item.kind}-${item.id}`" class="wallet-history-row"><div><strong>{{ item.description || (item.kind === 'withdrawal' ? 'Yêu cầu rút tiền' : 'Giao dịch ví') }}</strong><small>{{ formatDate(item.created_at) }}<span v-if="item.kind === 'withdrawal'" class="ms-2 wallet-status">{{ item.status }}</span></small></div><strong :class="Number(item.amount) >= 0 ? 'amount-plus' : 'amount-minus'">{{ signedAmount(item.amount) }}</strong></div></div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.wallet-page { background: var(--sg-canvas); min-height: 100vh; }
.wallet-title { font-size: clamp(1.6rem, 3vw, 2.2rem); font-weight: 900; }
.wallet-badge { padding: .45rem .8rem; border-radius: 999px; background: #ecfdf5; color: #047857; font-size: .78rem; font-weight: 700; }
.wallet-balance { padding: 28px 32px; background: linear-gradient(120deg, #0A0A0A, #292929); color: #fff; display: flex; justify-content: space-between; align-items: center; border-radius: 18px; }
.wallet-label { opacity: .75; font-size: .8rem; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; }
.wallet-amount { font-size: clamp(2rem, 5vw, 3rem); font-weight: 900; letter-spacing: -.03em; margin: 4px 0; }
.wallet-balance small { opacity: .7; }
.wallet-icon { font-size: 4.5rem; opacity: .18; }
.wallet-actions { display: flex; gap: 12px; margin: 16px 0; }
.wallet-action { flex: 1; border: 1px solid var(--sg-line); background: #fff; padding: 15px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 9px; font-weight: 800; color: var(--sg-ink-2); transition: .2s; cursor: pointer; }
.wallet-action i { font-size: 1.15rem; }
.wallet-action:hover, .wallet-action.active { background: #0A0A0A; color: #fff; border-color: #0A0A0A; }
.wallet-panel { padding: 24px; border-radius: 16px; }
.wallet-history { display: flex; flex-direction: column; }
.wallet-history-row { display: flex; justify-content: space-between; gap: 15px; padding: 14px 0; border-bottom: 1px solid var(--sg-line); }
.wallet-history-row:last-child { border-bottom: 0; }
.wallet-history-row small { display: block; margin-top: 4px; color: var(--sg-muted); font-size: .78rem; }
.wallet-status { padding: .15rem .45rem; border-radius: 999px; background: #f3f4f6; color: #4b5563; }
.amount-plus { color: #047857; white-space: nowrap; }
.amount-minus { color: #b91c1c; white-space: nowrap; }
@media (max-width: 575px) { .wallet-balance { padding: 22px; } .wallet-icon { font-size: 3.2rem; } .wallet-history-row { align-items: flex-start; } }
</style>
