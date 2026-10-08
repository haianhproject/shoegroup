// Mục đích: API tạo, sửa và xóa mã giảm giá cùng khuyến mãi theo biến thể.
package vn.shoegroup.catalog;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class DiscountController {
  private final DiscountService service;

  public DiscountController(DiscountService service) {
    this.service = service;
  }

  @PostMapping("/api/discounts")
  public Map<String, Object> coupon(@RequestBody Map<String, Object> b) {
    return service.coupon(null, b);
  }

  @PutMapping("/api/discounts/{id}")
  public Map<String, Object> coupon(@PathVariable String id, @RequestBody Map<String, Object> b) {
    return service.coupon(id, b);
  }

  @DeleteMapping("/api/discounts/{id}")
  public Map<String, Object> deleteCoupon(@PathVariable String id) {
    return service.delete(id, false);
  }

  @PostMapping("/api/variantDiscounts")
  public ResponseEntity<?> variant(@RequestBody Map<String, Object> b) {
    return ResponseEntity.status(201).body(service.variant(null, b));
  }

  @PutMapping("/api/variantDiscounts/{id}")
  public Map<String, Object> variant(@PathVariable String id, @RequestBody Map<String, Object> b) {
    return service.variant(id, b);
  }

  @DeleteMapping("/api/variantDiscounts/{id}")
  public Map<String, Object> deleteVariant(@PathVariable String id) {
    return service.delete(id, true);
  }
}
