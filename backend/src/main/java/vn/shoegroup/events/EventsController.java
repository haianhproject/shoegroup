package vn.shoegroup.events;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
public class EventsController {
    private final AdminEvents events;
    public EventsController(AdminEvents events) { this.events = events; }
    @GetMapping(value = "/api/admin/events", produces = "text/event-stream")
    public SseEmitter subscribe(HttpServletRequest req) {
        String header = req.getHeader("Authorization");
        String token = header != null && header.startsWith("Bearer ") ? header.substring(7).trim() : req.getHeader("x-access-token");
        return events.subscribe(token);
    }
}
