<!-- Mục đích: Chân trang nhiều cột theo hệ thương hiệu ShoeGroup. -->
<script setup>
import { useRouter } from 'vue-router'
import { ArrowUp, MapPin, Phone } from 'lucide-vue-next'
import BrandLogo from '../../BrandLogo.vue'

const router = useRouter()
const scrollToTop = () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
const columns = [
  {
    title: 'Sản phẩm',
    links: [
      { label: 'Giày chạy bộ', query: { filter: 'running' } },
      { label: 'Giày bóng rổ', query: { filter: 'basketball' } },
      { label: 'Giày training', query: { filter: 'training' } },
      { label: 'Giày lifestyle', query: { filter: 'lifestyle' } },
      { label: 'Hàng mới về', query: { filter: 'new' } },
      { label: 'Ưu đãi đặc biệt', query: { filter: 'sale' } },
    ],
  },
  {
    title: 'Hỗ trợ khách hàng',
    links: [
      { label: 'Hướng dẫn chọn size', path: '/contact' },
      { label: 'Theo dõi đơn hàng', path: '/orders' },
      { label: 'Chính sách đổi trả 14 ngày', path: '/about' },
      { label: 'Chính sách bảo hành chính hãng', path: '/about' },
      { label: 'Câu hỏi thường gặp', path: '/contact' },
    ],
  },
  {
    title: 'Về ShoeGroup',
    links: [
      { label: 'Câu chuyện thương hiệu', path: '/about' },
      { label: 'Hệ thống cửa hàng', path: '/contact' },
      { label: 'Liên hệ & Góp ý', path: '/contact' },
      { label: 'Tài khoản thành viên', path: '/account' },
    ],
  },
]

const go = (link) => {
  if (link.path) router.push(link.path)
  else router.push({ path: '/products', query: link.query })
}
</script>

<template>
  <footer class="store-footer">
    <div class="store-container">
      <div class="store-footer-top">
        <button
          type="button"
          class="store-wordmark store-footer-brand"
          @click="router.push('/')"
        >
          <BrandLogo :size="39" inverse tagline />
        </button>
        <p>ĐÔI GIÀY CỦA BẠN.<br /><span>CÂU CHUYỆN CỦA BẠN.</span></p>
        <button
          type="button"
          class="footer-back-top"
          @click="scrollToTop"
          aria-label="Về đầu trang"
        >
          <ArrowUp :size="20" aria-hidden="true" />
        </button>
      </div>
      <div class="store-footer-grid">
        <div class="store-footer-about">
          <p>
            Nền tảng thương mại sneaker thể thao nam cao cấp. Cam kết 100% sản
            phẩm chính hãng và dịch vụ giao hàng toàn quốc.
          </p>
          <div class="store-footer-contact">
            <MapPin :size="16" aria-hidden="true" /><span
              >Tháp ShoeGroup Landmark, Quận 1, TP. Hồ Chí Minh</span
            >
          </div>
          <a href="tel:0375990871" class="store-footer-contact"
            ><Phone :size="15" aria-hidden="true" /><span>0375.990.871</span></a
          ><span class="footer-availability"
            ><span></span> HỖ TRỢ BẠN MỖI NGÀY</span
          >
        </div>
        <div
          v-for="column in columns"
          :key="column.title"
          class="store-footer-column"
        >
          <h3>{{ column.title }}</h3>
          <ul>
            <li v-for="link in column.links" :key="link.label">
              <button type="button" @click="go(link)">{{ link.label }}</button>
            </li>
          </ul>
        </div>
      </div>
      <div class="store-footer-bottom">
        <p>© 2026 ShoeGroup. All rights reserved.</p>
        <div class="footer-payments">
          <span>THANH TOÁN</span><span>VietQR</span><span>COD</span>
        </div>
        <div class="footer-socials">
          <a href="https://zalo.me/0375990871" target="_blank" rel="noopener noreferrer">Zalo</a>
          <router-link to="/contact">Liên hệ</router-link>
        </div>
      </div>
      <div class="store-footer-large-type" aria-hidden="true">
        SHOEGROUP<span>®</span>
      </div>
    </div>
  </footer>
</template>
