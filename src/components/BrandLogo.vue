<script setup>
defineProps({
  size: { type: [Number, String], default: 40 },
  radius: { type: [Number, String], default: 12 },
})
</script>

<template>
  <!-- Logo thương hiệu riêng (vẽ bằng SVG) — giày sneaker cách điệu trên nền gradient -->
  <span
    class="brand-mark"
    :style="{ width: size + 'px', height: size + 'px', borderRadius: radius + 'px' }"
    aria-label="ShoeGroup"
  >
    <svg viewBox="0 0 64 64" width="68%" height="68%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- đế giày -->
      <path d="M7 45 H55 a4 4 0 0 1 0 8 H11 a4 4 0 0 1-4-4 Z" fill="#ffffff" fill-opacity="0.95"/>
      <!-- thân giày -->
      <path d="M9 45 L11 30 c1-6 6-10 12.5-11 l4.5 6.5 6.5-4.5 14.5 9.2 c4.2 2.2 6 5.3 6 10.1 V45 Z" fill="#ffffff"/>
      <!-- dây giày -->
      <path d="M19 30 l15 8.6 M23.5 25.8 l13 7.5 M28 21.6 l11 6.4" stroke="#2563eb" stroke-width="2.6" stroke-linecap="round"/>
      <!-- vệt swoosh cam -->
      <path d="M12 42 Q31 35 53 27" stroke="#ff5a1f" stroke-width="3.2" stroke-linecap="round"/>
    </svg>
  </span>
</template>

<style scoped>
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%);
  color: #fff;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
  flex-shrink: 0;
}
</style>
