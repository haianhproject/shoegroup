<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
const columns = [
  { title: 'Sản phẩm', links: [{ label: 'Giày chạy bộ', query: { filter: 'running' } }, { label: 'Giày bóng rổ', query: { filter: 'basketball' } }, { label: 'Giày training', query: { filter: 'training' } }, { label: 'Giày lifestyle', query: { filter: 'lifestyle' } }] },
  { title: 'Hỗ trợ', links: [{ label: 'Chọn size', path: '/contact' }, { label: 'Đổi trả', path: '/returns' }, { label: 'Theo dõi đơn', path: '/orders' }, { label: 'Câu hỏi thường gặp', path: '/contact' }] },
  { title: 'Công ty', links: [{ label: 'Về chúng tôi', path: '/about' }, { label: 'Liên hệ', path: '/contact' }, { label: 'Tài khoản', path: '/account' }] },
]

const go = (link) => {
  if (link.path) router.push(link.path)
  else router.push({ path: '/products', query: link.query })
}
</script>

<template>
  <footer class="border-t border-[#E5E5E5] bg-white px-5 py-12 sm:px-6 lg:px-12">
    <div class="mx-auto max-w-[1400px]">
      <div class="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)] lg:gap-16">
        <div>
          <button type="button" class="flex items-center gap-2 border-0 bg-transparent p-0" @click="router.push('/')">
            <span class="figma-display text-2xl font-semibold">ShoeGroup</span>
          </button>
          <p class="mt-4 max-w-xs text-sm leading-relaxed text-[#737373]">Giày thể thao nam cho mọi chuyển động. Thiết kế chuẩn, chất lượng thật.</p>
          <div class="mt-5 flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-[#0E0E0E]" /><span class="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737373]">Bước chân của bạn, phong cách của bạn</span></div>
        </div>
        <div v-for="column in columns" :key="column.title">
          <h3 class="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]">{{ column.title }}</h3>
          <ul class="space-y-2.5"><li v-for="link in column.links" :key="link.label"><button type="button" class="border-0 bg-transparent p-0 text-left text-sm text-[#737373] transition-colors hover:text-[#0E0E0E]" @click="go(link)">{{ link.label }}</button></li></ul>
        </div>
      </div>
      <div class="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#E5E5E5] pt-6 text-xs text-[#737373] md:flex-row"><p>© 2026 ShoeGroup. Tất cả quyền được bảo lưu.</p><div class="flex gap-5"><a href="#" @click.prevent class="transition-colors hover:text-[#0E0E0E]">Facebook</a><a href="#" @click.prevent class="transition-colors hover:text-[#0E0E0E]">Instagram</a><a href="#" @click.prevent class="transition-colors hover:text-[#0E0E0E]">TikTok</a></div></div>
    </div>
  </footer>
</template>
