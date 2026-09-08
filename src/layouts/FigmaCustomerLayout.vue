<script setup>
import FigmaNavbar from '../components/figma/layout/FigmaNavbar.vue'
import FigmaFooter from '../components/figma/layout/FigmaFooter.vue'
</script>

<template>
  <div class="figma-customer-shell min-h-screen bg-white text-[#0E0E0E]">
    <FigmaNavbar />
    <main class="min-h-[calc(100vh-68px)] pt-[69px]"><slot /></main>
    <FigmaFooter />
  </div>
</template>
