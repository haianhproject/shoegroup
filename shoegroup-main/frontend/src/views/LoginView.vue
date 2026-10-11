<!-- Mục đích: Trang đăng nhập và điều hướng người dùng theo vai trò sau xác thực. -->
<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { login, canUseStaffWorkspace } from '../stores/authStore'
import { notify } from '../stores/uiStore'
import BrandLogo from '../components/BrandLogo.vue'

const router = useRouter()
const form = reactive({ email: '', password: '' })
const showPwd = ref(false)
const loading = ref(false)

const submit = async () => {
  if (loading.value) return
  if (!form.email || !form.password) { notify({ type: 'error', message: 'Vui lòng nhập email và mật khẩu.' }); return }
  loading.value = true
  const r = await login({ email: form.email, password: form.password })
  loading.value = false
  if (!r.ok) { notify({ type: 'error', title: 'Đăng nhập thất bại', message: r.message }); return }
  if (canUseStaffWorkspace.value) {
    router.push('/admin')
  } else {
    notify({ type: 'success', title: 'Chào mừng trở lại!', message: r.user?.full_name || '' })
    router.push('/')
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-shell">
      <div class="auth-form">
        <router-link to="/" class="auth-logo">
          <BrandLogo :size="32" :radius="6" />
          <span class="auth-logo-text"><span class="logo-shoe">SHOE</span><span class="logo-group">GROUP</span></span>
        </router-link>
        <h2 class="auth-title">ĐĂNG NHẬP</h2>
        <p class="auth-sub">Chào mừng bạn quay lại cửa hàng giày thể thao nam hàng đầu.</p>

        <label class="co-label">EMAIL</label>
        <div class="in-wrap"><input v-model="form.email" type="email" class="auth-input" placeholder="you@example.com" @keyup.enter="submit"></div>

        <label class="co-label">MẬT KHẨU</label>
        <div class="in-wrap">
          <input v-model="form.password" :type="showPwd ? 'text' : 'password'" class="auth-input" placeholder="••••••••" @keyup.enter="submit">
          <button
            type="button"
            class="eye"
            :aria-label="showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
            :aria-pressed="showPwd"
            :title="showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
            @click="showPwd = !showPwd"
          >
            <svg v-if="!showPwd" class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <path d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg v-else class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <path d="m3 3 18 18" />
              <path d="M6.71 6.71C4.86 8.1 3.48 9.96 2.75 12c1.42 4 4.92 7 9.25 7 1.38 0 2.68-.31 3.84-.86" />
              <path d="M10.73 5.08C11.14 5.03 11.57 5 12 5c4.33 0 7.83 3 9.25 7a10.5 10.5 0 0 1-1.67 2.92" />
              <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
            </svg>
          </button>
        </div>

        <div class="auth-row">
          <label class="remember"><input type="checkbox" checked> <span>Ghi nhớ trên trình duyệt này</span></label>
          <router-link to="/forgot-password" class="forgot-link">Quên mật khẩu?</router-link>
        </div>

        <button class="auth-btn" :disabled="loading" @click="submit">{{ loading ? 'Đang đăng nhập…' : 'ĐĂNG NHẬP' }}</button>
        <p class="auth-foot">Chưa có tài khoản? <router-link to="/register">Đăng ký ngay</router-link></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #ffffff;
}
.auth-shell {
  max-width: 460px;
  width: 100%;
}
.auth-form {
  padding: 48px 0;
}
.auth-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 1rem;
  color: #111;
  text-decoration: none;
  letter-spacing: 0.08em;
}
.auth-logo-text { font-family: "Inter", sans-serif; font-size: 1.25rem; }
.auth-logo-text .logo-shoe { color: #0A0A0A; }
.auth-logo-text .logo-group { color: #0A0A0A; }
.auth-title {
  font-weight: 700;
  font-size: 1.75rem;
  margin-top: 40px;
  margin-bottom: 8px;
  letter-spacing: 0.06em;
  color: #111;
}
.auth-sub {
  color: #767676;
  margin-bottom: 32px;
  font-size: 0.95rem;
  line-height: 1.5;
}
.co-label {
  font-weight: 600;
  font-size: 0.75rem;
  color: #111;
  margin: 20px 0 8px;
  display: block;
  letter-spacing: 0.08em;
}
.in-wrap {
  display: flex;
  align-items: center;
  border: 1px solid #d5d5d5;
  border-radius: 4px;
  padding: 0 14px;
  transition: border-color 0.2s;
  background: #fff;
}
.in-wrap:focus-within {
  border-color: #111;
}
.auth-input {
  border: 0;
  outline: none;
  padding: 14px 0;
  width: 100%;
  font-size: 0.95rem;
  font-weight: 400;
  background: transparent;
  color: #111;
}
.auth-input::placeholder { color: #aaa; }
.eye {
  border: 0;
  background: transparent;
  color: #767676;
  cursor: pointer;
  padding: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.eye:hover { color: #111; }
.eye:focus-visible { outline: 2px solid #111; outline-offset: 2px; border-radius: 3px; }
.eye-icon { display: block; width: 20px; height: 20px; }
.auth-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0 28px;
}
.remember {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #444;
  cursor: pointer;
}
.remember input {
  width: 16px;
  height: 16px;
  accent-color: #111;
}
.forgot-link {
  font-size: 0.85rem;
  font-weight: 600;
  color: #111;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.forgot-link:hover { color: #666; }
.auth-btn {
  width: 100%;
  padding: 15px 24px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: background 0.2s;
}
.auth-btn:hover { background: #333; }
.auth-btn:disabled {
  background: #999;
  cursor: not-allowed;
}
.auth-foot {
  text-align: center;
  margin-top: 24px;
  color: #767676;
  font-size: 0.9rem;
}
.auth-foot a {
  font-weight: 600;
  color: #111;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.auth-foot a:hover { color: #666; }

@media (max-width: 520px) {
  .auth-page { padding: 24px 20px; }
  .auth-form { padding: 32px 0; }
}
</style>

