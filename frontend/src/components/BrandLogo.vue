<!-- Mục đích: Logo chữ ShoeGroup vẽ riêng bằng vector, dùng thống nhất ở mọi khu vực. -->
<script setup>
import wordmark from '../assets/brand/shoegroup-wordmark.svg?raw'

defineProps({
  size: { type: [Number, String], default: 32 },
  inverse: { type: Boolean, default: false },
  tagline: { type: Boolean, default: false },
})
</script>

<template>
  <span
    class="brand-logo"
    :class="{ 'brand-logo-inverse': inverse }"
    :style="{ '--brand-logo-height': Number(size) + 'px' }"
    role="img"
    aria-label="ShoeGroup"
  >
    <span class="brand-logo-art" aria-hidden="true" v-html="wordmark"></span>
    <span v-if="tagline" class="brand-logo-tagline" aria-hidden="true">
      SNEAKERS & STREET CULTURE
    </span>
  </span>
</template>

<style scoped>
.brand-logo {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  flex-shrink: 0;
  width: calc(var(--brand-logo-height) * 5.9);
  max-width: 100%;
  color: #0f172a;
  vertical-align: middle;
}

.brand-logo-inverse {
  color: #fff;
}

.brand-logo-art {
  display: block;
  width: 100%;
  line-height: 0;
}

.brand-logo-art :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
  color: inherit;
}

.brand-logo-tagline {
  margin: 5px 0 0 3px;
  font-family: 'Be Vietnam Pro', system-ui, sans-serif;
  font-size: 6px;
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: 0.19em;
  color: currentColor;
  opacity: 0.65;
  white-space: nowrap;
}

@media (max-width: 360px) {
  .brand-logo-tagline {
    font-size: 4.5px;
  }
}
</style>
