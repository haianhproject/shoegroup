<script setup>
/* Centered notifications shown in the middle of the screen.
   Replaces browser alert()/local messages with a professional card. */
import { uiState, dismissNotify } from '../stores/uiStore'

const icon = (type) => ({
  success: 'bi-check-circle-fill',
  error: 'bi-x-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
}[type] || 'bi-info-circle-fill')
</script>

<template>
  <div class="center-notify-wrap">
    <transition-group name="cn">
      <div
        v-for="n in uiState.notifications"
        :key="n.id"
        class="cn-card"
        :class="`cn-${n.type}`"
        @click="dismissNotify(n.id)"
      >
        <div class="cn-icon"><i class="bi" :class="icon(n.type)"></i></div>
        <div class="cn-body">
          <div v-if="n.title" class="cn-title">{{ n.title }}</div>
          <div class="cn-msg">{{ n.message }}</div>
        </div>
        <button class="cn-close" @click.stop="dismissNotify(n.id)"><i class="bi bi-x"></i></button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.center-notify-wrap {
  position: fixed; inset: 0; z-index: 3000;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
  padding-top: 14vh; gap: 12px; pointer-events: none;
}
.cn-card {
  pointer-events: auto; cursor: pointer;
  display: flex; align-items: center; gap: 14px;
  min-width: 320px; max-width: 92vw;
  background: #fff; border-radius: 16px; padding: 16px 18px;
  box-shadow: 0 24px 60px rgba(15,23,42,.22);
  border: 1px solid var(--sg-line);
  border-left: 6px solid var(--sg-blue);
}
.cn-success { border-left-color: #16a34a; }
.cn-error   { border-left-color: #ef4444; }
.cn-warning { border-left-color: #f59e0b; }
.cn-info    { border-left-color: var(--sg-blue); }
.cn-icon { font-size: 1.7rem; line-height: 1; }
.cn-success .cn-icon { color: #16a34a; }
.cn-error .cn-icon { color: #ef4444; }
.cn-warning .cn-icon { color: #f59e0b; }
.cn-info .cn-icon { color: var(--sg-blue); }
.cn-body { flex: 1; }
.cn-title { font-weight: 800; color: var(--sg-ink); }
.cn-msg { color: var(--sg-ink-2); font-size: .93rem; }
.cn-close { border: 0; background: transparent; color: var(--sg-muted); font-size: 1.2rem; line-height: 1; }

.cn-enter-active, .cn-leave-active { transition: all .35s cubic-bezier(.34,1.56,.64,1); }
.cn-enter-from { opacity: 0; transform: translateY(-18px) scale(.94); }
.cn-leave-to { opacity: 0; transform: translateY(-10px) scale(.96); }
</style>
