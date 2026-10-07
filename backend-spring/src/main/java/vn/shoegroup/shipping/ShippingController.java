package vn.shoegroup.shipping;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
public class ShippingController {
    private final ShippingService shipping;
    public ShippingController(ShippingService shipping) { this.shipping = shipping; }
    @GetMapping("/api/shippingmethods") public List<Map<String, Object>> methods() { return shipping.methods(); }
    @PostMapping("/api/shipping/quote") public Map<String, Object> quote(@RequestBody Map<String, Object> body) { return shipping.quote(body); }
}
