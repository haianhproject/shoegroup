<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AdminIcon from './AdminIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  adminName: { type: String, default: 'Quản trị viên' },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['cancel', 'confirm'])
const panel = ref(null)
const cancelButton = ref(null)
let previousFocus = null
let previousOverflow = null

function onKeydown(event) {
  if (event.key === 'Escape' && !props.busy) {
    event.preventDefault()
    emit('cancel')
  }
  if (event.key !== 'Tab') return
  const controls = [...(panel.value?.querySelectorAll('button:not([disabled])') || [])]
  if (!controls.length) { event.preventDefault(); return }
  const first = controls[0], last = controls[controls.length - 1]
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
function releaseScroll() {
  if (previousOverflow !== null) document.body.style.overflow = previousOverflow
  previousOverflow = null
}
watch(() => props.open, async (open) => {
  if (open) {
    previousFocus = document.activeElement
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    if (props.open) cancelButton.value?.focus()
  } else {
    releaseScroll()
    await nextTick()
    if (previousFocus?.isConnected && !previousFocus.closest('[inert]')) previousFocus.focus()
  }
})
onBeforeUnmount(releaseScroll)
</script>

<template>
  <Teleport to="body">
    <Transition name="logout-modal">
      <div v-if="open" class="logout-modal-overlay" @click.self="!busy && emit('cancel')" @keydown="onKeydown">
        <section ref="panel" class="logout-modal" role="dialog" aria-modal="true" aria-labelledby="logout-modal-title" aria-describedby="logout-modal-description" :aria-busy="busy">
          <button class="logout-modal-close" type="button" aria-label="Đóng thông báo đăng xuất" :disabled="busy" @click="emit('cancel')"><AdminIcon name="close" /></button>
          <div class="logout-modal-icon"><AdminIcon name="logout" /></div>
          <p class="logout-modal-eyebrow">SHOEGROUP</p>
          <h2 id="logout-modal-title">Đăng xuất khỏi cửa hàng?</h2>
          <p id="logout-modal-description">Bạn đang đăng nhập với tài khoản <strong>{{ adminName }}</strong>. Bạn có muốn kết thúc phiên làm việc này?</p>
          <div class="logout-modal-actions">
            <button ref="cancelButton" class="logout-cancel-btn" type="button" :disabled="busy" @click="emit('cancel')">Ở lại trang</button>
            <button class="logout-confirm-btn" type="button" :disabled="busy" @click="emit('confirm')">{{ busy ? 'Đang đăng xuất…' : 'Đăng xuất' }}</button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.logout-modal-overlay { position: fixed; inset: 0; z-index: 12000; display: grid; place-items: center; padding: 18px; background: #0e0e0e80; backdrop-filter: blur(3px); font-family: 'Be Vietnam Pro', system-ui, sans-serif; }
.logout-modal { position: relative; width: min(100%, 440px); max-height: calc(100dvh - 36px); overflow-y: auto; padding: 30px; border: 1px solid #e5e5e5; border-radius: 14px; background: #fff; color: #0e0e0e; box-shadow: 0 24px 80px #00000026; }
.logout-modal :deep(svg) { width: 20px; height: 20px; }
.logout-modal-close { position: absolute; top: 14px; right: 14px; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 7px; background: #f7f7f8; color: #737373; cursor: pointer; }
.logout-modal-close:hover { color: #0e0e0e; background: #ededed; }
.logout-modal-icon { display: grid; place-items: center; width: 48px; height: 48px; margin-bottom: 20px; border-radius: 12px; color: #d4001a; background: #fff0f2; }
.logout-modal-icon :deep(svg) { width: 23px; height: 23px; }
.logout-modal-eyebrow { margin: 0 0 8px; color: #8a8a8a; font-size: 10px; font-weight: 600; letter-spacing: 1.5px; }
.logout-modal h2 { margin: 0 0 12px; font-family: inherit; font-size: 22px; font-weight: 600; line-height: 1.35; letter-spacing: -.7px; }
#logout-modal-description { margin: 0; color: #737373; font-size: 13px; line-height: 1.8; overflow-wrap: anywhere; }
#logout-modal-description strong { color: #333; font-weight: 500; }
.logout-modal-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 26px; }
.logout-modal-actions button { min-height: 42px; padding: 10px 12px; border: 1px solid #e5e5e5; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.logout-cancel-btn { background: white; color: #333; }
.logout-cancel-btn:hover { background: #f7f7f8; }
.logout-modal-actions .logout-confirm-btn { background: #d4001a; color: #fff; border-color: #d4001a; }
.logout-modal-actions .logout-confirm-btn:hover { background: #b80017; }
.logout-modal button:focus-visible { outline: 2px solid #0e0e0e; outline-offset: 3px; }
.logout-modal button:disabled { cursor: not-allowed; opacity: .5; }
.logout-modal-enter-active, .logout-modal-leave-active { transition: opacity .16s ease; }
.logout-modal-enter-from, .logout-modal-leave-to { opacity: 0; }
@media (max-width: 480px) { .logout-modal { padding: 25px 22px; } .logout-modal h2 { font-size: 20px; } }
@media (prefers-reduced-motion: reduce) { .logout-modal-enter-active, .logout-modal-leave-active { transition: none; } }
</style>
