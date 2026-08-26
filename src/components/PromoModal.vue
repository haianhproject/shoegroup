<script setup>
/* Center-of-screen promotions & support modal.
   - Shown on first visit to the homepage (with sakura petals falling behind it).
   - Long enough to be readable and pleasant.
   - Closing it stops spawning new petals; the remaining ones drift down to the
     bottom and then stop (handled in uiStore + SakuraFalling). */
import { ref } from 'vue'
import { uiState, closePromo } from '../stores/uiStore'
import { useRouter } from 'vue-router'

const router = useRouter()
const dontShow24h = ref(false)
const dismiss = () => closePromo(dontShow24h.value)
const go = (path) => { closePromo(dontShow24h.value); router.push(path) }
</script>

<template>
  <transition name="promo">
    <div v-if="uiState.promoOpen" class="promo-overlay" @click.self="dismiss">
      <div class="promo-card sg-card">
        <button class="promo-x" @click="dismiss" aria-label="Đóng"><i class="bi bi-x-lg"></i></button>

        <div class="promo-hero">
          <span class="sg-chip promo-chip"><i class="bi bi-stars"></i> ƯU ĐÃI ĐẶC BIỆT</span>
          <h3 class="promo-title">Chào mừng đến với <strong>ShoeGroup</strong></h3>
          <p class="promo-sub">Bộ sưu tập giày thể thao nam 2026 — bứt phá từng bước chạy.</p>
        </div>

        <div class="promo-deals">
          <div class="deal">
            <div class="deal-badge">-30%</div>
            <div>
              <div class="deal-h">Sale toàn bộ dòng Running &amp; Basketball</div>
              <div class="deal-p">Áp dụng đến hết 31/07/2026 cho đơn mua trực tuyến.</div>
            </div>
          </div>
          <div class="deal">
            <div class="deal-badge warm"><i class="bi bi-truck"></i></div>
            <div>
              <div class="deal-h">Miễn phí giao hàng tiêu chuẩn</div>
              <div class="deal-p">Cho mọi đơn hàng từ 2.000.000đ. Giao hỏa tốc 24h nội thành Hà Nội.</div>
            </div>
          </div>
          <div class="deal">
            <div class="deal-badge lime"><i class="bi bi-gift"></i></div>
            <div>
              <div class="deal-h">Quà tặng thành viên mới</div>
              <div class="deal-p">Tặng tất thể thao + túi tote khi đăng ký tài khoản hôm nay.</div>
            </div>
          </div>
        </div>

        <div class="promo-support">
          <div class="sup-title"><i class="bi bi-headset"></i> Liên hệ hỗ trợ</div>
          <div class="sup-grid">
            <div><i class="bi bi-telephone-fill"></i> Hotline / Zalo: <strong>0375.990.871</strong></div>
            <div><i class="bi bi-envelope-fill"></i> support@shoegroup.vn</div>
            <div><i class="bi bi-geo-alt-fill"></i> Số 1 Lê Duẩn, Hoàn Kiếm, Hà Nội</div>
            <div><i class="bi bi-clock-fill"></i> 9:00 – 21:00 (T2 – CN)</div>
          </div>
        </div>

        <div class="promo-actions">
          <button class="btn-sg" @click="go('/products')"><i class="bi bi-bag-check me-2"></i>Mua sắm ngay</button>
          <button class="btn-sg-outline" @click="dismiss">Để sau</button>
        </div>
        <label class="promo-dont">
          <input type="checkbox" v-model="dontShow24h"> Không hiển thị lại trong 24 giờ
        </label>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.promo-overlay {
  position: fixed; inset: 0; z-index: 2500;
  background: rgba(10, 20, 45, .55); backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center; padding: 18px;
}
.promo-card {
  position: relative; width: 100%; max-width: 560px; max-height: 92vh; overflow-y: auto;
  border-radius: 24px; padding: 30px 30px 26px;
  box-shadow: var(--sg-shadow-lg);
}
.promo-x {
  position: absolute; top: 14px; right: 14px; z-index: 2;
  width: 38px; height: 38px; border-radius: 50%; border: 0;
  background: var(--sg-canvas); color: var(--sg-ink-2); transition: .2s;
}
.promo-x:hover { background: var(--sg-ink); color: #fff; transform: rotate(90deg); }
.promo-chip { background: var(--sg-soft); color: var(--sg-blue-700); }
.promo-title { font-weight: 900; font-size: 1.7rem; margin: 12px 0 4px; letter-spacing: -.02em; }
.promo-sub { color: var(--sg-muted); margin-bottom: 18px; }
.promo-deals { display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px; }
.deal { display: flex; gap: 14px; align-items: center; background: var(--sg-canvas); border: 1px solid var(--sg-line); border-radius: 14px; padding: 12px 14px; }
.deal-badge { flex-shrink: 0; width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #fff; background: var(--sg-grad-primary); font-size: 1rem; }
.deal-badge.warm { background: var(--sg-grad-warm); }
.deal-badge.lime { background: linear-gradient(135deg,#84cc16,#22c55e); }
.deal-h { font-weight: 800; color: var(--sg-ink); }
.deal-p { font-size: .86rem; color: var(--sg-muted); }
.promo-support { background: var(--sg-ink); color: #fff; border-radius: 16px; padding: 16px 18px; margin-bottom: 18px; }
.sup-title { font-weight: 800; margin-bottom: 10px; color: #fff; }
.sup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: .88rem; color: rgba(255,255,255,.82); }
.sup-grid i { color: var(--sg-cyan); margin-right: 6px; }
.promo-actions { display: flex; gap: 12px; }
.promo-actions .btn-sg { flex: 1; }
@media (max-width: 520px) { .sup-grid { grid-template-columns: 1fr; } .promo-title { font-size: 1.4rem; } }

.promo-dont { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 14px; font-size: .85rem; color: var(--sg-muted); cursor: pointer; }
.promo-dont input { width: 16px; height: 16px; accent-color: var(--sg-blue); }

.promo-enter-active, .promo-leave-active { transition: opacity .3s ease; }
.promo-enter-active .promo-card { transition: transform .4s cubic-bezier(.34,1.56,.64,1); }
.promo-enter-from, .promo-leave-to { opacity: 0; }
.promo-enter-from .promo-card { transform: scale(.9) translateY(20px); }
</style>
