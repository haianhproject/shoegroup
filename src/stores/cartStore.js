import { computed, reactive, ref, watch } from "vue";
import { currentUser } from "./authStore";
import { api } from "../services/apiClient";

// ============================================================
// STORAGE
// ============================================================

const STORAGE_KEY = "shoegroup_carts_v4";
const GUEST_CART_KEY = "__guest__";

// ============================================================
// LẤY ID TÀI KHOẢN
// ============================================================

const getUserId = (user) => {
  if (!user) return GUEST_CART_KEY;

  const id =
    user.id_account ??
    user.account_id ??
    user.id_user ??
    user.user_id ??
    user.id ??
    user.ID ??
    user.email ??
    user.username;

  if (id === undefined || id === null || String(id).trim() === "") {
    return GUEST_CART_KEY;
  }

  return `user_${String(id).trim()}`;
};

// ============================================================
// LOAD TẤT CẢ GIỎ
// ============================================================

const loadAllCarts = () => {
  if (typeof localStorage === "undefined") {
    return {};
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const data = JSON.parse(raw);

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data)
    ) {
      return {};
    }

    return data;
  } catch (error) {
    console.error("Không thể đọc giỏ hàng:", error);
    return {};
  }
};

// ============================================================
// SAVE TẤT CẢ GIỎ
// ============================================================

const saveAllCarts = (carts) => {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(carts),
    );
  } catch (error) {
    console.error("Không thể lưu giỏ hàng:", error);
  }
};

// ============================================================
// LOAD GIỎ CỦA TÀI KHOẢN
// ============================================================

const loadCartForUser = (user) => {
  const carts = loadAllCarts();
  const userKey = getUserId(user);

  if (!Array.isArray(carts[userKey])) {
    return [];
  }

  return carts[userKey];
};

// ============================================================
// SAVE GIỎ CỦA TÀI KHOẢN
// ============================================================

const saveCartForUser = (userKey, items) => {
  const carts = loadAllCarts();

  carts[userKey] = JSON.parse(
    JSON.stringify(items || []),
  );

  saveAllCarts(carts);
};

// ============================================================
// USER HIỆN TẠI
// ============================================================

let activeUserKey = getUserId(currentUser.value);

// ============================================================
// CART STATE
// ============================================================

export const cartState = reactive({
  items: loadCartForUser(currentUser.value),
  isMiniCartOpen: false,
});

export const isCheckingCartStock = ref(false);
let cartStockRefreshInFlight = null;

// ============================================================
// THEO DÕI ĐỔI TÀI KHOẢN
// ============================================================
//
// Ví dụ:
//
// Tài khoản A:
// cart = [giày A]
//
// Logout
//
// Tài khoản B:
// cart = [giày B]
//
// Hai tài khoản hoàn toàn riêng nhau.
// ============================================================

watch(
  currentUser,
  (newUser) => {
    const newUserKey = getUserId(newUser);

    if (newUserKey === activeUserKey) {
      return;
    }

    // Lưu giỏ tài khoản cũ
    saveCartForUser(
      activeUserKey,
      cartState.items,
    );

    // Chuyển sang tài khoản mới
    activeUserKey = newUserKey;

    const newCart = loadCartForUser(newUser);

    cartState.items.splice(
      0,
      cartState.items.length,
      ...newCart,
    );

    cartState.isMiniCartOpen = false;
  },
);

// ============================================================
// TỰ ĐỘNG LƯU GIỎ
// ============================================================

watch(
  () => cartState.items,
  (items) => {
    saveCartForUser(
      activeUserKey,
      items,
    );
  },
  {
    deep: true,
  },
);

// ============================================================
// FORMAT TIỀN
// ============================================================

export const formatCurrency = (value) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

// ============================================================
// CART ITEMS
// ============================================================

export const cartItems = computed(() => {
  return cartState.items.map((item) => ({
    ...item,

    subtotal:
      Number(item.unitPrice || 0) *
      Number(item.quantity || 0),
  }));
});

// ============================================================
// CART COUNT
// ============================================================

export const cartCount = computed(() => {
  return cartState.items.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0,
  );
});

// ============================================================
// SUBTOTAL
// ============================================================

export const cartSubtotal = computed(() => {
  return cartItems.value.reduce(
    (total, item) =>
      total + Number(item.subtotal || 0),
    0,
  );
});

// ============================================================
// SHIPPING
// ============================================================

export const cartShippingFee = computed(() => {
  return cartCount.value > 0
    ? 30000
    : 0;
});

// ============================================================
// TOTAL
// ============================================================

export const cartTotal = computed(() => {
  return (
    cartSubtotal.value +
    cartShippingFee.value
  );
});

// ============================================================
// KIEM TRA TON KHO THAT
// ============================================================

const normalizeVariantText = (value) =>
  String(value ?? "").trim().toLocaleLowerCase("vi-VN");

const isEnabled = (value) =>
  !(value === false || value === 0 || value === "0");

export const cartUnavailableItems = computed(() =>
  cartState.items.filter(
    (item) => item.isOutOfStock === true || item.hasInsufficientStock === true,
  ),
);

export const cartHasUnavailableItems = computed(
  () => cartUnavailableItems.value.length > 0,
);

const refreshCartStockFromServer = async () => {
  if (!cartState.items.length) {
    return {
      ok: true,
      outOfStock: [],
      insufficient: [],
      newlyUnavailable: [],
    };
  }

  const refreshUserKey = activeUserKey;
  const requestedItems = new Map(
    cartState.items.map((item) => [String(item.id_product_detail), item]),
  );
  isCheckingCartStock.value = true;
  try {
    const products = await api.get("/products");
    if (!Array.isArray(products)) {
      throw new Error("Du lieu ton kho khong hop le.");
    }
    // Tai khoan co the dang xuat/dang nhap trong luc request dang chay.
    // Khong duoc ap ket qua cua gio cu sang gio cua tai khoan moi.
    if (activeUserKey !== refreshUserKey) {
      return {
        ok: false,
        cancelled: true,
        message: "Gio hang da thay doi trong luc kiem tra ton kho.",
        outOfStock: [],
        insufficient: [],
        newlyUnavailable: [],
      };
    }

    const productsById = new Map(
      products.map((product) => [
        String(product.id ?? product.ProductID),
        product,
      ]),
    );
    const outOfStock = [];
    const insufficient = [];
    const newlyUnavailable = [];
    const checkedAt = Date.now();

    for (const item of cartState.items) {
      if (requestedItems.get(String(item.id_product_detail)) !== item) continue;
      const productId =
        item.id_product ?? item.product?.id_product ?? item.product_id;
      const product = productsById.get(String(productId));
      const productActive = product && isEnabled(product.active ?? product.IsActive);
      const variants = Array.isArray(product?.variants) ? product.variants : [];
      const variantId = item.variant_id;
      let variant = null;

      if (variantId !== null && variantId !== undefined && String(variantId) !== "") {
        // Variant ID la dinh danh chinh. Khong tu doi sang SKU khac neu ID cu mat.
        variant = variants.find(
          (candidate) => String(candidate.id ?? candidate.ProductVariantID) === String(variantId),
        );
      } else {
        const wantedSize = normalizeVariantText(
          item.size?.size_name ?? item.size,
        );
        const wantedColor = normalizeVariantText(
          item.color?.color_label ?? item.color?.color_name ?? item.color,
        );
        variant = variants.find(
          (candidate) =>
            normalizeVariantText(candidate.size ?? candidate.Size) === wantedSize &&
            normalizeVariantText(candidate.color ?? candidate.ColorName) === wantedColor,
        );
      }

      const variantActive = variant && isEnabled(variant.active ?? variant.IsActive);
      const stock = Math.max(
        0,
        Number(
          variant?.stock ??
            variant?.StockQuantity ??
            (variants.length === 0
              ? product?.total_stock ?? product?.stock_quantity ?? product?.stock
              : 0),
        ) || 0,
      );
      const variantFound = Boolean(variant) || Boolean(product && variants.length === 0);
      const isOutOfStock =
        !product ||
        !productActive ||
        !variantFound ||
        (!variantActive && variants.length > 0) ||
        stock <= 0;
      const hasInsufficientStock =
        !isOutOfStock && Number(item.quantity || 0) > stock;
      const nextStatus = isOutOfStock
        ? "out_of_stock"
        : hasInsufficientStock
          ? "insufficient"
          : "available";
      const previousStatus = item.stockAvailability || "available";

      item.stockQuantity = stock;
      item.isOutOfStock = isOutOfStock;
      item.hasInsufficientStock = hasInsufficientStock;
      item.stockAvailability = nextStatus;
      item.stockCheckedAt = checkedAt;

      if (isOutOfStock) outOfStock.push(item);
      if (hasInsufficientStock) insufficient.push(item);
      if (
        previousStatus === "available" &&
        (nextStatus === "out_of_stock" || nextStatus === "insufficient")
      ) {
        newlyUnavailable.push(item);
      }
    }

    return { ok: true, outOfStock, insufficient, newlyUnavailable };
  } catch (error) {
    return {
      ok: false,
      message: error?.message || "Khong the kiem tra ton kho luc nay.",
      outOfStock: [],
      insufficient: [],
      newlyUnavailable: [],
    };
  } finally {
    isCheckingCartStock.value = false;
  }
};

export const refreshCartAvailability = () => {
  if (cartStockRefreshInFlight) return cartStockRefreshInFlight;
  cartStockRefreshInFlight = refreshCartStockFromServer().finally(() => {
    cartStockRefreshInFlight = null;
  });
  return cartStockRefreshInFlight;
};

// ============================================================
// ADD TO CART
// ============================================================

export const addToCart = (payload) => {
  const {
    product,
    quantity = 1,
    size = {},
    color = {},
    variantId = null,
    stockQuantity = null,
  } = payload || {};

  // ----------------------------------------------------------
  // KIỂM TRA PRODUCT
  // ----------------------------------------------------------

  if (!product) {
    return {
      ok: false,
      message: "Sản phẩm không hợp lệ.",
    };
  }

  // ----------------------------------------------------------
  // PRODUCT ID
  // ----------------------------------------------------------

  const productId =
    product.id_product ??
    product.id ??
    product.ProductID;

  // ----------------------------------------------------------
  // PRODUCT NAME
  // ----------------------------------------------------------

  const productName =
    product.product_name ??
    product.name ??
    product.ProductName ??
    "Sản phẩm";

  // ----------------------------------------------------------
  // PRICE
  // ----------------------------------------------------------

  const basePrice = Number(
    product.price ??
    product.BasePrice ??
    0,
  );

  const salePrice = Number(
    product.sale_price ??
    product.SalePrice ??
    0,
  );

  const productPrice =
    salePrice > 0
      ? salePrice
      : basePrice;

  // ----------------------------------------------------------
  // IMAGE
  // ----------------------------------------------------------

  const productImage =
    color.image ??
    color.image_url ??
    product.image_url ??
    product.ImageURL ??
    product.image ??
    "";

  // ----------------------------------------------------------
  // SIZE
  // ----------------------------------------------------------

  const sizeName =
    size.size_name ??
    size.SizeName ??
    size.name ??
    size.size ??
    "42";

  // ----------------------------------------------------------
  // COLOR
  // ----------------------------------------------------------

  const colorName =
    color.color_label ??
    color.color_name ??
    color.ColorName ??
    color.name ??
    "Tiêu chuẩn";

  const colorHex =
    color.color_hex ??
    color.hex ??
    "";

  // ----------------------------------------------------------
  // VARIANT ID
  // ----------------------------------------------------------

  const normalizedVariantId =
    variantId ??
    payload.variant_id ??
    product.variant_id ??
    product.id_variant ??
    null;

  // ----------------------------------------------------------
  // ATTRIBUTES
  // ----------------------------------------------------------

  const attributes = {
    material_name:
      product.material_name ??
      product.MaterialName ??
      "",

    sole_name:
      product.sole_name ??
      product.SoleName ??
      "",

    cushioning_name:
      product.cushioning_name ??
      product.CushioningName ??
      "",

    brand_name:
      product.brand_name ??
      product.BrandName ??
      "",

    category_name:
      product.category_name ??
      product.category ??
      "",

    sport:
      product.sport ??
      product.Sport ??
      "",

    collection_name:
      product.collection_name ??
      product.CollectionName ??
      "",
  };

  // ==========================================================
  // TỒN KHO
  // ==========================================================
  //
  // QUAN TRỌNG:
  //
  // stockQuantity chỉ dùng để KIỂM TRA.
  //
  // Không trừ:
  //
  // product.stock_quantity
  // product.total_stock
  // variant.stock
  //
  // ==========================================================

  const hasFreshStock =
    (stockQuantity !== null && stockQuantity !== undefined) ||
    (product.stock_quantity !== null && product.stock_quantity !== undefined) ||
    (product.total_stock !== null && product.total_stock !== undefined);

  let stock = Number(
    stockQuantity ??
      product.stock_quantity ??
      product.total_stock ??
      0,
  );

  if (!Number.isFinite(stock) || stock < 0) {
    stock = 0;
  }

  // ==========================================================
  // QUANTITY
  // ==========================================================

  const requestedQuantity =
    Number(quantity);

  if (
    !Number.isFinite(
      requestedQuantity,
    ) ||
    !Number.isInteger(requestedQuantity) ||
    requestedQuantity < 1
  ) {
    return {
      ok: false,
      message: "Số lượng không hợp lệ.",
    };
  }

  // ==========================================================
  // ID CHI TIẾT GIỎ
  // ==========================================================
  //
  // Có variant ID:
  //
  // 10_variant_101
  // 10_variant_102
  //
  // => 2 biến thể khác nhau.
  //
  // Không có variant ID:
  //
  // product + size + color
  //
  // ==========================================================

  const detailId =
    normalizedVariantId !== null &&
    normalizedVariantId !== undefined
      ? `${productId}_variant_${normalizedVariantId}`
      : `${productId}_${String(sizeName)}_${String(colorName)}`;

  // ==========================================================
  // TÌM ITEM ĐÃ CÓ
  // ==========================================================

  const existingItem =
    cartState.items.find(
      (item) =>
        item.id_product_detail ===
        detailId,
    );

  // ==========================================================
  // ITEM ĐÃ CÓ
  // ==========================================================

  if (existingItem) {
    const currentQuantity =
      Number(existingItem.quantity || 0);

    const newQuantity =
      currentQuantity +
      requestedQuantity;

    // Nếu API không gửi stock mới,
    // dùng stock đã lưu trong cart.
    const currentStock = hasFreshStock
      ? stock
      : Number(existingItem.stockQuantity ?? 0);

    if (newQuantity > currentStock) {
      return {
        ok: false,
        message:
          `Biến thể này chỉ còn ${currentStock} sản phẩm trong kho.`,
      };
    }

    // CHỈ TĂNG SỐ LƯỢNG CART
    existingItem.quantity =
      newQuantity;

    // Lưu snapshot tồn kho
    existingItem.stockQuantity =
      currentStock;

    existingItem.isOutOfStock = false;
    existingItem.hasInsufficientStock = false;
    existingItem.stockAvailability = "available";
    existingItem.stockCheckedAt = Date.now();

    existingItem.unitPrice =
      productPrice;

    existingItem.product = {
      ...existingItem.product,

      product_name:
        productName,

      price:
        productPrice,

      image_url:
        productImage,

      ...attributes,
    };

    return {
      ok: true,
      message:
        "Đã cập nhật số lượng.",
    };
  }

  // ==========================================================
  // ITEM MỚI
  // ==========================================================

  if (requestedQuantity > stock) {
    return {
      ok: false,
      message:
        stock <= 0
          ? `Size ${sizeName} - ${colorName} đã hết hàng.`
          : `Biến thể này chỉ còn ${stock} sản phẩm trong kho.`,
    };
  }

  // ==========================================================
  // THÊM CART ITEM
  // ==========================================================

  cartState.items.unshift({
    // ID duy nhất của dòng giỏ
    id_product_detail:
      detailId,

    // Product
    id_product:
      productId,

    // Variant thật
    variant_id:
      normalizedVariantId,

    // Product snapshot
    product: {
      id_product:
        productId,

      product_name:
        productName,

      price:
        productPrice,

      image_url:
        productImage,

      ...attributes,
    },

    // Size
    size: {
      size_name:
        String(sizeName),
    },

    // Color
    color: {
      color_label:
        colorName,

      color_name:
        colorName,

      color_hex:
        colorHex,
    },

    // Attributes
    attributes,

    // Quantity trong cart
    quantity:
      requestedQuantity,

    // Giá tại thời điểm thêm
    unitPrice:
      productPrice,

    // ========================================================
    // CHỈ LƯU TỒN KHO SNAPSHOT
    // KHÔNG PHẢI TỒN KHO DATABASE
    // ========================================================

    stockQuantity:
      stock,

    isOutOfStock: false,
    hasInsufficientStock: false,
    stockAvailability: "available",
    stockCheckedAt: Date.now(),
  });

  return {
    ok: true,
    message:
      "Đã thêm vào giỏ hàng.",
  };
};

// ============================================================
// INCREASE
// ============================================================

export const increaseQuantity = (
  detailId,
) => {
  const item =
    cartState.items.find(
      (i) =>
        i.id_product_detail ===
        detailId,
    );

  if (!item) {
    return {
      ok: false,
      message:
        "Không tìm thấy sản phẩm trong giỏ.",
    };
  }

  if (item.isOutOfStock) {
    return {
      ok: false,
      message: "Sản phẩm này đã hết hàng. Vui lòng chọn sản phẩm khác.",
    };
  }

  const stock =
    Number(
      item.stockQuantity || 0,
    );

  const quantity =
    Number(
      item.quantity || 0,
    );

  if (quantity + 1 > stock) {
    return {
      ok: false,
      message:
        `Biến thể này chỉ còn ${stock} sản phẩm trong kho.`,
    };
  }

  item.quantity =
    quantity + 1;

  return {
    ok: true,
    message:
      "Đã tăng số lượng.",
  };
};

// ============================================================
// DECREASE
// ============================================================

export const decreaseQuantity = (
  detailId,
) => {
  const item =
    cartState.items.find(
      (i) =>
        i.id_product_detail ===
        detailId,
    );

  if (!item) {
    return {
      ok: false,
      message:
        "Không tìm thấy sản phẩm trong giỏ.",
    };
  }

  const quantity =
    Number(
      item.quantity || 0,
    );

  if (quantity <= 1) {
    return {
      ok: false,
      message:
        "Số lượng tối thiểu là 1.",
    };
  }

  item.quantity =
    quantity - 1;

  const stock = Number(item.stockQuantity || 0);
  item.hasInsufficientStock =
    !item.isOutOfStock && quantity - 1 > stock;
  item.stockAvailability = item.isOutOfStock
    ? "out_of_stock"
    : item.hasInsufficientStock
      ? "insufficient"
      : "available";

  return {
    ok: true,
    message:
      "Đã giảm số lượng.",
  };
};

// ============================================================
// REMOVE
// ============================================================

export const removeFromCart = (
  detailId,
) => {
  const index =
    cartState.items.findIndex(
      (item) =>
        item.id_product_detail ===
        detailId,
    );

  if (index !== -1) {
    cartState.items.splice(
      index,
      1,
    );
  }
};

// ============================================================
// CLEAR CART
// ============================================================

export const clearCart = () => {
  cartState.items.splice(
    0,
    cartState.items.length,
  );
};

// ============================================================
// MINI CART
// ============================================================

export const showMiniCart = () => {
  cartState.isMiniCartOpen =
    true;
};

export const hideMiniCart = () => {
  cartState.isMiniCartOpen =
    false;
};

export const toggleMiniCart = () => {
  cartState.isMiniCartOpen =
    !cartState.isMiniCartOpen;
};
