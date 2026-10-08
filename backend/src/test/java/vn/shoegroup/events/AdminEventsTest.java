// Mục đích: Kiểm thử SSE giải phóng giới hạn kết nối khi trình duyệt ngắt mà không ảnh hưởng khách khác.
package vn.shoegroup.events;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.io.IOException;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

class AdminEventsTest {
  @Test void failedInitialWritesReleaseCapacityWithoutWaitingForContainer() throws Exception {
    try (var emitters = mockConstruction(SseEmitter.class, (emitter, context) ->
        doThrow(new IOException("connection aborted")).when(emitter).send(any(SseEmitter.SseEventBuilder.class)))) {
      var events = new AdminEvents();
      try {
        for (int i=0; i<32; i++) assertThatCode(events::subscribe).doesNotThrowAnyException();
        assertThat(emitters.constructed()).hasSize(32);
        for (var emitter : emitters.constructed()) verify(emitter, never()).complete();
      } finally { events.close(); }
    }
  }

  @Test void failedSubscriberDoesNotStopHealthySubscriber() throws Exception {
    try (var emitters = mockConstruction(SseEmitter.class)) {
      var events = new AdminEvents();
      try {
        var failed = events.subscribe();
        var healthy = events.subscribe();
        doThrow(new IOException("connection aborted")).when(failed).send(any(SseEmitter.SseEventBuilder.class));
        events.publish("order.updated", Map.of("orderId", 1));
        verify(healthy, times(2)).send(any(SseEmitter.SseEventBuilder.class));
        verify(failed, never()).complete();
        assertThat((Map<?, ?>)ReflectionTestUtils.getField(events, "clients")).hasSize(1);
      } finally { events.close(); }
    }
  }
}
