<!--
  AdminWelcome.vue
  ------------------------------------------------------------------
  Màn hình chào mừng quản lý khi vừa đăng nhập Admin thành công.
  Hiển thị hộp chào mừng (Welcome Card) ở giữa màn hình theo chuẩn
  nhận diện thương hiệu ShoeGroup:
  - Tông màu: Đen (#0A0A0A), Đỏ (#D4001A), Trắng và Xám kỹ thuật
  - Thông tin quản lý, vai trò, thời gian đăng nhập
  - Nút "Xác nhận & Vào trang quản lý" điều hướng vào /admin/panel
-->
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { currentUser } from '../../stores/authStore'
import { getDisplayName, handleLogout } from './adminStore'
import BrandLogo from '../../components/BrandLogo.vue'

const router = useRouter()
const isEntering = ref(false)

// Thời gian đăng nhập
const loginTime = ref('')

onMounted(() => {
  const d = new Date()
  loginTime.value = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' +
    d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
})

const adminName = computed(() => {
  const u = currentUser.value
  return u?.full_name || u?.name || getDisplayName.value || 'Quản trị viên'
})

const adminEmail = computed(() => {
  return currentUser.value?.email || 'admin@shoegroup.vn'
})

const adminRole = computed(() => {
  const r = currentUser.value?.role
  if (r === 'Admin' || currentUser.value?.role_id === 1) return 'Quản Trị Viên (Admin)'
  return r || 'Quản Lý Hệ Thống'
})

const adminInitial = computed(() => {
  const n = adminName.value || 'A'
  return n.trim().charAt(0).toUpperCase()
})

function enterPanel() {
  if (isEntering.value) return
  isEntering.value = true
  router.push('/admin/panel')
}

function goToStore() {
  // Admin không được thao tác như khách hàng — chặn điều hướng về trang chủ
  // Giữ đăng nhập admin, chỉ cho phép thao tác trong /admin
  return
}

function onLogoutClick() {
  if (handleLogout()) router.push('/login')
}
</script>

<template>
  <div class="welcome-overlay d-flex align-items-center justify-content-center font-sans px-3">
    <!-- Nền lưới tinh tế -->
    <div class="bg-grid"></div>

    <div class="welcome-card text-center fade-in-scale position-relative">
      <!-- Đường viền đỏ accent ở trên đỉnh card -->
      <div class="top-accent-bar"></div>

      <!-- Logo thương hiệu -->
      <div class="brand-header mb-4">
        <div class="logo-box mx-auto mb-2">
          <BrandLogo :size="42" :radius="4" />
        </div>
        <div class="brand-name">
          <span class="text-black">SHOE</span><span class="text-red">GROUP</span>
          <span class="badge-admin ms-2">ADMIN</span>
        </div>
      </div>

      <!-- Huy hiệu xác thực -->
      <div class="auth-status-pill mx-auto mb-3">
        <i class="bi bi-shield-fill-check text-success me-1"></i>
        <span>ĐĂNG NHẬP THÀNH CÔNG</span>
      </div>

      <!-- Tiêu đề chào mừng -->
      <h1 class="welcome-title mb-2">
        Xin chào, <span class="text-name">{{ adminName }}</span>
      </h1>
      
      <p class="welcome-subtitle mb-4">
        Chào mừng bạn quay trở lại hệ thống quản trị <strong>ShoeGroup</strong>.<br>
        Phiên làm việc đã được xác thực và sẵn sàng.
      </p>

      <!-- Khung thông tin quản lý tóm tắt -->
      <div class="admin-info-box mb-4 text-start">
        <div class="d-flex align-items-center gap-3">
          <div class="avatar-badge">{{ adminInitial }}</div>
          <div class="flex-grow-1 overflow-hidden">
            <div class="fw-bold text-dark text-truncate">{{ adminName }}</div>
            <div class="text-muted small text-truncate">{{ adminEmail }}</div>
          </div>
          <div class="text-end">
            <span class="role-tag">{{ adminRole }}</span>
          </div>
        </div>

        <div class="info-divider my-2"></div>

        <div class="d-flex justify-content-between align-items-center text-muted small">
          <span><i class="bi bi-clock me-1"></i>Đăng nhập lúc:</span>
          <span class="fw-medium text-dark">{{ loginTime || 'Vừa xong' }}</span>
        </div>
      </div>

      <!-- Nút vào trang quản lý chính -->
      <button
        @click="enterPanel"
        :disabled="isEntering"
        class="btn-enter-panel w-100 mb-3"
      >
        <span v-if="!isEntering" class="d-flex align-items-center justify-content-center gap-2">
          <i class="bi bi-speedometer2"></i>
          <span>XÁC NHẬN &amp; VÀO TRANG QUẢN LÝ</span>
          <i class="bi bi-arrow-right"></i>
        </span>
        <span v-else class="d-flex align-items-center justify-content-center gap-2">
          <span class="spinner-border spinner-border-sm" role="status"></span>
          <span>Đang chuyển hướng...</span>
        </span>
      </button>

      <!-- Các liên kết phụ — admin không được về trang khách để đặt hàng -->
      <div class="d-flex justify-content-center align-items-center gap-3 text-muted small">
        <button class="btn-sub-link" disabled title="Tài khoản admin không được thao tác như khách hàng. Vui lòng đăng xuất nếu muốn mua hàng." style="opacity:.45; cursor:not-allowed;">
          <i class="bi bi-shop me-1"></i>Xem Cửa Hàng
        </button>
        <span class="dot-sep">•</span>
        <button @click="onLogoutClick" class="btn-sub-link text-danger-sub">
          <i class="bi bi-box-arrow-right me-1"></i>Đăng Xuất
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
@import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css');
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&subset=vietnamese&display=swap');

.font-sans {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.welcome-overlay {
  position: fixed;
  inset: 0;
  height: 100vh;
  width: 100vw;
  background: #0d0f12;
  z-index: 9999;
}

/* Nền lưới kỹ thuật */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
}

/* Card chào mừng */
.welcome-card {
  background: #ffffff;
  border-radius: 6px;
  padding: 2.5rem 2.25rem;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.15);
  z-index: 10;
  overflow: hidden;
}

.top-accent-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: #0A0A0A;
}

.logo-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.brand-name {
  font-weight: 900;
  font-size: 1.25rem;
  letter-spacing: 0.08em;
  line-height: 1;
}

.text-black {
  color: #0A0A0A;
}

.text-red {
  color: #0A0A0A;
}

.badge-admin {
  background: #0A0A0A;
  color: #ffffff;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 2px;
  letter-spacing: 0.06em;
  vertical-align: middle;
}

.auth-status-pill {
  display: inline-flex;
  align-items: center;
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
  letter-spacing: 0.06em;
}

.welcome-title {
  color: #0A0A0A;
  font-weight: 800;
  font-size: 1.65rem;
  letter-spacing: -0.02em;
}

.text-name {
  color: #0A0A0A;
}

.welcome-subtitle {
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Khung tóm tắt thông tin */
.admin-info-box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 12px 14px;
}

.avatar-badge {
  width: 36px;
  height: 36px;
  background: #0A0A0A;
  color: #ffffff;
  font-weight: 800;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.role-tag {
  background: #f3f4f6;
  color: #0A0A0A;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 3px;
  border: 1px solid #e5e7eb;
  white-space: nowrap;
}

.info-divider {
  height: 1px;
  background: #e5e7eb;
}

/* Nút chính */
.btn-enter-panel {
  background: #0A0A0A;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 14px 20px;
  font-weight: 700;
  font-size: 0.92rem;
  letter-spacing: 0.04em;
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn-enter-panel:hover:not(:disabled) {
  background: #1a1a1a;
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.btn-enter-panel:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

/* Nút phụ */
.btn-sub-link {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0;
  cursor: pointer;
  transition: color 0.15s ease;
}

.btn-sub-link:hover {
  color: #0A0A0A;
}

.text-danger-sub:hover {
  color: #D4001A;
}

.dot-sep {
  color: #d1d5db;
}

/* Animation */
.fade-in-scale {
  animation: fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>



