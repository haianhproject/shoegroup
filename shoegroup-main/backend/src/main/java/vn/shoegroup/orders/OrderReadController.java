// Mục đích: API xem đơn hàng, khách hàng, thông báo, biểu đồ và báo cáo doanh thu.
package vn.shoegroup.orders;

import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import vn.shoegroup.api.Values;
import vn.shoegroup.security.ApiUser;

@RestController
public class OrderReadController {
  private final OrderReadService service;

  public OrderReadController(OrderReadService service) {
    this.service = service;
  }

  @GetMapping("/api/orders")
  public List<Map<String, Object>> orders() {
    return service.orders(null);
  }

  @GetMapping("/api/customers")
  public List<Map<String, Object>> customers() {
    return service.list("/api/customers");
  }

  @GetMapping("/api/customers/{id}/orders")
  public List<Map<String, Object>> customerOrders(@PathVariable String id) {
    return service.orders(Values.integer(id, 1, Integer.MAX_VALUE, null));
  }

  @GetMapping("/api/customers/{id}/notifications")
  public List<Map<String, Object>> notifications(@PathVariable String id) {
    return service.notifications(Values.integer(id, 1, Integer.MAX_VALUE, null));
  }

  @GetMapping("/api/revenue-by-product")
  public List<Map<String, Object>> revenue() {
    return service.list("/api/revenue-by-product");
  }

  @GetMapping("/api/chart-data")
  public List<Map<String, Object>> chart(@RequestParam Map<String, String> query) {
    return service.chart(query);
  }

  @GetMapping("/api/v2/dashboard/summary")
  public Map<String, Object> summary() {
    return service.summary();
  }

  @GetMapping("/api/v2/orders")
  public Map<String, Object> paginated(
      HttpServletRequest req, @RequestParam Map<String, String> query) {
    return service.paginated((ApiUser) req.getAttribute("apiUser"), query);
  }
}
