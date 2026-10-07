package vn.shoegroup.migration;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LegacyController {
    private final LegacyBridge bridge;
    public LegacyController(LegacyBridge bridge) { this.bridge = bridge; }
    @RequestMapping("/api/**")
    public void forward(HttpServletRequest request, HttpServletResponse response) throws IOException { bridge.forward(request, response); }
}
