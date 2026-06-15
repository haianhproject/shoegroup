import { computed, reactive } from "vue";
import { getCurrentUser } from "./authStore";

const STORAGE_KEY = "shoegroup_orders";

const loadOrders = () => {
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

const formatOrderDate = (date) => {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const createOrderId = () => {
  return `#SG${Date.now().toString().slice(-6)}`;
};

export const orderState = reactive({
  orders: loadOrders(),
});

export const ordersByCurrentUser = computed(() => {
  const user = getCurrentUser();
  if (!user) return [];

  return orderState.orders
    .filter(
      (order) =>
        order.userId === user.id_user || order.customer?.email === user.email,
    )
    .sort((a, b) => b.createdAt - a.createdAt);
});

export const createOrder = ({
  customer,
  items,
  subtotal,
  shippingFee,
  discount,
  total,
  shippingMethod,
  paymentMethod,
  note,
}) => {
  const user = getCurrentUser();

  if (!user) {
    return {
      ok: false,
      message: "Vui lòng đăng nhập trước khi đặt hàng.",
    };
  }

  const now = new Date();

  const order = {
    id: createOrderId(),
    userId: user.id_user,
    createdAt: now.getTime(),
    date: formatOrderDate(now),
    status: "Chờ xử lý",
    customer: {
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      country: customer.country,
      address: customer.address,
      province: customer.province,
    },
    items: items.map((item) => ({
      id_product: item.product.id_product,
      id_product_detail: item.id_product_detail,
      product_name: item.product.product_name,
      image_url: item.product.image_url,
      size_name: item.size?.size_name || "",
      color_name: item.color?.color_label || item.color?.color_name || "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
    subtotal,
    shippingFee,
    discount,
    total,
    shippingMethod,
    paymentMethod,
    note: note || "",
  };

  orderState.orders.unshift(order);
  saveOrders();

  return {
    ok: true,
    order,
  };
};

export const removeOrder = (orderId) => {
  const index = orderState.orders.findIndex((order) => order.id === orderId);

  if (index !== -1) {
    orderState.orders.splice(index, 1);
    saveOrders();
  }
};
