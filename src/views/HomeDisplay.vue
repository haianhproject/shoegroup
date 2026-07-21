<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ShoeCard from '../components/ShoeCard.vue'
import { maybeOpenPromo } from '../stores/uiStore'
import { products as mockProducts, categories as mockCats } from '../data/mockData'

const products = ref([])
const categories = ref([])
const isLoading = ref(true)

const featuredProducts = computed(() => products.value.slice(0, 8))

const getCategoryImage = (categoryId) => {
  const prod = products.value.find((p) => p.id_category === categoryId)
  return prod?.image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800'
}

/* Hero slides */
const slides = [
  { img: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&q=80&w=1600', tag: 'Bộ sưu tập 2026', title: 'BỨT PHÁ TỪNG BƯỚC CHẠY', sub: 'Giày thể thao nam chính hãng — công nghệ đệm tiên tiến, thiết kế bứt phá.' },
  { img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=1600', tag: 'Running Series', title: 'NHẸ HƠN. NHANH HƠN.', sub: 'Chinh phục mọi đường chạy với đế đệm phản hồi năng lượng cao.' },
  { img: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=1600', tag: 'Basketball', title: 'LÀM CHỦ SÂN ĐẤU', sub: 'Bám sân, ổn định và phong cách bùng nổ trên từng pha bóng.' },
]
const current = ref(0)
let timer = null
const go = (i) => { current.value = (i + slides.length) % slides.length }
const next = () => go(current.value + 1)
const prev = () => go(current.value - 1)
const startAuto = () => { stopAuto(); timer = setInterval(next, 5000) }
const stopAuto = () => { if (timer) { clearInterval(timer); timer = null } }

const fetchData = async () => {
  try {
    const [resProd, resCat] = await Promise.all([
      fetch('http://localhost:5000/api/products'),
      fetch('http://localhost:5000/api/categories'),
    ])
    const dataProd = await resProd.json()
    const dataCat = await resCat.json()
    products.value = dataProd.filter((p) => p.active).map((p) => ({
      id_product: p.id, product_name: p.name, price: p.price,
      id_category: p.category_id, category_name: p.category, sport: p.sport,
      material_name: p.material_name, image_url: p.image_url,
      brand_name: p.brand_name || p.brand || '', id_brand: p.id_brand || 1,
    }))
    categories.value = dataCat.filter((c) => c.active).map((c) => ({
      id_category: c.id, category_name: c.name, sport: c.sport,
    }))
  } catch (error) {
    products.value = mockProducts.map((p) => ({ ...p, category_name: mockCats.find((c) => c.id_category === p.id_category)?.category_name }))
    categories.value = mockCats
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  window.scrollTo(0, 0)
  fetchData()
  startAuto()
  setTimeout(() => maybeOpenPromo(), 700)
})
onUnmounted(stopAuto)
</script>

<template>
  <div class="home">

    <!-- ====== HERO SLIDESHOW ====== -->
    <section class="hero-slider" @mouseenter="stopAuto" @mouseleave="startAuto">
      <div class="slides" :style="{ transform: `translateX(-${current * 100}%)` }">
        <div class="slide" v-for="(s, i) in slides" :key="i">
          <img :src="s.img" :alt="s.title">
          <div class="slide-shade"></div>
          <div class="slide-caption">
            <span class="hero-tag"><i class="bi bi-lightning-charge-fill"></i> {{ s.tag }}</span>
            <h1 class="hero-title">{{ s.title }}</h1>
            <p class="hero-sub">{{ s.sub }}</p>
            <div class="hero-cta">
              <router-link to="/products" class="btn-hero-primary">
                <i class="bi bi-bag me-2"></i>Mua ngay
              </router-link>
              <router-link to="/products" class="btn-hero-ghost">
                Khám phá <i class="bi bi-arrow-right ms-1"></i>
              </router-link>
            </div>
          </div>
        </div>
      </div>
      <button class="slide-arrow left" @click="prev" aria-label="Trước"><i class="bi bi-chevron-left"></i></button>
      <button class="slide-arrow right" @click="next" aria-label="Sau"><i class="bi bi-chevron-right"></i></button>
      <div class="slide-dots">
        <button v-for="(s, i) in slides" :key="i" :class="{ active: i === current }" @click="go(i)" :aria-label="`Slide ${i + 1}`"></button>
      </div>
      <!-- Decorative floating badge -->
      <div class="hero-float-badge d-none d-md-flex">
        <div class="hfb-inner">
          <i class="bi bi-shield-check"></i>
          <div>
            <strong>Chính hãng 100%</strong>
            <span>Hoàn tiền nếu giả</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== SERVICES BAR ====== -->
    <section class="services-wrap container-fluid px-4">
      <div class="services">
        <div class="service">
          <div class="svc-ic" style="background: linear-gradient(135deg,#1a3a6b,#3b6fb5)"><i class="bi bi-truck"></i></div>
          <div><h6>Giao hỏa tốc 24h</h6><p>Nội thành Hà Nội, tính giá theo km.</p></div>
        </div>
        <div class="service">
          <div class="svc-ic" style="background: linear-gradient(135deg,#ff5a1f,#ff477e)"><i class="bi bi-arrow-repeat"></i></div>
          <div><h6>Đổi trả 14 ngày</h6><p>Hỗ trợ trả qua shipper hoặc bưu cục.</p></div>
        </div>
        <div class="service">
          <div class="svc-ic" style="background: linear-gradient(135deg,#0ea679,#3b6fb5)"><i class="bi bi-shield-check"></i></div>
          <div><h6>Chính hãng 100%</h6><p>Hoàn tiền gấp 10 lần nếu phát hiện giả.</p></div>
        </div>
        <div class="service">
          <div class="svc-ic" style="background: linear-gradient(135deg,#7dacd4,#1a3a6b)"><i class="bi bi-headset"></i></div>
          <div><h6>Hỗ trợ 9–21h</h6><p>Hotline / Zalo: 0375.990.871.</p></div>
        </div>
      </div>
    </section>

    <!-- ====== CATEGORIES ====== -->
    <section class="container-fluid px-4 py-5">
      <div class="sec-head">
        <div>
          <div class="sec-accent"></div>
          <h2 class="sec-title">Chọn theo bộ môn</h2>
          <p class="sec-sub">Từ chạy bộ đến bóng rổ — chúng tôi có tất cả.</p>
        </div>
        <router-link to="/products" class="btn-sg-outline d-none d-md-inline-flex">
          Tất cả <i class="bi bi-arrow-right ms-1"></i>
        </router-link>
      </div>
      <div class="row g-4">
        <div class="col-6 col-lg-3" v-for="cat in categories.slice(0, 4)" :key="cat.id_category">
          <router-link :to="`/products?category=${cat.id_category}`" class="cat-card">
            <img :src="getCategoryImage(cat.id_category)" :alt="cat.category_name">
            <div class="cat-overlay">
              <span v-if="cat.sport" class="cat-sport-tag">{{ cat.sport }}</span>
              <h4>{{ cat.category_name }}</h4>
              <span class="cat-go">Khám phá <i class="bi bi-arrow-right"></i></span>
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <!-- ====== FEATURED PRODUCTS ====== -->
    <section class="container-fluid px-4 pb-5">
      <div class="sec-head">
        <div>
          <div class="sec-accent"></div>
          <h2 class="sec-title">Sản phẩm nổi bật</h2>
          <p class="sec-sub">Những mẫu giày hot nhất tuần qua.</p>
        </div>
        <router-link to="/products" class="btn-sg-outline d-none d-md-inline-flex">
          Xem tất cả <i class="bi bi-arrow-right ms-1"></i>
        </router-link>
      </div>
      <div v-if="isLoading" class="text-center py-5">
        <div class="spinner-border" style="color:var(--sg-navy)"></div>
        <p class="mt-2 fw-semibold text-secondary">Đang nạp cơ sở dữ liệu…</p>
      </div>
      <div v-else class="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-4">
        <div class="col fade-in-up" v-for="(product, i) in featuredProducts" :key="product.id_product" :style="`animation-delay:${i * 0.06}s`">
          <ShoeCard :product="product" />
        </div>
      </div>
    </section>

    <!-- ====== BRAND STRIP ====== -->
    <section class="brand-strip-wrap container-fluid px-4 pb-5">
      <div class="brand-strip">
        <span class="brand-strip-label">Thương hiệu chính hãng</span>
        <div class="brand-strip-logos">
          <span v-for="b in ['Nike', 'Adidas', 'Puma', 'New Balance', 'Converse', 'Vans']" :key="b" class="brand-name-tag">{{ b }}</span>
        </div>
      </div>
    </section>

    <!-- ====== CTA BANNER ====== -->
    <section class="container-fluid px-4 pb-5">
      <div class="cta-banner">
        <div class="cta-bg-deco"></div>
        <div class="cta-content">
          <div class="cta-tag"><i class="bi bi-gift-fill"></i> Ưu đãi thành viên mới</div>
          <h3>Đăng ký hôm nay — nhận ngay <span class="cta-highlight">giảm 30%</span></h3>
          <p>Cùng hàng ngàn ưu đãi độc quyền cho thành viên mới của ShoeGroup.</p>
          <div class="cta-actions">
            <router-link to="/register" class="btn-cta-primary">
              <i class="bi bi-person-plus me-2"></i>Đăng ký ngay
            </router-link>
            <router-link to="/products" class="btn-cta-ghost">Xem sản phẩm</router-link>
          </div>
        </div>
        <!-- Decorative shoe silhouette -->
        <div class="cta-deco-shoe">
          <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 90 H175 Q185 90 185 98 Q185 108 175 108 H30 Q20 108 20 98 Z" fill="white" fill-opacity="0.08"/>
            <path d="M26 90 L30 58 Q34 38 54 34 L63 50 L80 42 L128 60 Q148 66 150 80 L152 90 Z" fill="white" fill-opacity="0.10"/>
            <path d="M30 90 L32 62 Q35 44 52 38 L60 54 L77 46 L125 63 Q143 69 145 80 L147 90 Z" fill="white" fill-opacity="0.07"/>
            <path d="M38 78 Q80 64 152 54" stroke="white" stroke-width="5" stroke-linecap="round" stroke-opacity="0.15"/>
          </svg>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
.home { background: var(--sg-canvas); }

/* ====== Hero ====== */
.hero-slider { position: relative; overflow: hidden; height: 520px; background: var(--sg-navy-deep, #112447); }
.slides { display: flex; height: 100%; transition: transform .65s cubic-bezier(.4,0,.2,1); }
.slide { position: relative; min-width: 100%; height: 100%; }
.slide img { width: 100%; height: 100%; object-fit: cover; display: block; }
.slide-shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(10,28,62,.92) 0%, rgba(26,58,107,.7) 40%, rgba(26,58,107,.3) 70%, transparent 100%); }
.slide-caption { position: absolute; top: 50%; left: 7%; transform: translateY(-50%); max-width: 580px; color: #fff; }

.hero-tag {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(125,172,212,.2);
  border: 1px solid rgba(125,172,212,.35);
  color: #a8d4f0;
  font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
  padding: .35rem 1rem;
  border-radius: 999px;
  backdrop-filter: blur(6px);
}
.hero-title {
  font-weight: 900;
  font-size: clamp(2rem, 4.5vw, 3.8rem);
  line-height: 1.02;
  letter-spacing: -.025em;
  margin: 18px 0 12px;
  text-shadow: 0 2px 20px rgba(0,0,0,.3);
}
.hero-sub { color: rgba(255,255,255,.85); font-size: 1.05rem; max-width: 460px; line-height: 1.65; margin-bottom: 28px; }
.hero-cta { display: flex; gap: 12px; flex-wrap: wrap; }

.btn-hero-primary {
  display: inline-flex; align-items: center;
  background: #fff; color: var(--sg-navy, #1a3a6b);
  font-weight: 800; font-size: .95rem;
  padding: .75rem 1.8rem; border-radius: 999px;
  text-decoration: none;
  box-shadow: 0 10px 30px rgba(0,0,0,.2);
  transition: all .25s;
}
.btn-hero-primary:hover { color: var(--sg-navy); transform: translateY(-3px); box-shadow: 0 16px 40px rgba(0,0,0,.28); }

.btn-hero-ghost {
  display: inline-flex; align-items: center;
  background: rgba(255,255,255,.1);
  border: 1.5px solid rgba(255,255,255,.45);
  color: #fff; font-weight: 700; font-size: .95rem;
  padding: .73rem 1.6rem; border-radius: 999px;
  text-decoration: none;
  backdrop-filter: blur(4px);
  transition: all .25s;
}
.btn-hero-ghost:hover { background: rgba(255,255,255,.18); color: #fff; transform: translateY(-3px); }

/* Arrow buttons */
.slide-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 50px; height: 50px; border-radius: 14px; border: 0; background: rgba(255,255,255,.9); color: var(--sg-navy, #1a3a6b); font-size: 1.2rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(0,0,0,.15); transition: .2s; z-index: 3; }
.slide-arrow:hover { background: #fff; transform: translateY(-50%) scale(1.08); }
.slide-arrow.left { left: 22px; }
.slide-arrow.right { right: 22px; }

/* Dots */
.slide-dots { position: absolute; bottom: 22px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; z-index: 3; }
.slide-dots button { width: 10px; height: 10px; border-radius: 999px; border: 0; background: rgba(255,255,255,.45); transition: .25s; cursor: pointer; }
.slide-dots button.active { width: 32px; background: #fff; }

/* Floating badge */
.hero-float-badge { position: absolute; right: 40px; bottom: 30px; background: rgba(255,255,255,.12); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,.2); border-radius: 16px; padding: 12px 16px; z-index: 3; }
.hfb-inner { display: flex; align-items: center; gap: 10px; color: #fff; }
.hfb-inner i { font-size: 1.5rem; color: #7dacd4; }
.hfb-inner strong { display: block; font-size: .88rem; font-weight: 800; }
.hfb-inner span { font-size: .72rem; color: rgba(255,255,255,.7); }

/* ====== Services ====== */
.services-wrap { margin-top: -54px; position: relative; z-index: 5; }
.services { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; background: #fff; border: 1px solid var(--sg-line); border-radius: 22px; padding: 24px; box-shadow: var(--sg-shadow); }
.service { display: flex; gap: 14px; align-items: center; }
.svc-ic { width: 52px; height: 52px; flex-shrink: 0; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #fff; }
.service h6 { font-weight: 800; margin: 0; font-size: .92rem; color: var(--sg-ink); }
.service p { font-size: .8rem; color: var(--sg-muted); margin: 3px 0 0; }

/* ====== Section headings ====== */
.sec-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 28px; gap: 16px; }
.sec-accent { width: 50px; height: 4px; border-radius: 999px; background: linear-gradient(90deg, #1a3a6b, #7dacd4); margin-bottom: 10px; }
.sec-title { font-weight: 900; font-size: 1.9rem; letter-spacing: -.02em; margin: 0; color: var(--sg-ink); }
.sec-sub { font-size: .9rem; color: var(--sg-muted); margin: 4px 0 0; }

/* ====== Category cards ====== */
.cat-card { display: block; position: relative; border-radius: 22px; overflow: hidden; aspect-ratio: 3/4; box-shadow: var(--sg-shadow-sm); transition: box-shadow .3s; }
.cat-card:hover { box-shadow: var(--sg-shadow); }
.cat-card img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
.cat-card:hover img { transform: scale(1.08); }
.cat-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 35%, rgba(10,28,62,.9) 100%); display: flex; flex-direction: column; justify-content: flex-end; padding: 22px; color: #fff; }
.cat-sport-tag { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; background: rgba(125,172,212,.25); border: 1px solid rgba(125,172,212,.3); align-self: flex-start; padding: .2rem .65rem; border-radius: 999px; margin-bottom: 8px; color: #c8e4f8; }
.cat-overlay h4 { font-weight: 900; margin: 0; font-size: 1.15rem; }
.cat-go { font-size: .84rem; color: #7dacd4; font-weight: 700; opacity: 0; transform: translateY(8px); transition: .3s; margin-top: 6px; }
.cat-card:hover .cat-go { opacity: 1; transform: translateY(0); }

/* ====== Brand strip ====== */
.brand-strip { background: #fff; border: 1px solid var(--sg-line); border-radius: 20px; padding: 20px 28px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap; box-shadow: var(--sg-shadow-sm); }
.brand-strip-label { font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--sg-muted); flex-shrink: 0; border-right: 1.5px solid var(--sg-line); padding-right: 20px; }
.brand-strip-logos { display: flex; flex-wrap: wrap; gap: 10px; }
.brand-name-tag { background: var(--sg-canvas); border: 1px solid var(--sg-line); border-radius: 10px; padding: .4rem 1rem; font-weight: 800; font-size: .88rem; color: var(--sg-navy, #1a3a6b); letter-spacing: -.01em; transition: all .2s; cursor: default; }
.brand-name-tag:hover { background: var(--sg-navy, #1a3a6b); color: #fff; border-color: transparent; transform: translateY(-2px); }

/* ====== CTA ====== */
.cta-banner { background: linear-gradient(135deg, #0a1c3e 0%, #1a3a6b 55%, #235da6 100%); border-radius: 28px; padding: 56px 52px; color: #fff; overflow: hidden; position: relative; box-shadow: 0 24px 64px rgba(26,58,107,.35); }
.cta-bg-deco { position: absolute; top: -80px; right: -80px; width: 320px; height: 320px; border-radius: 50%; background: rgba(125,172,212,.08); }
.cta-content { position: relative; z-index: 2; max-width: 600px; }
.cta-tag { display: inline-flex; align-items: center; gap: 7px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2); padding: .3rem 1rem; border-radius: 999px; font-size: .8rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; margin-bottom: 18px; }
.cta-content h3 { font-weight: 900; font-size: 2rem; letter-spacing: -.02em; margin-bottom: 12px; }
.cta-highlight { background: linear-gradient(90deg, #7dacd4, #a8e4ff); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.cta-content p { color: rgba(255,255,255,.78); font-size: 1rem; margin-bottom: 28px; }
.cta-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.btn-cta-primary { display: inline-flex; align-items: center; background: #fff; color: var(--sg-navy, #1a3a6b); font-weight: 800; padding: .78rem 1.9rem; border-radius: 999px; text-decoration: none; transition: all .25s; box-shadow: 0 8px 24px rgba(0,0,0,.2); }
.btn-cta-primary:hover { color: var(--sg-navy); transform: translateY(-3px); box-shadow: 0 16px 36px rgba(0,0,0,.28); }
.btn-cta-ghost { display: inline-flex; align-items: center; background: rgba(255,255,255,.1); border: 1.5px solid rgba(255,255,255,.4); color: #fff; font-weight: 700; padding: .76rem 1.7rem; border-radius: 999px; text-decoration: none; backdrop-filter: blur(4px); transition: all .25s; }
.btn-cta-ghost:hover { background: rgba(255,255,255,.18); color: #fff; transform: translateY(-3px); }

.cta-deco-shoe { position: absolute; right: 48px; top: 50%; transform: translateY(-50%); width: 240px; opacity: .6; z-index: 1; }
.cta-deco-shoe svg { width: 100%; }

/* ====== Responsive ====== */
@media (max-width: 991px) {
  .services { grid-template-columns: repeat(2,1fr); margin-top: 24px; }
  .hero-slider { height: 400px; }
  .slide-caption { left: 5%; right: 5%; }
  .cta-banner { padding: 40px 32px; }
  .cta-deco-shoe { display: none; }
}
@media (max-width: 576px) {
  .services { grid-template-columns: 1fr; }
  .hero-slider { height: 320px; }
  .slide-arrow { width: 42px; height: 42px; }
  .hero-title { font-size: 1.8rem; }
  .cta-banner { padding: 32px 22px; }
  .cta-content h3 { font-size: 1.55rem; }
}
</style>
