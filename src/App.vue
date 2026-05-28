<script setup>
import { useRoute } from 'vue-router'
import TheNavbar from './components/TheNavbar.vue'
import TheFooter from './components/TheFooter.vue'
import { computed } from 'vue'

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
  </div>
</template>
