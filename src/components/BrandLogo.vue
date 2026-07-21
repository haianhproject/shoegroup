<script setup>
defineProps({
  size: { type: [Number, String], default: 40 },
  radius: { type: [Number, String], default: 12 },
})
</script>

<template>
  <!-- Logo thương hiệu — giày sneaker navy phong cách giống logo ShoeGroup -->
  <span
    class="brand-mark"
    :style="{ width: size + 'px', height: size + 'px', borderRadius: radius + 'px' }"
    aria-label="ShoeGroup"
  >
    <svg viewBox="0 0 80 80" width="82%" height="82%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Đế giày (sole) -->
      <path d="M10 56 H68 Q72 56 72 60 Q72 64 68 64 H14 Q10 64 10 60 Z" fill="#e8eef8" fill-opacity="0.9"/>
      <path d="M10 56 H68 Q72 56 72 60 H10 Z" fill="#c8d8f0" fill-opacity="0.8"/>
      <!-- Thân giày chính -->
      <path d="M14 56 L16 36 Q18 26 28 24 L32 32 L40 27 L56 37 Q62 40 63 48 L64 56 Z" fill="white"/>
      <!-- Lớp màu navy trên thân giày -->
      <path d="M14 56 L16 38 Q18 28 27 26 L31 34 L39 29 L55 38 Q61 41 62 48 L63 56 Z" fill="#1a3a6b"/>
      <!-- Phần mũi giày đậm hơn -->
      <path d="M14 56 L15 44 Q16 38 20 35 L18 56 Z" fill="#112447"/>
      <!-- Phần lưỡi giày (tongue) -->
      <path d="M28 24 L30 36 L35 34 L32 22 Z" fill="#3b6fb5"/>
      <!-- Dải trắng trang trí (swoosh effect) -->
      <path d="M20 46 Q35 38 58 34" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M21 50 Q36 43 57 40" stroke="white" stroke-width="2" stroke-linecap="round" stroke-opacity="0.5"/>
      <!-- Đường khâu / chi tiết giày -->
      <path d="M25 30 L38 42 M30 26 L42 38" stroke="#7dacd4" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 3"/>
    </svg>
  </span>
</template>

<style scoped>
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #1a3a6b 0%, #235da6 70%, #3b6fb5 100%);
  box-shadow: 0 6px 18px rgba(26, 58, 107, 0.45);
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.brand-mark::before {
  content: '';
  position: absolute;
  top: -30%;
  left: -20%;
  width: 60%;
  height: 60%;
  background: rgba(255,255,255,0.08);
  border-radius: 50%;
}
</style>
