export const brands = [
  { id_brand: 1, brand_name: "Nike" },
  { id_brand: 2, brand_name: "Adidas" },
  { id_brand: 3, brand_name: "Puma" }
];

export const categories = [
  { id_category: 1, category_name: "Running" },
  { id_category: 2, category_name: "Sneakers" },
  { id_category: 3, category_name: "Basketball" }
];

export const sizes = [
  { id_size: 1, size_name: "39" },
  { id_size: 2, size_name: "40" },
  { id_size: 3, size_name: "41" },
  { id_size: 4, size_name: "42" }
];

export const colors = [
  { id_color: 1, color_name: "Black" },
  { id_color: 2, color_name: "White" },
  { id_color: 3, color_name: "Red" }
];

export const products = [
  {
    id_product: 1,
    id_brand: 1,
    id_category: 1,
    product_name: "Nike Air Zoom Pegasus 39",
    price: 120.00,
    description: "Giày chạy bộ chuyên nghiệp, siêu nhẹ và thoải mái.",
    image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80"
  },
  {
    id_product: 2,
    id_brand: 2,
    id_category: 2,
    product_name: "Adidas Ultraboost 22",
    price: 190.00,
    description: "Giày đi bộ thoải mái, năng lượng hoàn trả tốt.",
    image_url: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80"
  },
  {
    id_product: 3,
    id_brand: 3,
    id_category: 2,
    product_name: "Puma RS-X3",
    price: 110.00,
    description: "Thiết kế retro pha lẫn hiện đại cực chất.",
    image_url: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&q=80"
  },
  {
    id_product: 4,
    id_brand: 1,
    id_category: 3,
    product_name: "Nike Lebron 19",
    price: 200.00,
    description: "Giày bóng rổ có túi khí bảo vệ chấn thương.",
    image_url: "https://images.unsplash.com/photo-1552346154-21d32810baa3?w=500&q=80"
  }
];

export const product_details = [
  { id_product_detail: 1, id_product: 1, id_size: 2, id_color: 1, stock_quantity: 15 },
  { id_product_detail: 2, id_product: 1, id_size: 3, id_color: 2, stock_quantity: 5 }
];

export const users = [
  { id_user: 1, username: "admin", role: "Admin" },
  { id_user: 2, username: "customer1", role: "Customer" }
];
