<!-- Muc dich: Nhan trang thai hoat dong dung chung trong khu quan tri. -->
<script setup>
defineProps({ active: { type: Boolean, default: true } });
</script>

<template>
  <span class="admin-activity-status" :class="{ 'is-active': active }">
    <span class="admin-activity-dot" aria-hidden="true"></span>
    {{ active ? 'Hoạt động' : 'Không hoạt động' }}
  </span>
</template>
