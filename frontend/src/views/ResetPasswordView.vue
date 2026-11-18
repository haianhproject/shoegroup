<!-- Mục đích: Trang đặt mật khẩu mới bằng token nhận từ email. -->
<script setup>
import AuthVisual from '../components/AuthVisual.vue'
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
    <div class="auth-shell">
      <AuthVisual />
      <div class="fp-card sg-card auth-form">
        <router-link to="/" class="auth-logo">
          <BrandLogo :size="38" />
        </router-link>

        <!-- Liên kết không có token -->
        <div v-if="!token">
          <div class="fp-ic fp-ic-warn">
            <svg
              class="auth-icon auth-icon-lg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M10.3 3.7 2.4 17.4A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.6L13.7 3.7a2 2 0 0 0-3.4 0Z"
              />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <h2 class="auth-title">Liên kết không hợp lệ</h2>
          <p class="auth-sub">
            Liên kết đặt lại mật khẩu đã hết hạn hoặc không đúng. Vui lòng yêu
            cầu liên kết mới để tiếp tục.
          </p>
          <router-link
            to="/forgot-password"
            class="btn-sg w-full mt-3"
            style="text-decoration: none"
          >
            <svg
              class="auth-icon button-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M20 7v5h-5" />
              <path d="M19 12a7 7 0 1 0-2.05 4.95" />
            </svg>
            Yêu cầu liên kết mới
          </router-link>
        </div>

        <!-- Form đặt mật khẩu mới -->
        <div v-else-if="!done">
          <div class="fp-ic">
            <svg
              class="auth-icon auth-icon-lg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M12 3 5 6v5c0 4.6 2.8 8.2 7 10 4.2-1.8 7-5.4 7-10V6l-7-3Z"
              />
              <rect x="9" y="10.5" width="6" height="5" rx="1" />
              <path d="M10.5 10.5V9a1.5 1.5 0 0 1 3 0v1.5" />
            </svg>
          </div>
          <h2 class="auth-title">Đặt lại mật khẩu</h2>
          <p class="auth-sub">
            Tạo mật khẩu bảo mật mới cho tài khoản ShoeGroup của bạn.
          </p>

          <label class="co-label">Mật khẩu mới</label>
          <div class="in-wrap">
            <svg
              class="auth-icon field-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <input
              v-model="pwd"
              :type="showPwd ? 'text' : 'password'"
              class="auth-input"
              placeholder="Ít nhất 6 ký tự"
              autocomplete="new-password"
              @keyup.enter="submit"
            />
            <button
              type="button"
              class="eye"
              :aria-label="showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
              :aria-pressed="showPwd"
              :title="showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
              @click="showPwd = !showPwd"
            >
              <svg
                v-if="!showPwd"
                class="auth-icon eye-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z"
                />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg
                v-else
                class="auth-icon eye-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m3 3 18 18" />
                <path
                  d="M6.71 6.71C4.86 8.1 3.48 9.96 2.75 12c1.42 4 4.92 7 9.25 7 1.38 0 2.68-.31 3.84-.86"
                />
                <path
                  d="M10.73 5.08C11.14 5.03 11.57 5 12 5c4.33 0 7.83 3 9.25 7a10.5 10.5 0 0 1-1.67 2.92"
                />
                <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
              </svg>
            </button>
          </div>

          <label class="co-label">Xác nhận mật khẩu</label>
          <div class="in-wrap">
            <svg
              class="auth-icon field-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="m8 12 2.6 2.6L16.5 9" />
            </svg>
            <input
              v-model="confirm"
              :type="showPwd ? 'text' : 'password'"
              class="auth-input"
              placeholder="Nhập lại mật khẩu mới"
              autocomplete="new-password"
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
              class="auth-icon button-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>
            <span>{{ loading ? 'Đang xử lý…' : 'Đổi mật khẩu' }}</span>
          </button>
        </div>

        <!-- Thành công -->
        <div v-else class="fp-sent">
          <div class="suc-check">
            <svg
              class="auth-icon auth-icon-lg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>
          </div>
          <h2 class="auth-title">Đổi mật khẩu thành công</h2>
          <p class="auth-sub">
            Mật khẩu của bạn đã được cập nhật an toàn. Đang chuyển hướng về
            trang đăng nhập…
          </p>
        </div>

        <router-link to="/login" class="fp-back">
          <svg
            class="auth-icon back-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
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
.fp-ic-warn {
  background: #FEF3C7;
  color: #D97706;
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
  margin-top: 12px;
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
.auth-icon {
  display: block;
  flex: 0 0 auto;
}
.auth-icon-lg {
  width: 30px;
  height: 30px;
}
.field-icon {
  width: 18px;
  height: 18px;
  color: #94A3B8;
}
.in-wrap:focus-within .field-icon {
  color: #0F172A;
}
.button-icon {
  width: 18px;
  height: 18px;
}
.back-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.15s ease;
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
.eye {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: #94A3B8;
  padding: 4px;
  cursor: pointer;
  border-radius: 6px;
  transition: color 0.15s ease;
}
.eye:hover {
  color: #0F172A;
}
.eye:focus-visible {
  outline: 2px solid #0F172A;
  outline-offset: 2px;
}
.eye-icon {
  width: 20px;
  height: 20px;
}
.btn-sg {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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
.fp-back:hover .back-icon {
  transform: translateX(-3px);
}
</style>
