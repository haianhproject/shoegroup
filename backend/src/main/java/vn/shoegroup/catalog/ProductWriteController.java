// Mục đích: API thêm, sửa, ngừng bán, xóa và khôi phục sản phẩm.
package vn.shoegroup.catalog;

import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
public class ProductWriteController {
  private final ProductWriteService service;

  public ProductWriteController(ProductWriteService service) {
    this.service = service;
  }

  @PostMapping
  public Map<String, Object> create(@RequestBody Map<String, Object> body) {
    return service.save(null, body);
  }

  @PutMapping("/{id}")
  public Map<String, Object> update(
      @PathVariable String id, @RequestBody Map<String, Object> body) {
    return service.save(id, body);
  }

  @DeleteMapping("/{id}")
  public Map<String, Object> delete(
      @PathVariable String id, @RequestParam(defaultValue = "false") String hard) {
    return service.delete(id, hard.equals("1") || hard.equals("true"));
  }

  @PutMapping("/{id}/restore")
  public Map<String, Object> restore(@PathVariable String id) {
    return service.restore(id);
  }
}
