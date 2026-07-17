/*
 * adminStore.js
 * ------------------------------------------------------------------
 * Kho dữ liệu & logic dùng chung cho toàn bộ khu vực quản trị (Admin).
 *
 * Đây là một "store" dạng composable: mọi state (ref/reactive) và hàm
 * đều được tạo ở cấp module nên chỉ có MỘT bản dùng chung cho tất cả
 * các trang. Bất kỳ trang nào cũng chỉ cần import đúng thứ nó cần:
 *
 *   import { db, filteredOrders, notify } from '../adminStore'
 *
 * Nhờ vậy, code được tách ra nhiều file page riêng nhưng vẫn chia sẻ
 * chung một nguồn dữ liệu duy nhất (giống hệt file gốc AdminDashboard.vue).
 * ------------------------------------------------------------------
 */
import { ref, reactive, computed } from "vue";
import { currentUser, logout } from "@/stores/authStore";

export const API = "http://localhost:5000/api";
export const LOW_STOCK_THRESHOLD = 10;

/* ---------------- STATE ---------------- */
export const isNavOpen = ref(true);
export const isLoading = ref(true);

export const db = reactive({
  orders: [],
  products: [],
  categories: [],
  discounts: [],
  customers: [],
  accounts: [],
  brands: [],
  collections: [],
  inventory: [],
  returns: [],
  variantDiscounts: [],
  colors: [],
  sizes: [],
  materials: [],
  soles: [],
  cushionings: [],
  reviews: [],
});

/* ---------------- TOASTS (thay thế alert) ---------------- */
export const toasts = ref([]);
let toastSeq = 0;
export function notify(message, type = "info") {
  const id = ++toastSeq;
  toasts.value.push({ id, message, type });
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, 3200);
}
export function toastIcon(type) {
  return (
    {
      success: "bi-check-circle-fill",
      error: "bi-x-circle-fill",
      warning: "bi-exclamation-triangle-fill",
      info: "bi-info-circle-fill",
    }[type] || "bi-info-circle-fill"
  );
}

/* ---------------- API (graceful) ---------------- */
export async function api(path, options) {
  try {
    const res = await fetch(API + path, options);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? await res.json() : null;
  } catch (e) {
    console.warn("API lỗi:", path, e.message);
    return null;
  }
}

/* apiWrite: dùng cho thêm/sửa/xoá — KHÔNG nuốt lỗi âm thầm,
   trả về { ok, status, data } để UI báo đúng thành công / thất bại. */
export async function apiWrite(path, options) {
  try {
    const res = await fetch(API + path, options);
    let data = null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }
    }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    console.warn("API lỗi:", path, e.message);
    return { ok: false, status: 0, data: null, error: e.message };
  }
}

/* ---------------- FORMATTERS ---------------- */
export function formatPrice(n) {
  const val = Number(n) || 0;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val);
}
export function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date)) return String(d);
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------------- USER ---------------- */
export const getDisplayName = computed(() => {
  const u = currentUser && currentUser.value;
  return (
    (u && (u.name || u.fullName || u.username || u.email)) || "Quản trị viên"
  );
});
export function handleLogout() {
  if (typeof logout === "function") logout();
  notify("Đã đăng xuất", "info");
}

/* ---------------- BADGE COUNTS ---------------- */
export const pendingOrdersCount = computed(
  () => db.orders.filter((o) => o.status === "Chờ xác nhận").length,
);
export const unpaidCount = computed(
  () =>
    db.orders.filter(
      (o) =>
        (o.payment_status || "Chưa thanh toán") !== "Đã thanh toán" &&
        o.status !== "Đã hủy",
    ).length,
);
export const pendingReturnsCount = computed(
  () => db.returns.filter((r) => r.status === "Chờ xử lý").length,
);
export const lowStockCount = computed(
  () =>
    db.inventory.filter((v) => Number(v.stock) <= LOW_STOCK_THRESHOLD).length,
);

/* ---------------- DASHBOARD RANGE + STATS ---------------- */
export const rangeOptions = [
  { key: "today", label: "Hôm nay" },
  { key: "month", label: "Tháng này" },
  { key: "year", label: "Năm nay" },
  { key: "all", label: "Tất cả" },
  { key: "custom", label: "Tùy chọn" },
];
export const dateRange = ref("month");
export const customRange = reactive({ from: "", to: "" });
export function setRange(key) {
  dateRange.value = key;
}
function rangeBounds() {
  const now = new Date();
  if (dateRange.value === "today") {
    const s = new Date(now);
    s.setHours(0, 0, 0, 0);
    return [s, now];
  }
  if (dateRange.value === "month")
    return [new Date(now.getFullYear(), now.getMonth(), 1), now];
  if (dateRange.value === "year")
    return [new Date(now.getFullYear(), 0, 1), now];
  if (dateRange.value === "custom") {
    const f = customRange.from ? new Date(customRange.from) : new Date(0);
    const t = customRange.to ? new Date(customRange.to + "T23:59:59") : now;
    return [f, t];
  }
  return [new Date(0), now];
}
export const rangeLabel = computed(() => {
  const opt = rangeOptions.find((r) => r.key === dateRange.value);
  if (dateRange.value === "custom" && customRange.from && customRange.to)
    return customRange.from + " → " + customRange.to;
  return opt ? opt.label : "";
});
export const ordersInRange = computed(() => {
  const [from, to] = rangeBounds();
  return db.orders.filter((o) => {
    const d = new Date(o.date);
    return !isNaN(d) && d >= from && d <= to;
  });
});
export const statAccounts = computed(() => db.accounts.length);
export const statProducts = computed(() => db.products.length);
export const statOrders = computed(() => ordersInRange.value.length);
export const statRevenue = computed(
  () =>
    ordersInRange.value
      .filter((o) => o.status !== "Đã hủy")
      .reduce((s, o) => s + (Number(o.total) || 0), 0) -
    completedReturnsRefundInRange.value,
);

export function exportReport() {
  const rows = [
    ["Mã đơn", "Ngày", "Khách hàng", "Trạng thái", "Thanh toán", "Tổng tiền"],
  ];
  ordersInRange.value.forEach((o) =>
    rows.push([
      o.id,
      formatDate(o.date),
      o.customer_name,
      o.status,
      o.payment_status,
      o.total,
    ]),
  );
  const csv = rows
    .map((r) =>
      r
        .map((c) => '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"')
        .join(","),
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bao-cao-don-hang.csv";
  a.click();
  URL.revokeObjectURL(url);
  notify("Đã xuất báo cáo CSV", "success");
}

/* ---------------- DASHBOARD ANALYTICS (chi tiết) ---------------- */
// Đơn hợp lệ trong khoảng (loại đơn đã hủy)
export const validOrdersInRange = computed(() =>
  ordersInRange.value.filter((o) => o.status !== "Đã hủy"),
);
// Giá trị trung bình mỗi đơn
export const avgOrderValue = computed(() => {
  const list = validOrdersInRange.value;
  if (!list.length) return 0;
  return list.reduce((s, o) => s + (Number(o.total) || 0), 0) / list.length;
});
// Đơn gần nhất: gom theo ngày, đếm số đơn (5 ngày gần nhất)
export const recentOrdersByDate = computed(() => {
  const map = {};
  ordersInRange.value.forEach((o) => {
    const d = new Date(o.date);
    if (isNaN(d)) return;
    const key = d.toISOString().slice(0, 10);
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 5)
    .map(([date, count]) => ({ date, count }));
});
// Phân bố trạng thái đơn (dữ liệu cho biểu đồ donut)
export function buildOrderStatusData() {
  const colorMap = {
    "Chờ xác nhận": "#f59e0b",
    "Đã xác nhận": "#0ea5e9",
    "Đang vận chuyển": "#6366f1",
    "Đã giao hàng thành công": "#10b981",
    "Đã hủy": "#ef4444",
  };
  const map = {};
  ordersInRange.value.forEach((o) => {
    const s = o.status || "Khác";
    map[s] = (map[s] || 0) + 1;
  });
  const labels = Object.keys(map);
  return {
    labels,
    data: labels.map((l) => map[l]),
    colors: labels.map((l) => colorMap[l] || "#9ca3af"),
  };
}
// Phương thức thanh toán (dữ liệu cho biểu đồ cột)
export function buildPaymentMethodData() {
  const map = {};
  ordersInRange.value.forEach((o) => {
    const m = o.payment_method || "Khác";
    map[m] = (map[m] || 0) + 1;
  });
  const labels = Object.keys(map);
  return { labels, data: labels.map((l) => map[l]) };
}
// Top sản phẩm & brand bán chạy (theo số lượng bán ra)
export function buildTopProductsData() {
  const prodQty = {},
    brandQty = {},
    brandOfProduct = {};
  validOrdersInRange.value.forEach((o) => {
    (o.products || []).forEach((d) => {
      const name = d.name || "—";
      prodQty[name] = (prodQty[name] || 0) + (Number(d.quantity) || 0);
      const prod = db.products.find((p) => p.name === name);
      const brand = prod ? prod.brand || "—" : "—";
      brandOfProduct[name] = brand;
      brandQty[brand] = (brandQty[brand] || 0) + (Number(d.quantity) || 0);
    });
  });
  const top = Object.entries(prodQty)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const labels = top.map(([name]) => name);
  return {
    labels,
    product: top.map(([, q]) => q),
    brand: labels.map((name) => brandQty[brandOfProduct[name]] || 0),
  };
}
// Tồn kho theo màu
export const inventoryByColor = computed(() => {
  const map = {};
  db.inventory.forEach((v) => {
    const key = v.color || "Khác";
    if (!map[key])
      map[key] = { color: key, hex: v.color_hex || "#d1d5db", total: 0 };
    map[key].total += Number(v.stock) || 0;
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
});
// Sản phẩm sắp hết hàng
export const lowStockList = computed(() =>
  db.inventory
    .filter((v) => Number(v.stock) <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => Number(a.stock) - Number(b.stock)),
);
// Khách hàng nổi bật
export const topCustomerByOrders = computed(() => {
  const map = {};
  db.orders.forEach((o) => {
    const key = o.customer_name || o.customer_phone || "Khách lẻ";
    map[key] = (map[key] || 0) + 1;
  });
  const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
  return top ? { name: top[0], count: top[1] } : null;
});
export const topCustomerBySpending = computed(() => {
  if (!db.customers.length) return null;
  return [...db.customers].sort(
    (a, b) => (Number(b.spent) || 0) - (Number(a.spent) || 0),
  )[0];
});
// Đánh giá sản phẩm
export const ratingStats = computed(() => {
  const list = db.reviews || [];
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0,
    count = 0;
  const prodScore = {};
  list.forEach((r) => {
    const rt = Math.round(Number(r.rating) || 0);
    if (rt >= 1 && rt <= 5) {
      dist[rt]++;
      sum += rt;
      count++;
    }
    if (r.product_name) {
      prodScore[r.product_name] = prodScore[r.product_name] || { sum: 0, n: 0 };
      prodScore[r.product_name].sum += rt;
      prodScore[r.product_name].n++;
    }
  });
  let best = null,
    bestAvg = -1;
  Object.entries(prodScore).forEach(([name, s]) => {
    const a = s.sum / s.n;
    if (a > bestAvg) {
      bestAvg = a;
      best = name;
    }
  });
  return {
    avg: count ? Math.round((sum / count) * 100) / 100 : 0,
    count,
    dist,
    best,
  };
});

/* ---------------- TREND CHART (chỉ cấp dữ liệu, vẽ ở DashboardPage) ---------------- */
export const trendMode = ref("day");
export function setTrendMode(mode) {
  trendMode.value = mode;
}
export function buildTrendData() {
  const orders = ordersInRange.value.filter((o) => o.status !== "Đã hủy");
  const buckets = {};
  orders.forEach((o) => {
    const d = new Date(o.date);
    if (isNaN(d)) return;
    const key =
      trendMode.value === "month"
        ? d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")
        : d.toISOString().slice(0, 10);
    buckets[key] = (buckets[key] || 0) + 1;
  });
  const labels = Object.keys(buckets).sort();
  const data = labels.map((k) => buckets[k]);
  const avg = labels.map((_, i) => {
    const prev = data.slice(Math.max(0, i - 3), i);
    return prev.length
      ? Math.round((prev.reduce((a, b) => a + b, 0) / prev.length) * 10) / 10
      : 0;
  });
  return { labels, data, avg };
}

/* ---------------- ORDERS ---------------- */
export const orderStatuses = [
  "Chờ xác nhận",
  "Đã xác nhận",
  "Đang vận chuyển",
  "Đã giao hàng thành công",
  "Đã hủy",
];
export const orderStatusFilter = ref("Tất cả");
export const filteredOrders = computed(() => {
  const list = [...db.orders].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
  if (orderStatusFilter.value === "Tất cả") return list;
  return list.filter((o) => o.status === orderStatusFilter.value);
});
export function countByStatus(s) {
  return s === "Tất cả"
    ? db.orders.length
    : db.orders.filter((o) => o.status === s).length;
}
export function getStatusBadgeClass(status) {
  return (
    {
      "Chờ xác nhận": "bg-warning-subtle text-warning-emphasis",
      "Đã xác nhận": "bg-info-subtle text-info-emphasis",
      "Đang vận chuyển": "bg-primary-subtle text-primary-emphasis",
      "Đã giao hàng thành công": "badge-active",
      "Đã hủy": "bg-danger-subtle text-danger-emphasis",
    }[status] || "bg-secondary-subtle text-secondary"
  );
}
export function getPaymentBadgeClass(status) {
  return (
    {
      "Đã thanh toán": "badge-active",
      "Hoàn tiền": "bg-info-subtle text-info-emphasis",
    }[status] || "bg-warning-subtle text-warning-emphasis"
  );
}
const orderFlow = {
  "Chờ xác nhận": {
    text: "Duyệt Đơn Hàng",
    next: "Đã xác nhận",
    class: "btn-dark text-white",
  },
  "Đã xác nhận": {
    text: "Giao Vận Chuyển",
    next: "Đang vận chuyển",
    class: "btn-primary text-white",
  },
  "Đang vận chuyển": {
    text: "Xác Nhận Đã Giao",
    next: "Đã giao hàng thành công",
    class: "btn-success text-white",
  },
};
export function getNextAction(status) {
  return orderFlow[status] || null;
}
export async function processOrderFlow(ord) {
  const action = orderFlow[ord.status];
  if (!action) return;
  const prev = ord.status;
  ord.status = action.next;
  ord._history = ord._history || [];
  ord._history.push({
    status: action.next,
    date: new Date().toISOString(),
    note: "Cập nhật bởi " + getDisplayName.value,
  });
  await api("/orders/" + ord.id + "/status", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: action.next }),
  });
  notify("Đơn #" + ord.id + ": " + prev + " → " + action.next, "success");
}

// Máy trạng thái đơn theo phương thức thanh toán.
// - Chuyển khoản: khách phải chuyển khoản TRƯỚC (ở trang khách hàng) mới được xác nhận & hoàn thành đơn.
// - COD: xác nhận → giao → THU TIỀN (gần cuối) → hoàn thành đơn.
export function getOrderActions(o) {
  if (!o || o.status === "Đã hủy" || o.status === "Đã giao hàng thành công")
    return [];
  const method = getPaymentMethodPill(o.payment_method).code;
  const paid = (o.payment_status || "") === "Đã thanh toán";
  const acts = [];
  if (method === "BANK_TRANSFER") {
    if (!paid)
      return [
        {
          key: "wait_bank",
          text: "Chờ khách chuyển khoản",
          locked: true,
          class: "btn-light text-secondary border",
        },
      ];
    if (o.status === "Chờ xác nhận")
      acts.push({
        key: "confirm",
        text: "Xác nhận đơn",
        next: "Đã xác nhận",
        class: "btn-dark text-white",
      });
    else
      acts.push({
        key: "complete",
        text: "Hoàn thành đơn",
        next: "Đã giao hàng thành công",
        class: "btn-success text-white",
      });
    return acts;
  }
  // COD (và các phương thức khác)
  if (o.status === "Chờ xác nhận")
    acts.push({
      key: "confirm",
      text: "Xác nhận đơn",
      next: "Đã xác nhận",
      class: "btn-dark text-white",
    });
  else if (o.status === "Đã xác nhận")
    acts.push({
      key: "ship",
      text: "Giao vận chuyển",
      next: "Đang vận chuyển",
      class: "btn-primary text-white",
    });
  else if (o.status === "Đang vận chuyển") {
    if (method === "COD" && !paid)
      acts.push({
        key: "cod_paid",
        text: "Thanh toán thành công (thu COD)",
        markPaid: true,
        class: "btn-warning text-dark",
      });
    else
      acts.push({
        key: "complete",
        text: "Hoàn thành đơn",
        next: "Đã giao hàng thành công",
        class: "btn-success text-white",
      });
  }
  return acts;
}
export async function runOrderAction(o, act) {
  if (!o || !act || act.locked) return;
  if (act.markPaid) {
    o.payment_status = "Đã thanh toán";
    o._history = o._history || [];
    o._history.push({
      status: "Thanh toán thành công",
      date: new Date().toISOString(),
      note: "Thu tiền COD",
    });
    await api("/orders/" + o.id + "/payment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status: "Đã thanh toán" }),
    });
    notify("Đơn #" + o.id + ": đã thu tiền COD", "success");
    return;
  }
  if (act.next) {
    const prev = o.status;
    o.status = act.next;
    if (
      act.next === "Đã giao hàng thành công" &&
      getPaymentMethodPill(o.payment_method).code === "COD"
    )
      o.payment_status = "Đã thanh toán";
    o._history = o._history || [];
    o._history.push({
      status: act.next,
      date: new Date().toISOString(),
      note: "Cập nhật bởi " + getDisplayName.value,
    });
    await api("/orders/" + o.id + "/status", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: act.next }),
    });
    notify("Đơn #" + o.id + ": " + prev + " → " + act.next, "success");
  }
}

export const cancelReasons = [
  "Hết hàng",
  "Khách yêu cầu hủy",
  "Sai thông tin đơn",
  "Không liên hệ được khách",
  "Nghi ngờ gian lận",
];
export const cancelModal = reactive({ open: false, order: null, reason: "" });
export function openCancelModal(ord) {
  cancelModal.order = ord;
  cancelModal.reason = "";
  cancelModal.open = true;
}
export async function submitCancelOrder() {
  const ord = cancelModal.order;
  if (!ord || !cancelModal.reason) return;
  ord.status = "Đã hủy";
  ord.cancel_reason = cancelModal.reason;
  ord._history = ord._history || [];
  ord._history.push({
    status: "Đã hủy",
    date: new Date().toISOString(),
    note: cancelModal.reason,
  });
  await api("/orders/" + ord.id + "/status", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Đã hủy", reason: cancelModal.reason }),
  });
  cancelModal.open = false;
  notify("Đã hủy đơn #" + ord.id, "warning");
}

export const timelineModal = reactive({
  open: false,
  order: null,
  history: [],
});
export function openOrderTimeline(ord) {
  timelineModal.order = ord;
  const base = [
    { status: "Khởi tạo đơn", date: ord.date, note: "Khách đặt hàng" },
  ];
  timelineModal.history = base.concat(ord._history || []);
  timelineModal.open = true;
}

/* ---------------- PAYMENTS ---------------- */
export const paymentOrders = computed(() =>
  db.orders.filter(
    (o) =>
      (o.payment_status || "Chưa thanh toán") !== "Đã thanh toán" &&
      o.status !== "Đã hủy",
  ),
);
export async function confirmPayment(ord) {
  ord.payment_status = "Đã thanh toán";
  await api("/orders/" + ord.id + "/payment", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payment_status: "Đã thanh toán" }),
  });
  notify("Đã xác nhận thanh toán đơn #" + ord.id, "success");
}

/* ================================================================
 * TRANG XÁC NHẬN THANH TOÁN (Online / Offline + Chi tiết + Hóa đơn)
 * ================================================================ */

// Kênh đang xem: "Online" (khách mua trên mạng) | "Offline" (khách lẻ tại quầy)
export const paymentChannel = ref("Online");
export const paymentSearch = ref("");

// Suy ra kênh bán của 1 đơn hàng
export function getOrderChannel(o) {
  const pm = (o.payment_method || "").toLowerCase();
  if (pm.includes("tiền mặt") || pm === "cash") return "Offline";
  if (o.handled_by) return "Offline";
  if ((o.customer_name || "") === "Khách lẻ") return "Offline";
  return "Online";
}

// Danh sách đơn theo kênh + từ khóa tìm kiếm
export const paymentChannelOrders = computed(() => {
  const q = paymentSearch.value.trim().toLowerCase();
  return db.orders
    .filter((o) => getOrderChannel(o) === paymentChannel.value)
    .filter(
      (o) =>
        !q ||
        String(o.id).toLowerCase().includes(q) ||
        (o.customer_name || "").toLowerCase().includes(q) ||
        (o.customer_phone || "").includes(q),
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));
});
export const paymentChannelCount = computed(
  () => paymentChannelOrders.value.length,
);
// Tổng số đơn (cố định, không đổi khi chuyển tab) = Online + Offline
export const paymentTotalCount = computed(() => db.orders.length);
export function countOrdersByChannel(ch) {
  return db.orders.filter((o) => getOrderChannel(o) === ch).length;
}

// Chuẩn hóa phương thức thanh toán -> nhãn pill (BANK_TRANSFER / COD / CASH / UNKNOWN)
export function getPaymentMethodPill(pm) {
  const s = (pm || "").toLowerCase();
  if (s.includes("cod") || s.includes("nhận hàng"))
    return { code: "COD", cls: "bg-warning-subtle text-warning-emphasis" };
  if (
    s.includes("bank") ||
    s.includes("banking") ||
    s.includes("atm") ||
    s.includes("visa") ||
    s.includes("master") ||
    s.includes("chuyển khoản") ||
    s.includes("vnpay") ||
    s.includes("momo")
  )
    return { code: "BANK_TRANSFER", cls: "bg-info-subtle text-info-emphasis" };
  if (s.includes("tiền mặt") || s === "cash")
    return { code: "CASH", cls: "bg-success-subtle text-success-emphasis" };
  return { code: "UNKNOWN", cls: "bg-secondary-subtle text-secondary" };
}

// Pill trạng thái thanh toán
// Suy ra trạng thái thanh toán TỰ ĐỘNG (admin KHÔNG cần bấm xác nhận)
// - Chuyển khoản / ví điện tử: coi như đã thanh toán ngay khi tạo đơn (khách quét link).
// - Tiền mặt tại quầy (POS): đã thanh toán ngay.
// - COD: chỉ tính là đã thanh toán khi đơn "Đã giao hàng thành công" (khách nhận & bấm xác nhận).
export function effectivePaymentStatus(o) {
  if ((o.payment_status || "") === "Hoàn tiền") return "Hoàn tiền";
  if (o.status === "Đã hủy") return "Chưa thanh toán";
  const pill = getPaymentMethodPill(o.payment_method);
  if (pill.code === "CASH") return "Đã thanh toán";
  if (pill.code === "BANK_TRANSFER")
    return (o.payment_status || "") === "Đã thanh toán"
      ? "Đã thanh toán"
      : "Chờ chuyển khoản";
  if (pill.code === "COD")
    return o.status === "Đã giao hàng thành công" ||
      (o.payment_status || "") === "Đã thanh toán"
      ? "Đã thanh toán"
      : "Chờ thu khi giao (COD)";
  return o.payment_status || "Chưa thanh toán";
}
export function getPaymentStatusPill(o) {
  const st = effectivePaymentStatus(o);
  if (st === "Đã thanh toán")
    return { label: "Đã thanh toán", cls: "badge-active" };
  if (st === "Hoàn tiền")
    return { label: "Hoàn tiền", cls: "bg-info-subtle text-info-emphasis" };
  if (st === "Chờ chuyển khoản")
    return {
      label: "Chờ chuyển khoản",
      cls: "bg-warning-subtle text-warning-emphasis",
    };
  if (st === "Chờ thu khi giao (COD)")
    return {
      label: "Chờ thu (COD)",
      cls: "bg-warning-subtle text-warning-emphasis",
    };
  if (st === "Chưa thanh toán")
    return {
      label: "Chưa thanh toán",
      cls: "bg-warning-subtle text-warning-emphasis",
    };
  return { label: "Không xác định", cls: "bg-secondary-subtle text-secondary" };
}

// Pill trạng thái đơn (rút gọn theo hình mẫu)
export function getOrderStatusPill(o) {
  const map = {
    "Đã giao hàng thành công": { label: "Hoàn thành", cls: "badge-active" },
    "Đang vận chuyển": {
      label: "Đang giao",
      cls: "bg-primary-subtle text-primary-emphasis",
    },
    "Đã xác nhận": {
      label: "Đã xác nhận",
      cls: "bg-info-subtle text-info-emphasis",
    },
    "Chờ xác nhận": {
      label: "Chờ xác nhận",
      cls: "bg-warning-subtle text-warning-emphasis",
    },
    "Đã hủy": { label: "Đã hủy", cls: "bg-danger-subtle text-danger-emphasis" },
  };
  return (
    map[o.status] || {
      label: o.status || "—",
      cls: "bg-secondary-subtle text-secondary",
    }
  );
}

// Mã vận đơn & mã lấy hàng shipper
// Mã vận đơn chuẩn: ưu tiên mã đã lưu trong CSDL (Orders.TrackingNumber);
// nếu chưa có thì sinh mã dạng SGVN + ngày(yyMMdd) + số đơn(5 số) + ký tự kiểm tra.
export function getTrackingCode(o) {
  if (o && o.tracking_code) return o.tracking_code;
  const id = Number(o && o.id) || 0;
  const d = o && o.date ? new Date(o.date) : new Date();
  const ymd =
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const seq = String(id).padStart(5, "0");
  const check =
    String.fromCharCode(65 + ((id * 7 + 3) % 26)) + String((id * 13 + 7) % 10);
  return "SGVN" + ymd + seq + check;
}
export function getShipperCode(o) {
  return "SHIP-" + String(o.id);
}

/* ---- Chi tiết đơn hàng (hiển thị khi bấm "Chi tiết") ---- */
export const orderDetail = reactive({ open: false, order: null });
export function openOrderDetail(o) {
  orderDetail.order = o;
  orderDetail.open = true;
}
export function closeOrderDetail() {
  orderDetail.open = false;
  orderDetail.order = null;
}

// Lịch sử đơn hàng dạng dòng thời gian ngang
export function buildOrderHistory(o) {
  if (!o) return [];
  const hist = o._history || [];
  const findDate = (statuses) => {
    const h = hist.find((x) => statuses.includes(x.status));
    return h ? h.date : null;
  };
  const created = o.date;
  const paid = effectivePaymentStatus(o) === "Đã thanh toán";
  const order = [
    "Chờ xác nhận",
    "Đã xác nhận",
    "Đang vận chuyển",
    "Đã giao hàng thành công",
  ];
  const rank = order.indexOf(o.status);
  const isBank = getPaymentMethodPill(o.payment_method).code === "BANK_TRANSFER";
  const steps = [
    { label: "Tạo đơn hàng", icon: "bi-cart-plus", done: true, date: created },
  ];
  if (isBank) {
    // Chuyển khoản: khách thanh toán trước, rồi mới xác nhận & hoàn thành
    steps.push({
      label: "Chuyển khoản",
      icon: "bi-bank",
      done: paid,
      date: paid ? findDate(["Đã thanh toán"]) || created : null,
    });
    steps.push({
      label: "Xác nhận đơn",
      icon: "bi-check2-circle",
      done: rank >= 1,
      date: findDate(["Đã xác nhận"]),
    });
    steps.push({
      label: "Hoàn thành đơn",
      icon: "bi-bag-check",
      done: rank >= 3,
      date: findDate(["Đã giao hàng thành công"]),
    });
  } else {
    // COD: thanh toán ở gần cuối (thu tiền khi giao), trước khi hoàn thành đơn
    steps.push({
      label: "Xác nhận đơn",
      icon: "bi-check2-circle",
      done: rank >= 1,
      date: findDate(["Đã xác nhận"]),
    });
    steps.push({
      label: "Đang giao hàng",
      icon: "bi-truck",
      done: rank >= 2,
      date: findDate(["Đang vận chuyển"]),
    });
    steps.push({
      label: "Thanh toán (COD)",
      icon: "bi-cash-coin",
      done: paid,
      date: paid
        ? findDate(["Thanh toán thành công", "Đã giao hàng thành công"])
        : null,
    });
    steps.push({
      label: "Hoàn thành đơn",
      icon: "bi-bag-check",
      done: rank >= 3,
      date: findDate(["Đã giao hàng thành công"]),
    });
  }
  return steps;
}

/* ---- Xuất / In hóa đơn (mở cửa sổ in -> Lưu PDF) ---- */
function escHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
export const SHOP_INFO = {
  name: "DVTD BASEBALL CAP SHOP",
  phone: "0906076388",
  email: "benmnhat@gmail.com",
  address: "160 Cao Lỗ, Uy Nỗ, Đông Anh, Hà Nội",
};
export function printInvoice(o) {
  if (!o) {
    notify("Không có dữ liệu đơn hàng để in", "error");
    return;
  }
  const products = o.products || [];
  let subtotal = 0;
  const rows = products
    .map((p, i) => {
      const qty = Number(p.quantity) || 0;
      const price = Number(p.price) || 0;
      const line = qty * price;
      subtotal += line;
      const sub =
        p.color || p.size
          ? "<div class='muted'>" +
            escHtml(p.color) +
            (p.size ? " / Size " + escHtml(p.size) : "") +
            "</div>"
          : "";
      return (
        "<tr>" +
        "<td class='c'>" +
        (i + 1) +
        "</td>" +
        "<td>" +
        escHtml(p.name) +
        sub +
        "</td>" +
        "<td class='c'>" +
        qty +
        "</td>" +
        "<td class='r'>" +
        formatPrice(price) +
        "</td>" +
        "<td class='r'>" +
        formatPrice(line) +
        "</td>" +
        "<td class='c'>" +
        escHtml(o.status || "") +
        "</td>" +
        "</tr>"
      );
    })
    .join("");
  const grand = Number(o.total) || 0;
  const shipping = Number(o.shipping_fee) || 0;
  const discount = Math.max(0, subtotal + shipping - grand);
  const code = getTrackingCode(o);
  const qr =
    "https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=" +
    encodeURIComponent(code);
  let bars = "";
  for (let i = 0; i < code.length * 2; i++) {
    const w = (code.charCodeAt(i % code.length) % 3) + 1;
    const black = i % 2 === 0;
    bars +=
      "<span style='display:inline-block;width:" +
      w +
      "px;height:44px;background:" +
      (black ? "#111" : "#fff") +
      "'></span>";
  }
  const style =
    "<style>" +
    "*{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;} " +
    "body{margin:0;padding:28px;color:#111;} " +
    ".inv{max-width:720px;margin:0 auto;} " +
    ".top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:14px;} " +
    ".brand{font-size:20px;font-weight:800;letter-spacing:1px;} " +
    ".muted{color:#888;font-size:12px;} " +
    "h1{font-size:22px;text-align:center;margin:18px 0 4px;letter-spacing:1px;} " +
    ".meta{display:flex;justify-content:space-between;font-size:13px;margin:14px 0;} " +
    ".meta div{line-height:1.7;} " +
    "table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px;} " +
    "th,td{border:1px solid #ddd;padding:8px;} " +
    "th{background:#111;color:#fff;font-size:12px;text-transform:uppercase;} " +
    ".c{text-align:center;} .r{text-align:right;} " +
    ".sum{margin-top:12px;width:280px;margin-left:auto;font-size:13px;} " +
    ".sum td{border:none;padding:4px 8px;} " +
    ".sum .grand{font-weight:800;font-size:16px;border-top:2px solid #111;} " +
    ".foot{display:flex;justify-content:space-between;align-items:center;margin-top:24px;} " +
    ".thanks{text-align:center;margin-top:20px;font-style:italic;color:#555;} " +
    "@media print { body { padding:0; } .noprint { display:none; } } " +
    ".noprint{text-align:center;margin-top:18px;} " +
    ".btn{background:#111;color:#fff;border:none;padding:10px 22px;border-radius:6px;cursor:pointer;font-size:14px;} " +
    "</style>";
  const html =
    "<!doctype html><html lang='vi'><head><meta charset='utf-8'><title>Hóa đơn " +
    escHtml(code) +
    "</title>" +
    style +
    "</head><body><div class='inv'>" +
    "<div class='top'><div><div class='brand'>" +
    escHtml(SHOP_INFO.name) +
    "</div><div class='muted'>SĐT: " +
    escHtml(SHOP_INFO.phone) +
    "</div><div class='muted'>Email: " +
    escHtml(SHOP_INFO.email) +
    "</div><div class='muted'>" +
    escHtml(SHOP_INFO.address) +
    "</div></div><div style='text-align:right'><img src='" +
    qr +
    "' width='96' height='96' alt='QR'></div></div>" +
    "<h1>HÓA ĐƠN BÁN HÀNG</h1>" +
    "<div class='muted' style='text-align:center'>Mã hóa đơn: " +
    escHtml(code) +
    "</div>" +
    "<div class='meta'><div><b>Khách hàng:</b> " +
    escHtml(o.customer_name || "Khách lẻ") +
    "<br><b>SĐT:</b> " +
    escHtml(o.customer_phone || "—") +
    "<br><b>Địa chỉ nhận hàng:</b> " +
    escHtml(o.customer_address || "—") +
    "</div><div style='text-align:right'><b>Ngày:</b> " +
    escHtml(formatDate(o.date)) +
    "<br><b>Nhân viên:</b> " +
    escHtml(o.handled_by || "Admin") +
    "<br><b>Kênh:</b> " +
    escHtml(getOrderChannel(o)) +
    "</div></div>" +
    "<table><thead><tr><th class='c'>STT</th><th>Tên sản phẩm</th><th class='c'>SL</th><th class='r'>Đơn giá</th><th class='r'>Thành tiền</th><th class='c'>Trạng thái</th></tr></thead><tbody>" +
    (rows ||
      "<tr><td colspan='6' class='c muted'>Không có sản phẩm</td></tr>") +
    "</tbody></table>" +
    "<table class='sum'><tbody>" +
    "<tr><td>Tổng tiền hàng</td><td class='r'>" +
    formatPrice(subtotal) +
    "</td></tr>" +
    "<tr><td>Giảm giá</td><td class='r'>- " +
    formatPrice(discount) +
    "</td></tr>" +
    "<tr><td>Phí giao hàng</td><td class='r'>" +
    formatPrice(shipping) +
    "</td></tr>" +
    "<tr class='grand'><td>Tổng cần thanh toán</td><td class='r'>" +
    formatPrice(grand) +
    "</td></tr>" +
    "</tbody></table>" +
    "<div class='foot'><div><div style='letter-spacing:1px'>" +
    bars +
    "</div><div class='muted' style='text-align:center'>" +
    escHtml(code) +
    "</div></div><div style='text-align:right'><img src='" +
    qr +
    "' width='90' height='90' alt='QR'></div></div>" +
    "<div class='thanks'>Cảm ơn quý khách! Hẹn gặp lại tại " +
    escHtml(SHOP_INFO.name) +
    ".</div>" +
    "<div class='noprint'><button class='btn' onclick='window.print()'>In / Lưu PDF</button></div>" +
    "</div></body></html>";
  const win = window.open("", "_blank", "width=860,height=760");
  if (!win) {
    notify(
      "Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép popup.",
      "error",
    );
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch (e) {}
  }, 500);
  notify("Đã mở hóa đơn " + code, "success");
}

/* ---------------- RETURNS ---------------- */
export const returnFilter = ref("Tất cả");
export const filteredReturns = computed(() =>
  returnFilter.value === "Tất cả"
    ? db.returns
    : db.returns.filter((r) => r.status === returnFilter.value),
);
export function getReturnBadgeClass(status) {
  return (
    {
      "Chờ xử lý": "bg-warning-subtle text-warning-emphasis",
      "Đã duy�����t": "bg-info-subtle text-info-emphasis",
      "Từ chối": "bg-danger-subtle text-danger-emphasis",
      "Hoàn tất": "badge-active",
    }[status] || "bg-secondary-subtle text-secondary"
  );
}
export async function processReturn(r, status) {
  r.status = status;
  await api("/returns/" + r.id + "/status", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  notify("Yêu cầu trả hàng #" + r.id + ": " + status, "success");
}

/* ================================================================
 * TRẢ HÀNG THEO HÓA ĐƠN (tra cứu đơn -> chọn SP trả -> hoàn tiền)
 * ================================================================ */
export const returnSearchCode = ref("");
export const returnFoundOrder = ref(null);
export const returnItems = ref([]);
export const returnNote = ref("");
// Loại trả hàng: "CUSTOMER" = khách yêu cầu (cần duyệt); "DIRECT" = trả trực tiếp tại quầy (hoàn tất ngay)
export const returnType = ref("CUSTOMER");
export function getReturnTypeLabel(t) {
  return t === "DIRECT" || t === "Trực tiếp"
    ? "Trả trực tiếp tại quầy"
    : "Trả theo yêu cầu khách hàng";
}
// Tổng tiền hoàn của các đơn trả ĐÃ HOÀN TẤT (dùng để TRỪ vào doanh thu)
export const completedReturnsRefundInRange = computed(() => {
  const ids = new Set(ordersInRange.value.map((o) => String(o.id)));
  return (db.returns || [])
    .filter((r) => r.status === "Hoàn tất" && ids.has(String(r.order_id)))
    .reduce((s, r) => s + (Number(r.refund_amount) || 0), 0);
});
export function searchReturnOrder() {
  const raw = returnSearchCode.value.trim();
  if (!raw) {
    notify("Vui lòng nhập mã hóa đơn", "error");
    return;
  }
  const code = raw.replace(/^#/, "").replace(/^HD/i, "");
  const up = raw.toUpperCase();
  const ord = db.orders.find(
    (o) =>
      String(o.id) === code ||
      String(o.id) === raw ||
      "HD" + o.id === up ||
      getTrackingCode(o).toUpperCase() === up,
  );
  if (!ord) {
    returnFoundOrder.value = null;
    returnItems.value = [];
    notify("Không tìm thấy đơn hàng phù hợp", "error");
    return;
  }
  // CHỈ cho phép trả hàng khi đơn ĐÃ giao thành công (khách đã nhận được hàng).
  if (ord.status !== "Đã giao hàng thành công") {
    returnFoundOrder.value = null;
    returnItems.value = [];
    notify(
      "Đơn " +
        getTrackingCode(ord) +
        " chưa giao thành công nên chưa thể tạo yêu cầu trả hàng",
      "error",
    );
    return;
  }
  returnFoundOrder.value = ord;
  // Đơn bán tại quầy (offline) => trả trực tiếp; đơn online => trả theo yêu cầu KH
  returnType.value = getOrderChannel(ord) === "Offline" ? "DIRECT" : "CUSTOMER";
  returnItems.value = (ord.products || []).map((p, idx) => ({
    idx,
    name: p.name,
    color: p.color,
    size: p.size,
    image: p.image,
    price: Number(p.price) || 0,
    max: Number(p.quantity) || 0,
    return_qty: 0,
  }));
  returnNote.value = "";
  notify("Tìm thấy đơn hàng có thể trả", "success");
}
export const returnRefundTotal = computed(() =>
  returnItems.value.reduce(
    (s, it) => s + it.price * (Number(it.return_qty) || 0),
    0,
  ),
);
export const returnSelectedCount = computed(() =>
  returnItems.value.reduce((s, it) => s + (Number(it.return_qty) || 0), 0),
);
export function resetReturnForm() {
  returnSearchCode.value = "";
  returnFoundOrder.value = null;
  returnItems.value = [];
  returnNote.value = "";
  returnType.value = "CUSTOMER";
}
export async function submitReturn() {
  const ord = returnFoundOrder.value;
  if (!ord) return;
  const items = returnItems.value.filter((it) => Number(it.return_qty) > 0);
  if (items.length === 0) {
    notify("Chọn ít nhất 1 sản phẩm để trả", "error");
    return;
  }
  const direct = returnType.value === "DIRECT";
  // Trả trực tiếp tại quầy (khách mua trực tiếp): hoàn tất ngay, không cần duyệt.
  // Trả theo yêu cầu khách hàng (đơn online): tạo yêu cầu, chờ duyệt rồi hoàn tất.
  const status = direct ? "Hoàn tất" : "Chờ xử lý";
  const payload = {
    order_id: ord.id,
    tracking_number: getTrackingCode(ord),
    return_type: returnType.value,
    reason:
      returnNote.value ||
      (direct ? "Khách trả trực tiếp tại quầy" : "Khách yêu cầu trả hàng"),
    refund_amount: returnRefundTotal.value,
    status,
    items: items.map((it) => ({
      name: it.name,
      color: it.color,
      size: it.size,
      quantity: it.return_qty,
      price: it.price,
    })),
  };
  let res = null;
  try {
    res = await apiWrite("/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // Máy chủ có thể chưa sẵn sàng — vẫn ghi nhận cục bộ để hiển thị
  }
  const newId =
    (res && res.data && (res.data.ReturnID || res.data.id)) ||
    "R-" + Date.now();
  db.returns.unshift({
    id: newId,
    order_id: ord.id,
    return_type: returnType.value,
    reason: payload.reason,
    refund_amount: payload.refund_amount,
    status,
    created_at: new Date().toISOString(),
  });
  notify(
    direct
      ? "Đã trả hàng trực tiếp & hoàn tất cho đơn #" + ord.id
      : "Đã tạo yêu cầu trả hàng cho đơn #" + ord.id,
    "success",
  );
  resetReturnForm();
}

/* ---------------- POS ---------------- */
export const POS_MAX_ORDERS = 100;
let posSeq = 186;
function newPosOrder() {
  posSeq += 1;
  return reactive({
    code: posSeq,
    customer_type: "Khách lẻ",
    customer_name: "",
    customer_phone: "",
    customer_note: "",
    customer_id: null,
    cart: [],
    coupon_code: "",
    payment_method: "Tiền mặt",
    cash_given: 0,
  });
}
export const posOrders = reactive([newPosOrder()]);
export const posActiveIndex = ref(0);
export const activePosOrder = computed(
  () => posOrders[posActiveIndex.value] || posOrders[0],
);
export function createPosOrder() {
  posOrders.push(newPosOrder());
  posActiveIndex.value = posOrders.length - 1;
}
export function selectPosOrder(i) {
  posActiveIndex.value = i;
}
export function removePosOrder(i) {
  posOrders.splice(i, 1);
  if (posOrders.length === 0) posOrders.push(newPosOrder());
  if (posActiveIndex.value >= posOrders.length)
    posActiveIndex.value = posOrders.length - 1;
}
export const posOrderSearch = ref("");
export const filteredPosOrders = computed(() => {
  const q = posOrderSearch.value.trim().toLowerCase();
  return posOrders
    .map((o, i) => ({ o, i }))
    .filter((row) => !q || String(row.o.code).toLowerCase().includes(q));
});
// Modal QR chuyển khoản cho bán hàng tại quầy
export const posPayModal = reactive({ open: false, qr: "", amount: 0 });
export function cancelPosPay() {
  posPayModal.open = false;
}
export async function confirmPosPaid() {
  posPayModal.open = false;
  await finalizePosOrder();
}

export const posSearch = ref("");
export const posVariants = computed(() => {
  const q = posSearch.value.trim().toLowerCase();
  const list = [];
  const covered = new Set();
  // 1) Ưu tiên biến thể trong kho (màu/size/SKU/tồn kho)
  db.inventory.forEach((v) => {
    covered.add(String(v.product_id));
    const p = db.products.find((x) => String(x.id) === String(v.product_id));
    if (p && p.active === false) return;
    const base = p ? Number(p.sale_price || p.price) || 0 : 0;
    list.push({
      id: v.id,
      variant_id: v.id,
      product_id: v.product_id,
      product_name: v.product_name || (p ? p.name : "Sản phẩm"),
      color: v.color,
      color_hex: v.color_hex,
      size: v.size,
      sku: v.sku,
      stock: Number(v.stock) || 0,
      image: p ? p.image_url : "",
      price: base + (Number(v.price_adjustment) || 0),
    });
  });
  // 2) Sản phẩm chưa có biến thể trong kho -> hiển thị 1 thẻ sản phẩm
  db.products.forEach((p) => {
    if (p.active === false) return;
    if (covered.has(String(p.id))) return;
    list.push({
      id: "p-" + p.id,
      variant_id: null,
      product_id: p.id,
      product_name: p.name,
      color: "",
      color_hex: "",
      size: "",
      sku: p.sku || "",
      stock: 999,
      image: p.image_url || "",
      price: Number(p.sale_price || p.price) || 0,
    });
  });
  return list.filter(
    (v) =>
      !q ||
      (v.product_name || "").toLowerCase().includes(q) ||
      (v.color || "").toLowerCase().includes(q) ||
      (v.size || "").toLowerCase().includes(q) ||
      (v.sku || "").toLowerCase().includes(q),
  );
});
export function addToCart(v, qty) {
  const order = activePosOrder.value;
  const n = Math.max(1, Number(qty) || 1);
  const key = String(v.id);
  const existing = order.cart.find((c) => String(c.key) === key);
  if (existing) existing.quantity += n;
  else
    order.cart.push({
      key: v.id,
      variant_id: v.variant_id,
      product_id: v.product_id,
      name: v.product_name,
      color: v.color,
      color_hex: v.color_hex,
      size: v.size,
      sku: v.sku,
      price: v.price,
      quantity: n,
    });
}
export function removeCartItem(i) {
  activePosOrder.value.cart.splice(i, 1);
}
export const posSubtotal = computed(() =>
  activePosOrder.value.cart.reduce(
    (s, c) => s + (Number(c.price) || 0) * (Number(c.quantity) || 0),
    0,
  ),
);
export const posCouponList = computed(() =>
  db.discounts.filter((d) => d.active && !isExpired(d.expiry)),
);
export const posDiscountAmount = computed(() => {
  const code = activePosOrder.value.coupon_code;
  if (!code) return 0;
  const d = db.discounts.find((x) => String(x.code) === String(code));
  if (!d) return 0;
  const sub = posSubtotal.value;
  if (Number(d.min_order) > 0 && sub < Number(d.min_order)) return 0;
  let amt =
    d.discount_type === "Cố định"
      ? Number(d.value) || 0
      : (sub * (Number(d.value) || 0)) / 100;
  if (Number(d.max_discount) > 0 && amt > Number(d.max_discount))
    amt = Number(d.max_discount);
  if (amt > sub) amt = sub;
  return Math.round(amt);
});
export const posGrandTotal = computed(() =>
  Math.max(0, posSubtotal.value - posDiscountAmount.value),
);
export const posChange = computed(
  () => (Number(activePosOrder.value.cash_given) || 0) - posGrandTotal.value,
);
export function applyPosCoupon() {
  const code = activePosOrder.value.coupon_code;
  if (!code) {
    notify("Chọn một ưu đãi", "error");
    return;
  }
  const d = db.discounts.find((x) => String(x.code) === String(code));
  if (!d) {
    notify("Không tìm thấy mã", "error");
    return;
  }
  if (Number(d.min_order) > 0 && posSubtotal.value < Number(d.min_order)) {
    notify(
      "Đơn tối thiểu " + formatPrice(d.min_order) + " mới dùng được mã này",
      "warning",
    );
    return;
  }
  notify("Đã áp dụng ưu đãi " + d.code, "success");
}
export function clearPosCoupon() {
  activePosOrder.value.coupon_code = "";
  notify("Đã bỏ ưu đãi", "info");
}
export const posCustomerSearch = ref("");
export const posCustomerResults = computed(() => {
  const q = posCustomerSearch.value.trim().toLowerCase();
  return db.customers
    .filter(
      (c) =>
        !q ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q),
    )
    .slice(0, 30);
});
export function pickPosCustomer(c) {
  const o = activePosOrder.value;
  o.customer_id = c.id;
  o.customer_name = c.name;
  o.customer_phone = c.phone || "";
}
/* Lưu khách vãng lai (không có tài khoản) vào danh sách khách hàng.
   Dùng chung cho nút "Lưu thông tin" và khi thanh toán tại quầy. */
// Khách vãng lai KHÔNG tạo tài khoản đăng nhập.
// Thông tin (tên/SĐT) được lưu trực tiếp trên đơn hàng; trang Khách hàng sẽ tự
// tổng hợp khách vãng lai từ đơn hàng ở lần tải dữ liệu kế tiếp.
export async function ensureWalkInCustomer(name, phone) {
  const nm = (name || "").trim();
  const ph = (phone || "").trim();
  if (!nm && !ph) return { ok: false, id: null };
  const existing = db.customers.find(
    (c) => ph && String(c.phone) === String(ph),
  );
  if (existing) {
    if (nm) existing.name = nm;
    return { ok: true, id: existing.id };
  }
  db.customers.unshift({
    id: "walkin:" + (ph || Date.now()),
    name: nm || "Khách lẻ",
    phone: ph,
    email: "",
    address: "",
    spent: 0,
    order_count: 0,
    created_at: new Date().toISOString(),
    source: "Vãng lai",
  });
  return { ok: true, id: null };
}
export async function savePosCustomer() {
  const o = activePosOrder.value;
  if (o.customer_id) {
    notify("Khách đã có tài khoản trong hệ thống", "warning");
    return;
  }
  const nm = (o.customer_name || "").trim();
  const ph = (o.customer_phone || "").trim();
  if (!nm && !ph) {
    notify("Nhập tên hoặc SĐT khách để lưu", "error");
    return;
  }
  const res = await ensureWalkInCustomer(nm, ph);
  if (res.id) o.customer_id = res.id;
  if (!res.ok) {
    notify(
      "Lưu khách thất bại (máy chủ không phản hồi). Kiểm tra API /customers.",
      "error",
    );
    return;
  }
  notify("Đã lưu khách vào danh sách khách hàng", "success");
}
export function checkoutPos() {
  const o = activePosOrder.value;
  if (o.cart.length === 0) {
    notify("Chưa có sản phẩm trong đơn", "error");
    return;
  }
  // Chuyển khoản: hiện mã QR 1 lần để khách quét, xác nhận "Đã thanh toán" rồi mới tạo đơn
  if (o.payment_method === "Chuyển khoản") {
    posPayModal.amount = posGrandTotal.value;
    posPayModal.qr =
      "https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=" +
      encodeURIComponent("SHOEGROUP " + o.code + " " + posGrandTotal.value);
    posPayModal.open = true;
    return;
  }
  finalizePosOrder();
}
async function finalizePosOrder() {
  const o = activePosOrder.value;
  if (o.cart.length === 0) {
    notify("Chưa có sản phẩm trong đơn", "error");
    return;
  }
  const payload = {
    customer_name: o.customer_name || "Khách lẻ",
    customer_phone: o.customer_phone || "",
    payment_method: o.payment_method,
    payment_status: "Đã thanh toán",
    status: "Đã giao hàng thành công",
    handled_by: getDisplayName.value || "Quầy",
    order_note: o.customer_note || "",
    coupon_code: o.coupon_code || null,
    discount_amount: posDiscountAmount.value,
    total: posGrandTotal.value,
    products: o.cart.map((c) => ({
      product_variant_id: c.variant_id,
      product_id: c.product_id,
      name: c.name,
      color: c.color,
      size: c.size,
      quantity: c.quantity,
      price: c.price,
    })),
  };
  let created = null;
  try {
    created = await api("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    created = null;
  }
  // Lưu khách vãng lai (không có tài khoản) vào danh sách khách hàng
  if (!o.customer_id && (o.customer_name || o.customer_phone)) {
    try {
      await ensureWalkInCustomer(o.customer_name, o.customer_phone);
    } catch (e) {}
  }
  // Hiển thị đơn NGAY trên trang Xác nhận thanh toán (tab Offline) kể cả khi
  // API danh sách chưa kịp cập nhật -> tránh tình trạng "tạo đơn xong không thấy đâu".
  const newId =
    (created && (created.OrderID || created.id || created.order_id)) ||
    "TMP-" + Date.now();
  const nowIso = new Date().toISOString();
  db.orders.unshift({
    id: newId,
    date: nowIso,
    total: posGrandTotal.value,
    status: "Đã giao hàng thành công",
    customer_name: payload.customer_name,
    customer_phone: payload.customer_phone,
    customer_address: "",
    cancel_reason: "",
    payment_status: "Đã thanh toán",
    payment_method: payload.payment_method,
    handled_by: getDisplayName.value || "Quầy",
    tracking_code: "",
    products: payload.products.map((p) => ({
      name: p.name,
      color: p.color,
      size: p.size,
      quantity: p.quantity,
      price: p.price,
      image: "",
    })),
    isExpanded: false,
    _history: [
      { status: "Đã giao hàng thành công", date: nowIso, note: "Bán tại quầy" },
    ],
  });
  notify("Tạo đơn thành công: " + formatPrice(posGrandTotal.value), "success");
  removePosOrder(posActiveIndex.value);
}

/* ---------------- PRODUCTS ---------------- */
export const productSearch = ref("");
export const filterCategory = ref("");
export const productFormOpen = ref(false);
export const filteredProducts = computed(() => {
  const q = productSearch.value.trim().toLowerCase();
  return db.products.filter(
    (p) =>
      (!q || (p.name || "").toLowerCase().includes(q)) &&
      (!filterCategory.value ||
        String(p.category_id) === String(filterCategory.value)),
  );
});
function emptyProduct() {
  return {
    id: null,
    name: "",
    description: "",
    category_id: "",
    brand_id: "",
    collection_id: "",
    material_id: "",
    price: 0,
    sale_price: 0,
    image_url: "",
    is_featured: false,
    active: true,
    default_stock: 0,
    colors: [],
    sizes: [],
    variants: [],
  };
}
export const productForm = reactive(emptyProduct());
export const colorDraft = ref("");
export const sizeDraft = ref("");
export const colorImageDraft = ref("");
export const colorNoteDraft = ref("");
// Size giay chuan cho giay the thao - CHI dung so, khong dung S/M/L/XL
export const SHOE_SIZES = [
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
];
// ---- Tong hop bien the tren FORM dang mo (tach theo bien the) ----
// So bien the = tong so (mau x size) da chon.
export const productFormVariantCount = computed(() =>
  (productForm.colors || []).reduce(
    (n, c) => n + (Array.isArray(c.variants) ? c.variants.length : 0),
    0,
  ),
);
// Tong san pham = tong so luong ton kho cua tat ca bien the.
export const productFormStockTotal = computed(() =>
  (productForm.colors || []).reduce(
    (sum, c) =>
      sum +
      (Array.isArray(c.variants)
        ? c.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0)
        : 0),
    0,
  ),
);
// So mau da chon.
export const productFormColorCount = computed(
  () => (productForm.colors || []).length,
);
// So luong ton kho cho RIENG 1 mau (dung hien thi tach theo mau).
export function colorStockTotal(c) {
  return Array.isArray(c && c.variants)
    ? c.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0)
    : 0;
}
export function openProductForm(p) {
  Object.assign(productForm, emptyProduct());
  if (p) {
    Object.assign(productForm, JSON.parse(JSON.stringify(p)));
    const loadedVariants = productForm.variants || [];
    productForm.colors = (productForm.colors || []).map((c) => ({
      id: c.id,
      name: c.name,
      hex: c.hex || colorHex(c.name),
      image: c.image || "",
      note: c.note || "",
      // Tai lai size + so luong (bien the) da luu cho tung mau
      variants: loadedVariants
        .filter((v) => String(v.color) === String(c.name))
        .map((v) => ({ size: String(v.size), stock: Number(v.stock) || 0 })),
    }));
    productForm.sizes =
      productForm.sizes && productForm.sizes.length
        ? productForm.sizes
        : Array.from(new Set(loadedVariants.map((v) => String(v.size))));
    const _stocks = loadedVariants
      .map((v) => Number(v.stock) || 0)
      .filter((n) => n > 0);
    productForm.default_stock = _stocks.length ? Math.max(..._stocks) : 0;
    productForm.variants = productForm.variants || [];
  }
  productFormOpen.value = true;
}
export function closeProductForm() {
  productFormOpen.value = false;
}
export function addColor() {
  const c = db.colors.find((x) => String(x.id) === String(colorDraft.value));
  if (!c) {
    notify("Vui lòng chọn màu", "error");
    return;
  }
  if (productForm.colors.some((x) => x.name === c.name)) {
    notify("Màu này đã được thêm", "error");
    return;
  }
  productForm.colors.push({
    id: c.id,
    name: c.name,
    hex: c.hex,
    image: colorImageDraft.value || "",
    note: (colorNoteDraft.value || "").trim(),
  });
  colorDraft.value = "";
  colorImageDraft.value = "";
  colorNoteDraft.value = "";
}

// Doc file anh tu thiet bi -> data URL (base64) de luu vao CSDL
function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function pickImageFile(e) {
  const file = e && e.target && e.target.files && e.target.files[0];
  if (!file) return null;
  if (!/^image\//.test(file.type)) {
    notify("Vui lòng chọn tệp ảnh hợp lệ", "error");
    return null;
  }
  if (file.size > 3 * 1024 * 1024) {
    notify("Ảnh quá lớn (tối đa 3MB)", "error");
    return null;
  }
  return file;
}
// Chon anh dai dien san pham tu may
export async function onProductImageFile(e) {
  const file = pickImageFile(e);
  if (!file) return;
  productForm.image_url = await readImageFile(file);
  notify("Đã tải ảnh sản phẩm từ thiết bị", "success");
}
// Chon anh cho tung mau tu may (doi mau -> doi anh o cua hang)
export async function onColorImageFile(e, index) {
  const file = pickImageFile(e);
  if (!file) return;
  productForm.colors[index].image = await readImageFile(file);
  notify("Đã tải ảnh cho màu " + productForm.colors[index].name, "success");
}
// Chon anh cho MAU MOI dang them o khung them mau
export async function onColorDraftImageFile(e) {
  const file = pickImageFile(e);
  if (!file) return;
  colorImageDraft.value = await readImageFile(file);
  notify("Đã tải ảnh cho màu mới", "success");
}
// Chon anh tu may cho form dung chung (vd: logo thuong hieu)
export async function onFormImageFile(e, key) {
  const file = pickImageFile(e);
  if (!file) return;
  formModal.data[key] = await readImageFile(file);
  notify("Đã tải ảnh từ thiết bị", "success");
}
export function removeColor(i) {
  productForm.colors.splice(i, 1);
}
// Chon/bo size cho RIENG tung mau + nhap so luong
export function toggleColorSize(colorIndex, size) {
  const c = productForm.colors[colorIndex];
  if (!c) return;
  if (!Array.isArray(c.variants)) c.variants = [];
  const s = String(size);
  const idx = c.variants.findIndex((v) => String(v.size) === s);
  if (idx >= 0) c.variants.splice(idx, 1);
  else c.variants.push({ size: s, stock: 0 });
}
export function colorHasSize(c, size) {
  return (
    !!c &&
    Array.isArray(c.variants) &&
    c.variants.some((v) => String(v.size) === String(size))
  );
}
export function addSize() {
  const s = db.sizes.find((x) => String(x.id) === String(sizeDraft.value));
  if (!s) return;
  if (!productForm.sizes.includes(s.name)) productForm.sizes.push(s.name);
  sizeDraft.value = "";
}
export function removeSize(i) {
  productForm.sizes.splice(i, 1);
}
// Chon/bo mot size - cho phep chon NHIEU size cung luc
export function toggleSize(size) {
  const s = String(size);
  const idx = productForm.sizes.findIndex((x) => String(x) === s);
  if (idx >= 0) productForm.sizes.splice(idx, 1);
  else productForm.sizes.push(s);
}
export function hasSize(size) {
  return productForm.sizes.some((x) => String(x) === String(size));
}
export function generateVariants() {
  const list = [];
  const colors = productForm.colors.length
    ? productForm.colors
    : [{ name: "Mặc định", hex: "#000000" }];
  const sizes = productForm.sizes.length ? productForm.sizes : ["FREE"];
  colors.forEach((c) =>
    sizes.forEach((s) => {
      const found = productForm.variants.find(
        (v) => v.color === c.name && v.size === s,
      );
      list.push(
        found || {
          color: c.name,
          hex: c.hex,
          size: s,
          sku:
            (productForm.name || "SP").slice(0, 4).toUpperCase() +
            "-" +
            c.name.slice(0, 2).toUpperCase() +
            "-" +
            s,
          stock: 0,
        },
      );
    }),
  );
  productForm.variants = list;
}
export function addVariant() {
  productForm.variants.push({ color: "", size: "", sku: "", stock: 0 });
}
export function colorHex(name) {
  const c = db.colors.find((x) => x.name === name);
  return c ? c.hex : "#cccccc";
}
export function getMaterialName(id) {
  const m = db.materials.find((x) => String(x.id) === String(id));
  return m ? m.name : "—";
}
export const collectionsOfBrand = computed(() =>
  productForm.brand_id
    ? db.collections.filter(
        (c) => String(c.brand_id) === String(productForm.brand_id),
      )
    : db.collections,
);
export async function saveProduct() {
  if (!productForm.name) {
    notify("Vui lòng nhập tên sản phẩm", "error");
    return;
  }
  if (Number(productForm.price) < 0) {
    notify("Giá bán không được nhỏ hơn 0", "error");
    return;
  }
  if (
    Number(productForm.sale_price) > 0 &&
    Number(productForm.sale_price) > Number(productForm.price)
  ) {
    notify("Giá khuyến mãi phải nhỏ hơn hoặc bằng giá bán", "error");
    return;
  }
  const isEdit = !!productForm.id;
  const payload = JSON.parse(JSON.stringify(productForm));
  const flatVariants = [];
  // Moi mau co danh sach size + so luong rieng (c.variants).
  // Lay dung so luong nguoi dung nhap cho tung bien the -> luu len CSDL.
  (productForm.colors || []).forEach((c) => {
    (c.variants || []).forEach((sv) => {
      let stock = Number(sv.stock) || 0;
      if (stock < 0) stock = 0;
      flatVariants.push({
        color: c.name,
        hex: colorHex(c.name),
        size: String(sv.size),
        sku:
          (productForm.name || "SP").slice(0, 4).toUpperCase() +
          "-" +
          (c.name || "").slice(0, 2).toUpperCase() +
          "-" +
          sv.size,
        stock,
      });
    });
  });
  payload.variants = flatVariants;
  payload.sizes = Array.from(new Set(flatVariants.map((v) => String(v.size))));
  const res = isEdit
    ? await apiWrite("/products/" + productForm.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    : await apiWrite("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  if (!res.ok) {
    notify(
      "Lưu sản phẩm thất bại (mã " +
        res.status +
        "). Kiểm tra kết nối máy chủ / cơ sở dữ liệu.",
      "error",
    );
    return;
  }
  notify(isEdit ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm mới", "success");
  productFormOpen.value = false;
  fetchAllData();
}

/* ---------------- INVENTORY ---------------- */
export const inventorySearch = ref("");
export const lowStockOnly = ref(false);
export const filteredInventory = computed(() => {
  const q = inventorySearch.value.trim().toLowerCase();
  return db.inventory.filter(
    (v) =>
      (!q ||
        (v.product_name || "").toLowerCase().includes(q) ||
        (v.sku || "").toLowerCase().includes(q)) &&
      (!lowStockOnly.value || Number(v.stock) <= LOW_STOCK_THRESHOLD),
  );
});
export async function updateStock(v) {
  // Giới hạn hợp lý: tồn kho là số nguyên, không âm, tối đa 100000
  let stock = Math.floor(Number(v.stock));
  if (isNaN(stock) || stock < 0) stock = 0;
  if (stock > 100000) stock = 100000;
  v.stock = stock;
  const res = await apiWrite("/inventory/" + v.id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stock }),
  });
  if (!res.ok) {
    notify(
      "Cập nhật tồn kho thất bại (mã " + res.status + ") cho " + v.sku,
      "error",
    );
    return;
  }
  notify("Đã cập nhật tồn kho: " + v.sku + " = " + stock, "success");
}

// ---- Modal chi tiết sản phẩm (hiển thị đầy đủ thuộc tính) ----
export const productDetailModal = reactive({ open: false, product: null });
export function openProductDetail(p) {
  productDetailModal.product = p;
  productDetailModal.open = true;
}
export function closeProductDetail() {
  productDetailModal.open = false;
  productDetailModal.product = null;
}
export function productVariants(productId) {
  return db.inventory.filter((v) => String(v.product_id) === String(productId));
}
export function productVariantCount(productId) {
  return db.inventory.filter((v) => String(v.product_id) === String(productId))
    .length;
}
export function productStockTotal(productId) {
  return productVariants(productId).reduce(
    (s, v) => s + (Number(v.stock) || 0),
    0,
  );
}
export function getCollectionName(id) {
  const c = db.collections.find((x) => String(x.id) === String(id));
  return c ? c.name : "—";
}

/* ---------------- CATALOG HELPERS ---------------- */
export const categorySearch = ref("");
export const filteredCategories = computed(() => db.categories);
// Chi cac danh muc dang hoat dong (an danh muc da tat nhu mu/non)
export const activeCategories = computed(() =>
  db.categories.filter((c) => c.active),
);
// Nhom danh muc theo bo mon the thao (dung cho trang Danh Muc Bo Mon)
export const categoriesBySport = computed(() => {
  const groups = {};
  db.categories.forEach((c) => {
    const key = c.sport || "Chưa phân loại";
    (groups[key] = groups[key] || []).push(c);
  });
  return Object.keys(groups).map((sport) => ({ sport, items: groups[sport] }));
});
export function getProductCount(catId) {
  return db.products.filter((p) => String(p.category_id) === String(catId))
    .length;
}
export const filteredBrands = computed(() => db.brands);
export function getBrandProductCount(id) {
  return db.products.filter((p) => String(p.brand_id) === String(id)).length;
}
export function getBrandName(id) {
  const b = db.brands.find((x) => String(x.id) === String(id));
  return b ? b.name : "—";
}
export const filteredCollections = computed(() => db.collections);
export const filteredColors = computed(() => db.colors);
export const filteredSizes = computed(() => db.sizes);
export const filteredMaterials = computed(() => db.materials);
export function getMaterialProductCount(id) {
  return db.products.filter((p) => String(p.material_id) === String(id)).length;
}
export const filteredSoles = computed(() => db.soles);
export function getSoleProductCount(id) {
  return db.products.filter((p) => String(p.sole_id) === String(id)).length;
}
export function getSoleName(id) {
  const s = db.soles.find((x) => String(x.id) === String(id));
  return s ? s.name : "—";
}
export const filteredCushionings = computed(() => db.cushionings);
export function getCushioningProductCount(id) {
  return db.products.filter((p) => String(p.cushioning_id) === String(id)).length;
}
export function getCushioningName(id) {
  const c = db.cushionings.find((x) => String(x.id) === String(id));
  return c ? c.name : "—";
}
export const filteredDiscounts = computed(() => db.discounts);
export function isExpired(date) {
  return date ? new Date(date) < new Date() : false;
}
export function getProductName(id) {
  const p = db.products.find((x) => String(x.id) === String(id));
  return p ? p.name : "—";
}

/* ================================================================
 * MÃ KHUYẾN MÃI (nâng cấp: loại giảm, giá trị, đơn tối thiểu,
 * giảm tối đa, số lượng, thời gian chạy, tìm kiếm + lọc trạng thái)
 * ================================================================ */
export const discountTypes = ["Phần trăm", "Cố định"];
export const discountStatuses = ["Tất cả", "Đang chạy", "Hết hạn", "Tạm dừng"];
export const discountSearch = ref("");
export const discountStatusFilter = ref("Tất cả");

export function getDiscountStatus(d) {
  if (!d.active)
    return { label: "Tạm dừng", cls: "bg-secondary-subtle text-secondary" };
  if (isExpired(d.expiry))
    return { label: "Hết hạn", cls: "bg-danger-subtle text-danger-emphasis" };
  return { label: "Đang chạy", cls: "badge-active" };
}
export function formatDiscountValue(d) {
  return d.discount_type === "Cố định"
    ? formatPrice(d.value)
    : (Number(d.value) || 0) + "%";
}
export const filteredDiscountsList = computed(() => {
  const q = discountSearch.value.trim().toLowerCase();
  return db.discounts.filter((d) => {
    const okQ =
      !q ||
      (d.code || "").toLowerCase().includes(q) ||
      (d.name || "").toLowerCase().includes(q);
    const okS =
      discountStatusFilter.value === "Tất cả" ||
      getDiscountStatus(d).label === discountStatusFilter.value;
    return okQ && okS;
  });
});
function emptyDiscount() {
  return {
    id: null,
    code: "",
    name: "",
    discount_type: "Phần trăm",
    value: 0,
    min_order: 0,
    max_discount: 0,
    quantity: 0,
    start_date: "",
    expiry: "",
    description: "",
    active: true,
  };
}
export const discountModal = reactive({ open: false, data: emptyDiscount() });
export function openDiscountForm(item) {
  Object.assign(discountModal.data, emptyDiscount());
  if (item) Object.assign(discountModal.data, JSON.parse(JSON.stringify(item)));
  discountModal.open = true;
}
export function closeDiscountForm() {
  discountModal.open = false;
}
export async function saveDiscount() {
  const d = discountModal.data;
  if (!d.code) {
    notify("Vui lòng nhập mã giảm giá", "error");
    return;
  }
  const val = Number(d.value) || 0;
  const payload = {
    CouponCode: d.code,
    CouponName: d.name,
    DiscountType: d.discount_type,
    DiscountValue: val,
    DiscountPercent: d.discount_type === "Phần trăm" ? val : 0,
    MinOrderAmount: Number(d.min_order) || 0,
    MaxDiscountAmount: Number(d.max_discount) || 0,
    UsageLimit: Number(d.quantity) || 0,
    StartDate: d.start_date || null,
    ExpiryDate: d.expiry || null,
    Description: d.description || "",
    IsActive: !!d.active,
  };
  const isEdit = !!d.id;
  const res = await apiWrite(isEdit ? "/discounts/" + d.id : "/discounts", {
    method: isEdit ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    notify(
      "Lưu mã giảm giá thất bại (máy chủ " +
        (res.status || "không phản hồi") +
        "). Kiểm tra API /discounts.",
      "error",
    );
    return;
  }
  discountModal.open = false;
  notify(isEdit ? "Đã cập nhật mã giảm giá" : "Đã thêm mã giảm giá", "success");
  fetchAllData();
}

/* ================================================================
 * GIẢM GIÁ BIẾN THỂ MÀU (nâng cấp: chọn biến thể màu, loại giảm,
 * giá trị, tối đa, số lượng/đã dùng, thời gian, lý do, kích hoạt)
 * ================================================================ */
export const variantDiscountTypes = ["Theo phần trăm", "Cố định"];
export const variantReasons = [
  "Bán chậm",
  "Theo mùa",
  "Thanh lý",
  "Xả kho hàng tồn",
  "Khác",
];
export const variantDiscountSearch = ref("");
export const variantStatusFilter = ref("Tất cả");
export const variantReasonFilter = ref("Tất cả");

function productImage(pid) {
  const p = db.products.find((x) => String(x.id) === String(pid));
  return p ? p.image_url || "" : "";
}

// Danh sách biến thể màu để chọn (gộp các size cùng 1 sản phẩm + màu)
export const variantColorOptions = computed(() => {
  const map = {};
  db.inventory.forEach((v) => {
    const key = v.product_id + "|" + (v.color || "");
    if (!map[key]) {
      map[key] = {
        variant_id: v.id,
        product_id: v.product_id,
        product_name: v.product_name || getProductName(v.product_id),
        color: v.color || "Mặc định",
        color_hex: v.color_hex || "#d1d5db",
        sku: v.sku || "",
        stock: 0,
      };
    }
    map[key].stock += Number(v.stock) || 0;
  });
  return Object.values(map);
});

export function getVariantInfo(vd) {
  const byId = db.inventory.find((v) => String(v.id) === String(vd.variant_id));
  if (byId)
    return {
      product_name: byId.product_name || getProductName(byId.product_id),
      color: byId.color || "Mặc định",
      color_hex: byId.color_hex || "#d1d5db",
      sku: byId.sku || "",
      image: productImage(byId.product_id),
    };
  return {
    product_name: getProductName(vd.product_id),
    color: vd.color || "Mặc định",
    color_hex: vd.color_hex || "#d1d5db",
    sku: "",
    image: productImage(vd.product_id),
  };
}
export function formatVariantDiscountValue(vd) {
  if (vd.discount_type === "Cố định") return formatPrice(vd.value);
  let s = (Number(vd.value) || 0) + "%";
  if (Number(vd.max_discount) > 0)
    s += " · Tối đa " + formatPrice(vd.max_discount);
  return s;
}
export function getVariantDiscountStatus(vd) {
  if (!vd.active)
    return { label: "Tạm dừng", cls: "bg-secondary-subtle text-secondary" };
  if (isExpired(vd.end_date))
    return { label: "Hết hạn", cls: "bg-danger-subtle text-danger-emphasis" };
  return { label: "Hoạt động", cls: "badge-active" };
}
export function variantAlreadyDiscounted(variantId) {
  if (!variantId) return false;
  return db.variantDiscounts.some(
    (v) =>
      String(v.variant_id) === String(variantId) &&
      v.active &&
      !isExpired(v.end_date),
  );
}
export const filteredVariantDiscounts = computed(() => {
  const q = variantDiscountSearch.value.trim().toLowerCase();
  return db.variantDiscounts.filter((vd) => {
    const info = getVariantInfo(vd);
    const okQ =
      !q ||
      (info.product_name || "").toLowerCase().includes(q) ||
      (info.color || "").toLowerCase().includes(q);
    const okS =
      variantStatusFilter.value === "Tất cả" ||
      getVariantDiscountStatus(vd).label === variantStatusFilter.value;
    const okR =
      variantReasonFilter.value === "Tất cả" ||
      (vd.reason || "") === variantReasonFilter.value;
    return okQ && okS && okR;
  });
});
function emptyVariantDiscount() {
  return {
    id: null,
    variant_id: "",
    product_id: "",
    color: "",
    color_hex: "",
    discount_type: "Theo phần trăm",
    value: 0,
    max_discount: 0,
    quantity: 0,
    used: 0,
    start_date: "",
    end_date: "",
    reason: "Bán chậm",
    active: true,
    description: "",
  };
}
export const variantDiscountModal = reactive({
  open: false,
  data: emptyVariantDiscount(),
});
export function openVariantDiscountForm(item) {
  Object.assign(variantDiscountModal.data, emptyVariantDiscount());
  if (item)
    Object.assign(variantDiscountModal.data, JSON.parse(JSON.stringify(item)));
  variantDiscountModal.open = true;
}
export function closeVariantDiscountForm() {
  variantDiscountModal.open = false;
}
export async function saveVariantDiscount() {
  const d = variantDiscountModal.data;
  if (!d.variant_id) {
    notify("Vui lòng chọn biến thể màu sản phẩm", "error");
    return;
  }
  if (!d.value) {
    notify("Vui lòng nhập giá trị giảm", "error");
    return;
  }
  const info = variantColorOptions.value.find(
    (o) => String(o.variant_id) === String(d.variant_id),
  );
  const val = Number(d.value) || 0;
  const payload = {
    ProductVariantID: d.variant_id,
    ProductID: info ? info.product_id : d.product_id,
    ColorName: info ? info.color : d.color,
    ColorHex: info ? info.color_hex : d.color_hex,
    DiscountType: d.discount_type,
    DiscountValue: val,
    DiscountPercent: d.discount_type === "Theo phần trăm" ? val : 0,
    MaxDiscountAmount: Number(d.max_discount) || 0,
    Quantity: Number(d.quantity) || 0,
    StartDate: d.start_date || null,
    EndDate: d.end_date || null,
    Reason: d.reason || "",
    IsActive: !!d.active,
    Description: d.description || "",
  };
  const isEdit = !!d.id;
  if (isEdit)
    await api("/variantDiscounts/" + d.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  else
    await api("/variantDiscounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  variantDiscountModal.open = false;
  notify(
    isEdit ? "Đã cập nhật giảm giá biến thể" : "Đã thêm giảm giá biến thể",
    "success",
  );
  fetchAllData();
}

/* ---------------- CUSTOMERS (CRM) ---------------- */
export const customerSearch = ref("");
export const filteredCustomers = computed(() => {
  const q = customerSearch.value.trim().toLowerCase();
  return db.customers.filter(
    (c) =>
      !q ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q),
  );
});
export function getRank(spent) {
  const v = Number(spent) || 0;
  if (v >= 20000000)
    return { label: "Kim Cương", class: "bg-info-subtle text-info-emphasis" };
  if (v >= 10000000)
    return { label: "Vàng", class: "bg-warning-subtle text-warning-emphasis" };
  if (v >= 3000000)
    return { label: "Bạc", class: "bg-secondary-subtle text-secondary" };
  return { label: "Mới", class: "bg-light text-secondary border" };
}
export const customerModal = reactive({
  open: false,
  customer: null,
  orders: [],
});
export async function viewCustomerDetails(cus) {
  customerModal.customer = cus;
  customerModal.orders = db.orders.filter(
    (o) =>
      (o.customer_phone && o.customer_phone === cus.phone) ||
      (o.customer_name && o.customer_name === cus.name),
  );
  customerModal.open = true;
  const remote = await api("/customers/" + cus.id + "/orders");
  if (Array.isArray(remote) && remote.length)
    customerModal.orders = remote.map(mapOrder);
}
export function closeCustomerDetails() {
  customerModal.open = false;
}

/* ---------------- STAFF REPORT ---------------- */
export const staffStats = computed(() => {
  const map = {};
  db.orders.forEach((o) => {
    const who = o.handled_by;
    if (!who) return;
    map[who] = map[who] || { name: who, total: 0, done: 0, revenue: 0 };
    map[who].total++;
    if (o.status === "Đã giao hàng thành công") {
      map[who].done++;
      map[who].revenue += Number(o.total) || 0;
    }
  });
  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
});

/* ---------------- ACCOUNTS ---------------- */
export const accountSearch = ref("");
export const filteredAccounts = computed(() => {
  const q = accountSearch.value.trim().toLowerCase();
  return db.accounts.filter(
    (a) =>
      !q ||
      (a.username || "").toLowerCase().includes(q) ||
      (a.name || "").toLowerCase().includes(q) ||
      (a.email || "").toLowerCase().includes(q),
  );
});
export function roleName(roleId) {
  return { 1: "Quản trị viên", 2: "Khách hàng" }[roleId] || "Khác";
}
export function getRoleBadgeClass(roleId) {
  return (
    {
      1: "bg-dark text-white",
      2: "bg-secondary-subtle text-secondary",
      3: "bg-info-subtle text-info-emphasis",
    }[roleId] || "bg-light text-secondary"
  );
}

/* ---------------- GENERIC CRUD FORM ---------------- */
// Danh sach bo mon the thao (dung cho danh muc)
export const SPORTS = [
  "Chạy Bộ",
  "Bóng Rổ",
  "Bóng Đá",
  "Tennis",
  "Thời Trang",
  "Tập Luyện",
];

const fieldDefs = {
  categories: [
    { key: "name", label: "Tên danh mục" },
    { key: "sport", label: "Bộ môn thể thao", type: "select" },
    { key: "active", label: "Hoạt động", type: "checkbox" },
  ],
  brands: [
    { key: "name", label: "Tên thương hiệu" },
    {
      key: "logo_url",
      label: "Logo (URL hoặc chọn ảnh trên máy)",
      type: "image",
    },
    { key: "sort_order", label: "Thứ tự", type: "number" },
    { key: "active", label: "Hoạt động", type: "checkbox" },
  ],
  collections: [
    { key: "name", label: "Tên bộ sưu tập" },
    { key: "brand_id", label: "Thương hiệu", type: "select" },
    { key: "slug", label: "Slug" },
    { key: "active", label: "Hoạt động", type: "checkbox" },
  ],
  materials: [
    { key: "name", label: "Tên chất liệu" },
    { key: "active", label: "Hoạt động", type: "checkbox" },
  ],
  soles: [
    { key: "name", label: "Tên đế giày" },
    { key: "active", label: "Hoạt động", type: "checkbox" },
  ],
  cushionings: [
    { key: "name", label: "Tên đệm giày" },
    { key: "active", label: "Hoạt động", type: "checkbox" },
  ],
  colors: [
    { key: "name", label: "Tên màu" },
    { key: "hex", label: "Mã màu", type: "color" },
    { key: "sort_order", label: "Thứ tự", type: "number" },
    { key: "active", label: "Hoạt động", type: "checkbox" },
  ],
  sizes: [
    { key: "name", label: "Tên size (VD: 40)" },
    { key: "standard", label: "Chuẩn (EU/US/UK)" },
    { key: "sort_order", label: "Thứ tự", type: "number" },
    { key: "active", label: "Hoạt động", type: "checkbox" },
  ],
  discounts: [
    { key: "code", label: "Mã giảm giá" },
    { key: "percent", label: "Phần trăm (%)", type: "number" },
    { key: "limit", label: "Giới hạn lượt", type: "number" },
    { key: "expiry", label: "Ngày hết hạn", type: "date" },
    { key: "description", label: "Mô tả", type: "textarea" },
    { key: "active", label: "Hoạt động", type: "checkbox" },
  ],
  accounts: [
    { key: "username", label: "Email đăng nhập", type: "email" },
    { key: "name", label: "Họ tên" },
    { key: "role_id", label: "Phân quyền", type: "select" },
    {
      key: "password",
      label: "Mật khẩu (để trống nếu không đổi)",
      type: "password",
    },
    { key: "active", label: "Hoạt động", type: "checkbox" },
  ],
};
export const formModal = reactive({
  open: false,
  type: "",
  title: "",
  data: {},
});
export const formFields = computed(() => {
  const defs = fieldDefs[formModal.type] || [];
  return defs.map((f) => {
    if (f.key === "brand_id")
      return {
        ...f,
        options: db.brands.map((b) => ({ value: b.id, label: b.name })),
      };
    if (f.key === "sport")
      return {
        ...f,
        options: SPORTS.map((s) => ({ value: s, label: s })),
      };
    if (f.key === "role_id")
      return {
        ...f,
        disabled: !!formModal.data.id,
        options: [
          { value: 1, label: "Quản trị viên" },
          { value: 3, label: "Nhân viên" },
          { value: 2, label: "Khách hàng" },
        ],
      };
    return f;
  });
});
const formTitles = {
  categories: "Danh Mục",
  brands: "Thương Hiệu",
  collections: "Bộ Sưu Tập",
  materials: "Chất Liệu",
  soles: "Đế Giày",
  cushionings: "Đệm Giày",
  colors: "Màu Sắc",
  sizes: "Kích Thước",
  discounts: "Mã Giảm Giá",
  accounts: "Tài Khoản",
};
export function openForm(type, item) {
  formModal.type = type;
  formModal.title = (item ? "Chỉnh Sửa " : "Thêm ") + (formTitles[type] || "");
  const base = {};
  (fieldDefs[type] || []).forEach((f) => {
    base[f.key] = f.type === "checkbox" ? true : "";
  });
  if (type === "accounts" && !item) base.role_id = 3;
  formModal.data = item
    ? { ...base, ...JSON.parse(JSON.stringify(item)) }
    : base;
  formModal.open = true;
}
export async function saveForm() {
  const type = formModal.type;
  const data = formModal.data;
  if (!data.name) {
    notify("Vui lòng nhập tên", "error");
    return;
  }
  if (type === "accounts") {
    if (!data.username) {
      notify("Vui lòng nhập email đăng nhập", "error");
      return;
    }
    if (!data.id && !(data.password && String(data.password).trim())) {
      notify("Vui lòng nhập mật khẩu cho tài khoản mới", "error");
      return;
    }
  }
  const isEdit = !!data.id;
  const res = isEdit
    ? await apiWrite("/" + type + "/" + data.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    : await apiWrite("/" + type, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
  if (!res.ok) {
    notify(
      "Lưu thất bại (mã " +
        res.status +
        "). Kiểm tra kết nối máy chủ / cơ sở dữ liệu.",
      "error",
    );
    return;
  }
  formModal.open = false;
  notify(
    isEdit ? "Đã cập nhật thành công" : "Đã thêm mới thành công",
    "success",
  );
  fetchAllData();
}

/* ---------------- DELETE CONFIRM ---------------- */
export const confirmModal = reactive({
  open: false,
  title: "",
  message: "",
  type: "",
  id: null,
  mode: "generic", // 'generic' | 'soft' | 'hard'
  danger: false,
  confirmLabel: "Xac nhan",
});
export function deleteItem(type, id, name) {
  confirmModal.type = type;
  confirmModal.id = id;
  confirmModal.mode = "generic";
  confirmModal.danger = false;
  confirmModal.confirmLabel = "Xác nhận";
  confirmModal.title = "Xác nhận xoá";
  confirmModal.message =
    'Bạn có chắc muốn xoá "' +
    (name || "#" + id) +
    '"? Hành động này không thể hoàn tác.';
  confirmModal.open = true;
}

// Kiem tra san pham dang o trang thai xoa mem (da an)
export function isProductSoftDeleted(p) {
  return !!(p && p.active === false);
}

// Nut xoa tren trang san pham: lan 1 = xoa mem (an), lan 2 (khi da an) = xoa cung
export function deleteProduct(p) {
  confirmModal.type = "products";
  confirmModal.id = p.id;
  if (isProductSoftDeleted(p)) {
    confirmModal.mode = "hard";
    confirmModal.danger = true;
    confirmModal.confirmLabel = "Xoá cứng";
    confirmModal.title = "Xoá cứng sản phẩm?";
    confirmModal.message =
      'Bạn sắp XOÁ CỨNG "' +
      (p.name || "#" + p.id) +
      '" khỏi cơ sở dữ liệu. Toàn bộ biến thể, ảnh và chi tiết đơn hàng liên quan sẽ bị xoá vĩnh viễn và KHÔNG THỂ khôi phục. Việc này có thể ẢNH HƯỞ-NG ĐẾN DOANH THU đã ghi nhận.';
  } else {
    confirmModal.mode = "soft";
    confirmModal.danger = false;
    confirmModal.confirmLabel = "Xoá mềm (ẩn)";
    confirmModal.title = "Xoá mềm sản phẩm?";
    confirmModal.message =
      'Ẩn "' +
      (p.name || "#" + p.id) +
      '" khỏi cửa hàng (xoá mềm). Dữ liệu vẫn được giữ lại. Bấm xoá lần nữa khi sản phẩm đã ẩn để xoá cứng.';
  }
  confirmModal.open = true;
}
export async function executeConfirm() {
  const suffix =
    confirmModal.type === "products" && confirmModal.mode === "soft"
      ? "?soft=1"
      : "";
  const res = await apiWrite(
    "/" + confirmModal.type + "/" + confirmModal.id + suffix,
    { method: "DELETE" },
  );
  if (!res.ok) {
    notify(
      "Xoá thất bại (máy chủ " +
        (res.status || "không phản hồi") +
        "). Kiểm tra API /" +
        confirmModal.type +
        ".",
      "error",
    );
    return;
  }
  const doneMode = confirmModal.mode;
  confirmModal.open = false;
  notify(
    doneMode === "soft"
      ? "Đã xoá mềm (ẩn) sản phẩm"
      : doneMode === "hard"
        ? "Đã xoá cứng sản phẩm khỏi CSDL"
        : "Đã xoá thành công",
    "success",
  );
  fetchAllData();
}

/* ---------------- DATA LOADING ---------------- */
export function mapOrder(o) {
  return {
    id: o.OrderID ?? o.id,
    date: o.OrderDate ?? o.date,
    total: o.TotalAmount ?? o.total ?? 0,
    status: o.Status ?? o.status ?? "Chờ xác nhận",
    customer_name: o.CustomerName ?? o.customer_name ?? "Khách lẻ",
    customer_phone: o.CustomerPhone ?? o.customer_phone ?? "",
    customer_address: o.ShippingAddress ?? o.customer_address ?? "",
    cancel_reason: o.CancelReason ?? o.cancel_reason ?? "",
    payment_status: o.PaymentStatus ?? o.payment_status ?? "Chưa thanh toán",
    payment_method: o.PaymentMethod ?? o.payment_method ?? "COD",
    handled_by: o.HandledBy ?? o.handled_by ?? "",
    tracking_code: o.TrackingNumber ?? o.tracking_code ?? "",
    products: (o.products || o.OrderDetails || []).map((d) => ({
      name: d.ProductName ?? d.name ?? "",
      color: d.ColorName ?? d.color ?? "",
      size: d.Size ?? d.size ?? "",
      quantity: d.Quantity ?? d.quantity ?? 1,
      price: d.UnitPrice ?? d.price ?? 0,
      image: d.ImageURL ?? d.image ?? "",
    })),
    isExpanded: false,
    _history: (o.history || o.OrderStatusHistory || []).map((h) => ({
      status: h.Status ?? h.status,
      date: h.ChangedAt ?? h.date,
      note: h.Note ?? h.note,
    })),
  };
}
export async function fetchAllData() {
  isLoading.value = true;
  const [
    orders,
    products,
    categories,
    discounts,
    customers,
    accounts,
    brands,
    collections,
    inventory,
    returns,
    variantDiscounts,
    colors,
    sizes,
    materials,
    soles,
    cushionings,
  ] = await Promise.all([
    api("/orders"),
    api("/products"),
    api("/categories"),
    api("/discounts"),
    api("/customers"),
    api("/accounts"),
    api("/brands"),
    api("/collections"),
    api("/inventory"),
    api("/returns"),
    api("/variantDiscounts"),
    api("/colors"),
    api("/sizes"),
    api("/materials"),
    api("/soles"),
    api("/cushionings"),
  ]);
  db.orders = (orders || []).map(mapOrder);
  db.products = (products || []).map((p) => ({
    id: p.ProductID ?? p.id,
    name: p.ProductName ?? p.name,
    price: p.BasePrice ?? p.price ?? 0,
    sale_price: p.SalePrice ?? p.sale_price ?? 0,
    category_id: p.CategoryID ?? p.category_id,
    category: p.CategoryName ?? p.category ?? "",
    brand_id: p.BrandID ?? p.brand_id,
    brand: p.BrandName ?? p.brand ?? "",
    collection_id: p.CollectionID ?? p.collection_id,
    material_id: p.MaterialID ?? p.material_id ?? null,
    sole_id: p.SoleID ?? p.sole_id ?? null,
    cushioning_id: p.CushioningID ?? p.cushioning_id ?? null,
    image_url: p.ImageURL ?? p.image_url ?? "",
    description: p.Description ?? p.description ?? "",
    parent_sku: p.ParentSKU ?? p.parent_sku ?? "",
    is_featured: p.IsFeatured ?? p.is_featured ?? false,
    active: (p.IsActive ?? p.active) !== false,
    colors: p.colors || [],
    sizes: p.sizes || [],
    variants: p.variants || [],
  }));
  db.categories = (categories || []).map((c) => ({
    id: c.CategoryID ?? c.id,
    name: c.CategoryName ?? c.name,
    sport: c.Sport ?? c.sport ?? "",
    active: (c.IsActive ?? c.active) !== false,
  }));
  db.discounts = (discounts || []).map((d) => ({
    id: d.CouponID ?? d.id,
    code: d.CouponCode ?? d.code,
    name: d.CouponName ?? d.name ?? "",
    discount_type: d.DiscountType ?? d.discount_type ?? "Phần trăm",
    value: d.DiscountValue ?? d.value ?? d.DiscountPercent ?? d.percent ?? 0,
    percent: d.DiscountPercent ?? d.percent ?? 0,
    min_order: d.MinOrderAmount ?? d.min_order ?? 0,
    max_discount: d.MaxDiscountAmount ?? d.max_discount ?? 0,
    quantity: d.UsageLimit ?? d.quantity ?? d.limit ?? 0,
    limit: d.UsageLimit ?? d.limit,
    used: d.UsedCount ?? d.used ?? 0,
    start_date: d.StartDate ?? d.start_date ?? null,
    expiry: d.ExpiryDate ?? d.expiry ?? null,
    description: d.Description ?? d.description ?? "",
    active: (d.IsActive ?? d.active) !== false,
  }));
  db.customers = (customers || []).map((c) => ({
    id: c.UserID ?? c.id,
    name: c.FullName ?? c.name,
    phone: c.Phone ?? c.phone ?? "",
    email: c.Email ?? c.email ?? "",
    address: c.Address ?? c.address ?? "",
    spent: c.TotalSpent ?? c.spent ?? 0,
    order_count: c.OrderCount ?? c.order_count ?? 0,
    created_at: c.CreatedAt ?? c.created_at ?? null,
    source: c.Source ?? c.source ?? "",
  }));
  db.accounts = (accounts || []).map((a) => ({
    id: a.UserID ?? a.id,
    username:
      a.Username ?? a.username ?? (a.Email ?? a.email ?? "").split("@")[0],
    name: a.FullName ?? a.name ?? "",
    email: a.Email ?? a.email ?? "",
    role_id: a.RoleID ?? a.role_id ?? 1,
    active: (a.IsActive ?? a.active) !== false,
  }));
  db.brands = (brands || []).map((b) => ({
    id: b.BrandID ?? b.id,
    name: b.BrandName ?? b.name,
    logo_url: b.LogoURL ?? b.logo_url ?? "",
    sort_order: b.SortOrder ?? b.sort_order ?? 0,
    active: (b.IsActive ?? b.active) !== false,
  }));
  db.collections = (collections || []).map((c) => ({
    id: c.CollectionID ?? c.id,
    name: c.CollectionName ?? c.name,
    brand_id: c.BrandID ?? c.brand_id,
    slug: c.Slug ?? c.slug ?? "",
    active: (c.IsActive ?? c.active) !== false,
  }));
  db.inventory = (inventory || []).map((v) => ({
    id: v.ProductVariantID ?? v.id,
    product_id: v.ProductID ?? v.product_id,
    product_name: v.ProductName ?? v.product_name ?? "",
    size: v.Size ?? v.size ?? "",
    color: v.ColorName ?? v.color ?? "",
    color_hex: v.ColorHex ?? v.color_hex ?? "",
    sku: v.ChildSKU ?? v.sku ?? "",
    stock: v.StockQuantity ?? v.stock ?? 0,
    price_adjustment: v.PriceAdjustment ?? v.price_adjustment ?? 0,
  }));
  db.returns = (returns || []).map((r) => ({
    id: r.ReturnID ?? r.id,
    order_id: r.OrderID ?? r.order_id,
    return_type: r.ReturnType ?? r.return_type ?? "Trả hàng",
    reason: r.Reason ?? r.reason ?? "",
    refund_amount: r.RefundAmount ?? r.refund_amount ?? 0,
    status: r.Status ?? r.status ?? "Chờ xử lý",
  }));
  db.variantDiscounts = (variantDiscounts || []).map((v) => ({
    id: v.VariantDiscountID ?? v.id,
    variant_id: v.ProductVariantID ?? v.variant_id ?? v.product_variant_id,
    product_id: v.ProductID ?? v.product_id,
    color: v.ColorName ?? v.color ?? "",
    color_hex: v.ColorHex ?? v.color_hex ?? "",
    discount_type: v.DiscountType ?? v.discount_type ?? "Theo phần trăm",
    value: v.DiscountValue ?? v.value ?? v.percent ?? v.DiscountPercent ?? 0,
    percent: v.DiscountPercent ?? v.percent ?? 0,
    max_discount: v.MaxDiscountAmount ?? v.max_discount ?? 0,
    quantity: v.Quantity ?? v.quantity ?? 0,
    used: v.UsedCount ?? v.used ?? 0,
    start_date: v.StartDate ?? v.start_date ?? null,
    end_date: v.EndDate ?? v.end_date ?? null,
    reason: v.Reason ?? v.reason ?? "",
    active: (v.IsActive ?? v.active) !== false,
    description: v.Description ?? v.description ?? "",
  }));
  db.colors = (colors || []).map((c) => ({
    id: c.ColorID ?? c.id,
    name: c.ColorName ?? c.name,
    hex: c.ColorHex ?? c.hex ?? "#000000",
    sort_order: c.SortOrder ?? c.sort_order ?? 0,
    active: (c.IsActive ?? c.active) !== false,
  }));
  db.sizes = (sizes || []).map((s) => ({
    id: s.SizeID ?? s.id,
    name: s.SizeName ?? s.name,
    standard: s.SizeStandard ?? s.standard ?? "",
    sort_order: s.SortOrder ?? s.sort_order ?? 0,
    active: (s.IsActive ?? s.active) !== false,
  }));
  db.materials = (materials || []).map((m) => ({
    id: m.MaterialID ?? m.id,
    name: m.MaterialName ?? m.name,
    active: (m.IsActive ?? m.active) !== false,
  }));
  db.soles = (soles || []).map((s) => ({
    id: s.SoleID ?? s.id,
    name: s.SoleName ?? s.name,
    active: (s.IsActive ?? s.active) !== false,
  }));
  db.cushionings = (cushionings || []).map((c) => ({
    id: c.CushioningID ?? c.id,
    name: c.CushioningName ?? c.name,
    active: (c.IsActive ?? c.active) !== false,
  }));
  // Đánh giá sản phẩm (tùy chọn) — nạp riêng để không ảnh hưởng nếu API chưa có
  const reviews = await api("/reviews");
  db.reviews = (reviews || []).map((r) => ({
    rating: Number(r.Rating ?? r.rating ?? r.stars ?? r.Score ?? 0),
    product_id: r.ProductID ?? r.product_id,
    product_name: r.ProductName ?? r.product_name ?? "",
  }));
  isLoading.value = false;
}
