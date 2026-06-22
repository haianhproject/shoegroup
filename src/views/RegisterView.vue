<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '../stores/authStore'

const router = useRouter()
const isLoading = ref(false)

const form = reactive({
  fullName: '',
  email: '',
  password: ''
})

const handleRegister = async () => {
  if (!form.fullName || !form.email || !form.password) {
    alert("Vui lòng điền đầy đủ thông tin");
    return;
  }

  isLoading.value = true;
  const result = await register({
    fullName: form.fullName,
    email: form.email,
    password: form.password
  })
  isLoading.value = false;

  if (!result.ok) {
    alert(result.message)
    return
  }

  // Đăng ký thành công, tự động login và đẩy sang Account
  alert(result.message)
  router.push('/account')
}
</script>

<template>
  <div class="container d-flex align-items-center justify-content-center min-vh-100 py-5">
    <div class="card border-0 rounded-5 shadow-lg w-100" style="max-width: 450px;">
      <div class="card-body p-4 p-md-5">
        <div class="text-center mb-4">
          <h2 class="fw-bold text-dark fs-3 mb-2">Tạo Tài Khoản</h2>
          <p class="text-secondary fw-medium small">Tham gia ngay cùng ShoeGroup</p>
        </div>
        
        <form @submit.prevent="handleRegister">
          <div class="mb-3">
            <label class="form-label fw-bold text-dark small">Họ và Tên</label>
            <input v-model="form.fullName" type="text" class="form-control form-control-lg rounded-4 bg-light border-0 px-4 fw-medium fs-6" placeholder="Nguyễn Văn A" required>
          </div>
          <div class="mb-3">
            <label class="form-label fw-bold text-dark small">Email</label>
            <input v-model="form.email" type="email" class="form-control form-control-lg rounded-4 bg-light border-0 px-4 fw-medium fs-6" placeholder="nhapemail@example.com" required>
          </div>
          <div class="mb-4">
            <label class="form-label fw-bold text-dark small">Mật khẩu</label>
            <input v-model="form.password" type="password" class="form-control form-control-lg rounded-4 bg-light border-0 px-4 fw-medium fs-6" placeholder="••••••••" required>
          </div>
          <button type="submit" class="btn btn-dark w-100 btn-lg rounded-4 fw-bold fs-6 shadow-hover mt-2" :disabled="isLoading">
            {{ isLoading ? 'Đang tạo tài khoản...' : 'Đăng Ký' }}
          </button>
        </form>
        
        <div class="text-center mt-4">
          <p class="text-secondary fw-medium small mb-0">
            Đã có tài khoản? <router-link to="/login" class="text-dark fw-bold text-decoration-none border-bottom border-dark">Đăng nhập</router-link>
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