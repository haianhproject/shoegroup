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
export const statRevenue = computed(() =>
  ordersInRange.value
    .filter((o) => o.status !== "Đã hủy")
    .reduce((s, o) => s + (Number(o.total) || 0), 0),
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
      "Đã duyệt": "bg-info-subtle text-info-emphasis",
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

/* ---------------- POS ---------------- */
export const posSearch = ref("");
export const posCart = ref([]);
export const posCustomer = ref("");
export const posPayment = ref("Tiền mặt");
export const posProducts = computed(() => {
  const q = posSearch.value.trim().toLowerCase();
  return db.products.filter(
    (p) =>
      p.active !== false && (!q || (p.name || "").toLowerCase().includes(q)),
  );
});
export function addToCart(p) {
  const existing = posCart.value.find((c) => c.id === p.id);
  if (existing) existing.quantity++;
  else
    posCart.value.push({
      id: p.id,
      name: p.name,
      price: p.sale_price || p.price,
      quantity: 1,
    });
}
export const posTotal = computed(() =>
  posCart.value.reduce(
    (s, c) => s + (Number(c.price) || 0) * (Number(c.quantity) || 0),
    0,
  ),
);
export async function checkoutPos() {
  if (posCart.value.length === 0) return;
  const payload = {
    customer_name: posCustomer.value || "Khách lẻ",
    payment_method: posPayment.value,
    payment_status: "Đã thanh toán",
    status: "Đã giao hàng thành công",
    total: posTotal.value,
    products: posCart.value.map((c) => ({
      name: c.name,
      quantity: c.quantity,
      price: c.price,
    })),
  };
  await api("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  notify("Thanh toán thành công: " + formatPrice(posTotal.value), "success");
  posCart.value = [];
  posCustomer.value = "";
  fetchAllData();
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
    upper_material: "",
    price: 0,
    sale_price: 0,
    image_url: "",
    is_featured: false,
    active: true,
    colors: [],
    sizes: [],
    variants: [],
  };
}
export const productForm = reactive(emptyProduct());
export const colorDraft = reactive({ name: "", hex: "#000000" });
export const sizeDraft = ref("");
export function openProductForm(p) {
  Object.assign(productForm, emptyProduct());
  if (p) {
    Object.assign(productForm, JSON.parse(JSON.stringify(p)));
    productForm.colors = productForm.colors || [];
    productForm.sizes = productForm.sizes || [];
    productForm.variants = productForm.variants || [];
  }
  productFormOpen.value = true;
}
export function closeProductForm() {
  productFormOpen.value = false;
}
export function addColor() {
  if (!colorDraft.name) return;
  productForm.colors.push({ name: colorDraft.name, hex: colorDraft.hex });
  colorDraft.name = "";
  colorDraft.hex = "#000000";
}
export function removeColor(i) {
  productForm.colors.splice(i, 1);
}
export function addSize() {
  const raw = sizeDraft.value.trim();
  if (!raw) return;
  raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((s) => {
      if (!productForm.sizes.includes(s)) productForm.sizes.push(s);
    });
  sizeDraft.value = "";
}
export function removeSize(i) {
  productForm.sizes.splice(i, 1);
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
  const isEdit = !!productForm.id;
  const payload = JSON.parse(JSON.stringify(productForm));
  if (isEdit)
    await api("/products/" + productForm.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  else
    await api("/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
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
  await api("/inventory/" + v.id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stock: v.stock }),
  });
  notify("Đã cập nhật tồn kho: " + v.sku, "success");
}

/* ---------------- CATALOG HELPERS ---------------- */
export const categorySearch = ref("");
export const filteredCategories = computed(() => db.categories);
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
export const filteredDiscounts = computed(() => db.discounts);
export function isExpired(date) {
  return date ? new Date(date) < new Date() : false;
}
export function getProductName(id) {
  const p = db.products.find((x) => String(x.id) === String(id));
  return p ? p.name : "—";
}

/* ---------------- VARIANT DISCOUNTS ---------------- */
export const variantDiscountDraft = reactive({
  product_id: "",
  color: "",
  percent: 0,
});
export const colorsOfProduct = computed(() => {
  if (!variantDiscountDraft.product_id) return [];
  return [
    ...new Set(
      db.inventory
        .filter(
          (v) =>
            String(v.product_id) === String(variantDiscountDraft.product_id),
        )
        .map((v) => v.color)
        .filter(Boolean),
    ),
  ];
});
export async function saveVariantDiscount() {
  if (!variantDiscountDraft.product_id || !variantDiscountDraft.percent) {
    notify("Chọn sản phẩm và nhập % giảm", "error");
    return;
  }
  await api("/variantDiscounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...variantDiscountDraft }),
  });
  notify("Đã lưu giảm giá biến thể", "success");
  variantDiscountDraft.product_id = "";
  variantDiscountDraft.color = "";
  variantDiscountDraft.percent = 0;
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
  return (
    { 1: "Quản trị viên", 2: "Khách hàng", 3: "Nhân viên" }[roleId] || "Khác"
  );
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
const fieldDefs = {
  categories: [
    { key: "name", label: "Tên danh mục" },
    { key: "active", label: "Hoạt động", type: "checkbox" },
  ],
  brands: [
    { key: "name", label: "Tên thương hiệu" },
    { key: "logo_url", label: "URL logo" },
    { key: "sort_order", label: "Thứ tự", type: "number" },
    { key: "active", label: "Hoạt động", type: "checkbox" },
  ],
  collections: [
    { key: "name", label: "Tên bộ sưu tập" },
    { key: "brand_id", label: "Thương hiệu", type: "select" },
    { key: "slug", label: "Slug" },
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
    { key: "username", label: "Tên đăng nhập" },
    { key: "name", label: "Họ tên" },
    { key: "email", label: "Email", type: "email" },
    { key: "role_id", label: "Vai trò", type: "select" },
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
    if (f.key === "role_id")
      return {
        ...f,
        options: [
          { value: 1, label: "Quản trị viên" },
          { value: 2, label: "Khách hàng" },
          { value: 3, label: "Nhân viên" },
        ],
      };
    return f;
  });
});
const formTitles = {
  categories: "Danh Mục",
  brands: "Thương Hiệu",
  collections: "Bộ Sưu Tập",
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
  formModal.data = item
    ? { ...base, ...JSON.parse(JSON.stringify(item)) }
    : base;
  formModal.open = true;
}
export async function saveForm() {
  const type = formModal.type;
  const data = formModal.data;
  const isEdit = !!data.id;
  if (isEdit)
    await api("/" + type + "/" + data.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  else
    await api("/" + type, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
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
});
export function deleteItem(type, id, name) {
  confirmModal.type = type;
  confirmModal.id = id;
  confirmModal.title = "Xác nhận xoá";
  confirmModal.message =
    'Bạn có chắc muốn xoá "' +
    (name || "#" + id) +
    '"? Hành động này không thể hoàn tác.';
  confirmModal.open = true;
}
export async function executeConfirm() {
  await api("/" + confirmModal.type + "/" + confirmModal.id, {
    method: "DELETE",
  });
  confirmModal.open = false;
  notify("Đã xoá thành công", "success");
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
    image_url: p.ImageURL ?? p.image_url ?? "",
    description: p.Description ?? p.description ?? "",
    upper_material: p.UpperMaterial ?? p.upper_material ?? "",
    is_featured: p.IsFeatured ?? p.is_featured ?? false,
    active: (p.IsActive ?? p.active) !== false,
    colors: p.colors || [],
    sizes: p.sizes || [],
    variants: p.variants || [],
  }));
  db.categories = (categories || []).map((c) => ({
    id: c.CategoryID ?? c.id,
    name: c.CategoryName ?? c.name,
    active: (c.IsActive ?? c.active) !== false,
  }));
  db.discounts = (discounts || []).map((d) => ({
    id: d.CouponID ?? d.id,
    code: d.CouponCode ?? d.code,
    percent: d.DiscountPercent ?? d.percent ?? 0,
    limit: d.UsageLimit ?? d.limit,
    used: d.UsedCount ?? d.used ?? 0,
    expiry: d.ExpiryDate ?? d.expiry,
    description: d.Description ?? d.description ?? "",
    active: (d.IsActive ?? d.active) !== false,
  }));
  db.customers = (customers || []).map((c) => ({
    id: c.UserID ?? c.id,
    name: c.FullName ?? c.name,
    phone: c.Phone ?? c.phone ?? "",
    spent: c.TotalSpent ?? c.spent ?? 0,
  }));
  db.accounts = (accounts || []).map((a) => ({
    id: a.UserID ?? a.id,
    username:
      a.Username ?? a.username ?? (a.Email ?? a.email ?? "").split("@")[0],
    name: a.FullName ?? a.name ?? "",
    email: a.Email ?? a.email ?? "",
    role_id: a.RoleID ?? a.role_id ?? 2,
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
    id: v.id ?? v.VariantDiscountID,
    product_id: v.product_id ?? v.ProductID,
    color: v.color ?? v.ColorName ?? "",
    percent: v.percent ?? v.DiscountPercent ?? 0,
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
