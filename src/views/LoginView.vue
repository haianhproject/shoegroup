<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../stores/authStore'
import { notify } from '../stores/uiStore'
import BrandLogo from '../components/BrandLogo.vue'

const router = useRouter()
const form = reactive({ email: '', password: '' })
const showPwd = ref(false)
const loading = ref(false)

const submit = async () => {
  if (!form.email || !form.password) { notify({ type: 'error', message: 'Vui lòng nhập email và mật khẩu.' }); return }
  loading.value = true
  const r = await login({ email: form.email, password: form.password })
  loading.value = false
  if (!r.ok) { notify({ type: 'error', title: 'Đăng nhập thất bại', message: r.message }); return }
  notify({ type: 'success', title: 'Chào mừng trở lại!', message: r.user?.full_name || '' })
  router.push('/')
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-shell sg-card">
      <!-- LEFT: form -->
      <div class="auth-form">
        <router-link to="/" class="auth-logo">
          <BrandLogo :size="36" :radius="10" />
          <span class="auth-logo-text"><span class="logo-shoe">shoe</span><span class="logo-group">group</span></span>
        </router-link>
        <h2 class="auth-title">Đăng nhập</h2>
        <p class="auth-sub">Chào mừng bạn quay lại cửa hàng giày thể thao nam hàng đầu.</p>

        <label class="co-label">Email</label>
        <div class="in-wrap"><i class="bi bi-envelope"></i><input v-model="form.email" type="email" class="auth-input" placeholder="you@example.com" @keyup.enter="submit"></div>

        <label class="co-label">Mật khẩu</label>
        <div class="in-wrap"><i class="bi bi-lock"></i><input v-model="form.password" :type="showPwd ? 'text' : 'password'" class="auth-input" placeholder="••••••••" @keyup.enter="submit"><button class="eye" @click="showPwd = !showPwd"><i class="bi" :class="showPwd ? 'bi-eye-slash' : 'bi-eye'"></i></button></div>

        <div class="auth-row">
          <label class="remember"><input type="checkbox" checked> <span>Ghi nhớ trên trình duyệt này</span></label>
          <router-link to="/forgot-password" class="forgot-link">Quên mật khẩu?</router-link>
        </div>

        <button class="btn-sg w-100" :disabled="loading" @click="submit"><i class="bi bi-box-arrow-in-right me-2"></i>{{ loading ? 'Đang đăng nhập…' : 'Đăng nhập' }}</button>
        <p class="auth-foot">Chưa có tài khoản? <router-link to="/register">Đăng ký ngay</router-link></p>
      </div>

      <!-- RIGHT: model image -->
      <div class="auth-hero">
        <img src="https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=900&q=80" alt="Model">
        <div class="auth-hero-overlay"></div>
        <div class="auth-hero-text">
          <span class="sg-chip sg-chip-warm">Bộ sưu tập 2026</span>
          <h3>Bước chạy bứt phá</h3>
          <p>Khám phá những đôi giày thể thao nam đỉnh cao — phong cách, hiệu suất và sự thoải mái trong từng sải bước.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--sg-grad-hero); }
.auth-shell { display: grid; grid-template-columns: 1fr 1fr; max-width: 980px; width: 100%; overflow: hidden; padding: 0; border-radius: 28px; }
.auth-form { padding: 48px 44px; }
.auth-logo { display: inline-flex; align-items: center; gap: 8px; font-weight: 900; font-size: 1.3rem; color: var(--sg-ink); text-decoration: none; }
.auth-logo-text .logo-shoe { color: #1a3a6b; }
.auth-logo-text .logo-group { color: #3b6fb5; }
.auth-title { font-weight: 900; font-size: 2rem; margin-top: 26px; }
.auth-sub { color: var(--sg-muted); margin-bottom: 26px; }
.co-label { font-weight: 700; font-size: .82rem; color: var(--sg-ink-2); margin: 14px 0 6px; display: block; }
.in-wrap { display: flex; align-items: center; gap: 10px; border: 1.5px solid var(--sg-line); border-radius: 12px; padding: 4px 14px; transition: .2s; }
.in-wrap:focus-within { border-color: #1a3a6b; box-shadow: 0 0 0 4px rgba(26,58,107,.12); }
.in-wrap i { color: var(--sg-muted); }
.auth-input { border: 0; outline: none; padding: 12px 0; width: 100%; font-weight: 500; background: transparent; }
.eye { border: 0; background: transparent; color: var(--sg-muted); }
.auth-row { display: flex; justify-content: space-between; align-items: center; margin: 16px 0 20px; }
.remember { display: flex; align-items: center; gap: 7px; font-size: .84rem; color: var(--sg-ink-2); }
.remember input { width: 16px; height: 16px; accent-color: #1a3a6b; }
.forgot-link { font-size: .84rem; font-weight: 700; color: #1a3a6b; text-decoration: none; }
.forgot-link:hover { text-decoration: underline; }
.auth-foot { text-align: center; margin-top: 20px; color: var(--sg-muted); font-size: .9rem; }
.auth-foot a { font-weight: 800; color: #1a3a6b; text-decoration: none; }
.auth-hero { position: relative; }
.auth-hero img { width: 100%; height: 100%; object-fit: cover; }
.auth-hero-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,28,62,.2), rgba(26,58,107,.6)); }
.auth-hero-text { position: absolute; left: 32px; right: 32px; bottom: 36px; color: #fff; }
.auth-hero-text h3 { font-weight: 900; font-size: 1.8rem; margin: 12px 0 8px; }
.auth-hero-text p { opacity: .92; font-size: .92rem; }
@media (max-width: 820px) { .auth-shell { grid-template-columns: 1fr; } .auth-hero { display: none; } }
</style>
