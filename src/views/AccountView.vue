<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { currentUser, updateProfile, logout } from '../stores/authStore'
import { notify } from '../stores/uiStore'
import { formatCurrency } from '../stores/cartStore'
import MyOrders from './MyOrders.vue'

const ADDR_KEY = 'shoegroup_addresses_v1'
const route = useRoute()
const router = useRouter()
const tab = ref(['orders', 'address', 'profile', 'coupons'].includes(route.query.tab) ? route.query.tab : 'profile')

onMounted(() => {
  if (route.query.tab === 'orders') tab.value = 'orders'
})

const setTab = (t) => {
  tab.value = t
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleLogout = () => {
  logout()
  notify({ type: 'success', title: 'Đã đăng xuất', message: 'Hẹn gặp lại bạn!' })
  router.push('/')
}

const profile = reactive({
  full_name: currentUser.value?.full_name || '',
  email: currentUser.value?.email || '',
  phone: currentUser.value?.phone || '',
})
const savingProfile = ref(false)

const saveProfile = async () => {
  savingProfile.value = true
  const r = await updateProfile({ id: currentUser.value?.id, full_name: profile.full_name, phone: profile.phone })
  savingProfile.value = false
  if (r?.ok === false) { notify({ type: 'error', message: r.message || 'Không thể cập nhật.' }); return }
  notify({ type: 'success', title: 'Đã lưu', message: 'Thông tin cá nhân đã cập nhật.' })
}

/* ---- Address CRUD (local) ---- */
const loadAddrs = () => { try { return JSON.parse(localStorage.getItem(ADDR_KEY) || '[]') } catch { return [] } }
const addresses = ref(loadAddrs())
const persist = () => localStorage.setItem(ADDR_KEY, JSON.stringify(addresses.value))

const modal = reactive({ open: false, editId: null, recipient: '', phone: '', province: '', line: '', isDefault: false })
const openAdd = () => { Object.assign(modal, { open: true, editId: null, recipient: '', phone: '', province: '', line: '', isDefault: addresses.value.length === 0 }) }
const openEdit = (a) => { Object.assign(modal, { open: true, editId: a.id, recipient: a.recipient, phone: a.phone, province: a.province, line: a.line, isDefault: a.isDefault }) }
const closeModal = () => { modal.open = false }

const saveAddr = () => {
  if (!modal.recipient || !modal.phone || !modal.line || !modal.province) { notify({ type: 'error', message: 'Vui lòng nhập đầy đủ thông tin địa chỉ.' }); return }
  if (modal.isDefault) addresses.value.forEach((a) => { a.isDefault = false })
  if (modal.editId) {
    const a = addresses.value.find((x) => x.id === modal.editId)
    Object.assign(a, { recipient: modal.recipient, phone: modal.phone, province: modal.province, line: modal.line, isDefault: modal.isDefault })
  } else {
    addresses.value.push({ id: Date.now(), recipient: modal.recipient, phone: modal.phone, province: modal.province, line: modal.line, isDefault: modal.isDefault })
  }
  persist(); closeModal()
  notify({ type: 'success', title: 'Đã lưu địa chỉ' })
}
const deleteAddr = (id) => { addresses.value = addresses.value.filter((a) => a.id !== id); persist(); notify({ type: 'info', message: 'Đã xóa địa chỉ.' }) }
const setDefault = (id) => { addresses.value.forEach((a) => { a.isDefault = a.id === id }); persist() }

const initials = computed(() => (profile.full_name || 'U').split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase())

const userCoupons = ref([
  { code: 'WELCOME30', discount: '-30%', desc: 'Giảm 30% cho thành viên mới', icon: 'bi-gift-fill', minOrder: '500.000đ', expire: '31/12/2026', used: false, expired: false },
  { code: 'FREESHIP', discount: 'Free Ship', desc: 'Miễn phí vận chuyển toàn quốc', icon: 'bi-truck', minOrder: '300.000đ', expire: '31/08/2026', used: false, expired: false },
  { code: 'SUMMER20', discount: '-20%', desc: 'Ưu đãi mùa hè 2026', icon: 'bi-sun-fill', minOrder: '400.000đ', expire: '30/09/2026', used: false, expired: false },
  { code: 'FLASH50K', discount: '-50.000đ', desc: 'Flash sale cuối tuần', icon: 'bi-lightning-fill', minOrder: '800.000đ', expire: '15/07/2026', used: true, expired: false },
  { code: 'NEWYEAR', discount: '-15%', desc: 'Chào năm mới 2026', icon: 'bi-stars', minOrder: '0đ', expire: '31/01/2026', used: false, expired: true },
])

const copyCoupon = (code) => {
  navigator.clipboard.writeText(code).then(() => notify({ type: 'success', title: 'Đã sao chép!', message: code }))
}
</script>

<template>
  <div class="account-page">
    <div class="container-fluid px-4 py-4">
      <div class="row g-4">
        <!-- Sidebar -->
        <div class="col-lg-3">
          <div class="sg-card acc-side">
            <div class="acc-avatar">{{ initials }}</div>
            <h6 class="fw-bold mb-0">{{ profile.full_name || 'Khách hàng' }}</h6>
            <p class="text-muted small">{{ profile.email }}</p>
            <nav class="acc-nav">
              <button :class="{ active: tab === 'profile' }" @click="setTab('profile')"><i class="bi bi-person"></i> Thông tin cá nhân</button>
              <button :class="{ active: tab === 'address' }" @click="setTab('address')"><i class="bi bi-geo-alt"></i> Sổ địa chỉ</button>
              <button :class="{ active: tab === 'orders' }" @click="setTab('orders')"><i class="bi bi-box-seam"></i> Đơn hàng của tôi</button>
              <button :class="{ active: tab === 'coupons' }" @click="setTab('coupons')"><i class="bi bi-ticket-perforated"></i> Mã giảm giá</button>
              <button class="acc-logout" @click="handleLogout"><i class="bi bi-box-arrow-right"></i> Đăng xuất</button>
            </nav>
          </div>
        </div>

        <div class="col-lg-9 acc-content">
          <!-- Profile -->
          <div v-if="tab === 'profile'" class="sg-card acc-block">
            <div class="sg-title-bar mb-2"></div>
            <h5 class="fw-bold">Thông tin cá nhân</h5>
            <div class="row g-3 mt-1">
              <div class="col-md-6"><label class="co-label">Họ tên</label><input v-model="profile.full_name" class="sg-input w-100"></div>
              <div class="col-md-6"><label class="co-label">Số điện thoại</label><input v-model="profile.phone" class="sg-input w-100"></div>
              <div class="col-md-6"><label class="co-label">Email</label><input v-model="profile.email" class="sg-input w-100" disabled></div>
            </div>
            <button class="btn-sg mt-3" :disabled="savingProfile" @click="saveProfile"><i class="bi bi-check2 me-1"></i>{{ savingProfile ? 'Đang lưu…' : 'Lưu thay đổi' }}</button>
          </div>

          <!-- Orders (inline trong trang cá nhân) -->
          <div v-else-if="tab === 'orders'" class="acc-orders">
            <MyOrders />
          </div>

          <!-- Addresses -->
          <div v-else-if="tab === 'address'" class="sg-card acc-block">
            <div class="d-flex justify-content-between align-items-center">
              <div><div class="sg-title-bar mb-2"></div><h5 class="fw-bold mb-0">Sổ địa chỉ</h5></div>
              <button class="btn-sg" @click="openAdd"><i class="bi bi-plus-lg me-1"></i>Thêm địa chỉ</button>
            </div>
            <div v-if="addresses.length === 0" class="text-center py-5 text-muted">
              <i class="bi bi-geo-alt" style="font-size:2.4rem"></i><p class="mt-2">Chưa có địa chỉ nào.</p>
            </div>
            <div v-else class="addr-list">
              <div v-for="a in addresses" :key="a.id" class="addr-card" :class="{ def: a.isDefault }">
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center gap-2"><strong>{{ a.recipient }}</strong><span class="text-muted">| {{ a.phone }}</span><span v-if="a.isDefault" class="sg-chip sg-chip-blue">Mặc định</span></div>
                  <div class="text-secondary mt-1">{{ a.line }}, {{ a.province }}</div>
                </div>
                <div class="addr-actions">
                  <button v-if="!a.isDefault" class="link-btn" @click="setDefault(a.id)">Đặt mặc định</button>
                  <button class="link-btn" @click="openEdit(a)"><i class="bi bi-pencil"></i> Sửa</button>
                  <button class="link-btn danger" @click="deleteAddr(a.id)"><i class="bi bi-trash3"></i> Xóa</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Coupons -->
          <div v-else-if="tab === 'coupons'" class="sg-card acc-block">
            <div class="sg-title-bar mb-2"></div>
            <h5 class="fw-bold">Mã giảm giá của tôi</h5>
            <p class="text-secondary mb-3">Danh sách mã giảm giá đang có hiệu lực hoặc đã dùng.</p>
            <div class="coupon-grid">
              <div v-for="c in userCoupons" :key="c.code" class="coupon-card" :class="{ used: c.used, expired: c.expired }">
                <div class="coupon-left">
                  <div class="coupon-icon"><i class="bi" :class="c.icon"></i></div>
                </div>
                <div class="coupon-mid">
                  <div class="coupon-code">{{ c.code }}</div>
                  <div class="coupon-desc">{{ c.desc }}</div>
                  <div class="coupon-meta">
                    <span v-if="c.minOrder">Đơn tối thiểu {{ c.minOrder }}</span>
                    <span class="coupon-exp">HSD: {{ c.expire }}</span>
                  </div>
                </div>
                <div class="coupon-right">
                  <div class="coupon-discount">{{ c.discount }}</div>
                  <span class="coupon-status-tag" :class="c.used ? 'used' : c.expired ? 'expired' : 'active'">
                    {{ c.used ? 'Đã dùng' : c.expired ? 'Hết hạn' : 'Khả dụng' }}
                  </span>
                  <button v-if="!c.used && !c.expired" class="coupon-copy" @click="copyCoupon(c.code)">
                    <i class="bi bi-copy"></i> Sao chép
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Address modal -->
    <transition name="suc">
      <div v-if="modal.open" class="modal-overlay" @click.self="closeModal">
        <div class="sg-card modal-box">
          <h5 class="fw-bold mb-3">{{ modal.editId ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới' }}</h5>
          <div class="row g-3">
            <div class="col-md-6"><label class="co-label">Người nhận</label><input v-model="modal.recipient" class="sg-input w-100"></div>
            <div class="col-md-6"><label class="co-label">Số điện thoại</label><input v-model="modal.phone" class="sg-input w-100"></div>
            <div class="col-12"><label class="co-label">Tỉnh / Thành phố</label><input v-model="modal.province" class="sg-input w-100"></div>
            <div class="col-12"><label class="co-label">Địa chỉ chi tiết</label><input v-model="modal.line" class="sg-input w-100"></div>
            <div class="col-12"><label class="check-row"><input type="checkbox" v-model="modal.isDefault"> <span>Đặt làm địa chỉ mặc định</span></label></div>
          </div>
          <div class="d-flex gap-2 mt-3 justify-content-end">
            <button class="btn-sg-outline" @click="closeModal">Hủy</button>
            <button class="btn-sg" @click="saveAddr">Lưu địa chỉ</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.account-page { background: var(--sg-canvas); min-height: 100vh; }
.acc-side { padding: 24px; text-align: center; position: sticky; top: 90px; }
.acc-avatar { width: 72px; height: 72px; margin: 0 auto 12px; border-radius: 50%; background: var(--sg-grad-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.5rem; }
.acc-nav { display: flex; flex-direction: column; gap: 4px; margin-top: 18px; text-align: left; }
.acc-nav button, .acc-nav a { border: 0; background: transparent; padding: .7rem 1rem; border-radius: 12px; font-weight: 700; color: var(--sg-ink-2); text-decoration: none; display: flex; align-items: center; gap: 10px; transition: .2s; }
.acc-nav button:hover, .acc-nav a:hover { background: var(--sg-navy-pale, #e8f0fb); color: var(--sg-navy, #1a3a6b); }
.acc-nav .active { background: var(--sg-grad-primary); color: #fff; }
.acc-logout { color: #ef4444 !important; margin-top: 6px; }
.acc-logout:hover { background: #fee2e2 !important; }
.acc-content { min-height: 80vh; }
.acc-orders :deep(.orders-page) { background: transparent; min-height: auto; padding: 0; }
.acc-block { padding: 26px; }
.co-label { font-weight: 700; font-size: .82rem; color: var(--sg-ink-2); margin-bottom: 6px; display: block; }
.check-row { display: flex; align-items: center; gap: 8px; }
.check-row input { width: 17px; height: 17px; accent-color: var(--sg-blue); }
.addr-list { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
.addr-card { display: flex; gap: 12px; border: 1.5px solid var(--sg-line); border-radius: 16px; padding: 16px; transition: .2s; }
.addr-card.def { border-color: var(--sg-navy, #1a3a6b); background: var(--sg-soft); }
.addr-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
.link-btn { border: 0; background: transparent; font-weight: 700; font-size: .82rem; color: #1a3a6b; }
.link-btn.danger { color: #ef4444; }
.link-btn:hover { text-decoration: underline; }
.modal-overlay { position: fixed; inset: 0; z-index: 3000; background: rgba(10,20,45,.55); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 18px; }
.modal-box { max-width: 520px; width: 100%; padding: 28px; border-radius: 22px; }
.suc-enter-active { transition: opacity .3s; } .suc-enter-from { opacity: 0; }

.coupon-grid { display: flex; flex-direction: column; gap: 14px; margin-top: 8px; }
.coupon-card { display: flex; gap: 0; border: 2px dashed var(--sg-line); border-radius: 18px; overflow: hidden; background: #fff; transition: .2s; position: relative; }
.coupon-card:not(.used):not(.expired):hover { border-color: var(--sg-navy, #1a3a6b); box-shadow: var(--sg-shadow-sm); }
.coupon-card.used { opacity: .65; }
.coupon-card.expired { opacity: .5; }
.coupon-left { background: linear-gradient(180deg, #1a3a6b 0%, #3b6fb5 100%); width: 70px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; position: relative; }
.coupon-card.used .coupon-left { background: linear-gradient(180deg, #6b7280 0%, #9ca3af 100%); }
.coupon-card.expired .coupon-left { background: linear-gradient(180deg, #9ca3af 0%, #d1d5db 100%); }
.coupon-icon { color: #fff; font-size: 1.6rem; }
.coupon-left::after { content: ''; position: absolute; right: -10px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; border-radius: 50%; background: var(--sg-canvas); border: 2px dashed var(--sg-line); }
.coupon-mid { flex: 1; padding: 14px 16px; }
.coupon-code { font-weight: 900; font-size: 1.1rem; letter-spacing: .08em; color: var(--sg-navy, #1a3a6b); font-family: monospace; }
.coupon-desc { font-size: .88rem; color: var(--sg-ink-2); margin: 4px 0; }
.coupon-meta { display: flex; gap: 12px; flex-wrap: wrap; }
.coupon-meta span { font-size: .76rem; color: var(--sg-muted); }
.coupon-exp { color: #f59e0b; font-weight: 600; }
.coupon-right { padding: 14px 16px; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 8px; min-width: 120px; }
.coupon-discount { font-size: 1.4rem; font-weight: 900; color: var(--sg-navy, #1a3a6b); }
.coupon-card.used .coupon-discount, .coupon-card.expired .coupon-discount { color: var(--sg-muted); }
.coupon-status-tag { font-size: .72rem; font-weight: 700; padding: .2rem .6rem; border-radius: 999px; }
.coupon-status-tag.active { background: #dcfce7; color: #15803d; }
.coupon-status-tag.used { background: #e5e7eb; color: #374151; }
.coupon-status-tag.expired { background: #fee2e2; color: #b91c1c; }
.coupon-copy { border: 1.5px solid var(--sg-navy, #1a3a6b); background: transparent; color: var(--sg-navy, #1a3a6b); border-radius: 8px; padding: .3rem .8rem; font-size: .78rem; font-weight: 700; transition: .2s; }
.coupon-copy:hover { background: var(--sg-navy, #1a3a6b); color: #fff; }
</style>
