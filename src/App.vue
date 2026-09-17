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
  <div class="flex min-h-screen flex-col">

    <!-- NAVBAR CLIENT -->
    <TheNavbar v-if="!isAdmin" />

    <!-- CONTENT -->
    <main class="flex-1" :class="{ 'pt-[69px]': !isAdmin }">
      <router-view />
    </main>

    <!-- FOOTER CLIENT -->
    <TheFooter v-if="!isAdmin" />

    <!-- CUSTOMER SIDE ONLY -->
    <template v-if="!isAdmin">
      <CartDrawer />
      <PromoModal />

      <!-- BONG BÓNG CHAT ZALO -->
      <ZaloChat />
    </template>

    <!-- GLOBAL NOTIFICATION -->
    <CenterNotify />

  </div>
</template>
