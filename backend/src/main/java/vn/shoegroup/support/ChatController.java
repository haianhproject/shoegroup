package vn.shoegroup.support;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import vn.shoegroup.security.ApiUser;
@RestController
public class ChatController {
  private final ChatService service;
  public ChatController(ChatService service) { this.service=service; }
  @PostMapping("/api/chat")
  public Map<String,Object> chat(HttpServletRequest req,@RequestBody Map<String,Object> body) { return service.chat(body,(ApiUser)req.getAttribute("apiUser")); }
}
