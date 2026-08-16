<script setup>
import { ref } from 'vue'
import { requestPasswordReset } from '../stores/authStore'
import { notify } from '../stores/uiStore'
import BrandLogo from '../components/BrandLogo.vue'

const email = ref('')
const loading = ref(false)
const sent = ref(false)

const submit = async () => {
  if (!email.value || !/.+@.+\..+/.test(email.value)) { notify({ type: 'error', message: 'Vui lòng nhập email hợp lệ.' }); return }
  loading.value = true
  try {
    await requestPasswordReset(email.value)
  } catch { /* vẫn hiển thị thành công để tránh lộ email tồn tại */ }
  loading.value = false
  sent.value = true
  notify({ type: 'success', title: 'Đã gửi yêu cầu', message: 'Kiểm tra email để đặt lại mật khẩu.' })
}
</script>

<template>
  <div class="auth-page">
    <div class="fp-card sg-card">
      <router-link to="/" class="auth-logo">
        <BrandLogo :size="32" :radius="6" />
        <span class="auth-logo-text"><span class="logo-shoe">SHOE</span><span class="logo-group">GROUP</span></span>
      </router-link>

      <div v-if="!sent">
        <div class="fp-ic"><i class="bi bi-key"></i></div>
        <h2 class="auth-title">Quên mật khẩu?</h2>
        <p class="auth-sub">Nhập email đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu đến hộp thư của bạn.</p>
        <label class="co-label">Email</label>
        <div class="in-wrap"><i class="bi bi-envelope"></i><input v-model="email" type="email" class="auth-input" placeholder="you@example.com" @keyup.enter="submit"></div>
        <button class="btn-sg w-100 mt-4" :disabled="loading" @click="submit"><i class="bi bi-send me-2"></i>{{ loading ? 'Đang gửi…' : 'Gửi liên kết đặt lại' }}</button>
      </div>

      <div v-else class="fp-sent">
        <div class="suc-check"><i class="bi bi-envelope-check"></i></div>
        <h2 class="auth-title">Kiểm tra email của bạn</h2>
        <p class="auth-sub">Nếu <strong>{{ email }}</strong> tồn tại trong hệ thống, bạn sẽ nhận được email kèm liên kết đặt lại mật khẩu trong vài phút.</p>
        <div class="fp-hint"><i class="bi bi-info-circle"></i> Không thấy email? Kiểm tra mục Spam hoặc thử lại sau vài phút.</div>
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
.auth-logo-text .logo-group { color: #D4001A; }
.fp-ic { width: 66px; height: 66px; margin: 26px auto 0; border-radius: 50%; background: var(--sg-soft); color: var(--sg-blue); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; }
.auth-title { font-weight: 900; font-size: 1.7rem; margin-top: 18px; }
.auth-sub { color: var(--sg-muted); margin-bottom: 18px; }
.co-label { font-weight: 700; font-size: .82rem; color: var(--sg-ink-2); margin: 12px 0 6px; display: block; text-align: left; }
.in-wrap { display: flex; align-items: center; gap: 10px; border: 1.5px solid var(--sg-line); border-radius: 12px; padding: 4px 14px; transition: .2s; }
.in-wrap:focus-within { border-color: var(--sg-blue); box-shadow: 0 0 0 4px rgba(37,99,235,.12); }
.in-wrap i { color: var(--sg-muted); }
.auth-input { border: 0; outline: none; padding: 12px 0; width: 100%; font-weight: 500; background: transparent; }
.suc-check { width: 72px; height: 72px; margin: 20px auto 0; border-radius: 50%; background: linear-gradient(135deg,#22c55e,#16a34a); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; }
.fp-hint { background: var(--sg-canvas); border-radius: 12px; padding: 12px 14px; font-size: .82rem; color: var(--sg-muted); margin-top: 10px; }
.fp-back { display: inline-block; margin-top: 22px; font-weight: 700; color: var(--sg-blue); text-decoration: none; font-size: .9rem; }
.fp-back:hover { text-decoration: underline; }
</style>

