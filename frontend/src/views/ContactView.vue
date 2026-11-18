<!-- Mục đích: Trang thông tin liên hệ và các kênh hỗ trợ khách hàng. -->
<script setup>
import { onMounted, reactive, ref } from 'vue'
import { notify } from '../stores/uiStore'
import { api } from '../services/apiClient'

onMounted(() => {
  window.scrollTo(0, 0)
})

const form = reactive({
  name: '',
  contact: '',
  message: '',
})

const submitting = ref(false)

const handleSubmit = async () => {
  if (submitting.value) return
  const payload = {
    name: form.name.trim(),
    contact: form.contact.trim(),
    message: form.message.trim(),
  }
  if (payload.name.length < 2 || payload.name.length > 100) {
    notify({ type: 'warning', message: 'Họ tên cần có từ 2 đến 100 ký tự.' })
    return
  }
  const emailIsValid = /^\S+@\S+\.\S+$/.test(payload.contact)
  const phoneIsValid = /^\+?\d{9,15}$/.test(payload.contact.replace(/[\s().-]/g, ''))
  if (payload.contact.length > 100 || (!emailIsValid && !phoneIsValid)) {
    notify({ type: 'warning', message: 'Vui lòng nhập email hoặc số điện thoại liên hệ hợp lệ.' })
    return
  }
  if (!payload.message || payload.message.length > 5000) {
    notify({ type: 'warning', message: 'Nội dung lời nhắn cần có từ 1 đến 5.000 ký tự.' })
    return
  }

  submitting.value = true
  try {
    const result = await api.post('/contact', payload)
    if (!result?.success) throw new Error(result?.message || 'Chưa thể gửi lời nhắn.')
    notify({
      type: 'success',
      title: 'Gửi tin nhắn thành công',
      message: result.message || 'Đã gửi lời nhắn tới cửa hàng.',
    })
    form.name = ''
    form.contact = ''
    form.message = ''
  } catch (error) {
    notify({ type: 'error', title: 'Chưa gửi được lời nhắn', message: error.message || 'Vui lòng thử lại sau.' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="contact-page">
    <!-- Hero Section -->
    <section class="contact-hero">
      <img
        src="https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&q=80&w=2000"
        alt="ShoeGroup HQ"
        class="hero-bg"
      />
      <div class="hero-overlay"></div>
      <div class="w-full px-4 hero-content">
        <span class="badge-contact">DỊCH VỤ KHÁCH HÀNG 24/7</span>
        <h1 class="display-title">LIÊN HỆ CHÚNG TÔI</h1>
        <p class="hero-sub">Trụ sở không gian mở tại trung tâm mua sắm hàng đầu. Đội ngũ chuyên gia sneaker luôn sẵn sàng lắng nghe và hỗ trợ bạn mọi lúc, mọi nơi.</p>
      </div>
    </section>

    <!-- Main Content -->
    <section class="max-w-[1200px] mx-auto px-4 -mt-14 relative z-10 pb-16">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        <!-- Info Cards -->
        <div class="lg:col-span-5 flex flex-col gap-4">
          <div class="info-card">
            <div class="icon-wrap">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div>
              <h4 class="info-title">Trụ sở Flagship Store</h4>
              <p class="info-text">Tầng 99, Tháp Landmark Diamond, Quận 1, TP. Hồ Chí Minh</p>
              <span class="text-xs text-slate-400 mt-1 block">Mở cửa: 09:00 - 22:00 hàng ngày</span>
            </div>
          </div>

          <div class="info-card">
            <div class="icon-wrap">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div>
              <h4 class="info-title">Hotline & Zalo CSKH</h4>
              <p class="info-text font-semibold text-slate-900">0375.990.871</p>
              <span class="text-xs text-slate-400 mt-1 block">Tư vấn chọn size & tra cứu vận đơn (24/7)</span>
            </div>
          </div>

          <div class="info-card">
            <div class="icon-wrap">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div>
              <h4 class="info-title">Hòm thư tiếp nhận</h4>
              <p class="info-text font-semibold text-slate-900">contact@shoegroup.vn</p>
              <span class="text-xs text-slate-400 mt-1 block">Hợp tác kinh doanh & bảo hành sản phẩm</span>
            </div>
          </div>
        </div>

        <!-- Contact Form -->
        <div class="lg:col-span-7">
          <div class="contact-form">
            <div class="flex items-center gap-2 mb-2">
              <span class="w-6 h-0.5 bg-[#D4001A]"></span>
              <span class="text-xs font-bold uppercase tracking-wider text-[#D4001A]">GỬI PHẢN HỒI</span>
            </div>
            <h3 class="form-title mb-2">GỬI TIN NHẮN CHO CHÚNG TÔI</h3>
            <p class="text-sm text-slate-500 mb-6">Bạn có câu hỏi về sản phẩm, kích cỡ hay chính sách đổi trả? Hãy để lại lời nhắn, chúng tôi sẽ hỗ trợ nhanh chóng.</p>

            <form @submit.prevent="handleSubmit">
              <div class="grid grid-cols-12 gap-4">
                <div class="col-span-12 md:col-span-6">
                  <label for="contact-name" class="form-label">HỌ VÀ TÊN</label>
                  <input
                    v-model="form.name"
                    id="contact-name"
                    :disabled="submitting"
                    minlength="2"
                    maxlength="100"
                    autocomplete="name"
                    required
                    type="text"
                    class="form-input"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div class="col-span-12 md:col-span-6">
                  <label for="contact-address" class="form-label">EMAIL HOẶC SỐ ĐIỆN THOẠI</label>
                  <input
                    v-model="form.contact"
                    id="contact-address"
                    :disabled="submitting"
                    maxlength="100"
                    required
                    type="text"
                    class="form-input"
                    placeholder="name@example.com / 0987..."
                  />
                </div>
                <div class="col-span-12">
                  <label for="contact-message" class="form-label">NỘI DUNG TIN NHẮN</label>
                  <textarea
                    v-model="form.message"
                    id="contact-message"
                    :disabled="submitting"
                    maxlength="5000"
                    required
                    class="form-input"
                    rows="4"
                    placeholder="Chia sẻ chi tiết vấn đề hoặc mẫu giày bạn đang quan tâm..."
                  ></textarea>
                </div>
                <div class="col-span-12 mt-2">
                  <button type="submit" class="btn-sg w-full py-3.5 flex items-center justify-center gap-2" :disabled="submitting">
                    <svg v-if="submitting" class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m22 2-7 20-4-9-9-4Z" />
                      <path d="M22 2 11 13" />
                    </svg>
                    <span>{{ submitting ? 'ĐANG GỬI TIN NHẮN…' : 'GỬI TIN NHẮN NGAY' }}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

      </div>
    </section>
  </div>
</template>

<style scoped>
.contact-page {
  background: #F8FAFC;
  min-height: 100vh;
  font-family: 'Be Vietnam Pro', sans-serif;
}

/* Hero */
.contact-hero {
  position: relative;
  height: 52vh;
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
}
.hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.78) 0%, rgba(15, 23, 42, 0.92) 100%);
}
.hero-content {
  position: relative;
  z-index: 2;
  max-width: 780px;
  color: #FFFFFF;
}
.badge-contact {
  display: inline-block;
  background: rgba(255, 255, 255, 0.12);
  color: #FFFFFF;
  border: 1px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(8px);
  padding: 6px 14px;
  border-radius: 9999px;
  font-weight: 700;
  letter-spacing: 0.12em;
  margin-bottom: 16px;
  font-size: 0.72rem;
}
.display-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(2.2rem, 4.5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin-bottom: 14px;
  color: #FFFFFF;
}
.hero-sub {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.6;
  margin: 0 auto;
  max-width: 620px;
}

/* Info Cards */
.info-card {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 10px 25px -10px rgba(15, 23, 42, 0.05);
  transition: all 0.25s ease;
}
.info-card:hover {
  transform: translateY(-3px);
  border-color: #CBD5E1;
  box-shadow: 0 15px 30px -10px rgba(15, 23, 42, 0.1);
}
.icon-wrap {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  background: #FEE2E2;
  color: #D4001A;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.info-title {
  font-weight: 700;
  font-size: 0.98rem;
  margin-bottom: 4px;
  color: #0F172A;
  letter-spacing: -0.01em;
}
.info-text {
  color: #475569;
  margin-bottom: 0;
  line-height: 1.5;
  font-size: 0.92rem;
}

/* Form */
.contact-form {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 24px;
  padding: 36px;
  box-shadow: 0 20px 45px -15px rgba(15, 23, 42, 0.08);
}
.form-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.4rem;
  letter-spacing: -0.02em;
  color: #0F172A;
}
.form-label {
  font-weight: 700;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  color: #334155;
  margin-bottom: 6px;
  display: block;
}
.form-input {
  width: 100%;
  border: 1.5px solid #E2E8F0;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 0.92rem;
  background: #F8FAFC;
  color: #0F172A;
  outline: none;
  transition: all 0.2s ease;
}
.form-input:focus {
  border-color: #0F172A;
  background: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}
.form-input::placeholder {
  color: #94A3B8;
}

@media (max-width: 768px) {
  .contact-hero { height: 42vh; }
  .contact-form { padding: 24px; }
}
</style>
