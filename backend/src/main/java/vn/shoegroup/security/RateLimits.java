package vn.shoegroup.security;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class RateLimits {
    private record Window(int count, long expires) {}
    private final Map<String, Window> hits = new HashMap<>();
    private final Clock clock;
    private final long window;
    private final int writes, logins;
    @org.springframework.beans.factory.annotation.Autowired
    public RateLimits(Environment env) {
        this(Clock.systemUTC(), env.getProperty("RATE_LIMIT_WINDOW_MS", Long.class, 900000L),
            env.getProperty("RATE_LIMIT_MAX_API", Integer.class, env.getProperty("RATE_LIMIT_MAX", Integer.class, 600)),
            env.getProperty("RATE_LIMIT_MAX_LOGIN", Integer.class, env.getProperty("LOGIN_RATE_LIMIT_MAX", Integer.class, 10)));
    }
    RateLimits(Clock clock, long window, int writes, int logins) {
        this.clock = clock; this.window = window; this.writes = writes; this.logins = logins;
    }
    public synchronized long acquire(String ip, boolean login) {
        long now = clock.millis();
        hits.entrySet().removeIf(entry -> entry.getValue().expires <= now);
        String key = (login ? "login:" : "api:") + ip;
        Window previous = hits.get(key);
        Window next = new Window(previous == null ? 1 : previous.count + 1, previous == null ? now + window : previous.expires);
        hits.put(key, next);
        return next.count > (login ? logins : writes) ? Math.max(1, (next.expires - now + 999) / 1000) : 0;
    }
    public synchronized void loginSucceeded(String ip) {
        String key = "login:" + ip;
        Window previous = hits.get(key);
        if (previous == null) return;
        if (previous.count <= 1) hits.remove(key);
        else hits.put(key, new Window(previous.count - 1, previous.expires));
    }
}
