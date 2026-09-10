# ShoeGroup customer UI — Figma design system

Nguồn chuẩn: `all figma bán giày/src/App.vue`, `src/ProductCard.vue` và `src/index.css`.

## Tokens

| Nhóm | Quy chuẩn |
| --- | --- |
| Font nội dung | Be Vietnam Pro |
| Font tiêu đề/display | Fraunces |
| Màu chữ | `#0E0E0E` |
| Màu phụ | `#737373` |
| Nền phụ | `#F0F0F0` |
| Đường viền | `#E5E5E5` |
| Bo góc | 4px controls, 12px cards, 16px media/section |
| Container | tối đa 1400px, padding co giãn theo viewport |
| Hover | chuyển màu/scale nhẹ, không làm thay đổi kích thước layout |

## Component mapping

| Figma component | ShoeGroup component | Dữ liệu/logic |
| --- | --- | --- |
| Header | `src/components/figma/layout/FigmaNavbar.vue` | Vue Router, authStore, cartStore, `/products`, `/categories` |
| Footer | `src/components/figma/layout/FigmaFooter.vue` | Router links tới các route khách hàng |
| Product card | `src/components/ShoeCard.vue` qua `FigmaProductCard.vue` | `GET /products`, giá/giảm giá/brand/category/variant/stock |
| Product grid | `src/components/figma/product/FigmaProductGrid.vue` | phân trang và bộ lọc của ProductsView |
| Customer shell | `src/layouts/FigmaCustomerLayout.vue` | dùng chung cho mọi route không phải admin |
| Hero | `src/views/HomeDisplay.vue` | banner Figma, slide video Pexels, autoplay/loop/muted/playsinline |

## API to UI mapping

`GET /products` → `HomeDisplay` (featured) và `ProductsView` (listing/filter) → `ShoeCard`.

`GET /categories` → category cards, category filter và menu danh mục.

`ProductDetail` giữ nguyên `GET /products`, chọn đúng `variant.id`, size, màu và tồn kho trước khi gọi `addToCart`.

`cartStore` vẫn là nguồn trạng thái duy nhất cho cart count, drawer, quantity và stock snapshot. Checkout, account, orders và auth tiếp tục dùng các API/store hiện có.

## Route contract

Tất cả route khách hàng được render bên trong `FigmaCustomerLayout`. Router guard và các route admin giữ nguyên. `/cart` tiếp tục mở cart drawer rồi trả nền về homepage theo nghiệp vụ cũ.

## Verification

- `npm run build` thành công.
- API SQL trả về 6 sản phẩm, 4 danh mục; product có variant, stock và image.
- Đã kiểm tra homepage, product listing, category query, product detail, cart drawer và checkout auth guard trên trình duyệt.
- Không còn dependency/import Bootstrap hoặc Bootstrap Icons; toàn bộ icon customer dùng SVG/local icon mapping.
