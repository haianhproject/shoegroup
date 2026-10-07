package vn.shoegroup.customer;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.shoegroup.api.Values;
import vn.shoegroup.security.ApiUser;

@RestController
public class CustomerController {
    private final AddressService addresses;
    private final CartService carts;
    public CustomerController(AddressService addresses, CartService carts) { this.addresses = addresses; this.carts = carts; }
    private long user(HttpServletRequest req) { return ((ApiUser)req.getAttribute("apiUser")).id(); }
    @GetMapping("/api/addresses") public List<Map<String, Object>> addresses(HttpServletRequest req) { return addresses.list(user(req)); }
    @PostMapping("/api/addresses") public ResponseEntity<?> addAddress(HttpServletRequest req, @RequestBody Map<String, Object> body) { return ResponseEntity.status(201).body(addresses.save(user(req), null, body)); }
    @PutMapping("/api/addresses/{id}") public Map<String, Object> updateAddress(HttpServletRequest req, @PathVariable String id, @RequestBody Map<String, Object> body) { return addresses.save(user(req), Values.integer(id, 1, Integer.MAX_VALUE, null), body); }
    @DeleteMapping("/api/addresses/{id}") public Map<String, Object> deleteAddress(HttpServletRequest req, @PathVariable String id) { return addresses.delete(user(req), Values.integer(id, 1, Integer.MAX_VALUE, null)); }
    @PostMapping("/api/cart/items") public Map<String, Object> addCart(HttpServletRequest req, @RequestBody Map<String, Object> body) { return carts.add(user(req), body); }
    @PutMapping("/api/cart/items/{variantId}") public Map<String, Object> updateCart(HttpServletRequest req, @PathVariable String variantId, @RequestBody Map<String, Object> body) { return carts.update(user(req), Values.integer(variantId, 1, Integer.MAX_VALUE, null), body); }
    @DeleteMapping("/api/cart/items/{variantId}") public Map<String, Object> deleteCartItem(HttpServletRequest req, @PathVariable String variantId) { return carts.delete(user(req), Values.integer(variantId, 1, Integer.MAX_VALUE, null)); }
    @DeleteMapping("/api/cart") public Map<String, Object> clearCart(HttpServletRequest req) { return carts.delete(user(req), null); }
}
