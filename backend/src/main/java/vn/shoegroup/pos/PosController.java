// Mục đích: API giỏ bán hàng tại quầy và cấu hình ngân hàng để tạo mã QR thanh toán.
package vn.shoegroup.pos;

import jakarta.servlet.http.HttpServletRequest;
import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.*;
import vn.shoegroup.api.ApiException;
import vn.shoegroup.api.Values;
import vn.shoegroup.events.AdminEvents;
import vn.shoegroup.security.ApiUser;

@RestController
public class PosController {
    private final PosCartService carts;
    private final AdminEvents events;
    private final Environment env;
    public PosController(PosCartService carts, AdminEvents events, Environment env) { this.carts = carts; this.events = events; this.env = env; }
    @GetMapping("/api/pos/cart") public Map<String, Object> cart(HttpServletRequest req) { return handle(req, null, null, Map.of()); }
    @PutMapping("/api/pos/cart/items/{variantId}") public Map<String, Object> change(HttpServletRequest req, @PathVariable String variantId, @RequestBody Map<String, Object> body) {
        return handle(req, "item", Values.integer(variantId, 1, Integer.MAX_VALUE, null), body);
    }
    @DeleteMapping("/api/pos/cart") public Map<String, Object> clear(HttpServletRequest req, @RequestBody Map<String, Object> body) { return handle(req, "clear", null, body); }
    private Map<String, Object> handle(HttpServletRequest req, String action, Integer variantId, Map<String, Object> body) {
        ApiUser user = (ApiUser)req.getAttribute("apiUser");
        if (user == null || !user.admin()) throw new ApiException(403, "Chi nhan vien duoc su dung gio tai quay.");
        Map<String, Object> response = carts.handle(user.id(), action, variantId, body);
        if (action != null) events.publish("inventory.updated", Map.of("source", "pos", "userId", user.id(), "stockUpdates", response.get("stockUpdates")));
        return response;
    }
    @GetMapping("/api/pos/payment-config") public Map<String, Object> bank() {
        String id = Values.text(env.getProperty("POS_BANK_ID"), 20);
        String name = Values.text(env.getProperty("POS_BANK_NAME"), 100); if (name.isEmpty()) name = id;
        String account = Values.text(env.getProperty("POS_BANK_ACCOUNT_NO"), 30).replaceAll("\\s+", "");
        String owner = Normalizer.normalize(Values.text(env.getProperty("POS_BANK_ACCOUNT_NAME"), 100), Normalizer.Form.NFD)
            .replaceAll("[\\u0300-\\u036f]", "").replaceAll("[^a-zA-Z0-9 ]", " ").replaceAll("\\s+", " ").trim();
        owner = Values.text(owner, 50).toUpperCase(java.util.Locale.ROOT);
        boolean configured = id.matches("[a-zA-Z0-9]{2,20}") && account.matches("\\d{6,19}") && owner.length() >= 5;
        Map<String, Object> result = new LinkedHashMap<>(); result.put("success", true); result.put("configured", configured);
        result.put("bankId", configured ? id : ""); result.put("bankName", configured ? name : "");
        result.put("accountNo", configured ? account : ""); result.put("accountName", configured ? owner : "");
        result.put("message", configured ? "" : "Chuyen khoan tai quay chua duoc cau hinh tai khoan nhan tien."); return result;
    }
}
