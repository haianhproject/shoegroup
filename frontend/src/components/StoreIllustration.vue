<!-- Mục đích: Minh họa vector cho trạng thái trống với cùng màu thương hiệu, lấy cảm hứng từ unDraw và Storyset. -->
<script setup>
defineProps({ kind: { type: String, default: 'bag' } })
</script>

<template>
  <svg
    class="store-illustration"
    viewBox="0 0 260 180"
    fill="none"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    <ellipse cx="131" cy="151" rx="91" ry="11" fill="#E9EDF1" />
    <circle cx="136" cy="87" r="65" fill="#F3F5F7" />
    <circle cx="207" cy="44" r="8" fill="#D4001A" opacity=".09" />
    <path
      d="M43 70h12m-6-6v12M208 117h10m-5-5v10"
      stroke="#D4001A"
      stroke-width="2"
      stroke-linecap="round"
    />
    <path
      d="m62 133 10-9m126-65 8-7"
      stroke="#CED5DC"
      stroke-width="2"
      stroke-linecap="round"
    />
    <g v-if="kind === 'search'">
      <rect
        x="67"
        y="52"
        width="106"
        height="87"
        rx="10"
        fill="white"
        stroke="#CBD3DC"
        stroke-width="1.5"
        transform="rotate(-7 67 52)"
      />
      <path
        d="m84 75 54-7m-52 19 31-4"
        stroke="#DDE2E8"
        stroke-width="4"
        stroke-linecap="round"
      />
      <circle
        cx="149"
        cy="103"
        r="29"
        fill="white"
        stroke="#0F172A"
        stroke-width="3"
      />
      <path
        d="m170 124 22 22"
        stroke="#D4001A"
        stroke-width="9"
        stroke-linecap="round"
      />
      <path
        d="M140 103h18"
        stroke="#D4001A"
        stroke-width="3"
        stroke-linecap="round"
      />
    </g>
    <g v-else-if="kind === 'account'">
      <rect
        x="72"
        y="41"
        width="116"
        height="108"
        rx="12"
        fill="white"
        stroke="#CBD3DC"
        stroke-width="1.5"
      />
      <path d="M72 61h116" stroke="#E9EDF1" stroke-width="1.5" />
      <circle cx="84" cy="51" r="2" fill="#D4001A" />
      <circle cx="92" cy="51" r="2" fill="#DDE2E8" />
      <circle cx="100" cy="51" r="2" fill="#DDE2E8" />
      <circle cx="130" cy="88" r="15" fill="#FCE9EC" />
      <path d="M103 128c0-15 12-25 27-25s27 10 27 25" fill="#D4001A" />
      <circle cx="181" cy="137" r="18" fill="#0F172A" />
      <path
        d="m173 137 5 5 10-11"
        stroke="white"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </g>
    <g v-else>
      <path
        d="m85 62-9 77a9 9 0 0 0 9 10h91a9 9 0 0 0 9-10l-9-77H85Z"
        fill="white"
        stroke="#0F172A"
        stroke-width="1.7"
      />
      <path
        d="M111 72V54a20 20 0 0 1 40 0v18"
        stroke="#0F172A"
        stroke-width="2.5"
        stroke-linecap="round"
      />
      <path
        d="m100 115 7-11 10 7 12-17 12 15 18 5c6 2 8 10 3 13h-61c-4-3-4-8-1-12Z"
        fill="#FCE9EC"
        stroke="#D4001A"
        stroke-width="1.7"
        stroke-linejoin="round"
      />
      <path
        d="M101 126h62m-39-22 5 4m1-10 6 5"
        stroke="#D4001A"
        stroke-width="1.7"
        stroke-linecap="round"
      />
    </g>
    <circle cx="56" cy="107" r="3" fill="#D4001A" opacity=".5" />
  </svg>
</template>

<style scoped>
.store-illustration {
  display: block;
  width: 220px;
  max-width: 100%;
  height: auto;
  margin-inline: auto;
}
</style>
