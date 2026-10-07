package vn.shoegroup.customer;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import vn.shoegroup.api.ApiException;
import vn.shoegroup.api.Values;
import vn.shoegroup.security.ApiUser;

@RestController
public class AccountController {
    private final AccountService accounts;
    public AccountController(AccountService accounts) { this.accounts = accounts; }
    @GetMapping("/api/accounts") public List<Map<String, Object>> list() { return accounts.list(); }
    @PostMapping("/api/accounts") public Map<String, Object> create(@RequestBody Map<String, Object> body) { return accounts.create(body); }
    @PutMapping("/api/accounts/{id}") public Map<String, Object> update(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest req) {
        return accounts.update(Values.integer(id, 1, Integer.MAX_VALUE, null), (ApiUser)req.getAttribute("apiUser"), body);
    }
    @DeleteMapping("/api/accounts/{id}") public Map<String, Object> delete() { throw new ApiException(405, "Tai khoan chi co the khoa hoac mo khoa, khong the xoa."); }
}
