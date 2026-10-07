package vn.shoegroup.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RequestBodyLimit extends OncePerRequestFilter {
    private final int max;
    private final ObjectMapper mapper;
    public RequestBodyLimit(Environment env, ObjectMapper mapper) {
        this.mapper = mapper;
        String value = env.getProperty("BODY_LIMIT", "5mb").trim().toLowerCase(Locale.ROOT);
        var match = java.util.regex.Pattern.compile("^(\\d+)(b|kb|mb)?$").matcher(value);
        if (!match.matches()) throw new IllegalArgumentException("Invalid BODY_LIMIT.");
        long bytes = Long.parseLong(match.group(1)) * switch (match.group(2) == null ? "b" : match.group(2)) { case "mb" -> 1048576; case "kb" -> 1024; default -> 1; };
        if (bytes <= 0 || bytes >= Integer.MAX_VALUE) throw new IllegalArgumentException("Invalid BODY_LIMIT.");
        max = (int)bytes;
    }
    @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        if (!req.getRequestURI().startsWith("/api/") || java.util.List.of("GET", "HEAD", "OPTIONS").contains(req.getMethod())) { chain.doFilter(req, res); return; }
        if (req.getContentLengthLong() > max) { reject(res); return; }
        byte[] bytes = req.getInputStream().readNBytes(max + 1);
        if (bytes.length > max) { reject(res); return; }
        chain.doFilter(new HttpServletRequestWrapper(req) {
            @Override public ServletInputStream getInputStream() {
                var input = new ByteArrayInputStream(bytes);
                return new ServletInputStream() {
                    @Override public int read() { return input.read(); }
                    @Override public boolean isFinished() { return input.available() == 0; }
                    @Override public boolean isReady() { return true; }
                    @Override public void setReadListener(ReadListener listener) { throw new UnsupportedOperationException("Async request bodies are not supported."); }
                };
            }
            @Override public BufferedReader getReader() { return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8)); }
        }, res);
    }
    private void reject(HttpServletResponse res) throws IOException {
        res.setStatus(413); res.setContentType("application/json;charset=UTF-8");
        mapper.writeValue(res.getOutputStream(), ApiErrors.body(null, "Du lieu gui len vuot gioi han."));
    }
}
