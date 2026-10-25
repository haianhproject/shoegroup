// Mục đích: Điểm khởi động frontend Vue, cài router, interceptor và mount ứng dụng.
/* [TOI UU] Tu dong gan JWT vao moi request API + doc dia chi may chu tu .env */
import { installHttpInterceptor } from './services/httpInterceptor'
import { API_BASE_URL } from './services/apiClient'
import { initializeCatalogIdentity } from './services/catalogIdentity'

import { createApp } from 'vue'

import './assets/main.css'
import './assets/icons.css'

// Vite phat su kien nay khi tai truoc module that bai (hay gap khi dev / sau khi build lai)
// -> tu tai lai trang de tranh man hinh trang "mat trang".
window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

async function bootstrap() {
  await initializeCatalogIdentity(API_BASE_URL)
  const [{default:App},{default:router},{logout}]=await Promise.all([import('./App.vue'),import('./router'),import('./stores/authStore')])
  installHttpInterceptor({onUnauthorized:()=>{
    logout()
    if(!window.location.pathname.startsWith('/login')) window.location.href='/login'
  }})
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

  // Nap store sau khi doi ID trinh duyet, roi cho dieu huong ban dau hoan tat.
  await router.isReady()
  app.mount('#root')
}
bootstrap().catch(error=>{
  console.error('Không thể khởi động ứng dụng:',error.message)
  const panel=document.createElement('div');panel.className='startup-message'
  const message=document.createElement('p');message.textContent='Không thể tải dữ liệu mới nhất. Vui lòng thử lại.'
  const retry=document.createElement('button');retry.textContent='Thử lại';retry.onclick=()=>window.location.reload()
  panel.append(message,retry);document.querySelector('#root')?.replaceChildren(panel)
})

