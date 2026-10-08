// Mục đích: API đặt đơn và cập nhật trạng thái, thanh toán, xác nhận nhận hàng, địa chỉ.
package vn.shoegroup.orders;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import vn.shoegroup.api.Values;
import vn.shoegroup.security.ApiUser;

@RestController
public class OrderWriteController {
  private final CheckoutService checkout;
  private final OrderWorkflow workflow;

  public OrderWriteController(CheckoutService checkout, OrderWorkflow workflow) {
    this.checkout = checkout;
    this.workflow = workflow;
  }

  private ApiUser user(HttpServletRequest request) {
    return (ApiUser) request.getAttribute("apiUser");
  }

  private int id(String value) {
    return Values.integer(value, 1, Integer.MAX_VALUE, null);
  }

  @PostMapping("/api/orders")
  public Map<String, Object> create(HttpServletRequest req, @RequestBody Map<String, Object> body) {
    return checkout.checkout(user(req), req.getHeader("Idempotency-Key"), body);
  }

  @PutMapping("/api/orders/{id}/status")
  public Map<String, Object> status(
      HttpServletRequest req, @PathVariable String id, @RequestBody Map<String, Object> body) {
    return workflow.status(id(id), user(req), body);
  }

  @PutMapping("/api/orders/{id}/payment")
  public Map<String, Object> payment(
      HttpServletRequest req, @PathVariable String id, @RequestBody Map<String, Object> body) {
    return workflow.payment(id(id), user(req), body);
  }

  @PutMapping("/api/orders/{id}/address")
  public Map<String, Object> address(
      HttpServletRequest req, @PathVariable String id, @RequestBody Map<String, Object> body) {
    return workflow.address(id(id), user(req), body);
  }

  @PutMapping("/api/orders/{id}/receive")
  public Map<String, Object> receive(HttpServletRequest req, @PathVariable String id) {
    return workflow.receive(id(id), user(req));
  }
}
