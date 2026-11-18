<!-- Mục đích: Trang đăng nhập và điều hướng người dùng theo vai trò sau xác thực. -->
<script setup>
import AuthVisual from '../components/AuthVisual.vue'
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
      <AuthVisual />
      <div class="auth-form">
        <router-link to="/" class="auth-logo">
          <BrandLogo :size="38" />
        </router-link>
        <h2 class="auth-title">ĐĂNG NHẬP</h2>
        <p class="auth-sub">Chào mừng bạn quay lại cửa hàng giày thể thao nam hàng đầu.</p>

        <label class="co-label" for="login-email">EMAIL</label>
        <div class="in-wrap"><input id="login-email" v-model="form.email" type="email" class="auth-input" placeholder="you@example.com" autocomplete="username" @keyup.enter="submit"></div>

        <label class="co-label" for="login-password">MẬT KHẨU</label>
        <div class="in-wrap">
          <input id="login-password" v-model="form.password" :type="showPwd ? 'text' : 'password'" class="auth-input" placeholder="••••••••" autocomplete="current-password" @keyup.enter="submit">
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
  padding: 32px 20px;
  background: #F8FAFC;
}
.auth-shell {
  max-width: 460px;
  width: 100%;
}
.auth-form {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 24px;
  padding: 40px 36px;
  box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.08);
}
.auth-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 1rem;
  color: #0F172A;
  text-decoration: none;
  letter-spacing: 0.08em;
}
.auth-title {
  font-family: "Barlow Condensed", "Be Vietnam Pro", sans-serif;
  font-weight: 700;
  font-size: 1.75rem;
  margin-top: 28px;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
  color: #0F172A;
}
.auth-sub {
  color: #64748B;
  margin-bottom: 28px;
  font-size: 0.9rem;
  line-height: 1.5;
}
.co-label {
  font-weight: 700;
  font-size: 0.72rem;
  color: #0F172A;
  margin: 18px 0 6px;
  display: block;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.in-wrap {
  display: flex;
  align-items: center;
  border: 1.5px solid #E2E8F0;
  border-radius: 12px;
  padding: 0 16px;
  transition: all 0.2s;
  background: #FFFFFF;
}
.in-wrap:focus-within {
  border-color: #0F172A;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}
.auth-input {
  border: 0;
  outline: none;
  padding: 13px 0;
  width: 100%;
  font-size: 0.92rem;
  font-weight: 500;
  background: transparent;
  color: #0F172A;
}
.auth-input::placeholder { color: #94A3B8; }
.eye {
  border: 0;
  background: transparent;
  color: #94A3B8;
  cursor: pointer;
  padding: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}
.eye:hover { color: #0F172A; }
.eye:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; border-radius: 6px; }
.eye-icon { display: block; width: 20px; height: 20px; }
.auth-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 18px 0 24px;
}
.remember {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: #64748B;
  cursor: pointer;
  font-weight: 500;
}
.remember input {
  width: 16px;
  height: 16px;
  accent-color: #0F172A;
  border-radius: 4px;
}
.forgot-link {
  font-size: 0.82rem;
  font-weight: 600;
  color: #0F172A;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.forgot-link:hover { color: #D4001A; }
.auth-btn {
  width: 100%;
  padding: 14px 24px;
  background: #0F172A;
  color: #FFFFFF;
  border: none;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.auth-btn:hover {
  background: #1E293B;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.22);
}
.auth-btn:disabled {
  background: #CBD5E1;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.auth-foot {
  text-align: center;
  margin-top: 24px;
  color: #64748B;
  font-size: 0.88rem;
}
.auth-foot a {
  font-weight: 700;
  color: #0F172A;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.auth-foot a:hover { color: #D4001A; }

@media (max-width: 520px) {
  .auth-page { padding: 20px 16px; }
  .auth-form { padding: 32px 24px; }
}
</style>

