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
  fetch('http://localhost:5000/api/log-error', {
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

