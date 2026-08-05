import { computed, reactive, watch } from "vue";

// Bump storage key when the item shape changes so old, incompatible carts are dropped.
const STORAGE_KEY = "shoegroup_cart_v3";

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
    }).format(Number(value || 0))
  );
};

export const cartItems = computed(() => {
  return cartState.items.map((item) => ({
    ...item,
    subtotal: item.unitPrice * item.quantity,
  }));
});

export const cartCount = computed(() =>
  cartState.items.reduce((total, item) => total + item.quantity, 0),
);

export const cartSubtotal = computed(() =>
  cartItems.value.reduce((total, item) => total + item.subtotal, 0),
);

// Standard flat fee shown in the mini-cart; the real fee is computed at checkout.
export const cartShippingFee = computed(() => (cartCount.value > 0 ? 30000 : 0));

export const cartTotal = computed(() => cartSubtotal.value + cartShippingFee.value);

/**
 * Add a product to the cart, storing the FULL set of shoe attributes so the
 * mini-cart, cart page and order detail can all display them consistently.
 */
export const addToCart = (payload) => {
  const {
    product,
    quantity = 1,
    size = { size_name: "42" },
    color = { color_label: "Ti\u00eau chu\u1ea9n" },
  } = payload;

  if (!product) return { ok: false, message: "S\u1ea3n ph\u1ea9m kh\u00f4ng h\u1ee3p l\u1ec7." };

  const productId = product.id_product || product.id || product.ProductID;
  const productName = product.product_name || product.name || product.ProductName;
  const basePrice = product.price || product.BasePrice || 0;
  const salePrice = Number(product.sale_price || product.SalePrice || 0);
  const productPrice = salePrice > 0 ? salePrice : basePrice;
  const productImage = color.image || product.image_url || product.ImageURL || product.image;

  const sizeName = size.size_name || size.SizeName || "42";
  const colorName = color.color_label || color.color_name || color.ColorName || "Ti\u00eau chu\u1ea9n";
  const colorHex = color.color_hex || color.hex || "";

  // Full attribute snapshot pulled from the product record (from the DB API).
  const attributes = {
    material_name: product.material_name || product.MaterialName || "",
    sole_name: product.sole_name || product.SoleName || "",
    cushioning_name: product.cushioning_name || product.CushioningName || "",
    brand_name: product.brand_name || product.BrandName || "",
    category_name: product.category_name || product.category || "",
    sport: product.sport || product.Sport || "",
    collection_name: product.collection_name || product.CollectionName || "",
  };

  const detailId = `${productId}_${sizeName}_${colorName}`;
  const existingItem = cartState.items.find((i) => i.id_product_detail === detailId);
  const stockQuantity = Number(payload.stockQuantity ?? product.stock_quantity ?? product.total_stock ?? 100);

  if (existingItem) {
    existingItem.stockQuantity = stockQuantity; // Cập nhật tồn kho mới nhất
    if (existingItem.quantity + quantity > existingItem.stockQuantity) {
      return { ok: false, message: `Số lượng vượt quá tồn kho (còn ${existingItem.stockQuantity})` };
    }
    existingItem.quantity += quantity;
    existingItem.unitPrice = productPrice;
    existingItem.product.price = productPrice;
    existingItem.product.image_url = productImage;
    return { ok: true, message: "\u0110\u00e3 c\u1eadp nh\u1eadt s\u1ed1 l\u01b0\u1ee3ng." };
  }

  if (quantity > stockQuantity) {
    return { ok: false, message: `Số lượng vượt quá tồn kho (còn ${stockQuantity})` };
  }

  cartState.items.unshift({
    id_product_detail: detailId,
    id_product: productId,
    product: {
      id_product: productId,
      product_name: productName,
      price: productPrice,
      image_url: productImage,
      ...attributes,
    },
    size: { size_name: sizeName },
    color: { color_label: colorName, color_name: colorName, color_hex: colorHex },
    attributes,
    quantity,
    unitPrice: productPrice,
    stockQuantity,
  });

  return { ok: true, message: "\u0110\u00e3 th\u00eam v\u00e0o gi\u1ecf h\u00e0ng." };
};

export const increaseQuantity = (detailId) => {
  const item = cartState.items.find((i) => i.id_product_detail === detailId);
  if (!item) return { ok: false, message: "L\u1ed7i" };
  if (item.quantity + 1 > item.stockQuantity) {
    return { ok: false, message: `Số lượng vượt quá tồn kho (còn ${item.stockQuantity})` };
  }
  item.quantity += 1;
  return { ok: true, message: "Th\u00e0nh c\u00f4ng" };
};

export const decreaseQuantity = (detailId) => {
  const item = cartState.items.find((i) => i.id_product_detail === detailId);
  if (!item) return { ok: false, message: "L\u1ed7i" };
  if (item.quantity <= 1) return { ok: false, message: "S\u1ed1 l\u01b0\u1ee3ng t\u1ed1i thi\u1ec3u l\u00e0 1" };
  item.quantity -= 1;
  return { ok: true, message: "Th\u00e0nh c\u00f4ng" };
};

export const removeFromCart = (detailId) => {
  const index = cartState.items.findIndex((i) => i.id_product_detail === detailId);
  if (index !== -1) cartState.items.splice(index, 1);
};

export const clearCart = () => { cartState.items.splice(0); };
export const showMiniCart = () => { cartState.isMiniCartOpen = true; };
export const hideMiniCart = () => { cartState.isMiniCartOpen = false; };
export const toggleMiniCart = () => { cartState.isMiniCartOpen = !cartState.isMiniCartOpen; };
