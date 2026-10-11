// Mục đích: API tạo hoặc tìm khách hàng cho nghiệp vụ bán hàng tại quầy.
package vn.shoegroup.customer;

import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
public class CustomerAdminController {
  private final CustomerAdminService service;

  public CustomerAdminController(CustomerAdminService service) {
    this.service = service;
  }

  @PostMapping("/api/customers")
  public Map<String, Object> create(@RequestBody Map<String, Object> body) {
    return service.create(body);
  }
}
