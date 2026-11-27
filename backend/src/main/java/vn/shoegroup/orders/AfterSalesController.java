// Mục đích: API hàng trả, kiểm nhận hoàn kho, hàng hỏng và ghi nhận hoàn tiền thực tế.
package vn.shoegroup.orders;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import vn.shoegroup.api.Values;
import vn.shoegroup.security.ApiUser;
import vn.shoegroup.events.AdminEvents;

@RestController
public class AfterSalesController {
  private final AfterSalesService service;
  private final AdminEvents events;
  public AfterSalesController(AfterSalesService service,AdminEvents events) { this.service=service;this.events=events; }
  private void stock(int order,int variant) { events.publish("inventory.updated",Map.of("source","after_sales","stockUpdates",service.stockUpdates(order,variant))); }
  private ApiUser user(HttpServletRequest request) { return (ApiUser)request.getAttribute("apiUser"); }
  private int id(String value) { return Values.integer(value,1,Integer.MAX_VALUE,null); }
  @GetMapping("/api/orders/{id}/after-sales")
  public Map<String,Object> detail(HttpServletRequest req,@PathVariable String id) { return service.detail(id(id),user(req)); }
  @PostMapping("/api/orders/{id}/returns")
  public Map<String,Object> create(HttpServletRequest req,@PathVariable String id,@RequestBody Map<String,Object> body) { return service.create(id(id),user(req),body); }
  @GetMapping("/api/returns")
  public Object list(@RequestParam Map<String,String> query) { return service.list(query); }
  @PostMapping("/api/returns/{id}/review")
  public Map<String,Object> review(HttpServletRequest req,@PathVariable String id,@RequestBody Map<String,Object> body) { return service.review(id(id),user(req),body); }
  @PostMapping("/api/returns/{id}/receive")
  public Map<String,Object> receive(HttpServletRequest req,@PathVariable String id,@RequestBody Map<String,Object> body) { var result=service.receive(id(id),user(req),body);stock(((Number)result.get("order_id")).intValue(),0);return result; }
  @PostMapping("/api/orders/{id}/warehouse-return")
  public Map<String,Object> warehouse(HttpServletRequest req,@PathVariable String id,@RequestBody Map<String,Object> body) { var result=service.warehouse(id(id),user(req),body);stock(id(id),0);return result; }
  @PostMapping("/api/orders/{id}/refunds/{transaction}/confirm")
  public Map<String,Object> refund(HttpServletRequest req,@PathVariable String id,@PathVariable String transaction,@RequestBody Map<String,Object> body) { return service.confirmRefund(id(id),id(transaction),user(req),body); }
  @GetMapping("/api/inventory/damaged")
  public Object damaged() { return service.damaged(); }
  @PostMapping("/api/inventory/damaged/{id}/resolve")
  public Map<String,Object> resolve(HttpServletRequest req,@PathVariable String id,@RequestBody Map<String,Object> body) { var result=service.resolveDamage(id(id),user(req),body);stock(0,id(id));return result; }
}
