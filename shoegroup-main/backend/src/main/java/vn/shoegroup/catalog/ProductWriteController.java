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
    if(hard.equals("1") || hard.equalsIgnoreCase("true")) throw new vn.shoegroup.api.ApiException(409,"Không được xóa sản phẩm. Hãy chuyển sang không hoạt động.");
    return service.delete(id, false);
  }

  @PutMapping("/{id}/restore")
  public Map<String, Object> restore(@PathVariable String id) {
    return service.restore(id);
  }

  @PutMapping("/{id}/status")
  public Map<String,Object> productStatus(@PathVariable String id,@RequestBody Map<String,Object> body) {
    return vn.shoegroup.api.Values.bool(body.get("active"),false) ? service.restore(id) : service.delete(id,false);
  }

  @PutMapping("/{id}/variants/{variantId}/status")
  public Map<String,Object> status(@PathVariable String id,@PathVariable String variantId,@RequestBody Map<String,Object> body) {
    return service.variantStatus(id,variantId,body);
  }
}
