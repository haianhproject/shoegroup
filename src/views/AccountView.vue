<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { currentUser, updateProfile, logout } from '../stores/authStore'
import { notify } from '../stores/uiStore'
import { formatCurrency } from '../stores/cartStore'
import { addressBookApi, formatAddress, vietnamAddressApi } from '../services/addressService'
import { api } from '../services/apiClient'
import MyOrders from './MyOrders.vue'
import logoGiay from '../../img/logogiay.png'

const route = useRoute()
const router = useRouter()
const tab = ref(['orders', 'address', 'profile', 'coupons', 'wallet'].includes(route.query.tab) ? route.query.tab : 'profile')

onMounted(async () => {
  if (route.query.tab === 'orders') tab.value = 'orders'
  if (route.query.tab === 'wallet') tab.value = 'wallet'
  await Promise.all([fetchProvinces(), loadAddresses(), fetchUserCoupons(), loadWallet()])
})

const setTab = (t) => {
  tab.value = t
  if (t === 'wallet') loadWallet()
}

// Navbar and deep links may change the selected account panel without
// remounting this view; keep the local tab in sync with the URL.
watch(() => route.query.tab, (value) => {
  if (['orders', 'address', 'profile', 'coupons', 'wallet'].includes(value)) {
    tab.value = value
    if (value === 'wallet') loadWallet()
  }
})

const logoutConfirmOpen = ref(false)

const requestLogout = () => {
  logoutConfirmOpen.value = true
}

const handleLogout = () => {
  logoutConfirmOpen.value = false
  logout()
  notify({ type: 'success', title: 'Da dang xuat', message: 'Hen gap lai ban!' })
  router.push('/')
}

const profile = reactive({
  full_name: currentUser.value?.full_name || '',
  email: currentUser.value?.email || currentUser.value?.username || '',
  phone: currentUser.value?.phone || '',
  avatar_url: currentUser.value?.avatar_url || currentUser.value?.AvatarURL || '',
})
const savingProfile = ref(false)
const avatarInput = ref(null)
const MAX_AVATAR_BYTES = 1.5 * 1024 * 1024

const profileInitials = computed(() => (String(profile.full_name || '').trim() || 'K')
  .split(/\s+/)
  .map(word => word.charAt(0))
  .slice(-2)
  .join('')
  .toUpperCase())

// Đồng bộ dữ liệu hồ sơ khi đăng nhập/khôi phục phiên thay đổi.
watch(currentUser, (user) => {
  if (!user || savingProfile.value) return
  Object.assign(profile, {
    full_name: user.full_name || user.name || '',
    email: user.email || user.username || '',
    phone: user.phone || '',
    avatar_url: user.avatar_url || user.AvatarURL || '',
  })
})

const chooseAvatar = () => avatarInput.value?.click()

const onAvatarSelected = (event) => {
  const file = event.target?.files?.[0]
  // Cho phép chọn lại đúng tệp vừa xóa/chọn trước đó.
  if (event.target) event.target.value = ''
  if (!file) return
  if (!/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.type)) {
    notify({ type: 'error', message: 'Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.' })
    return
  }
  if (file.size > MAX_AVATAR_BYTES) {
    notify({ type: 'error', message: 'Ảnh phải nhỏ hơn 1,5 MB.' })
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const dataUrl = typeof reader.result === 'string' ? reader.result : ''
    if (!dataUrl || dataUrl.length > 2200000) {
      notify({ type: 'error', message: 'Không thể đọc ảnh hoặc ảnh quá lớn.' })
      return
    }
    profile.avatar_url = dataUrl
  }
  reader.onerror = () => notify({ type: 'error', message: 'Không thể đọc tệp ảnh.' })
  reader.readAsDataURL(file)
}

const removeAvatar = () => {
  profile.avatar_url = ''
}

const saveProfile = async () => {
  if (savingProfile.value) return
  const fullName = String(profile.full_name || '').trim()
  const phone = String(profile.phone || '').trim()
  if (!fullName) {
    notify({ type: 'error', message: 'Vui lòng nhập họ tên.' })
    return
  }
  savingProfile.value = true
  try {
    const r = await updateProfile({
      id: currentUser.value?.id_user || currentUser.value?.id,
      email: profile.email,
      full_name: fullName,
      phone,
      avatar_url: profile.avatar_url || null,
    })
    if (r?.ok === false) {
      notify({ type: 'error', message: r.message || 'Không thể cập nhật.' })
      return
    }
    if (r?.user) {
      Object.assign(profile, {
        full_name: r.user.full_name || profile.full_name,
        email: r.user.email || profile.email,
        phone: r.user.phone || '',
        avatar_url: r.user.avatar_url || '',
      })
    }
    notify({ type: 'success', title: 'Đã lưu', message: 'Thông tin cá nhân và avatar đã cập nhật.' })
  } catch (error) {
    notify({ type: 'error', message: error?.message || 'Không thể cập nhật.' })
  } finally {
    savingProfile.value = false
  }
}

const provinces = ref([])
const communes = ref([])
const loadingCommunes = ref(false)
const addressSaving = ref(false)
const searchProvince = ref('')
const searchCommune = ref('')
const showProvinceDropdown = ref(false)
const showCommuneDropdown = ref(false)

const filteredProvinces = computed(() => {
  if (!searchProvince.value) return provinces.value
  const kw = searchProvince.value.toLowerCase().trim()
  return provinces.value.filter(p => p.name.toLowerCase().includes(kw))
})

const filteredCommunes = computed(() => {
  if (!searchCommune.value) return communes.value
  const kw = searchCommune.value.toLowerCase().trim()
  return communes.value.filter(c => c.name.toLowerCase().includes(kw))
})

const fetchProvinces = async () => {
  try {
    provinces.value = await vietnamAddressApi.provinces()
  } catch (error) {
    provinces.value = []
    notify({ type: 'error', message: error.message || 'Khong tai duoc danh sach Tinh/Thanh.' })
  }
}

const selectProvince = async (p) => {
  modal.provinceId = p.code
  modal.provinceName = p.name
  searchProvince.value = p.name
  showProvinceDropdown.value = false
  modal.communeId = ''
  modal.communeName = ''
  searchCommune.value = ''
  communes.value = []
  loadingCommunes.value = true
  try {
    const rows = await vietnamAddressApi.wards(p.code)
    if (String(modal.provinceId) === String(p.code)) communes.value = rows
  } catch (error) {
    if (String(modal.provinceId) === String(p.code)) communes.value = []
    notify({ type: 'error', message: error.message || 'Khong tai duoc danh sach Phuong/Xa.' })
  } finally {
    if (String(modal.provinceId) === String(p.code)) loadingCommunes.value = false
  }
}

const selectCommune = (c) => {
  modal.communeId = c.code
  modal.communeName = c.name
  searchCommune.value = c.name
  showCommuneDropdown.value = false
}

const addresses = ref([])
const loadingAddresses = ref(false)

const loadAddresses = async () => {
  loadingAddresses.value = true
  try {
    addresses.value = await addressBookApi.list()
  } catch (error) {
    addresses.value = []
    notify({ type: 'error', message: error.message || 'Khong tai duoc so dia chi.' })
  } finally {
    loadingAddresses.value = false
  }
}

const modal = reactive({
  open: false,
  editId: null,
  recipient: '',
  phone: '',
  provinceId: '',
  provinceName: '',
  communeId: '',
  communeName: '',
  line: '',
  isDefault: false
})
const editingDefaultAddress = computed(() => Boolean(
  modal.editId && addresses.value.find(address => address.id === modal.editId)?.isDefault
))

const openAdd = () => {
  communes.value = []
  searchProvince.value = ''
  searchCommune.value = ''
  showProvinceDropdown.value = false
  showCommuneDropdown.value = false
  Object.assign(modal, {
    open: true,
    editId: null,
    recipient: profile.full_name || '',
    phone: profile.phone || '',
    provinceId: '', provinceName: '',
    communeId: '', communeName: '',
    line: '',
    isDefault: addresses.value.length === 0
  })
}

const openEdit = async (a) => {
  communes.value = []
  showProvinceDropdown.value = false
  showCommuneDropdown.value = false
  searchProvince.value = a.provinceName || a.province || ''
  searchCommune.value = a.communeName || a.ward || ''
  const matchedProvince = provinces.value.find((p) => p.name === (a.provinceName || a.province))
  Object.assign(modal, {
    open: true,
    editId: a.id,
    recipient: a.recipient,
    phone: a.phone,
    provinceId: a.provinceId || matchedProvince?.code || '',
    provinceName: a.provinceName || a.province || '',
    communeId: a.communeId || '',
    communeName: a.communeName || a.ward || '',
    line: a.line || '',
    isDefault: a.isDefault
  })
  if (modal.provinceId) {
    loadingCommunes.value = true
    try {
      communes.value = await vietnamAddressApi.wards(modal.provinceId)
    } catch (error) {
      communes.value = []
      notify({ type: 'error', message: error.message || 'Khong tai duoc danh sach Phuong/Xa.' })
    } finally {
      loadingCommunes.value = false
    }
    modal.communeId = a.communeId || communes.value.find((c) => c.name === (a.communeName || a.ward))?.code || ''
  }
}

const closeModal = () => { modal.open = false }

const isValidPhone = (phone) => {
  const p = String(phone || '').trim()
  if (!/^0(?:3|5|7|8|9)[0-9]{8}$/.test(p)) return false
  if (/(\d)\1{5,}/.test(p)) return false
  return true
}

const saveAddr = async () => {
  if (addressSaving.value) return
  const cleanPhone = String(modal.phone).trim()
  if (!modal.recipient.trim()) {
    notify({ type: 'error', message: 'Vui long nhap ten nguoi nhan.' })
    return
  }
  if (!isValidPhone(cleanPhone)) {
    notify({ type: 'error', title: 'SDT khong hop le', message: 'Vui long nhap dung 10 so, dung nha mang Viet Nam.' })
    return
  }
  if (!modal.provinceId || !modal.communeId || !modal.line.trim()) {
    notify({ type: 'error', message: 'Vui long chon Tinh/Thanh, Phuong/Xa va nhap so nha.' })
    return
  }
  const payload = {
    recipient: modal.recipient.trim(),
    phone: cleanPhone,
    province: modal.provinceName,
    ward: modal.communeName,
    line: modal.line.trim(),
    isDefault: modal.isDefault,
  }
  addressSaving.value = true
  try {
    const savedAddress = modal.editId
      ? await addressBookApi.update(modal.editId, payload)
      : await addressBookApi.create(payload)
    const others = addresses.value
      .filter(address => address.id !== savedAddress.id)
      .map(address => savedAddress.isDefault ? { ...address, isDefault: false } : address)
    addresses.value = [savedAddress, ...others].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
    closeModal()
    notify({ type: 'success', title: 'Thanh cong', message: 'Da luu dia chi vao so.' })
  } catch (error) {
    notify({ type: 'error', message: error.message || 'Khong the luu dia chi.' })
  } finally {
    addressSaving.value = false
  }
}

const deleteAddr = async (id) => {
  if (addressSaving.value) return
  addressSaving.value = true
  try {
    await addressBookApi.remove(id)
    const remaining = addresses.value.filter(address => address.id !== id)
    if (remaining.length && !remaining.some(address => address.isDefault)) {
      const newestId = Math.max(...remaining.map(address => Number(address.id) || 0))
      remaining.forEach(address => { address.isDefault = Number(address.id) === newestId })
    }
    addresses.value = remaining.sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
    notify({ type: 'info', message: 'Da xoa dia chi.' })
  } catch (error) {
    notify({ type: 'error', message: error.message || 'Khong the xoa dia chi.' })
  } finally {
    addressSaving.value = false
  }
}

const setDefault = async (id) => {
  if (addressSaving.value) return
  addressSaving.value = true
  try {
    const savedAddress = await addressBookApi.setDefault(id)
    addresses.value = addresses.value
      .map(address => address.id === id ? savedAddress : { ...address, isDefault: false })
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
    notify({ type: 'success', message: 'Da dat lam dia chi mac dinh.' })
  } catch (error) {
    notify({ type: 'error', message: error.message || 'Khong the doi dia chi mac dinh.' })
  } finally {
    addressSaving.value = false
  }
}

const userCoupons = ref([])
const loadingCoupons = ref(false)

const fetchUserCoupons = async () => {
  loadingCoupons.value = true
  try {
    const list = await api.get('/discounts')
    const now = new Date()
    now.setHours(0,0,0,0)
    userCoupons.value = (Array.isArray(list) ? list : []).map((c) => {
      const code = c.code ?? c.CouponCode ?? ''
      const name = c.name ?? c.CouponName ?? c.description ?? ''
      const dtype = String(c.discount_type ?? c.DiscountType ?? '').toLowerCase()
      const val = Number(c.value ?? c.DiscountValue ?? c.percent ?? c.DiscountPercent ?? 0)
      const minOrderVal = Number(c.min_order ?? c.MinOrderAmount ?? 0)
      const expiryRaw = c.expiry ?? c.ExpiryDate ?? c.Expiry ?? ''
      let expireText = '—'
      let expired = false
      if (expiryRaw) {
        const d = new Date(expiryRaw)
        if (!isNaN(d.getTime())) {
          expireText = d.toLocaleDateString('vi-VN')
          const ed = new Date(d); ed.setHours(23,59,59,999)
          expired = ed < new Date()
        }
      }
      const used = Number(c.used ?? c.UsedCount ?? 0) >= Number(c.limit ?? c.UsageLimit ?? 999999) && Number(c.limit ?? 0) > 0
      const active = c.active !== 0 && c.active !== false && c.active !== '0' && c.IsActive !== 0
      const isExpired = expired || active === false
      let discount = ''
      if (dtype.includes('phan tram') || dtype.includes('percent')) discount = `-${val}%`
      else if (val) discount = `-${formatCurrency(val)}`
      else discount = name || code
      let icon = 'icon-ticket-perforated-fill'
      if (code.toLowerCase().includes('ship') || name.toLowerCase().includes('ship')) icon = 'icon-truck'
      else if (dtype.includes('phan tram') || dtype.includes('percent')) icon = 'icon-percent'
      else icon = 'icon-gift-fill'
      return {
        code,
        discount: discount || '-',
        desc: name || c.description || 'Ma giam gia',
        icon,
        minOrder: minOrderVal ? formatCurrency(minOrderVal) : '0d',
        expire: expireText,
        used: used && !isExpired,
        expired: isExpired,
      }
    }).filter(c => c.code)
  } catch (_) {
    userCoupons.value = []
  } finally {
    loadingCoupons.value = false
  }
}

const copyCoupon = (code) => {
  navigator.clipboard.writeText(code).then(() => notify({ type: 'success', title: 'Da sao chep!', message: code }))
}

// ==========================================
// VÍ SHOEGROUP (TÍCH HỢP TRANG HỒ SƠ)
// ==========================================
const walletLoading = ref(false)
const walletSubmitting = ref(false)
const walletBalance = ref(0)
const walletTransactions = ref([])
const walletWithdrawals = ref([])
const walletPanel = ref('history')
const walletForm = reactive({ method: 'VISA', amount: '', destination: '', holderName: '' })

const formatWalletDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN')
}

const signedWalletAmount = (value) => {
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
  walletLoading.value = true
  try {
    const [wallet, history] = await Promise.all([api.get('/wallet'), api.get('/wallet/transactions')])
    walletBalance.value = Number(wallet?.balance) || 0
    walletTransactions.value = Array.isArray(history?.transactions) ? history.transactions : []
    walletWithdrawals.value = Array.isArray(history?.withdrawals) ? history.withdrawals : []
  } catch (error) {
    // Không chặn nếu chưa có ví
  } finally {
    walletLoading.value = false
  }
}

const resetWalletForm = () => Object.assign(walletForm, { method: 'VISA', amount: '', destination: '', holderName: '' })

const submitWalletWithdrawal = async () => {
  if (walletSubmitting.value) return
  const amount = Number(walletForm.amount)
  const destination = String(walletForm.destination || '').trim()
  if (!Number.isFinite(amount) || amount <= 0) {
    notify({ type: 'error', message: 'Nhập số tiền muốn rút lớn hơn 0.' }); return
  }
  if (amount > walletBalance.value) {
    notify({ type: 'error', message: 'Số dư Ví ShoeGroup không đủ.' }); return
  }
  if (walletForm.method === 'VISA') {
    const card = destination.replace(/\s+/g, '')
    if (!/^4\d{12,18}$/.test(card) || !isValidLuhn(card)) {
      notify({ type: 'error', message: 'Số thẻ Visa không hợp lệ.' }); return
    }
    if (!String(walletForm.holderName || '').trim()) {
      notify({ type: 'error', message: 'Vui lòng nhập tên chủ thẻ Visa.' }); return
    }
  } else if (!/^0(?:3|5|7|8|9)\d{8}$/.test(destination.replace(/\s+/g, ''))) {
    notify({ type: 'error', message: 'Số điện thoại MoMo không hợp lệ.' }); return
  }
  if (typeof window !== 'undefined' && !window.confirm(`Xác nhận rút ${formatCurrency(amount)} về ${walletForm.method === 'VISA' ? 'thẻ Visa' : 'ví MoMo'}?`)) return
  walletSubmitting.value = true
  try {
    const result = await api.post('/wallet/withdrawals', {
      method: walletForm.method,
      amount,
      destination,
      holder_name: String(walletForm.holderName || '').trim(),
    })
    walletBalance.value = Number(result?.balance) || Math.max(0, walletBalance.value - amount)
    resetWalletForm()
    walletPanel.value = 'history'
    await loadWallet()
    notify({ type: 'success', message: 'Đã tạo yêu cầu rút tiền. ShoeGroup sẽ xử lý sớm.' })
  } catch (error) {
    notify({ type: 'error', message: error?.message || 'Không thể tạo yêu cầu rút tiền.' })
  } finally {
    walletSubmitting.value = false
  }
}

const allWalletHistory = computed(() => [
  ...walletTransactions.value.filter((item) => String(item.type || '').toUpperCase() !== 'WITHDRAWAL').map((item) => ({ ...item, kind: 'wallet' })),
  ...walletWithdrawals.value.map((item) => ({ ...item, kind: 'withdrawal', amount: -Number(item.amount || 0), description: `Rút tiền về ${item.method === 'VISA' ? 'thẻ Visa' : 'ví MoMo'}`, created_at: item.created_at })),
].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()))
</script>

<template>
  <div class="account-page">
    <div class="account-container">
      <router-link to="/" class="account-home-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Trang chủ
      </router-link>
      <div class="account-grid">
        <!-- Sidebar -->
        <aside class="sg-card acc-side">
          <div class="acc-identity">
            <div class="acc-avatar" :class="{ 'has-image': profile.avatar_url }">
              <img v-if="profile.avatar_url" :src="profile.avatar_url" alt="Avatar" class="acc-avatar-img">
              <span v-else>{{ profileInitials }}</span>
            </div>
            <h1 class="acc-name">{{ profile.full_name || 'Khách hàng' }}</h1>
            <p class="acc-email">{{ profile.email }}</p>
          </div>
            <nav class="acc-nav" aria-label="Tài khoản của tôi">
              <button :class="{ active: tab === 'profile' }" @click="setTab('profile')">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                Thông tin cá nhân
              </button>
              <button :class="{ active: tab === 'address' }" @click="setTab('address')">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
                Sổ địa chỉ
              </button>
              <button :class="{ active: tab === 'orders' }" @click="setTab('orders')">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>
                Đơn hàng của tôi
              </button>
              <button :class="{ active: tab === 'coupons' }" @click="setTab('coupons')">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/></svg>
                Mã giảm giá
              </button>
              <button :class="{ active: tab === 'wallet' }" @click="setTab('wallet')">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M16 12h.01M3 9h18"/></svg>
                Ví ShoeGroup
              </button>
              <button class="acc-logout" @click="requestLogout">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>
                Đăng xuất
              </button>
            </nav>
        </aside>

        <div class="sg-card acc-content">
          <div class="account-title-bar" aria-hidden="true"></div>
          <!-- Profile -->
          <section v-if="tab === 'profile'" class="acc-block">
            <h2 class="account-heading">Thông tin cá nhân</h2>
            <div class="profile-avatar-editor">
              <div class="acc-avatar profile-avatar-preview" :class="{ 'has-image': profile.avatar_url }">
                <img v-if="profile.avatar_url" :src="profile.avatar_url" alt="Ảnh đại diện" class="acc-avatar-img">
                <span v-else>{{ profileInitials }}</span>
              </div>
              <div class="profile-avatar-actions">
                <input ref="avatarInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden @change="onAvatarSelected">
                <button type="button" class="btn-sg btn-sg-compact" :disabled="savingProfile" @click="chooseAvatar">Chọn ảnh</button>
                <button v-if="profile.avatar_url" type="button" class="btn-sg btn-sg-compact btn-sg-light" :disabled="savingProfile" @click="removeAvatar">Xóa ảnh</button>
                <small>JPG, PNG, WEBP hoặc GIF · tối đa 1,5 MB · bấm “Lưu thay đổi” để lưu</small>
              </div>
            </div>
            <form class="profile-form" @submit.prevent="saveProfile">
              <div class="account-form-grid">
                <label class="account-field"><span class="co-label">Họ tên</span><input v-model="profile.full_name" type="text" autocomplete="name" class="sg-input w-full" placeholder="Nhập họ và tên"></label>
                <label class="account-field"><span class="co-label">Số điện thoại</span><input v-model="profile.phone" type="tel" autocomplete="tel" class="sg-input w-full" placeholder="Nhập số điện thoại"></label>
              </div>
              <label class="account-field"><span class="co-label">Email</span><input v-model="profile.email" type="email" autocomplete="email" class="sg-input w-full" disabled></label>
              <button type="submit" class="btn-sg" :disabled="savingProfile"><i class="icon icon-check2 mr-1" aria-hidden="true"></i>{{ savingProfile ? 'Đang lưu…' : 'Lưu thay đổi' }}</button>
            </form>
          </section>

          <!-- Orders -->
          <div v-else-if="tab === 'orders'" class="acc-orders">
            <MyOrders />
          </div>

          <!-- Addresses -->
          <div v-else-if="tab === 'address'" class="acc-block">
            <div class="account-section-heading">
              <h2 class="account-heading">Sổ địa chỉ nhận hàng</h2>
              <button class="btn-sg btn-sg-compact" @click="openAdd"><i class="icon icon-plus-lg mr-1"></i>Thêm địa chỉ mới</button>
            </div>
            <div v-if="loadingAddresses" class="text-center py-5 text-gray-500 empty-state">
              <span class="sg-spinner sg-spinner-sm mr-2" aria-hidden="true"></span>
              Đang tải sổ địa chỉ…
            </div>
            <div v-else-if="addresses.length === 0" class="text-center py-5 text-gray-500 empty-state">
              <i class="icon icon-geo-alt-fill" style="font-size:2.8rem; color: #ccc;"></i>
              <p class="mt-2 font-semibold">Bạn chưa có địa chỉ nhận hàng nào trong sổ địa chỉ.</p>
              <button class="btn-sg-outline btn-sg-compact mt-1" @click="openAdd">Tạo địa chỉ ngay</button>
            </div>
            <div v-else class="addr-list">
              <div v-for="a in addresses" :key="a.id" class="addr-card" :class="{ def: a.isDefault }">
                <div class="grow">
                  <div class="flex items-center gap-2 flex-wrap">
                    <strong class="recipient-name">{{ a.recipient }}</strong>
                    <span class="text-gray-500">| {{ a.phone }}</span>
                    <span v-if="a.isDefault" class="sg-chip sg-chip-default"><i class="icon icon-check-circle-fill mr-1"></i>Mặc định</span>
                  </div>
                  <div class="text-gray-600 mt-1 addr-detail-text">
                    {{ formatAddress(a) }}
                  </div>
                </div>
                <div class="addr-actions">
                  <button v-if="!a.isDefault" class="link-btn set-def-btn" @click="setDefault(a.id)">Đặt mặc định</button>
                  <button class="link-btn" @click="openEdit(a)"><i class="icon icon-pencil mr-1"></i>Sửa</button>
                  <button class="link-btn danger" @click="deleteAddr(a.id)"><i class="icon icon-trash3 mr-1"></i>Xóa</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Coupons -->
          <div v-else-if="tab === 'coupons'" class="acc-block">
            <h2 class="account-heading account-heading-compact">Mã giảm giá của tôi</h2>
            <p class="account-description">Sử dụng mã ưu đãi cho đơn hàng tiếp theo của bạn.</p>
            <div v-if="loadingCoupons" class="text-center py-4 text-gray-500"><span class="sg-spinner sg-spinner-sm mr-2"></span>Đang tải mã giảm giá…</div>
            <div v-else-if="userCoupons.length === 0" class="text-center py-4 text-gray-500">Chưa có mã giảm giá khả dụng.</div>
            <div v-else class="coupon-grid">
              <div v-for="c in userCoupons" :key="c.code" class="coupon-card" :class="{ used: c.used, expired: c.expired }">
                <div class="coupon-left">
                  <div class="coupon-icon"><i class="icon" :class="c.icon"></i></div>
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
                    <i class="icon icon-copy"></i> Sao chép
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- VÍ SHOEGROUP (HIỂN THỊ Ở KHUNG BÊN PHẢI) -->
          <div v-else-if="tab === 'wallet'" class="acc-block">
            <div class="flex items-center justify-between mb-5">
              <div>
                <h2 style="font-family:'Fraunces',serif" class="text-2xl font-semibold mb-1">Ví ShoeGroup</h2>
                <p class="text-xs text-[#737373]">Tiền hoàn từ đơn trả hàng & giao dịch sẽ tự động cộng vào ví của bạn.</p>
              </div>
              <span class="inline-flex items-center gap-1.5 text-xs text-[#0E0E0E] bg-[#F5F5F5] border border-[#E5E5E5] px-3 py-1.5 rounded-full font-medium">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-green-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                Bảo mật & Tự động
              </span>
            </div>

            <!-- Thẻ ví đen phong cách Figma -->
            <div class="relative overflow-hidden rounded-2xl bg-[#0E0E0E] text-white p-7 mb-6 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.3)]">
              <div class="text-[11px] font-bold tracking-[0.2em] uppercase text-white/60 mb-2">Số dư khả dụng</div>
              <div style="font-family:'Fraunces',serif" class="text-4xl font-semibold mb-6 tracking-tight">
                {{ formatCurrency(walletBalance) }}
              </div>
              <div class="flex items-center justify-between border-t border-white/10 pt-4">
                <span class="text-xs text-white/70">ShoeGroup Wallet · {{ profile.full_name || 'Khách hàng' }}</span>
                <img :src="logoGiay" alt="ShoeGroup" class="w-8 h-8 object-contain invert opacity-90" />
              </div>
            </div>

            <!-- Tab hành động nhanh -->
            <div class="grid grid-cols-2 gap-3 mb-6">
              <button type="button" @click="walletPanel = 'withdraw'"
                class="py-3 text-[13px] font-semibold rounded-xl border transition-colors cursor-pointer text-center"
                :class="walletPanel === 'withdraw' ? 'bg-[#0E0E0E] text-white border-[#0E0E0E]' : 'bg-white text-[#0E0E0E] border-[#E5E5E5] hover:border-[#0E0E0E]'">
                Rút tiền về thẻ / ví
              </button>
              <button type="button" @click="walletPanel = 'history'"
                class="py-3 text-[13px] font-semibold rounded-xl border transition-colors cursor-pointer text-center"
                :class="walletPanel === 'history' ? 'bg-[#0E0E0E] text-white border-[#0E0E0E]' : 'bg-white text-[#0E0E0E] border-[#E5E5E5] hover:border-[#0E0E0E]'">
                Lịch sử giao dịch ({{ allWalletHistory.length }})
              </button>
            </div>

            <!-- Panel Rút tiền -->
            <div v-if="walletPanel === 'withdraw'" class="border border-[#E5E5E5] rounded-xl p-5 mb-6 bg-[#FAFAFA]">
              <h3 class="text-sm font-bold mb-1">Yêu cầu rút tiền</h3>
              <p class="text-xs text-[#737373] mb-4">Chọn thẻ Visa hoặc ví MoMo nhận tiền. Yêu cầu sẽ được xử lý trong vòng 24 giờ.</p>
              <form @submit.prevent="submitWalletWithdrawal" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold mb-1 text-[#0E0E0E]">Phương thức rút</label>
                    <select v-model="walletForm.method" class="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:border-[#0E0E0E]">
                      <option value="VISA">Thẻ Visa</option>
                      <option value="MOMO">Ví điện tử MoMo</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold mb-1 text-[#0E0E0E]">Số tiền muốn rút (VND)</label>
                    <input v-model="walletForm.amount" type="number" min="1" step="1" placeholder="Ví dụ: 100000"
                      class="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:border-[#0E0E0E]" />
                  </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold mb-1 text-[#0E0E0E]">{{ walletForm.method === 'VISA' ? 'Số thẻ Visa' : 'Số điện thoại MoMo' }}</label>
                    <input v-model="walletForm.destination" :inputmode="walletForm.method === 'VISA' ? 'numeric' : 'tel'"
                      :maxlength="walletForm.method === 'VISA' ? 23 : 10"
                      :placeholder="walletForm.method === 'VISA' ? '4xxx xxxx xxxx xxxx' : '09xxxxxxxx'"
                      class="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:border-[#0E0E0E]" />
                  </div>
                  <div v-if="walletForm.method === 'VISA'">
                    <label class="block text-xs font-semibold mb-1 text-[#0E0E0E]">Tên chủ thẻ (in hoa không dấu)</label>
                    <input v-model="walletForm.holderName" maxlength="120" placeholder="NGUYEN VAN A"
                      class="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:border-[#0E0E0E]" />
                  </div>
                </div>
                <div class="flex justify-end pt-2">
                  <button type="submit" :disabled="walletSubmitting"
                    class="bg-[#0E0E0E] text-white px-6 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-[#333] transition-colors border-none cursor-pointer disabled:opacity-50">
                    {{ walletSubmitting ? 'Đang gửi yêu cầu…' : 'Xác nhận rút tiền' }}
                  </button>
                </div>
              </form>
            </div>

            <!-- Panel Lịch sử giao dịch -->
            <div v-if="walletPanel === 'history'">
              <div v-if="walletLoading" class="text-center py-8 text-sm text-[#737373]">Đang tải dữ liệu ví…</div>
              <div v-else-if="allWalletHistory.length === 0" class="text-center py-10 border border-[#E5E5E5] rounded-xl text-[#737373] text-sm">
                Chưa có giao dịch nào trong ví.
              </div>
              <div v-else class="space-y-2">
                <div v-for="(h, idx) in allWalletHistory" :key="idx"
                  class="flex items-center justify-between p-3.5 border border-[#E5E5E5] rounded-xl hover:border-[#D4D4D4] transition-colors bg-white">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      :class="Number(h.amount || 0) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                      {{ Number(h.amount || 0) >= 0 ? '↓' : '↑' }}
                    </div>
                    <div>
                      <div class="text-sm font-semibold text-[#0E0E0E]">{{ h.description || (Number(h.amount || 0) >= 0 ? 'Hoàn tiền vào ví' : 'Rút tiền') }}</div>
                      <div class="text-xs text-[#737373]">{{ formatWalletDate(h.created_at || h.CreatedAt) }}</div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-bold" :class="Number(h.amount || 0) >= 0 ? 'text-green-600' : 'text-red-600'">
                      {{ signedWalletAmount(h.amount) }}
                    </div>
                    <span v-if="h.status" class="text-[11px] px-2 py-0.5 rounded-full"
                      :class="h.status === 'Đã duyệt' || h.status === 'Hoàn tất' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'">
                      {{ h.status }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DIA CHI -->
    <transition name="suc">
      <div v-if="modal.open" class="modal-overlay" @click.self="closeModal">
        <div class="sg-card modal-box" role="dialog" aria-modal="true" aria-labelledby="address-modal-title">
          <div class="flex justify-between items-center mb-3">
            <h2 id="address-modal-title" class="account-heading mb-0">{{ modal.editId ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới' }}</h2>
            <button class="btn-close-modal" aria-label="Đóng hộp thoại địa chỉ" @click="closeModal"><i class="icon icon-x-lg"></i></button>
          </div>
          <div class="account-form-grid">
            <div class="account-field">
              <label class="co-label">Tên người nhận <span class="text-red-600">*</span></label>
              <input v-model="modal.recipient" class="sg-input w-full" placeholder="Ví dụ: Nguyễn Văn A">
            </div>
            <div class="account-field">
              <label class="co-label">Số điện thoại <span class="text-red-600">*</span></label>
              <input v-model="modal.phone" class="sg-input w-full" maxlength="10" placeholder="Ví dụ: 0901234567" @input="modal.phone = modal.phone.replace(/[^0-9]/g, '')">
            </div>
            <div class="account-field relative">
              <label class="co-label">Tỉnh / Thành phố <span class="text-red-600">*</span></label>
              <div class="search-input-wrapper">
                <input type="text" v-model="searchProvince" class="sg-input w-full pr-4" placeholder="Nhập để tìm Tỉnh/TP..." @focus="showProvinceDropdown = true" @blur="showProvinceDropdown = false" @input="showProvinceDropdown = true; modal.provinceId = ''" />
                <i class="icon icon-chevron-down select-arrow"></i>
              </div>
              <ul v-if="showProvinceDropdown" class="dropdown-search-list">
                <li v-for="p in filteredProvinces" :key="p.code" :class="{ selected: String(modal.provinceId) === String(p.code) }" @mousedown.prevent="selectProvince(p)">{{ p.name }}</li>
                <li v-if="filteredProvinces.length === 0" class="no-result">❌ Không tìm thấy tỉnh/thành phù hợp</li>
              </ul>
            </div>
            <div class="account-field relative">
              <label class="co-label">Phường / Xã <span class="text-red-600">*</span></label>
              <div class="search-input-wrapper">
                <input type="text" v-model="searchCommune" class="sg-input w-full pr-4" :disabled="!modal.provinceId || loadingCommunes" :placeholder="loadingCommunes ? 'Đang tải dữ liệu...' : 'Nhập để tìm Phường/Xã...'" @focus="showCommuneDropdown = true" @blur="showCommuneDropdown = false" @input="showCommuneDropdown = true; modal.communeId = ''" />
                <i class="icon icon-chevron-down select-arrow"></i>
              </div>
              <ul v-if="showCommuneDropdown && modal.provinceId" class="dropdown-search-list">
                <li v-for="w in filteredCommunes" :key="w.code" :class="{ selected: String(modal.communeId) === String(w.code) }" @mousedown.prevent="selectCommune(w)">{{ w.name }}</li>
                <li v-if="filteredCommunes.length === 0 && !loadingCommunes" class="no-result">❌ Không tìm thấy phường/xã phù hợp</li>
              </ul>
            </div>
            <div class="account-field account-field-full">
              <label class="co-label">Số nhà, ngõ, tên đường <span class="text-red-600">*</span></label>
              <input v-model="modal.line" class="sg-input w-full" placeholder="Ví dụ: Số 123 Đường Cầu Giấy">
            </div>
            <div class="account-field account-field-full">
              <label class="check-row">
                <input type="checkbox" v-model="modal.isDefault" :disabled="editingDefaultAddress">
                <span class="font-semibold">Đặt làm địa chỉ nhận hàng mặc định</span>
              </label>
            </div>
          </div>
          <div class="flex gap-2 mt-4 justify-end">
            <button class="btn-sg-outline" @click="closeModal">Hủy bỏ</button>
            <button class="btn-sg" :disabled="addressSaving" @click="saveAddr">
              <i class="icon icon-check-lg mr-1"></i>{{ addressSaving ? 'Đang lưu…' : 'Lưu địa chỉ' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="suc">
      <div v-if="logoutConfirmOpen" class="modal-overlay" @click.self="logoutConfirmOpen = false">
        <div class="sg-card logout-confirm-box" role="dialog" aria-modal="true" aria-labelledby="logout-confirm-title">
          <div class="logout-confirm-icon"><i class="icon icon-box-arrow-right"></i></div>
          <h5 id="logout-confirm-title" class="font-bold mb-2">Bạn muốn đăng xuất?</h5>
          <p class="text-gray-600 mb-4">Phiên đăng nhập hiện tại sẽ được kết thúc trên thiết bị này.</p>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-sg-outline" @click="logoutConfirmOpen = false">Ở lại</button>
            <button type="button" class="btn-sg btn-danger-confirm" @click="handleLogout">Đăng xuất</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.account-page.account-page { background: #FAFAFA; min-height: calc(100vh - 69px); padding: 24px 0 80px; }
.account-container { width: 100%; max-width: 1200px; margin-inline: auto; padding-inline: 24px; }
.account-home-link { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 24px; font-size: 12px; color: var(--sg-muted); text-decoration: none; transition: color .2s; }
.account-home-link:hover { color: var(--sg-ink); }
.account-home-link i { font-size: 12px; }
.account-grid { display: grid; grid-template-columns: minmax(0, 1fr); align-items: start; gap: 24px; }
.account-page .sg-card { border: 1px solid var(--sg-line); border-radius: 16px; background: #fff; box-shadow: none; }
.acc-side { min-width: 0; padding: 20px; }
.acc-identity { display: flex; flex-direction: column; align-items: center; text-align: center; padding-bottom: 20px; border-bottom: 1px solid var(--sg-line); }
.acc-avatar { width: 80px; height: 80px; margin: 0 0 12px; border-radius: 50%; overflow: hidden; background: var(--sg-ink); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1.5rem; flex-shrink: 0; }
.acc-avatar-img { width: 100%; height: 100%; display: block; object-fit: cover; }
.acc-name { margin: 0; font-family: 'Fraunces', Georgia, serif; font-size: 18px; font-weight: 600; line-height: 1.5; }
.acc-email { margin: 2px 0 0; font-size: 12px; color: var(--sg-muted); overflow-wrap: anywhere; }
.acc-nav { display: flex; flex-direction: column; gap: 4px; margin-top: 16px; }
.acc-nav button, .acc-nav a { width: 100%; border: 0; background: transparent; padding: 12px 16px; border-radius: 12px; font: inherit; font-size: 14px; font-weight: 500; color: var(--sg-ink); text-decoration: none; display: flex; align-items: center; gap: 12px; text-align: left; cursor: pointer; transition: background-color .2s, color .2s; }
.acc-nav i { width: 17px; flex-shrink: 0; font-size: 17px; }
.acc-nav button:hover, .acc-nav a:hover { background: var(--sg-soft); }
.acc-nav button.active, .acc-nav button.active:hover, .acc-wallet-link.router-link-active { background: var(--sg-ink); color: #fff; }
.acc-nav .acc-logout { color: #C0392B; }
.acc-nav .acc-logout:hover { background: #FBEDEC; }
.acc-content { min-width: 0; min-height: 520px; padding: 24px; }
.account-title-bar { width: 40px; height: 4px; background: var(--sg-ink); border-radius: 999px; margin-bottom: 20px; }
.account-heading { font-family: 'Fraunces', Georgia, serif; font-size: 24px; font-weight: 600; line-height: 1.3; letter-spacing: -.025em; margin: 0 0 24px; }
.account-heading-compact { margin-bottom: 4px; }
.account-description { color: var(--sg-muted); font-size: 14px; margin-bottom: 24px; line-height: 1.6; }
.account-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.account-section-heading .account-heading { margin: 0; }
.account-section-heading .btn-sg { flex-shrink: 0; }
.profile-avatar-editor { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; padding: 20px; border: 1px solid var(--sg-line); border-radius: 12px; background: #FAFAFA; }
.profile-avatar-preview { margin: 0; }
.profile-avatar-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.profile-avatar-actions small { flex-basis: 100%; color: var(--sg-muted); font-size: 11px; line-height: 1.6; }
.profile-form { display: flex; flex-direction: column; align-items: flex-start; gap: 20px; }
.account-form-grid { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
.account-field { min-width: 0; width: 100%; display: block; }
.account-field-full { grid-column: 1 / -1; }
.co-label { display: block; font-size: 13px; font-weight: 500; color: var(--sg-ink); margin-bottom: 6px; }
.account-page .sg-input { width: 100%; min-width: 0; border: 1px solid var(--sg-line); border-radius: 8px; padding: 12px 16px; font-size: 14px; font-weight: 400; line-height: 1.5; }
.account-page .sg-input:focus { border-color: var(--sg-ink); }
.account-page .sg-input:disabled { background: #FAFAFA; color: var(--sg-muted); cursor: not-allowed; }
.account-page .btn-sg, .account-page .btn-sg-outline { display: inline-flex; justify-content: center; align-items: center; gap: 4px; border-radius: 8px; padding: 12px 24px; font-size: 13px; line-height: 1.5; font-weight: 600; letter-spacing: 0; text-transform: none; cursor: pointer; }
.account-page .btn-sg-compact { padding: 8px 16px; font-size: 12px; }
.account-page .btn-sg-light { background: #fff; color: var(--sg-ink); border-color: var(--sg-line); }
.account-page .btn-sg-light:hover { border-color: var(--sg-ink); }
.account-page button:disabled { cursor: not-allowed; opacity: .55; }
.account-page button:focus-visible, .account-page a:focus-visible { outline: 2px solid var(--sg-ink); outline-offset: 3px; }
.check-row { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; }
.check-row input { width: 17px; height: 17px; flex-shrink: 0; accent-color: var(--sg-ink); cursor: pointer; }
.addr-list { display: flex; flex-direction: column; gap: 12px; }
.addr-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; border: 1px solid var(--sg-line); border-radius: 12px; padding: 16px; background: #fff; }
.addr-card > .grow { min-width: 0; }
.recipient-name { font-size: 15px; color: var(--sg-ink); }
.addr-card .text-gray-500 { color: var(--sg-muted); font-size: 14px; }
.addr-detail-text { font-size: 14px; line-height: 1.6; color: var(--sg-muted); overflow-wrap: anywhere; }
.sg-chip-default { background: var(--sg-ink); color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; display: inline-flex; align-items: center; }
.addr-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; flex-shrink: 0; }
.link-btn { border: 0; background: transparent; font-weight: 500; font-size: 13px; color: var(--sg-muted); padding: 0; cursor: pointer; }
.link-btn:hover { color: var(--sg-ink); }
.link-btn.danger { color: #C0392B; }
.link-btn.danger:hover { opacity: .7; }
.empty-state { font-size: 14px; }
.coupon-grid { display: flex; flex-direction: column; gap: 12px; }
.coupon-card { display: flex; border: 1px solid var(--sg-line); border-radius: 12px; overflow: hidden; background: #fff; }
.coupon-left { background: var(--sg-ink); width: 80px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.coupon-card.used .coupon-left, .coupon-card.expired .coupon-left { background: var(--sg-soft); }
.coupon-icon { color: #fff; font-size: 26px; }
.coupon-card.used .coupon-icon, .coupon-card.expired .coupon-icon { color: var(--sg-muted); }
.coupon-mid { min-width: 0; flex: 1; padding: 16px; }
.coupon-code { font-weight: 700; font-size: 15px; letter-spacing: .04em; color: var(--sg-ink); overflow-wrap: anywhere; }
.coupon-desc { font-size: 12px; color: var(--sg-muted); margin-top: 2px; line-height: 1.6; }
.coupon-meta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
.coupon-meta span { font-size: 11px; color: var(--sg-muted); }
.coupon-right { padding: 16px 16px 16px 0; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 8px; flex-shrink: 0; }
.coupon-discount { font-family: 'Fraunces', Georgia, serif; font-size: 20px; font-weight: 600; color: var(--sg-ink); }
.coupon-status-tag { font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 4px; }
.coupon-status-tag.active { background: var(--sg-ink); color: #fff; }
.coupon-status-tag.used, .coupon-status-tag.expired { background: var(--sg-soft); color: var(--sg-muted); }
.coupon-copy { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--sg-line); background: #fff; color: var(--sg-ink); border-radius: 4px; padding: 4px 10px; font-size: 11px; font-weight: 600; cursor: pointer; transition: border-color .2s; }
.coupon-copy:hover { border-color: var(--sg-ink); }
.modal-overlay { position: fixed; inset: 0; z-index: 3000; background: rgba(14,14,14,.55); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto; }
.account-page .modal-box { max-width: 600px; width: 100%; max-height: calc(100dvh - 40px); overflow-y: auto; padding: 28px; box-shadow: 0 20px 40px -20px rgba(0,0,0,.25); }
.modal-box .account-heading { margin-bottom: 0; font-size: 22px; }
.btn-close-modal { border: 0; background: transparent; font-size: 16px; color: var(--sg-muted); cursor: pointer; padding: 8px; }
.btn-close-modal:hover { color: var(--sg-ink); }
.account-page .logout-confirm-box { max-width: 430px; width: 100%; padding: 28px; text-align: center; }
.logout-confirm-icon { width: 52px; height: 52px; margin: 0 auto 14px; display: grid; place-items: center; border-radius: 50%; background: #FBEDEC; color: #C0392B; font-size: 22px; }
.account-page .btn-danger-confirm { background: #C0392B; border-color: #C0392B; }
.account-page .btn-danger-confirm:hover { background: #A93226; border-color: #A93226; }
.search-input-wrapper { position: relative; display: flex; align-items: center; }
.search-input-wrapper .sg-input { padding-right: 36px; }
.select-arrow { position: absolute; right: 12px; pointer-events: none; font-size: 12px; color: var(--sg-muted); }
.dropdown-search-list { position: absolute; top: calc(100% + 4px); left: 0; right: 0; max-height: 220px; overflow-y: auto; background: #fff; border: 1px solid var(--sg-line); border-radius: 8px; box-shadow: 0 10px 25px -10px rgba(0,0,0,.15); z-index: 10; list-style: none; padding: 4px 0; margin: 0; }
.dropdown-search-list li { padding: 10px 14px; font-size: 13px; color: var(--sg-ink); cursor: pointer; transition: background .15s; }
.dropdown-search-list li:hover { background: var(--sg-soft); }
.dropdown-search-list li.selected { background: var(--sg-ink); color: #fff; }
.dropdown-search-list .no-result { color: var(--sg-muted); font-size: 12px; text-align: center; padding: 12px; cursor: default; }
.acc-orders :deep(.orders-page) { background: transparent; min-height: auto; padding: 0; }
.acc-orders :deep(.orders-page > .w-full) { padding: 0; max-width: none; }
.acc-orders :deep(.op-title) { font-family: 'Fraunces', Georgia, serif; font-size: 24px; font-weight: 600; }
.acc-orders :deep(.sg-title-bar) { display: none; }
.acc-orders :deep(.op-toolbar) { padding: 16px; border-radius: 12px; }
.acc-orders :deep(.op-search) { border-width: 1px; border-radius: 8px; }
.acc-orders :deep(.stat-pill) { border-width: 1px; border-radius: 8px; font-size: 12px; font-weight: 500; }
.acc-orders :deep(.empty) { padding: 48px 20px; }
.suc-enter-active, .suc-leave-active { transition: opacity .2s; }
.suc-enter-from, .suc-leave-to { opacity: 0; }
@media (min-width: 768px) {
  .account-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 1024px) {
  .account-container { padding-inline: 32px; }
  .account-grid { grid-template-columns: 280px minmax(0, 1fr); }
  .acc-side { position: sticky; top: 92px; }
  .acc-content { padding: 32px; }
}
@media (max-width: 639px) {
  .account-page.account-page { padding-bottom: 48px; }
  .acc-content { padding: 24px; }
  .account-section-heading { align-items: flex-start; flex-direction: column; }
  .profile-avatar-editor { align-items: flex-start; padding: 16px; gap: 16px; }
  .profile-avatar-preview { width: 64px; height: 64px; }
  .addr-card { flex-direction: column; }
  .addr-actions { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 16px; }
  .coupon-card { display: grid; grid-template-columns: 48px minmax(0, 1fr); }
  .coupon-left { width: 48px; grid-row: 1 / span 2; }
  .coupon-mid { padding: 16px 12px 8px; }
  .coupon-right { flex-direction: row; justify-content: flex-start; align-items: center; flex-wrap: wrap; padding: 0 12px 16px; }
  .account-page .modal-box { padding: 20px; }
}
@media (max-width: 420px) {
  .account-container { padding-inline: 16px; }
  .acc-content { padding: 20px; }
  .profile-avatar-editor { flex-direction: column; }
  .profile-avatar-actions { width: 100%; }
  .account-page .modal-box .btn-sg, .account-page .modal-box .btn-sg-outline { padding-inline: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .account-page *, .suc-enter-active, .suc-leave-active { transition: none; }
}
</style>
