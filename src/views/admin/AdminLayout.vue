<!--
  AdminLayout.vue
  ------------------------------------------------------------------
  Khung (shell) của khu quản trị:
    - Thanh NAV bên trái (liên kết tất cả các trang bằng <router-link>)
    - Nội dung bên phải hiển thị qua <router-view> (mỗi trang là 1 file riêng)
    - Các modal & toast dùng chung nằm ở đây để phủ lên mọi trang
-->
<script setup>
import { computed, onMounted, ref } from "vue";
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
  pendingReturnsCount,
  lowStockCount,
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
        icon: "bi-grid-1x2-fill",
        label: "Thống Kê Tổng Quan",
      },
    ],
  },
  {
    title: "Mặt Hàng & Giao Dịch",
    items: [
      {
        to: "/admin/panel/payments",
        icon: "bi-credit-card-2-front-fill",
        label: "Xác Nhận Thanh Toán",
        badge: () => unpaidCount.value,
        badgeClass: "bg-warning text-dark",
      },
      {
        to: "/admin/panel/returns",
        icon: "bi-arrow-return-left",
        label: "Trả Hàng / Đổi Trả",
        badge: () => pendingReturnsCount.value,
        badgeClass: "bg-danger",
      },
      {
        to: "/admin/panel/pos",
        icon: "bi-shop-window",
        label: "Bán Hàng Tại Quầy",
      },
    ],
  },
  {
    title: "Quản Lý Sản Phẩm",
    items: [
      {
        to: "/admin/panel/products",
        icon: "bi-box-seam-fill",
        label: "Sản Phẩm",
      },
      {
        to: "/admin/panel/categories",
        icon: "bi-diagram-3-fill",
        label: "Danh Mục Bộ Môn",
      },
      {
        to: "/admin/panel/brands",
        icon: "bi-award-fill",
        label: "Thương Hiệu",
      },
      {
        to: "/admin/panel/materials",
        icon: "bi-layers-fill",
        label: "Chất Liệu",
      },
      { to: "/admin/panel/colors", icon: "bi-palette-fill", label: "Màu Sắc" },
      { to: "/admin/panel/sizes", icon: "bi-rulers", label: "Kích Thước" },
    ],
  },
  {
    title: "Tiếp Thị & Khách Hàng",
    items: [
      {
        to: "/admin/panel/discounts",
        icon: "bi-ticket-perforated-fill",
        label: "Mã Khuyến Mãi",
      },
      // {
      //   to: "/admin/panel/variant-discounts",
      //   icon: "bi-palette-fill",
      //   label: "Giảm Giá Biến Thể Màu",
      // },
      {
        to: "/admin/panel/customers",
        icon: "bi-people-fill",
        label: "Khách Hàng (CRM)",
      },
    ],
  },
  {
    title: "Vận Hành & Bảo Mật",
    items: [
      {
        to: "/admin/panel/staff-report",
        icon: "bi-clipboard-data-fill",
        label: "Báo Cáo Nhân Viên",
      },
      {
        to: "/admin/panel/accounts",
        icon: "bi-shield-lock-fill",
        label: "Quản Lý Tài Khoản",
      },
    ],
  },
];

const activeTabTitle = computed(() => route.meta.title || "Bảng Điều Khiển");

function go(path) {
  router.push(path);
  if (window.innerWidth < 768) isNavOpen.value = false;
}
function onLogout() {
  handleLogout();
  router.push("/login");
}

onMounted(fetchAllData);
</script>

<template>
  <div
    class="fixed-overlay d-flex flex-column bg-light-gray font-sans"
    style="overflow-x: hidden"
  >
    <!-- ============ SIDEBAR ============ -->
    <aside
      class="sidebar-left bg-sidebar text-white position-fixed top-0 start-0 h-100 d-flex flex-column transition-sidebar z-index-1050 shadow-lg"
      :style="{
        width: '260px',
        transform: isNavOpen ? 'translateX(0)' : 'translateX(-100%)',
      }"
    >
      <div
        class="p-4 d-flex align-items-center justify-content-center border-bottom border-secondary border-opacity-25"
        style="height: 72px"
      >
        <div class="d-flex align-items-center gap-2">
          <BrandLogo :size="36" :radius="11" />
          <h3 class="fw-bolder text-uppercase m-0 tracking-wider text-white fs-5">SHOE<span style="color:#38bdf8">GROUP</span></h3>
        </div>
      </div>

      <div
        class="flex-grow-1 overflow-auto py-3 px-3 list-group custom-scrollbar-dark"
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
              @click="go(item.to)"
              class="list-group-item border-0 mb-1 rounded-3 fw-medium custom-nav-item d-flex justify-content-between align-items-center w-100"
              :class="isActive ? 'active-nav text-white' : 'text-secondary'"
            >
              <span
                ><i class="bi me-3 fs-6" :class="item.icon"></i>
                <span v-text="item.label"></span
              ></span>
              <span
                v-if="item.badge && item.badge() > 0"
                class="badge rounded-pill shadow-sm"
                :class="item.badgeClass"
                v-text="item.badge()"
              ></span>
            </button>
          </router-link>
        </template>
      </div>

      <div
        class="p-4 bg-sidebar-darker mt-auto border-top border-secondary border-opacity-25"
      >
        <button
          @click="onLogout"
          class="btn btn-danger rounded-3 w-100 fw-bold shadow-sm py-2 d-flex align-items-center justify-content-center"
        >
          <i class="bi bi-box-arrow-right me-2"></i> Đăng Xuất
        </button>
      </div>
    </aside>

    <!-- ============ MAIN ============ -->
    <main
      class="flex-grow-1 transition-main d-flex flex-column bg-light-gray"
      :style="{ marginLeft: isNavOpen ? '260px' : '0' }"
    >
      <header
        class="d-flex justify-content-between align-items-center px-4 bg-white shadow-sm z-index-10 position-sticky top-0"
        style="height: 72px"
      >
        <div class="d-flex align-items-center gap-3">
          <button
            class="btn btn-light border-0 rounded-circle d-flex align-items-center justify-content-center text-dark bg-light-gray"
            style="width: 40px; height: 40px"
            @click="isNavOpen = !isNavOpen"
          >
            <i class="bi bi-list fs-5"></i>
          </button>
          <h2
            class="h5 mb-0 fw-bold text-dark d-none d-md-block tracking-wide"
            v-text="activeTabTitle"
          ></h2>
        </div>
        <div class="d-flex align-items-center gap-3">
          <button
            class="btn btn-light border-0 rounded-circle position-relative d-flex align-items-center justify-content-center text-dark bg-light-gray"
            style="width: 40px; height: 40px"
            @click="go('/admin/panel/payments')"
            title="Đơn chờ xử lý"
          >
            <i class="bi bi-bell fs-5"></i>
            <span
              v-if="pendingOrdersCount > 0"
              class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
              style="font-size: 0.6rem"
              v-text="pendingOrdersCount"
            ></span>
          </button>
          <div
            class="bg-light rounded-circle d-flex align-items-center justify-content-center text-dark fw-bold border"
            style="width: 40px; height: 40px"
            v-text="getDisplayName.charAt(0).toUpperCase()"
          ></div>
          <span
            class="fw-bold text-dark d-none d-sm-block"
            v-text="'Xin chào, ' + getDisplayName"
          ></span>
        </div>
      </header>

      <div
        v-if="isLoading"
        class="d-flex flex-column justify-content-center align-items-center h-100 flex-grow-1"
      >
        <div class="spinner-border text-dark mb-3"></div>
        <p class="fw-medium text-secondary">Đang nạp dữ liệu từ CSDL...</p>
      </div>

      <div v-else class="p-4 flex-grow-1 overflow-auto custom-scrollbar-light">
        <!-- Mỗi trang con được render tại đây -->
        <router-view />
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
          class="p-4 border-bottom d-flex justify-content-between align-items-center"
        >
          <h6 class="fw-bold mb-0 text-dark">
            Hủy Đơn Hàng
            <span
              v-text="'#' + (cancelModal.order && cancelModal.order.id)"
            ></span>
          </h6>
          <button
            @click="cancelModal.open = false"
            class="btn btn-sm btn-light border-0"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="p-4">
          <p class="small text-secondary">
            Vui lòng chọn hoặc nhập lý do hủy đơn. Thông tin này sẽ được lưu vào
            lịch sử đơn hàng.
          </p>
          <div class="d-flex flex-wrap gap-2 mb-3">
            <button
              v-for="reason in cancelReasons"
              :key="reason"
              @click="cancelModal.reason = reason"
              class="btn btn-sm rounded-pill border"
              :class="
                cancelModal.reason === reason
                  ? 'btn-dark text-white'
                  : 'btn-white text-secondary'
              "
              v-text="reason"
            ></button>
          </div>
          <textarea
            v-model="cancelModal.reason"
            rows="2"
            class="form-control rounded-3"
            placeholder="Lý do khác..."
          ></textarea>
        </div>
        <div class="p-4 border-top d-flex justify-content-end gap-2">
          <button
            @click="cancelModal.open = false"
            class="btn btn-light border rounded-3"
          >
            Đóng</button
          ><button
            @click="submitCancelOrder"
            :disabled="!cancelModal.reason"
            class="btn btn-danger rounded-3 fw-bold"
          >
            Xác nhận hủy
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
          class="p-4 border-bottom d-flex justify-content-between align-items-center"
        >
          <h6 class="fw-bold mb-0 text-dark">
            Lịch Sử Đơn
            <span
              v-text="'#' + (timelineModal.order && timelineModal.order.id)"
            ></span>
          </h6>
          <button
            @click="timelineModal.open = false"
            class="btn btn-sm btn-light border-0"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="p-4" style="max-height: 60vh; overflow: auto">
          <div
            v-for="(h, i) in timelineModal.history"
            :key="i"
            class="d-flex gap-3"
          >
            <div class="d-flex flex-column align-items-center">
              <div class="timeline-dot"></div>
              <div
                v-if="i < timelineModal.history.length - 1"
                class="timeline-line"
              ></div>
            </div>
            <div class="pb-4">
              <p class="fw-medium mb-0 text-dark small" v-text="h.status"></p>
              <p
                class="text-secondary mb-0"
                style="font-size: 0.78rem"
                v-text="formatDate(h.date)"
              ></p>
              <p
                v-if="h.note"
                class="text-secondary small mb-0 fst-italic"
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
          class="p-4 border-bottom d-flex justify-content-between align-items-center"
        >
          <h6 class="fw-bold mb-0 text-dark" v-text="formModal.title"></h6>
          <button
            @click="formModal.open = false"
            class="btn btn-sm btn-light border-0"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="p-4" style="max-height: 60vh; overflow: auto">
          <div v-for="f in formFields" :key="f.key" class="mb-3">
            <label class="form-label small fw-medium" v-text="f.label"></label>
            <select
              v-if="f.type === 'select'"
              v-model="formModal.data[f.key]"
              :disabled="f.disabled"
              class="form-select rounded-3"
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
              class="form-check form-switch"
            >
              <input
                v-model="formModal.data[f.key]"
                class="form-check-input"
                type="checkbox"
              />
            </div>
            <textarea
              v-else-if="f.type === 'textarea'"
              v-model="formModal.data[f.key]"
              rows="2"
              class="form-control rounded-3"
            ></textarea>
            <div v-else-if="f.type === 'image'">
              <div class="d-flex align-items-center gap-3 mb-2">
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
                <label class="btn btn-sm btn-outline-dark rounded-3 mb-0"
                  ><i class="bi bi-upload me-1"></i> Chọn ảnh trên máy<input
                    type="file"
                    accept="image/*"
                    class="d-none"
                    @change="(e) => onFormImageFile(e, f.key)"
                /></label>
              </div>
              <input
                v-model="formModal.data[f.key]"
                type="text"
                class="form-control rounded-3"
                placeholder="Hoặc dán URL ảnh..."
              />
            </div>
            <div v-else-if="f.type === 'password'" class="input-group">
              <input
                v-model="formModal.data[f.key]"
                :type="passwordVisible ? 'text' : 'password'"
                class="form-control rounded-start-3"
                autocomplete="new-password"
              />
              <button
                type="button"
                class="btn btn-outline-secondary rounded-end-3"
                @click="passwordVisible = !passwordVisible"
                :title="passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
              >
                <i class="bi" :class="passwordVisible ? 'bi-eye-slash' : 'bi-eye'"></i>
              </button>
            </div>
            <input
              v-else
              v-model="formModal.data[f.key]"
              :type="f.type || 'text'"
              class="form-control rounded-3"
            />
          </div>
        </div>
        <div class="p-4 border-top d-flex justify-content-end gap-2">
          <button
            @click="formModal.open = false"
            class="btn btn-light border rounded-3"
          >
            Hủy</button
          ><button @click="saveForm" class="btn btn-dark rounded-3 fw-bold">
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
          class="p-4 border-bottom d-flex justify-content-between align-items-center"
        >
          <h6
            class="fw-bold mb-0 text-dark"
            v-text="customerModal.customer && customerModal.customer.name"
          ></h6>
          <button
            @click="customerModal.open = false"
            class="btn btn-sm btn-light border-0"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="p-4" style="max-height: 60vh; overflow: auto">
          <div class="row g-2 mb-3 small">
            <div class="col-6">
              <span class="text-secondary">SĐT:</span>
              <span
                class="fw-medium"
                v-text="customerModal.customer && customerModal.customer.phone"
              ></span>
            </div>
            <div class="col-6">
              <span class="text-secondary">Tổng chi:</span>
              <span
                class="fw-medium"
                v-text="
                  formatPrice(
                    customerModal.customer && customerModal.customer.spent,
                  )
                "
              ></span>
            </div>
          </div>
          <h6 class="fw-bold small text-dark mb-2">Lịch sử đơn hàng</h6>
          <div
            v-if="customerModal.orders.length === 0"
            class="text-secondary small"
          >
            Chưa có đơn hàng.
          </div>
          <div
            v-for="o in customerModal.orders"
            :key="o.id"
            class="d-flex justify-content-between align-items-center border-bottom py-2 small"
          >
            <span class="fw-medium" v-text="'#' + o.id"></span
            ><span class="text-secondary" v-text="formatDate(o.date)"></span
            ><span
              class="badge rounded-pill"
              :class="getStatusBadgeClass(o.status)"
              v-text="o.status"
            ></span
            ><span class="fw-medium" v-text="formatPrice(o.total)"></span>
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
            <i class="bi bi-exclamation-triangle-fill"></i>
          </div>
          <h6 class="fw-bold text-dark" v-text="confirmModal.title"></h6>
          <p
            class="text-secondary small mb-0"
            v-text="confirmModal.message"
          ></p>
          <div
            v-if="confirmModal.danger"
            class="alert alert-danger d-flex align-items-start gap-2 text-start small mt-3 mb-0 rounded-3"
          >
            <i class="bi bi-graph-down-arrow fs-6"></i>
            <span
              ><strong>Cảnh báo doanh thu:</strong> Xoá cứng sẽ xoá vĩnh viễn
              sản phẩm cùng biến thể, ảnh và các dòng chi tiết đơn hàng liên
              quan. Điều này có thể làm sai lệch số liệu doanh thu đã thống kê.
              Hãy cân nhắc dùng "xoá mềm" (ẩn) nếu chỉ muốn ngừng bán.</span
            >
          </div>
        </div>
        <div class="p-4 pt-0 d-flex justify-content-center gap-2">
          <button
            @click="confirmModal.open = false"
            class="btn btn-light border rounded-3 px-4"
          >
            Hủy</button
          ><button
            @click="executeConfirm"
            class="btn rounded-3 fw-bold px-4"
            :class="confirmModal.danger ? 'btn-danger' : 'btn-dark'"
            v-text="confirmModal.confirmLabel || 'Xác nhận'"
          ></button>
        </div>
      </div>
    </div>

    <!-- Toasts -->
    <div class="toast-container">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="app-toast fade-in-scale"
        :class="'toast-' + t.type"
      >
        <i class="bi me-2 fs-6" :class="toastIcon(t.type)"></i>
        <span v-text="t.message"></span>
      </div>
    </div>
  </div>
</template>

<!-- Theme dùng chung (global) cho mọi page con -->
<style src="./admin-theme.css"></style>

<style scoped>
@import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css");
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");

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
  background: linear-gradient(180deg, #0f172a 0%, #0b1220 100%) !important;
}
.bg-sidebar-darker {
  background-color: rgba(255, 255, 255, 0.04) !important;
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
  transition: all 0.18s ease;
  font-size: 0.9rem;
}
.custom-nav-item:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
  color: #fff !important;
}
.active-nav {
  background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%) !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.35);
}
.active-nav:hover {
  background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%) !important;
  color: #ffffff !important;
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
  border-radius: 18px;
  width: 100%;
  max-width: 560px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
.confirm-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #fee2e2;
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
}
.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #2563eb;
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
  z-index: 1090;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.app-toast {
  background: #fff;
  border-radius: 12px;
  padding: 0.8rem 1.1rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  font-size: 0.88rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  min-width: 260px;
  border-left: 4px solid #6b7280;
}
.toast-success {
  border-left-color: #16a34a;
  color: #166534;
}
.toast-error {
  border-left-color: #dc2626;
  color: #991b1b;
}
.toast-warning {
  border-left-color: #d97706;
  color: #92400e;
}
.toast-info {
  border-left-color: #2563eb;
  color: #1e40af;
}
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
</style>
