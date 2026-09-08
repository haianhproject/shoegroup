<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showDrawer } from '../stores/cartStore'

const router = useRouter()
onMounted(() => {
  showDrawer()
  // Giữ homepage làm nền cho slide-over theo route contract của customer shell.
  setTimeout(() => {
    if (router.currentRoute.value.path === '/cart') router.replace('/')
  }, 50)
})
</script>

<template>
  <div class="cart-redirect-page" aria-hidden="true"></div>
</template>

<style scoped>
.cart-redirect-page { min-height: 1px; background: #fff; }
</style>
