<script setup>
defineProps({
  columns: { type: Number, default: 4 },
})
</script>

<template>
  <div class="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3" :class="columns === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'">
    <slot />
  </div>
</template>
