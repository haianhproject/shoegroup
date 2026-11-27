<!-- Mục đích: Biểu tượng trạng thái đơn hàng dùng chung cho màn hình khách hàng. -->
<script setup>
defineProps({
  name: { type: String, default: 'info' },
  size: { type: [Number, String], default: 16 },
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="order-status-icon"
  >
    <template v-if="name === 'pending'">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </template>
    <template v-else-if="name === 'confirmed'">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.2 12 2.5 2.5 5.2-5.2" />
    </template>
    <template v-else-if="name === 'shipping'">
      <path d="M3.5 6.5h10v9h-10zM13.5 9h3.2l3 3.2v3.3h-6.2z" />
      <circle cx="7" cy="17.5" r="1.5" />
      <circle cx="17" cy="17.5" r="1.5" />
    </template>
    <template v-else-if="name === 'failed'">
      <path d="M12 3.5 21 19H3z" />
      <path d="M12 9v4M12 16.5h.01" />
    </template>
    <template v-else-if="name === 'warehouse'">
      <path d="m4 9 8-4 8 4-8 4z" />
      <path d="M4 9v7l8 4 8-4V9M12 13v7" />
    </template>
    <template v-else-if="name === 'delivered'">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.2 12 2.5 2.5 5.2-5.2" />
    </template>
    <template v-else-if="name === 'cancelled'">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </template>
    <template v-else-if="name === 'returned'">
      <path d="m9 7-4 4 4 4" />
      <path d="M5 11h8a6 6 0 0 1 6 6" />
    </template>
    <template v-else-if="name === 'reorder'">
      <path d="M3.5 10a8.5 8.5 0 1 1 1.8 7.5M3.5 4.5V10H9" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" />
    </template>
    <template v-else-if="name === 'edit'">
      <path d="m15 5 4 4M4 20l4.5-1L20 7.5a2.8 2.8 0 0 0-4-4L4.5 15z" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="m6 6 12 12M18 6 6 18" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="m5 12 4.5 4.5L19 7" />
    </template>
    <template v-else-if="name === 'save'">
      <path d="M5 3h12l4 4v14H3V3zM7 3v6h9V3M7 21v-8h10v8" />
    </template>
    <template v-else-if="name === 'calendar'">
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M4 9.5h16" />
    </template>
    <template v-else-if="name === 'location'">
      <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2" />
    </template>
    <template v-else-if="name === 'lock'">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </template>
    <template v-else-if="name === 'chevron'">
      <path d="m7 9.5 5 5 5-5" />
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 10.5v5M12 7.5h.01" />
    </template>
  </svg>
</template>

<style scoped>
.order-status-icon {
  display: block;
  flex: 0 0 auto;
}
</style>
