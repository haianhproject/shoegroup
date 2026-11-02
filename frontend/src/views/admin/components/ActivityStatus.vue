<!-- Muc dich: Nhan trang thai hoat dong dung chung trong khu quan tri. -->
<script setup>
defineProps({ active: { type: Boolean, default: true } });
</script>

<template>
  <span class="admin-activity-status" :class="{ 'is-active': active }">
    {{ active ? 'Hoạt động' : 'Ngừng hoạt động' }}
  </span>
</template>
