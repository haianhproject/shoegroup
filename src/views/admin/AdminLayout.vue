<!--
  AdminLayout.vue
  ------------------------------------------------------------------
  Khung (shell) của khu quản trị:
    - Thanh NAV bên trái (liên kết tất cả các trang bằng <router-link>)
    - Nội dung bên phải hiển thị qua <router-view> (mỗi trang là 1 file riêng)
    - Các modal & toast dùng chung nằm ở đây để phủ lên mọi trang
-->
<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AdminIcon from "./components/AdminIcon.vue";
import AdminLogoutModal from "./components/AdminLogoutModal.vue";
import brandMark from "../../../img/logogiay.png";
import {
  isNavOpen,
  isLoading,
  apiErrors,
  fetchAllData,
  getDisplayName,
  handleLogout,
  incompleteOrdersCount,
  pendingReturnsCount,
  lowStockCount,
  activeProductCount,
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
const logoutModalOpen = ref(false);
const logoutBusy = ref(false);

const navSearch = ref('');
const menuToggle = ref(null);
const sidebar = ref(null);
const contentArea = ref(null);
const isMobile = ref(window.innerWidth < 1024);
isNavOpen.value = !isMobile.value;
const initials = computed(() => getDisplayName.value.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase());
const todayLabel = computed(() => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date()));

const sections = [
  { title: 'Không gian làm việc', items: [
    { to: '/admin/panel/dashboard', icon: 'grid', label: 'Tổng quan' },
    { to: '/admin/panel/payments', icon: 'payment', label: 'Đơn hàng & thanh toán', badge: () => incompleteOrdersCount.value, attention: true },
    { to: '/admin/panel/pos', icon: 'shop', label: 'Bán hàng tại quầy' },
  ] },
  { title: 'Sản phẩm', items: [
    { to: '/admin/panel/products', icon: 'box', label: 'Tất cả sản phẩm', badge: () => activeProductCount.value },
    { to: '/admin/panel/inventory', icon: 'warehouse', label: 'Kho hàng', badge: () => lowStockCount.value, attention: true },
    { to: '/admin/panel/categories', icon: 'category', label: 'Danh mục' },
    { to: '/admin/panel/brands', icon: 'award', label: 'Thương hiệu' },
    { to: '/admin/panel/collections', icon: 'collection', label: 'Bộ sưu tập' },
    { to: '/admin/panel/materials', icon: 'layers', label: 'Chất liệu' },
    { to: '/admin/panel/colors', icon: 'color', label: 'Màu sắc' },
    { to: '/admin/panel/sizes', icon: 'ruler', label: 'Kích thước' },
  ] },
  { title: 'Kinh doanh', items: [
    { to: '/admin/panel/discounts', icon: 'ticket', label: 'Mã khuyến mãi' },
    { to: '/admin/panel/variant-discounts', icon: 'tag', label: 'Giảm giá biến thể' },
    { to: '/admin/panel/customers', icon: 'people', label: 'Khách hàng' },
  ] },
  { title: 'Hệ thống', items: [
    { to: '/admin/panel/accounts', icon: 'shield', label: 'Tài khoản & phân quyền' },
  ] },
];
const normalizeSearch = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
const visibleSections = computed(() => sections.map(section => ({
  ...section,
  items: section.items.filter(item => normalizeSearch(item.label).includes(normalizeSearch(navSearch.value.trim()))),
})).filter(section => section.items.length));
const activeSection = computed(() => sections.find(section => section.items.some(item => item.to === route.path))?.title || 'Quản lý cửa hàng');
const activeTabTitle = computed(() => sections.flatMap(section => section.items).find(item => item.to === route.path)?.label || route.meta.title || 'Tổng quan');
const hasOwnPageHeading = computed(() => ['admin-dashboard', 'admin-products'].includes(route.name));
const pageDescriptions = {
  payments: 'Theo dõi đơn hàng và xử lý thanh toán trong một không gian.',
  returns: 'Tiếp nhận, kiểm tra và theo dõi các yêu cầu đổi trả.',
  pos: 'Tạo đơn và phục vụ khách hàng ngay tại cửa hàng.',
  inventory: 'Theo dõi tồn kho và chủ động bổ sung từng biến thể sản phẩm.',
  categories: 'Sắp xếp sản phẩm theo bộ môn để khách hàng dễ dàng khám phá.',
  brands: 'Quản lý các thương hiệu trong danh mục của ShoeGroup.',
  collections: 'Tổ chức các bộ sưu tập và câu chuyện sản phẩm của cửa hàng.',
  materials: 'Quản lý thông tin chất liệu được sử dụng cho sản phẩm.',
  colors: 'Đồng bộ bảng màu và các lựa chọn sản phẩm.',
  sizes: 'Quản lý kích thước cho từng dòng sản phẩm.',
  discounts: 'Thiết lập và theo dõi các chương trình ưu đãi cho khách hàng.',
  'variant-discounts': 'Quản lý giá ưu đãi theo từng biến thể màu sắc.',
  customers: 'Theo dõi thông tin và lịch sử mua sắm của khách hàng.',
  accounts: 'Quản lý tài khoản và quyền truy cập hệ thống.',
};
const pageDescription = computed(() => pageDescriptions[route.path.split('/').pop()] || 'Quản lý hoạt động cửa hàng ShoeGroup.');

function closeNavigation(restoreFocus = false) {
  isNavOpen.value = false;
  if (restoreFocus) nextTick(() => menuToggle.value?.focus());
}
function go(event, navigate) {
  navigate(event);
  if (isMobile.value) closeNavigation(true);
}
function onLogout() {
  if (isMobile.value) closeNavigation();
  logoutModalOpen.value = true;
}
function cancelLogout() {
  if (logoutBusy.value) return;
  logoutModalOpen.value = false;
  if (isMobile.value) nextTick(() => menuToggle.value?.focus());
}
async function confirmLogout() {
  if (logoutBusy.value) return;
  logoutBusy.value = true;
  try {
    if (await handleLogout()) await router.push('/login');
  } finally {
    logoutBusy.value = false;
    logoutModalOpen.value = false;
  }
}
function onResize() {
  const nextMobile = window.innerWidth < 1024;
  if (nextMobile !== isMobile.value) {
    isMobile.value = nextMobile;
    isNavOpen.value = !nextMobile;
  }
}
function onKeydown(event) {
  if (!isMobile.value || !isNavOpen.value) return;
  if (event.key === 'Escape') { event.preventDefault(); closeNavigation(true); }
  if (event.key === 'Tab') {
    const items = sidebar.value?.querySelectorAll('a[href], button:not([disabled]), input');
    if (!items?.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
}
watch(isNavOpen, async (open) => {
  if (open && isMobile.value) {
    await nextTick();
    sidebar.value?.querySelector('button')?.focus();
  }
});
watch(() => route.fullPath, () => {
  if (isMobile.value && isNavOpen.value) closeNavigation(true);
  if (contentArea.value) contentArea.value.scrollTop = 0;
});

// Interval 30s refresh dữ liệu realtime (đơn hàng mới, trạng thái, tồn kho...)
// để không tạo tải SQL dồn dập khi mở khu quản trị trong thời gian dài.
const POLL_INTERVAL = 30_000;
let pollTimer = null;
let disposed = false;
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
  window.addEventListener('resize', onResize);
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('visibilitychange', onVisibilityChange);
  await fetchAllData();
  if (!disposed) startPolling();
});
onUnmounted(() => {
  disposed = true;
  window.removeEventListener('resize', onResize);
  document.removeEventListener('keydown', onKeydown);
  stopPolling();
  document.removeEventListener('visibilitychange', onVisibilityChange);
});
</script>

<template>
  <div class="admin-shell" :class="{ 'admin-nav-open': isNavOpen }" :inert="logoutModalOpen">
    <a class="admin-skip-link" href="#admin-content">Đi đến nội dung</a>
    <Transition name="admin-backdrop">
      <div v-if="isMobile && isNavOpen" class="admin-nav-backdrop" aria-hidden="true" @click="closeNavigation(true)"></div>
    </Transition>
    <aside ref="sidebar" id="admin-navigation" class="admin-sidebar" :inert="!isNavOpen" :aria-hidden="!isNavOpen" :role="isMobile ? 'dialog' : undefined" :aria-modal="isMobile && isNavOpen ? true : undefined" aria-label="Điều hướng quản lý">
      <div class="admin-brand-row">
        <router-link to="/admin/panel/dashboard" class="admin-brand" aria-label="ShoeGroup — Tổng quan quản lý">
          <img :src="brandMark" alt="" width="38" height="38" />
          <span><strong>SHOEGROUP<span class="admin-brand-dot">.</span></strong><small>QUẢN LÝ CỬA HÀNG</small></span>
        </router-link>
        <button v-if="isMobile" type="button" class="admin-icon-button" aria-label="Đóng menu" @click="closeNavigation(true)"><AdminIcon name="close" /></button>
      </div>
      <div class="admin-nav-search">
        <AdminIcon name="search" />
        <input v-model="navSearch" aria-label="Tìm mục quản lý" placeholder="Tìm mục quản lý…" type="search" />
      </div>
      <nav class="admin-nav-list" aria-label="Các mục quản lý">
        <section v-for="section in visibleSections" :key="section.title" class="admin-nav-section">
          <h2>{{ section.title }}</h2>
          <router-link v-for="item in section.items" :key="item.to" :to="item.to" custom v-slot="{ isActive, navigate, href }">
            <a :href="href" class="admin-nav-link" :class="{ 'is-active': isActive }" :aria-current="isActive ? 'page' : undefined" @click="go($event, navigate)">
              <AdminIcon :name="item.icon" />
              <span>{{ item.label }}</span>
              <span v-if="item.badge && item.badge() > 0" class="admin-nav-count" :class="{ 'is-attention': item.attention }">{{ item.badge() }}</span>
            </a>
          </router-link>
        </section>
        <p v-if="!visibleSections.length" class="admin-nav-empty">Không tìm thấy mục phù hợp.</p>
      </nav>
      <div class="admin-sidebar-footer">
        <div class="admin-profile"><span class="admin-avatar">{{ initials }}</span><span class="admin-profile-info"><strong>{{ getDisplayName }}</strong><small>Quản trị viên</small></span></div>
        <button type="button" class="admin-icon-button admin-logout" aria-label="Đăng xuất" title="Đăng xuất" @click="onLogout"><AdminIcon name="logout" /></button>
      </div>
    </aside>

    <main class="admin-workspace" :inert="isMobile && isNavOpen">
      <header class="admin-topbar">
        <div class="admin-topbar-start">
          <button ref="menuToggle" type="button" class="admin-icon-button" :aria-label="isNavOpen ? 'Thu gọn menu' : 'Mở menu quản lý'" :aria-expanded="isNavOpen" aria-controls="admin-navigation" @click="isNavOpen = !isNavOpen"><AdminIcon name="menu" /></button>
          <div class="admin-breadcrumb"><span>Quản lý</span><AdminIcon name="chevron" /><strong>{{ activeTabTitle }}</strong></div>
        </div>
        <div class="admin-topbar-actions">
          <span class="admin-date"><AdminIcon name="calendar" />{{ todayLabel }}</span>
          <button type="button" class="admin-sync" :class="{ 'has-error': apiErrors.length }" :disabled="isRefreshing || isLoading" :aria-label="apiErrors.length ? 'Thử đồng bộ lại' : 'Đồng bộ dữ liệu'" @click="refresh" :title="apiErrors.length ? 'Có dữ liệu chưa tải được. Nhấn để thử lại.' : 'Tự động cập nhật mỗi 30 giây. Nhấn để làm mới.'">
            <AdminIcon name="refresh" :class="{ 'is-spinning': isRefreshing || isLoading }" />
            <span>{{ isRefreshing || isLoading ? 'Đang cập nhật' : apiErrors.length ? 'Thử đồng bộ lại' : 'Đồng bộ dữ liệu' }}</span>
          </button>
          <router-link to="/admin/panel/pos" class="admin-pos-link"><AdminIcon name="shop" /><span>Bán tại quầy</span></router-link>
        </div>
      </header>
      <div ref="contentArea" id="admin-content" class="admin-content" tabindex="-1" :aria-busy="isLoading">
        <div v-if="!hasOwnPageHeading" class="admin-route-heading">
          <p>{{ activeSection }}</p><h1>{{ activeTabTitle }}</h1><span>{{ pageDescription }}</span>
        </div>
        <div v-if="apiErrors.length && !isLoading" class="admin-data-warning" role="alert">
          <span><strong>Một số dữ liệu chưa được cập nhật.</strong> Vui lòng thử đồng bộ lại để xem thông tin mới nhất.</span>
          <button type="button" :disabled="isRefreshing" @click="refresh">{{ isRefreshing ? 'Đang thử lại…' : 'Thử lại' }}</button>
        </div>
        <router-view v-slot="{ Component, route: pageRoute }">
          <div class="admin-route-view">
            <Transition name="admin-page" mode="out-in">
              <div :key="pageRoute.fullPath" class="admin-page-wrapper"><component :is="Component" /></div>
            </Transition>
          </div>
        </router-view>
        <footer class="admin-content-footer"><span>SHOEGROUP<span class="admin-brand-dot">.</span></span><span>Không gian quản lý cửa hàng</span></footer>
      </div>
      <div v-if="isLoading" class="admin-loading" role="status"><span class="sg-spinner"></span><strong>Đang tải dữ liệu cửa hàng</strong><p>Vui lòng chờ trong giây lát…</p></div>
    </main>

    <!-- ==================== MODALS (dùng chung) ==================== -->
    <AdminLogoutModal
      :open="logoutModalOpen"
      :admin-name="getDisplayName"
      :busy="logoutBusy"
      @cancel="cancelLogout"
      @confirm="confirmLogout"
    />
    <!-- Cancel order -->
    <div
      v-if="cancelModal.open"
      class="custom-modal-overlay"
      @click.self="cancelModal.open = false"
    >
      <div class="custom-modal-box fade-in-scale" role="dialog" aria-modal="true" aria-label="Hủy đơn hàng">
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
            class="btn btn-sm btn-light border-0" type="button" aria-label="Đóng hộp thoại"
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
      <div class="custom-modal-box fade-in-scale" role="dialog" aria-modal="true" aria-label="Lịch sử đơn hàng">
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
            class="btn btn-sm btn-light border-0" type="button" aria-label="Đóng hộp thoại"
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
      <div class="custom-modal-box fade-in-scale" role="dialog" aria-modal="true" :aria-label="formModal.title">
        <div
          class="p-4 border-b flex justify-between items-center"
        >
          <h6 class="font-bold mb-0 text-gray-900" v-text="formModal.title"></h6>
          <button
            @click="formModal.open = false"
            class="btn btn-sm btn-light border-0" type="button" aria-label="Đóng hộp thoại"
          >
            <i class="icon icon-x-lg"></i>
          </button>
        </div>
        <div class="p-4" style="max-height: 60vh; overflow: auto">
          <div v-for="f in formFields" :key="f.key" class="mb-3">
            <label :for="'admin-field-' + f.key" class="block text-sm font-medium text-sm font-medium" v-text="f.label"></label>
            <select
              v-if="f.type === 'select'"
              v-model="formModal.data[f.key]" :id="'admin-field-' + f.key"
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
                v-model="formModal.data[f.key]" :id="'admin-field-' + f.key"
                class="accent-black"
                type="checkbox"
              />
            </div>
            <textarea
              v-else-if="f.type === 'textarea'"
              v-model="formModal.data[f.key]" :id="'admin-field-' + f.key"
              rows="2"
              class="sg-input rounded-2"
            ></textarea>
            <div v-else-if="f.type === 'image'">
              <div class="flex items-center gap-3 mb-2">
                <img
                  :src="
                    formModal.data[f.key] || brandMark
                  "
                  class="rounded-2 border"
                  style="
                    width: 56px;
                    height: 56px;
                    object-fit: contain;
                    background: #f3f4f6;
                  "
                  :alt="f.label" @error="$event.target.onerror = null; $event.target.src = brandMark"
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
                v-model="formModal.data[f.key]" :id="'admin-field-' + f.key"
                type="text"
                class="sg-input rounded-2"
                placeholder="Hoặc dán URL ảnh..."
              />
            </div>
            <div v-else-if="f.type === 'password'" class="flex">
              <input
                v-model="formModal.data[f.key]" :id="'admin-field-' + f.key"
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
              v-model="formModal.data[f.key]" :id="'admin-field-' + f.key"
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
      <div class="custom-modal-box fade-in-scale" role="dialog" aria-modal="true" aria-label="Thông tin khách hàng">
        <div
          class="p-4 border-b flex justify-between items-center"
        >
          <h6
            class="font-bold mb-0 text-gray-900"
            v-text="customerModal.customer && customerModal.customer.name"
          ></h6>
          <button
            @click="customerModal.open = false"
            class="btn btn-sm btn-light border-0" type="button" aria-label="Đóng hộp thoại"
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
      <div class="custom-modal-box fade-in-scale" role="alertdialog" aria-modal="true" :aria-label="confirmModal.title" style="max-width: 440px">
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
      <div class="toast-container" aria-live="polite" aria-atomic="false">
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
            class="admin-toast-close"
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
<style src="./admin-icons.css"></style>

<style scoped src="./admin-layout.css"></style>
