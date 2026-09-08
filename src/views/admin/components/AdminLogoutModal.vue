<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  adminName: { type: String, default: 'Quản trị viên' },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['cancel', 'confirm'])
const confirmButton = ref(null)
let previousOverflow = ''

const onKeydown = (event) => {
  if (event.key === 'Escape' && !props.busy) emit('cancel')
}

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeydown)
    await nextTick()
    confirmButton.value?.focus()
  } else {
    document.body.style.overflow = previousOverflow
    window.removeEventListener('keydown', onKeydown)
  }
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="logout-modal">
      <div v-if="open" class="logout-modal-overlay" @click.self="!busy && emit('cancel')">
        <section class="logout-modal" role="dialog" aria-modal="true" aria-labelledby="logout-modal-title" aria-describedby="logout-modal-description">
          <button class="logout-modal-close" type="button" aria-label="Đóng" :disabled="busy" @click="emit('cancel')"><i class="icon icon-x-lg"></i></button>

          <div class="logout-modal-icon" aria-hidden="true"><i class="icon icon-box-arrow-right"></i></div>
          <span class="logout-modal-eyebrow">Bảo mật tài khoản</span>
          <h2 id="logout-modal-title">Đăng xuất khỏi Admin?</h2>
          <p id="logout-modal-description">Phiên làm việc của <strong>{{ adminName }}</strong> sẽ kết thúc trên thiết bị này. Mọi thay đổi đã lưu vẫn được giữ nguyên.</p>

          <div class="logout-modal-note"><i class="icon icon-shield-check"></i><span>Bạn sẽ cần đăng nhập lại để tiếp tục quản lý cửa hàng.</span></div>

          <div class="logout-modal-actions">
            <button class="logout-cancel-btn" type="button" :disabled="busy" @click="emit('cancel')">Ở lại trang</button>
            <button ref="confirmButton" class="logout-confirm-btn" type="button" :disabled="busy" @click="emit('confirm')">
              <span v-if="busy" class="sg-spinner sg-spinner sg-spinner-sm" aria-hidden="true"></span>
              <i v-else class="icon icon-box-arrow-right"></i>
              {{ busy ? 'Đang đăng xuất…' : 'Đăng xuất' }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.logout-modal-overlay { position:fixed; inset:0; z-index:12000; display:grid; place-items:center; padding:20px; background:rgba(10,16,29,.62); backdrop-filter:blur(7px); }
.logout-modal { position:relative; width:min(100%,440px); padding:30px; border:1px solid var(--border); border-radius:var(--radius-lg); background:var(--surface); color:var(--text); box-shadow:0 28px 80px rgba(5,10,20,.28); text-align:center; }
.logout-modal-close { position:absolute; top:16px; right:16px; width:34px; height:34px; display:grid; place-items:center; border:0; border-radius:50%; background:var(--primary-soft); color:var(--text-muted); cursor:pointer; }
.logout-modal-close:hover { color:var(--text); }
.logout-modal-icon { width:62px; height:62px; display:grid; place-items:center; margin:0 auto 17px; border-radius:19px; background:color-mix(in srgb,var(--danger) 11%,var(--surface)); color:var(--danger); font-size:1.55rem; transform:rotate(-4deg); }
.logout-modal-eyebrow { color:var(--danger); font-size:.68rem; font-weight:900; letter-spacing:.11em; text-transform:uppercase; }
.logout-modal h2 { margin:7px 0 10px; color:var(--text); font-size:1.45rem; letter-spacing:-.035em; }
.logout-modal p { margin:0; color:var(--text-muted); font-size:.86rem; line-height:1.65; }
.logout-modal p strong { color:var(--text); }
.logout-modal-note { display:flex; align-items:center; gap:10px; margin:20px 0 24px; padding:12px 13px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--background); color:var(--text-muted); text-align:left; font-size:.76rem; line-height:1.45; }
.logout-modal-note i { color:var(--success); font-size:1rem; }
.logout-modal-actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.logout-modal-actions button { min-height:44px; display:inline-flex; align-items:center; justify-content:center; gap:8px; border-radius:999px; padding:10px 16px; font-size:.82rem; font-weight:800; cursor:pointer; transition:transform .18s ease,background .18s ease,border-color .18s ease; }
.logout-modal-actions button:hover:not(:disabled) { transform:translateY(-1px); }
.logout-cancel-btn { border:1px solid var(--border); background:var(--surface); color:var(--text); }
.logout-cancel-btn:hover { border-color:var(--primary); color:var(--primary); }
.logout-confirm-btn { border:1px solid var(--danger); background:var(--danger); color:#fff; box-shadow:0 8px 20px color-mix(in srgb,var(--danger) 24%,transparent); }
.logout-confirm-btn:hover { background:color-mix(in srgb,var(--danger) 84%,#000); }
.logout-modal-actions button:disabled,.logout-modal-close:disabled { opacity:.55; cursor:not-allowed; }
.logout-modal-enter-active,.logout-modal-leave-active { transition:opacity .2s ease; }
.logout-modal-enter-active .logout-modal,.logout-modal-leave-active .logout-modal { transition:transform .22s cubic-bezier(.2,.8,.2,1),opacity .2s ease; }
.logout-modal-enter-from,.logout-modal-leave-to { opacity:0; }
.logout-modal-enter-from .logout-modal,.logout-modal-leave-to .logout-modal { opacity:0; transform:translateY(10px) scale(.97); }
@media (max-width:480px) { .logout-modal { padding:26px 20px 20px; } .logout-modal-actions { grid-template-columns:1fr; } .logout-confirm-btn { order:-1; } }
</style>
