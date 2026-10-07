<!-- Mục đích: Lớp tương thích để hiển thị một thẻ sản phẩm theo hệ giao diện Figma. -->
<script setup>
import ShoeCard from '../../ShoeCard.vue'

defineProps({ product: { type: Object, required: true } })
</script>

<template>
  <ShoeCard :product="product" />
</template>
