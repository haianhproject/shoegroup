<script setup>
import { computed } from 'vue'
</script>

<template>
  <header class="navbar navbar-expand-lg navbar-light bg-white sticky-top shadow-sm py-3">
    <div class="container-fluid px-4">
      <router-link class="navbar-brand fw-bold mb-0 h1 fs-3" to="/">ShoeGroup</router-link>
      
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent" aria-controls="navbarContent" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarContent">
        <form class="d-flex mx-auto w-50 position-relative d-none d-lg-block">
          <input class="form-control rounded-pill bg-light border-0 ps-4 pe-5 py-2" type="search" placeholder="Tìm kiếm sản phẩm..." aria-label="Search">
          <i class="bi bi-search position-absolute top-50 translate-middle-y end-0 me-3 text-muted"></i>
        </form>

        <ul class="navbar-nav ms-auto mb-2 mb-lg-0 align-items-center column-gap-4">
          <li class="nav-item d-none d-lg-block">
            <router-link class="nav-link fw-semibold text-secondary" active-class="text-dark" to="/">Trang chủ</router-link>
          </li>
          <li class="nav-item d-none d-lg-block">
            <router-link class="nav-link fw-semibold text-secondary" active-class="text-dark" to="/">Sản phẩm</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link position-relative text-secondary d-flex" to="/cart">
              <i class="bi bi-cart fs-5"></i>
              <span class="position-absolute top-10 start-100 translate-middle badge rounded-pill bg-danger" style="font-size: 0.65em;">
                2
              </span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link text-secondary d-flex" to="/login">
              <i class="bi bi-person fs-5"></i>
            </router-link>
          </li>
        </ul>
      </div>
    </div>
  </header>
  <router-link 
  to="/admin" 
  class="fixed top-4 left-4 z-[999] bg-black text-white px-4 py-2 border-2 border-black font-bold uppercase text-xs tracking-widest shadow-[4px_4px_0_0_#555] hover:shadow-[0_0_0_0_#000] hover:translate-x-1 hover:translate-y-1 transition-all duration-200"
>
  Vào Trang Admin
</router-link>
</template>
