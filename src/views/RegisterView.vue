<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '../stores/authStore'
import { notify } from '../stores/uiStore'

const router = useRouter()
const form = reactive({ fullName: '', email: '', password: '', confirm: '' })
const showPwd = ref(false)
const loading = ref(false)

const submit = async () => {
  if (!form.fullName || !form.email || !form.password) { notify({ type: 'error', message: 'Vui lòng điền đầy đủ thông tin.' }); return }
  if (form.password.length < 6) { notify({ type: 'error', message: 'Mật khẩu tối thiểu 6 ký tự.' }); return }
  if (form.password !== form.confirm) { notify({ type: 'error', message: 'Mật khẩu xác nhận không khớp.' }); return }
  loading.value = true
  const r = await register({ fullName: form.fullName, email: form.email, password: form.password })
  loading.value = false
  if (!r.ok) { notify({ type: 'error', title: 'Đăng ký thất bại', message: r.message }); return }
  notify({ type: 'success', title: 'Tạo tài khoản thành công!', message: 'Chào mừng đến với ShoeGroup.' })
  router.push('/')
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-shell sg-card">
      <div class="auth-form">
        <router-link to="/" class="auth-logo"><span class="logo-mark"><i class="bi bi-lightning-charge-fill"></i></span> ShoeGroup</router-link>
        <h2 class="auth-title">Tạo tài khoản</h2>
        <p class="auth-sub">Tham gia ShoeGroup để nhận ưu đãi và trải nghiệm mua sắm tốt nhất.</p>

        <label class="co-label">Họ và tên</label>
        <div class="in-wrap"><i class="bi bi-person"></i><input v-model="form.fullName" class="auth-input" placeholder="Nguyễn Văn A"></div>
        <label class="co-label">Email</label>
        <div class="in-wrap"><i class="bi bi-envelope"></i><input v-model="form.email" type="email" class="auth-input" placeholder="you@example.com"></div>
        <label class="co-label">Mật khẩu</label>
        <div class="in-wrap"><i class="bi bi-lock"></i><input v-model="form.password" :type="showPwd ? 'text' : 'password'" class="auth-input" placeholder="ít nhất 6 ký tự"><button class="eye" @click="showPwd = !showPwd"><i class="bi" :class="showPwd ? 'bi-eye-slash' : 'bi-eye'"></i></button></div>
        <label class="co-label">Xác nhận mật khẩu</label>
        <div class="in-wrap"><i class="bi bi-lock-fill"></i><input v-model="form.confirm" :type="showPwd ? 'text' : 'password'" class="auth-input" placeholder="Nhập lại mật khẩu" @keyup.enter="submit"></div>

        <button class="btn-sg w-100 mt-4" :disabled="loading" @click="submit"><i class="bi bi-person-plus me-2"></i>{{ loading ? 'Đang tạo…' : 'Đăng ký' }}</button>
        <p class="auth-foot">Đã có tài khoản? <router-link to="/login">Đăng nhập</router-link></p>
      </div>
      <div class="auth-hero">
        <img src="https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=80" alt="Sneaker">
        <div class="auth-hero-overlay"></div>
        <div class="auth-hero-text">
          <span class="sg-chip sg-chip-warm">Thành viên mới</span>
          <h3>Nhập hội ShoeGroup</h3>
          <p>Ưu đãi độc quyền, giao hàng nhanh và chính sách đổi trả linh hoạt dành cho thành viên.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--sg-grad-hero); }
.auth-shell { display: grid; grid-template-columns: 1fr 1fr; max-width: 980px; width: 100%; overflow: hidden; padding: 0; border-radius: 28px; }
.auth-form { padding: 44px; }
.auth-logo { display: inline-flex; align-items: center; gap: 8px; font-weight: 900; font-size: 1.3rem; color: var(--sg-ink); text-decoration: none; }
.logo-mark { width: 34px; height: 34px; border-radius: 10px; background: var(--sg-grad-primary); color: #fff; display: flex; align-items: center; justify-content: center; }
.auth-title { font-weight: 900; font-size: 1.9rem; margin-top: 22px; }
.auth-sub { color: var(--sg-muted); margin-bottom: 18px; }
.co-label { font-weight: 700; font-size: .82rem; color: var(--sg-ink-2); margin: 12px 0 6px; display: block; }
.in-wrap { display: flex; align-items: center; gap: 10px; border: 1.5px solid var(--sg-line); border-radius: 12px; padding: 2px 14px; transition: .2s; }
.in-wrap:focus-within { border-color: var(--sg-blue); box-shadow: 0 0 0 4px rgba(37,99,235,.12); }
.in-wrap i { color: var(--sg-muted); }
.auth-input { border: 0; outline: none; padding: 11px 0; width: 100%; font-weight: 500; background: transparent; }
.eye { border: 0; background: transparent; color: var(--sg-muted); }
.auth-foot { text-align: center; margin-top: 18px; color: var(--sg-muted); font-size: .9rem; }
.auth-foot a { font-weight: 800; color: var(--sg-blue); text-decoration: none; }
.auth-hero { position: relative; }
.auth-hero img { width: 100%; height: 100%; object-fit: cover; }
.auth-hero-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15,23,42,.15), rgba(255,90,31,.5)); }
.auth-hero-text { position: absolute; left: 32px; right: 32px; bottom: 36px; color: #fff; }
.auth-hero-text h3 { font-weight: 900; font-size: 1.8rem; margin: 12px 0 8px; }
.auth-hero-text p { opacity: .92; font-size: .92rem; }
@media (max-width: 820px) { .auth-shell { grid-template-columns: 1fr; } .auth-hero { display: none; } }
</style>
