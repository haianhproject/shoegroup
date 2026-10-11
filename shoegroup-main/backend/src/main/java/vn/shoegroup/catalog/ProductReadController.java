// Mục đích: API xem sản phẩm, sản phẩm nổi bật, tồn kho và danh sách khuyến mãi.
package vn.shoegroup.catalog;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
public class ProductReadController {
    private final ProductReadService service;
    public ProductReadController(ProductReadService service) { this.service = service; }
    @GetMapping("/api/products") public List<Map<String, Object>> products(jakarta.servlet.http.HttpServletRequest req) {
        var user=(vn.shoegroup.security.ApiUser)req.getAttribute("apiUser");
        return service.products(user!=null && user.staff());
    }
    @GetMapping("/api/v2/products") public Map<String, Object> paginated(@RequestParam Map<String, String> params) { return service.paginated(params); }
    @GetMapping("/api/v2/products/featured") public Map<String, Object> featured(@RequestParam(required = false) String limit) { return service.featured(limit); }
    @GetMapping("/api/inventory") public List<Map<String, Object>> inventory() { return service.inventory(); }
    @GetMapping("/api/inventory/alerts") public Map<String, Object> alerts(@RequestParam(required = false) String threshold) { return service.alerts(threshold); }
    @GetMapping("/api/discounts") public List<Map<String, Object>> discounts() { return service.discounts(false); }
    @GetMapping("/api/variantDiscounts") public List<Map<String, Object>> variantDiscounts() { return service.discounts(true); }
}
