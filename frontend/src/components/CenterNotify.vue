<!-- Mục đích: Toast thông báo toàn cục, hiển thị trạng thái bằng icon và nội dung từ uiStore. -->
<script setup>
import { uiState, dismissNotify } from '../stores/uiStore'
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-vue-next'
</script>

<template>
  <div class="toast-viewport" aria-live="polite" aria-atomic="false">
    <transition-group name="toast-anim" tag="div" class="toast-container">
      <div
        v-for="n in uiState.notifications"
        :key="n.id"
        class="toast-card"
        :class="`toast-${n.type || 'info'}`"
        :role="n.type === 'error' ? 'alert' : 'status'"
        @click="dismissNotify(n.id)"
      >
        <div class="toast-icon-wrap">
          <CircleCheck
            v-if="n.type === 'success'"
            class="toast-svg"
            aria-hidden="true"
          /><CircleX
            v-else-if="n.type === 'error'"
            class="toast-svg"
            aria-hidden="true"
          /><TriangleAlert
            v-else-if="n.type === 'warning'"
            class="toast-svg"
            aria-hidden="true"
          /><Info v-else class="toast-svg" aria-hidden="true" />
        </div>
        <div class="toast-content">
          <div v-if="n.title" class="toast-title">{{ n.title }}</div>
          <div class="toast-msg">{{ n.message }}</div>
        </div>
        <button
          type="button"
          class="toast-close"
          aria-label="Đóng thông báo"
          @click.stop="dismissNotify(n.id)"
        >
          <X :size="16" aria-hidden="true" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-viewport {
  position: fixed;
  top: 120px;
  right: 24px;
  z-index: 9999;
  pointer-events: none;
  max-width: 440px;
  width: calc(100vw - 48px);
}
@media (max-width: 640px) {
  .toast-viewport {
    top: 116px;
    left: 16px;
    right: 16px;
    width: auto;
    max-width: none;
  }
}

.toast-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast-card {
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 16px 36px -8px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(15, 23, 42, 0.08);
  border-left: 4px solid #0F172A;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 42px -8px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.12);
}

.toast-success { border-left-color: #0F172A; }
.toast-error, .toast-warning { border-left-color: #D4001A; }
.toast-info { border-left-color: #0F172A; }

.toast-icon-wrap {
  flex-shrink: 0;
  margin-top: 1px;
}
.toast-svg {
  width: 20px;
  height: 20px;
  color: #D4001A;
}

.toast-content {
  flex: 1;
  min-width: 0;
}
.toast-title {
  font-weight: 700;
  font-size: 0.88rem;
  color: #0F172A;
  line-height: 1.3;
  margin-bottom: 2px;
}
.toast-msg {
  font-size: 0.82rem;
  color: #475569;
  line-height: 1.45;
  word-break: break-word;
}

.toast-close {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: #94A3B8;
  padding: 2px;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background-color 0.15s;
  margin-top: -2px;
  margin-right: -4px;
}
.toast-close:hover {
  color: #0F172A;
  background: #F1F5F9;
}

/* Transitions */
.toast-anim-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-anim-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-anim-enter-from {
  opacity: 0;
  transform: translateY(-16px) scale(0.94);
}
.toast-anim-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.96);
}
@media (prefers-reduced-motion: reduce) {
  .toast-card, .toast-anim-enter-active, .toast-anim-leave-active { transition: none; }
}
</style>
