package vn.shoegroup.events;

import jakarta.annotation.PreDestroy;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import vn.shoegroup.api.ApiException;
import vn.shoegroup.migration.LegacyBridge;

@Service
public class AdminEvents {
    private final Set<SseEmitter> clients = ConcurrentHashMap.newKeySet();
    private final ScheduledExecutorService workers = Executors.newScheduledThreadPool(17);
    private final Semaphore slots = new Semaphore(16);
    private final LegacyBridge legacy;
    public AdminEvents(LegacyBridge legacy) {
        this.legacy = legacy;
        workers.scheduleAtFixedRate(() -> clients.forEach(client -> send(client, SseEmitter.event().comment("keep-alive"))), 20, 20, TimeUnit.SECONDS);
    }
    public SseEmitter subscribe(String token) {
        if (!slots.tryAcquire()) throw new ApiException(503, "Qua nhieu ket noi cap nhat. Vui long thu lai.");
        var client = new SseEmitter(300000L);
        var upstream = new AtomicReference<InputStream>();
        var cleaned = new java.util.concurrent.atomic.AtomicBoolean();
        Runnable cleanup = () -> {
            if (!cleaned.compareAndSet(false, true)) return;
            clients.remove(client); slots.release();
            InputStream stream = upstream.getAndSet(null);
            if (stream != null) try { stream.close(); } catch (Exception ignored) { }
        };
        client.onCompletion(cleanup); client.onTimeout(() -> { cleanup.run(); client.complete(); });
        client.onError(error -> cleanup.run()); clients.add(client);
        send(client, SseEmitter.event().name("connected").data(Map.of("connected", true)));
        workers.execute(() -> {
            try {
                var response = legacy.events(token);
                try (InputStream stream = response.body()) {
                    upstream.set(stream);
                    if (cleaned.get()) return;
                    if (response.statusCode() != 200) throw new IllegalStateException("Legacy events unavailable");
                    var reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8));
                    String event = "message";
                    StringBuilder data = new StringBuilder();
                    for (String line; !cleaned.get() && (line = reader.readLine()) != null;) {
                        if (line.startsWith("event:")) event = line.substring(6).trim();
                        else if (line.startsWith("data:")) { if (!data.isEmpty()) data.append('\n'); data.append(line.substring(5).stripLeading()); }
                        else if (line.isEmpty()) {
                            if (!data.isEmpty() && !event.equals("connected")) send(client, SseEmitter.event().name(event).data(data.toString()));
                            data.setLength(0); event = "message";
                        }
                    }
                }
                client.complete();
            } catch (Exception ex) {
                // Reconnect lets the existing frontend polling fallback take over.
                client.complete();
            } finally { cleanup.run(); }
        });
        return client;
    }
    public void publish(String name, Object payload) {
        clients.forEach(client -> send(client, SseEmitter.event().name(name).data(payload)));
    }
    private void send(SseEmitter client, SseEmitter.SseEventBuilder event) {
        try { client.send(event); } catch (Exception ex) { client.complete(); clients.remove(client); }
    }
    @PreDestroy public void close() { clients.forEach(SseEmitter::complete); workers.shutdownNow(); }
}
