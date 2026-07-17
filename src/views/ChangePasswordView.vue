<template>
  <div class="container-fluid px-4 py-5 bg-light min-vh-100">
    <div class="container">
      <h1 class="fw-bold mb-4 fs-2">Tài Khoản</h1>
      <div class="row g-4">

        <div class="col-md-4 col-lg-3">
          <div class="d-flex flex-column gap-2 bg-white rounded-4 p-3 shadow-sm">
            <div class="px-3 py-2">
              <p class="small text-secondary mb-1">Xin chào</p>
              <h6 class="fw-bold mb-0">{{ displayName }}</h6>
            </div>
            <router-link to="/account" class="btn btn-light text-start border-0 fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2 text-secondary">
              <i class="bi bi-person"></i> Hồ sơ
            </router-link>
            <router-link to="/orders" class="btn btn-light text-start border-0 fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2 text-secondary">
              <i class="bi bi-box"></i> Đơn hàng
            </router-link>
            <router-link to="/change-password" class="btn btn-dark text-start border-0 fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2">
              <i class="bi bi-shield-lock"></i> Đổi mật khẩu
            </router-link>
          </div>
        </div>

        <div class="col-md-8 col-lg-9">
          <div class="card border-0 rounded-4 shadow-sm">
            <div class="card-body p-4 p-md-5">
              <h4 class="fw-bold mb-1">Đổi mật khẩu</h4>
              <p class="text-secondary small mb-4">
                Nhập mật khẩu hiện tại và mật khẩu mới cho tài khoản {{ form.email }}
              </p>

              <div v-if="successMessage" class="alert alert-success py-2 small fw-bold">
                <i class="bi bi-check-circle-fill me-1"></i>{{ successMessage }}
              </div>
              <div v-if="errorMessage" class="alert alert-danger py-2 small fw-bold">
                <i class="bi bi-exclamation-triangle-fill me-1"></i>{{ errorMessage }}
              </div>

              <form @submit.prevent="handleChangePassword">
                <div class="mb-3">
                  <label class="form-label fw-bold small">Mật khẩu hiện tại</label>
                  <input
                    v-model="form.oldPassword"
                    type="password"
                    class="form-control bg-light border-0 px-3 py-2"
                    placeholder="Nhập mật khẩu hiện tại"
                    required
                  >
                </div>

                <div class="mb-3">
                  <label class="form-label fw-bold small">Mật khẩu mới</label>
                  <input
                    v-model="form.newPassword"
                    type="password"
                    class="form-control bg-light border-0 px-3 py-2"
                    placeholder="Ít nhất 6 ký tự"
                    required
                  >
                </div>

                <div class="mb-4">
                  <label class="form-label fw-bold small">Xác nhận mật khẩu mới</label>
                  <input
                    v-model="form.confirmPassword"
                    type="password"
                    class="form-control bg-light border-0 px-3 py-2"
                    placeholder="Nhập lại mật khẩu mới"
                    required
                  >
                </div>

                <button type="submit" class="btn btn-dark rounded-4 fw-bold px-4 py-2" :disabled="isLoading">
                  <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
                  {{ isLoading ? 'Đang xử lý...' : 'Cập nhật mật khẩu' }}
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { currentUser, changePassword } from '../stores/authStore'

const router = useRouter()
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const form = reactive({
  email: '',
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

watch(
  () => currentUser.value,
  (user) => {
    if (user) {
      form.email = user.email || user.username || ''
    } else {
      router.push('/login')
    }
  },
  { immediate: true }
)

const displayName = computed(() =>
  currentUser.value ? (currentUser.value.full_name || currentUser.value.name) : 'Khách hàng'
)

const handleChangePassword = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (form.newPassword.length < 6) {
    errorMessage.value = 'Mật khẩu mới phải có ít nhất 6 ký tự.'
    return
  }
  if (form.newPassword !== form.confirmPassword) {
    errorMessage.value = 'Xác nhận mật khẩu mới không khớp.'
    return
  }

  isLoading.value = true
  const result = await changePassword({
    email: form.email,
    oldPassword: form.oldPassword,
    newPassword: form.newPassword
  })
  isLoading.value = false

  if (result.ok) {
    successMessage.value = result.message
    form.oldPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
  } else {
    errorMessage.value = result.message
  }
}
</script>

<style scoped>
.form-control:focus {
  box-shadow: none;
  background-color: #fff !important;
  border: 1px solid #212529 !important;
}
</style>
