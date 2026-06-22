<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login } from '../stores/authStore'

const route = useRoute()
const router = useRouter()

const form = reactive({
  email: '', // Đã xóa email mặc định
  password: ''
})

const isLoading = ref(false)
const errorMessage = ref('') 

const handleLogin = async () => {
  errorMessage.value = ''; 
  isLoading.value = true;
  
  try {
    const result = await login({
      email: form.email,
      password: form.password
    })

    if (!result.ok) {
      errorMessage.value = result.message; 
      isLoading.value = false;
      return;
    }

    // --- PHÂN LUỒNG: NẾU LÀ ADMIN THÌ VÀO DASHBOARD, KHÁCH THÌ VÀO ACCOUNT ---
    if (result.user.role === 'Admin') {
      router.push('/admin')
    } else {
      const redirectPath = route.query.redirect || '/account'
      router.push(String(redirectPath))
    }
    
  } catch (error) {
    errorMessage.value = "Hệ thống đang bị lỗi ngầm, không thể gọi API.";
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="container d-flex align-items-center justify-content-center min-vh-100 py-5">
    <div class="card border-0 rounded-5 shadow-lg w-100" style="max-width: 450px;">
      <div class="card-body p-4 p-md-5">
        <div class="text-center mb-4">
          <h2 class="fw-bold text-dark fs-3 mb-2">Đăng Nhập</h2>
          <p class="text-secondary fw-medium small">Chào mừng trở lại với ShoeGroup</p>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-2 small fw-bold text-center">
          {{ errorMessage }}
        </div>

        <form @submit.prevent="handleLogin">
          <div class="mb-3">
            <label class="form-label fw-bold text-dark small">Email</label>
            <input
              v-model="form.email"
              type="email"
              class="form-control form-control-lg rounded-4 bg-light border-0 px-4 fw-medium fs-6"
              placeholder="nhapemail@example.com"
              required
            >
          </div>

          <div class="mb-4">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <label class="form-label fw-bold text-dark small mb-0">Mật khẩu</label>
              <router-link to="/forgot-password" class="text-decoration-none text-primary fw-bold small">Quên?</router-link>
            </div>

            <input
              v-model="form.password"
              type="password"
              class="form-control form-control-lg rounded-4 bg-light border-0 px-4 fw-medium fs-6"
              placeholder="••••••••"
              required
            >
          </div>

          <button type="submit" class="btn btn-dark w-100 btn-lg rounded-4 fw-bold fs-6 shadow-hover mt-2" :disabled="isLoading">
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
            {{ isLoading ? 'Đang kết nối...' : 'Đăng Nhập' }}
          </button>
        </form>

        <div class="text-center mt-4">
          <p class="text-secondary fw-medium small mb-0">
            Chưa có tài khoản?
            <router-link to="/register" class="text-dark fw-bold text-decoration-none border-bottom border-dark">
              Đăng ký ngay
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-control:focus {
  box-shadow: none;
  background-color: #fff !important;
  border: 1px solid #212529 !important;
}
</style>