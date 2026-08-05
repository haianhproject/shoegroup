<template>
  <div class="container d-flex align-items-center justify-content-center min-vh-100 py-5">
    <div class="card border-0 rounded-5 shadow-lg w-100" style="max-width: 450px;">
      <div class="card-body p-4 p-md-5">
        <div class="text-center mb-4">
          <div class="brand-icon mx-auto mb-3">
            <i class="bi bi-envelope-paper-fill"></i>
          </div>
          <h2 class="fw-bold text-dark fs-3 mb-2">Quên Mật Khẩu</h2>
          <p class="text-secondary fw-medium small px-3">
            Nhập email của bạn để nhận mã đặt lại mật khẩu
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

        <form @submit.prevent="handleForgotPassword" v-if="!successMessage">
          <div class="mb-4">
            <label class="form-label fw-bold text-dark small">Email của bạn</label>
            <div class="input-group input-group-lg">
              <span class="input-group-text bg-light border-0 rounded-start-4">
                <i class="bi bi-envelope text-secondary"></i>
              </span>
              <input 
                v-model="email" 
                type="email" 
                class="form-control rounded-end-4 bg-light border-0 px-4 fw-medium fs-6" 
                placeholder="nhapemail@example.com"
                required
              >
            </div>
          </div>

          <button 
            type="submit" 
            class="btn btn-dark w-100 btn-lg rounded-4 fw-bold fs-6 shadow-hover mt-2"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
            {{ isLoading ? 'Đang gửi...' : 'Gửi Link Đặt Lại' }}
          </button>
        </form>

        <div v-else class="text-center">
          <button 
            type="button"
            class="btn btn-outline-dark w-100 btn-lg rounded-4 fw-bold fs-6 mt-2"
            @click="$router.push('/login')"
          >
            <i class="bi bi-arrow-left me-2"></i>
            Quay lại Đăng nhập
          </button>
        </div>

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
import { ref } from 'vue'
import { forgotPassword } from '../stores/authStore'

const email = ref('')
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const handleForgotPassword = async () => {
  if (!email.value) {
    errorMessage.value = 'Vui lòng nhập email'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  const result = await forgotPassword({ email: email.value })
  
  isLoading.value = false

  if (result.ok) {
    successMessage.value = result.message
    email.value = ''
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