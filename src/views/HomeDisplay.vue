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
  const url = prod?.image_url
  if (url && (url.startsWith('http') || url.startsWith('/img') || url.startsWith('data:'))) {
    return url
  }
  return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800'
}

/* ---- Hero slideshow: nhiều ảnh trượt ngang, có mũi tên chuyển ---- */
const slides = [
  { img: 'https://images.unsplash.com/photo-1605348532760-6753d2c43329?auto=format&fit=crop&q=100&w=2560', tag: 'Bộ sưu tập 2026', title: 'BỨT PHÁ TỪNG BƯỚC CHẠY', sub: 'Giày thể thao nam chính hãng — công nghệ đệm tiên tiến, thiết kế bứt phá.' },
  { img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=100&w=2560', tag: 'Running Series', title: 'NHẸ HƠN. NHANH HƠN.', sub: 'Chinh phục mọi đường chạy với đế đệm phản hồi năng lượng cao.' },
  { img: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&q=100&w=2560', tag: 'Minimalist', title: 'TỐI GIẢN & ĐẲNG CẤP', sub: 'Thiết kế tinh gọn, tập trung vào hiệu năng và sự thoải mái tuyệt đối.' },
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
    categories.value = dataCat
      .filter((c) => c.active && c.name.toLowerCase() !== 'giày nam' && c.name.toLowerCase() !== 'tất cả')
      .map((c) => ({
        id_category: c.id, category_name: c.name, sport: c.sport,
      }))
  } catch (error) {
    products.value = mockProducts.map((p) => ({ ...p, category_name: mockCats.find((c) => c.id_category === p.id_category)?.category_name }))
    categories.value = mockCats.filter((c) => c.category_name.toLowerCase() !== 'giày nam' && c.category_name.toLowerCase() !== 'tất cả')
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
          <!-- No slide shade -->
          <div class="slide-caption">
            <span class="hero-chip" style="text-transform: uppercase;">{{ s.tag }}</span>
            <h1 class="hero-title">{{ s.title }}</h1>
            <p class="hero-sub">{{ s.sub }}</p>
            <div class="hero-cta">
              <router-link to="/products" class="btn-hero-primary">
                Khám phá ngay
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
    </section>

    <!-- SERVICES -->
    <section class="services-wrap">
      <div class="services">
        <div class="service">
          <i class="bi bi-truck"></i>
          <div><h6>Giao hỏa tốc 24h</h6><p>Nội thành Hà Nội</p></div>
        </div>
        <div class="service">
          <i class="bi bi-arrow-repeat"></i>
          <div><h6>Đổi trả 14 ngày</h6><p>Miễn phí đổi trả</p></div>
        </div>
        <div class="service">
          <i class="bi bi-shield-check"></i>
          <div><h6>Chính hãng 100%</h6><p>Cam kết hoàn tiền</p></div>
        </div>
        <div class="service">
          <i class="bi bi-headset"></i>
          <div><h6>Hỗ trợ 9–21h</h6><p>0375.990.871</p></div>
        </div>
      </div>
    </section>

    <!-- CATEGORIES -->
    <section class="container-fluid px-4 py-5">
      <div class="sec-head">
        <div>
          <div class="sg-title-bar mb-2"></div>
          <h2 class="sec-title">CHỌN THEO BỘ MÔN</h2>
          <p class="sec-sub">Từ chạy bộ đến bóng rổ — chúng tôi có tất cả.</p>
        </div>
        <router-link to="/products" class="btn-sg-outline d-none d-md-inline-flex">Tất cả sản phẩm <i class="bi bi-arrow-right ms-1"></i></router-link>
      </div>
      <div class="row g-4">
        <div class="col-6 col-lg-3" v-for="cat in categories" :key="cat.id_category">
          <router-link :to="`/products?category=${cat.id_category}`" class="cat-card">
            <img :src="getCategoryImage(cat.id_category)" :alt="cat.category_name" @error="$event.target.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800'">
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
          <h3>Đăng ký thành viên — nhận ngay <span class="text-danger">giảm 30%</span></h3>
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
.hero-slider { position: relative; overflow: hidden; height: calc(100vh - 120px); min-height: 480px; max-height: 600px; background: #000; }
.slides { display: flex; height: 100%; transition: transform .8s cubic-bezier(0.25, 1, 0.5, 1); }
.slide { position: relative; min-width: 100%; height: 100%; }
.slide img { width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0.85; }
.slide-caption { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; max-width: 800px; text-align: center; color: #fff; display: flex; flex-direction: column; align-items: center; padding: 0 20px; z-index: 2; }
.hero-chip { background: transparent; color: #fff; display: inline-block; padding: 0 0 6px 0; border-bottom: 2px solid #fff; margin-bottom: 20px; font-size: 0.85rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; }
.hero-title { font-weight: 900; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.1; letter-spacing: -0.03em; margin: 0 0 20px 0; text-transform: uppercase; }
.hero-sub { color: rgba(255,255,255,.9); font-size: 1.1rem; max-width: 540px; margin-bottom: 32px; font-weight: 400; }
.hero-cta { display: flex; justify-content: center; gap: 12px; }
.btn-hero-primary { background: #000; color: #fff; padding: 16px 36px; border-radius: 0px; font-weight: 700; text-decoration: none; display: inline-block; transition: background-color .3s ease; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.9rem; border: 1px solid #000; }
.btn-hero-primary:hover { background: #fff; color: #000; border-color: #fff; }

.slide-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 56px; height: 56px; border-radius: 0; border: 1px solid rgba(255,255,255,0.4); background: transparent; color: #fff; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; transition: all .3s ease; z-index: 3; }
.slide-arrow:hover { background: #fff; color: #000; border-color: #fff; }
.slide-arrow.left { left: 18px; }
.slide-arrow.right { right: 18px; }
.slide-dots { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 12px; z-index: 3; }
.slide-dots button { width: 24px; height: 2px; border-radius: 0; border: 0; background: rgba(255,255,255,.4); transition: background .3s; cursor: pointer; padding: 0; }
.slide-dots button.active { background: #fff; }

/* Services */
.services-wrap { padding: 0 1.5rem; }
.services { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; background: #fff; border: 1px solid var(--sg-line); border-radius: 0px; padding: 32px 22px; margin-top: 0; position: relative; z-index: 3; box-shadow: none; }
.service { display: flex; gap: 14px; align-items: center; }
.service i { font-size: 1.8rem; color: var(--sg-ink); }
.service h6 { font-weight: 800; margin: 0; }
.service p { font-size: .82rem; color: var(--sg-muted); margin: 0; }

/* Section head */
.sec-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 28px; gap: 16px; }
.sec-title { font-weight: 900; font-size: 1.9rem; letter-spacing: -.02em; margin: 0; }
.sec-sub { color: var(--sg-muted); margin: 4px 0 0; }

/* Category cards */
.cat-card { display: block; position: relative; border-radius: 0px; overflow: hidden; aspect-ratio: 3/4; border: 1px solid var(--sg-line); }
.cat-card img { width: 100%; height: 100%; object-fit: cover; transition: transform .8s ease; }
.cat-card:hover img { transform: scale(1.05); }
.cat-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.2); display: flex; flex-direction: column; justify-content: flex-end; padding: 24px; color: #fff; transition: background .3s ease; }
.cat-card:hover .cat-overlay { background: rgba(0,0,0,0.4); }
.cat-sport { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; background: #000; color: #fff; align-self: flex-start; padding: .4rem .8rem; margin-bottom: 12px; }
.cat-overlay h4 { font-weight: 900; margin: 0; font-size: 1.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
.cat-go { font-size: .85rem; color: #fff; font-weight: 700; opacity: 0; transform: translateY(8px); transition: .3s; text-decoration: underline; margin-top: 8px; }
.cat-card:hover .cat-go { opacity: 1; transform: translateY(0); }

/* CTA */
.cta-banner { background: #000; border-radius: 0px; padding: 64px 48px; color: #fff; text-align: center; border: 1px solid #000; }
.cta-content h3 { font-weight: 900; font-size: 1.9rem; }
.cta-content p { color: rgba(255,255,255,.85); margin-bottom: 22px; }

@media (max-width: 991px) { .services { grid-template-columns: repeat(2, 1fr); } .hero-slider { height: 360px; min-height: 280px; } .slide-caption { left: 5%; right: 5%; } }
@media (max-width: 576px) { .services { grid-template-columns: 1fr; } .hero-slider { height: 280px; min-height: 220px; } .slide-arrow { width: 40px; height: 40px; } }
</style>
