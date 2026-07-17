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

/* ---- Hero slideshow: nhiều ảnh trượt ngang, có mũi tên chuyển ---- */
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
    // Fallback demo data so the redesign is fully previewable without the backend.
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
  // Hiện popup ưu đãi (tôn trọng lựa chọn "ẩn trong 24h" của khách).
  setTimeout(() => maybeOpenPromo(), 700)
})
onUnmounted(stopAuto)
</script>

<template>
  <div class="home">
    <!-- HERO SLIDESHOW -->
    <section class="hero-slider" @mouseenter="stopAuto" @mouseleave="startAuto">
      <div class="slides" :style="{ transform: `translateX(-${current * 100}%)` }">
        <div class="slide" v-for="(s, i) in slides" :key="i">
          <img :src="s.img" :alt="s.title">
          <div class="slide-shade"></div>
          <div class="slide-caption">
            <span class="sg-chip hero-chip"><i class="bi bi-lightning-charge-fill"></i> {{ s.tag }}</span>
            <h1 class="hero-title">{{ s.title }}</h1>
            <p class="hero-sub">{{ s.sub }}</p>
          </div>
        </div>
      </div>
      <button class="slide-arrow left" @click="prev" aria-label="Trước"><i class="bi bi-chevron-left"></i></button>
      <button class="slide-arrow right" @click="next" aria-label="Sau"><i class="bi bi-chevron-right"></i></button>
      <div class="slide-dots">
        <button v-for="(s, i) in slides" :key="i" :class="{ active: i === current }" @click="go(i)" :aria-label="`Slide ${i + 1}`"></button>
      </div>
    </section>

    <!-- SERVICES -->
    <section class="container-fluid px-4">
      <div class="services">
        <div class="service"><div class="svc-ic blue"><i class="bi bi-truck"></i></div><div><h6>Giao hỏa tốc 24h</h6><p>Nội thành Hà Nội, tính giá theo km.</p></div></div>
        <div class="service"><div class="svc-ic warm"><i class="bi bi-arrow-repeat"></i></div><div><h6>Đổi trả 14 ngày</h6><p>Hỗ trợ trả hàng qua shipper hoặc bưu cục.</p></div></div>
        <div class="service"><div class="svc-ic lime"><i class="bi bi-shield-check"></i></div><div><h6>Chính hãng 100%</h6><p>Hoàn tiền gấp 10 lần nếu phát hiện giả.</p></div></div>
        <div class="service"><div class="svc-ic cyan"><i class="bi bi-headset"></i></div><div><h6>Hỗ trợ 9-21h</h6><p>Hotline / Zalo: 0375.990.871.</p></div></div>
      </div>
    </section>

    <!-- CATEGORIES -->
    <section class="container-fluid px-4 py-5">
      <div class="sec-head">
        <div>
          <div class="sg-title-bar mb-2"></div>
          <h2 class="sec-title">Chọn theo bộ môn</h2>
        </div>
        <router-link to="/products" class="btn-sg-outline d-none d-md-inline-flex">Tất cả <i class="bi bi-arrow-right ms-1"></i></router-link>
      </div>
      <div class="row g-4">
        <div class="col-6 col-lg-3" v-for="cat in categories.slice(0, 4)" :key="cat.id_category">
          <router-link :to="`/products?category=${cat.id_category}`" class="cat-card">
            <img :src="getCategoryImage(cat.id_category)" :alt="cat.category_name">
            <div class="cat-overlay">
              <span v-if="cat.sport" class="cat-sport">{{ cat.sport }}</span>
              <h4>{{ cat.category_name }}</h4>
              <span class="cat-go">Khám phá <i class="bi bi-arrow-right"></i></span>
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <!-- FEATURED -->
    <section class="container-fluid px-4 pb-5">
      <div class="sec-head">
        <div>
          <div class="sg-title-bar mb-2"></div>
          <h2 class="sec-title">Sản phẩm nổi bật</h2>
          <p class="text-secondary mb-0">Những mẫu giày hot nhất tuần qua.</p>
        </div>
        <router-link to="/products" class="btn-sg-outline d-none d-md-inline-flex">Xem tất cả <i class="bi bi-arrow-right ms-1"></i></router-link>
      </div>

      <div v-if="isLoading" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
        <p class="mt-2 fw-semibold text-secondary">Đang nạp cơ sở dữ liệu…</p>
      </div>
      <div v-else class="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-4">
        <div class="col fade-in-up" v-for="(product, i) in featuredProducts" :key="product.id_product" :style="`animation-delay:${i * 0.06}s`">
          <ShoeCard :product="product" />
        </div>
      </div>
    </section>

    <!-- CTA BANNER -->
    <section class="container-fluid px-4 pb-5">
      <div class="cta-banner">
        <div class="cta-content">
          <h3>Đăng ký thành viên — nhận ngay <span class="hero-grad">giảm 30%</span></h3>
          <p>Cùng hàng ngàn ưu đãi độc quyền cho thành viên mới của ShoeGroup.</p>
          <router-link to="/register" class="btn-sg-warm"><i class="bi bi-person-plus me-2"></i>Đăng ký ngay</router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home { background: var(--sg-canvas); }

/* Hero slideshow */
.hero-slider { position: relative; overflow: hidden; height: 460px; background: var(--sg-ink); }
.slides { display: flex; height: 100%; transition: transform .6s cubic-bezier(.4,0,.2,1); }
.slide { position: relative; min-width: 100%; height: 100%; }
.slide img { width: 100%; height: 100%; object-fit: cover; display: block; }
.slide-shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(15,23,42,.85) 0%, rgba(15,23,42,.5) 45%, transparent 80%); }
.slide-caption { position: absolute; top: 50%; left: 6%; transform: translateY(-50%); max-width: 560px; color: #fff; }
.hero-chip { background: rgba(255,255,255,.16); color: #fff; backdrop-filter: blur(6px); }
.hero-title { font-weight: 900; font-size: clamp(2rem, 4.5vw, 3.6rem); line-height: 1; letter-spacing: -.02em; margin: 16px 0; }
.hero-sub { color: rgba(255,255,255,.9); font-size: 1.05rem; max-width: 480px; }
.slide-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 48px; height: 48px; border-radius: 50%; border: 0; background: rgba(255,255,255,.9); color: var(--sg-ink); font-size: 1.3rem; display: flex; align-items: center; justify-content: center; box-shadow: var(--sg-shadow); transition: .2s; z-index: 3; }
.slide-arrow:hover { background: #fff; transform: translateY(-50%) scale(1.08); }
.slide-arrow.left { left: 18px; }
.slide-arrow.right { right: 18px; }
.slide-dots { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; z-index: 3; }
.slide-dots button { width: 10px; height: 10px; border-radius: 999px; border: 0; background: rgba(255,255,255,.5); transition: .2s; cursor: pointer; }
.slide-dots button.active { width: 28px; background: #fff; }
.hero-grad { background: linear-gradient(90deg,#a3e635,#22d3ee,#ffd7e2); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }

/* Services */
.services { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; background: #fff; border: 1px solid var(--sg-line); border-radius: 22px; padding: 22px; margin-top: -50px; position: relative; z-index: 3; box-shadow: var(--sg-shadow); }
.service { display: flex; gap: 14px; align-items: center; }
.svc-ic { width: 52px; height: 52px; flex-shrink: 0; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #fff; }
.svc-ic.blue { background: var(--sg-grad-primary); } .svc-ic.warm { background: var(--sg-grad-warm); } .svc-ic.lime { background: linear-gradient(135deg,#84cc16,#22c55e); } .svc-ic.cyan { background: linear-gradient(135deg,#06b6d4,#3b82f6); }
.service h6 { font-weight: 800; margin: 0; }
.service p { font-size: .82rem; color: var(--sg-muted); margin: 0; }

/* Section head */
.sec-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 28px; gap: 16px; }
.sec-title { font-weight: 900; font-size: 1.9rem; letter-spacing: -.02em; margin: 0; }

/* Category cards */
.cat-card { display: block; position: relative; border-radius: 22px; overflow: hidden; aspect-ratio: 3/4; box-shadow: var(--sg-shadow-sm); }
.cat-card img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
.cat-card:hover img { transform: scale(1.1); }
.cat-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 30%, rgba(15,23,42,.85) 100%); display: flex; flex-direction: column; justify-content: flex-end; padding: 20px; color: #fff; }
.cat-sport { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; background: rgba(255,255,255,.2); align-self: flex-start; padding: .2rem .6rem; border-radius: 999px; margin-bottom: 8px; }
.cat-overlay h4 { font-weight: 900; margin: 0; }
.cat-go { font-size: .85rem; color: var(--sg-cyan); font-weight: 700; opacity: 0; transform: translateY(8px); transition: .3s; }
.cat-card:hover .cat-go { opacity: 1; transform: translateY(0); }

/* CTA */
.cta-banner { background: var(--sg-grad-sport); border-radius: 26px; padding: 48px; color: #fff; text-align: center; box-shadow: var(--sg-shadow-lg); }
.cta-content h3 { font-weight: 900; font-size: 1.9rem; }
.cta-content p { color: rgba(255,255,255,.85); margin-bottom: 22px; }

@media (max-width: 991px) { .services { grid-template-columns: repeat(2, 1fr); margin-top: 24px; } .hero-slider { height: 360px; } .slide-caption { left: 5%; right: 5%; } }
@media (max-width: 576px) { .services { grid-template-columns: 1fr; } .hero-slider { height: 300px; } .slide-arrow { width: 40px; height: 40px; } }
</style>
