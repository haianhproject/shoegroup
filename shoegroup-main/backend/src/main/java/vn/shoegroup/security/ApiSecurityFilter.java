// Mục đích: Kiểm tra JWT, đọc lại quyền/tình trạng tài khoản và chặn truy cập sai chủ sở hữu.
package vn.shoegroup.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.shoegroup.api.ApiErrors;

@Component
public class ApiSecurityFilter extends OncePerRequestFilter {
    private final TokenService tokens;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final RateLimits limits;
    public ApiSecurityFilter(TokenService tokens, JdbcTemplate jdbc, ObjectMapper mapper, RateLimits limits) {
        this.tokens = tokens; this.jdbc = jdbc; this.mapper = mapper; this.limits = limits;
    }
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        String path = req.getRequestURI(), method = req.getMethod();
        if (!path.startsWith("/api/") || method.equals("OPTIONS")) { chain.doFilter(req, res); return; }
        res.setHeader("Cross-Origin-Resource-Policy", "same-site");
        boolean login = method.equals("POST") && path.equals("/api/login");
        if (!List.of("GET", "HEAD", "OPTIONS").contains(method)) {
            long retry = limits.acquire(req.getRemoteAddr(), false);
            if (retry == 0 && login) retry = limits.acquire(req.getRemoteAddr(), true);
            if (retry > 0) {
                res.setHeader("Retry-After", String.valueOf(retry));
                deny(res, 429, "Ban thu qua nhieu lan. Vui long doi mot lat."); return;
            }
        }
        String header = req.getHeader("Authorization");
        String token = header != null && header.startsWith("Bearer ") ? header.substring(7).trim() : req.getHeader("x-access-token");
        Long id = tokens.verify(token);
        ApiUser user = null;
        if (id != null) {
            try {
                List<Map<String, Object>> rows = jdbc.queryForList("SELECT CAST(ISNULL(IsActive,1) AS bit) AS IsActive,RoleID FROM Users WHERE UserID=?", id);
                if (rows.isEmpty() || !Boolean.TRUE.equals(rows.get(0).get("IsActive"))) {
                    deny(res, 401, "Tai khoan khong con hoat dong."); return;
                }
                int role = ((Number)rows.get(0).get("RoleID")).intValue();
                user = new ApiUser(id, role == 1, role == 3);
            } catch (RuntimeException ex) { deny(res, 503, "Khong the kiem tra phien dang nhap luc nay."); return; }
        }
        ApiPolicy.Level level = ApiPolicy.resolve(method, path);
        if (level != ApiPolicy.Level.PUBLIC && user == null) {
            deny(res, 401, "Ban chua dang nhap hoac phien da het han."); return;
        }
        if (user != null && ((level == ApiPolicy.Level.ADMIN && !user.admin())
                || (level == ApiPolicy.Level.STAFF && !user.staff())
                || !ApiPolicy.owns(path, user.id(), user.admin()))) {
            deny(res, 403, "Ban khong co quyen thuc hien thao tac nay."); return;
        }
        req.setAttribute("apiUser", user);
        chain.doFilter(req, res);
        if (login && res.getStatus() < 400) limits.loginSucceeded(req.getRemoteAddr());
    }
    private void deny(HttpServletResponse res, int status, String message) throws IOException {
        res.setStatus(status); res.setContentType("application/json;charset=UTF-8");
        mapper.writeValue(res.getOutputStream(), ApiErrors.body(null, message));
    }
}
