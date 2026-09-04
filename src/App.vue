<script setup>
import { useRoute } from 'vue-router'
import { computed } from 'vue'

import TheNavbar from './components/TheNavbar.vue'
import TheFooter from './components/TheFooter.vue'
import CenterNotify from './components/CenterNotify.vue'
import PromoModal from './components/PromoModal.vue'
import ZaloChat from './components/ZaloChat.vue'

const route = useRoute()

const isAdmin = computed(() => route.path.startsWith('/admin'))
</script>

<template>
  <div class="d-flex flex-column min-vh-100">

    <!-- NAVBAR CLIENT -->
    <TheNavbar v-if="!isAdmin" />

    <!-- CONTENT -->
    <main class="flex-grow-1">
      <router-view />
    </main>

    <!-- FOOTER CLIENT -->
    <TheFooter v-if="!isAdmin" />

    <!-- CUSTOMER SIDE ONLY -->
    <template v-if="!isAdmin">
      <PromoModal />

      <!-- BONG BÓNG CHAT ZALO -->
      <ZaloChat />
    </template>

    <!-- GLOBAL NOTIFICATION -->
    <CenterNotify />

  </div>
</template>