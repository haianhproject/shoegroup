<script setup>
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import TheNavbar from './components/TheNavbar.vue'
import TheFooter from './components/TheFooter.vue'
import CenterNotify from './components/CenterNotify.vue'
import PromoModal from './components/PromoModal.vue'
import CartDrawer from './components/CartDrawer.vue'

const route = useRoute()
const isAdmin = computed(() => route.path.startsWith('/admin'))
</script>

<template>
  <div class="d-flex flex-column min-vh-100">
    <TheNavbar v-if="!isAdmin" />
    <main class="flex-grow-1">
      <router-view />
    </main>
    <TheFooter v-if="!isAdmin" />

    <!-- Global overlays (customer side only) -->
    <template v-if="!isAdmin">
      <PromoModal />
      <CartDrawer />
    </template>
    <CenterNotify />
  </div>
</template>
