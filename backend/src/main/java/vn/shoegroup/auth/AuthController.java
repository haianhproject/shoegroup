// Mục đích: API đăng nhập, đăng ký, quên mật khẩu và đặt lại mật khẩu.
package vn.shoegroup.auth;

import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {
    private final AuthService service;
    public AuthController(AuthService service) { this.service = service; }
    @PostMapping("/api/login") public Map<String, Object> login(@RequestBody Map<String, Object> body) { return service.login(body); }
    @PostMapping("/api/register") public Map<String, Object> register(@RequestBody Map<String, Object> body) { return service.register(body); }
    @PostMapping("/api/auth/forgot-password") public Map<String, Object> forgot(@RequestBody Map<String, Object> body) { return service.forgot(body); }
    @PostMapping("/api/auth/reset-password") public Map<String, Object> reset(@RequestBody Map<String, Object> body) { return service.reset(body); }
}
