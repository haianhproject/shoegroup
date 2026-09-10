<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FigmaNavbar from '../components/figma/layout/FigmaNavbar.vue'
import FigmaFooter from '../components/figma/layout/FigmaFooter.vue'

const route = useRoute()
const isCheckout = computed(() => route.path === '/checkout')
</script>

<template>
  <div class="figma-customer-shell min-h-screen bg-white text-[#0E0E0E]">
    <FigmaNavbar v-if="!isCheckout" />
    <main :class="isCheckout ? 'min-h-screen' : 'min-h-[calc(100vh-68px)] pt-[69px]'"><slot /></main>
    <FigmaFooter v-if="!isCheckout" />
  </div>
</template>
