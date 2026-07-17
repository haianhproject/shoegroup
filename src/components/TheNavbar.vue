<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { cartState, cartItems, cartCount, cartSubtotal, formatCurrency, showMiniCart, hideMiniCart, removeFromCart } from '../stores/cartStore'
import { isAuthenticated, currentUser } from '../stores/authStore'

const router = useRouter()
const route = useRoute()
const miniCartItems = computed(() => cartItems.value.slice(0, 3))

// Biến lưu từ khóa tìm kiếm
const searchQuery = ref('')

// Đồng bộ ô tìm kiếm với thanh URL
watch(() => route.query.search, (newSearch) => {
  searchQuery.value = newSearch || ''
}, { immediate: true })

// HÀM XỬ LÝ KHI NGƯỜI DÙNG TÌM KIẾM
const handleSearch = () => {
  if (searchQuery.value.trim()) {
    // Chuyển hướng sang trang Sản phẩm, đính kèm từ khóa lên thanh URL
    router.push({ path: '/products', query: { search: searchQuery.value.trim() } })
  } else {
    // Nhập rỗng => Hủy bỏ tìm kiếm
    router.push({ path: '/products' })
  }
}

let hideTimeout = null
const handleMouseEnter = () => {
  if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null }
  showMiniCart()
}
const handleMouseLeave = () => {
  hideTimeout = setTimeout(() => { hideMiniCart() }, 300) 
}
</script>

<template>
  <header class="navbar navbar-expand-lg navbar-light bg-white sticky-top shadow-sm py-3">
    <div class="container-fluid px-4">
      <router-link class="navbar-brand fw-bold mb-0 h1 fs-3" to="/">ShoeGroup</router-link>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent">
        <span class="navbar-toggler-icon"></span>
      </button>
      
      <div class="collapse navbar-collapse" id="navbarContent">
        <!-- FORM TÌM KIẾM -->
        <form class="d-flex mx-auto w-50 position-relative d-none d-lg-block" @submit.prevent="handleSearch">
          <input
            v-model="searchQuery"
            class="form-control rounded-pill bg-light border-0 ps-4 pe-5 py-2 focus-ring"
            type="search"
            placeholder="Tìm kiếm theo tên sản phẩm..."
            required
          >
          <button type="submit" class="btn position-absolute top-50 translate-middle-y end-0 me-1 border-0 p-0 text-muted shadow-none h-100 px-3">
            <i class="bi bi-search"></i>
          </button>
        </form>

        <ul class="navbar-nav ms-auto mb-2 mb-lg-0 align-items-center column-gap-4">
          <li class="nav-item d-none d-lg-block"><router-link class="nav-link fw-semibold text-secondary" active-class="text-dark" to="/">Trang chủ</router-link></li>
          <li class="nav-item d-none d-lg-block"><router-link class="nav-link fw-semibold text-secondary" active-class="text-dark" to="/products">Sản phẩm</router-link></li>
          
          <!-- Mini Cart -->
          <li class="nav-item position-relative" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
            <router-link to="/cart" class="nav-link position-relative text-secondary d-flex btn btn-link p-0 border-0" @click="hideMiniCart">
              <i class="bi bi-cart fs-5"></i>
              <span v-if="cartCount > 0" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size: 0.65em;">{{ cartCount }}</span>
            </router-link>
            
            <div v-if="cartState.isMiniCartOpen" class="mini-cart-popover bg-white border-0 shadow-lg rounded-4 p-3" @click.stop>
              <div class="d-flex align-items-center justify-content-between mb-3">
                <h6 class="fw-bold mb-0">Giỏ hàng</h6><span class="small text-secondary">{{ cartCount }} sản phẩm</span>
              </div>
              <div v-if="miniCartItems.length === 0" class="text-center py-4">
                <i class="bi bi-cart-x fs-2 text-secondary"></i><p class="text-secondary small mb-0 mt-2">Giỏ hàng đang trống.</p>
              </div>
              <div v-else class="d-flex flex-column gap-3">
                <div v-for="item in miniCartItems" :key="item.id_product_detail" class="d-flex gap-2 align-items-center">
                  <router-link :to="`/product/${item.product?.id_product || item.product?.id || item.id_product}`" class="mini-cart-img bg-light rounded-3 overflow-hidden border flex-shrink-0" @click="hideMiniCart">
                    <img :src="item.product?.image_url" :alt="item.product?.product_name || item.product?.name" class="w-100 h-100 object-fit-cover mix-blend-multiply">
                  </router-link>
                  <div class="flex-grow-1 overflow-hidden">
                    <router-link :to="`/product/${item.product?.id_product || item.product?.id || item.id_product}`" class="text-dark text-decoration-none fw-bold small d-block text-truncate" @click="hideMiniCart">
                      {{ item.product?.product_name || item.product?.name }}
                    </router-link>
                    <p class="text-secondary small mb-1">Size {{ item.size?.size_name }} / {{ item.color?.color_label || item.color?.color_name }}</p>
                    <p class="small mb-0 fw-bold">{{ item.quantity }} x {{ formatCurrency(item.unitPrice) }}</p>
                  </div>
                  <button type="button" class="btn btn-sm btn-light text-danger rounded-circle" @click="removeFromCart(item.id_product_detail)"><i class="bi bi-x"></i></button>
                </div>
                <div v-if="cartItems.length > 3" class="small text-secondary text-center">Và {{ cartItems.length - 3 }} sản phẩm khác...</div>
                <hr class="my-1">
                <div class="d-flex justify-content-between fw-bold"><span>Tạm tính</span><span>{{ formatCurrency(cartSubtotal) }}</span></div>
                <div class="d-grid gap-2 mt-2">
                  <router-link to="/cart" class="btn btn-outline-dark fw-bold rounded-3" @click="hideMiniCart">Xem giỏ hàng</router-link>
                  <router-link to="/checkout" class="btn btn-dark fw-bold rounded-3" @click="hideMiniCart">Thanh toán</router-link>
                </div>
              </div>
            </div>
          </li>
          
          <li class="nav-item">
            <router-link v-if="!isAuthenticated" class="nav-link text-secondary d-flex" to="/login"><i class="bi bi-person fs-5"></i></router-link>
            <router-link v-else :to="currentUser?.role === 'Admin' ? '/admin' : '/account'" class="nav-link text-dark d-flex"><i class="bi bi-person-check-fill fs-5"></i></router-link>
          </li>
        </ul>
      </div>
    </div>
  </header>
</template>

<style scoped>
.mini-cart-popover { position: absolute; right: 0; top: 38px; width: 360px; max-width: 90vw; z-index: 1050; }
.mini-cart-img { width: 64px; height: 64px; display: block; }
.object-fit-cover { object-fit: cover; }
.mix-blend-multiply { mix-blend-mode: multiply; }
.focus-ring:focus { box-shadow: 0 0 0 0.25rem rgba(33,37,41,0.1) !important; outline: none; }
@media (max-width: 991px) { .mini-cart-popover { right: -60px; } }
</style>