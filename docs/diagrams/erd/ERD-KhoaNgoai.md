# Chi tiết 31 khóa ngoại trong ERD ShoeGroup

Đọc mũi tên: **cột FK ở bảng con → cột PK ở bảng cha**. Bội số là số dòng con tối đa/tối thiểu cho một dòng cha; FK đơn thuần không bắt buộc cha phải có con.

| FK ở bảng con → PK ở bảng cha | Số dòng con / một dòng cha | FK được NULL | Khi xóa cha |
| --- | --- | --- | --- |
| CheckoutRequests.OrderID → Orders.OrderID | 0..1 (UNIQUE) | Không | NO_ACTION |
| CheckoutRequests.UserID → Users.UserID | 0..N | Không | NO_ACTION |
| CouponRedemptions.CouponID → Coupons.CouponID | 0..N | Không | NO_ACTION |
| CouponRedemptions.OrderID → Orders.OrderID | 0..1 (UNIQUE) | Không | NO_ACTION |
| CouponRedemptions.UserID → Users.UserID | 0..N | Có | NO_ACTION |
| OrderDetails.OrderID → Orders.OrderID | 0..N | Có | CASCADE |
| OrderDetails.ProductID → Products.ProductID | 0..N | Có | CASCADE |
| Orders.UserID → Users.UserID | 0..N | Có | NO_ACTION |
| Products.BrandID → Brands.BrandID | 0..N | Có | NO_ACTION |
| Products.CategoryID → Categories.CategoryID | 0..N | Có | NO_ACTION |
| Users.RoleID → Roles.RoleID | 0..N | Có | NO_ACTION |
| CartItems.CartID → Carts.CartID | 0..N | Không | CASCADE |
| CartItems.ProductVariantID → ProductVariants.ProductVariantID | 0..N | Không | NO_ACTION |
| Carts.UserID → Users.UserID | 0..1 (UNIQUE) | Không | CASCADE |
| Notifications.UserID → Users.UserID | 0..N | Không | NO_ACTION |
| OrderDetails.ProductVariantID → ProductVariants.ProductVariantID | 0..N | Có | NO_ACTION |
| Orders.ShippingMethodID → ShippingMethods.ShippingMethodID | 0..N | Có | NO_ACTION |
| Orders.AddressID → UserAddresses.AddressID | 0..N | Có | NO_ACTION |
| OrderStatusHistory.OrderID → Orders.OrderID | 0..N | Không | NO_ACTION |
| PosCartItems.UserID → PosCarts.UserID | 0..N | Không | NO_ACTION |
| PosCartItems.ProductVariantID → ProductVariants.ProductVariantID | 0..N | Không | NO_ACTION |
| PosCarts.UserID → Users.UserID | 0..1 (UNIQUE) | Không | NO_ACTION |
| ProductImages.ProductID → Products.ProductID | 0..N | Không | NO_ACTION |
| Products.MaterialID → Materials.MaterialID | 0..N | Có | NO_ACTION |
| ProductVariants.ColorID → Colors.ColorID | 0..N | Có | NO_ACTION |
| ProductVariants.ProductID → Products.ProductID | 0..N | Không | NO_ACTION |
| ProductVariants.SizeID → Sizes.SizeID | 0..N | Có | NO_ACTION |
| PaymentTransactions.OrderID → Orders.OrderID | 0..N | Không | NO_ACTION |
| UserAddresses.UserID → Users.UserID | 0..N | Không | NO_ACTION |
| VariantDiscounts.ProductID → Products.ProductID | 0..N | Có | NO_ACTION |
| VariantDiscounts.ProductVariantID → ProductVariants.ProductVariantID | 0..N | Không | NO_ACTION |

`NO_ACTION`: chặn xóa cha nếu còn con tham chiếu. `CASCADE`: SQL Server tự xóa dòng con liên quan, nhưng toàn lệnh vẫn có thể bị một FK khác chặn.

Mọi FK hiện tại đều có ON UPDATE NO_ACTION. Các UNIQUE ghép không có nghĩa từng cột riêng lẻ là duy nhất.

UNIQUE ghép đáng chú ý: CartItems(CartID, ProductVariantID); PosCartItems(UserID, ProductVariantID); ProductVariants(ProductID, ColorName, Size). CheckoutRequests có PK ghép (UserID, IdempotencyKey).

Các cột giống ID nhưng chưa có FK vật lý: OrderDetails.VariantDiscountID, OrderStatusHistory.ChangedBy, Notifications.RelatedID. Không tự suy diễn thành đường nối FK.

PosCarts.UserID vừa là PK vừa là FK đến Users; mỗi tài khoản có tối đa một giỏ tại quầy.