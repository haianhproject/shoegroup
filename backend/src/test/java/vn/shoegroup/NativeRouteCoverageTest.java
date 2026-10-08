// Mục đích: Kiểm thử tất cả 76 API cũ đều được xử lý bởi controller Java.
package vn.shoegroup;

import static org.assertj.core.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.springframework.web.util.ServletRequestPathUtils;

@SpringBootTest(
    properties = {
      "shoegroup.schema-enabled=false",
      "shoegroup.jobs-enabled=false",
      "logging.level.root=WARN",
      "spring.main.banner-mode=off"
    })
class NativeRouteCoverageTest {
  @Autowired
  @Qualifier("requestMappingHandlerMapping")
  RequestMappingHandlerMapping mappings;

  @Autowired ObjectMapper mapper;

  @Test
  void everyOriginalApiResolvesToANativeHandler() throws Exception {
    var inventory = mapper.readTree(Path.of("API-INVENTORY.json").toFile());
    int checked = 0;
    for (var route : inventory.get("routes")) {
      String[] parts = route.get("route").asText().split(" ", 2);
      var request = new MockHttpServletRequest(parts[0], parts[1].replaceAll(":[A-Za-z]+", "1"));
      ServletRequestPathUtils.parseAndCache(request);
      var handler = mappings.getHandler(request);
      assertThat(handler).as(route.toString()).isNotNull();
      assertThat(handler.getHandler()).isInstanceOf(HandlerMethod.class);
      String type = ((HandlerMethod) handler.getHandler()).getBeanType().getName();
      assertThat(type).as(route.toString()).startsWith("vn.shoegroup.").doesNotContain("Legacy");
      checked++;
    }
    assertThat(checked).isEqualTo(76);
  }
}
