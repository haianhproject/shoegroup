import { computed, reactive } from "vue";
import { getCurrentUser } from "./authStore";

/* =====================================================================
   orderStore — quản lý đơn hàng phía khách (localStorage demo)
   - status luôn là KEY tiếng Anh (PENDING, CONFIRMED, ...); nhãn hiển
     thị lấy từ ORDER_STATUS[key].
   - Nghiệp vụ: tự hủy khi quá hạn nhận hàng, xác nhận đã nhận hàng kiểu
     Shopee, giữ 14 ngày trước khi tính doanh thu, yêu cầu trả hàng.
   ===================================================================== */

const STORAGE_KEY = "shoegroup_orders_v2";
const DAY = 864e5;

export const RECEIVE_TIMEOUT_DAYS = 7; // quá hạn nhận hàng -> tự hủy
export const REVENUE_HOLD_DAYS = 14; // chờ 14 ngày sau khi nhận -> tính doanh thu

/* KEY -> nhãn tiếng Việt */
export const ORDER_STATUS = {
  PENDING: "Chờ xử lý",
  CONFIRMED: "Đã xác nhận",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  RECEIVED: "Đã nhận hàng",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  RETURNED: "Trả hàng",
};

/* Danh sách {key,label} dùng cho bộ lọc trạng thái */
export const ORDER_STATUS_LIST = Object.keys(ORDER_STATUS).map((key) => ({
  key,
  label: ORDER_STATUS[key],
}));

/* ---------- Helpers ---------- */
const readOrdersFromStorage = () => {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveOrders = () => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orderState.orders));
};

const formatOrderDate = (date) =>
  new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);

const createOrderId = () => `SG${Date.now().toString().slice(-6)}`;

export const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value || 0)) + " ₫";

/* ---------- State ---------- */
export const orderState = reactive({
  orders: readOrdersFromStorage(),
});

/* Nạp lại đơn hàng (dùng ở onMounted của trang đơn hàng) */
export const loadOrders = async () => {
  orderState.orders = readOrdersFromStorage();
  await syncFromServer();
  return orderState.orders;
};

/* Tự động hủy đơn quá hạn nhận hàng */
export const runAutoCancel = () => {
  const now = Date.now();
  let changed = false;
  orderState.orders.forEach((o) => {
    if (
      o.autoCancelDeadline &&
      now > o.autoCancelDeadline &&
      ["PENDING", "CONFIRMED"].includes(o.status)
    ) {
      o.status = "CANCELLED";
      o.cancelReason =
        "Shop chưa chuẩn bị hàng cho khách. Xin lỗi quý khách, vui lòng đặt lại đơn hàng.";
      o.autoCancelled = true;
      changed = true;
    }
  });

  if (changed) saveOrders();
};
runAutoCancel();

export const ordersByCurrentUser = computed(() => {
  const user = getCurrentUser();
  if (!user) return [];
  const uid = user.id_user || user.id || user.UserID;
  return orderState.orders.filter(
    (o) => (uid && String(o.userId) === String(uid)) || o.customer?.email === user.email,
  );
});

export const createOrder = ({
  customer, items, subtotal, shippingFee, discount, total,
  shippingMethod, paymentMethod, note,
}) => {
  const user = getCurrentUser();
  if (!user) return { ok: false, message: "Vui lòng đăng nhập trước khi đặt hàng." };

  const now = new Date();
  const order = {
    id: createOrderId(),
    serverId: null,
    userId: user.id_user || user.id || user.UserID || null,
    createdAt: now.getTime(),
    date: formatOrderDate(now),
    status: "PENDING",
    autoCancelDeadline: now.getTime() + RECEIVE_TIMEOUT_DAYS * DAY,
    deliveredDate: null,
    receivedConfirmedDate: null,
    revenueEligibleDate: null,
    isCountedAsRevenue: false,
    autoCancelled: false,
    cancelReason: "",
    customer: {
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      country: customer.country,
      address: customer.address,
      province: customer.province,
    },
    items: items.map((item) => {
      const attrs = item.attributes || {};
      const prod = item.product || {};
      return {
        id_product: prod.id_product,
        id_product_detail: item.id_product_detail,
        product_name: prod.product_name,
        image_url: prod.image_url,
        size: { size_name: item.size?.size_name || "" },
        color: { color_label: item.color?.color_label || item.color?.color_name || "" },
        attributes: {
          material_name: attrs.material_name || prod.material_name || "",
          sole_name: attrs.sole_name || prod.sole_name || "",
          cushioning_name: attrs.cushioning_name || prod.cushioning_name || "",
          brand_name: attrs.brand_name || prod.brand_name || "",
          category_name: attrs.category_name || prod.category_name || "",
          sport: attrs.sport || prod.sport || "",
        },
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal ?? item.unitPrice * item.quantity,
      };
    }),
    subtotal, shippingFee, discount, total,
    shippingMethod, paymentMethod, note: note || "",
  };

  orderState.orders.unshift(order);
  saveOrders();
  return { ok: true, order };
};

/* DEMO: giả lập shop đã giao để hiển thị nút "Đã nhận hàng" */
export const markAsDelivered = (orderId) => {
  const o = orderState.orders.find((x) => x.id === orderId);
  if (!o) return;
  o.status = "DELIVERED";
  o.deliveredDate = Date.now();
  o.autoCancelDeadline = null;
  saveOrders();
};

/* Khách bấm "Đã nhận hàng" (giống Shopee).
   Đơn xác nhận nhưng CHƯA tính doanh thu — chờ 14 ngày cho yêu cầu trả hàng. */
export const confirmReceived = (orderId) => {
  const o = orderState.orders.find((x) => x.id === orderId);
  if (!o) return { ok: false, message: "Không tìm thấy đơn hàng." };
  const now = Date.now();
  o.status = "RECEIVED";
  o.receivedConfirmedDate = now;
  o.revenueEligibleDate = now + REVENUE_HOLD_DAYS * DAY;
  o.isCountedAsRevenue = false;
  saveOrders();
  return { ok: true, order: o };
};

/* Số ngày còn lại trước khi đơn được tính doanh thu */
export const daysUntilRevenue = (order) => {
  if (!order.revenueEligibleDate) return null;
  return Math.max(0, Math.ceil((order.revenueEligibleDate - Date.now()) / DAY));
};

/* Tạo yêu cầu trả hàng (shipper tự lấy / gửi bưu cục) */
export const requestReturn = (orderId, payload) => {
  const o = orderState.orders.find((x) => x.id === orderId);
  if (!o) return { ok: false, message: "Không tìm thấy đơn hàng." };
  o.status = "RETURNED";
  o.returnInfo = {
    method: payload.method,
    postOffice: payload.postOffice || null,
    reason: payload.reason,
    trackingCode: payload.trackingCode,
    refundAmount: payload.refundAmount,
    items: payload.items,
    createdAt: Date.now(),
  };
  saveOrders();
  return { ok: true, order: o };
};

export const removeOrder = (orderId) => {
  const index = orderState.orders.findIndex((o) => o.id === orderId);
  if (index !== -1) { orderState.orders.splice(index, 1); saveOrders(); }
};

export const cancelOrder = (orderId, reason) => {
  const o = orderState.orders.find((x) => x.id === orderId);
  if (!o) return;
  o.status = "CANCELLED";
  o.cancelReason = reason || "Khách hàng hủy đơn.";
  saveOrders();
};

/* Gắn ID đơn hàng phía server để đồng bộ trạng thái sau này */
export const setServerId = (localId, serverId) => {
  const o = orderState.orders.find((x) => x.id === localId);
  if (o) { o.serverId = serverId; saveOrders(); }
};

const API_BASE = "http://localhost:5000/api";

/* Ánh xạ trạng thái tiếng Việt (server/Admin) -> KEY nội bộ */
const SERVER_STATUS_TO_KEY = {
  "Chờ xác nhận": "PENDING",
  "Chờ xử lý": "PENDING",
  "Đã xác nhận": "CONFIRMED",
  "Đang vận chuyển": "SHIPPING",
  "Đang giao": "SHIPPING",
  "Đã giao hàng thành công": "DELIVERED",
  "Đã giao": "DELIVERED",
  "Đã hủy": "CANCELLED",
};

/* Trạng thái do KHÁCH quyết định -> không để server ghi đè */
const CLIENT_TERMINAL = ["RECEIVED", "COMPLETED", "RETURNED"];

/* Anh xa 1 don tu server (GET /api/orders) sang shape dung o trang khach */
const mapServerOrder = (s) => {
  const key = SERVER_STATUS_TO_KEY[s.status] || "PENDING";
  let createdAt = Date.now();
  if (s.date) {
    const m = String(s.date).match(/(\d{2})\/(\d{2})\/(\d{4})[ T]?(\d{2})?:?(\d{2})?:?(\d{2})?/);
    if (m) createdAt = new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime();
    else { const d = new Date(s.date); if (!isNaN(d)) createdAt = d.getTime(); }
  }
  return {
    id: "SV" + s.id,
    serverId: s.id,
    userId: s.user_id ?? null,
    createdAt,
    date: s.date || "",
    status: key,
    autoCancelDeadline: null,
    deliveredDate: key === "DELIVERED" ? createdAt : null,
    receivedConfirmedDate: null,
    revenueEligibleDate: null,
    isCountedAsRevenue: false,
    autoCancelled: false,
    cancelReason: s.cancel_reason || "",
    fromServer: true,
    customer: {
      fullName: s.customer_name || "",
      phone: s.customer_phone || "",
      email: "",
      address: s.customer_address || "",
    },
    items: (s.products || []).map((d) => ({
      product_name: d.name || "",
      image_url: d.image || "",
      size: { size_name: d.size || "" },
      color: { color_label: d.color || "" },
      quantity: d.quantity ?? 1,
      unitPrice: d.price ?? 0,
      subtotal: (d.price ?? 0) * (d.quantity ?? 1),
    })),
    subtotal: s.total ?? 0,
    shippingFee: s.shippingFee ?? 0,
    discount: s.discount ?? 0,
    total: s.total ?? 0,
    shippingMethod: "",
    paymentMethod: s.paymentMethod || "COD",
    note: s.note || "",
  };
};

/* Đồng bộ trạng thái từ server (Admin cập nhật) về đơn của khách */
export const syncFromServer = async () => {
  const withServer = orderState.orders.filter((o) => o.serverId);
  let list = [];
  try {
    const res = await fetch(`${API_BASE}/orders`);
    list = await res.json();
  } catch {
    return;
  }
  if (!Array.isArray(list)) return;
  const byId = {};
  list.forEach((s) => { byId[s.id] = s; });
  let changed = false;
  withServer.forEach((o) => {
    const s = byId[o.serverId];
    if (!s) return;
    const key = SERVER_STATUS_TO_KEY[s.status];
    if (!key || CLIENT_TERMINAL.includes(o.status)) return;
    if (o.status !== key) {
      o.status = key;
      if (key === "DELIVERED" && !o.deliveredDate) {
        o.deliveredDate = Date.now();
        o.autoCancelDeadline = null;
      }
      if (key === "CANCELLED") o.cancelReason = s.cancel_reason || o.cancelReason || "Đơn bị hủy.";
      changed = true;
    }
  });

  // Nap them don tu SQL cho user hien tai ma local CHUA co (khac phuc "mat don hang")
  const user = getCurrentUser();
  if (user) {
    const uid = user.id_user || user.id || user.UserID;
    const known = new Set(orderState.orders.map((o) => o.serverId).filter(Boolean));
    list.forEach((s) => {
      if (uid == null || s.user_id == null) return;
      if (String(s.user_id) !== String(uid)) return;
      if (known.has(s.id)) return;
      try { orderState.orders.push(mapServerOrder(s)); changed = true; } catch (e) { /* bo qua dong loi */ }
    });
  }

  if (changed) saveOrders();
};
