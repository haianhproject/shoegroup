// Mục đích: API kiểm tra kết nối SQL Server và tiếp nhận lỗi do frontend gửi lên.
package vn.shoegroup.api;

import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
public class SystemController {
    private final JdbcTemplate jdbc;
    public SystemController(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @GetMapping("/api/health") public ResponseEntity<?> health() {
        try {
            jdbc.queryForObject("SELECT 1", Integer.class);
            return ResponseEntity.ok(Map.of("success", true, "db", "connected", "uptimeSeconds", ManagementFactory.getRuntimeMXBean().getUptime() / 1000, "time", Instant.now().toString()));
        } catch (RuntimeException ex) { return ResponseEntity.status(503).body(Map.of("success", false, "db", "disconnected")); }
    }
    @PostMapping("/api/log-error") public ResponseEntity<Void> logError(@RequestBody Map<String, Object> body) {
        // Browser payloads may contain secrets. Do not echo them to server logs.
        return ResponseEntity.ok().build();
    }
}
