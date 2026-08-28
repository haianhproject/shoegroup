<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showDrawer } from '../stores/cartStore'

const router = useRouter()
onMounted(() => {
  showDrawer()
  // nếu vào thẳng /cart, chuyển về trang chủ để giữ nền không trắng, drawer vẫn mở
  setTimeout(() => {
    if (router.currentRoute.value.path === '/cart') router.replace('/')
  }, 50)
})
const goBack = () => {
  showDrawer()
  router.push('/')
}
</script>

<template>
  <div class="cart-redirect-page">
    <div class="text-center py-5">
      <p class="text-muted mb-3">Giỏ hàng đang hiển thị ở bên phải.</p>
      <button class="btn-sg-dark" @click="goBack">TIẾP TỤC MUA SẮM</button>
    </div>
  </div>
</template>

<style scoped>
.cart-redirect-page { min-height: 40vh; display: flex; align-items: center; justify-content: center; background: transparent; }
.btn-sg-dark { background: #0A0A0A; color: #fff; border: 1px solid #0A0A0A; padding: 10px 18px; border-radius: 6px; font-weight: 700; font-size: .82rem; cursor: pointer; }
</style>
