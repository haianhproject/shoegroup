<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { currentUser, updateProfile, logout } from '../stores/authStore'
import { notify } from '../stores/uiStore'
import { formatCurrency } from '../stores/cartStore'
import { addressBookApi, formatAddress, vietnamAddressApi } from '../services/addressService'
import MyOrders from './MyOrders.vue'

const route = useRoute()
const router = useRouter()
const tab = ref(['orders', 'address', 'profile', 'coupons'].includes(route.query.tab) ? route.query.tab : 'profile')

onMounted(async () => {
  if (route.query.tab === 'orders') tab.value = 'orders'
  await Promise.all([fetchProvinces(), loadAddresses()])
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
  const r = await updateProfile({
    id: currentUser.value?.id_user || currentUser.value?.id,
    email: profile.email,
    full_name: profile.full_name,
    phone: profile.phone
  })
  savingProfile.value = false
  if (r?.ok === false) { notify({ type: 'error', message: r.message || 'Không thể cập nhật.' }); return }
  notify({ type: 'success', title: 'Đã lưu', message: 'Thông tin cá nhân đã cập nhật.' })
}

/* ---- API ĐỊA CHỈ & TÌM KIẾM NHANH ---- */
const provinces = ref([])
const communes = ref([])
const loadingCommunes = ref(false)
const addressSaving = ref(false)

// State tìm kiếm & Dropdown
const searchProvince = ref('')
const searchCommune = ref('')
const showProvinceDropdown = ref(false)
const showCommuneDropdown = ref(false)

// Lọc Tỉnh/Thành phố theo từ khóa gõ vào 🔍
const filteredProvinces = computed(() => {
  if (!searchProvince.value) return provinces.value
  const kw = searchProvince.value.toLowerCase().trim()
  return provinces.value.filter(p => p.name.toLowerCase().includes(kw))
})

// Lọc Phường/Xã theo từ khóa gõ vào 🔍
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
    notify({ type: 'error', message: error.message || 'Không tải được danh sách Tỉnh/Thành.' })
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
    notify({ type: 'error', message: error.message || 'Không tải được danh sách Phường/Xã.' })
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

/* ---- Sổ địa chỉ theo tài khoản (lưu trong UserAddresses) ---- */
const addresses = ref([])
const loadingAddresses = ref(false)

const loadAddresses = async () => {
  loadingAddresses.value = true
  try {
    addresses.value = await addressBookApi.list()
  } catch (error) {
    addresses.value = []
    notify({ type: 'error', message: error.message || 'Không tải được sổ địa chỉ.' })
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
      notify({ type: 'error', message: error.message || 'Không tải được danh sách Phường/Xã.' })
    } finally {
      loadingCommunes.value = false
    }
    modal.communeId = a.communeId || communes.value.find((c) => c.name === (a.communeName || a.ward))?.code || ''
  }
}

const closeModal = () => { modal.open = false }

// BỘ LỌC PHONE NGHIÊM NGẶT
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
    notify({ type: 'error', message: 'Vui lòng nhập tên người nhận.' })
    return
  }

  if (!isValidPhone(cleanPhone)) {
    notify({ type: 'error', title: 'SĐT không hợp lệ', message: 'Vui lòng nhập đúng 10 số, đúng nhà mạng Việt Nam và không dùng chuỗi số ảo.' })
    return
  }

  if (!modal.provinceId || !modal.communeId || !modal.line.trim()) {
    notify({ type: 'error', message: 'Vui lòng chọn Tỉnh/Thành, Phường/Xã và nhập số nhà.' })
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
    notify({ type: 'success', title: 'Thành công', message: 'Đã lưu địa chỉ vào sổ.' })
  } catch (error) {
    notify({ type: 'error', message: error.message || 'Không thể lưu địa chỉ.' })
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
    notify({ type: 'info', message: 'Đã xóa địa chỉ.' })
  } catch (error) {
    notify({ type: 'error', message: error.message || 'Không thể xóa địa chỉ.' })
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
    notify({ type: 'success', message: 'Đã đặt làm địa chỉ mặc định.' })
  } catch (error) {
    notify({ type: 'error', message: error.message || 'Không thể đổi địa chỉ mặc định.' })
  } finally {
    addressSaving.value = false
  }
}

const initials = computed(() => (profile.full_name || 'U').split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase())

const userCoupons = ref([
  { code: 'WELCOME30', discount: '-30%', desc: 'Giảm 30% cho thành viên mới', icon: 'bi-gift-fill', minOrder: '500.000đ', expire: '31/12/2026', used: false, expired: false },
  { code: 'FREESHIP', discount: 'Free Ship', desc: 'Miễn phí vận chuyển toàn quốc', icon: 'bi-truck', minOrder: '300.000đ', expire: '31/08/2026', used: false, expired: false },
  { code: 'SUMMER20', discount: '-20%', desc: 'Ưu đãi mùa hè 2026', icon: 'bi-sun-fill', minOrder: '400.000đ', expire: '30/09/2026', used: false, expired: false },
  { code: 'FLASH50K', discount: '-50.000đ', desc: 'Flash sale cuối tuần', icon: 'bi-ticket-perforated-fill', minOrder: '800.000đ', expire: '15/07/2026', used: true, expired: false },
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
              <div class="col-md-6"><label class="co-label">Họ tên</label><input v-model="profile.full_name" class="sg-input w-100" placeholder="Nhập họ và tên"></div>
              <div class="col-md-6"><label class="co-label">Số điện thoại</label><input v-model="profile.phone" class="sg-input w-100" placeholder="Nhập số điện thoại"></div>
              <div class="col-md-6"><label class="co-label">Email</label><input v-model="profile.email" class="sg-input w-100" disabled></div>
            </div>
            <button class="btn-sg mt-3" :disabled="savingProfile" @click="saveProfile"><i class="bi bi-check2 me-1"></i>{{ savingProfile ? 'Đang lưu…' : 'Lưu thay đổi' }}</button>
          </div>

          <!-- Orders -->
          <div v-else-if="tab === 'orders'" class="acc-orders">
            <MyOrders />
          </div>

          <!-- Addresses -->
          <div v-else-if="tab === 'address'" class="sg-card acc-block">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <div><div class="sg-title-bar mb-2"></div><h5 class="fw-bold mb-0">Sổ địa chỉ nhận hàng ✨</h5></div>
              <button class="btn-sg" @click="openAdd"><i class="bi bi-plus-lg me-1"></i>Thêm địa chỉ mới</button>
            </div>
            <div v-if="loadingAddresses" class="text-center py-5 text-muted empty-state">
              <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
              Đang tải sổ địa chỉ…
            </div>
            <div v-else-if="addresses.length === 0" class="text-center py-5 text-muted empty-state">
              <i class="bi bi-geo-alt-fill" style="font-size:2.8rem; color: #ccc;"></i>
              <p class="mt-2 fw-semibold">Bạn chưa có địa chỉ nhận hàng nào trong sổ địa chỉ.</p>
              <button class="btn-sg-outline btn-sm mt-1" @click="openAdd">Tạo địa chỉ ngay</button>
            </div>
            <div v-else class="addr-list">
              <div v-for="a in addresses" :key="a.id" class="addr-card" :class="{ def: a.isDefault }">
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center gap-2 flex-wrap">
                    <strong class="recipient-name">{{ a.recipient }}</strong>
                    <span class="text-muted">| {{ a.phone }}</span>
                    <span v-if="a.isDefault" class="sg-chip sg-chip-default"><i class="bi bi-check-circle-fill me-1"></i>Mặc định</span>
                  </div>
                  <div class="text-secondary mt-1 addr-detail-text">
                    {{ formatAddress(a) }}
                  </div>
                </div>
                <div class="addr-actions">
                  <button v-if="!a.isDefault" class="link-btn set-def-btn" @click="setDefault(a.id)">Đặt mặc định</button>
                  <button class="link-btn" @click="openEdit(a)"><i class="bi bi-pencil me-1"></i>Sửa</button>
                  <button class="link-btn danger" @click="deleteAddr(a.id)"><i class="bi bi-trash3 me-1"></i>Xóa</button>
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

    <!-- MODAL ĐỊA CHỈ (CÓ TÌM KIẾM TỈNH/XÃ) -->
    <transition name="suc">
      <div v-if="modal.open" class="modal-overlay" @click.self="closeModal">
        <div class="sg-card modal-box">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="fw-bold mb-0">{{ modal.editId ? 'Cập nhật địa chỉ 📝' : 'Thêm địa chỉ mới ✨' }}</h5>
            <button class="btn-close-modal" @click="closeModal"><i class="bi bi-x-lg"></i></button>
          </div>

          <div class="row g-3">
            <div class="col-md-6">
              <label class="co-label">Tên người nhận <span class="text-danger">*</span></label>
              <input v-model="modal.recipient" class="sg-input w-100" placeholder="Ví dụ: Nguyễn Văn A">
            </div>
            <div class="col-md-6">
              <label class="co-label">Số điện thoại <span class="text-danger">*</span></label>
              <input
                v-model="modal.phone"
                class="sg-input w-100"
                maxlength="10"
                placeholder="Ví dụ: 0901234567"
                @input="modal.phone = modal.phone.replace(/[^0-9]/g, '')"
              >
            </div>

            <!-- Tỉnh / Thành phố (Có tìm kiếm) -->
            <div class="col-md-6 position-relative">
              <label class="co-label">Tỉnh / Thành phố <span class="text-danger">*</span></label>
              <div class="search-input-wrapper">
                <input
                  type="text"
                  v-model="searchProvince"
                  class="sg-input w-100 pe-4"
                  placeholder="🔍 Nhập để tìm Tỉnh/TP..."
                  @focus="showProvinceDropdown = true"
                  @blur="showProvinceDropdown = false"
                  @input="showProvinceDropdown = true; modal.provinceId = ''"
                />
                <i class="bi bi-chevron-down select-arrow"></i>
              </div>

              <!-- Dropdown Tỉnh/TP -->
              <ul v-if="showProvinceDropdown" class="dropdown-search-list">
                <li
                  v-for="p in filteredProvinces"
                  :key="p.code"
                  :class="{ selected: String(modal.provinceId) === String(p.code) }"
                  @mousedown.prevent="selectProvince(p)"
                >
                  {{ p.name }}
                </li>
                <li v-if="filteredProvinces.length === 0" class="no-result">
                  ❌ Không tìm thấy tỉnh/thành phù hợp
                </li>
              </ul>
            </div>

            <!-- Phường / Xã (Có tìm kiếm) -->
            <div class="col-md-6 position-relative">
              <label class="co-label">Phường / Xã <span class="text-danger">*</span></label>
              <div class="search-input-wrapper">
                <input
                  type="text"
                  v-model="searchCommune"
                  class="sg-input w-100 pe-4"
                  :disabled="!modal.provinceId || loadingCommunes"
                  :placeholder="loadingCommunes ? '⏳ Đang tải dữ liệu...' : '🔍 Nhập để tìm Phường/Xã...'"
                  @focus="showCommuneDropdown = true"
                  @blur="showCommuneDropdown = false"
                  @input="showCommuneDropdown = true; modal.communeId = ''"
                />
                <i class="bi bi-chevron-down select-arrow"></i>
              </div>

              <!-- Dropdown Phường/Xã -->
              <ul v-if="showCommuneDropdown && modal.provinceId" class="dropdown-search-list">
                <li
                  v-for="w in filteredCommunes"
                  :key="w.code"
                  :class="{ selected: String(modal.communeId) === String(w.code) }"
                  @mousedown.prevent="selectCommune(w)"
                >
                  {{ w.name }}
                </li>
                <li v-if="filteredCommunes.length === 0 && !loadingCommunes" class="no-result">
                  ❌ Không tìm thấy phường/xã phù hợp
                </li>
              </ul>
            </div>

            <!-- Địa chỉ cụ thể -->
            <div class="col-12">
              <label class="co-label">Số nhà, ngõ, tên đường <span class="text-danger">*</span></label>
              <input v-model="modal.line" class="sg-input w-100" placeholder="Ví dụ: Số 123 Đường Cầu Giấy">
            </div>

            <div class="col-12">
              <label class="check-row">
                <input type="checkbox" v-model="modal.isDefault" :disabled="editingDefaultAddress">
                <span class="fw-semibold">Đặt làm địa chỉ nhận hàng mặc định</span>
              </label>
            </div>
          </div>

          <div class="d-flex gap-2 mt-4 justify-content-end">
            <button class="btn-sg-outline" @click="closeModal">Hủy bỏ</button>
            <button class="btn-sg" :disabled="addressSaving" @click="saveAddr">
              <i class="bi bi-check-lg me-1"></i>{{ addressSaving ? 'Đang lưu…' : 'Lưu địa chỉ' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.account-page { background: var(--sg-canvas); min-height: 100vh; }
.acc-side { padding: 24px; text-align: center; position: sticky; top: 90px; }
.acc-avatar { width: 72px; height: 72px; margin: 0 auto 12px; border-radius: 50%; background: #0A0A0A; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.5rem; }
.acc-nav { display: flex; flex-direction: column; gap: 4px; margin-top: 18px; text-align: left; }
.acc-nav button, .acc-nav a { border: 0; background: transparent; padding: .7rem 1rem; border-radius: 4px; font-weight: 700; color: var(--sg-ink-2); text-decoration: none; display: flex; align-items: center; gap: 10px; transition: .2s; }
.acc-nav button:hover, .acc-nav a:hover { background: #f5f5f5; color: #0A0A0A; }
.acc-nav .active { background: #0A0A0A; color: #fff; }
.acc-logout { color: #ef4444 !important; margin-top: 6px; }
.acc-logout:hover { background: #fee2e2 !important; }
.acc-content { min-height: 80vh; }
.acc-orders :deep(.orders-page) { background: transparent; min-height: auto; padding: 0; }
.acc-block { padding: 26px; }
.co-label { font-weight: 700; font-size: .82rem; color: var(--sg-ink-2); margin-bottom: 6px; display: block; }
.check-row { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.check-row input { width: 17px; height: 17px; accent-color: #0A0A0A; cursor: pointer; }
.addr-list { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
.addr-card { display: flex; gap: 12px; border: 1.5px solid var(--sg-line); border-radius: 6px; padding: 16px; transition: .2s; background: #fff; }
.addr-card.def { border-color: #0A0A0A; background: #fafafa; }
.recipient-name { font-size: 1rem; color: #0A0A0A; }
.addr-detail-text { font-size: .88rem; line-height: 1.4; }
.sg-chip-default { background: #0A0A0A; color: #fff; font-size: .72rem; font-weight: 700; padding: .15rem .5rem; border-radius: 4px; display: inline-flex; align-items: center; }
.addr-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; justify-content: center; min-width: 100px; }
.link-btn { border: 0; background: transparent; font-weight: 700; font-size: .82rem; color: #0A0A0A; padding: 0; cursor: pointer; }
.link-btn.set-def-btn { color: #2563eb; }
.link-btn.danger { color: #D4001A; }
.link-btn:hover { text-decoration: underline; }
.modal-overlay { position: fixed; inset: 0; z-index: 3000; background: rgba(10,10,10,.55); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 18px; }
.modal-box { max-width: 600px; width: 100%; padding: 28px; border-radius: 8px; background: #fff; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
.btn-close-modal { border: 0; background: transparent; font-size: 1.1rem; color: #6b7280; cursor: pointer; padding: 4px; }
.btn-close-modal:hover { color: #0A0A0A; }
.suc-enter-active { transition: opacity .3s; } .suc-enter-from { opacity: 0; }

/* Styles cho Dropdown tìm kiếm thông minh */
.position-relative { position: relative; }
.search-input-wrapper { position: relative; display: flex; align-items: center; }
.search-input-wrapper input { width: 100%; }
.select-arrow { position: absolute; right: 12px; pointer-events: none; font-size: 0.75rem; color: #888; }
.dropdown-search-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 220px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  list-style: none;
  padding: 4px 0;
  margin: 0;
}
.dropdown-search-list li {
  padding: 8px 14px;
  font-size: 0.88rem;
  color: #1a1a1a;
  cursor: pointer;
  transition: background 0.15s ease;
}
.dropdown-search-list li:hover {
  background: #f1f5f9;
  font-weight: 600;
}
.dropdown-search-list li.selected {
  background: #0A0A0A;
  color: #ffffff;
  font-weight: 700;
}
.dropdown-search-list .no-result {
  color: #94a3b8;
  font-size: 0.82rem;
  text-align: center;
  padding: 12px;
  cursor: default;
}

.coupon-grid { display: flex; flex-direction: column; gap: 14px; margin-top: 8px; }
.coupon-card { display: flex; gap: 0; border: 1px solid var(--sg-line); border-radius: 6px; overflow: hidden; background: #fff; transition: .2s; position: relative; }
.coupon-card:not(.used):not(.expired):hover { border-color: #0A0A0A; box-shadow: var(--sg-shadow-sm); }
.coupon-card.used { opacity: .65; }
.coupon-card.expired { opacity: .5; }
.coupon-left { background: #D4001A; width: 70px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; position: relative; }
.coupon-card.used .coupon-left { background: #6b7280; }
.coupon-card.expired .coupon-left { background: #e5e5e5; }
.coupon-icon { color: #fff; font-size: 1.6rem; }
.coupon-left::after { content: ''; position: absolute; right: -10px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; border-radius: 50%; background: var(--sg-canvas); border: 1px solid var(--sg-line); }
.coupon-mid { flex: 1; padding: 14px 16px; }
.coupon-code { font-weight: 900; font-size: 1.1rem; letter-spacing: .08em; color: #0A0A0A; font-family: monospace; }
.coupon-desc { font-size: .88rem; color: var(--sg-ink-2); margin: 4px 0; }
.coupon-meta { display: flex; gap: 12px; flex-wrap: wrap; }
.coupon-meta span { font-size: .76rem; color: var(--sg-muted); }
.coupon-exp { color: #D4001A; font-weight: 600; }
.coupon-right { padding: 14px 16px; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 8px; min-width: 120px; }
.coupon-discount { font-size: 1.4rem; font-weight: 900; color: #D4001A; }
.coupon-card.used .coupon-discount, .coupon-card.expired .coupon-discount { color: var(--sg-muted); }
.coupon-status-tag { font-size: .72rem; font-weight: 700; padding: .2rem .6rem; border-radius: 4px; }
.coupon-status-tag.active { background: #D4001A; color: #fff; }
.coupon-status-tag.used { background: #e5e5e5; color: #666; }
.coupon-status-tag.expired { background: #e5e5e5; color: #999; }
.coupon-copy { border: 1px solid #0A0A0A; background: transparent; color: #0A0A0A; border-radius: 4px; padding: .3rem .8rem; font-size: .78rem; font-weight: 700; transition: .2s; }
.coupon-copy:hover { background: #0A0A0A; color: #fff; }
</style>
