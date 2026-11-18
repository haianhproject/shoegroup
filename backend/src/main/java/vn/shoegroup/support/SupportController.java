// Mục đích: Nhận lời nhắn liên hệ và yêu cầu nhận tin từ cửa hàng trực tuyến.
package vn.shoegroup.support;

import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SupportController {
    private final SupportService service;

    public SupportController(SupportService service) { this.service = service; }

    @PostMapping("/api/contact")
    public Map<String, Object> contact(@RequestBody Map<String, Object> body) {
        return service.contact(body);
    }

    @PostMapping("/api/newsletter")
    public Map<String, Object> newsletter(@RequestBody Map<String, Object> body) {
        return service.newsletter(body);
    }
}
