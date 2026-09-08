<!--
  AdminLayout.vue
  ------------------------------------------------------------------
  Khung (shell) của khu quản trị:
    - Thanh NAV bên trái (liên kết tất cả các trang bằng <router-link>)
    - Nội dung bên phải hiển thị qua <router-view> (mỗi trang là 1 file riêng)
    - Các modal & toast dùng chung nằm ở đây để phủ lên mọi trang
-->
<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import BrandLogo from "../../components/BrandLogo.vue";
import {
  isNavOpen,
  isLoading,
  fetchAllData,
  getDisplayName,
  handleLogout,
  pendingOrdersCount,
  unpaidCount,
  incompleteOrdersCount,
  pendingReturnsCount,
  paymentOrders,
  lowStockCount,
  outOfStockProductsCount,
  activeProductCount,
  categoryCount,
  brandCount,
  materialCount,
  colorCount,
  sizeCount,
  discountCount,
  customerCount,
  formatPrice,
  formatDate,
  cancelModal,
  cancelReasons,
  submitCancelOrder,
  timelineModal,
  formModal,
  formFields,
  saveForm,
  onFormImageFile,
  customerModal,
  confirmModal,
  executeConfirm,
  getStatusBadgeClass,
  toasts,
  toastIcon,
  dismissToast,
} from "./adminStore";

const route = useRoute();
const passwordVisible = ref(false);
const router = useRouter();

// Cấu trúc menu -> mỗi mục trỏ đến 1 route con riêng
const sections = [
  {
    title: "Tổng Quan",
    items: [
      {
        to: "/admin/panel/dashboard",
        icon: "icon-grid-1x2-fill",
        label: "Thống Kê Tổng Quan",
      },
    ],
  },
  {
    title: "Mặt Hàng & Giao Dịch",
    items: [
      {
        to: "/admin/panel/payments",
        icon: "icon-credit-card-2-front-fill",
        label: "Xác Nhận Thanh Toán",
        badge: () => incompleteOrdersCount.value,
        badgeClass: "bg-warning text-dark",
      },
      {
        to: "/admin/panel/returns",
        icon: "icon-arrow-return-left",
        label: "Trả Hàng / Đổi Trả",
        badge: () => pendingReturnsCount.value,
        badgeClass: "bg-danger",
      },
      {
        to: "/admin/panel/pos",
        icon: "icon-shop-window",
        label: "Bán Hàng Tại Quầy",
      },
    ],
  },
  {
    title: "Quản Lý Sản Phẩm",
    items: [
      {
        to: "/admin/panel/products",
        icon: "icon-box-seam-fill",
        label: "Sản Phẩm",
        badge: () => activeProductCount.value,
        badgeClass: "bg-secondary",
      },
      {
        to: "/admin/panel/categories",
        icon: "icon-diagram-3-fill",
        label: "Danh Mục Bộ Môn",
        badge: () => categoryCount.value,
        badgeClass: "bg-secondary",
      },
      {
        to: "/admin/panel/brands",
        icon: "icon-award-fill",
        label: "Thương Hiệu",
        badge: () => brandCount.value,
        badgeClass: "bg-secondary",
      },
      {
        to: "/admin/panel/materials",
        icon: "icon-layers-fill",
        label: "Chất Liệu",
        badge: () => materialCount.value,
        badgeClass: "bg-secondary",
      },
      { to: "/admin/panel/colors", icon: "icon-palette-fill", label: "Màu Sắc", badge: () => colorCount.value, badgeClass: "bg-secondary" },
      { to: "/admin/panel/sizes", icon: "icon-rulers", label: "Kích Thước", badge: () => sizeCount.value, badgeClass: "bg-secondary" },
    ],
  },
  {
    title: "Tiếp Thị & Khách Hàng",
    items: [
      {
        to: "/admin/panel/discounts",
        icon: "icon-ticket-perforated-fill",
        label: "Mã Khuyến Mãi",
        badge: () => discountCount.value,
        badgeClass: "bg-secondary",
      },
      {
        to: "/admin/panel/customers",
        icon: "icon-people-fill",
        label: "Khách Hàng (CRM)",
        badge: () => customerCount.value,
        badgeClass: "bg-secondary",
      },
    ],
  },
  {
    title: "Vận Hành & Bảo Mật",
    items: [
      {
        to: "/admin/panel/accounts",
        icon: "icon-shield-lock-fill",
        label: "Quản Lý Tài Khoản",
      },
    ],
  },
];

const activeTabTitle = computed(() => route.meta.title || "Bảng Điều Khiển");

function go(navigate) {
  navigate();
  if (window.innerWidth < 768) isNavOpen.value = false;
}
function onLogout() {
  if (handleLogout()) router.push("/login");
}

// Interval 30s refresh dữ liệu realtime (đơn hàng mới, trạng thái, tồn kho...)
// để không tạo tải SQL dồn dập khi mở khu quản trị trong thời gian dài.
const POLL_INTERVAL = 30_000;
let pollTimer = null;
const isRefreshing = ref(false);
let lastFocused = Date.now();

async function refresh() {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  try { await fetchAllData(true); } finally { isRefreshing.value = false; }
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(refresh, POLL_INTERVAL);
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

// Khi tab lấy lại focus (sau khi bị ẩn) → refresh ngay lập tức
function onVisibilityChange() {
  if (!document.hidden) {
    const gap = Date.now() - lastFocused;
    if (gap > 5000) refresh();
  } else {
    lastFocused = Date.now();
  }
}

onMounted(async () => {
  await fetchAllData();
  startPolling();
  document.addEventListener('visibilitychange', onVisibilityChange);
});
onUnmounted(() => {
  stopPolling();
  document.removeEventListener('visibilitychange', onVisibilityChange);
});
</script>

<template>
  <div
    class="fixed-overlay flex flex-col bg-light-gray font-sans"
    style="overflow-x: hidden"
  >
    <!-- ============ SIDEBAR ============ -->
    <aside
      class="sidebar-left bg-sidebar text-white fixed top-0 left-0 h-full flex flex-col transition-sidebar z-[1050] shadow-lg"
      :style="{
        width: '260px',
        transform: isNavOpen ? 'translateX(0)' : 'translateX(-100%)',
      }"
    >
      <div
        class="p-4 flex items-center justify-center border-b border-secondary border-white/25"
        style="height: 72px"
      >
        <div class="flex items-center gap-2">
          <BrandLogo :size="36" :radius="4" />
          <h3 class="font-extrabold uppercase m-0 tracking-wider text-white text-lg" style="font-family: 'Inter', sans-serif;">SHOE<span class="text-white">GROUP</span></h3>
        </div>
      </div>

      <div
        class="grow overflow-auto py-3 px-3 list-group custom-scrollbar-dark"
      >
        <template v-for="(sec, si) in sections" :key="si">
          <p
            class="nav-section-title"
            :class="{ 'mt-4': si > 0 }"
            v-text="sec.title"
          ></p>
          <router-link
            v-for="item in sec.items"
            :key="item.to"
            :to="item.to"
            custom
            v-slot="{ isActive, navigate }"
          >
            <button
              type="button"
              @click="go(navigate)"
              class="list-group-item border-0 mb-1 rounded-2 font-medium custom-nav-item flex justify-between items-center w-full"
              :class="isActive ? 'active-nav text-white' : 'text-gray-600'"
            >
              <span class="flex items-center text-start">
                <i class="icon mr-2 text-base" :class="item.icon" style="min-width: 20px;"></i>
                <span v-text="item.label" class="lh-sm"></span>
              </span>
              <span
                v-if="item.badge && item.badge() > 0"
                class="badge rounded-1 shadow-sm"
                :class="item.badgeClass"
                v-text="item.badge()"
              ></span>
            </button>
          </router-link>
        </template>
      </div>

      <div
        class="p-4 bg-sidebar-darker mt-auto border-t border-secondary border-white/25"
      >
        <button
          @click="onLogout"
          class="btn btn-sm w-full font-medium py-2 flex items-center justify-center"
          style="background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px;"
        >
          <i class="icon icon-box-arrow-right mr-2"></i> Đăng Xuất
        </button>
      </div>
    </aside>

    <!-- ============ MAIN ============ -->
    <main
      class="grow transition-main flex flex-col bg-light-gray relative"
      :style="{ marginLeft: isNavOpen ? '260px' : '0' }"
    >
      <header
        class="flex justify-between items-center px-4 bg-white shadow-sm z-10 sticky top-0"
        style="height: 72px"
      >
        <div class="flex items-center gap-3">
          <button
            class="btn btn-light border flex items-center justify-center text-gray-900 bg-light-gray"
            style="width: 40px; height: 40px; border-radius: 4px;"
            @click="isNavOpen = !isNavOpen"
            title="Toggle Menu"
          >
            <i class="icon icon-list text-xl"></i>
          </button>
          <h2
            class="h5 mb-0 font-bold text-gray-900 hidden md:block tracking-wide"
            v-text="activeTabTitle"
          ></h2>
        </div>
        <div class="flex items-center gap-3">
          <!-- Real-time indicator -->
          <div class="flex items-center gap-2 hidden md:flex">
            <span class="inline-block" style="width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse-dot 2s infinite;" title="Tự động đồng bộ với hệ thống"></span>
            <span class="text-gray-600" style="font-size:0.72rem;">Dữ liệu trực tiếp</span>
          </div>
          <div
            class="bg-gray-100 rounded-full flex items-center justify-center text-gray-900 font-bold border"
            style="width: 40px; height: 40px"
          >A</div>
          <span
            class="font-bold text-gray-900 hidden sm:block"
          >Xin chào, Admin</span>
        </div>
      </header>

      <div
        v-if="isLoading"
        class="absolute left-0 right-0 bottom-0 flex flex-col justify-center items-center"
        style="top: 72px; z-index: 20; background: rgba(245, 246, 248, 0.96)"
      >
        <div class="sg-spinner text-gray-900 mb-3"></div>
        <p class="font-medium text-gray-600">Đang nạp dữ liệu từ CSDL...</p>
      </div>

      <div class="p-4 grow overflow-auto custom-scrollbar-light w-full mx-auto" style="max-width: 1440px;">
        <!-- Chỉ chuyển mượt vùng nội dung; sidebar/header quản lý giữ nguyên. -->
        <router-view v-slot="{ Component, route }">
          <div class="relative w-full">
            <Transition name="admin-page">
              <div :key="route.fullPath" class="admin-page-wrapper w-full">
                <component :is="Component" />
              </div>
            </Transition>
          </div>
        </router-view>
      </div>
    </main>

    <!-- ==================== MODALS (dùng chung) ==================== -->
    <!-- Cancel order -->
    <div
      v-if="cancelModal.open"
      class="custom-modal-overlay"
      @click.self="cancelModal.open = false"
    >
      <div class="custom-modal-box fade-in-scale">
        <div
          class="p-4 border-b flex justify-between items-center"
        >
          <h6 class="font-bold mb-0 text-gray-900">
            Hủy Đơn Hàng
            <span
              v-text="'#' + (cancelModal.order && cancelModal.order.id)"
            ></span>
          </h6>
          <button
            @click="cancelModal.open = false"
            class="btn btn-sm btn-light border-0"
          >
            <i class="icon icon-x-lg"></i>
          </button>
        </div>
        <div class="p-4">
          <p class="text-sm text-gray-600">
            Vui lòng chọn hoặc nhập lý do hủy đơn. Thông tin này sẽ được lưu vào
            lịch sử đơn hàng.
          </p>
          <div class="flex flex-wrap gap-2 mb-3">
            <button
              v-for="reason in cancelReasons"
              :key="reason"
              @click="cancelModal.reason = reason"
              class="btn btn-sm border"
              style="border-radius: 4px;"
              :class="
                cancelModal.reason === reason
                  ? 'btn-dark text-white'
                  : 'btn-white text-gray-600'
              "
              v-text="reason"
            ></button>
          </div>
          <textarea
            v-model="cancelModal.reason"
            rows="2"
            class="sg-input rounded-2"
            placeholder="Lý do khác..."
          ></textarea>
        </div>
        <div class="p-4 border-t flex justify-end gap-2">
          <button
            @click="cancelModal.open = false"
            class="btn btn-light border rounded-2"
          >
            Đóng</button
          ><button
            @click="submitCancelOrder"
            :disabled="!cancelModal.reason || cancelModal.busy"
            class="btn btn-danger rounded-2 font-bold"
          >
            <span v-if="cancelModal.busy" class="sg-spinner sg-spinner sg-spinner-sm mr-1"></span>
            <span v-text="cancelModal.busy ? 'Đang hủy...' : 'Xác nhận hủy'"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- Timeline -->
    <div
      v-if="timelineModal.open"
      class="custom-modal-overlay"
      @click.self="timelineModal.open = false"
    >
      <div class="custom-modal-box fade-in-scale">
        <div
          class="p-4 border-b flex justify-between items-center"
        >
          <h6 class="font-bold mb-0 text-gray-900">
            Lịch Sử Đơn
            <span
              v-text="'#' + (timelineModal.order && timelineModal.order.id)"
            ></span>
          </h6>
          <button
            @click="timelineModal.open = false"
            class="btn btn-sm btn-light border-0"
          >
            <i class="icon icon-x-lg"></i>
          </button>
        </div>
        <div class="p-4" style="max-height: 60vh; overflow: auto">
          <div
            v-for="(h, i) in timelineModal.history"
            :key="i"
            class="flex gap-3"
          >
            <div class="flex flex-col items-center">
              <div class="timeline-dot"></div>
              <div
                v-if="i < timelineModal.history.length - 1"
                class="timeline-line"
              ></div>
            </div>
            <div class="pb-4">
              <p class="font-medium mb-0 text-gray-900 text-sm" v-text="h.status"></p>
              <p
                class="text-gray-600 mb-0"
                style="font-size: 0.78rem"
                v-text="formatDate(h.date)"
              ></p>
              <p
                v-if="h.note"
                class="text-gray-600 text-sm mb-0 fst-italic"
                v-text="h.note"
              ></p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Generic CRUD form -->
    <div
      v-if="formModal.open"
      class="custom-modal-overlay"
      @click.self="formModal.open = false"
    >
      <div class="custom-modal-box fade-in-scale">
        <div
          class="p-4 border-b flex justify-between items-center"
        >
          <h6 class="font-bold mb-0 text-gray-900" v-text="formModal.title"></h6>
          <button
            @click="formModal.open = false"
            class="btn btn-sm btn-light border-0"
          >
            <i class="icon icon-x-lg"></i>
          </button>
        </div>
        <div class="p-4" style="max-height: 60vh; overflow: auto">
          <div v-for="f in formFields" :key="f.key" class="mb-3">
            <label class="block text-sm font-medium text-sm font-medium" v-text="f.label"></label>
            <select
              v-if="f.type === 'select'"
              v-model="formModal.data[f.key]"
              :disabled="f.disabled"
              class="sg-input rounded-2"
            >
              <option
                v-for="opt in f.options"
                :key="opt.value"
                :value="opt.value"
                v-text="opt.label"
              ></option>
            </select>
            <div
              v-else-if="f.type === 'checkbox'"
              class="flex items-center gap-2 flex items-center"
            >
              <input
                v-model="formModal.data[f.key]"
                class="accent-black"
                type="checkbox"
              />
            </div>
            <textarea
              v-else-if="f.type === 'textarea'"
              v-model="formModal.data[f.key]"
              rows="2"
              class="sg-input rounded-2"
            ></textarea>
            <div v-else-if="f.type === 'image'">
              <div class="flex items-center gap-3 mb-2">
                <img
                  :src="
                    formModal.data[f.key] || 'https://via.placeholder.com/56'
                  "
                  class="rounded-2 border"
                  style="
                    width: 56px;
                    height: 56px;
                    object-fit: contain;
                    background: #f3f4f6;
                  "
                  @error="$event.target.src = 'https://via.placeholder.com/56'"
                />
                <label class="btn btn-sm btn-outline-dark rounded-2 mb-0"
                  ><i class="icon icon-upload mr-1"></i> Chọn ảnh trên máy<input
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="(e) => onFormImageFile(e, f.key)"
                /></label>
              </div>
              <input
                v-model="formModal.data[f.key]"
                type="text"
                class="sg-input rounded-2"
                placeholder="Hoặc dán URL ảnh..."
              />
            </div>
            <div v-else-if="f.type === 'password'" class="flex">
              <input
                v-model="formModal.data[f.key]"
                :type="passwordVisible ? 'text' : 'password'"
                class="sg-input rounded-start-3"
                autocomplete="new-password"
              />
              <button
                type="button"
                class="btn btn-outline-secondary rounded-end-3"
                @click="passwordVisible = !passwordVisible"
                :title="passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
              >
                <i class="icon" :class="passwordVisible ? 'icon-eye-slash' : 'icon-eye'"></i>
              </button>
            </div>
            <input
              v-else
              v-model="formModal.data[f.key]"
              :type="f.type || 'text'"
              class="sg-input rounded-2"
            />
          </div>
        </div>
        <div class="p-4 border-t flex justify-end gap-2">
          <button
            @click="formModal.open = false"
            class="btn btn-light border rounded-2"
          >
            Hủy</button
          ><button @click="saveForm" class="btn btn-dark rounded-2 font-bold">
            Lưu
          </button>
        </div>
      </div>
    </div>

    <!-- Customer detail: đã chuyển sang trang Khách Hàng để tránh trùng modal -->
    <div
      v-if="false"
      class="custom-modal-overlay"
      @click.self="customerModal.open = false"
    >
      <div class="custom-modal-box fade-in-scale">
        <div
          class="p-4 border-b flex justify-between items-center"
        >
          <h6
            class="font-bold mb-0 text-gray-900"
            v-text="customerModal.customer && customerModal.customer.name"
          ></h6>
          <button
            @click="customerModal.open = false"
            class="btn btn-sm btn-light border-0"
          >
            <i class="icon icon-x-lg"></i>
          </button>
        </div>
        <div class="p-4" style="max-height: 60vh; overflow: auto">
          <div class="grid grid-cols-12 gap-2 mb-3 text-sm">
            <div class="col-span-6">
              <span class="text-gray-600">SĐT:</span>
              <span
                class="font-medium"
                v-text="customerModal.customer && customerModal.customer.phone"
              ></span>
            </div>
            <div class="col-span-6">
              <span class="text-gray-600">Tổng chi:</span>
              <span
                class="font-medium"
                v-text="
                  formatPrice(
                    customerModal.customer && customerModal.customer.spent,
                  )
                "
              ></span>
            </div>
          </div>
          <h6 class="font-bold text-sm text-gray-900 mb-2">Lịch sử đơn hàng</h6>
          <div
            v-if="customerModal.orders.length === 0"
            class="text-gray-600 text-sm"
          >
            Chưa có đơn hàng.
          </div>
          <div
            v-for="o in customerModal.orders"
            :key="o.id"
            class="flex justify-between items-center border-b py-2 text-sm"
          >
            <span class="font-medium" v-text="'#' + o.id"></span
            ><span class="text-gray-600" v-text="formatDate(o.date)"></span
            ><span
              class="badge rounded-1"
              :class="getStatusBadgeClass(o.status)"
              v-text="o.status"
            ></span
            ><span class="font-medium" v-text="formatPrice(o.total)"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm -->
    <div
      v-if="confirmModal.open"
      class="custom-modal-overlay"
      @click.self="confirmModal.open = false"
    >
      <div class="custom-modal-box fade-in-scale" style="max-width: 440px">
        <div class="p-4 text-center">
          <div class="confirm-icon mx-auto mb-3">
            <i class="icon icon-exclamation-triangle-fill"></i>
          </div>
          <h6 class="font-bold text-gray-900" v-text="confirmModal.title"></h6>
          <p
            class="text-gray-600 text-sm mb-0"
            v-text="confirmModal.message"
          ></p>
          <div
            v-if="confirmModal.danger"
            class="alert alert-danger flex items-start gap-2 text-start text-sm mt-3 mb-0 rounded-2"
          >
            <i class="icon icon-graph-down-arrow text-base"></i>
            <span
              ><strong>Cảnh báo doanh thu:</strong> Xoá cứng sẽ xoá vĩnh viễn
              sản phẩm cùng biến thể, ảnh và các dòng chi tiết đơn hàng liên
              quan. Điều này có thể làm sai lệch số liệu doanh thu đã thống kê.
              Hãy cân nhắc dùng "xoá mềm" (ẩn) nếu chỉ muốn ngừng bán.</span
            >
          </div>
        </div>
        <div class="p-4 pt-0 flex justify-center gap-2">
          <button
            @click="confirmModal.open = false"
            class="btn btn-light border rounded-2 px-4"
          >
            Hủy</button
          ><button
            @click="executeConfirm"
            class="btn rounded-2 font-bold px-4"
            :class="confirmModal.danger ? 'btn-danger' : 'btn-dark'"
            v-text="confirmModal.confirmLabel || 'Xác nhận'"
          ></button>
        </div>
      </div>
    </div>

    <!-- Toasts: teleport ra <body> để không bị modal / overflow của khung admin che mất -->
    <Teleport to="body">
      <div class="toast-container">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="app-toast fade-in-scale"
          :class="'toast-' + t.type"
        >
          <i class="icon mr-2 text-base" :class="toastIcon(t.type)"></i>
          <span class="grow" v-text="t.message"></span>
          <button
            type="button"
            class="btn btn-sm btn-link text-gray-600 p-0 ml-2 lh-1"
            @click="dismissToast(t.id)"
            aria-label="Đóng thông báo"
          >
            <i class="icon icon-x-lg" style="font-size:0.8rem;"></i>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<!-- Theme dùng chung (global) cho mọi page con -->
<style src="./admin-theme.css"></style>
<style src="./admin-pages-theme.css"></style>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&subset=vietnamese&display=swap");

.font-sans {
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}
.fixed-overlay {
  position: fixed;
  inset: 0;
  height: 100vh;
  width: 100vw;
}

.bg-light-gray {
  background-color: #f3f4f6 !important;
}
.bg-sidebar {
  background: #111111 !important;
}
.bg-sidebar-darker {
  background-color: rgba(255, 255, 255, 0.05) !important;
}

.z-index-1050 {
  z-index: 1050;
}
.z-index-10 {
  z-index: 10;
}
.tracking-wide {
  letter-spacing: 0.04em;
}
.tracking-wider {
  letter-spacing: 0.08em;
}
.transition-sidebar {
  transition: transform 0.3s ease;
}
.transition-main {
  transition: margin-left 0.3s ease;
}

.nav-section-title {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #6b7280;
  font-weight: 600;
  padding: 0 0.75rem;
  margin-bottom: 0.5rem;
}
.custom-nav-item {
  background-color: transparent !important;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease;
  font-size: 0.9rem;
  border-radius: 4px !important;
}
.custom-nav-item:hover {
  background-color: rgba(255, 255, 255, 0.07) !important;
  color: #fff !important;
}
.active-nav {
  background: #ffffff !important;
  color: #0A0A0A !important;
  font-weight: 700 !important;
}
.active-nav:hover {
  background: #f0f0f0 !important;
  color: #0A0A0A !important;
}

.custom-scrollbar-light::-webkit-scrollbar,
.custom-scrollbar-dark::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.custom-scrollbar-light::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 8px;
}
.custom-scrollbar-dark::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 8px;
}
.custom-scrollbar-light::-webkit-scrollbar-track,
.custom-scrollbar-dark::-webkit-scrollbar-track {
  background: transparent;
}

.custom-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1080;
  padding: 1rem;
}
.custom-modal-box {
  background: #fff;
  border-radius: 6px;
  width: 100%;
  max-width: 560px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}
.confirm-icon {
  width: 52px;
  height: 52px;
  border-radius: 4px;
  background: #f5f5f5;
  color: #0A0A0A;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}
.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #0A0A0A;
  margin-top: 4px;
}
.timeline-line {
  width: 2px;
  flex-grow: 1;
  background: #e5e7eb;
  margin: 2px 0;
}
.btn-white {
  background-color: #ffffff;
}
.btn-white:hover {
  background-color: #f3f4f6;
}

.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 2000;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.app-toast {
  background: #fff;
  border-radius: 4px;
  padding: 0.75rem 1rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  font-size: 0.88rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  min-width: 260px;
  max-width: 380px;
  border-left: 3px solid #0A0A0A;
  pointer-events: auto;
}
.toast-success {
  border-left-color: #0A0A0A;
  color: #0A0A0A;
}
.toast-error {
  border-left-color: #D4001A;
  color: #D4001A;
}
.toast-warning {
  border-left-color: #000000;
  color: #000000;
}
.toast-info {
  border-left-color: #333333;
  color: #333333;
}
.admin-page-enter-active,
.admin-page-leave-active {
  transition: opacity .2s ease, transform .2s ease;
}
.admin-page-leave-active {
  position: absolute;
  top: 0;
  left: 0;
}
.admin-page-enter-from { opacity: 0; transform: translateY(6px); }
.admin-page-leave-to { opacity: 0; transform: translateY(-3px); }
.fade-in-scale {
  animation: fadeInScale 0.25s ease;
}
@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}
</style>

