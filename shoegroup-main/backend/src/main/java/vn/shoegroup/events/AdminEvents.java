// Mục đích: Phát cập nhật trực tiếp qua SSE cho quản trị viên sau khi nghiệp vụ hoàn tất.
package vn.shoegroup.events;

import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import vn.shoegroup.api.ApiException;

@Service
public class AdminEvents {
  private final Map<SseEmitter, Runnable> clients = new ConcurrentHashMap<>();
  private final ScheduledExecutorService heartbeat = Executors.newSingleThreadScheduledExecutor();
  private final Semaphore slots = new Semaphore(16);

  public AdminEvents() {
    heartbeat.scheduleAtFixedRate(
        () -> clients.keySet().forEach(client -> send(client, SseEmitter.event().comment("keep-alive"))),
        20,
        20,
        TimeUnit.SECONDS);
  }

  public SseEmitter subscribe() {
    if (!slots.tryAcquire())
      throw new ApiException(503, "Qua nhieu ket noi cap nhat. Vui long thu lai.");
    var client = new SseEmitter(300000L);
    var cleaned = new AtomicBoolean();
    Runnable cleanup =
        () -> {
          if (cleaned.compareAndSet(false, true)) {
            clients.remove(client);
            slots.release();
          }
        };
    client.onCompletion(cleanup);
    client.onTimeout(
        () -> {
          cleanup.run();
          client.complete();
        });
    client.onError(error -> cleanup.run());
    clients.put(client, cleanup);
    send(client, SseEmitter.event().name("connected").data(Map.of("connected", true)));
    return client;
  }

  public void publish(String name, Object payload) {
    clients.keySet().forEach(client -> send(client, SseEmitter.event().name(name).data(payload)));
  }

  private void send(SseEmitter client, SseEmitter.SseEventBuilder event) {
    try {
      client.send(event);
    } catch (IOException ex) {
      // The servlet container handles the failed write; release capacity immediately.
      Runnable cleanup = clients.get(client);
      if (cleanup != null) cleanup.run();
    } catch (Exception ex) {
      Runnable cleanup = clients.get(client);
      if (cleanup != null) cleanup.run();
      client.completeWithError(ex);
    }
  }

  @PreDestroy
  public void close() {
    heartbeat.shutdownNow();
    clients.keySet().forEach(SseEmitter::complete);
  }
}
