<script setup>
defineProps({ name: { type: String, default: 'grid' } })

const paths = {
  grid: ['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],
  payment: ['M3 5h18v14H3zM3 10h18M7 15h3'],
  return: ['M9 4 4 9l5 5M4 9h10a6 6 0 0 1 0 12h-3'],
  shop: ['M3 10h18l-2-6H5l-2 6ZM4 10v10h16V10M9 20v-6h6v6'],
  box: ['m12 3 9 5v9l-9 5-9-5V8l9-5Zm0 10 9-5M12 13 3 8M12 13v9M7.5 5.5l9 5'],
  warehouse: ['m3 9 9-6 9 6v12H3V9Zm4 12V11h10v10M7 15h10M7 18h10'],
  category: ['M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM17 14v6M14 17h6'],
  award: ['M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12ZM8 14l-1 7 5-3 5 3-1-7'],
  layers: ['m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5'],
  collection: ['M3 7h18v14H3zM6 3h12M5 5h14M9 11h6'],
  color: ['M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4 2 2 0 0 1 1-4h3a3 3 0 0 0 3-3c0-4-4-7-9-7Z', 'M7 10h.01M10 6h.01M15 6h.01M6 14h.01'],
  ruler: ['m3 16 13-13 5 5L8 21l-5-5ZM7 12l2 2M10 9l2 2M13 6l2 2'],
  ticket: ['M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6ZM15 6v2M15 11v2M15 16v2'],
  tag: ['M3 3h8l10 10-8 8L3 11V3ZM7 7h.01'],
  people: ['M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM2 21v-2a7 7 0 0 1 14 0v2M16 4a4 4 0 0 1 0 8M22 21v-2a7 7 0 0 0-4-6'],
  shield: ['m12 3 9 4v6c0 5-9 9-9 9s-9-4-9-9V7l9-4ZM8 12l3 3 5-6'],
  search: ['M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM16 16l5 5'],
  menu: ['M4 6h16M4 12h16M4 18h16'],
  close: ['m6 6 12 12M6 18 18 6'],
  chevron: ['m9 5 7 7-7 7'],
  refresh: ['M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2'],
  calendar: ['M4 5h16v16H4zM8 3v4M16 3v4M4 11h16'],
  logout: ['M9 3H4v18h5M9 12h12M17 8l4 4-4 4'],
  arrow: ['M4 12h16M14 6l6 6-6 6'],
  download: ['M12 3v12M7 10l5 5 5-5M4 16v5h16v-5'],
  chart: ['M3 3v18h18M7 16v-5M12 16V7M17 16V4'],
  globe: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18'],
}
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path v-for="(path, index) in paths[name] || paths.grid" :key="index" :d="path" />
  </svg>
</template>
