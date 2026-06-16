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

const setDetailStock = (detail, stock) => {
  if (!detail) return;

  const nextStock = Math.max(0, Number(stock) || 0);

  detail.stock_quantity = nextStock;
  detail.stock_quality = nextStock;
};

const reduceDetailStock = (detail, quantity = 1) => {
  if (!detail) return false;

  const stock = getDetailStock(detail);
  const quantityNumber = Math.max(1, Number(quantity) || 1);

  if (stock < quantityNumber) {
    console.log("Hết hàng!");
    return false;
  }

  setDetailStock(detail, stock - quantityNumber);
  console.log("Đã thêm vào giỏ, còn lại:", getDetailStock(detail));

  return true;
};

const restoreDetailStock = (detail, quantity = 1) => {
  if (!detail) return;

  const quantityNumber = Math.max(1, Number(quantity) || 1);
  setDetailStock(detail, getDetailStock(detail) + quantityNumber);
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

        if (!product || !detail) return null;

        const quantity = clampQuantity(
          item.quantity,
          stock + Number(item.quantity || 0),
        );

        return {
          id_product: product.id_product,
          id_product_detail: detail.id_product_detail,
          id_size: detail.id_size,
          id_color: detail.id_color,
          quantity,
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

      const remainingStock = getDetailStock(detail);

      return {
        ...item,
        product,
        detail,
        size,
        color,
        remainingStock,
        stockQuantity: item.quantity + remainingStock,
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

export const addToCart = (payload) => {
  const isDetailIdOnly = typeof payload === "number";

  const payloadDetail = isDetailIdOnly ? findDetail(payload) : null;

  const productId = isDetailIdOnly
    ? payloadDetail?.id_product
    : payload?.productId;

  const detailId = isDetailIdOnly ? payload : payload?.detailId;

  const requestedQuantity = Math.max(
    1,
    Number(isDetailIdOnly ? 1 : payload?.quantity) || 1,
  );

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
    console.log("Hết hàng!");

    return {
      ok: false,
      message: "Sản phẩm đã hết hàng.",
    };
  }

  const stock = getDetailStock(detail);

  if (stock <= 0) {
    console.log("Hết hàng!");

    return {
      ok: false,
      message: "Sản phẩm đã hết hàng.",
    };
  }

  const quantityToAdd = Math.min(requestedQuantity, stock);

  const existingItem = cartState.items.find(
    (item) => item.id_product_detail === detail.id_product_detail,
  );

  const reduced = reduceDetailStock(detail, quantityToAdd);

  if (!reduced) {
    return {
      ok: false,
      message: "Sản phẩm đã hết hàng.",
    };
  }

  if (existingItem) {
    existingItem.quantity += quantityToAdd;

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
    quantity: quantityToAdd,
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

  if (stock <= 0) {
    return {
      ok: false,
      message: "Không thể vượt quá tồn kho hiện có.",
    };
  }

  const reduced = reduceDetailStock(detail, 1);

  if (!reduced) {
    return {
      ok: false,
      message: "Sản phẩm đã hết hàng.",
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

  const detail = findDetail(detailId);

  item.quantity -= 1;
  restoreDetailStock(detail, 1);

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
    const item = cartState.items[index];
    const detail = findDetail(detailId);

    restoreDetailStock(detail, item.quantity);
    cartState.items.splice(index, 1);
  }
};

export const clearCart = ({ restoreStock = false } = {}) => {
  if (restoreStock) {
    cartState.items.forEach((item) => {
      const detail = findDetail(item.id_product_detail);
      restoreDetailStock(detail, item.quantity);
    });
  }

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
