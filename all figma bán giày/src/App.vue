<template>
  <div class="min-h-full bg-[#FFFFFF] text-[#0E0E0E]" style="font-family:'Be Vietnam Pro',sans-serif">

    <!-- NAV -->
    <header class="fixed top-0 left-0 right-0 z-50 bg-[#FFFFFF]/95 backdrop-blur-md">
      <div class="max-w-[1440px] mx-auto px-6 lg:px-10 h-[68px] flex items-center gap-6">
        <!-- Logo -->
        <button @click="currentPage='home'" class="flex-shrink-0 flex items-center gap-2 bg-transparent border-none cursor-pointer p-0">
          <img :src="logoGiay" alt="ShoeGroup" class="w-9 h-9 object-contain" />
          <span style="font-family:'Fraunces',serif" class="text-[22px] font-semibold leading-none tracking-tight">ShoeGroup</span>
        </button>

        <!-- Primary nav -->
        <nav v-if="currentPage!=='checkout'" class="hidden lg:flex items-center gap-6 ml-2">
          <button
            v-for="link in navLinks" :key="link.label"
            @mouseenter="link.menu && (openMenu = link.label)" @mouseleave="link.menu && (openMenu = null)"
            @click="goToProducts(link.filter)"
            class="relative flex items-center gap-1 text-[14px] transition-colors bg-transparent border-none cursor-pointer p-0 py-6"
            :class="[
              link.sale ? 'text-[#0E0E0E] font-bold underline underline-offset-4 decoration-2 hover:text-[#737373]'
                : (currentPage==='products' && activeFilter===link.filter)
                  ? 'text-[#0E0E0E] font-semibold'
                  : 'text-[#0E0E0E]/80 font-medium hover:text-[#0E0E0E]'
            ]">
            {{ link.label }}
            <svg v-if="link.menu" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="transition-transform" :class="openMenu===link.label ? 'rotate-180' : ''"><path d="m6 9 6 6 6-6"/></svg>

            <!-- Dropdown -->
            <div v-if="link.menu && openMenu===link.label"
              class="absolute top-full left-0 pt-1 w-52 cursor-default" @click.stop>
              <div class="bg-white border border-[#E5E5E5] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] py-2">
                <button v-for="item in link.menu" :key="item.label" @click="goToProducts(item.filter)"
                  class="w-full flex items-center justify-between px-4 py-2.5 text-[13px] font-medium text-[#0E0E0E]/80 hover:text-[#0E0E0E] hover:bg-[#F5F5F5] transition-colors bg-transparent border-none cursor-pointer text-left">
                  {{ item.label }}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-40"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>
          </button>
        </nav>

        <!-- Right actions -->
        <div class="flex items-center gap-1 ml-auto">
          <span v-if="currentPage==='checkout'" class="flex items-center gap-1.5 text-xs font-medium text-[#737373]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Thanh toán an toàn
          </span>
          <button v-if="currentPage!=='checkout'" @click="toggleSearch" aria-label="Tìm kiếm" class="flex w-10 h-10 items-center justify-center rounded-full transition-colors bg-transparent border-none cursor-pointer" :class="searchOpen ? 'text-[#0E0E0E] bg-[#F0F0F0]' : 'text-[#0E0E0E]/70 hover:text-[#0E0E0E] hover:bg-[#F0F0F0]'">
            <svg v-if="!searchOpen" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <svg v-else width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <button v-if="currentPage!=='checkout'" @click="goToProfile('info')" aria-label="Tài khoản" class="w-10 h-10 flex items-center justify-center rounded-full transition-colors bg-transparent border-none cursor-pointer" :class="currentPage==='profile' ? 'text-[#0E0E0E] bg-[#F0F0F0]' : 'text-[#0E0E0E]/70 hover:text-[#0E0E0E] hover:bg-[#F0F0F0]'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          </button>
          <button @click="openCart" aria-label="Giỏ hàng" class="relative w-10 h-10 flex items-center justify-center text-[#0E0E0E]/70 hover:text-[#0E0E0E] hover:bg-[#F0F0F0] rounded-full transition-colors bg-transparent border-none cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <span v-if="cartCount" class="absolute top-1 right-0.5 min-w-[17px] h-[17px] px-1 bg-[#0E0E0E] rounded-full text-[10px] font-bold flex items-center justify-center text-white">{{ cartCount }}</span>
          </button>
          <button v-if="currentPage!=='checkout'" aria-label="Menu" class="lg:hidden w-10 h-10 flex items-center justify-center bg-transparent border-none cursor-pointer" @click="menuOpen=!menuOpen">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      </div>
      <!-- Hairline underline -->
      <div class="h-px bg-[#E5E5E5]"></div>

      <!-- Tìm kiếm thông minh (kéo xuống) -->
      <transition
        enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 -translate-y-3" enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-3">
        <div v-if="searchOpen" class="absolute top-full left-0 right-0 bg-white border-b border-[#E5E5E5] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.25)]">
          <div class="max-w-[900px] mx-auto px-6 py-6">
            <div class="flex items-center gap-3 border border-[#0E0E0E] rounded-full px-5 py-3.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="text-[#737373] flex-shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input v-model="searchQuery" type="text" autofocus placeholder="Nhập tên giày, thương hiệu, màu sắc…"
                class="flex-1 bg-transparent outline-none text-[15px] placeholder:text-[#737373]" @keyup.enter="searchResults.length && pickSearchResult(searchResults[0])" />
              <button v-if="searchQuery" @click="searchQuery=''" aria-label="Xóa" class="text-[#737373] hover:text-[#0E0E0E] bg-transparent border-none cursor-pointer p-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <!-- Gợi ý phổ biến -->
            <div v-if="!searchQuery" class="mt-5">
              <div class="text-[10px] font-bold tracking-[0.18em] uppercase text-[#737373] mb-3">Tìm kiếm phổ biến</div>
              <div class="flex flex-wrap gap-2">
                <button v-for="t in popularSearches" :key="t" @click="pickPopular(t)"
                  class="px-4 py-2 text-[13px] font-medium rounded-full border border-[#E5E5E5] hover:border-[#0E0E0E] hover:bg-[#0E0E0E] hover:text-white transition-colors bg-white cursor-pointer">
                  {{ t }}
                </button>
              </div>
            </div>

            <!-- Kết quả -->
            <div v-else class="mt-5">
              <div class="text-[10px] font-bold tracking-[0.18em] uppercase text-[#737373] mb-3">
                {{ searchResults.length }} kết quả cho "{{ searchQuery }}"
              </div>
              <div v-if="searchResults.length" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button v-for="p in searchResults" :key="p.id" @click="pickSearchResult(p)"
                  class="flex items-center gap-3 p-2 rounded-xl hover:bg-[#F0F0F0] transition-colors bg-transparent border-none cursor-pointer text-left">
                  <img :src="p.img" :alt="p.name" class="w-12 h-12 rounded-lg object-cover bg-[#F0F0F0] flex-shrink-0" />
                  <div class="min-w-0">
                    <div class="text-[10px] font-bold tracking-wide text-[#737373]">{{ p.brand }}</div>
                    <div class="text-sm font-medium leading-tight line-clamp-1">{{ p.name }}</div>
                    <div class="text-xs text-[#0E0E0E] font-semibold">{{ p.price }}</div>
                  </div>
                </button>
              </div>
              <p v-else class="text-sm text-[#737373] py-6 text-center">Không tìm thấy sản phẩm phù hợp.</p>
            </div>
          </div>
        </div>
      </transition>

      <!-- Mobile menu -->
      <div v-if="menuOpen" class="lg:hidden border-b border-[#E5E5E5] bg-[#FFFFFF] px-6 py-4 flex flex-col gap-1">
        <button v-for="link in navLinks" :key="link.label" @click="goToProducts(link.filter);menuOpen=false"
          class="text-[15px] font-medium py-2.5 text-left bg-transparent border-none cursor-pointer"
          :class="link.sale ? 'text-[#0E0E0E] font-bold' : 'text-[#0E0E0E]'">{{ link.label }}</button>
      </div>
    </header>

    <!-- ══ TRANG CHỦ ══ -->
    <template v-if="currentPage==='home'">

      <!-- Hero peek-carousel -->
      <section class="relative pt-[71px] pb-5 bg-[#FFFFFF]"
        @mouseenter="pauseHero" @mouseleave="playHero">
        <div ref="heroViewport" class="relative overflow-hidden pt-8">
          <!-- Track -->
          <div class="flex items-stretch transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            :style="{ transform: `translateX(${trackOffset}px)`, gap: heroGap + 'px' }">
            <div v-for="(slide, i) in heroSlides" :key="slide.title"
              class="flex-shrink-0 transition-all duration-700 ease-out cursor-pointer"
              :style="{ width: slideWidth + 'px' }"
              :class="i === activeSlide ? 'opacity-100 scale-100' : 'opacity-45 scale-[0.94]'"
              @click="i === activeSlide ? goToProducts(slide.filter) : goToSlide(i)">
              <div class="group relative overflow-hidden rounded-2xl bg-[#0E0E0E] h-[300px] md:h-[400px] lg:h-[460px] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.4)]">
                <!-- Media -->
                <template v-if="slide.type === 'video'">
                  <video :src="slide.src" autoplay muted loop playsinline
                    class="absolute inset-0 w-full h-full object-cover"></video>
                </template>
                <template v-else>
                  <img :src="slide.img" :alt="slide.alt"
                    class="absolute inset-0 w-full h-full object-cover"/>
                </template>
                <div class="absolute inset-0 bg-gradient-to-r from-[#0E0E0E]/85 via-[#0E0E0E]/35 to-transparent"></div>

                <!-- Copy -->
                <div class="relative h-full flex flex-col justify-center p-8 md:p-12 max-w-[85%] md:max-w-[62%]">
                  <div class="flex items-center gap-2.5 mb-3">
                    <span v-if="slide.type === 'video'" class="inline-flex items-center gap-1.5 bg-white text-[#0E0E0E] text-[10px] font-bold tracking-wide uppercase px-2 py-1 rounded-full">
                      <span class="w-1.5 h-1.5 rounded-full bg-[#0E0E0E] animate-pulse"></span> Video
                    </span>
                    <span class="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-white/80">{{ slide.eyebrow }}</span>
                  </div>
                  <h2 style="font-family:'Fraunces',serif" class="text-3xl md:text-5xl lg:text-6xl leading-[0.95] font-semibold text-white mb-3">
                    {{ slide.title }}<template v-if="slide.titleEm"><br><em class="not-italic text-white/55">{{ slide.titleEm }}</em></template>
                  </h2>
                  <p class="text-sm md:text-base text-white/75 leading-relaxed max-w-sm mb-6">{{ slide.sub }}</p>
                  <span class="inline-flex items-center gap-2 bg-white text-[#0E0E0E] px-6 py-3 text-[13px] font-semibold w-fit rounded-full group-hover:bg-[#E5E5E5] transition-colors">
                    {{ slide.cta }}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Arrows -->
          <button @click.stop="prevSlide" aria-label="Trước"
            class="absolute left-4 lg:left-10 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center bg-white text-[#0E0E0E] shadow-md hover:bg-[#0E0E0E] hover:text-white rounded-full transition-colors border border-[#E5E5E5] cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button @click.stop="nextSlide" aria-label="Sau"
            class="absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center bg-white text-[#0E0E0E] shadow-md hover:bg-[#0E0E0E] hover:text-white rounded-full transition-colors border border-[#E5E5E5] cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        <!-- Dots -->
        <div class="flex items-center justify-center gap-2.5 mt-5">
          <button v-for="(slide, i) in heroSlides" :key="'dot'+i" @click="goToSlide(i)"
            :aria-label="'Banner ' + (i+1)"
            class="h-1.5 rounded-full transition-all duration-300 border-none cursor-pointer p-0"
            :class="i === activeSlide ? 'w-8 bg-[#0E0E0E]' : 'w-4 bg-[#D4D4D4] hover:bg-[#737373]'"></button>
        </div>
      </section>

      <!-- Ticker -->
      <div class="overflow-hidden border-y border-[#E5E5E5] bg-[#0E0E0E] text-[#FFFFFF] py-3">
        <div class="flex gap-10 whitespace-nowrap animate-marquee">
          <template v-for="n in 6" :key="n">
            <span v-for="t in tickerItems" :key="t+n" class="text-[10px] font-bold tracking-[0.18em] uppercase inline-flex items-center gap-10">
              {{ t }}<span class="text-[#FFFFFF]">✦</span>
            </span>
          </template>
        </div>
      </div>

      <!-- Sản phẩm nổi bật -->
      <section class="max-w-[1400px] mx-auto px-6 lg:px-12 py-14">
        <div class="flex items-end justify-between mb-7">
          <div>
            <span class="text-[10px] font-bold tracking-[0.2em] uppercase text-[#737373]">Nổi bật</span>
            <h2 style="font-family:'Fraunces',serif" class="text-3xl md:text-4xl mt-1.5 font-semibold leading-tight">Sản phẩm được yêu thích</h2>
          </div>
          <button @click="goToProducts('all')" class="hidden md:flex items-center gap-1.5 text-sm font-semibold bg-transparent border-none cursor-pointer p-0 hover:underline underline-offset-4">
            Xem tất cả
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
        <!-- Lưới 5 cột, card chuẩn -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-8">
          <ProductCard v-for="p in allProducts.slice(0,5)" :key="p.id" :p="p"
            :wished="wishlist.includes(p.id)" @wish="toggleWishlist(p.id)" @add="addToCart(p)" @open="openDetail(p)" />
        </div>
      </section>

      <!-- 3 Banner thật -->
      <section class="max-w-[1400px] mx-auto px-6 lg:px-12 pb-14">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <!-- Banner lớn -->
          <button @click="goToProducts(banners[0].filter)"
            class="group relative overflow-hidden bg-[#0E0E0E] block text-left cursor-pointer border-none p-0 min-h-[300px] lg:min-h-[520px] lg:row-span-2">
            <img :src="banners[0].img" :alt="banners[0].alt" class="absolute inset-0 w-full h-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-105"/>
            <div class="absolute inset-0 bg-gradient-to-t from-[#0E0E0E] via-[#0E0E0E]/25 to-transparent"></div>
            <div class="relative h-full flex flex-col justify-end p-8 lg:p-12">
              <span class="text-[#FFFFFF] text-[10px] font-bold tracking-[0.2em] uppercase mb-3">{{ banners[0].eyebrow }}</span>
              <h3 style="font-family:'Fraunces',serif" class="text-4xl lg:text-6xl text-white leading-[0.95] mb-4 font-semibold">
                {{ banners[0].title }}<br><em class="not-italic text-white/55">{{ banners[0].titleEm }}</em>
              </h3>
              <p class="text-white/70 text-sm leading-relaxed mb-6 max-w-sm">{{ banners[0].sub }}</p>
              <span class="inline-flex items-center gap-2 border border-[#FFFFFF] text-[#FFFFFF] px-6 py-3 text-[11px] font-bold uppercase w-fit group-hover:bg-[#FFFFFF] group-hover:text-[#0E0E0E] transition-colors">
                {{ banners[0].cta }}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </div>
          </button>

          <!-- 2 Banner nhỏ -->
          <button v-for="b in banners.slice(1)" :key="b.title" @click="goToProducts(b.filter)"
            class="group relative overflow-hidden block text-left cursor-pointer border-none p-0 min-h-[250px]"
            :class="b.dark ? 'bg-[#0E0E0E]' : 'bg-[#F0F0F0]'">
            <img :src="b.img" :alt="b.alt" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              :class="b.dark ? 'opacity-70' : ''"/>
            <div class="absolute inset-0" :class="b.dark ? 'bg-gradient-to-r from-[#0E0E0E] via-[#0E0E0E]/30 to-transparent' : 'bg-gradient-to-r from-white/85 via-white/40 to-transparent'"></div>
            <div class="relative h-full flex flex-col justify-center p-8 lg:p-10 max-w-[70%]">
              <span class="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" :class="b.dark ? 'text-[#FFFFFF]' : 'text-[#737373]'">{{ b.eyebrow }}</span>
              <h3 style="font-family:'Fraunces',serif" class="text-2xl lg:text-3xl leading-tight mb-2 font-semibold" :class="b.dark ? 'text-white' : 'text-[#0E0E0E]'">{{ b.title }}</h3>
              <p class="text-sm leading-relaxed mb-4 max-w-[240px]" :class="b.dark ? 'text-white/65' : 'text-[#737373]'">{{ b.sub }}</p>
              <span class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase" :class="b.dark ? 'text-white' : 'text-[#0E0E0E]'">
                {{ b.cta }}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </div>
          </button>
        </div>
      </section>

      <!-- Danh mục -->
      <section class="max-w-[1400px] mx-auto px-6 lg:px-12 pb-14">
        <div class="mb-7">
          <span class="text-[10px] font-bold tracking-[0.2em] uppercase text-[#737373]">Danh mục giày nam</span>
          <h2 style="font-family:'Fraunces',serif" class="text-3xl md:text-4xl mt-1.5 font-semibold">Chọn theo phong cách</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button v-for="(cat,i) in categories" :key="cat.label" @click="goToProducts(cat.filter)"
            class="group relative overflow-hidden bg-[#F0F0F0] block cursor-pointer border-none p-0 text-left"
            :style="{minHeight: i===0?'360px':'280px'}">
            <img :src="cat.img" :alt="cat.label" class="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-105"/>
            <div class="absolute inset-0 bg-gradient-to-t from-[#0E0E0E]/70 via-transparent to-transparent"></div>
            <div class="absolute bottom-5 left-5">
              <div style="font-family:'Fraunces',serif" class="text-xl text-white font-semibold mb-0.5">{{ cat.label }}</div>
              <div class="text-xs text-white/60">{{ cat.count }}</div>
            </div>
          </button>
        </div>
      </section>

      <!-- Cam kết -->
      <section class="border-y border-[#E5E5E5] py-10">
        <div class="max-w-[1400px] mx-auto px-6 lg:px-12 grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8">
          <div v-for="item in trustItems" :key="item.title" class="flex items-center gap-3.5">
            <div class="flex-shrink-0 w-11 h-11 rounded-full border border-[#E5E5E5] flex items-center justify-center text-[#0E0E0E]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" v-html="trustIcons[item.icon]"></svg>
            </div>
            <div>
              <div class="text-sm font-semibold leading-tight">{{ item.title }}</div>
              <div class="text-xs text-[#737373] mt-0.5">{{ item.sub }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Đăng ký -->
      <section class="py-16 px-6 lg:px-12">
        <div class="max-w-xl mx-auto text-center">
          <span class="text-[9px] font-bold tracking-[0.2em] uppercase text-[#737373]">Bản tin</span>
          <h2 style="font-family:'Fraunces',serif" class="text-4xl mt-3 mb-3 font-semibold">Đừng bỏ lỡ<br>ưu đãi độc quyền</h2>
          <p class="text-sm text-[#737373] mb-8">Nhận thông báo sản phẩm mới và ưu đãi dành riêng cho thành viên.</p>
          <form @submit.prevent class="flex max-w-sm mx-auto">
            <input v-model="email" type="email" placeholder="Email của bạn"
              class="flex-1 border border-[#0E0E0E] border-r-0 px-4 py-3 text-sm bg-transparent outline-none placeholder:text-[#737373]"/>
            <button type="submit" class="bg-[#0E0E0E] text-[#FFFFFF] px-5 py-3 text-[10px] font-bold uppercase hover:bg-[#333333] transition-colors whitespace-nowrap cursor-pointer border-none">
              Đăng ký
            </button>
          </form>
        </div>
      </section>

      <!-- Footer -->
      <footer class="border-t border-[#E5E5E5] px-6 lg:px-12 py-12">
        <div class="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div class="col-span-2 md:col-span-1">
            <div class="flex items-center gap-2 mb-4">
              <img :src="logoGiay" alt="ShoeGroup" class="w-7 h-7 object-contain" />
              <span style="font-family:'Fraunces',serif" class="text-lg font-semibold">ShoeGroup</span>
            </div>
            <p class="text-xs text-[#737373] leading-relaxed max-w-[180px]">Phân phối giày thể thao nam chính hãng tại Việt Nam.</p>
          </div>
          <div v-for="col in footerCols" :key="col.title">
            <div class="text-[9px] font-bold tracking-[0.15em] uppercase mb-4">{{ col.title }}</div>
            <ul class="space-y-2">
              <li v-for="l in col.links" :key="l">
                <a href="#" class="text-xs text-[#737373] hover:text-[#0E0E0E] transition-colors">{{ l }}</a>
              </li>
            </ul>
          </div>
        </div>
        <div class="border-t border-[#E5E5E5] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p class="text-xs text-[#737373]">© 2026 ShoeGroup. Tất cả quyền được bảo lưu.</p>
          <div class="flex items-center gap-5">
            <a v-for="s in ['Facebook','Instagram','TikTok']" :key="s" href="#" class="text-xs text-[#737373] hover:text-[#0E0E0E] transition-colors">{{ s }}</a>
          </div>
        </div>
      </footer>

    </template>

    <!-- ══ TRANG SẢN PHẨM ══ -->
    <template v-else-if="currentPage==='products'">
      <div class="pt-16 min-h-screen">

        <!-- Đầu trang -->
        <div class="border-b border-[#E5E5E5]">
          <div class="max-w-[1400px] mx-auto px-6 lg:px-12 py-8">
            <div class="flex items-end justify-between mb-5">
              <div>
                <button @click="currentPage='home'" class="flex items-center gap-1.5 text-xs text-[#737373] hover:text-[#0E0E0E] transition-colors mb-2.5 bg-transparent border-none cursor-pointer p-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                  Trang chủ
                </button>
                <h1 style="font-family:'Fraunces',serif" class="text-3xl md:text-4xl font-semibold">Giày Thể Thao Nam</h1>
                <p class="text-xs text-[#737373] mt-1">{{ filteredProducts.length }} sản phẩm</p>
              </div>
            </div>

            <!-- Bộ lọc -->
            <div class="flex items-center gap-2 flex-wrap">
              <button v-for="f in filters" :key="f.key" @click="activeFilter=f.key"
                :class="['px-3.5 py-1.5 text-[10px] font-bold uppercase transition-colors border cursor-pointer',
                  activeFilter===f.key ? 'bg-[#0E0E0E] text-[#FFFFFF] border-[#0E0E0E]'
                    : 'bg-transparent text-[#737373] border-[#E5E5E5] hover:border-[#0E0E0E] hover:text-[#0E0E0E]']">
                {{ f.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Lưới sản phẩm -->
        <div class="max-w-[1440px] mx-auto px-6 lg:px-10 py-10">
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-8">
            <ProductCard v-for="p in filteredProducts" :key="p.id" :p="p"
              :wished="wishlist.includes(p.id)" @wish="toggleWishlist(p.id)" @add="addToCart(p)" @open="openDetail(p)" />
          </div>
          <div v-if="filteredProducts.length===0" class="text-center py-24 text-[#737373]">
            <div style="font-family:'Fraunces',serif" class="text-2xl mb-2">Không có sản phẩm</div>
            <p class="text-sm">Thử chọn danh mục khác</p>
          </div>
        </div>

      </div>
    </template>

    <!-- ══ TRANG HỒ SƠ ══ -->
    <template v-else-if="currentPage==='profile'">
      <div class="pt-[92px] pb-20 min-h-screen bg-[#FAFAFA]">
        <div class="max-w-[1200px] mx-auto px-6 lg:px-8">

          <button @click="currentPage='home'" class="flex items-center gap-1.5 text-xs text-[#737373] hover:text-[#0E0E0E] transition-colors mb-6 bg-transparent border-none cursor-pointer p-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Trang chủ
          </button>

          <div class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">

            <!-- Sidebar -->
            <aside class="bg-white border border-[#E5E5E5] rounded-2xl p-5 lg:sticky lg:top-[92px]">
              <div class="flex flex-col items-center text-center pb-5 border-b border-[#E5E5E5]">
                <div class="w-20 h-20 rounded-full bg-[#0E0E0E] flex items-center justify-center overflow-hidden mb-3">
                  <img :src="logoGiay" alt="Avatar" class="w-11 h-11 object-contain invert" />
                </div>
                <div style="font-family:'Fraunces',serif" class="text-lg font-semibold">{{ profile.name }}</div>
                <div class="text-xs text-[#737373] mt-0.5 break-all">{{ profile.email }}</div>
              </div>
              <nav class="flex flex-col gap-1 mt-4">
                <button v-for="item in profileNav" :key="item.key" @click="onProfileNav(item.key)"
                  class="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-colors border-none cursor-pointer text-left"
                  :class="item.key==='logout'
                    ? 'bg-transparent text-[#C0392B] hover:bg-[#FBEDEC]'
                    : (currentPage==='profile' && profileTab===item.key ? 'bg-[#0E0E0E] text-[#FFFFFF]' : 'bg-transparent text-[#0E0E0E] hover:bg-[#F0F0F0]')">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" v-html="profileIcons[item.icon]"></svg>
                  {{ item.label }}
                </button>
              </nav>
            </aside>

            <!-- Content -->
            <div class="bg-white border border-[#E5E5E5] rounded-2xl p-6 lg:p-8 min-h-[520px]">
              <div class="w-10 h-1 bg-[#0E0E0E] rounded-full mb-5"></div>

              <!-- Thông tin cá nhân -->
              <div v-if="profileTab==='info'">
                <h2 style="font-family:'Fraunces',serif" class="text-2xl font-semibold mb-6">Thông tin cá nhân</h2>
                <div class="flex items-center gap-5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-5 mb-6">
                  <div class="w-20 h-20 rounded-full bg-[#0E0E0E] flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img :src="logoGiay" alt="Avatar" class="w-11 h-11 object-contain invert" />
                  </div>
                  <div>
                    <div class="flex flex-wrap gap-2.5 mb-2">
                      <button class="bg-[#0E0E0E] text-white px-4 py-2 text-[12px] font-semibold rounded-lg hover:bg-[#333] transition-colors border-none cursor-pointer">Chọn ảnh</button>
                      <button class="bg-white text-[#0E0E0E] px-4 py-2 text-[12px] font-semibold rounded-lg border border-[#E5E5E5] hover:border-[#0E0E0E] transition-colors cursor-pointer">Xóa ảnh</button>
                    </div>
                    <p class="text-[11px] text-[#737373]">JPG, PNG, WEBP hoặc GIF · tối đa 1,5 MB · bấm "Lưu thay đổi" để lưu</p>
                  </div>
                </div>
                <form @submit.prevent class="space-y-5">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <label class="block">
                      <span class="text-[13px] font-medium text-[#0E0E0E] mb-1.5 block">Họ tên</span>
                      <input v-model="profile.name" type="text" class="w-full border border-[#E5E5E5] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#0E0E0E] transition-colors" />
                    </label>
                    <label class="block">
                      <span class="text-[13px] font-medium text-[#0E0E0E] mb-1.5 block">Số điện thoại</span>
                      <input v-model="profile.phone" type="tel" class="w-full border border-[#E5E5E5] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#0E0E0E] transition-colors" />
                    </label>
                  </div>
                  <label class="block">
                    <span class="text-[13px] font-medium text-[#0E0E0E] mb-1.5 block">Email</span>
                    <input v-model="profile.email" type="email" class="w-full border border-[#E5E5E5] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#0E0E0E] transition-colors" />
                  </label>
                  <button type="submit" class="inline-flex items-center gap-2 bg-[#0E0E0E] text-white px-6 py-3 text-[13px] font-semibold rounded-lg hover:bg-[#333] transition-colors border-none cursor-pointer">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    Lưu thay đổi
                  </button>
                </form>
              </div>

              <!-- Sổ địa chỉ -->
              <div v-else-if="profileTab==='address'">
                <div class="flex items-center justify-between mb-2 gap-4">
                  <h2 style="font-family:'Fraunces',serif" class="text-2xl font-semibold">Sổ địa chỉ nhận hàng</h2>
                  <button @click="showAddrForm = !showAddrForm" :disabled="addresses.length >= MAX_ADDRESSES && !showAddrForm"
                    class="inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold rounded-lg transition-colors border-none whitespace-nowrap"
                    :class="addresses.length >= MAX_ADDRESSES && !showAddrForm
                      ? 'bg-[#F0F0F0] text-[#737373] cursor-not-allowed'
                      : 'bg-[#0E0E0E] text-white hover:bg-[#333] cursor-pointer'">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" class="transition-transform" :class="showAddrForm ? 'rotate-45' : ''"><path d="M12 5v14M5 12h14"/></svg>
                    {{ showAddrForm ? 'Đóng' : 'Thêm địa chỉ mới' }}
                  </button>
                </div>
                <p class="text-xs text-[#737373] mb-5">Bạn có thể lưu tối đa {{ MAX_ADDRESSES }} địa chỉ · đã dùng {{ addresses.length }}/{{ MAX_ADDRESSES }}</p>

                <!-- Form thêm địa chỉ -->
                <transition
                  enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition-all duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
                  <form v-if="showAddrForm" @submit.prevent="addAddress" class="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-5 mb-4 space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input v-model="newAddr.name" type="text" placeholder="Họ tên người nhận" class="w-full border border-[#E5E5E5] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#0E0E0E] transition-colors bg-white" />
                      <input v-model="newAddr.phone" type="tel" placeholder="Số điện thoại" class="w-full border border-[#E5E5E5] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#0E0E0E] transition-colors bg-white" />
                    </div>
                    <input v-model="newAddr.detail" type="text" placeholder="Địa chỉ chi tiết (số nhà, phường/xã, tỉnh/thành phố)" class="w-full border border-[#E5E5E5] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#0E0E0E] transition-colors bg-white" />
                    <div class="flex items-center gap-2.5">
                      <button type="submit" class="bg-[#0E0E0E] text-white px-5 py-2.5 text-[13px] font-semibold rounded-lg hover:bg-[#333] transition-colors border-none cursor-pointer">Lưu địa chỉ</button>
                      <button type="button" @click="showAddrForm=false" class="bg-white text-[#0E0E0E] px-5 py-2.5 text-[13px] font-semibold rounded-lg border border-[#E5E5E5] hover:border-[#0E0E0E] transition-colors cursor-pointer">Hủy</button>
                      <span v-if="addresses.length === 0" class="text-xs text-[#737373]">Địa chỉ đầu tiên sẽ là mặc định</span>
                    </div>
                  </form>
                </transition>

                <div class="space-y-3">
                  <div v-for="a in addresses" :key="a.id" class="border border-[#E5E5E5] rounded-xl p-4 flex items-start justify-between gap-4">
                    <div>
                      <div class="flex items-center gap-2.5 flex-wrap mb-1.5">
                        <span class="font-semibold text-[15px]">{{ a.name }}</span>
                        <span class="text-[#737373] text-sm">| {{ a.phone }}</span>
                        <span v-if="a.default" class="inline-flex items-center gap-1 bg-[#0E0E0E] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          Mặc định
                        </span>
                      </div>
                      <p class="text-sm text-[#737373]">{{ a.detail }}</p>
                    </div>
                    <div class="flex flex-col items-end gap-1.5 flex-shrink-0 text-[13px] font-medium">
                      <button v-if="!a.default" @click="setDefaultAddress(a.id)" class="text-[#0E0E0E]/70 hover:text-[#0E0E0E] bg-transparent border-none cursor-pointer p-0">Đặt mặc định</button>
                      <button class="text-[#0E0E0E]/70 hover:text-[#0E0E0E] bg-transparent border-none cursor-pointer p-0">Sửa</button>
                      <button @click="removeAddress(a.id)" class="text-[#C0392B] hover:opacity-70 bg-transparent border-none cursor-pointer p-0">Xóa</button>
                    </div>
                  </div>
                  <p v-if="!addresses.length" class="text-sm text-[#737373] py-10 text-center">Chưa có địa chỉ nào.</p>
                </div>
              </div>

              <!-- Đơn hàng của tôi -->
              <div v-else-if="profileTab==='orders'">
                <h2 style="font-family:'Fraunces',serif" class="text-2xl font-semibold mb-6">Đơn hàng của tôi</h2>
                <div class="flex flex-col items-center justify-center text-center py-16 text-[#737373]">
                  <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" class="mb-4 opacity-40"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>
                  <div style="font-family:'Fraunces',serif" class="text-xl text-[#0E0E0E] mb-1">Chưa có đơn hàng</div>
                  <p class="text-sm mb-5">Hãy khám phá và chọn cho mình đôi giày ưng ý.</p>
                  <button @click="goToProducts('all')" class="bg-[#0E0E0E] text-white px-6 py-3 text-[13px] font-semibold rounded-lg hover:bg-[#333] transition-colors border-none cursor-pointer">Mua sắm ngay</button>
                </div>
              </div>

              <!-- Mã giảm giá -->
              <div v-else-if="profileTab==='coupons'">
                <h2 style="font-family:'Fraunces',serif" class="text-2xl font-semibold mb-1">Mã giảm giá của tôi</h2>
                <p class="text-sm text-[#737373] mb-6">Mã lấy trực tiếp từ cơ sở dữ liệu — đồng bộ với quản lý khuyến mãi.</p>
                <div class="space-y-3">
                  <div v-for="c in coupons" :key="c.code" class="flex items-stretch border border-[#E5E5E5] rounded-xl overflow-hidden">
                    <div class="w-20 flex items-center justify-center flex-shrink-0" :class="c.status==='active' ? 'bg-[#0E0E0E]' : 'bg-[#F0F0F0]'">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" :stroke="c.status==='active' ? '#FFFFFF' : '#737373'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/><rect x="2" y="7" width="20" height="5" rx="1"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                    </div>
                    <div class="flex-1 p-4 flex items-center justify-between gap-4">
                      <div>
                        <div class="font-bold tracking-wide text-[15px] mb-0.5">{{ c.code }}</div>
                        <div class="text-xs text-[#737373]">{{ c.desc }}</div>
                        <div class="text-[11px] text-[#737373] mt-1.5">{{ c.min }} &nbsp;·&nbsp; {{ c.exp }}</div>
                      </div>
                      <div class="flex flex-col items-end gap-2 flex-shrink-0">
                        <div style="font-family:'Fraunces',serif" class="text-xl font-semibold">{{ c.amount }}</div>
                        <span v-if="c.status==='expired'" class="text-[10px] font-bold text-[#737373] bg-[#F0F0F0] px-2 py-1 rounded">Hết hạn</span>
                        <template v-else>
                          <span class="text-[10px] font-bold text-white bg-[#0E0E0E] px-2 py-1 rounded">Khả dụng</span>
                          <button @click="copyCoupon(c.code)" class="inline-flex items-center gap-1 text-[11px] font-semibold border border-[#E5E5E5] hover:border-[#0E0E0E] px-2.5 py-1 rounded bg-white cursor-pointer transition-colors">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                            {{ copiedCode===c.code ? 'Đã chép' : 'Sao chép' }}
                          </button>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Ví ShoeGroup -->
              <div v-else-if="profileTab==='wallet'">
                <h2 style="font-family:'Fraunces',serif" class="text-2xl font-semibold mb-6">Ví ShoeGroup</h2>
                <div class="relative overflow-hidden rounded-2xl bg-[#0E0E0E] text-white p-7 mb-6">
                  <div class="text-[11px] font-bold tracking-[0.2em] uppercase text-white/60 mb-2">Số dư khả dụng</div>
                  <div style="font-family:'Fraunces',serif" class="text-4xl font-semibold mb-6">{{ fmt(walletBalance) }}</div>
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-white/60">ShoeGroup · {{ profile.name }}</span>
                    <img :src="logoGiay" alt="ShoeGroup" class="w-8 h-8 object-contain invert" />
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <button class="bg-[#0E0E0E] text-white py-3 text-[13px] font-semibold rounded-lg hover:bg-[#333] transition-colors border-none cursor-pointer">Nạp tiền</button>
                  <button class="bg-white text-[#0E0E0E] py-3 text-[13px] font-semibold rounded-lg border border-[#E5E5E5] hover:border-[#0E0E0E] transition-colors cursor-pointer">Lịch sử giao dịch</button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ TRANG CHI TIẾT SẢN PHẨM ══ -->
    <template v-else-if="currentPage==='detail' && selectedProduct">
      <div class="pt-[92px] pb-20 min-h-screen bg-white">
        <div class="max-w-[1200px] mx-auto px-6 lg:px-10">

          <!-- Breadcrumb -->
          <div class="flex items-center gap-2 text-xs text-[#737373] mb-6">
            <button @click="currentPage='home'" class="hover:text-[#0E0E0E] transition-colors bg-transparent border-none cursor-pointer p-0">Trang chủ</button>
            <span>/</span>
            <button @click="goToProducts(selectedProduct.category)" class="hover:text-[#0E0E0E] transition-colors bg-transparent border-none cursor-pointer p-0">Sản phẩm</button>
            <span>/</span>
            <span class="text-[#0E0E0E]">{{ selectedProduct.name }}</span>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-start">

            <!-- Gallery -->
            <div class="lg:sticky lg:top-[92px]">
              <div class="aspect-square rounded-2xl overflow-hidden bg-[#F0F0F0] mb-3">
                <img :src="detailImage" :alt="selectedProduct.name" class="w-full h-full object-cover" />
              </div>
              <div class="grid grid-cols-4 gap-3">
                <button v-for="(g, gi) in detailGallery" :key="gi" @click="detailImage = g"
                  class="aspect-square rounded-xl overflow-hidden bg-[#F0F0F0] border-2 transition-colors cursor-pointer p-0"
                  :class="detailImage === g ? 'border-[#0E0E0E]' : 'border-transparent hover:border-[#D4D4D4]'">
                  <img :src="g" :alt="'Ảnh ' + (gi+1)" class="w-full h-full object-cover" />
                </button>
              </div>
            </div>

            <!-- Info -->
            <div>
              <div class="flex items-center gap-2.5 mb-3">
                <span class="text-[11px] font-bold tracking-[0.15em] uppercase text-[#737373]">{{ selectedProduct.brand }}</span>
                <span v-if="selectedProduct.tag" class="text-[10px] font-bold uppercase px-2 py-0.5 rounded" :class="selectedProduct.tag==='Sale' ? 'bg-[#F0F0F0] text-[#0E0E0E]' : 'bg-[#0E0E0E] text-white'">{{ selectedProduct.tag }}</span>
              </div>
              <h1 style="font-family:'Fraunces',serif" class="text-3xl md:text-4xl font-semibold leading-tight mb-3">{{ selectedProduct.name }}</h1>

              <!-- Đánh giá -->
              <div class="flex items-center gap-2 mb-5">
                <div class="flex items-center gap-0.5 text-[#0E0E0E]">
                  <svg v-for="s in 5" :key="s" width="15" height="15" viewBox="0 0 24 24" :fill="s<=4 ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.5"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z"/></svg>
                </div>
                <span class="text-xs text-[#737373]">4.0 · 128 đánh giá</span>
              </div>

              <div class="flex items-baseline gap-3 mb-6">
                <span style="font-family:'Fraunces',serif" class="text-3xl font-semibold">{{ selectedProduct.price }}</span>
                <span v-if="selectedProduct.originalPrice" class="text-base text-[#737373] line-through">{{ selectedProduct.originalPrice }}</span>
              </div>

              <p class="text-sm text-[#737373] leading-relaxed mb-6">
                {{ selectedProduct.name }} thuộc dòng {{ selectedProduct.category }} của {{ selectedProduct.brand }} — thiết kế tối giản, phối màu {{ selectedProduct.color.toLowerCase() }}, đế êm bám tốt cho cả tập luyện lẫn phối đồ hằng ngày.
              </p>

              <!-- Màu sắc -->
              <div class="mb-6">
                <div class="text-[13px] font-semibold mb-2">Màu sắc: <span class="text-[#737373] font-normal">{{ selectedProduct.color }}</span></div>
              </div>

              <!-- Size -->
              <div class="mb-6">
                <div class="flex items-center justify-between mb-2.5">
                  <span class="text-[13px] font-semibold">Chọn size (UK)</span>
                  <button class="text-xs text-[#737373] hover:text-[#0E0E0E] underline underline-offset-2 bg-transparent border-none cursor-pointer p-0">Hướng dẫn chọn size</button>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button v-for="s in sizeOptions" :key="s" @click="detailSize = s"
                    class="w-12 h-11 flex items-center justify-center text-sm font-semibold rounded-lg border transition-colors cursor-pointer"
                    :class="detailSize === s ? 'bg-[#0E0E0E] text-white border-[#0E0E0E]' : 'bg-white text-[#0E0E0E] border-[#E5E5E5] hover:border-[#0E0E0E]'">
                    {{ s }}
                  </button>
                </div>
              </div>

              <!-- Số lượng + CTA -->
              <div class="flex items-center gap-3 mb-4">
                <div class="flex items-center border border-[#E5E5E5] rounded-lg h-12">
                  <button @click="detailQty = Math.max(1, detailQty-1)" aria-label="Giảm" class="w-11 h-full flex items-center justify-center hover:bg-[#F0F0F0] transition-colors bg-transparent border-none cursor-pointer rounded-l-lg">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>
                  </button>
                  <span class="w-10 text-center text-sm font-semibold">{{ detailQty }}</span>
                  <button @click="detailQty++" aria-label="Tăng" class="w-11 h-full flex items-center justify-center hover:bg-[#F0F0F0] transition-colors bg-transparent border-none cursor-pointer rounded-r-lg">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                </div>
                <button @click="addDetailToCart()" class="flex-1 h-12 bg-white text-[#0E0E0E] border border-[#0E0E0E] rounded-lg text-[14px] font-semibold hover:bg-[#F0F0F0] transition-colors cursor-pointer">
                  Thêm vào giỏ
                </button>
              </div>
              <button @click="buyNow" class="w-full h-12 bg-[#0E0E0E] text-white rounded-lg text-[14px] font-semibold hover:bg-[#333] transition-colors border-none cursor-pointer mb-6">
                Mua ngay
              </button>

              <!-- Cam kết -->
              <div class="border-t border-[#E5E5E5] pt-5 space-y-3">
                <div v-for="item in trustItems" :key="item.title" class="flex items-center gap-3">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="text-[#0E0E0E] flex-shrink-0" v-html="trustIcons[item.icon]"></svg>
                  <span class="text-[13px]"><span class="font-semibold">{{ item.title }}</span> · <span class="text-[#737373]">{{ item.sub }}</span></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Sản phẩm liên quan -->
          <div v-if="relatedProducts.length" class="mt-16">
            <h2 style="font-family:'Fraunces',serif" class="text-2xl md:text-3xl font-semibold mb-6">Sản phẩm liên quan</h2>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-8">
              <ProductCard v-for="p in relatedProducts" :key="p.id" :p="p"
                :wished="wishlist.includes(p.id)" @wish="toggleWishlist(p.id)" @add="addToCart(p)" @open="openDetail(p)" />
            </div>
          </div>

        </div>
      </div>
    </template>

    <!-- ══ TRANG THANH TOÁN ══ -->
    <template v-else-if="currentPage==='checkout'">
      <div class="pt-[68px] min-h-screen bg-white">
        <div class="max-w-[1180px] mx-auto grid grid-cols-1 lg:grid-cols-2">

          <!-- Cột trái: biểu mẫu -->
          <div class="px-6 lg:px-10 py-10 lg:border-r border-[#E5E5E5] order-2 lg:order-1">
            <button @click="cartOpen=true; currentPage='home'" class="flex items-center gap-1.5 text-xs text-[#737373] hover:text-[#0E0E0E] transition-colors mb-6 bg-transparent border-none cursor-pointer p-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Quay lại giỏ hàng
            </button>

            <!-- Liên hệ -->
            <div class="flex items-center justify-between mb-3">
              <h2 style="font-family:'Fraunces',serif" class="text-xl font-semibold">Liên hệ</h2>
              <button @click="goToProfile('info')" class="text-[13px] font-semibold underline underline-offset-4 bg-transparent border-none cursor-pointer p-0 hover:text-[#737373]">Đăng nhập</button>
            </div>
            <input v-model="checkout.email" type="email" placeholder="Email" class="w-full border border-[#E5E5E5] rounded-lg px-4 py-3.5 text-sm outline-none focus:border-[#0E0E0E] transition-colors mb-3" />
            <label class="flex items-center gap-2.5 mb-8 cursor-pointer select-none">
              <input v-model="checkout.news" type="checkbox" class="w-4 h-4 accent-[#0E0E0E] cursor-pointer" />
              <span class="text-[13px] text-[#0E0E0E]/80">Gửi cho tôi tin tức và ưu đãi qua email</span>
            </label>

            <!-- Địa chỉ đã lưu -->
            <div v-if="addresses.length" class="mb-6">
              <div class="text-[10px] font-bold tracking-[0.18em] uppercase text-[#737373] mb-2.5">Chọn địa chỉ đã lưu</div>
              <div class="flex flex-col gap-2">
                <button v-for="a in addresses" :key="a.id"
                  @click="checkout.firstName=a.name; checkout.phone=a.phone; checkout.address=a.detail; setDefaultAddress(a.id)"
                  class="flex items-start gap-3 text-left border rounded-xl p-3.5 transition-colors bg-white cursor-pointer"
                  :class="a.default ? 'border-[#0E0E0E]' : 'border-[#E5E5E5] hover:border-[#737373]'">
                  <span class="mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center" :class="a.default ? 'border-[#0E0E0E]' : 'border-[#D4D4D4]'">
                    <span v-if="a.default" class="w-2 h-2 rounded-full bg-[#0E0E0E]"></span>
                  </span>
                  <span class="min-w-0">
                    <span class="flex items-center flex-wrap gap-x-1.5 gap-y-1">
                      <span class="text-sm font-semibold">{{ a.name }} · {{ a.phone }}</span>
                      <span v-if="a.default" class="text-[10px] font-bold text-white bg-[#0E0E0E] px-1.5 py-0.5 rounded leading-none">Mặc định</span>
                    </span>
                    <span class="block text-xs text-[#737373] mt-1">{{ a.detail }}</span>
                  </span>
                </button>
              </div>
            </div>

            <!-- Giao hàng -->
            <h2 style="font-family:'Fraunces',serif" class="text-xl font-semibold mb-1">Giao hàng</h2>
            <p class="text-[13px] text-[#737373] mb-4">Địa chỉ này cũng sẽ được dùng làm địa chỉ thanh toán cho đơn hàng này.</p>
            <div class="space-y-3">
              <div class="relative">
                <label class="absolute left-4 top-2 text-[10px] text-[#737373]">Quốc gia/Vùng</label>
                <select v-model="checkout.country" class="w-full appearance-none border border-[#E5E5E5] rounded-lg px-4 pt-6 pb-2 text-sm outline-none focus:border-[#0E0E0E] transition-colors bg-white cursor-pointer">
                  <option>Việt Nam</option><option>Singapore</option><option>Thái Lan</option>
                </select>
                <svg class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#737373]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <input v-model="checkout.firstName" type="text" placeholder="Tên" class="w-full border border-[#E5E5E5] rounded-lg px-4 py-3.5 text-sm outline-none focus:border-[#0E0E0E] transition-colors" />
                <input v-model="checkout.lastName" type="text" placeholder="Họ" class="w-full border border-[#E5E5E5] rounded-lg px-4 py-3.5 text-sm outline-none focus:border-[#0E0E0E] transition-colors" />
              </div>
              <input v-model="checkout.address" type="text" placeholder="Địa chỉ" class="w-full border border-[#E5E5E5] rounded-lg px-4 py-3.5 text-sm outline-none focus:border-[#0E0E0E] transition-colors" />
              <input v-model="checkout.ward" type="text" placeholder="Phường Xã, Quận Huyện (Bắt buộc)" class="w-full border border-[#E5E5E5] rounded-lg px-4 py-3.5 text-sm outline-none focus:border-[#0E0E0E] transition-colors" />
              <div class="grid grid-cols-2 gap-3">
                <input v-model="checkout.city" type="text" placeholder="Thành phố" class="w-full border border-[#E5E5E5] rounded-lg px-4 py-3.5 text-sm outline-none focus:border-[#0E0E0E] transition-colors" />
                <input v-model="checkout.zip" type="text" placeholder="Mã bưu chính (không bắt buộc)" class="w-full border border-[#E5E5E5] rounded-lg px-4 py-3.5 text-sm outline-none focus:border-[#0E0E0E] transition-colors" />
              </div>
              <input v-model="checkout.phone" type="tel" placeholder="Điện thoại" class="w-full border border-[#E5E5E5] rounded-lg px-4 py-3.5 text-sm outline-none focus:border-[#0E0E0E] transition-colors" />
              <label class="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                <input v-model="checkout.save" type="checkbox" class="w-4 h-4 accent-[#0E0E0E] cursor-pointer" />
                <span class="text-[13px] text-[#0E0E0E]/80">Lưu lại thông tin này cho lần sau</span>
              </label>
            </div>

            <!-- Phương thức vận chuyển -->
            <h2 style="font-family:'Fraunces',serif" class="text-xl font-semibold mt-8 mb-3">Phương thức vận chuyển</h2>
            <div class="flex items-center justify-between border border-[#0E0E0E] rounded-lg px-4 py-4">
              <div>
                <div class="text-sm font-semibold">Giao hàng tiêu chuẩn</div>
                <div class="text-xs text-[#737373] mt-0.5">Thời gian nhận: 3-5 ngày</div>
              </div>
              <span class="text-[13px] font-bold uppercase">Miễn phí</span>
            </div>

            <!-- Thanh toán -->
            <h2 style="font-family:'Fraunces',serif" class="text-xl font-semibold mt-8 mb-1">Thanh toán</h2>
            <p class="text-[13px] text-[#737373] mb-4">Địa chỉ thanh toán của phương thức thanh toán phải khớp với địa chỉ giao hàng. Toàn bộ các giao dịch được bảo mật và mã hóa.</p>
            <div class="border border-[#E5E5E5] rounded-xl overflow-hidden divide-y divide-[#E5E5E5]">
              <div v-for="m in paymentMethods" :key="m.key"
                :class="checkout.payment===m.key ? 'bg-white ring-1 ring-inset ring-[#0E0E0E]' : 'bg-white'">
                <label class="flex items-center justify-between gap-3 px-4 py-4 cursor-pointer">
                  <span class="flex items-center gap-3">
                    <span class="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center" :class="checkout.payment===m.key ? 'border-[#0E0E0E]' : 'border-[#D4D4D4]'">
                      <span v-if="checkout.payment===m.key" class="w-2 h-2 rounded-full bg-[#0E0E0E]"></span>
                    </span>
                    <input v-model="checkout.payment" :value="m.key" type="radio" name="payment" class="hidden" />
                    <span class="text-[13px] font-semibold">{{ m.label }}</span>
                  </span>
                  <span v-if="m.cards" class="flex items-center gap-1 flex-shrink-0">
                    <span class="text-[8px] font-bold text-white bg-[#EB001B] rounded px-1 py-0.5">MC</span>
                    <span class="text-[8px] font-bold text-white bg-[#0E0E0E] rounded px-1 py-0.5">JCB</span>
                    <span class="text-[8px] font-bold text-white bg-[#1A1F71] rounded px-1 py-0.5">VISA</span>
                    <span class="text-[8px] font-bold text-[#0E0E0E] bg-[#F0F0F0] rounded px-1 py-0.5">+2</span>
                  </span>
                </label>
                <div v-if="checkout.payment===m.key && m.note" class="px-4 pb-4 -mt-1">
                  <div class="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg px-4 py-4 text-center text-[13px] text-[#737373]">{{ m.note }}</div>
                </div>
              </div>
            </div>

            <button class="w-full bg-[#0E0E0E] text-white py-4 rounded-lg text-[15px] font-semibold hover:bg-[#333] transition-colors border-none cursor-pointer mt-6">
              Thanh toán ngay
            </button>
          </div>

          <!-- Cột phải: tóm tắt đơn -->
          <div class="px-6 lg:px-10 py-10 bg-[#FAFAFA] order-1 lg:order-2">
            <div class="lg:sticky lg:top-[92px]">
              <div class="space-y-4 mb-6">
                <div v-for="item in cart" :key="item.id" class="flex items-center gap-4">
                  <div class="relative flex-shrink-0">
                    <img :src="item.img" :alt="item.name" class="w-16 h-16 rounded-lg object-cover bg-white border border-[#E5E5E5]" />
                    <span class="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 bg-[#0E0E0E] text-white text-[11px] font-bold rounded-full flex items-center justify-center">{{ item.qty }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-[13px] font-semibold leading-tight">{{ item.name }}</div>
                    <div class="text-xs text-[#737373] mt-0.5">UK {{ item.size }} · {{ item.color }}</div>
                  </div>
                  <div class="text-[13px] font-semibold whitespace-nowrap">{{ fmt(item.price * item.qty) }}</div>
                </div>
              </div>

              <div class="flex gap-2 mb-6">
                <input v-model="couponInput" type="text" placeholder="Mã giảm giá hoặc thẻ quà tặng" class="flex-1 border border-[#E5E5E5] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#0E0E0E] transition-colors bg-white" />
                <button class="px-5 text-[13px] font-semibold rounded-lg border border-[#E5E5E5] text-[#737373] hover:border-[#0E0E0E] hover:text-[#0E0E0E] transition-colors bg-white cursor-pointer whitespace-nowrap">Áp dụng</button>
              </div>

              <div class="space-y-2.5 pb-5 border-b border-[#E5E5E5]">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-[#0E0E0E]/80">Tổng tiền {{ cartCount }} mặt hàng</span>
                  <span class="font-semibold">{{ fmt(cartSubtotal) }}</span>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-[#0E0E0E]/80 inline-flex items-center gap-1">Vận chuyển
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="text-[#737373]"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  </span>
                  <span class="font-bold uppercase text-[13px]">Miễn phí</span>
                </div>
              </div>
              <div class="flex items-end justify-between pt-5">
                <span style="font-family:'Fraunces',serif" class="text-xl font-semibold">Tổng</span>
                <span class="flex items-baseline gap-1.5">
                  <span class="text-[11px] text-[#737373] font-medium">VND</span>
                  <span style="font-family:'Fraunces',serif" class="text-2xl font-semibold">{{ fmt(cartSubtotal) }}</span>
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </template>

    <!-- ══ GIỎ HÀNG (SLIDE-OVER) ══ -->
    <transition
      enter-active-class="transition-opacity duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="cartOpen" class="fixed inset-0 z-[60] bg-[#0E0E0E]/40 backdrop-blur-[2px]" @click="closeCart"></div>
    </transition>
    <transition
      enter-active-class="transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]" enter-from-class="translate-x-full" enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300 ease-in" leave-from-class="translate-x-0" leave-to-class="translate-x-full">
      <aside v-if="cartOpen" class="fixed top-0 right-0 bottom-0 z-[70] w-full max-w-[440px] bg-white flex flex-col shadow-[-20px_0_60px_-20px_rgba(0,0,0,0.35)]">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-5 border-b border-[#E5E5E5]">
          <h2 style="font-family:'Fraunces',serif" class="text-xl font-semibold uppercase tracking-tight">Giỏ hàng của bạn ({{ cartCount }})</h2>
          <button @click="closeCart" aria-label="Đóng" class="w-9 h-9 flex items-center justify-center rounded-full bg-[#F0F0F0] hover:bg-[#E5E5E5] transition-colors border-none cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Items -->
        <div class="flex-1 overflow-y-auto px-6">
          <template v-if="cart.length">
            <div v-for="item in cart" :key="item.id" class="flex gap-3.5 py-5 border-b border-[#E5E5E5]">
              <img :src="item.img" :alt="item.name" class="w-20 h-20 rounded-lg object-cover bg-[#F0F0F0] flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div class="font-semibold text-[15px] leading-tight">{{ item.name }}</div>
                    <div class="text-xs text-[#737373] mt-0.5">{{ item.size }} / {{ item.color }}</div>
                  </div>
                  <div class="font-bold text-[15px] whitespace-nowrap">{{ fmt(item.price * item.qty) }}</div>
                </div>
                <div class="flex items-center justify-between mt-3">
                  <div class="flex items-center border border-[#E5E5E5] rounded-lg">
                    <button @click="changeQty(item, -1)" aria-label="Giảm" class="w-8 h-8 flex items-center justify-center hover:bg-[#F0F0F0] transition-colors bg-transparent border-none cursor-pointer rounded-l-lg">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>
                    </button>
                    <span class="w-8 text-center text-sm font-semibold">{{ item.qty }}</span>
                    <button @click="changeQty(item, 1)" aria-label="Tăng" class="w-8 h-8 flex items-center justify-center hover:bg-[#F0F0F0] transition-colors bg-transparent border-none cursor-pointer rounded-r-lg">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-[#737373]">{{ fmt(item.price) }} / sp</span>
                    <button @click="removeFromCart(item.id)" aria-label="Xóa" class="text-[#737373] hover:text-[#C0392B] transition-colors bg-transparent border-none cursor-pointer p-0">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button @click="clearCart" class="text-[13px] text-[#737373] hover:text-[#0E0E0E] underline underline-offset-4 py-4 bg-transparent border-none cursor-pointer">Xóa toàn bộ giỏ hàng</button>

            <!-- Gợi ý -->
            <div class="mt-2 mb-6 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-4">
              <div class="flex items-center justify-between mb-3">
                <span class="text-[11px] font-bold tracking-[0.15em] uppercase">Gợi ý dành cho bạn</span>
                <button @click="goToProducts('all')" class="text-[12px] font-semibold hover:underline underline-offset-4 bg-transparent border-none cursor-pointer p-0">Xem thêm</button>
              </div>
              <div class="grid grid-cols-3 gap-2.5">
                <button v-for="s in cartSuggest.slice(0,3)" :key="s.id" @click="addToCart(s)" class="group text-left bg-transparent border-none cursor-pointer p-0">
                  <div class="aspect-square rounded-lg overflow-hidden bg-white mb-1.5">
                    <img :src="s.img" :alt="s.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div class="text-[11px] font-medium leading-tight line-clamp-1">{{ s.name }}</div>
                  <div class="text-[11px] text-[#737373]">{{ s.price }}</div>
                </button>
              </div>
            </div>
          </template>

          <!-- Giỏ trống -->
          <div v-else class="flex flex-col items-center justify-center text-center py-24 text-[#737373]">
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" class="mb-4 opacity-40"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <div style="font-family:'Fraunces',serif" class="text-xl text-[#0E0E0E] mb-1">Giỏ hàng trống</div>
            <p class="text-sm mb-5">Thêm vài đôi giày để bắt đầu.</p>
            <button @click="closeCart(); goToProducts('all')" class="bg-[#0E0E0E] text-white px-6 py-3 text-[13px] font-semibold rounded-lg hover:bg-[#333] transition-colors border-none cursor-pointer">Khám phá sản phẩm</button>
          </div>
        </div>

        <!-- Footer -->
        <div v-if="cart.length" class="border-t border-[#E5E5E5] px-6 py-5 bg-white">
          <div class="flex items-center justify-between text-sm mb-1.5">
            <span class="text-[#737373]">Tạm tính ({{ cartCount }} sản phẩm)</span>
            <span class="font-semibold">{{ fmt(cartSubtotal) }}</span>
          </div>
          <div class="flex items-center justify-between text-sm mb-4">
            <span class="text-[#737373]">Phí vận chuyển</span>
            <span class="font-semibold">{{ fmt(shippingFee) }}</span>
          </div>
          <button @click="goToCheckout" class="w-full flex items-center justify-center gap-2 bg-[#0E0E0E] text-white py-4 rounded-full text-[14px] font-semibold hover:bg-[#333] transition-colors border-none cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
            Thanh toán {{ fmt(cartTotal) }}
          </button>
          <p class="text-[11px] text-[#737373] text-center mt-3">Nhập coupon và phí vận chuyển ở trang thanh toán</p>
        </div>
      </aside>
    </transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ProductCard from './ProductCard.vue'
import logoGiay from '@/imports/logogiay.png'

// ── Hero peek-carousel ──
type HeroSlide = {
  type?: 'image' | 'video'
  eyebrow: string; title: string; titleEm?: string; sub: string
  cta: string; filter: string; alt?: string; img?: string; src?: string
}

// Video người mang giày bước đi — quảng cáo
const shoeVideos = [
  'https://videos.pexels.com/video-files/13633626/13633626-hd_1920_1080_30fps.mp4',
  'https://videos.pexels.com/video-files/4211071/4211071-hd_1920_1080_25fps.mp4',
  'https://videos.pexels.com/video-files/4830309/4830309-hd_1920_1080_30fps.mp4',
]
const randomVideo = shoeVideos[Math.floor(Math.random() * shoeVideos.length)]

const heroSlides: HeroSlide[] = [
  {
    eyebrow: 'Bộ Sưu Tập Nam 2026', title: 'Giày thể thao', titleEm: 'đỉnh cao',
    sub: 'Thiết kế tối giản, hiệu suất vượt trội. Mỗi bước chân là tuyên ngôn về phong cách sống năng động.',
    cta: 'Mua ngay', filter: 'all', alt: 'Giày thể thao nam trắng',
    img: 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=1600&h=900&fit=crop&auto=format',
  },
  {
    type: 'video',
    eyebrow: 'Trên chân thực tế', title: 'Cảm nhận', titleEm: 'từng chuyển động',
    sub: 'Xem sneaker vận hành thật sự — chất liệu, phom dáng và độ bám qua từng bước chân.',
    cta: 'Khám phá sản phẩm', filter: 'all', src: randomVideo,
  },
  {
    eyebrow: 'Dòng Chạy Bộ', title: 'Được tạo ra', titleEm: 'cho tốc độ',
    sub: 'Công nghệ đệm khí tiên tiến, trọng lượng siêu nhẹ — nâng tầm mỗi cây số của bạn.',
    cta: 'Xem giày chạy', filter: 'running', alt: 'Nam giới chạy bộ với giày thể thao',
    img: 'https://images.unsplash.com/photo-1542219550-37153d387c27?w=1600&h=900&fit=crop&auto=format',
  },
  {
    eyebrow: 'Ưu Đãi Cuối Mùa', title: 'Giảm đến 30%', titleEm: 'số lượng có hạn',
    sub: 'Loạt mẫu lifestyle & training giá tốt nhất năm. Nhanh tay trước khi hết hàng.',
    cta: 'Săn sale ngay', filter: 'sale', alt: 'Giày sneaker nam phong cách đường phố',
    img: 'https://images.unsplash.com/photo-1656164603279-b989e21168ba?w=1600&h=900&fit=crop&auto=format',
  },
]
const activeSlide = ref(0)

// Kích thước responsive cho hiệu ứng "peek"
const heroViewport = ref<HTMLElement | null>(null)
const viewportWidth = ref(1200)
const heroGap = 20
const slideWidth = computed(() => {
  const w = viewportWidth.value
  const peek = w >= 1024 ? 0.80 : w >= 640 ? 0.86 : 0.90
  return Math.round(w * peek)
})
const trackOffset = computed(() =>
  Math.round(viewportWidth.value / 2 - slideWidth.value / 2 - activeSlide.value * (slideWidth.value + heroGap))
)
function measure() {
  if (heroViewport.value) viewportWidth.value = heroViewport.value.clientWidth
}

let heroTimer: ReturnType<typeof setInterval> | null = null
function goToSlide(i: number) { activeSlide.value = i }
function nextSlide() { activeSlide.value = (activeSlide.value + 1) % heroSlides.length }
function prevSlide() { activeSlide.value = (activeSlide.value - 1 + heroSlides.length) % heroSlides.length }
function playHero() {
  pauseHero()
  heroTimer = setInterval(nextSlide, 5000)
}
function pauseHero() {
  if (heroTimer) { clearInterval(heroTimer); heroTimer = null }
}
onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
  playHero()
})
onUnmounted(() => {
  window.removeEventListener('resize', measure)
  pauseHero()
})

const currentPage = ref<'home'|'products'|'profile'|'checkout'|'detail'>('home')
const menuOpen = ref(false)
const openMenu = ref<string | null>(null)
const wishlist = ref<number[]>([])
const email = ref('')
const activeFilter = ref('all')

// ── Định dạng tiền tệ ──
function fmt(n: number) { return n.toLocaleString('vi-VN') + '₫' }
function parsePrice(s: string) { return parseInt(s.replace(/\D/g, ''), 10) || 0 }

// ── Giỏ hàng (slide-over) ──
type CartItem = { id: number; name: string; size: string; color: string; price: number; qty: number; img: string }
const cartOpen = ref(false)
const cart = ref<CartItem[]>([
  { id: 7,  name: 'Street Classic', size: '40', color: 'Trắng', price: 1650000, qty: 1, img: 'https://images.unsplash.com/photo-1710643301117-4d738aeb1e69?w=200&h=200&fit=crop&auto=format' },
  { id: 5,  name: 'Court Legacy',   size: '41', color: 'Đen',   price: 1990000, qty: 1, img: 'https://images.unsplash.com/photo-1610664676282-55c8de64f746?w=200&h=200&fit=crop&auto=format' },
])
const cartCount   = computed(() => cart.value.reduce((s, i) => s + i.qty, 0))
const cartSubtotal = computed(() => cart.value.reduce((s, i) => s + i.price * i.qty, 0))
const shippingFee  = computed(() => (cart.value.length ? 30000 : 0))
const cartTotal    = computed(() => cartSubtotal.value + shippingFee.value)
const cartSuggest  = computed(() => allProducts.filter(p => !cart.value.some(c => c.id === p.id)).slice(0, 4))

function openCart()  { cartOpen.value = true }
function closeCart() { cartOpen.value = false }
function addToCart(p: { id: number; name: string; price: string; color: string; img: string }) {
  const existing = cart.value.find(i => i.id === p.id)
  if (existing) { existing.qty++ }
  else {
    cart.value.push({
      id: p.id, name: p.name, size: '41',
      color: (p.color.split('/')[0] || p.color).trim(),
      price: parsePrice(p.price), qty: 1,
      img: p.img.replace(/w=\d+&h=\d+/, 'w=200&h=200'),
    })
  }
  cartOpen.value = true
}
function changeQty(item: CartItem, delta: number) {
  item.qty += delta
  if (item.qty <= 0) removeFromCart(item.id)
}
function removeFromCart(id: number) { cart.value = cart.value.filter(i => i.id !== id) }
function clearCart() { cart.value = [] }

// ── Trang hồ sơ ──
type ProfileTab = 'info' | 'address' | 'orders' | 'coupons' | 'wallet'
const profileTab = ref<ProfileTab>('info')
const profileNav: { key: ProfileTab | 'logout'; label: string; icon: string }[] = [
  { key: 'info',    label: 'Thông tin cá nhân', icon: 'user' },
  { key: 'address', label: 'Sổ địa chỉ',        icon: 'pin'  },
  { key: 'orders',  label: 'Đơn hàng của tôi',  icon: 'box'  },
  { key: 'coupons', label: 'Mã giảm giá',       icon: 'ticket' },
  { key: 'wallet',  label: 'Ví ShoeGroup',      icon: 'wallet' },
  { key: 'logout',  label: 'Đăng xuất',         icon: 'logout' },
]
const profileIcons: Record<string, string> = {
  user:   '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>',
  pin:    '<path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  box:    '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  ticket: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M16 12h.01M3 9h18"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
}
const profile = ref({ name: 'haianh', phone: '0901234567', email: 'haianh32235@gmail.com' })
const addresses = ref([
  { id: 1, name: 'haianh', phone: '0901234567', detail: '123, Phường Thủ Dầu Một, Thành phố Hồ Chí Minh', default: true },
  { id: 2, name: 'haianh', phone: '0901234567', detail: '234, Phường Nùng Trí Cao, Tỉnh Cao Bằng', default: false },
  { id: 3, name: 'haianh', phone: '0901234567', detail: '123, Phường Ngọc Hà, Thành phố Hà Nội', default: false },
])
function setDefaultAddress(id: number) { addresses.value.forEach(a => a.default = a.id === id) }
function removeAddress(id: number) { addresses.value = addresses.value.filter(a => a.id !== id) }
const coupons = ref([
  { code: 'FLASH50',     desc: 'Mã giảm giá',  amount: '-50.000₫', min: 'Đơn tối thiểu 0₫', exp: 'HSD: 5/8/2026',   status: 'expired' },
  { code: 'WELCOME2026', desc: 'Mã giảm giá',  amount: '-15.000₫', min: 'Đơn tối thiểu 0₫', exp: 'HSD: 31/12/2026', status: 'active' },
])
const copiedCode = ref('')
function copyCoupon(code: string) {
  navigator.clipboard?.writeText(code)
  copiedCode.value = code
  setTimeout(() => { if (copiedCode.value === code) copiedCode.value = '' }, 1500)
}
const walletBalance = ref(250000)
function goToProfile(tab: ProfileTab = 'info') {
  profileTab.value = tab
  currentPage.value = 'profile'
  menuOpen.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function onProfileNav(key: ProfileTab | 'logout') {
  if (key === 'logout') { currentPage.value = 'home'; window.scrollTo({ top: 0, behavior: 'smooth' }) }
  else profileTab.value = key
}

// Thêm / quản lý địa chỉ (tối đa 5)
const MAX_ADDRESSES = 5
const showAddrForm = ref(false)
const newAddr = ref({ name: '', phone: '', detail: '' })
function addAddress() {
  if (addresses.value.length >= MAX_ADDRESSES) return
  const makeDefault = addresses.value.length === 0
  addresses.value.push({
    id: Date.now(),
    name: newAddr.value.name.trim() || 'Người nhận',
    phone: newAddr.value.phone.trim() || '—',
    detail: newAddr.value.detail.trim() || 'Chưa có chi tiết',
    default: makeDefault,
  })
  if (makeDefault) setDefaultAddress(addresses.value[addresses.value.length - 1].id)
  newAddr.value = { name: '', phone: '', detail: '' }
  showAddrForm.value = false
}

// ── Tìm kiếm thông minh ──
const searchOpen = ref(false)
const searchQuery = ref('')
const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  return allProducts.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.brand.toLowerCase().includes(q) ||
    p.color.toLowerCase().includes(q)
  ).slice(0, 6)
})
const popularSearches = ['Chạy bộ', 'Bóng rổ', 'Sale', 'RUNTEK', 'Trắng', 'Training']
function toggleSearch() { searchOpen.value = !searchOpen.value }
function closeSearch() { searchOpen.value = false }
function pickSearchResult(p: { category: string }) {
  searchOpen.value = false
  searchQuery.value = ''
  goToProducts(p.category)
}
function pickPopular(term: string) {
  const map: Record<string, string> = {
    'Chạy bộ': 'running', 'Bóng rổ': 'basketball', 'Sale': 'sale', 'Training': 'training',
  }
  searchOpen.value = false
  searchQuery.value = ''
  goToProducts(map[term] || 'all')
}

// ── Thanh toán ──
const checkout = ref({
  email: '', news: true, country: 'Việt Nam',
  firstName: '', lastName: '', address: '', ward: '', city: '', zip: '', phone: '',
  save: false, shipping: 'standard', payment: 'card',
})
const couponInput = ref('')
const paymentMethods = [
  { key: 'card', label: 'Payoo - Thanh toán thẻ (Credit/ATM Card)', note: 'Bạn sẽ được chuyển hướng đến Payoo - Thanh toán thẻ (Credit/ATM Card) để hoàn tất mua hàng', cards: true },
  { key: 'qr',   label: 'Payoo - Thanh toán QR Code', note: '', cards: true },
  { key: 'cod',  label: 'Thanh toán khi nhận hàng (COD)', note: '', cards: false },
]
function goToCheckout() {
  if (!cart.value.length) return
  cartOpen.value = false
  const def = addresses.value.find(a => a.default)
  if (def) {
    checkout.value.firstName = def.name
    checkout.value.phone = def.phone
    checkout.value.address = def.detail
  }
  currentPage.value = 'checkout'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

type NavLink = {
  label: string
  filter: string
  sale?: boolean
  menu?: { label: string; filter: string }[]
}

const navLinks: NavLink[] = [
  { label: 'Sale',     filter: 'sale', sale: true },
  { label: 'Hàng Mới', filter: 'new' },
  { label: 'Thương Hiệu', filter: 'all', menu: [
    { label: 'RUNTEK',  filter: 'all' },
    { label: 'VELOX',   filter: 'all' },
    { label: 'AXON',    filter: 'all' },
    { label: 'SPORTEK', filter: 'all' },
  ]},
  { label: 'Danh Mục', filter: 'all', menu: [
    { label: 'Chạy Bộ',   filter: 'running' },
    { label: 'Bóng Rổ',   filter: 'basketball' },
    { label: 'Training',  filter: 'training' },
    { label: 'Lifestyle', filter: 'lifestyle' },
  ]},
]

function goToProducts(filter: string) {
  activeFilter.value = filter
  currentPage.value = 'products'
  menuOpen.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ── Chi tiết sản phẩm ──
type Product = typeof allProducts[number]
const selectedProduct = ref<Product | null>(null)
const detailImage = ref('')
const detailSize = ref('41')
const detailQty = ref(1)
const sizeOptions = ['39', '40', '41', '42', '43', '44']
const bigImg = (url: string) => url.replace(/w=\d+&h=\d+/, 'w=900&h=900')
const detailGallery = computed(() => {
  if (!selectedProduct.value) return []
  const base = bigImg(selectedProduct.value.img)
  const others = allProducts
    .filter(p => p.category === selectedProduct.value!.category && p.id !== selectedProduct.value!.id)
    .slice(0, 3).map(p => bigImg(p.img))
  return [base, ...others]
})
const relatedProducts = computed(() => {
  if (!selectedProduct.value) return []
  return allProducts.filter(p => p.category === selectedProduct.value!.category && p.id !== selectedProduct.value!.id).slice(0, 5)
})
function openDetail(p: Product) {
  selectedProduct.value = p
  detailImage.value = bigImg(p.img)
  detailSize.value = '41'
  detailQty.value = 1
  currentPage.value = 'detail'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function addDetailToCart(open = true) {
  const p = selectedProduct.value
  if (!p) return
  const existing = cart.value.find(i => i.id === p.id && i.size === detailSize.value)
  if (existing) { existing.qty += detailQty.value }
  else {
    cart.value.push({
      id: p.id, name: p.name, size: detailSize.value,
      color: (p.color.split('/')[0] || p.color).trim(),
      price: parsePrice(p.price), qty: detailQty.value,
      img: p.img.replace(/w=\d+&h=\d+/, 'w=200&h=200'),
    })
  }
  if (open) cartOpen.value = true
}
function buyNow() { addDetailToCart(false); goToCheckout() }

function toggleWishlist(id: number) {
  const idx = wishlist.value.indexOf(id)
  if (idx === -1) wishlist.value.push(id)
  else wishlist.value.splice(idx, 1)
}

const tickerItems = ['CHẠY BỘ NAM', 'BÓNG RỔ', 'TRAINING', 'LIFESTYLE', 'TENNIS', 'SALE -30%']
const filters = [
  { key: 'all',        label: 'Tất cả'   },
  { key: 'running',    label: 'Chạy Bộ'  },
  { key: 'basketball', label: 'Bóng Rổ'  },
  { key: 'training',   label: 'Training'  },
  { key: 'lifestyle',  label: 'Lifestyle' },
  { key: 'sale',       label: 'Sale'      },
]

const allProducts = [
  { id:1,  name:'Air Pulse Pro',   brand:'RUNTEK',  price:'2.490.000₫', originalPrice:'3.200.000₫', tag:'Bán chạy', color:'Trắng / Đen',   category:'running',    img:'https://images.unsplash.com/photo-1625860191460-10a66c7384fb?w=400&h=540&fit=crop&auto=format' },
  { id:2,  name:'Phantom Strike',  brand:'VELOX',   price:'3.190.000₫', originalPrice:null,          tag:'Mới',      color:'Đen / Đỏ',      category:'basketball', img:'https://images.unsplash.com/photo-1710553455491-482fa1751dc4?w=400&h=540&fit=crop&auto=format' },
  { id:3,  name:'Stratos Runner',  brand:'AXON',    price:'1.890.000₫', originalPrice:'2.400.000₫', tag:'Sale',     color:'Xám / Trắng',   category:'running',    img:'https://images.unsplash.com/photo-1637437757614-6491c8e915b5?w=400&h=540&fit=crop&auto=format' },
  { id:4,  name:'Boost Ultra',     brand:'SPORTEK', price:'2.750.000₫', originalPrice:null,          tag:'Limited',  color:'Xanh / Trắng',  category:'training',   img:'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400&h=540&fit=crop&auto=format' },
  { id:5,  name:'Court Legacy',    brand:'RUNTEK',  price:'1.990.000₫', originalPrice:'2.500.000₫', tag:'Sale',     color:'Đen / Vàng',    category:'basketball', img:'https://images.unsplash.com/photo-1610664676282-55c8de64f746?w=400&h=540&fit=crop&auto=format' },
  { id:6,  name:'Zone Flex',       brand:'AXON',    price:'2.200.000₫', originalPrice:null,          tag:'Mới',      color:'Trắng / Xám',   category:'training',   img:'https://images.unsplash.com/photo-1645784127380-77aeb81be500?w=400&h=540&fit=crop&auto=format' },
  { id:7,  name:'Street Classic',  brand:'VELOX',   price:'1.650.000₫', originalPrice:null,          tag:'Bán chạy', color:'Trắng thuần',   category:'lifestyle',  img:'https://images.unsplash.com/photo-1710643301117-4d738aeb1e69?w=400&h=540&fit=crop&auto=format' },
  { id:8,  name:'Sprint X9',       brand:'SPORTEK', price:'3.490.000₫', originalPrice:null,          tag:'Limited',  color:'Đỏ / Đen',      category:'running',    img:'https://images.unsplash.com/photo-1676041669566-fead69bd7007?w=400&h=540&fit=crop&auto=format' },
  { id:9,  name:'Urban Walker',    brand:'RUNTEK',  price:'1.490.000₫', originalPrice:'1.800.000₫', tag:'Sale',     color:'Navy / Trắng',  category:'lifestyle',  img:'https://images.unsplash.com/photo-1625860191460-10a66c7384fb?w=400&h=540&fit=crop&auto=format' },
  { id:10, name:'Hoop Elite',      brand:'AXON',    price:'2.990.000₫', originalPrice:null,          tag:'Mới',      color:'Đen / Bạc',     category:'basketball', img:'https://images.unsplash.com/photo-1710553455491-482fa1751dc4?w=400&h=540&fit=crop&auto=format' },
  { id:11, name:'Tempo Light',     brand:'VELOX',   price:'2.050.000₫', originalPrice:'2.600.000₫', tag:'Sale',     color:'Cam / Đen',     category:'running',    img:'https://images.unsplash.com/photo-1637437757614-6491c8e915b5?w=400&h=540&fit=crop&auto=format' },
  { id:12, name:'Grip Force',      brand:'SPORTEK', price:'1.750.000₫', originalPrice:null,          tag:'Mới',      color:'Xanh lá / Đen', category:'training',   img:'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400&h=540&fit=crop&auto=format' },
]

const filteredProducts = computed(() => {
  if (activeFilter.value === 'all')  return allProducts
  if (activeFilter.value === 'sale') return allProducts.filter(p => p.tag === 'Sale')
  if (activeFilter.value === 'new')  return allProducts.filter(p => p.tag === 'Mới')
  return allProducts.filter(p => p.category === activeFilter.value)
})

const banners = [
  {
    eyebrow: 'Dòng Hiệu Suất Cao', title: 'Được tạo ra', titleEm: 'cho tốc độ',
    sub: 'Công nghệ đệm khí tiên tiến, trọng lượng siêu nhẹ. Mỗi đôi giày được kiểm tra khắt khe trước khi đến tay bạn.',
    cta: 'Xem bộ sưu tập', filter: 'running', dark: true,
    alt: 'Nam giới chạy bộ với giày thể thao',
    img: 'https://images.unsplash.com/photo-1656164753657-8ff832063a71?w=900&h=1100&fit=crop&auto=format',
  },
  {
    eyebrow: 'Sân đấu bóng rổ', title: 'Bứt phá mọi giới hạn',
    sub: 'Giày bóng rổ nam bám sân tối ưu, hỗ trợ cổ chân vững chắc.',
    cta: 'Khám phá ngay', filter: 'basketball', dark: true,
    alt: 'Giày bóng rổ nam',
    img: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=900&h=600&fit=crop&auto=format',
  },
  {
    eyebrow: 'Giảm đến 30%', title: 'Ưu đãi cuối mùa',
    sub: 'Loạt mẫu lifestyle & training giá tốt, số lượng có hạn.',
    cta: 'Săn sale', filter: 'sale', dark: false,
    alt: 'Giày sneaker trắng phong cách lifestyle',
    img: 'https://images.unsplash.com/photo-1544441892-794166f1e3be?w=900&h=600&fit=crop&auto=format',
  },
]

const categories = [
  { label:'Chạy Bộ',  count:'128 sản phẩm', filter:'running',    img:'https://images.unsplash.com/photo-1656164753657-8ff832063a71?w=600&h=800&fit=crop&auto=format' },
  { label:'Bóng Rổ',  count:'74 sản phẩm',  filter:'basketball', img:'https://images.unsplash.com/photo-1469395446868-fb6a048d5ca3?w=600&h=800&fit=crop&auto=format' },
  { label:'Training',  count:'95 sản phẩm', filter:'training',   img:'https://images.unsplash.com/photo-1554139844-af2fc8ad3a3a?w=600&h=800&fit=crop&auto=format' },
]
const trustItems = [
  { icon:'truck',   title:'Miễn phí vận chuyển', sub:'Đơn từ 1.500.000₫' },
  { icon:'return',  title:'Đổi trả 30 ngày',     sub:'Miễn phí, dễ dàng'  },
  { icon:'shield',  title:'Chính hãng 100%',     sub:'Cam kết hoàn tiền'  },
  { icon:'support', title:'Hỗ trợ 24/7',         sub:'Luôn sẵn sàng'      },
]
const trustIcons: Record<string, string> = {
  truck:   '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  return:  '<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>',
  shield:  '<path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>',
  support: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-3v-8h3a2 2 0 0 1 2 2z"/><path d="M3 19a2 2 0 0 0 2 2h3v-8H5a2 2 0 0 0-2 2z"/>',
}
const footerCols = [
  { title:'Sản phẩm', links:['Giày chạy bộ','Giày bóng rổ','Giày training','Giày lifestyle'] },
  { title:'Hỗ trợ',  links:['Chọn size','Đổi trả','Theo dõi đơn','Câu hỏi thường gặp']        },
  { title:'Công ty', links:['Về chúng tôi','Tuyển dụng','Đối tác','Liên hệ']                  },
]
</script>

<style>
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.animate-marquee { animation: marquee 22s linear infinite; }
a { text-decoration: none !important; }
</style>
