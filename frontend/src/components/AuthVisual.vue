<!-- Mục đích: Khối thương hiệu dùng chung cho các trang xác thực. -->
<script setup>
import heroSneaker from '../../img/hero-sneaker-crimson.png'
import { ArrowUpRight } from 'lucide-vue-next'
</script>

<template>
  <aside class="auth-visual" aria-label="ShoeGroup — Phong cách từ bước chân">
    <p class="section-kicker">SHOEGROUP COMMUNITY</p>
    <h2>MỖI BƯỚC.<br /><span>MỘT CHẤT RIÊNG.</span></h2>
    <div class="auth-visual-art">
      <div class="auth-visual-orbit" aria-hidden="true"></div>
      <img
        :src="heroSneaker"
        alt="Sneaker trắng đỏ ShoeGroup"
        class="auth-visual-shoe"
      />
    </div>
    <div class="auth-visual-bottom">
      <span>Đôi giày của bạn.<br />Câu chuyện của bạn.</span
      ><ArrowUpRight :size="35" :stroke-width="1" aria-hidden="true" />
    </div>
  </aside>
</template>
