import { reactive } from "vue";

/* =====================================================================
   mockData — dữ liệu mẫu dùng khi API chưa sẵn sàng (fallback).
   Được mở rộng đầy đủ thuộc tính giày thể thao nam:
   thương hiệu, danh mục/bộ môn, màu, size, chất liệu, đế, đệm...
   ===================================================================== */

export const brands = [
  { id_brand: 1, brand_name: "Nike" },
  { id_brand: 2, brand_name: "Adidas" },
  { id_brand: 3, brand_name: "Puma" },
  { id_brand: 4, brand_name: "New Balance" },
];

/* Danh mục gắn bộ môn thể thao */
export const categories = [
  { id_category: 1, category_name: "Chạy bộ", sport: "Running" },
  { id_category: 2, category_name: "Sneakers", sport: "Lifestyle" },
  { id_category: 3, category_name: "Bóng rổ", sport: "Basketball" },
  { id_category: 4, category_name: "Bóng đá", sport: "Football" },
  { id_category: 5, category_name: "Tennis", sport: "Tennis" },
  { id_category: 6, category_name: "Tập Gym", sport: "Training" },
];

export const sports = ["Running", "Lifestyle", "Basketball", "Football", "Tennis", "Training"];

export const sizes = [
  { id_size: 1, size_name: "39" },
  { id_size: 2, size_name: "40" },
  { id_size: 3, size_name: "41" },
  { id_size: 4, size_name: "42" },
  { id_size: 5, size_name: "43" },
  { id_size: 6, size_name: "44" },
];

export const colors = [
  { id_color: 1, color_name: "Black", color_label: "Đen", hex: "#1e293b" },
  { id_color: 2, color_name: "White", color_label: "Trắng", hex: "#f8fafc" },
  { id_color: 3, color_name: "Red", color_label: "Đỏ", hex: "#ef4444" },
  { id_color: 4, color_name: "Blue", color_label: "Xanh dương", hex: "#2563eb" },
  { id_color: 5, color_name: "Green", color_label: "Xanh lá", hex: "#22c55e" },
  { id_color: 6, color_name: "Orange", color_label: "Cam", hex: "#ff5a1f" },
];

export const materials = [
  { id_material: 1, material_name: "Lưới Flyknit" },
  { id_material: 2, material_name: "Da tổng hợp" },
  { id_material: 3, material_name: "Da lộn" },
  { id_material: 4, material_name: "Vải mesh thoáng khí" },
  { id_material: 5, material_name: "Primeknit" },
];

export const soles = [
  { id_sole: 1, sole_name: "Cao su Waffle" },
  { id_sole: 2, sole_name: "Continental Rubber" },
  { id_sole: 3, sole_name: "Cao su non-marking" },
];

export const cushionings = [
  { id_cushioning: 1, cushioning_name: "Nike Air Zoom" },
  { id_cushioning: 2, cushioning_name: "Adidas Boost" },
  { id_cushioning: 3, cushioning_name: "Puma Nitro" },
  { id_cushioning: 4, cushioning_name: "Fresh Foam" },
];

export const collections = [
  { id_collection: 1, collection_name: "Summer 2026" },
  { id_collection: 2, collection_name: "Pro Athlete" },
  { id_collection: 3, collection_name: "Urban Street" },
];

/* Phương thức vận chuyển dùng khi API chưa sẵn sàng. Giá cuối cùng vẫn
   được tính lại ở máy chủ theo địa chỉ, không tin số tiền từ trình duyệt. */
export const shippingMethods = [
  {
    code: "STANDARD",
    name: "Giao hàng tiêu chuẩn",
    basePrice: 30000,
    pricePerKm: 0,
    eta: "2 - 3 ngày",
    originCity: "Hai Bà Trưng, Hà Nội",
    desc: "Giao tiết kiệm, tính theo khu vực nhận hàng.",
  },
];

/* Khoảng cách ước lượng từ kho Hai Bà Trưng, Hà Nội (km) theo tỉnh/thành (key viết thường) */
export const distanceFromHanoi = {
  "hai bà trưng": 5,
  "hà nội": 8,
  "hanoi": 8,
  "bắc ninh": 35,
  "hưng yên": 40,
  "hải dương": 60,
  "vĩnh phúc": 55,
  "thái nguyên": 80,
  "nam định": 90,
  "hải phòng": 120,
  "quảng ninh": 175,
  "thanh hóa": 160,
  "nghệ an": 300,
  "vinh": 300,
  "hà tĩnh": 340,
  "huế": 660,
  "đà nẵng": 770,
  "quảng nam": 820,
  "quy nhơn": 1060,
  "nha trang": 1280,
  "khánh hòa": 1280,
  "đà lạt": 1480,
  "lâm đồng": 1480,
  "vũng tàu": 1780,
  "bình dương": 1700,
  "đồng nai": 1680,
  "hồ chí minh": 1720,
  "tp hcm": 1720,
  "tphcm": 1720,
  "sài gòn": 1720,
  "cần thơ": 1880,
};

/* Bưu cục cho khách tự gửi trả hàng */
export const postOffices = [
  { id: 1, name: "Bưu cục Hoàn Kiếm", address: "75 Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội", phone: "024 3825 1234" },
  { id: 2, name: "Bưu cục Cầu Giấy", address: "162 Cầu Giấy, Cầu Giấy, Hà Nội", phone: "024 3767 5678" },
  { id: 3, name: "Bưu cục Bến Thành", address: "2 Công xã Paris, Quận 1, TP HCM", phone: "028 3822 9012" },
  { id: 4, name: "Bưu cục Hải Châu", address: "271 Nguyễn Văn Linh, Hải Châu, Đà Nẵng", phone: "0236 3654 321" },
];

/* Sản phẩm giày thể thao nam với đầy đủ thuộc tính */
export const products = [
  {
    id_product: 1, id_brand: 1, id_category: 1,
    product_name: "Nike Air Zoom Pegasus 40", price: 2899000,
    description: "Giày chạy bộ chuyên nghiệp, siêu nhẹ và thoáng khí, hoàn trả năng lượng cao.",
    image_url: "/img/banner2.png",
    brand_name: "Nike", category_name: "Chạy bộ", sport: "Running",
    material_name: "Lưới Flyknit", sole_name: "Cao su Waffle", cushioning_name: "Nike Air Zoom",
    collection_name: "Pro Athlete",
  },
  {
    id_product: 2, id_brand: 2, id_category: 1,
    product_name: "Adidas Ultraboost 22", price: 3499000,
    description: "Giày chạy bộ êm ái với đệm Boost trứng danh, ôm chân chắc chắn.",
    image_url: "/img/banner2.png",
    brand_name: "Adidas", category_name: "Chạy bộ", sport: "Running",
    material_name: "Primeknit", sole_name: "Continental Rubber", cushioning_name: "Adidas Boost",
    collection_name: "Summer 2026",
  },
  {
    id_product: 3, id_brand: 3, id_category: 2,
    product_name: "Puma RS-X3 Puzzle", price: 2199000,
    description: "Thiết kế retro pha lẫn hiện đại, phong cách đường phố cực chất.",
    image_url: "/img/banner1.png",
    brand_name: "Puma", category_name: "Sneakers", sport: "Lifestyle",
    material_name: "Da tổng hợp", sole_name: "Cao su non-marking", cushioning_name: "Puma Nitro",
    collection_name: "Urban Street",
  },
  {
    id_product: 4, id_brand: 1, id_category: 3,
    product_name: "Nike LeBron 21", price: 4299000,
    description: "Giày bóng rổ có túi khí bảo vệ chấn thương, bám sân tốt.",
    image_url: "/img/banner1.png",
    brand_name: "Nike", category_name: "Bóng rổ", sport: "Basketball",
    material_name: "Vải mesh thoáng khí", sole_name: "Cao su Waffle", cushioning_name: "Nike Air Zoom",
    collection_name: "Pro Athlete",
  },
  {
    id_product: 5, id_brand: 4, id_category: 6,
    product_name: "New Balance Fresh Foam X", price: 2699000,
    description: "Giày tập gym ổn định, đệm Fresh Foam êm ái cho buổi tập dài.",
    image_url: "/img/banner2.png",
    brand_name: "New Balance", category_name: "Tập Gym", sport: "Training",
    material_name: "Vải mesh thoáng khí", sole_name: "Cao su non-marking", cushioning_name: "Fresh Foam",
    collection_name: "Summer 2026",
  },
  {
    id_product: 6, id_brand: 2, id_category: 4,
    product_name: "Adidas Predator Edge", price: 3199000,
    description: "Giày bóng đá bám sân cỏ, kiểm soát bóng chính xác.",
    image_url: "/img/banner3.png",
    brand_name: "Adidas", category_name: "Bóng đá", sport: "Football",
    material_name: "Da tổng hợp", sole_name: "Continental Rubber", cushioning_name: "Adidas Boost",
    collection_name: "Pro Athlete",
  },
];

let detailId = 1;
export const product_details = reactive(
  products.flatMap((product) =>
    sizes.flatMap((size) =>
      colors.map((color) => ({
        id_product_detail: detailId++,
        id_product: product.id_product,
        id_size: size.id_size,
        id_color: color.id_color,
        stock_quantity: 6,
        stock_quality: 6,
      })),
    ),
  ),
);

export const users = [
  {
    id_user: 1, username: "admin", full_name: "Quản trị viên",
    email: "admin@shoegroup.vn", phone: "0900000000", password: "123456",
    address: "Số 1, Đường Lê Duẩn, Quận 1, TP HCM", role: "Admin",
  },
  {
    id_user: 2, username: "customer1", full_name: "Nguyễn Văn A",
    email: "customer1@shoegroup.vn", phone: "0987654321", password: "123456",
    address: "Số 10, Cầu Giấy, Hà Nội", role: "Customer",
  },
];
