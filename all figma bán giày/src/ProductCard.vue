<template>
  <article class="group flex flex-col">
    <!-- Image -->
    <div class="relative overflow-hidden bg-[#F0F0F0] mb-3">
      <span :class="tagCls(p.tag)" class="absolute top-3 left-3 z-10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide">{{ p.tag }}</span>
      <button @click="$emit('wish')" aria-label="Yêu thích"
        class="absolute top-2.5 right-2.5 z-10 w-8 h-8 bg-white/90 hover:bg-white flex items-center justify-center rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer">
        <svg width="15" height="15" viewBox="0 0 24 24" :fill="wished ? '#0E0E0E' : 'none'" :stroke="wished ? '#0E0E0E' : '#555'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      <img :src="p.img" :alt="p.name" loading="lazy" @click="$emit('open')"
        class="w-full aspect-[4/5] object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"/>

      <!-- Add to cart on hover -->
      <button @click="$emit('add')" class="absolute bottom-0 left-0 right-0 bg-[#0E0E0E] text-[#FFFFFF] py-3 text-[13px] font-semibold tracking-wide hover:bg-[#333333] transition-colors border-none cursor-pointer translate-y-full group-hover:translate-y-0 duration-300 hidden lg:block">
        Thêm vào giỏ
      </button>
    </div>

    <!-- Info -->
    <div class="flex flex-col">
      <div class="text-[11px] font-bold tracking-[0.1em] text-[#737373] mb-1">{{ p.brand }}</div>
      <h3 @click="$emit('open')" style="font-family:'Fraunces',serif" class="text-[15px] font-medium leading-snug mb-0.5 line-clamp-1 cursor-pointer hover:underline underline-offset-2">{{ p.name }}</h3>
      <div class="text-[12px] text-[#737373] mb-2 line-clamp-1">{{ p.color }}</div>
      <div class="flex items-baseline gap-2">
        <span class="font-bold text-[15px]">{{ p.price }}</span>
        <span v-if="p.originalPrice" class="text-[12px] text-[#737373] line-through">{{ p.originalPrice }}</span>
      </div>

      <!-- Add to cart (mobile / no-hover) -->
      <button @click="$emit('add')" class="lg:hidden mt-3 w-full bg-[#0E0E0E] text-[#FFFFFF] py-2.5 text-[13px] font-semibold hover:bg-[#333333] transition-colors border-none cursor-pointer">
        Thêm vào giỏ
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
type Product = {
  id: number; name: string; brand: string; price: string
  originalPrice: string | null; tag: string; color: string
  category: string; img: string
}

defineProps<{ p: Product; wished: boolean }>()
defineEmits<{ wish: []; add: []; open: [] }>()

function tagCls(tag: string) {
  if (tag === 'Sale')    return 'bg-[#FFFFFF] text-[#0E0E0E]'
  if (tag === 'Mới')     return 'bg-[#0E0E0E] text-[#FFFFFF]'
  if (tag === 'Limited') return 'bg-[#0E0E0E] text-white'
  return 'bg-white text-[#0E0E0E]'
}
</script>
