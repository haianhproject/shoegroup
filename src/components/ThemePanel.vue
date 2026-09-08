<script setup>
import { ref } from 'vue'
import { themeState, setThemeSetting } from '../stores/themeStore'

const open = ref(false)
const modes = [
  { value: 'light', label: 'Sáng', icon: 'icon-sun' },
  { value: 'dark', label: 'Tối', icon: 'icon-moon-stars' },
  { value: 'system', label: 'Hệ thống', icon: 'icon-circle-half' },
]
const styles = [
  { value: 'modern', label: 'Modern', hint: 'Năng động' },
  { value: 'minimal', label: 'Minimal', hint: 'Tinh gọn' },
  { value: 'luxury', label: 'Luxury', hint: 'Cao cấp' },
]
</script>

<template>
  <div class="theme-control">
    <button class="theme-trigger" type="button" aria-label="Tùy chỉnh giao diện" @click="open = !open">
      <i class="icon icon-sliders2"></i><span class="hidden sm:inline">Giao diện</span>
    </button>
    <Transition name="theme-pop">
      <section v-if="open" class="theme-panel" aria-label="Cài đặt giao diện">
        <div class="theme-panel-head"><div><strong>Giao diện</strong><small>Cá nhân hóa ShoeGroup</small></div><button class="theme-close" @click="open = false"><i class="icon icon-x-lg"></i></button></div>
        <div class="theme-group"><span class="theme-label">Chế độ</span><div class="theme-options theme-options--3"><button v-for="item in modes" :key="item.value" :class="{ active: themeState.mode === item.value }" @click="setThemeSetting('mode', item.value)"><i class="icon" :class="item.icon"></i><span>{{ item.label }}</span></button></div></div>
        <div class="theme-group"><span class="theme-label">Phong cách</span><div class="theme-options"><button v-for="item in styles" :key="item.value" :class="{ active: themeState.style === item.value }" @click="setThemeSetting('style', item.value)"><span class="style-dot" :class="`style-dot--${item.value}`"></span><span><b>{{ item.label }}</b><small>{{ item.hint }}</small></span></button></div></div>
        <div class="theme-group"><div class="flex justify-between items-center"><span class="theme-label mb-0">Mật độ</span><div class="density-toggle"><button :class="{ active: themeState.density === 'compact' }" @click="setThemeSetting('density', 'compact')">Gọn</button><button :class="{ active: themeState.density === 'comfortable' }" @click="setThemeSetting('density', 'comfortable')">Thoải mái</button></div></div></div>
      </section>
    </Transition>
  </div>
</template>
