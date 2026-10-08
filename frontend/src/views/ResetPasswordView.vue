<!-- Mục đích: Trang đặt mật khẩu mới bằng token nhận từ email. -->
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
        <div class="fp-ic fp-ic-warn">
          <svg class="auth-icon auth-icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M10.3 3.7 2.4 17.4A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.6L13.7 3.7a2 2 0 0 0-3.4 0Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>
        <h2 class="auth-title">Liên kết không hợp lệ</h2>
        <p class="auth-sub">Liên kết đặt lại mật khẩu đã hết hạn hoặc không đúng. Vui lòng yêu cầu gửi lại.</p>
        <router-link to="/forgot-password" class="btn-sg w-full mt-2" style="text-decoration:none;">
          <svg class="auth-icon button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 7v5h-5" />
            <path d="M19 12a7 7 0 1 0-2.05 4.95" />
          </svg>
          Yêu cầu liên kết mới
        </router-link>
      </div>

      <!-- Form đặt mật khẩu mới -->
      <div v-else-if="!done">
        <div class="fp-ic">
          <svg class="auth-icon auth-icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 3 5 6v5c0 4.6 2.8 8.2 7 10 4.2-1.8 7-5.4 7-10V6l-7-3Z" />
            <rect x="9" y="10.5" width="6" height="5" rx="1" />
            <path d="M10.5 10.5V9a1.5 1.5 0 0 1 3 0v1.5" />
          </svg>
        </div>
        <h2 class="auth-title">Đặt lại mật khẩu</h2>
        <p class="auth-sub">Tạo mật khẩu mới cho tài khoản ShoeGroup của bạn.</p>

        <label class="co-label">Mật khẩu mới</label>
        <div class="in-wrap">
          <svg class="auth-icon field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="5" y="10" width="14" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          <input v-model="pwd" :type="showPwd ? 'text' : 'password'" class="auth-input" placeholder="Ít nhất 6 ký tự" @keyup.enter="submit">
          <button
            type="button"
            class="eye"
            :aria-label="showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
            :aria-pressed="showPwd"
            :title="showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
            @click="showPwd = !showPwd"
          >
            <svg v-if="!showPwd" class="auth-icon eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg v-else class="auth-icon eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m3 3 18 18" />
              <path d="M6.71 6.71C4.86 8.1 3.48 9.96 2.75 12c1.42 4 4.92 7 9.25 7 1.38 0 2.68-.31 3.84-.86" />
              <path d="M10.73 5.08C11.14 5.03 11.57 5 12 5c4.33 0 7.83 3 9.25 7a10.5 10.5 0 0 1-1.67 2.92" />
              <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
            </svg>
          </button>
        </div>

        <label class="co-label">Xác nhận mật khẩu</label>
        <div class="in-wrap">
          <svg class="auth-icon field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 2.6 2.6L16.5 9" />
          </svg>
          <input v-model="confirm" :type="showPwd ? 'text' : 'password'" class="auth-input" placeholder="Nhập lại mật khẩu mới" @keyup.enter="submit">
        </div>

        <button class="btn-sg w-full mt-4" :disabled="loading" @click="submit">
          <svg class="auth-icon button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m5 12 4 4L19 6" />
          </svg>
          {{ loading ? 'Đang xử lý…' : 'Đổi mật khẩu' }}
        </button>
      </div>

      <!-- Thành công -->
      <div v-else class="fp-sent">
        <div class="suc-check">
          <svg class="auth-icon auth-icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m5 12 4 4L19 6" />
          </svg>
        </div>
        <h2 class="auth-title">Đổi mật khẩu thành công</h2>
        <p class="auth-sub">Mật khẩu của bạn đã được cập nhật. Đang chuyển về trang đăng nhập…</p>
      </div>

      <router-link to="/login" class="fp-back">
        <svg class="auth-icon back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Quay lại đăng nhập
      </router-link>
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
.auth-icon { display: block; flex: 0 0 auto; }
.auth-icon-lg { width: 30px; height: 30px; }
.field-icon { width: 19px; height: 19px; color: var(--sg-muted); }
.button-icon { width: 18px; height: 18px; }
.back-icon { width: 16px; height: 16px; }
.auth-input { border: 0; outline: none; padding: 12px 0; width: 100%; font-weight: 500; background: transparent; }
.eye { display: inline-flex; align-items: center; justify-content: center; border: 0; background: transparent; color: var(--sg-muted); padding: 4px; cursor: pointer; }
.eye:hover { color: var(--sg-ink); }
.eye:focus-visible { outline: 2px solid var(--sg-ink); outline-offset: 2px; border-radius: 4px; }
.eye-icon { width: 20px; height: 20px; }
.btn-sg { display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.suc-check { width: 72px; height: 72px; margin: 20px auto 0; border-radius: 50%; background: linear-gradient(135deg,#22c55e,#16a34a); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; }
.fp-back { display: inline-flex; align-items: center; justify-content: center; gap: 4px; margin-top: 22px; font-weight: 700; color: var(--sg-blue); text-decoration: none; font-size: .9rem; }
.fp-back:hover { text-decoration: underline; }
</style>

