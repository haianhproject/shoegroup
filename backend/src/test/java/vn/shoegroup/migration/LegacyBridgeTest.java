package vn.shoegroup.migration;

import static org.assertj.core.api.Assertions.*;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class LegacyBridgeTest {
    @Test void preservesCheckoutBodyTokenKeyStatusAndNeverRetries() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        var calls = new AtomicInteger(); var received = new AtomicReference<String>();
        server.createContext("/api/orders", exchange -> {
            calls.incrementAndGet();
            received.set(exchange.getRequestURI() + "|" + exchange.getRequestHeaders().getFirst("Authorization") + "|" + exchange.getRequestHeaders().getFirst("Idempotency-Key") + "|" + new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] bytes = "{\"success\":false,\"code\":\"IDEMPOTENCY_CONFLICT\"}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json"); exchange.sendResponseHeaders(409, bytes.length);
            exchange.getResponseBody().write(bytes); exchange.close();
        }); server.start();
        try {
            var bridge = new LegacyBridge("http://127.0.0.1:" + server.getAddress().getPort(), true);
            var request = new MockHttpServletRequest("POST", "/api/orders"); request.setQueryString("test=1");
            request.addHeader("Authorization", "Bearer old-token"); request.addHeader("Idempotency-Key", "checkout-1234");
            request.addHeader("X-Forwarded-For", "spoofed"); request.setRemoteAddr("192.0.2.10");
            request.setContent("{\"items\":[{\"quantity\":1}]}".getBytes(StandardCharsets.UTF_8));
            var response = new MockHttpServletResponse(); bridge.forward(request, response);
            assertThat(calls).hasValue(1); assertThat(response.getStatus()).isEqualTo(409);
            assertThat(received.get()).isEqualTo("/api/orders?test=1|Bearer old-token|checkout-1234|{\"items\":[{\"quantity\":1}]}");
            assertThat(response.getContentAsString()).contains("IDEMPOTENCY_CONFLICT");
        } finally { server.stop(0); }
    }
    @Test void disabledForwardingDoesNotHideIncompleteMigration() {
        var bridge = new LegacyBridge("http://127.0.0.1:5001", false);
        assertThatThrownBy(() -> bridge.forward(new MockHttpServletRequest("POST", "/api/orders"), new MockHttpServletResponse()))
            .isInstanceOf(vn.shoegroup.api.ApiException.class).hasMessageContaining("chua duoc chuyen");
    }
}
