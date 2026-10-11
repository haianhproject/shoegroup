// Mục đích: API mở luồng SSE để giao diện quản trị nhận thay đổi đơn hàng và tồn kho.
package vn.shoegroup.events;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
public class EventsController {
  private final AdminEvents events;

  public EventsController(AdminEvents events) {
    this.events = events;
  }

  @GetMapping(value = "/api/admin/events", produces = "text/event-stream")
  public SseEmitter subscribe() {
    return events.subscribe();
  }
}
