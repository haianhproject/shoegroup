<!-- Mục đích: Điểm vào tương thích cho các nơi cũ cần dùng thanh điều hướng khách hàng. -->
<script setup>
// Compatibility entry point for legacy imports. Customer routes are mounted
// through FigmaCustomerLayout, so an accidental legacy import still renders
// the single Figma navbar instead of the former customer header.
import FigmaNavbar from './figma/layout/FigmaNavbar.vue'
</script>

<template>
  <FigmaNavbar />
</template>
