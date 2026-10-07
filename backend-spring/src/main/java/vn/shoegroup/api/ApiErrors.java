package vn.shoegroup.api;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice
public class ApiErrors {
    public static Map<String, Object> body(String code, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false);
        if (code != null) body.put("code", code);
        body.put("message", message);
        return body;
    }
    @ExceptionHandler(ApiException.class)
    ResponseEntity<?> handle(ApiException ex) {
        return ResponseEntity.status(ex.status).body(body(ex.code, ex.getMessage()));
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<?> invalidJson() {
        return ResponseEntity.badRequest().body(body(null, "Du lieu gui len khong hop le."));
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> unexpected(Exception ex) {
        LoggerFactory.getLogger(ApiErrors.class).error("API failure ({})", ex.getClass().getSimpleName());
        return ResponseEntity.internalServerError().body(body(null, "Co loi xay ra o may chu. Vui long thu lai sau."));
    }
}
