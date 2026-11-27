<!-- Trợ lý dùng dữ liệu cửa hàng, có tra đơn chính chủ và chuyển hỗ trợ Zalo. -->
<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { MessageCircle, X, Send, ArrowUpRight, Package, RefreshCw } from 'lucide-vue-next'
import { api, API_BASE_URL } from '../services/apiClient'
import { currentUser } from '../stores/authStore'
const open = ref(false), input = ref(''), pending = ref(false), feed = ref(null), field = ref(null), toggle = ref(null)
const messages = ref([]), context = ref({}), quick = ref([])
let controller, epoch = 0, sequence = 0
const initialQuick = ['Tìm giày', 'Hướng dẫn chọn size', 'Tra đơn hàng', 'Trả hàng / hoàn tiền', 'Gặp nhân viên']
const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0)
function welcome() {
  epoch++; controller?.abort(); pending.value = false; context.value = {}; quick.value = initialQuick
  messages.value = [{ id: ++sequence, role: 'assistant', message: 'Chào bạn! Mình là trợ lý tra cứu ShoeGroup. Bạn cần tìm giày, chọn size hay kiểm tra đơn hàng?', products: [], orders: [], links: [] }]
}
function asset(value) {
  if (typeof value !== 'string' || !value) return ''
  if (/^data:image\/(png|jpeg|webp|gif);base64,/i.test(value)) return value
  try { const base = new URL(API_BASE_URL, location.origin).href.replace(/\/api\/?$/, '/'); const url = new URL(value, base); return ['http:', 'https:'].includes(url.protocol) ? url.href : '' } catch { return '' }
}
function safeLink(href) { return typeof href === 'string' && (/^\/(?!\/)/.test(href) || href === 'https://zalo.me/0375990871') ? href : '/contact' }
async function scroll() { await nextTick(); if (feed.value) feed.value.scrollTop = feed.value.scrollHeight }
async function show() { open.value = true; await nextTick(); field.value?.focus(); await scroll() }
function close() { open.value = false; nextTick(() => toggle.value?.focus()) }
async function send(text = input.value, retry = null) {
  const message = String(text).trim()
  if (!message || message.length > 500 || pending.value) return
  const entry = retry || { id: ++sequence, role: 'user', message, failed: false }
  if (!retry) messages.value.push(entry)
  entry.failed = false; input.value = ''; pending.value = true
  const current = epoch; controller = new AbortController(); await scroll()
  try {
    const reply = await api.post('/chat', { message, context: context.value }, { signal: controller.signal })
    if (current !== epoch) return
    messages.value.push({ ...reply, id: ++sequence, role: 'assistant' })
    if (reply.intent === 'PRODUCTS' || reply.intent === 'WELCOME') context.value = reply.context || {}
    quick.value = reply.quick_replies || initialQuick
    if (messages.value.length > 30) messages.value.splice(0, messages.value.length - 30)
  } catch (e) {
    if (current === epoch && e.name !== 'AbortError') { entry.failed = true; entry.error = e.status === 429 ? 'Bạn gửi hơi nhanh. Vui lòng đợi một lát rồi thử lại.' : 'Chưa kết nối được trợ lý. Bạn có thể thử lại hoặc liên hệ shop qua Zalo.' }
  } finally { if (current === epoch) { pending.value = false; await scroll(); if (open.value) field.value?.focus() } }
}
watch(() => currentUser.value?.id_user ?? currentUser.value?.id ?? null, welcome, { immediate: true })
onBeforeUnmount(() => { epoch++; controller?.abort() })
</script>

<template>
  <section v-if="open" class="sg-chat" role="dialog" aria-label="Trợ lý ShoeGroup" aria-modal="false" @keydown.esc.stop.prevent="close">
    <header class="chat-head"><span class="chat-monogram" aria-hidden="true">SG</span><div><strong>Trợ lý ShoeGroup</strong><span>Tra cứu cửa hàng · Hỗ trợ mua sắm</span></div><button type="button" aria-label="Đóng trò chuyện" @click="close"><X :size="19" :stroke-width="1.7" /></button></header>
    <div ref="feed" class="chat-feed" role="log" aria-live="polite" aria-relevant="additions text">
      <article v-for="entry in messages" :key="entry.id" class="chat-message" :class="entry.role">
        <span v-if="entry.role === 'assistant'" class="chat-speaker">SHOEGROUP</span><p>{{ entry.message }}</p>
        <template v-if="entry.role === 'assistant'">
          <router-link v-for="p in entry.products || []" :key="p.id" :to="safeLink(p.href)" class="chat-product" @click="close">
            <figure><img v-if="asset(p.image)" :src="asset(p.image)" :alt="p.name" loading="lazy" @error="e => e.target.style.display = 'none'" /><Package v-else :size="26" :stroke-width="1.3" /></figure>
            <div><strong>{{ p.name }}</strong><b>{{ money(p.price) }}</b><small>{{ p.variants.map(v => `${v.color} / ${v.size}`).slice(0, 4).join(' · ') }}</small><span>Còn {{ p.stock }} đôi phù hợp</span></div><ArrowUpRight :size="17" />
          </router-link>
          <router-link v-for="o in entry.orders || []" :key="o.code" :to="safeLink(o.href)" class="chat-order" @click="close"><strong>#{{ o.code }}</strong><span>{{ o.status }} · {{ o.payment_status }}</span><b>{{ money(o.total) }}</b><small v-if="o.has_open_return">Đang có yêu cầu trả hàng</small><span class="chat-link-label">Xem đơn hàng <ArrowUpRight :size="14" /></span></router-link>
          <template v-for="link in entry.links || []" :key="link.href"><a v-if="link.href?.startsWith('https://')" class="chat-link" :href="safeLink(link.href)" target="_blank" rel="noopener noreferrer">{{ link.label }}<ArrowUpRight :size="14" /></a><router-link v-else class="chat-link" :to="safeLink(link.href)" @click="close">{{ link.label }}<ArrowUpRight :size="14" /></router-link></template>
        </template>
        <div v-if="entry.failed" class="chat-retry" role="alert"><span>{{ entry.error }}</span><button type="button" :disabled="pending" @click="send(entry.message, entry)"><RefreshCw :size="13" />Thử lại</button></div>
      </article>
      <div v-if="pending" class="chat-thinking" role="status"><i></i><i></i><i></i><span>Đang tra cứu…</span></div>
    </div>
    <div class="chat-quick" aria-label="Gợi ý câu hỏi"><button v-for="item in quick" :key="item" type="button" :disabled="pending" @click="send(item)">{{ item }}</button></div>
    <form class="chat-form" @submit.prevent="send()"><label><span class="sr-only">Nội dung trò chuyện</span><textarea ref="field" v-model="input" rows="1" maxlength="500" placeholder="Ví dụ: giày đen size 40 dưới 1 triệu" @keydown.enter.exact.prevent="send()"></textarea></label><button type="submit" aria-label="Gửi tin nhắn" :disabled="pending || !input.trim()"><Send :size="18" :stroke-width="1.7" /></button></form>
    <footer class="chat-footer">Giá và tồn theo dữ liệu vừa tra. <a href="https://zalo.me/0375990871" target="_blank" rel="noopener noreferrer">Gặp nhân viên</a></footer>
  </section>
  <button ref="toggle" type="button" class="chat-toggle" :aria-expanded="open" :aria-label="open ? 'Thu gọn trợ lý ShoeGroup' : 'Mở trợ lý ShoeGroup'" @click="open ? close() : show()"><X v-if="open" :size="23" :stroke-width="1.7" /><MessageCircle v-else :size="24" :stroke-width="1.6" /><span v-if="!open">Cần hỗ trợ?</span></button>
</template>

<style scoped>
.chat-toggle{position:fixed;right:24px;bottom:23px;z-index:80;display:flex;align-items:center;justify-content:center;gap:9px;min-width:50px;height:50px;padding:0 16px;background:#d4001a;color:#fff;border:0;border-radius:999px;box-shadow:0 6px 22px #0f172a20;cursor:pointer;font-size:11px;font-weight:600}.chat-toggle:hover{background:#b80018}.chat-toggle[aria-expanded=true]{padding:0;width:50px}.sg-chat{position:fixed;z-index:90;right:24px;bottom:84px;width:min(390px,calc(100vw - 28px));height:min(650px,calc(100dvh - 112px));display:flex;flex-direction:column;border:1px solid #e2e6ed;border-radius:18px;background:#fff;color:#182030;box-shadow:0 18px 65px #0f172a26;overflow:hidden}
.chat-head{display:flex;align-items:center;gap:10px;padding:16px;border-bottom:1px solid #e9edf2}.chat-monogram{display:grid;place-items:center;width:37px;height:37px;flex-shrink:0;border-radius:10px;background:#fff0f2;color:#d4001a;font-weight:800;font-style:italic;letter-spacing:-1px;font-size:17px}.chat-head strong{display:block;font-size:13px;font-weight:650}.chat-head div>span{display:block;margin-top:4px;font-size:9px;color:#9299a5}.chat-head button{margin-left:auto;display:grid;place-items:center;padding:5px;border:0;background:transparent;color:#6d7685;cursor:pointer}
.chat-feed{flex:1;overflow:auto;overscroll-behavior:contain;padding:17px 15px;background:#f8f9fb;scrollbar-width:thin}.chat-message{max-width:100%;margin-bottom:17px;font-size:12px;line-height:1.8;overflow-wrap:anywhere}.chat-speaker{display:block;font-size:8px;letter-spacing:.13em;font-weight:700;color:#a1a8b2;margin:0 0 6px 2px}.chat-message>p{margin:0;padding:12px 13px;border:1px solid #e9edf2;background:#fff;border-radius:3px 13px 13px;color:#4e5969;white-space:pre-line}.chat-message.user{margin-left:34px}.chat-message.user>p{background:#18202d;color:#fff;border-color:#18202d;border-radius:13px 3px 13px 13px}
.chat-product{display:flex;gap:10px;align-items:flex-start;margin-top:9px;padding:11px;background:#fff;border:1px solid #e5e8ef;border-radius:11px;text-decoration:none;color:#172033}.chat-product figure{margin:0;width:62px;height:62px;display:grid;place-items:center;flex-shrink:0;border-radius:7px;background:#f4f5f7;color:#b3bbc5}.chat-product img{width:100%;height:100%;object-fit:contain;mix-blend-mode:multiply}.chat-product>div{flex:1;min-width:0}.chat-product>svg{flex-shrink:0;margin-top:3px}.chat-product strong{display:block;font-size:11px;font-weight:600;line-height:1.55}.chat-product b{display:block;color:#d4001a;font-size:12px;margin:3px 0}.chat-product small{display:block;font-size:9px;line-height:1.6;color:#838c99}.chat-product div>span{font-size:9px;color:#497157}.chat-product:hover{border-color:#d4001a50}
.chat-order{display:grid;gap:5px;padding:13px;margin-top:8px;border:1px solid #e1e7ef;border-radius:10px;background:#fff;color:#253145;text-decoration:none;font-size:11px}.chat-order>span{color:#758093;font-size:10px}.chat-order b{font-size:13px}.chat-order small{color:#9b6e2c}.chat-link-label{display:flex;align-items:center;gap:6px;margin-top:4px;color:#d4001a!important}.chat-link{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;margin:8px 6px 0 0;border:1px solid #e0e5ed;border-radius:7px;background:#fff;text-decoration:none;font-size:10px;color:#d4001a}
.chat-quick{display:flex;gap:6px;overflow:auto;padding:10px 12px;border-top:1px solid #e9edf2;scrollbar-width:thin}.chat-quick button{flex:0 0 auto;padding:7px 9px;border:1px solid #e3e7ef;border-radius:15px;background:#fff;color:#667284;font-size:10px;cursor:pointer}.chat-quick button:hover{color:#d4001a;border-color:#d4001a40}.chat-form{display:flex;gap:8px;align-items:flex-end;padding:6px 12px 8px}.chat-form label{flex:1;display:flex}.chat-form textarea{width:100%;resize:none;max-height:80px;min-height:42px;box-sizing:border-box;outline:none;border:1px solid #e2e7ee;border-radius:10px;padding:12px;font:inherit;font-size:11px;line-height:1.6;background:#fbfcfd;color:#253145}.chat-form textarea:focus{border-color:#d4001a80}.chat-form>button{display:grid;place-items:center;width:41px;height:42px;border:0;border-radius:10px;background:#d4001a;color:#fff;cursor:pointer}.sg-chat button:disabled{opacity:.45;cursor:default}.chat-footer{font-size:8px;text-align:center;color:#a1a8b3;padding:0 10px 10px}.chat-footer a{color:#7e8897;text-decoration:underline}.chat-thinking{display:flex;align-items:center;gap:3px;padding:10px;color:#919ba8;font-size:9px}.chat-thinking i{height:4px;width:4px;background:#b4bbc5;border-radius:100%;animation:chat-dot 1s infinite}.chat-thinking i:nth-child(2){animation-delay:.16s}.chat-thinking i:nth-child(3){animation-delay:.32s}.chat-thinking span{margin-left:6px}.chat-retry{display:grid;gap:8px;margin-top:6px;color:#9b5261;font-size:10px}.chat-retry button{display:inline-flex;align-items:center;gap:6px;justify-self:start;border:1px solid #eccfd7;background:#fff4f6;color:#a8314a;border-radius:6px;padding:5px 8px;font-size:10px;cursor:pointer}.sg-chat button:focus-visible,.chat-toggle:focus-visible,.sg-chat a:focus-visible{outline:2px solid #d4001a;outline-offset:2px}
@keyframes chat-dot{50%{opacity:.35;transform:translateY(-2px)}}@media(prefers-reduced-motion:reduce){.chat-thinking i{animation:none}}@media(max-width:540px){.sg-chat{right:14px;bottom:78px;height:min(620px,calc(100dvh - 100px));border-radius:15px}.chat-toggle{right:15px;bottom:16px;height:48px;min-width:48px}.chat-toggle>span{display:none}.chat-head{padding:13px}}
</style>
