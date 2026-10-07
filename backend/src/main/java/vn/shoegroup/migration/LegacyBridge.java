package vn.shoegroup.migration;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Collections;
import java.util.Locale;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.shoegroup.api.ApiException;

@Component
public class LegacyBridge {
    private static final Set<String> HOP_HEADERS = Set.of("connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade", "host", "content-length");
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build();
    private final URI base;
    private final boolean enabled;
    public LegacyBridge(@Value("${shoegroup.legacy-url}") String url, @Value("${shoegroup.legacy-enabled}") boolean enabled) {
        this.base = URI.create(url.replaceAll("/+$", "")); this.enabled = enabled;
        if (!Set.of("http", "https").contains(base.getScheme()) || base.getHost() == null || base.getRawQuery() != null || base.getRawFragment() != null || base.getUserInfo() != null || (base.getPath() != null && !base.getPath().isEmpty()))
            throw new IllegalArgumentException("LEGACY_API_URL must be an HTTP origin.");
    }
    public HttpResponse<java.io.InputStream> events(String token) throws IOException, InterruptedException {
        if (!enabled) throw new IOException("Legacy event source disabled");
        var request = HttpRequest.newBuilder(URI.create(base + "/api/admin/events"));
        request.header("Accept", "text/event-stream");
        if (token != null) request.header("Authorization", "Bearer " + token);
        return client.send(request.GET().build(), HttpResponse.BodyHandlers.ofInputStream());
    }
    public void forward(HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!enabled) throw new ApiException(501, "API nay chua duoc chuyen sang Spring Boot.");
        String query = req.getQueryString();
        URI target = URI.create(base + req.getRequestURI() + (query == null ? "" : "?" + query));
        if (target.equals(URI.create(req.getRequestURL().toString() + (query == null ? "" : "?" + query))))
            throw new ApiException(503, "Legacy API khong duoc tro ve Spring API.");
        var request = HttpRequest.newBuilder(target).timeout(Duration.ofSeconds(60));
        Set<String> blocked = new java.util.HashSet<>(HOP_HEADERS);
        String connection = req.getHeader("Connection");
        if (connection != null) for (String name : connection.split(",")) blocked.add(name.trim().toLowerCase(Locale.ROOT));
        for (String name : Collections.list(req.getHeaderNames())) {
            if (blocked.contains(name.toLowerCase(Locale.ROOT)) || name.equalsIgnoreCase("accept-encoding") || name.toLowerCase(Locale.ROOT).startsWith("x-forwarded-") || name.equalsIgnoreCase("forwarded")) continue;
            for (String value : Collections.list(req.getHeaders(name))) request.header(name, value);
        }
        request.header("Accept-Encoding", "identity");
        request.header("X-Forwarded-For", req.getRemoteAddr());
        byte[] body = req.getInputStream().readAllBytes();
        request.method(req.getMethod(), body.length == 0 ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofByteArray(body));
        try {
            var response = client.send(request.build(), HttpResponse.BodyHandlers.ofInputStream());
            res.setStatus(response.statusCode());
            response.headers().map().forEach((name, values) -> {
                if (!HOP_HEADERS.contains(name.toLowerCase(Locale.ROOT)) && !name.toLowerCase(Locale.ROOT).startsWith("access-control-"))
                    values.forEach(value -> res.addHeader(name, value));
            });
            res.setHeader("X-ShoeGroup-Backend", "express-transition");
            try (var stream = response.body()) { stream.transferTo(res.getOutputStream()); }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt(); throw new ApiException(503, "API chuyen tiep bi gian doan.");
        } catch (IOException ex) {
            if (res.isCommitted()) throw ex;
            throw new ApiException(503, "Backend Express chuyen tiep chua san sang.");
        }
    }
}
