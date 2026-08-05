<script setup>
/* Cherry-blossom (sakura) petals falling across the whole page.
   - While uiState.sakuraSpawning is true, new petals keep spawning.
   - When it turns false, spawning stops but the petals already in the air
     finish their fall ("tắt đi thì còn lại tàn dư sẽ rơi cho đến hết").
*/
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { uiState } from '../stores/uiStore'

const props = defineProps({
  // base density (how many petals visible at once when spawning)
  density: { type: Number, default: 18 },
})

const petals = ref([])
let uid = 0
let spawnTimer = null

const palette = [
  'radial-gradient(circle at 30% 30%, #ffe1ea 0%, #ffb7c5 55%, #ff88a6 100%)',
  'radial-gradient(circle at 30% 30%, #fff0f5 0%, #ffc9d6 55%, #ff9db6 100%)',
  'radial-gradient(circle at 30% 30%, #ffe9f0 0%, #ffb0c8 55%, #ff7fa3 100%)',
]

const spawnPetal = () => {
  const size = 9 + Math.random() * 12
  const duration = 7 + Math.random() * 7
  const petal = {
    id: ++uid,
    style: {
      left: Math.random() * 100 + 'vw',
      width: size + 'px',
      height: size * 0.9 + 'px',
      background: palette[Math.floor(Math.random() * palette.length)],
      opacity: 0.55 + Math.random() * 0.4,
      animationDuration: `${duration}s, ${2 + Math.random() * 2}s`,
      animationDelay: '0s, 0s',
    },
  }
  petals.value.push(petal)
  // Remove after it finishes falling
  setTimeout(() => {
    const i = petals.value.findIndex((p) => p.id === petal.id)
    if (i !== -1) petals.value.splice(i, 1)
  }, duration * 1000 + 200)
}

const startSpawning = () => {
  if (spawnTimer) return
  // Seed a few immediately so the effect appears at once
  for (let i = 0; i < props.density / 2; i++) spawnPetal()
  spawnTimer = setInterval(() => {
    if (petals.value.length < props.density) spawnPetal()
  }, 420)
}

const stopSpawning = () => {
  if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null }
  // Do NOT clear petals.value: let the residue finish falling.
}

watch(() => uiState.sakuraSpawning, (on) => {
  if (on) startSpawning()
  else stopSpawning()
})

onMounted(() => { if (uiState.sakuraSpawning) startSpawning() })
onUnmounted(() => stopSpawning())
</script>

<template>
  <div class="sakura-layer" aria-hidden="true">
    <span
      v-for="petal in petals"
      :key="petal.id"
      class="sakura-petal"
      :style="petal.style"
    ></span>
  </div>
</template>
