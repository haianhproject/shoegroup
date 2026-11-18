<!-- Mục đích: Trang 404 cùng hệ giao diện với cửa hàng và liên kết trở về mua sắm. -->
<script setup>
import StoreIllustration from '../components/StoreIllustration.vue'
import { ArrowUpRight } from 'lucide-vue-next'
</script>

<template>
  <section class="not-found-page">
    <p class="not-found-code">404 / LẠC NHỊP MỘT CHÚT</p>
    <StoreIllustration kind="search" />
    <h1>Đổi hướng. Tiếp bước.</h1>
    <p>
      Trang bạn đang tìm hiện không có ở đây. Những đôi giày mới vẫn đang chờ
      bạn khám phá.
    </p>
    <router-link to="/products" class="store-cta"
      >Khám phá cửa hàng <ArrowUpRight :size="18" aria-hidden="true"
    /></router-link>
  </section>
</template>
