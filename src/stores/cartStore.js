import { computed, reactive, watch } from "vue";

// Đổi khóa lưu trữ để dọn dẹp sạch giỏ hàng cũ bị lỗi trên máy của bạn
const STORAGE_KEY = "shoegroup_cart_v2";

const loadCartFromStorage = () => {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

export const cartState = reactive({
  items: loadCartFromStorage(),
  isMiniCartOpen: false,
});

watch(
  () => cartState.items,
  (items) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  },
  { deep: true },
);

export const formatCurrency = (value) => {
  return (
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Number(value || 0)) + " ₫"
  );
};

export const cartItems = computed(() => {
  return cartState.items.map((item) => ({
    ...item,
    subtotal: item.unitPrice * item.quantity,
  }));
});

export const cartCount = computed(() => {
  return cartState.items.reduce((total, item) => total + item.quantity, 0);
});

export const cartSubtotal = computed(() => {
  return cartItems.value.reduce((total, item) => total + item.subtotal, 0);
});

export const cartShippingFee = computed(() => {
  return cartCount.value > 0 ? 30000 : 0;
});

export const cartTotal = computed(() => {
  return cartSubtotal.value + cartShippingFee.value;
});

// THÊM VÀO GIỎ HÀNG (Lưu trực tiếp toàn bộ Tên, Ảnh, Giá)
export const addToCart = (payload) => {
  const {
    product,
    quantity = 1,
    size = { size_name: "42" },
    color = { color_label: "Mặc định" },
  } = payload;

  if (!product) return { ok: false, message: "Sản phẩm không hợp lệ." };

  // Lấy dữ liệu thật từ biến product truyền vào (từ Database API)
  const productId = product.id_product || product.id || product.ProductID;
  const productName =
    product.product_name || product.name || product.ProductName;
  const productPrice = product.price || product.BasePrice || 0;
  const productImage = product.image_url || product.ImageURL || product.image;

  const sizeName = size.size_name || "42";
  const colorName = color.color_label || color.color_name || "Mặc định";

  // Tạo ID duy nhất cho mỗi phân loại (kết hợp ID + Size + Màu)
  const detailId = `${productId}_${sizeName}_${colorName}`;

  const existingItem = cartState.items.find(
    (item) => item.id_product_detail === detailId,
  );

  if (existingItem) {
    existingItem.quantity += quantity;
    // Cập nhật lại giá/ảnh đề phòng Database có thay đổi
    existingItem.product.price = productPrice;
    existingItem.product.image_url = productImage;
    return { ok: true, message: "Đã cập nhật số lượng." };
  }

  // THÊM SẢN PHẨM MỚI VÀO GIỎ
  cartState.items.unshift({
    id_product_detail: detailId,
    id_product: productId,
    product: {
      id_product: productId,
      product_name: productName,
      price: productPrice,
      image_url: productImage,
    },
    size: { size_name: sizeName },
    color: { color_label: colorName, color_name: colorName },
    quantity: quantity,
    unitPrice: productPrice,
    stockQuantity: 100, // Tạm thời set 100 vì CSDL chưa quản lý tồn kho chi tiết
  });

  return { ok: true, message: "Đã thêm vào giỏ hàng." };
};

export const increaseQuantity = (detailId) => {
  const item = cartState.items.find(
    (cartItem) => cartItem.id_product_detail === detailId,
  );
  if (!item) return { ok: false, message: "Lỗi" };
  item.quantity += 1;
  return { ok: true, message: "Thành công" };
};

export const decreaseQuantity = (detailId) => {
  const item = cartState.items.find(
    (cartItem) => cartItem.id_product_detail === detailId,
  );
  if (!item) return { ok: false, message: "Lỗi" };
  if (item.quantity <= 1)
    return { ok: false, message: "Số lượng tối thiểu là 1" };
  item.quantity -= 1;
  return { ok: true, message: "Thành công" };
};

export const removeFromCart = (detailId) => {
  const index = cartState.items.findIndex(
    (item) => item.id_product_detail === detailId,
  );
  if (index !== -1) cartState.items.splice(index, 1);
};

export const clearCart = () => {
  cartState.items.splice(0);
};
export const showMiniCart = () => {
  cartState.isMiniCartOpen = true;
};
export const hideMiniCart = () => {
  cartState.isMiniCartOpen = false;
};
export const toggleMiniCart = () => {
  cartState.isMiniCartOpen = !cartState.isMiniCartOpen;
};
