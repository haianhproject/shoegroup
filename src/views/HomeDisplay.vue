<script setup>
import ShoeCard from '../components/ShoeCard.vue'
import { products } from '../data/mockData'
</script>

<template>
  <div class="pb-5">
    <!-- Hero Banner -->
    <section class="position-relative bg-dark text-white overflow-hidden mb-5">
      <div class="position-absolute w-100 h-100 opacity-50" style="z-index: 0;">
        <img src="https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&q=80&w=2000" alt="Sneakers Cover" class="w-100 h-100 object-fit-cover" style="transform: translateY(-10%);">
      </div>
      <div class="position-relative container-fluid px-4 py-5 py-md-5 d-flex flex-column justify-content-center" style="z-index: 1; min-height: 50vh;">
        <span class="text-info fw-bold text-uppercase tracking-wider mb-2 small">Mùa Hè 2026</span>
        <h1 class="display-3 fw-bold mb-3" style="max-width: 700px;">BỘ SƯU TẬP MỚI NHẤT</h1>
        <p class="fs-5 text-light mb-4" style="max-width: 600px;">Khám phá những mẫu giày thể thao độc quyền với thiết kế hiện đại, thoải mái tối đa cho từng bước chân.</p>
        <div>
          <router-link to="/" class="btn btn-light rounded-pill px-4 py-3 fw-bold text-dark d-inline-flex align-items-center gap-2 shadow transition-all shadow-hover">
            Mua sắm ngay
            <i class="bi bi-arrow-right"></i>
          </router-link>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section class="container-fluid px-4 py-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <h2 class="fw-bold fs-2 m-0">Sản phẩm nổi bật</h2>
        <router-link to="/" class="text-decoration-none text-secondary fw-bold d-flex align-items-center gap-1 hover-dark transition-all">
          Xem tất cả <i class="bi bi-arrow-right"></i>
        </router-link>
      </div>
      
      <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-4">
        <div class="col" v-for="product in products" :key="product.id_product">
          <ShoeCard :product="product" />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.object-fit-cover {
  object-fit: cover;
}
.hover-dark:hover {
  color: #212529 !important;
}
</style>
