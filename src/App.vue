<script setup>
import { useRoute } from 'vue-router'
import TheNavbar from './components/TheNavbar.vue'
import TheFooter from './components/TheFooter.vue'
import { computed, onMounted } from 'vue'
import { verifySessionWithServer } from './stores/authStore'

const route = useRoute()
const isAdmin = computed(() => route.path.startsWith('/admin'))

onMounted(() => {
  // Xac thuc lai phien dang nhap voi server qua cookie httpOnly ngay khi mo app.
  // Dam bao chi trinh duyet da dang nhap that (co cookie server cap) moi duoc
  // coi la "con dang nhap" - trinh duyet khac se tu dong bi dang xuat.
  verifySessionWithServer()
})
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
