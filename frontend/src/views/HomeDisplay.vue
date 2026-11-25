<!-- Mục đích: Trang chủ sneaker với banner editorial, carousel, thương hiệu và danh mục từ dữ liệu hiện có. -->
<template>
  <div class="home-page" :class="{ 'motion-paused': heroMotionPaused }">
    <section
      class="hero-section"
      aria-label="Bộ sưu tập nổi bật"
      @mouseenter="onHeroEnter"
      @mouseleave="onHeroLeave"
      @focusin="onHeroFocusIn"
      @focusout="onHeroFocusOut"
    >
      <div
        ref="heroViewport"
        class="hero-viewport"
        tabindex="0"
        role="region"
        aria-roledescription="carousel"
        aria-label="Banner bộ sưu tập, dùng phím mũi tên để chuyển"
        @keydown.left.prevent="prevSlide(true)"
        @keydown.right.prevent="nextSlide(true)"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
        @dragstart.prevent
        @click.capture="onHeroClickCapture"
        :style="{ cursor: isDragging ? 'grabbing' : 'grab' }"
      >
        <div
          ref="heroTrack"
          class="hero-track"
          :class="{ 'is-transitioning': !isDragging && isTransitioning }"
          @transitionend="onTrackTransitionEnd"
          :style="{
            transform: `translateX(${trackOffset}px)`,
            gap: heroGap + 'px',
            '--hero-slide-duration': SLIDE_DURATION + 'ms',
          }"
        >
          <article
            v-for="(slide, i) in displaySlides"
            :key="slide._key"
            class="hero-slide"
            :class="{
              'is-active': i === currentIndex,
              'hero-slide-featured': slide.type !== 'video',
              'hero-slide-street': slide.theme === 'street',
              'hero-slide-running': slide.theme === 'running',
              'hero-slide-court': slide.theme === 'court',
            }"
            :style="{ width: slideWidth + 'px' }"
            :aria-hidden="i !== currentIndex"
            @click="handleSlideClick(i, slide)"
          >
            <template v-if="slide.type !== 'video'">
              <div class="hero-grid-pattern" aria-hidden="true"></div>
              <div class="hero-copy">
                <p class="section-kicker">
                  <span class="accent-line"></span> {{ slide.eyebrow }}
                </p>
                <component
                  :is="slide.realIdx === 0 ? 'h1' : 'h2'"
                  class="hero-headline"
                >
                  <span>{{ slide.title }}</span
                  ><span class="hero-word-outline">{{ slide.titleMiddle }}</span
                  ><span class="hero-word-accent">{{ slide.titleEm }}</span>
                </component>
                <p class="hero-intro">{{ slide.sub }}</p>
                <button
                  type="button"
                  class="store-cta"
                  :tabindex="i === currentIndex ? 0 : -1"
                  @click.stop="handleSlideClick(i, slide)"
                >
                  <span>{{ slide.cta }}</span
                  ><ArrowUpRight :size="19" aria-hidden="true" />
                </button>
                <button
                  v-if="slide.realIdx === 0"
                  type="button"
                  class="hero-secondary"
                  :tabindex="i === currentIndex ? 0 : -1"
                  @click.stop="goToProducts('new')"
                >
                  Xem hàng mới về <ArrowRight :size="16" aria-hidden="true" />
                </button>
              </div>
              <div
                class="hero-art"
                :class="slide.theme ? 'hero-art-' + slide.theme : ''"
              >
                <span
                  class="hero-orbit hero-orbit-outer"
                  aria-hidden="true"
                ></span
                ><span
                  class="hero-orbit hero-orbit-inner"
                  aria-hidden="true"
                ></span>
                <span class="hero-art-word" aria-hidden="true">{{
                  slide.artWord
                }}</span>
                <div class="hero-shoe-float">
                  <img
                    :src="slide.art"
                    :alt="slide.alt"
                    class="hero-shoe"
                    :fetchpriority="slide.realIdx === 0 ? 'high' : 'auto'"
                    :loading="
                      Math.abs(i - currentIndex) <= 1 ? 'eager' : 'lazy'
                    "
                    decoding="async"
                    @error="onImageError($event, slide.fallback)"
                    draggable="false"
                  />
                </div>
                <span class="hero-art-caption">SNEAKERS. CULTURE. YOU.</span>
                <span class="hero-art-stamp"
                  ><ArrowUpRight :size="22" aria-hidden="true" /><span
                    >ĐẬM CHẤT<br />RIÊNG BẠN</span
                  ></span
                >
                <span class="hero-art-note"
                  ><span></span> {{ slide.artCaption }}</span
                >
              </div>
            </template>
            <template v-else>
              <video
                v-if="slide.type === 'video' && (i === currentIndex || i === outgoingHeroIndex)"
                :src="slide.src"
                :poster="slide.fallback"
                :autoplay="!heroMotionPaused"
                muted
                loop
                playsinline
                preload="metadata"
                @error="onVideoError($event, slide.fallback)"
                class="hero-cover"
              ></video>
              <img
                v-else
                :src="slide.img || slide.fallback"
                :alt="slide.alt || 'Bộ sưu tập ShoeGroup'"
                @error="onImageError($event, slide.fallback)"
                class="hero-cover"
                loading="lazy"
                draggable="false"
              />
              <div class="hero-cover-shade"></div>
              <div class="hero-campaign-copy">
                <p class="section-kicker">{{ slide.eyebrow }}</p>
                <h2>
                  {{ slide.title }}<span>{{ slide.titleEm }}</span>
                </h2>
                <p>{{ slide.sub }}</p>
                <button
                  type="button"
                  class="store-cta"
                  :tabindex="i === currentIndex ? 0 : -1"
                  @click.stop="handleSlideClick(i, slide)"
                >
                  <span>{{ slide.cta }}</span
                  ><ArrowUpRight :size="19" aria-hidden="true" />
                </button>
              </div>
            </template>
          </article>
        </div>
      </div>
      <div class="hero-bottom store-container">
        <span class="hero-bottom-caption"
          >ĐÔI GIÀY CỦA BẠN. CÂU CHUYỆN CỦA BẠN.</span
        >
        <div class="hero-controls">
          <button
            type="button"
            class="round-control"
            @click.stop="prevSlide(true)"
            @pointerdown.stop
            aria-label="Banner trước"
          >
            <ChevronLeft :size="18" aria-hidden="true" />
          </button>
          <div class="hero-dots">
            <button
              v-for="(slide, i) in heroSlides"
              :key="'dot' + i"
              type="button"
              @click="goToSlide(i)"
              @pointerdown.stop
              :aria-label="'Xem banner ' + (i + 1)"
              :aria-current="i === activeSlide ? 'true' : undefined"
              :class="{ active: i === activeSlide }"
            >
              <span></span>
            </button>
          </div>
          <button
            type="button"
            class="round-control"
            @click.stop="nextSlide(true)"
            @pointerdown.stop
            aria-label="Banner tiếp theo"
          >
            <ChevronRight :size="18" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="hero-motion-toggle"
            @click="toggleHeroMotion"
            :aria-label="
              heroMotionPaused
                ? 'Tiếp tục chuyển động và tự chuyển banner'
                : 'Tạm dừng chuyển động và tự chuyển banner'
            "
            :aria-pressed="heroMotionPaused"
          >
            <Play v-if="heroMotionPaused" :size="14" aria-hidden="true" /><Pause
              v-else
              :size="14"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </section>

    <section class="brand-strip" aria-label="Các thương hiệu sneaker">
      <div class="brand-strip-label">
        THƯƠNG HIỆU<br />BẠN YÊU THÍCH
        <ArrowUpRight :size="16" aria-hidden="true" />
      </div>
      <div class="brand-marquee-window">
        <div class="brand-marquee-track">
          <div
            v-for="loop in 2"
            :key="loop"
            class="brand-marquee-set"
            :aria-hidden="loop === 2"
          >
            <span
              v-for="brand in marqueeBrands"
              :key="brand.name"
              class="brand-marquee-item"
              ><span>{{ brand.name }}</span
              ><span class="brand-star" aria-hidden="true">✳</span></span
            >
          </div>
        </div>
      </div>
    </section>

    <section class="home-products-section store-container">
      <div class="section-heading">
        <div>
          <p class="section-kicker">ĐƯỢC CHỌN CHO BẠN</p>
          <h2>ĐANG ĐƯỢC <span class="accent-text">SĂN ĐÓN.</span></h2>
        </div>
        <button
          type="button"
          class="store-text-link"
          @click="goToProducts('all')"
        >
          Khám phá tất cả <ArrowUpRight :size="19" aria-hidden="true" />
        </button>
      </div>
      <FigmaProductGrid v-if="homeProducts.length" :columns="5"
        ><FigmaProductCard
          v-for="p in homeProducts"
          :key="p.id_product"
          :product="p"
      /></FigmaProductGrid>
      <div v-else class="home-products-empty">
        <StoreIllustration kind="search" />
        <h3>Bộ sưu tập đang được cập nhật</h3>
        <button
          type="button"
          class="store-text-link"
          @click="goToProducts('all')"
        >
          Khám phá cửa hàng <ArrowRight :size="16" aria-hidden="true" />
        </button>
      </div>
    </section>

    <section class="campaign-section">
      <div class="store-container">
        <div class="section-heading">
          <div>
            <p class="section-kicker">CHUYỂN ĐỘNG THEO CÁCH CỦA BẠN</p>
            <h2>
              MỌI NHỊP SỐNG.<br />
              <span class="outline-text">MỘT TINH THẦN.</span>
            </h2>
          </div>
          <p class="section-description">
            Từ đường chạy đến góc phố.<br />Tìm đôi giày dành cho khoảnh khắc
            của bạn.
          </p>
        </div>
        <div class="campaign-grid">
          <button
            v-for="(banner, i) in banners"
            :key="banner.title"
            type="button"
            class="campaign-card"
            :class="{ 'campaign-card-large': i === 0 }"
            @click="goToProducts(banner.filter)"
          >
            <img
              :src="banner.img"
              :alt="banner.alt"
              @error="onImageError($event, banner.fallback)"
              loading="lazy"
              decoding="async"
            />
            <div class="campaign-shade"></div>
            <div class="campaign-copy">
              <span class="campaign-eyebrow">{{ banner.eyebrow }}</span>
              <h3>
                {{ banner.title
                }}<span v-if="banner.titleEm">{{ banner.titleEm }}</span>
              </h3>
              <p>{{ banner.sub }}</p>
              <span class="campaign-cta"
                >{{ banner.cta }} <ArrowUpRight :size="19" aria-hidden="true"
              /></span>
            </div>
            <span class="campaign-corner" aria-hidden="true"
              ><ArrowUpRight :size="22"
            /></span>
          </button>
        </div>
      </div>
    </section>

    <section class="category-section store-container">
      <div class="section-heading">
        <div>
          <p class="section-kicker">CHỌN SÂN CHƠI CỦA BẠN</p>
          <h2>SẴN SÀNG <span class="accent-text">NHẬP CUỘC.</span></h2>
        </div>
        <button
          type="button"
          class="store-text-link"
          @click="goToProducts('all')"
        >
          Tất cả danh mục <ArrowUpRight :size="19" aria-hidden="true" />
        </button>
      </div>
      <div class="category-grid">
        <button
          v-for="cat in categoryCards"
          :key="cat.label"
          type="button"
          class="category-card"
          @click="goToProducts({ category: cat.categoryId, filter: cat.key })"
        >
          <div class="category-image">
            <img
              :src="cat.img"
              :alt="cat.label"
              @error="onImageError($event, cat.fallback)"
              loading="lazy"
              decoding="async"
            /><span class="category-image-arrow" aria-hidden="true"
              ><ArrowUpRight :size="24"
            /></span>
          </div>
          <div class="category-card-caption">
            <h3>{{ cat.label }}</h3>
            <span>{{ cat.count }}</span>
          </div>
        </button>
      </div>
    </section>

    <section class="trust-section">
      <div class="store-container trust-grid">
        <div v-for="item in trustItems" :key="item.title" class="trust-item">
          <div class="trust-icon">
            <svg
              width="25"
              height="25"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              v-html="trustIcons[item.icon]"
            ></svg>
          </div>
          <div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.sub }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="community-section">
      <div class="community-background" aria-hidden="true"></div>
      <div class="store-container community-grid">
        <div>
          <p class="section-kicker">SHOEGROUP COMMUNITY</p>
          <h2>CÙNG CHUNG<br />ĐAM MÊ.<span>CÙNG CHẤT RIÊNG.</span></h2>
          <p class="community-description">
            Nhận tin về bộ sưu tập mới và ưu đãi dành cho cộng đồng yêu sneaker.
          </p>
        </div>
        <div class="community-form">
          <ArrowUpRight
            :size="46"
            :stroke-width="1"
            class="community-arrow"
            aria-hidden="true"
          />
          <h3>Đừng bỏ lỡ nhịp tiếp theo.</h3>
          <form @submit.prevent="subscribe">
            <label for="community-email">ĐỊA CHỈ EMAIL CỦA BẠN</label>
            <div class="community-input-row">
              <input
                id="community-email"
                v-model="email"
                :disabled="subscribing"
                maxlength="100"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                aria-describedby="community-note"
              /><button
                type="submit"
                :disabled="subscribing"
                :aria-busy="subscribing"
                :aria-label="
                  subscribing ? 'Đang gửi yêu cầu' : 'Đăng ký nhận tin'
                "
              >
                <ArrowUpRight :size="24" aria-hidden="true" />
              </button>
            </div>
            <p id="community-note" aria-live="polite">
              {{
                subscribing
                  ? "Đang gửi yêu cầu nhận tin…"
                  : "Để lại email để nhận thông tin từ ShoeGroup."
              }}
            </p>
          </form>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import FigmaProductCard from "../components/figma/product/FigmaProductCard.vue";
import FigmaProductGrid from "../components/figma/product/FigmaProductGrid.vue";
import { api } from "../services/apiClient";
import { notify } from "../stores/uiStore";
import { homeMedia } from "../data/homeMedia";
import heroSneaker from "../../img/hero-sneaker-crimson.png";
import heroRunner from "../../img/hero-runner-crimson.png";
import heroCourt from "../../img/hero-court-crimson.png";
import heroStreet from "../../img/hero-street-crimson.png";
import StoreIllustration from "../components/StoreIllustration.vue";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-vue-next";

const marqueeBrands = [
  { name: "NIKE" },
  { name: "ADIDAS" },
  { name: "JORDAN" },
  { name: "NEW BALANCE" },
  { name: "CONVERSE" },
  { name: "PUMA" },
  { name: "VANS" },
  { name: "MLB KOREA" },
  { name: "ASICS" },
  { name: "REEBOK" },
];

const router = useRouter();
const email = ref("");
const subscribing = ref(false);
const products = ref([]);
const allProducts = ref([]);
const categoriesFromApi = ref([]);
const subscribe = async () => {
  if (subscribing.value) return;
  const value = email.value.trim();
  if (value.length > 100 || !/^\S+@\S+\.\S+$/.test(value)) {
    notify({
      type: "warning",
      title: "Email chưa hợp lệ",
      message: "Vui lòng nhập địa chỉ email để đăng ký nhận tin.",
    });
    return;
  }
  subscribing.value = true;
  try {
    const result = await api.post("/newsletter", { email: value });
    if (!result?.success)
      throw new Error(result?.message || "Chưa thể gửi yêu cầu nhận tin.");
    email.value = "";
    notify({
      type: "success",
      title: "Đã gửi yêu cầu",
      message: result.message || "Đã gửi yêu cầu nhận tin tới cửa hàng.",
    });
  } catch (error) {
    notify({
      type: "error",
      title: "Chưa gửi được yêu cầu",
      message: error.message || "Vui lòng thử lại sau.",
    });
  } finally {
    subscribing.value = false;
  }
};

const mapProduct = (p) => ({
  id_product: p.id_product ?? p.id,
  product_name: p.product_name ?? p.name,
  price: p.price,
  sale_price: p.sale_price,
  id_category: p.id_category ?? p.category_id,
  category_name: p.category_name ?? p.category,
  sport: p.sport,
  material_name: p.material_name,
  image_url: p.image_url ?? p.img,
  brand_name: p.brand_name ?? p.brand ?? "",
  id_brand: p.id_brand ?? p.brand_id ?? 1,
  variants: p.variants || [],
  colors: p.colors || [],
  is_new:
    p.is_new ??
    p.isNew ??
    p.new_arrival ??
    p.is_featured ??
    p.IsFeatured ??
    false,
  is_featured: p.is_featured ?? p.IsFeatured ?? false,
  tag: p.tag,
  f_sizes: (p.sizes || []).map((s) => String(s)),
  f_colors: (p.colors || []).map(
    (c) => c.name || c.color_label || c.color_name || c,
  ),
  total_stock: p.total_stock ?? p.stock ?? (p.id != null ? null : 24),
});

const loadData = async () => {
  try {
    const [featuredResult, allResult, categoryResult] =
      await Promise.allSettled([
        api.get("/v2/products/featured?limit=5"),
        api.get("/products"),
        api.get("/categories"),
      ]);
    const featuredPayload =
      featuredResult.status === "fulfilled" ? featuredResult.value : null;
    const allPayload =
      allResult.status === "fulfilled" ? allResult.value : null;
    const categoryPayload =
      categoryResult.status === "fulfilled" ? categoryResult.value : [];
    const featuredRows = Array.isArray(featuredPayload)
      ? featuredPayload
      : featuredPayload?.data || featuredPayload?.products || [];
    const allRows = Array.isArray(allPayload)
      ? allPayload
      : allPayload?.data || allPayload?.products || [];
    const cats = Array.isArray(categoryPayload)
      ? categoryPayload
      : categoryPayload?.data || categoryPayload?.categories || [];
    if (!allRows.length || !Array.isArray(cats))
      throw new Error("Dữ liệu API sản phẩm trống");
    allProducts.value = allRows
      .filter((p) => p.active !== false && p.active !== 0 && p.active !== "0")
      .map(mapProduct);
    const fullById = new Map(
      allRows.map((row) => [String(row.id ?? row.id_product), row]),
    );
    const featuredWithFullShape = featuredRows.map((row) => ({
      ...(fullById.get(String(row.id ?? row.id_product)) || {}),
      ...row,
    }));
    products.value = (featuredRows.length ? featuredWithFullShape : allRows)
      .filter((p) => p.active !== false && p.active !== 0 && p.active !== "0")
      .map(mapProduct)
      .slice(0, 5);
    categoriesFromApi.value = cats
      .filter((c) => c.active !== false && c.active !== 0 && c.active !== "0")
      .map((c) => ({
        id_category: c.id,
        category_name: c.name,
        sport: c.sport,
      }));
  } catch (error) {
    console.warn("Không thể tải dữ liệu trang chủ từ API:", error);
    products.value = [];
    allProducts.value = [];
    categoriesFromApi.value = [];
  }
};

const heroSlides = [
  {
    eyebrow: "Phong cách từ bước chân",
    title: "Bước",
    titleMiddle: "Theo",
    titleEm: "Chất riêng.",
    sub: "Một đôi giày. Vạn cách thể hiện. Khám phá những thiết kế dành cho chuyển động và cá tính của bạn.",
    cta: "Khám phá bộ sưu tập",
    filter: "all",
    art: heroSneaker,
    alt: "Sneaker trắng phối đỏ với đế đệm khí",
    artWord: "MOVE",
    artCaption: "LIFESTYLE ESSENTIALS",
    fallback: homeMedia.hero.sneakers,
  },
  {
    eyebrow: "Streetwear mỗi ngày",
    title: "Chạm",
    titleMiddle: "Phố.",
    titleEm: "Chất riêng.",
    sub: "Từ những góc phố quen đến những cuộc hẹn mới. Mang tinh thần sneaker vào từng nhịp sống của bạn.",
    cta: "Khám phá phong cách",
    filter: "all",
    art: heroStreet,
    theme: "street",
    alt: "Sneaker streetwear da trắng phối đỏ với đế đen trắng",
    artWord: "STREET",
    artCaption: "EVERYDAY STREET CULTURE",
    fallback: heroStreet,
  },
  {
    eyebrow: "Chinh phục đường chạy",
    title: "Vượt",
    titleMiddle: "Mọi",
    titleEm: "Giới hạn.",
    sub: "Nhẹ trên từng bước. Bền bỉ trên mọi hành trình. Tìm cảm hứng cho nhịp chạy tiếp theo của bạn.",
    cta: "Khám phá giày chạy",
    filter: "running",
    art: heroRunner,
    theme: "running",
    alt: "Giày chạy bộ đen đỏ với đế đệm trắng",
    artWord: "PACE",
    artCaption: "RUNNING ESSENTIALS",
    fallback: homeMedia.hero.running,
  },
  {
    eyebrow: "Ưu đãi cuối mùa",
    title: "Giảm",
    titleMiddle: "Đến",
    titleEm: "30%.",
    sub: "Một tinh thần cổ điển. Một diện mạo mới. Khám phá các mẫu sneaker trong bộ sưu tập ưu đãi.",
    cta: "Khám phá ưu đãi",
    filter: "sale",
    art: heroCourt,
    theme: "court",
    alt: "Sneaker cổ cao phối da đỏ trắng, dây giày trắng",
    artWord: "COURT",
    artCaption: "COURT CULTURE",
    fallback: homeMedia.hero.sale,
  },
];

// Ba bản sao giữ hai mép carousel liền mạch khi đi qua slide đầu/cuối.
const displaySlides = computed(() => [
  ...heroSlides.map((slide, index) => ({
    ...slide,
    _key: `set0-${index}`,
    realIdx: index,
  })),
  ...heroSlides.map((slide, index) => ({
    ...slide,
    _key: `set1-${index}`,
    realIdx: index,
  })),
  ...heroSlides.map((slide, index) => ({
    ...slide,
    _key: `set2-${index}`,
    realIdx: index,
  })),
]);
const currentIndex = ref(heroSlides.length);
const isTransitioning = ref(true);
const isHeroAnimating = ref(false);
const outgoingHeroIndex = ref(null);
const SLIDE_DURATION = 600;
const AUTOPLAY_INTERVAL = 5000;
const DRAG_THRESHOLD = 50;
const activeSlide = computed(
  () =>
    ((currentIndex.value % heroSlides.length) + heroSlides.length) %
    heroSlides.length,
);

const heroTrack = ref(null);
const heroViewport = ref(null);
const viewportWidth = ref(1200);
const heroGap = 20;
const slideWidth = computed(() =>
  Math.max(
    0,
    Math.min(
      1440,
      viewportWidth.value - (viewportWidth.value >= 640 ? 64 : 24),
    ),
  ),
);
const isDragging = ref(false);
const dragStartX = ref(0);
const dragDeltaX = ref(0);
const dragMoved = ref(false);
const dragOriginOffset = ref(0);
let dragStartY = 0;
let activePointerId = null;
let interruptedHeroTransition = false;
let dragResetTimer = null;
let transitionSafetyTimer = null;
let heroResetFrame = null;
let heroTimer = null;
let heroResumeTimer = null;
let isHeroHovered = false;
let isHeroFocused = false;
let heroDisposed = false;
const heroMotionPaused = ref(false);

const trackOffset = computed(() =>
  isDragging.value
    ? dragOriginOffset.value + dragDeltaX.value
    : Math.round(
        viewportWidth.value / 2 -
          slideWidth.value / 2 -
          currentIndex.value * (slideWidth.value + heroGap),
      ),
);

const pauseHero = () => {
  if (heroTimer) clearInterval(heroTimer);
  heroTimer = null;
};
const playHero = (userRequested = false) => {
  const canResume = userRequested || (!isHeroHovered && !isHeroFocused);
  if (
    !heroTimer &&
    canResume &&
    !isDragging.value &&
    !heroMotionPaused.value &&
    !document.hidden
  ) {
    heroTimer = setInterval(
      () => moveToSlide(currentIndex.value + 1),
      AUTOPLAY_INTERVAL,
    );
  }
};
const scheduleHeroPlayback = () => {
  pauseHero();
  if (heroResumeTimer) clearTimeout(heroResumeTimer);
  heroResumeTimer = setTimeout(() => {
    heroResumeTimer = null;
    playHero();
  }, AUTOPLAY_INTERVAL);
};
const toggleHeroMotion = () => {
  heroMotionPaused.value = !heroMotionPaused.value;
  for (const video of heroViewport.value?.querySelectorAll("video") || []) {
    if (heroMotionPaused.value) video.pause();
    else video.play().catch(() => {});
  }
  if (heroMotionPaused.value) pauseHero();
  else playHero(true);
};
const onHeroEnter = () => {
  isHeroHovered = true;
  pauseHero();
};
const onHeroLeave = () => {
  isHeroHovered = false;
  playHero();
};
const onHeroFocusIn = () => {
  isHeroFocused = true;
  pauseHero();
};
const onHeroFocusOut = (event) => {
  if (event.currentTarget.contains(event.relatedTarget)) return;
  isHeroFocused = false;
  playHero();
};
const onHeroVisibilityChange = () => {
  if (document.hidden) pauseHero();
  else playHero();
};

const handleTransitionComplete = async () => {
  if (transitionSafetyTimer) clearTimeout(transitionSafetyTimer);
  transitionSafetyTimer = null;
  const len = heroSlides.length;
  const needsReset = currentIndex.value >= len * 2 || currentIndex.value < len;
  if (needsReset) {
    isTransitioning.value = false;
    currentIndex.value += currentIndex.value >= len * 2 ? -len : len;
    // Chờ Vue cập nhật transform rồi mới ép layout, để trình duyệt không animate cú nhảy về bản sao giữa.
    await nextTick();
    if (heroDisposed) return;
    if (heroTrack.value) void heroTrack.value.offsetHeight;
    heroResetFrame = requestAnimationFrame(() => {
      isTransitioning.value = true;
      isHeroAnimating.value = false;
      outgoingHeroIndex.value = null;
      heroResetFrame = null;
    });
    return;
  }
  isHeroAnimating.value = false;
  outgoingHeroIndex.value = null;
};
const moveToSlide = (targetIndex) => {
  if (isHeroAnimating.value || !isTransitioning.value) return false;
  // Giữ khung video đang rời màn hình cho đến khi kết thúc chuyển slide.
  if (outgoingHeroIndex.value == null)
    outgoingHeroIndex.value = currentIndex.value;
  isHeroAnimating.value = true;
  currentIndex.value = targetIndex;
  if (transitionSafetyTimer) clearTimeout(transitionSafetyTimer);
  transitionSafetyTimer = setTimeout(
    handleTransitionComplete,
    SLIDE_DURATION + 100,
  );
  return true;
};
const onTrackTransitionEnd = (event) => {
  if (event && event.target !== event.currentTarget) return;
  if (event?.propertyName && event.propertyName !== "transform") return;
  handleTransitionComplete();
};
const nextSlide = (manual = false) => {
  if (manual) scheduleHeroPlayback();
  moveToSlide(currentIndex.value + 1);
};
const prevSlide = (manual = false) => {
  if (manual) scheduleHeroPlayback();
  moveToSlide(currentIndex.value - 1);
};
const goToSlide = (targetRealIdx) => {
  let difference = targetRealIdx - activeSlide.value;
  const len = heroSlides.length;
  if (difference > len / 2) difference -= len;
  else if (difference < -len / 2) difference += len;
  if (!difference) return;
  scheduleHeroPlayback();
  moveToSlide(currentIndex.value + difference);
};
const handleSlideClick = (index, slide) => {
  if (dragMoved.value || isDragging.value || isHeroAnimating.value) return;
  if (index === currentIndex.value) goToProducts(slide.filter);
  else goToSlide(slide.realIdx);
};
const onHeroClickCapture = (event) => {
  if (!dragMoved.value) return;
  event.preventDefault();
  event.stopPropagation();
};
const readRenderedTrackOffset = () => {
  if (!heroTrack.value) return trackOffset.value;
  const transform = window.getComputedStyle(heroTrack.value).transform;
  return transform === "none"
    ? trackOffset.value
    : new DOMMatrixReadOnly(transform).m41;
};
const onPointerDown = (event) => {
  if (
    event.button !== 0 ||
    event.isPrimary === false ||
    isDragging.value ||
    !isTransitioning.value
  )
    return;
  if (event.target.closest("button, a, input, select, textarea")) return;
  const renderedOffset = readRenderedTrackOffset();
  interruptedHeroTransition = isHeroAnimating.value;
  if (transitionSafetyTimer) clearTimeout(transitionSafetyTimer);
  transitionSafetyTimer = null;
  isHeroAnimating.value = false;
  isTransitioning.value = false;

  const normalizedIndex = heroSlides.length + activeSlide.value;
  const indexShift = normalizedIndex - currentIndex.value;
  dragOriginOffset.value =
    renderedOffset - indexShift * (slideWidth.value + heroGap);
  currentIndex.value = normalizedIndex;
  dragStartX.value = event.clientX;
  dragStartY = event.clientY;
  dragDeltaX.value = 0;
  dragMoved.value = false;
  activePointerId = event.pointerId;
  isDragging.value = true;
  pauseHero();
};
const onPointerMove = (event) => {
  if (!isDragging.value || event.pointerId !== activePointerId) return;
  const delta = event.clientX - dragStartX.value;
  const horizontalIntent =
    event.pointerType !== "touch" ||
    Math.abs(delta) > Math.abs(event.clientY - dragStartY);
  if (!dragMoved.value && Math.abs(delta) > 6 && horizontalIntent) {
    dragMoved.value = true;
    try {
      heroViewport.value?.setPointerCapture(event.pointerId);
    } catch {}
  }
  if (!dragMoved.value) return;
  dragDeltaX.value = delta;
  if (event.cancelable) event.preventDefault();
};
const finishHeroDrag = (event, cancelled = false) => {
  if (
    !isDragging.value ||
    (event.pointerId != null && event.pointerId !== activePointerId)
  )
    return;
  const delta = dragDeltaX.value;
  const wasDragged = dragMoved.value;
  try {
    if (heroViewport.value?.hasPointerCapture(activePointerId))
      heroViewport.value.releasePointerCapture(activePointerId);
  } catch {}
  activePointerId = null;
  isDragging.value = false;
  isTransitioning.value = true;
  dragDeltaX.value = 0;
  if (wasDragged || interruptedHeroTransition) {
    const passedThreshold =
      !cancelled &&
      wasDragged &&
      Math.abs(delta) >= Math.min(DRAG_THRESHOLD, slideWidth.value * 0.15);
    moveToSlide(
      currentIndex.value + (passedThreshold ? (delta < 0 ? 1 : -1) : 0),
    );
  }
  dragMoved.value = wasDragged || interruptedHeroTransition || cancelled;
  if (dragResetTimer) clearTimeout(dragResetTimer);
  dragResetTimer = setTimeout(() => {
    dragMoved.value = false;
    dragResetTimer = null;
  }, 0);
  interruptedHeroTransition = false;
  scheduleHeroPlayback();
};
const onPointerUp = (event) => finishHeroDrag(event);
const onPointerCancel = (event) => finishHeroDrag(event, true);
const measure = () => {
  if (isDragging.value) onPointerCancel({});
  if (heroViewport.value) viewportWidth.value = heroViewport.value.clientWidth;
};
const onImageError = (event, fallback) => {
  if (!fallback || event.target.dataset.fallbackApplied) return;
  event.target.dataset.fallbackApplied = "true";
  event.target.src = fallback;
};
const onVideoError = (event, fallback) => {
  if (!fallback || event.target.dataset.fallbackApplied) return;
  event.target.dataset.fallbackApplied = "true";
  event.target.style.display = "none";
  const image = document.createElement("img");
  image.src = fallback;
  image.alt = "Banner ShoeGroup";
  image.className = "absolute inset-0 h-full w-full object-cover";
  event.target.parentElement?.prepend(image);
};

const normalizeFilterText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const categoryAliases = {
  running: ["running", "chay bo"],
  basketball: ["basketball", "bong ro"],
  training: ["training", "gym", "tap"],
  lifestyle: ["lifestyle", "sneaker"],
  football: ["football", "bong da"],
  tennis: ["tennis"],
};
const resolveCategoryId = (filter) => {
  const aliases = categoryAliases[filter] || [filter];
  const source = categoriesFromApi.value;
  const match = source.find((category) => {
    const haystack = normalizeFilterText(
      `${category.category_name} ${category.sport}`,
    );
    return aliases.some((alias) =>
      haystack.includes(normalizeFilterText(alias)),
    );
  });
  return match?.id_category ?? null;
};
const goToProducts = (filter = "all") => {
  const value = typeof filter === "object" ? filter : { filter };
  let query = {};
  if (value.category != null) {
    query = { category: String(value.category) };
  } else if (value.filter && value.filter !== "all") {
    const categoryId = resolveCategoryId(value.filter);
    query = ["sale", "new"].includes(value.filter)
      ? { filter: value.filter }
      : categoryId != null
        ? { category: String(categoryId) }
        : { search: value.filter };
  }
  router.push({ path: "/products", query });
};
const homeProducts = computed(() => products.value.slice(0, 5));
const categoryImages = homeMedia.categories;
const categorySpecs = [
  { key: "running", label: "Chạy Bộ" },
  { key: "basketball", label: "Bóng Rổ" },
  { key: "training", label: "Training" },
];
const categoryCards = computed(() =>
  categorySpecs.map((spec, i) => {
    const categoryId = resolveCategoryId(spec.key);
    const category = categoriesFromApi.value.find(
      (item) => String(item.id_category) === String(categoryId),
    );
    const count =
      categoryId == null
        ? 0
        : allProducts.value.filter(
            (product) => String(product.id_category) === String(categoryId),
          ).length;
    return {
      key: spec.key,
      label: category?.category_name || spec.label,
      count: `${count || allProducts.value.filter((product) => normalizeFilterText(`${product.sport} ${product.category_name}`).includes(normalizeFilterText(spec.key))).length} sản phẩm`,
      categoryId,
      img: categoryImages[i],
    };
  }),
);
const banners = [
  {
    eyebrow: "Dòng Hiệu Suất Cao",
    title: "Được tạo ra",
    titleEm: "cho tốc độ",
    sub: "Công nghệ đệm tiên tiến, trọng lượng siêu nhẹ đem đến cảm giác bứt phá trên từng bước chạy.",
    cta: "Xem sản phẩm",
    filter: "running",
    dark: true,
    alt: "Giày chạy bộ hiệu suất cao",
    img: homeMedia.promo.running,
  },
  {
    eyebrow: "Sân đấu bóng rổ",
    title: "Bứt phá mọi giới hạn",
    sub: "Bám sân tối ưu, đệm giảm chấn và hỗ trợ cổ chân vững chắc trong từng pha tranh bóng.",
    cta: "Khám phá ngay",
    filter: "basketball",
    dark: true,
    alt: "Giày thể thao dành cho sân bóng rổ",
    img: homeMedia.promo.basketball,
  },
  {
    eyebrow: "Giảm đến 30%",
    title: "Ưu đãi cuối mùa",
    sub: "Loạt mẫu lifestyle & training hot nhất năm với mức giá ưu đãi đặc biệt.",
    cta: "Săn sale ngay",
    filter: "sale",
    dark: false,
    alt: "Sản phẩm ưu đãi cuối mùa",
    img: homeMedia.promo.sale,
  },
];
const trustItems = [
  {
    icon: "truck",
    title: "Giao hàng toàn quốc",
    sub: "Xem phí minh bạch khi thanh toán",
  },
  {
    icon: "return",
    title: "Đổi trả trong 14 ngày",
    sub: "Thủ tục nhanh gọn và thuận tiện",
  },
  {
    icon: "shield",
    title: "100% Chính hãng",
    sub: "Cam kết nguồn gốc và chất lượng",
  },
  {
    icon: "support",
    title: "Hỗ trợ tận tâm 24/7",
    sub: "Luôn sẵn sàng phục vụ quý khách",
  },
];
const trustIcons = {
  truck:
    '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  return: '<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>',
  shield:
    '<path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>',
  support:
    '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-3v-8h3a2 2 0 0 1 2 2z"/><path d="M3 19a2 2 0 0 0 2 2h3v-8H5a2 2 0 0 0-2 2z"/>',
};
onMounted(() => {
  heroMotionPaused.value = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  loadData();
  measure();
  window.addEventListener("resize", measure);
  window.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerCancel);
  window.addEventListener("blur", onPointerCancel);
  document.addEventListener("visibilitychange", onHeroVisibilityChange);
  playHero();
});
onUnmounted(() => {
  heroDisposed = true;
  pauseHero();
  if (heroResumeTimer) clearTimeout(heroResumeTimer);
  if (transitionSafetyTimer) clearTimeout(transitionSafetyTimer);
  if (dragResetTimer) clearTimeout(dragResetTimer);
  if (heroResetFrame) cancelAnimationFrame(heroResetFrame);
  window.removeEventListener("resize", measure);
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointercancel", onPointerCancel);
  window.removeEventListener("blur", onPointerCancel);
  document.removeEventListener("visibilitychange", onHeroVisibilityChange);
});
</script>

<style src="../assets/home.css"></style>
