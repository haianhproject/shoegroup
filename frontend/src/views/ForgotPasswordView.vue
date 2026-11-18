<!-- Mục đích: Form yêu cầu gửi email đặt lại mật khẩu. -->
<script setup>
import AuthVisual from '../components/AuthVisual.vue'
import { ref } from 'vue'
import { requestPasswordReset } from '../stores/authStore'
import { notify } from '../stores/uiStore'
import BrandLogo from '../components/BrandLogo.vue'

const email = ref('')
const loading = ref(false)
const sent = ref(false)

const submit = async () => {
  if (!email.value || !/.+@.+\..+/.test(email.value)) {
    notify({ type: 'error', message: 'Vui lòng nhập email hợp lệ.' })
    return
  }
  loading.value = true
  try {
    await requestPasswordReset(email.value)
  } catch {
    /* vẫn hiển thị thành công để tránh lộ email tồn tại */
  }
  loading.value = false
  sent.value = true
  notify({ type: 'success', title: 'Đã gửi yêu cầu', message: 'Kiểm tra email để đặt lại mật khẩu.' })
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-shell">
      <AuthVisual />
      <div class="fp-card sg-card auth-form">
        <router-link to="/" class="auth-logo">
          <BrandLogo :size="38" />
        </router-link>

        <div v-if="!sent">
          <div class="fp-ic">
            <svg
              class="auth-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m21 2-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1.5-1.5L8 9" />
              <circle cx="7.5" cy="15.5" r="5.5" />
              <path d="m15.5 7.5 3 3" />
            </svg>
          </div>
          <h2 class="auth-title">Quên mật khẩu?</h2>
          <p class="auth-sub">
            Nhập email đăng ký tài khoản, chúng tôi sẽ gửi liên kết khôi phục an
            toàn đến hộp thư của bạn.
          </p>

          <label class="co-label">Email tài khoản</label>
          <div class="in-wrap">
            <svg
              class="field-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <input
              v-model="email"
              type="email"
              class="auth-input"
              placeholder="name@example.com"
              autocomplete="email"
              @keyup.enter="submit"
            />
          </div>

          <button
            class="btn-sg w-full mt-5"
            :disabled="loading"
            @click="submit"
          >
            <svg
              v-if="loading"
              class="animate-spin w-4 h-4 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <svg
              v-else
              class="btn-icon mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
            <span>{{ loading ? 'Đang gửi…' : 'Gửi liên kết đặt lại' }}</span>
          </button>
        </div>

        <div v-else class="fp-sent">
          <div class="suc-check">
            <svg
              class="auth-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 class="auth-title">Kiểm tra email của bạn</h2>
          <p class="auth-sub">
            Nếu địa chỉ
            <strong class="text-slate-900 font-semibold">{{ email }}</strong>
            tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn đặt lại mật
            khẩu trong vài phút.
          </p>

          <div class="fp-hint">
            <svg
              class="hint-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span
              >Không thấy thư? Kiểm tra mục Thư rác (Spam) hoặc thử lại sau 5
              phút.</span
            >
          </div>
        </div>

        <router-link to="/login" class="fp-back">
          <svg
            class="back-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>Quay lại đăng nhập</span>
        </router-link>
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
  padding: 32px 16px;
  background: radial-gradient(circle at 50% 0%, #FFFFFF 0%, #F8FAFC 100%);
  font-family: 'Be Vietnam Pro', sans-serif;
}
.fp-card {
  max-width: 440px;
  width: 100%;
  padding: 40px 36px;
  text-align: center;
  border-radius: 24px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  box-shadow: 0 20px 45px -15px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.03);
}
.auth-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  margin-bottom: 8px;
}
.fp-ic {
  width: 64px;
  height: 64px;
  margin: 20px auto 0;
  border-radius: 20px;
  background: #FEE2E2;
  color: #D4001A;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fp-ic .auth-icon {
  width: 30px;
  height: 30px;
}
.auth-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.65rem;
  color: #0F172A;
  margin-top: 16px;
  letter-spacing: -0.02em;
}
.auth-sub {
  color: #64748B;
  font-size: 0.9rem;
  line-height: 1.55;
  margin: 8px 0 20px;
}
.co-label {
  font-weight: 600;
  font-size: 0.8rem;
  color: #334155;
  margin-bottom: 8px;
  display: block;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.in-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1.5px solid #E2E8F0;
  border-radius: 14px;
  padding: 4px 14px;
  background: #F8FAFC;
  transition: all 0.2s ease;
}
.in-wrap:focus-within {
  border-color: #0F172A;
  background: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}
.field-icon {
  width: 18px;
  height: 18px;
  color: #94A3B8;
  flex-shrink: 0;
}
.in-wrap:focus-within .field-icon {
  color: #0F172A;
}
.auth-input {
  border: 0;
  outline: none;
  padding: 10px 0;
  width: 100%;
  font-size: 0.92rem;
  font-weight: 500;
  color: #0F172A;
  background: transparent;
}
.auth-input::placeholder {
  color: #94A3B8;
}
.btn-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.suc-check {
  width: 64px;
  height: 64px;
  margin: 16px auto 0;
  border-radius: 20px;
  background: #DCFCE7;
  color: #16A34A;
  display: flex;
  align-items: center;
  justify-content: center;
}
.suc-check .auth-icon {
  width: 32px;
  height: 32px;
}
.fp-hint {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 0.82rem;
  color: #64748B;
  text-align: left;
  line-height: 1.5;
  margin-top: 14px;
}
.hint-icon {
  width: 16px;
  height: 16px;
  color: #0284C7;
  flex-shrink: 0;
  margin-top: 2px;
}
.fp-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 24px;
  font-weight: 600;
  color: #64748B;
  text-decoration: none;
  font-size: 0.88rem;
  transition: color 0.15s ease;
}
.fp-back:hover {
  color: #0F172A;
}
.back-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.15s ease;
}
.fp-back:hover .back-icon {
  transform: translateX(-3px);
}
</style>
