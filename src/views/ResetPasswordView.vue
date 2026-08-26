<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resetPassword } from '../stores/authStore'
import { notify } from '../stores/uiStore'
import BrandLogo from '../components/BrandLogo.vue'

const route = useRoute()
const router = useRouter()
const token = computed(() => route.query.token || '')

const pwd = ref('')
const confirm = ref('')
const showPwd = ref(false)
const loading = ref(false)
const done = ref(false)

const submit = async () => {
  if (!token.value) { notify({ type: 'error', message: 'Liên kết không hợp lệ hoặc đã hết hạn.' }); return }
  if (pwd.value.length < 6) { notify({ type: 'error', message: 'Mật khẩu phải có ít nhất 6 ký tự.' }); return }
  if (pwd.value !== confirm.value) { notify({ type: 'error', message: 'Mật khẩu xác nhận không khớp.' }); return }
  loading.value = true
  const r = await resetPassword({ token: token.value, newPassword: pwd.value })
  loading.value = false
  if (!r.ok) { notify({ type: 'error', title: 'Đặt lại thất bại', message: r.message }); return }
  done.value = true
  notify({ type: 'success', title: 'Thành công', message: 'Mật khẩu đã được đặt lại. Đang chuyển tới đăng nhập…' })
  setTimeout(() => router.push('/login'), 1500)
}
</script>

<template>
  <div class="auth-page">
    <div class="fp-card sg-card">
      <router-link to="/" class="auth-logo">
        <BrandLogo :size="32" :radius="6" />
        <span class="auth-logo-text"><span class="logo-shoe">SHOE</span><span class="logo-group">GROUP</span></span>
      </router-link>

      <!-- Liên kết không có token -->
      <div v-if="!token">
        <div class="fp-ic fp-ic-warn"><i class="bi bi-exclamation-triangle"></i></div>
        <h2 class="auth-title">Liên kết không hợp lệ</h2>
        <p class="auth-sub">Liên kết đặt lại mật khẩu đã hết hạn hoặc không đúng. Vui lòng yêu cầu gửi lại.</p>
        <router-link to="/forgot-password" class="btn-sg w-100 mt-2" style="text-decoration:none;"><i class="bi bi-arrow-repeat me-2"></i>Yêu cầu liên kết mới</router-link>
      </div>

      <!-- Form đặt mật khẩu mới -->
      <div v-else-if="!done">
        <div class="fp-ic"><i class="bi bi-shield-lock"></i></div>
        <h2 class="auth-title">Đặt lại mật khẩu</h2>
        <p class="auth-sub">Tạo mật khẩu mới cho tài khoản ShoeGroup của bạn.</p>

        <label class="co-label">Mật khẩu mới</label>
        <div class="in-wrap"><i class="bi bi-lock"></i><input v-model="pwd" :type="showPwd ? 'text' : 'password'" class="auth-input" placeholder="Ít nhất 6 ký tự" @keyup.enter="submit"><button class="eye" @click="showPwd = !showPwd"><i class="bi" :class="showPwd ? 'bi-eye-slash' : 'bi-eye'"></i></button></div>

        <label class="co-label">Xác nhận mật khẩu</label>
        <div class="in-wrap"><i class="bi bi-check2-circle"></i><input v-model="confirm" :type="showPwd ? 'text' : 'password'" class="auth-input" placeholder="Nhập lại mật khẩu mới" @keyup.enter="submit"></div>

        <button class="btn-sg w-100 mt-4" :disabled="loading" @click="submit"><i class="bi bi-check-lg me-2"></i>{{ loading ? 'Đang xử lý…' : 'Đổi mật khẩu' }}</button>
      </div>

      <!-- Thành công -->
      <div v-else class="fp-sent">
        <div class="suc-check"><i class="bi bi-check-lg"></i></div>
        <h2 class="auth-title">Đổi mật khẩu thành công</h2>
        <p class="auth-sub">Mật khẩu của bạn đã được cập nhật. Đang chuyển về trang đăng nhập…</p>
      </div>

      <router-link to="/login" class="fp-back"><i class="bi bi-arrow-left me-1"></i>Quay lại đăng nhập</router-link>
    </div>
  </div>
</template>

<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--sg-grad-hero); }
.fp-card { max-width: 460px; width: 100%; padding: 44px; text-align: center; border-radius: 26px; }
.auth-logo { display: inline-flex; align-items: center; gap: 8px; font-weight: 900; font-size: 1.3rem; color: var(--sg-ink); text-decoration: none; font-family: 'Inter', sans-serif; letter-spacing: 0.12em; }
.auth-logo-text .logo-shoe { color: #0A0A0A; }
.auth-logo-text .logo-group { color: #0A0A0A; }
.fp-ic { width: 66px; height: 66px; margin: 26px auto 0; border-radius: 50%; background: var(--sg-soft); color: var(--sg-blue); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; }
.fp-ic-warn { background: #fef3c7; color: #d97706; }
.auth-title { font-weight: 900; font-size: 1.7rem; margin-top: 18px; }
.auth-sub { color: var(--sg-muted); margin-bottom: 18px; }
.co-label { font-weight: 700; font-size: .82rem; color: var(--sg-ink-2); margin: 12px 0 6px; display: block; text-align: left; }
.in-wrap { display: flex; align-items: center; gap: 10px; border: 1.5px solid var(--sg-line); border-radius: 12px; padding: 4px 14px; transition: .2s; }
.in-wrap:focus-within { border-color: var(--sg-blue); box-shadow: 0 0 0 4px rgba(37,99,235,.12); }
.in-wrap i { color: var(--sg-muted); }
.auth-input { border: 0; outline: none; padding: 12px 0; width: 100%; font-weight: 500; background: transparent; }
.eye { border: 0; background: transparent; color: var(--sg-muted); }
.suc-check { width: 72px; height: 72px; margin: 20px auto 0; border-radius: 50%; background: linear-gradient(135deg,#22c55e,#16a34a); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; }
.fp-back { display: inline-block; margin-top: 22px; font-weight: 700; color: var(--sg-blue); text-decoration: none; font-size: .9rem; }
.fp-back:hover { text-decoration: underline; }
</style>

