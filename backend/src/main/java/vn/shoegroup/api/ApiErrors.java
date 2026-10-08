// Mục đích: Chuẩn hóa phản hồi lỗi API để frontend nhận mã lỗi và thông báo thống nhất.
package vn.shoegroup.api;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.util.DisconnectedClientHelper;
import org.springframework.web.servlet.resource.NoResourceFoundException;

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
    return ResponseEntity.status(ex.status).contentType(MediaType.APPLICATION_JSON)
        .body(body(ex.code, ex.getMessage()));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  ResponseEntity<?> invalidJson() {
    return ResponseEntity.badRequest().contentType(MediaType.APPLICATION_JSON)
        .body(body(null, "Du lieu gui len khong hop le."));
  }

  @ExceptionHandler(NoResourceFoundException.class)
  ResponseEntity<?> notFound() {
    return ResponseEntity.status(404).contentType(MediaType.APPLICATION_JSON)
        .body(body(null, "API khong ton tai."));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<?> unexpected(Exception ex, HttpServletResponse response) {
    boolean stream = response.getContentType() != null
        && response.getContentType().startsWith(MediaType.TEXT_EVENT_STREAM_VALUE);
    if (DisconnectedClientHelper.isClientDisconnectedException(ex)
        || stream && ex instanceof IOException) {
      LoggerFactory.getLogger(ApiErrors.class).debug("Client disconnected from response stream");
      return null;
    }
    LoggerFactory.getLogger(ApiErrors.class)
        .error("API failure ({})", ex.getClass().getSimpleName());
    LoggerFactory.getLogger(ApiErrors.class).debug("API failure detail", ex);
    // A response already sent to the browser cannot be replaced with a JSON error.
    if (response.isCommitted()) return null;
    return ResponseEntity.internalServerError().contentType(MediaType.APPLICATION_JSON)
        .body(body(null, "Co loi xay ra o may chu. Vui long thu lai sau."));
  }
}
