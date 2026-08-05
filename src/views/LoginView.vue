<template>
  <div class="login-page">
    <div class="login-overlay"></div>

    <div class="login-container">
      <div class="login-form">
        <div class="text-center mb-4">
          <div class="brand-icon mx-auto mb-3">
            <i class="bi bi-box-fill"></i>
          </div>
          <h2 class="fw-bold text-white mb-2">Chào mừng trở lại</h2>
          <p class="text-white-50 small">Đăng nhập để tiếp tục mua sắm</p>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-2 small fw-bold text-center">
          <i class="bi bi-exclamation-triangle-fill me-1"></i>
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="alert alert-success py-2 small fw-bold text-center">
          <i class="bi bi-check-circle-fill me-1"></i>
          {{ successMessage }}
        </div>

        <form @submit.prevent="handleLogin">
          <div class="mb-3">
            <label class="form-label fw-bold text-white small">Email</label>
            <div class="input-group input-group-lg">
              <span class="input-group-text glass-addon rounded-start-4">
                <i class="bi bi-envelope text-white-50"></i>
              </span>
              <input
                v-model="form.email"
                type="email"
                class="form-control glass-input rounded-end-4 px-3 fw-medium fs-6"
                placeholder="nhapemail@example.com"
                required
              >
            </div>
          </div>

          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <label class="form-label fw-bold text-white small mb-0">Mật khẩu</label>
              <router-link to="/forgot-password" class="text-decoration-none text-white fw-bold small">
                Quên mật khẩu?
              </router-link>
            </div>
            <div class="input-group input-group-lg">
              <span class="input-group-text glass-addon rounded-start-4">
                <i class="bi bi-lock text-white-50"></i>
              </span>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                class="form-control glass-input px-3 fw-medium fs-6"
                placeholder="••••••••"
                required
                @keyup.enter="handleLogin"
              >
              <button
                type="button"
                class="btn glass-addon rounded-end-4 border-0"
                @click="showPassword = !showPassword"
              >
                <i :class="showPassword ? 'bi bi-eye-slash text-white-50' : 'bi bi-eye text-white-50'"></i>
              </button>
            </div>
          </div>

          <div class="mb-3 d-flex justify-content-between align-items-center">
            <div class="form-check">
              <input
                type="checkbox"
                class="form-check-input"
                id="rememberMe"
                v-model="rememberMe"
              >
              <label class="form-check-label text-white-50 small" for="rememberMe">
                Ghi nhớ đăng nhập
              </label>
            </div>
            <span class="text-white-50 small">
              <i class="bi bi-shield-check me-1"></i>
              Bảo mật cao
            </span>
          </div>

          <button
            type="submit"
            class="btn btn-light w-100 btn-lg rounded-4 fw-bold fs-6 mt-2 text-dark"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
            {{ isLoading ? 'Đang kết nối...' : 'Đăng Nhập' }}
          </button>
        </form>

        <div class="text-center mt-4">
          <p class="text-white-50 fw-medium small mb-0">
            Chưa có tài khoản?
            <router-link to="/register" class="text-white fw-bold text-decoration-none border-bottom border-white">
              Đăng ký ngay
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login } from '../stores/authStore'

const route = useRoute()
const router = useRouter()

const form = reactive({
  email: '',
  password: ''
})

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const showPassword = ref(false)
const rememberMe = ref(false)

// Kiểm tra cookie và session khi load trang
onMounted(() => {
  // Nếu đã có session thì chuyển hướng
  const sessionUser = sessionStorage.getItem('user_session')
  const cookieUser = document.cookie.includes('user_session=')

  if (sessionUser || cookieUser) {
    router.push('/account')
    return
  }

  // Lấy email đã lưu
  const savedEmail = localStorage.getItem('remember_email')
  if (savedEmail) {
    form.email = savedEmail
    rememberMe.value = true
  }

  // Kiểm tra thông báo từ reset password
  if (route.query.reset === 'success') {
    successMessage.value = 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập.'
  }

  if (route.query.timeout === 'true') {
    errorMessage.value = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  }
})

const handleLogin = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    const result = await login({
      email: form.email,
      password: form.password,
      remember: rememberMe.value
    })

    if (!result.ok) {
      errorMessage.value = result.message
      isLoading.value = false
      return
    }

    // Phân luồng
    if (result.user.role === 'Admin') {
      router.push('/admin')
    } else {
      const redirectPath = route.query.redirect || '/account'
      router.push(String(redirectPath))
    }

  } catch (error) {
    errorMessage.value = "Hệ thống đang bị lỗi, không thể gọi API."
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 20px 8vw;
  background-image: url('https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&q=80&w=1600');
  background-size: cover;
  background-position: center;
  overflow: hidden;
}

.login-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(10,10,15,0.75) 0%, rgba(10,10,15,0.45) 45%, rgba(10,10,15,0.15) 100%);
}

.login-container {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 420px;
}

.login-form {
  width: 100%;
  padding: 40px 36px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 28px;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
}

.brand-icon {
  width: 60px;
  height: 60px;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  color: white;
  font-size: 26px;
}

.glass-addon {
  background: rgba(255,255,255,0.08) !important;
  border: 1px solid rgba(255,255,255,0.15) !important;
  border-left: none !important;
  min-width: 46px;
  justify-content: center;
}
.input-group-text.glass-addon {
  border-right: none !important;
  border-left: 1px solid rgba(255,255,255,0.15) !important;
}

.glass-input {
  background: rgba(255,255,255,0.08) !important;
  border: 1px solid rgba(255,255,255,0.15) !important;
  border-left: none !important;
  border-right: none !important;
  color: #fff !important;
}
.glass-input::placeholder {
  color: rgba(255,255,255,0.5);
}
.glass-input:focus {
  box-shadow: none !important;
  background: rgba(255,255,255,0.14) !important;
  border-color: rgba(255,255,255,0.3) !important;
}

.form-check-input {
  background-color: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.3);
}
.form-check-input:checked {
  background-color: #fff;
  border-color: #fff;
}

@media (max-width: 992px) {
  .login-page {
    justify-content: center;
    padding: 20px;
  }
  .login-form {
    padding: 32px 24px;
  }
}
</style>