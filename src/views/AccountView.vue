<script setup>
import { computed, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { currentUser, logout } from '../stores/authStore'

const router = useRouter()

const form = reactive({
  fullName: '',
  phone: '',
  email: '',
  address: ''
})

watch(
  currentUser,
  (user) => {
    if (!user) return

    form.fullName = user.full_name || ''
    form.phone = user.phone || ''
    form.email = user.email || ''
    form.address = user.address || ''
  },
  { immediate: true }
)

const displayName = computed(() => currentUser.value?.full_name || 'Khách hàng')

const handleLogout = () => {
  logout()
  router.push('/login')
}

const saveProfile = () => {
  alert('Thông tin hồ sơ đã được cập nhật trên giao diện demo.')
}
</script>

<template>
  <div class="container-fluid px-4 py-5 bg-light min-vh-100">
    <div class="container">
      <h1 class="fw-bold mb-4 fs-2">Tài Khoản Của Tôi</h1>

      <div class="row g-4">
        <div class="col-md-4 col-lg-3">
          <div class="d-flex flex-column gap-2 bg-white rounded-4 p-3 shadow-sm">
            <div class="px-3 py-2">
              <p class="small text-secondary mb-1">Xin chào</p>
              <h6 class="fw-bold mb-0">{{ displayName }}</h6>
            </div>

            <router-link to="/account" class="btn btn-dark text-start border-0 fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2">
              <i class="bi bi-person"></i> Hồ sơ
            </router-link>

            <router-link to="/orders" class="btn btn-light text-start border-0 fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2 text-secondary" active-class="btn-dark text-white">
              <i class="bi bi-box"></i> Đơn hàng
            </router-link>

            <button class="btn btn-light text-start border-0 fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2 text-secondary">
              <i class="bi bi-gear"></i> Cài đặt
            </button>

            <hr class="my-2 text-secondary">

            <button
              type="button"
              class="btn btn-outline-danger text-start fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2 border-0 bg-danger-hover"
              @click="handleLogout"
            >
              <i class="bi bi-box-arrow-right"></i> Đăng xuất
            </button>
          </div>
        </div>

        <div class="col-md-8 col-lg-9">
          <div class="card border-0 rounded-4 shadow-sm p-4">
            <div class="border-bottom pb-3 mb-4">
              <h2 class="fw-bold fs-4 m-0">Thông tin cá nhân</h2>
            </div>

            <form class="row g-4" @submit.prevent="saveProfile">
              <div class="col-md-6">
                <label class="form-label fw-bold small text-dark">Họ và Tên</label>
                <input v-model="form.fullName" type="text" class="form-control form-control-lg rounded-3 bg-light border-0 fs-6 fw-medium px-3">
              </div>

              <div class="col-md-6">
                <label class="form-label fw-bold small text-dark">Số Điện Thoại</label>
                <input v-model="form.phone" type="tel" class="form-control form-control-lg rounded-3 bg-light border-0 fs-6 fw-medium px-3">
              </div>

              <div class="col-12">
                <label class="form-label fw-bold small text-dark">Email</label>
                <input v-model="form.email" type="email" class="form-control form-control-lg rounded-3 border-0 fs-6 fw-medium px-3 text-secondary" style="background-color: #e9ecef;" readonly>
              </div>

              <div class="col-12">
                <label class="form-label fw-bold small text-dark">Địa chỉ giao hàng mặc định</label>
                <input v-model="form.address" type="text" class="form-control form-control-lg rounded-3 bg-light border-0 fs-6 fw-medium px-3">
              </div>

              <div class="col-12 d-flex justify-content-end mt-4">
                <button type="submit" class="btn btn-dark fw-bold px-5 py-2 rounded-3 shadow-hover">
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
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

.bg-danger-hover:hover {
  background-color: #f8d7da;
}
</style>
