import { computed, reactive, watch } from "vue";
import { products, product_details, sizes, colors } from "../data/mockData";

const STORAGE_KEY = "shoegroup_cart_items";

export const getDetailStock = (detail) => {
  return Number(detail?.stock_quantity ?? detail?.stock_quality ?? 0);
};

const findProduct = (productId) => {
  return products.find((p) => p.id_product === Number(productId));
};

const findDetail = (detailId) => {
  return product_details.find((d) => d.id_product_detail === Number(detailId));
};

const clampQuantity = (quantity, stock) => {
  const number = Number(quantity) || 1;
  return Math.max(1, Math.min(number, stock));
};

const loadCartFromStorage = () => {
  if (typeof localStorage === "undefined") return [];

  try {
    const rawCart = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    return rawCart
      .map((item) => {
        const product = findProduct(item.id_product);
        const detail = findDetail(item.id_product_detail);
        const stock = getDetailStock(detail);

        if (!product || !detail || stock <= 0) return null;

        return {
          id_product: product.id_product,
          id_product_detail: detail.id_product_detail,
          id_size: detail.id_size,
          id_color: detail.id_color,
          quantity: clampQuantity(item.quantity, stock),
        };
      })
      .filter(Boolean);
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
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  })
    .format(Number(value || 0))
    .replace("₫", "đ");
};

export const cartItems = computed(() => {
  return cartState.items
    .map((item) => {
      const product = findProduct(item.id_product);
      const detail = findDetail(item.id_product_detail);
      const size = sizes.find((s) => s.id_size === item.id_size);
      const color = colors.find((c) => c.id_color === item.id_color);

      if (!product || !detail) return null;

      const stockQuantity = getDetailStock(detail);

      return {
        ...item,
        product,
        detail,
        size,
        color,
        stockQuantity,
        unitPrice: product.price,
        subtotal: product.price * item.quantity,
      };
    })
    .filter(Boolean);
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

export const addToCart = ({ productId, detailId, quantity = 1 }) => {
  const product = findProduct(productId);

  if (!product) {
    return {
      ok: false,
      message: "Không tìm thấy sản phẩm.",
    };
  }

  const detail =
    findDetail(detailId) ||
    product_details.find(
      (d) => d.id_product === Number(productId) && getDetailStock(d) > 0,
    );

  if (!detail) {
    return {
      ok: false,
      message: "Sản phẩm đã hết hàng.",
    };
  }

  const stock = getDetailStock(detail);

  const existingItem = cartState.items.find(
    (item) => item.id_product_detail === detail.id_product_detail,
  );

  const requestedQuantity = Math.max(1, Number(quantity) || 1);

  if (existingItem) {
    const nextQuantity = Math.min(
      existingItem.quantity + requestedQuantity,
      stock,
    );

    if (nextQuantity === existingItem.quantity) {
      return {
        ok: false,
        message: `Số lượng đã đạt tối đa tồn kho (${stock}).`,
      };
    }

    existingItem.quantity = nextQuantity;

    return {
      ok: true,
      message: "Đã cập nhật số lượng trong giỏ hàng.",
    };
  }

  cartState.items.unshift({
    id_product: product.id_product,
    id_product_detail: detail.id_product_detail,
    id_size: detail.id_size,
    id_color: detail.id_color,
    quantity: Math.min(requestedQuantity, stock),
  });

  return {
    ok: true,
    message: "Đã thêm sản phẩm vào giỏ hàng.",
  };
};

export const increaseQuantity = (detailId) => {
  const item = cartState.items.find(
    (cartItem) => cartItem.id_product_detail === Number(detailId),
  );

  if (!item) {
    return {
      ok: false,
      message: "Không tìm thấy sản phẩm trong giỏ hàng.",
    };
  }

  const detail = findDetail(detailId);

  if (!detail) {
    return {
      ok: false,
      message: "Không tìm thấy thông tin tồn kho.",
    };
  }

  const stock = getDetailStock(detail);

  if (item.quantity >= stock) {
    return {
      ok: false,
      message: `Không thể vượt quá tồn kho hiện có (${stock}).`,
    };
  }

  item.quantity += 1;

  return {
    ok: true,
    message: "Đã tăng số lượng.",
  };
};

export const decreaseQuantity = (detailId) => {
  const item = cartState.items.find(
    (cartItem) => cartItem.id_product_detail === Number(detailId),
  );

  if (!item) {
    return {
      ok: false,
      message: "Không tìm thấy sản phẩm trong giỏ hàng.",
    };
  }

  if (item.quantity <= 1) {
    return {
      ok: false,
      message: "Số lượng không được nhỏ hơn 1.",
    };
  }

  item.quantity -= 1;

  return {
    ok: true,
    message: "Đã giảm số lượng.",
  };
};

export const removeFromCart = (detailId) => {
  const index = cartState.items.findIndex(
    (item) => item.id_product_detail === Number(detailId),
  );

  if (index !== -1) {
    cartState.items.splice(index, 1);
  }
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
