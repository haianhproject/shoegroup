<!-- Mục đích: Nút liên hệ Zalo nổi để khách mở nhanh kênh hỗ trợ. -->
<script setup>
import { MessageCircle } from 'lucide-vue-next'
</script>
<template>
  <a
    class="zalo-chat"
    href="https://zalo.me/0375990871"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat với shop qua Zalo"
  >
    <span class="zalo-icon">
      <MessageCircle :size="23" :stroke-width="1.7" aria-hidden="true" />
    </span>

    <span class="zalo-label">
      Hỗ trợ qua Zalo
    </span>
  </a>
</template>

<style scoped>
.zalo-chat {
  position: fixed;
  right: 25px;
  bottom: 25px;

  width: 48px;
  height: 48px;

  border-radius: 50%;

  background: #D4001A;
  color: #fff;

  display: flex;
  align-items: center;
  justify-content: center;

  text-decoration: none;

  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.16);

  z-index: 60;

  transition:
    width 0.25s ease,
    border-radius 0.25s ease,
    transform 0.25s ease;
}

.zalo-chat:hover {
  width: 175px;
  border-radius: 35px;
  transform: translateY(-3px);
}

.zalo-icon {
  width: 42px;
  height: 42px;

  border: 0;
  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 24px;
  font-weight: 800;
}

.zalo-label {
  display: none;

  margin-left: 8px;

  font-size: 15px;
  font-weight: 700;

  white-space: nowrap;
}

.zalo-chat:hover .zalo-label {
  display: block;
}

/* Hiệu ứng nhấp nháy nhẹ */
.zalo-chat::before {
  content: "";

  position: absolute;

  width: 48px;
  height: 48px;

  border-radius: 50%;

  border: 1px solid #D4001A;

  animation: zaloPulse 1.8s infinite;

  z-index: -1;
}

@keyframes zaloPulse {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }

  70% {
    transform: scale(1.35);
    opacity: 0;
  }

  100% {
    transform: scale(1.35);
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .zalo-chat {
    right: 15px;
    bottom: 15px;

    width: 46px;
    height: 46px;
  }

  .zalo-chat::before {
    width: 46px;
    height: 46px;
  }
}
</style>
