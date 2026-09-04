<template>
  <a
    class="zalo-chat"
    href="https://zalo.me/0961107075"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat với shop qua Zalo"
  >
    <span class="zalo-icon">
      Z
    </span>

    <span class="zalo-label">
      Chat với shop
    </span>
  </a>
</template>

<style scoped>
.zalo-chat {
  position: fixed;
  right: 25px;
  bottom: 25px;

  width: 62px;
  height: 62px;

  border-radius: 50%;

  background: #0068ff;
  color: #fff;

  display: flex;
  align-items: center;
  justify-content: center;

  text-decoration: none;

  box-shadow: 0 5px 18px rgba(0, 0, 0, 0.25);

  z-index: 99999;

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

  border: 3px solid #fff;
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

  width: 62px;
  height: 62px;

  border-radius: 50%;

  border: 2px solid #0068ff;

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

    width: 55px;
    height: 55px;
  }

  .zalo-chat::before {
    width: 55px;
    height: 55px;
  }
}
</style>