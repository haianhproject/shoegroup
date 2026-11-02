<!-- Mục đích: Panel quản trị trượt từ phải, giữ tiêu đề/nút thao tác và quản lý bàn phím bằng dialog gốc. -->
<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({ open: Boolean, title: { type: String, required: true }, busy: Boolean })
const emit = defineEmits(['close'])
const panel = ref(null)
let previousOverflow
function unlock() {
  if (previousOverflow !== undefined) document.body.style.overflow = previousOverflow
  previousOverflow = undefined
}
function close() { if (!props.busy) emit('close') }
function backdrop(event) {
  if (event.target !== panel.value) return
  const bounds = panel.value.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close()
}
watch(() => props.open, async open => {
  await nextTick()
  if (!panel.value) return
  if (open && !panel.value.open) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.value.showModal()
  } else if (!open && panel.value.open) {
    panel.value.close()
    unlock()
  }
}, { immediate: true })
onBeforeUnmount(() => { panel.value?.close(); unlock() })
</script>

<template>
  <dialog ref="panel" class="admin-drawer" :aria-label="title" :aria-busy="busy" @cancel.prevent="close" @click="backdrop">
    <header class="admin-drawer-head">
      <h2>{{ title }}</h2>
      <button type="button" class="btn btn-sm btn-light border" :disabled="busy" @click="close" aria-label="Đóng panel"><i class="icon icon-x-lg" aria-hidden="true"></i></button>
    </header>
    <div class="admin-drawer-body"><slot /></div>
    <footer v-if="$slots.footer" class="admin-drawer-footer"><slot name="footer" /></footer>
  </dialog>
</template>

<style scoped>
.admin-drawer { position: fixed; inset: 0 0 0 auto; margin: 0; width: min(620px, 100%); max-width: 100%; height: 100dvh; max-height: 100dvh; padding: 0; border: 0; background: #fff; color: #111827; box-shadow: -12px 0 40px #0002; overflow: hidden; }
.admin-drawer[open] { display: flex; flex-direction: column; animation: drawer-enter .2s ease-out; }
.admin-drawer::backdrop { background: #0006; }
.admin-drawer-head, .admin-drawer-footer { display: flex; flex: 0 0 auto; align-items: center; gap: 10px; padding: 16px 22px; background: #fff; }
.admin-drawer-head { justify-content: space-between; border-bottom: 1px solid #e5e7eb; }
.admin-drawer-head h2 { margin: 0; font-size: 1rem; }
.admin-drawer-body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 22px; }
.admin-drawer-footer { justify-content: flex-end; border-top: 1px solid #e5e7eb; }
@keyframes drawer-enter { from { transform: translateX(100%); } to { transform: translateX(0); } }
@media (prefers-reduced-motion: reduce) { .admin-drawer[open] { animation: none; } }
</style>
