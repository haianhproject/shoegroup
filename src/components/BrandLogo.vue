<script setup>
defineProps({
  size: { type: [Number, String], default: 40 },
  radius: { type: [Number, String], default: 0 },
})
</script>

<template>
  <span style="display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;" aria-label="ShoeGroup">
    <img src="/img/logogiay.png" alt="ShoeGroup" style="width: auto; height: auto; max-height: 50px; display: block;" />
  </span>
</template>

<style scoped>
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #0A0A0A;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  border: 1px solid #333;
}
.brand-mark::before {
  content: '';
  position: absolute;
  top: -30%;
  left: -30%;
  width: 160%;
  height: 160%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}
.brand-mark:hover::before {
  opacity: 1;
}
</style>
