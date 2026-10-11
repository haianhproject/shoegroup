// Mục đích: Kiểm thử ngắt luồng SSE không trả JSON; lỗi API thật vẫn trả đúng mã và nội dung.
package vn.shoegroup.api;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@ExtendWith(OutputCaptureExtension.class)
class ApiErrorsTest {
  private MockMvc mvc;

  @BeforeEach void setup() {
    mvc = MockMvcBuilders.standaloneSetup(new ErrorsController())
        .setControllerAdvice(new ApiErrors()).build();
  }

  @Test void disconnectedWindowsStreamDoesNotWriteJsonOrLogServerFailure(CapturedOutput output) throws Exception {
    mvc.perform(get("/test/disconnect")).andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM))
        .andExpect(content().string(""));
    assertThat(output.getAll()).doesNotContain("API failure", "Failure in @ExceptionHandler", "No converter");
  }

  @Test void unavailableSseReturnsJsonEvenWhenRequestAcceptsStream() throws Exception {
    mvc.perform(get("/test/limit").accept(MediaType.TEXT_EVENT_STREAM))
        .andExpect(status().isServiceUnavailable())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(false));
  }

  @Test void normalServerFailureStillReturnsJson500() throws Exception {
    mvc.perform(get("/test/failure")).andExpect(status().isInternalServerError())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(false));
  }

  @RestController static class ErrorsController {
    @GetMapping("/test/disconnect") void disconnect(HttpServletResponse response) throws IOException {
      response.setContentType(MediaType.TEXT_EVENT_STREAM_VALUE);
      response.flushBuffer();
      throw new IOException("An established connection was aborted by the software in your host machine");
    }
    @GetMapping(value="/test/limit", produces=MediaType.TEXT_EVENT_STREAM_VALUE)
    void limit() { throw new ApiException(503, "Too many connections"); }
    @GetMapping("/test/failure") void failure() { throw new IllegalStateException("Audit failure"); }
  }
}
