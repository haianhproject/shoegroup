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
  DELIVERY_FAILED: "Giao hàng thất bại",
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

export const saveOrders = () => {
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
    payment_status: "Chưa thanh toán",
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
export const requestReturn = async (orderId, payload) => {
  const o = orderState.orders.find((x) => x.id === orderId);
  if (!o) return { ok: false, message: "Không tìm thấy đơn hàng." };
  const remoteId = Number(o.serverId || orderId);
  if (!Number.isInteger(remoteId) || remoteId <= 0) return { ok: false, message: "Đơn hàng chưa đồng bộ với máy chủ, vui lòng tải lại trang." };
  try {
    const { api } = await import("../services/apiClient");
    const result = await api.post("/returns", {
      order_id: remoteId,
      return_type: payload.method || "CUSTOMER",
      post_office_id: payload.postOffice?.id || null,
      tracking_number: payload.trackingCode || "",
      reason: payload.reason,
      refund_amount: payload.refundAmount,
      items: (payload.items || []).map((item) => ({
        order_detail_id: item.order_detail_id || item.orderDetailId || null,
        product_id: item.product_id || item.id_product || item.product?.id_product || null,
        productId: item.productId || null,
        size: item.size?.size_name || item.size || "",
        color: item.color?.color_label || item.color?.color_name || item.color || "",
        quantity: item.return_qty || item.quantity,
        condition: item.condition || "",
        reason: item.reason || payload.reason,
      })),
    });
    o.status = "RETURNED";
    o.returnInfo = {
      method: payload.method,
      notReceived: payload.method === "NOT_RECEIVED",
      postOffice: payload.postOffice || null,
      reason: payload.reason,
      trackingCode: payload.trackingCode,
      refundAmount: result?.RefundAmount ?? payload.refundAmount,
      items: payload.items,
      returnId: result?.ReturnID || null,
      status: result?.Status || "Chờ xử lý",
      createdAt: Date.now(),
    };
  } catch (error) {
    return { ok: false, message: error?.message || "Không thể tạo yêu cầu trả hàng." };
  }
  saveOrders();
  return { ok: true, order: o };
};

export const removeOrder = (orderId) => {
  const index = orderState.orders.findIndex((o) => o.id === orderId);
  if (index !== -1) { orderState.orders.splice(index, 1); saveOrders(); }
};

// Chỉ đánh dấu hoàn tiền khi đơn thực sự đã thu tiền. Đơn COD đang chờ xử lý
// chưa thu tiền phải giữ trạng thái "Đã hủy"; trước đây mọi đơn đều bị gắn
// "Hoàn tiền", khiến giao diện và báo cáo doanh thu sai.
const localPaymentKey = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/đ/gi, "d")
  .toLowerCase()
  .trim()
  .replace(/\s+/g, " ");

const orderWasPaid = (order) => {
  const paymentKey = localPaymentKey(order?.payment_status ?? order?.PaymentStatus);
  return ["da thanh toan", "cho thanh toan", "hoan tien"].includes(paymentKey);
};

export const cancelOrder = (orderId, reason) => {
  const o = orderState.orders.find((x) => x.id === orderId);
  if (!o) return;
  o.status = "CANCELLED";
  o.payment_status = orderWasPaid(o) ? "Hoàn tiền" : "Đã hủy";
  o.cancelReason = reason || "Khách hàng hủy đơn.";
  saveOrders();
};

/* Gắn ID đơn hàng phía server để đồng bộ trạng thái sau này */
export const setServerId = (localId, serverId) => {
  const o = orderState.orders.find((x) => x.id === localId);
  if (o) { o.serverId = serverId; saveOrders(); }
};

import { API_BASE_URL } from "../services/apiClient";
const API_BASE = API_BASE_URL;

/* Chuẩn hóa chuỗi tiếng Việt để so khớp trạng thái không lỗi */
export const normalizeStatusText = (str) => {
  if (!str) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
};

/* Ánh xạ trạng thái từ Server (DB SQL / Admin) sang KEY nội bộ (PENDING, CONFIRMED, ...) */
export const mapStatusToKey = (status) => {
  if (!status) return "PENDING";
  const raw = String(status).trim();
  if (ORDER_STATUS[raw]) return raw;

  const n = normalizeStatusText(raw);

  if (n.includes("huy") || n.includes("cancel")) return "CANCELLED";
  if (n.includes("tra hang") || n.includes("hoan tien") || n.includes("return")) return "RETURNED";
  if (n.includes("da nhan") || n.includes("receive")) return "RECEIVED";
  if (n.includes("hoan thanh") || n.includes("complete")) return "COMPLETED";
  if (n.includes("giao hang that bai") || n.includes("khong giao duoc hang") || n.includes("delivery failed") || n.includes("delivery failure") || n.includes("delivery_failure")) return "DELIVERY_FAILED";
  if (n.includes("da giao") || n.includes("giao hang thanh cong") || n.includes("deliver")) return "DELIVERED";
  if (n.includes("van chuyen") || n.includes("dang giao") || n.includes("ship")) return "SHIPPING";
  if (n.includes("chuan bi") || n.includes("lay hang") || n.includes("process") || n.includes("picking")) return "CONFIRMED";
  if (n.includes("da xac nhan") || n.includes("confirm")) return "CONFIRMED";
  if (n.includes("cho xac nhan") || n.includes("cho xu ly") || n.includes("pending")) return "PENDING";

  return "PENDING";
};

/* Trạng thái do KHÁCH quyết định -> không bị server ghi đè lùi.
   RETURNED không nằm trong danh sách này vì yêu cầu trả hàng có thể bị
   từ chối/hủy và đơn cần quay lại SHIPPING hoặc RECEIVED. */
const CLIENT_TERMINAL = ["RECEIVED", "COMPLETED"];

/* Ánh xạ 1 đơn từ server (GET /api/customers/:id/orders) sang shape dùng ở trang khách */
export const mapServerOrder = (s) => {
  const key = mapStatusToKey(s.status);
  let createdAt = Date.now();
  if (s.created_at) {
    const d = new Date(s.created_at);
    if (!isNaN(d)) createdAt = d.getTime();
  } else if (s.date) {
    const m = String(s.date).match(/(\d{2})\/(\d{2})\/(\d{4})[ T]?(\d{2})?:?(\d{2})?:?(\d{2})?/);
    if (m) createdAt = new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime();
    else { const d = new Date(s.date); if (!isNaN(d)) createdAt = d.getTime(); }
  }
  const toTimestamp = (value) => {
    if (!value) return null;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  };
  const deliveredDate = toTimestamp(s.delivered_date ?? s.DeliveredDate);
  const receivedConfirmedDate = toTimestamp(s.received_confirmed_date ?? s.ReceivedConfirmedDate);
  const revenueEligibleDate = toTimestamp(s.revenue_eligible_date ?? s.RevenueEligibleDate);
  const paymentDueAt = s.payment_due_at || s.PaymentDueAt || null;
  const paymentConfirmedAt = s.payment_confirmed_at || s.PaymentConfirmedAt || null;
  const rawCounted = s.is_counted_as_revenue ?? s.IsCountedAsRevenue;
  const isCountedAsRevenue = rawCounted === true || rawCounted === 1 || rawCounted === "1" || String(rawCounted).toLowerCase() === "true";
  return {
    id: "SV" + s.id,
    serverId: s.id,
    userId: s.user_id ?? null,
    createdAt,
    date: s.date || "",
    status: key,
    autoCancelDeadline: toTimestamp(s.auto_cancel_deadline ?? s.AutoCancelDeadline),
    deliveredDate: deliveredDate || (key === "DELIVERED" ? createdAt : null),
    receivedConfirmedDate,
    revenueEligibleDate,
    isCountedAsRevenue,
    autoCancelled: false,
    cancelReason: s.cancel_reason || "",
    fromServer: true,
    shippingAddress: s.shipping_address || s.customer_address || "",
    addressId: s.address_id ?? null,
    addressChanged: Boolean(s.address_changed),
    customer: {
      fullName: s.customer_name || "",
      phone: s.customer_phone || "",
      email: "",
      address: s.customer_address || "",
    },
    items: (s.products || []).map((d) => ({
      order_detail_id: d.order_detail_id ?? d.OrderDetailID ?? null,
      product_id: d.product_id ?? d.ProductID ?? null,
      product_variant_id: d.variant_id ?? d.ProductVariantID ?? null,
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
    shippingMethod: {
      code: s.shipping_method_code || "",
      name: s.shipping_method || "Theo đơn hàng",
      eta: s.shipping_eta || "",
    },
    paymentMethod: {
      code: s.payment_method_code || "",
      name: s.payment_method || "COD",
    },
    payment_status: s.payment_status || s.PaymentStatus || "Chưa thanh toán",
    paymentDueAt,
    paymentConfirmedAt,
    tracking_code: s.tracking_code || s.TrackingNumber || "",
    note: s.note || "",
  };
};

/* Đồng bộ trạng thái từ server (Admin cập nhật) về đơn của khách */
export const syncFromServer = async () => {
  const user = getCurrentUser();
  if (!user) return;

  const uid = user.id_user || user.id || user.UserID;
  if (!uid) return;

  let list = [];
  try {
    const { api } = await import("../services/apiClient");
    list = await api.get(`/customers/${uid}/orders`);
  } catch (err) {
    console.warn("Lỗi syncFromServer:", err);
    return;
  }
  if (!Array.isArray(list)) return;

  let changed = false;

  // 1. Cập nhật các đơn đã tồn tại trong local storage
  orderState.orders.forEach((o) => {
    const s = list.find((item) => String(item.id) === String(o.serverId));
    if (!s) return;

    const key = mapStatusToKey(s.status);
    // Cập nhật trạng thái
    // Cho phép server đẩy các trạng thái kết thúc/đổi trả lên ngay cả khi
    // local vừa lưu "Đã nhận hàng"; chỉ giữ terminal local trước một bản
    // ghi server cũ hơn (DELIVERED/PENDING).
    const serverAuthoritative = ["RETURNED", "CANCELLED", "COMPLETED"].includes(key);
    if (o.status !== key && (!CLIENT_TERMINAL.includes(o.status) || serverAuthoritative)) {
      o.status = key;
      if (key === "DELIVERED" && !o.deliveredDate) {
        o.deliveredDate = Date.now();
        o.autoCancelDeadline = null;
      }
      if (key === "CANCELLED") {
        o.cancelReason = s.cancel_reason || o.cancelReason || "Đơn bị hủy.";
      }
      changed = true;
    }

    // Yêu cầu trả hàng bị từ chối/hủy sẽ trả đơn về trạng thái giao/nhận;
    // xóa cờ local để người mua có thể gửi yêu cầu mới đúng điều kiện.
    if (key !== "RETURNED" && o.returnInfo) {
      delete o.returnInfo;
      changed = true;
    }

    if (s.payment_status && o.payment_status !== s.payment_status) {
      o.payment_status = s.payment_status;
      changed = true;
    }

    const serverAddress = s.shipping_address || s.customer_address || "";
    if (serverAddress && o.shippingAddress !== serverAddress) {
      o.shippingAddress = serverAddress;
      changed = true;
    }
    const serverAddressId = s.address_id ?? null;
    if ((o.addressId ?? null) !== serverAddressId) {
      o.addressId = serverAddressId;
      changed = true;
    }

    const toTimestamp = (value) => {
      if (!value) return null;
      const parsed = new Date(value).getTime();
      return Number.isFinite(parsed) ? parsed : null;
    };
    const hasField = (...names) => names.some((name) => Object.prototype.hasOwnProperty.call(s, name));
    const dateFields = [
      ["deliveredDate", ["delivered_date", "DeliveredDate"]],
      ["receivedConfirmedDate", ["received_confirmed_date", "ReceivedConfirmedDate"]],
      ["revenueEligibleDate", ["revenue_eligible_date", "RevenueEligibleDate"]],
      ["autoCancelDeadline", ["auto_cancel_deadline", "AutoCancelDeadline"]],
    ];
    dateFields.forEach(([field, names]) => {
      if (!hasField(...names)) return;
      const value = toTimestamp(s[names[0]] ?? s[names[1]]);
      if ((o[field] ?? null) !== (value ?? null)) {
        o[field] = value;
        changed = true;
      }
    });
    if (hasField("is_counted_as_revenue", "IsCountedAsRevenue")) {
      const rawCounted = s.is_counted_as_revenue ?? s.IsCountedAsRevenue;
      const serverCounted = rawCounted === true || rawCounted === 1 || rawCounted === "1" || String(rawCounted).toLowerCase() === "true";
      if (Boolean(o.isCountedAsRevenue) !== serverCounted) {
        o.isCountedAsRevenue = serverCounted;
        changed = true;
      }
    }
    if (hasField("payment_due_at", "PaymentDueAt")) {
      const serverPaymentDue = s.payment_due_at ?? s.PaymentDueAt ?? null;
      if ((o.paymentDueAt ?? null) !== (serverPaymentDue ?? null)) {
        o.paymentDueAt = serverPaymentDue;
        changed = true;
      }
    }
    if (hasField("payment_confirmed_at", "PaymentConfirmedAt")) {
      const serverPaymentConfirmed = s.payment_confirmed_at ?? s.PaymentConfirmedAt ?? null;
      if ((o.paymentConfirmedAt ?? null) !== (serverPaymentConfirmed ?? null)) {
        o.paymentConfirmedAt = serverPaymentConfirmed;
        changed = true;
      }
    }
    if (hasField("tracking_code", "TrackingNumber")) {
      const serverTracking = s.tracking_code ?? s.TrackingNumber ?? "";
      if ((o.tracking_code ?? "") !== serverTracking) {
        o.tracking_code = serverTracking;
        changed = true;
      }
    }
  });

  // 2. Thêm các đơn từ server về local nếu chưa có
  const existingServerIds = new Set(
    orderState.orders.map((o) => (o.serverId != null ? String(o.serverId) : null)).filter(Boolean)
  );

  list.forEach((s) => {
    if (!s || s.id == null) return;
    if (existingServerIds.has(String(s.id))) return;
    try {
      orderState.orders.push(mapServerOrder(s));
      existingServerIds.add(String(s.id));
      changed = true;
    } catch (e) {}
  });

  if (changed) saveOrders();
};
