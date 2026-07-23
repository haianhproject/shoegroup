<!--
  AdminWelcome.vue
  ------------------------------------------------------------------
  Màn hình chào "Xin chào quản lý" hiển thị GIỮA màn hình.
  Khi bấm "Xác nhận & Vào quản lý" -> điều hướng vào trang quản lý
  (/admin/panel -> tự chuyển sang Thống Kê Tổng Quan).
-->
<script setup>
import { useRouter } from 'vue-router'
import { getDisplayName } from './adminStore'

const router = useRouter()
function enterPanel() {
  router.push('/admin/panel')
}
</script>

<template>
  <div class="welcome-overlay d-flex align-items-center justify-content-center font-sans px-3">
    <div class="welcome-card text-center fade-in-scale">
      <div class="welcome-logo mx-auto mb-4"><i class="bi bi-box-fill"></i></div>
      <p class="welcome-brand text-uppercase mb-2">ShoeGroup Admin</p>
      <h1 class="welcome-title mb-2">Xin chào quản lý</h1>
      <p class="welcome-sub mb-4">
        Chào mừng <span class="fw-bold" v-text="getDisplayName"></span> quay trở lại.<br>
        Nhấn xác nhận để truy cập hệ thống quản trị.
      </p>
      <button @click="enterPanel" class="btn btn-dark btn-lg rounded-4 fw-bold px-5 py-3 shadow-hover">
        <i class="bi bi-shield-check me-2"></i> Xác nhận &amp; Vào quản lý
      </button>
    </div>
  </div>
</template>

<style scoped>
@import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css');
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&subset=vietnamese&display=swap');

.font-sans { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.welcome-overlay {
  position: fixed; inset: 0; height: 100vh; width: 100vw;
  background: radial-gradient(circle at 50% 30%, #1f2430 0%, #0b0d12 70%);
}
.welcome-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 28px;
  padding: 3.5rem 3rem;
  max-width: 520px;
  width: 100%;
  backdrop-filter: blur(8px);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
}
.welcome-logo {
  width: 84px; height: 84px; border-radius: 24px;
  background: #fff; color: #000;
  display: flex; align-items: center; justify-content: center;
  font-size: 2.4rem;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
}
.welcome-brand { color: #9aa4b2; letter-spacing: 0.22em; font-size: 0.72rem; font-weight: 600; }
.welcome-title { color: #fff; font-weight: 800; font-size: 2.4rem; letter-spacing: -0.01em; }
.welcome-sub { color: rgba(255, 255, 255, 0.66); font-size: 0.98rem; line-height: 1.6; }
.shadow-hover { transition: transform 0.18s ease, box-shadow 0.18s ease; }
.shadow-hover:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5); }
.fade-in-scale { animation: fadeInScale 0.4s ease; }
@keyframes fadeInScale { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
</style>

