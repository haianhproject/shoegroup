/* [TOI UU] Tu dong gan JWT vao moi request API + doc dia chi may chu tu .env */
import { installHttpInterceptor } from './services/httpInterceptor'
import { API_BASE_URL } from './services/apiClient'
import { logout } from './stores/authStore'

installHttpInterceptor({
  onUnauthorized: () => {
    // Xoa ca user, token va cookie. Neu chi xoa token rieng, apiClient se lay
    // lai JWT het han tu shoegroup_current_user va cac bang Admin se bi rong.
    logout()
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
  },
})

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './assets/main.css'

// Vite phat su kien nay khi tai truoc module that bai (hay gap khi dev / sau khi build lai)
// -> tu tai lai trang de tranh man hinh trang "mat trang".
window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

const app = createApp(App)

app.use(router)
app.config.errorHandler = (err, vm, info) => {
  console.error('[VUE ERROR]', err, info);
  fetch(`${API_BASE_URL}/log-error`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: err.message, stack: err.stack, info })
  });
};

// Cho router xu ly xong dieu huong/redirect ban dau (vi du guard dang nhap)
// truoc khi mount app, tranh tinh trang nhap nhay / trang trang khi vao lai.
router.isReady().then(() => {
  app.mount('#root')
})

