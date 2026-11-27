<!-- Mục đích: Component gốc, chọn khung giao diện khách hàng hoặc quản trị theo route hiện tại. -->
<script setup>
import { useRoute } from 'vue-router'
import { computed } from 'vue'

import TheNavbar from './components/TheNavbar.vue'
import TheFooter from './components/TheFooter.vue'
import CenterNotify from './components/CenterNotify.vue'
import PromoModal from './components/PromoModal.vue'
import ZaloChat from './components/ZaloChat.vue'
import CartDrawer from './components/CartDrawer.vue'

const route = useRoute()

const isAdmin = computed(() => route.path.startsWith('/admin'))
</script>

<template>
  <div class="flex min-h-screen flex-col" :class="{ storefront: !isAdmin }">

    <!-- NAVBAR CLIENT -->
    <TheNavbar v-if="!isAdmin" />

    <!-- CONTENT -->
    <main id="main-content" class="flex-1" :class="{ 'store-main': !isAdmin }">
      <router-view />
    </main>

    <!-- FOOTER CLIENT -->
    <TheFooter v-if="!isAdmin" />

    <!-- CUSTOMER SIDE ONLY -->
    <template v-if="!isAdmin">
      <CartDrawer />
      <PromoModal />

      <!-- TRỢ LÝ CỬA HÀNG VÀ HỖ TRỢ ZALO -->
      <ZaloChat />
    </template>

    <!-- GLOBAL NOTIFICATION -->
    <CenterNotify />

  </div>
</template>
