<script setup>
import ShoeCard from '../../ShoeCard.vue'

defineProps({ product: { type: Object, required: true } })
</script>

<template>
  <ShoeCard :product="product" />
</template>
