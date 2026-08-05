<template>
  <div class="container d-flex align-items-center justify-content-center min-vh-100 py-5">
    <div class="card border-0 rounded-5 shadow-lg w-100" style="max-width: 450px;">
      <div class="card-body p-4 p-md-5">
        <div class="text-center mb-4">
          <div class="brand-icon mx-auto mb-3">
            <i class="bi bi-key-fill"></i>
          </div>
          <h2 class="fw-bold text-dark fs-3 mb-2">Đặt Lại Mật Khẩu</h2>
          <p class="text-secondary fw-medium small px-3">
            Tạo mật khẩu mới cho tài khoản của bạn
          </p>
        </div>

        <div v-if="successMessage" class="alert alert-success py-2 small fw-bold text-center">
          <i class="bi bi-check-circle-fill me-1"></i>
          {{ successMessage }}
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-2 small fw-bold text-center">
          <i class="bi bi-exclamation-triangle-fill me-1"></i>
          {{ errorMessage }}
        </div>

        <form @submit.prevent="handleResetPassword" v-if="!successMessage">
          <div class="mb-3">
            <label class="form-label fw-bold text-dark small">Mật khẩu mới</label>
            <div class="input-group input-group-lg">
              <span class="input-group-text bg-light border-0 rounded-start-4">
                <i class="bi bi-lock-fill text-secondary"></i>
              </span>
              <input 
                v-model="form.newPassword" 
                :type="showPassword ? 'text' : 'password'"
                class="form-control bg-light border-0 px-4 fw-medium fs-6" 
                placeholder="Ít nhất 8 ký tự"
                required
              >
              <button 
                type="button" 
                class="btn btn-light border-0 rounded-end-4" 
                @click="showPassword = !showPassword"
              >
                <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
            <small class="text-secondary d-block mt-1">
              <i class="bi bi-info-circle me-1"></i>
              Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số
            </small>
          </div>

          <div class="mb-4">
            <label class="form-label fw-bold text-dark small">Xác nhận mật khẩu mới</label>
            <div class="input-group input-group-lg">
              <span class="input-group-text bg-light border-0 rounded-start-4">
                <i class="bi bi-check-circle text-secondary"></i>
              </span>
              <input 
                v-model="form.confirmPassword" 
                :type="showConfirmPassword ? 'text' : 'password'"
                class="form-control bg-light border-0 px-4 fw-medium fs-6" 
                placeholder="Nhập lại mật khẩu mới"
                required
              >
              <button 
                type="button" 
                class="btn btn-light border-0 rounded-end-4" 
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <i :class="showConfirmPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            class="btn btn-dark w-100 btn-lg rounded-4 fw-bold fs-6 shadow-hover mt-2"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
            {{ isLoading ? 'Đang xử lý...' : 'Đặt Lại Mật Khẩu' }}
          </button>
        </form>

        <div class="text-center mt-4">
          <p class="text-secondary fw-medium small mb-0">
            <router-link to="/login" class="text-dark fw-bold text-decoration-none border-bottom border-dark">
              <i class="bi bi-arrow-left me-1"></i> Quay lại Đăng nhập
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
import { resetPassword } from '../stores/authStore'

const route = useRoute()
const router = useRouter()
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const token = ref('')

const form = reactive({
  newPassword: '',
  confirmPassword: ''
})

onMounted(() => {
  token.value = route.query.token || ''
  if (!token.value) {
    errorMessage.value = 'Token không hợp lệ hoặc đã hết hạn'
  }
})

const handleResetPassword = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!token.value) {
    errorMessage.value = 'Token không hợp lệ'
    return
  }

  if (!form.newPassword) {
    errorMessage.value = 'Vui lòng nhập mật khẩu mới'
    return
  }

  if (form.newPassword.length < 8) {
    errorMessage.value = 'Mật khẩu phải có ít nhất 8 ký tự'
    return
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
  if (!passwordRegex.test(form.newPassword)) {
    errorMessage.value = 'Mật khẩu phải bao gồm chữ hoa, chữ thường và số'
    return
  }

  if (form.newPassword !== form.confirmPassword) {
    errorMessage.value = 'Xác nhận mật khẩu không khớp'
    return
  }

  isLoading.value = true

  const result = await resetPassword({
    token: token.value,
    newPassword: form.newPassword
  })

  isLoading.value = false

  if (result.ok) {
    successMessage.value = result.message
    form.newPassword = ''
    form.confirmPassword = ''
    // Tự động chuyển về login sau 3 giây
    setTimeout(() => {
      router.push('/login?reset=success')
    }, 3000)
  } else {
    errorMessage.value = result.message
  }
}
</script>

<style scoped>
.brand-icon {
  width: 72px;
  height: 72px;
  background: #000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 32px;
}

.form-control:focus {
  box-shadow: none;
  background-color: #fff !important;
  border: 1px solid #212529 !important;
}

.input-group-text {
  min-width: 46px;
  justify-content: center;
}
</style>