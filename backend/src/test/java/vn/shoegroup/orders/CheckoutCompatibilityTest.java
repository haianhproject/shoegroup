// Mục đích: Kiểm thử mã hóa nội dung checkout và quy tắc trạng thái tương thích cơ chế chống trùng đơn.
package vn.shoegroup.orders;

import static org.assertj.core.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CheckoutCompatibilityTest {
  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void canonicalPayloadMatchesNodeSortedJson() throws Exception {
    var body =
        mapper.readValue(
            "{\"z\":null,\"a\":{\"value\":1.0,\"name\":\"Giày\"},\"items\":[{\"qty\":2,\"id\":7}],\"zero\":-0.0,\"small\":0.000001,\"large\":1000000000000}",
            Map.class);
    assertThat(CheckoutService.stableJson(body, mapper))
        .isEqualTo(
            "{\"a\":{\"name\":\"Giày\",\"value\":1},\"items\":[{\"id\":7,\"qty\":2}],\"large\":1000000000000,\"small\":0.000001,\"z\":null,\"zero\":0}");
  }

  @Test
  void paymentAndDeliveryClassificationsKeepLegacyMeaning() {
    assertThat(OrderSql.bank("Chuyển khoản ngân hàng")).isTrue();
    assertThat(OrderSql.cod("Thanh toán khi nhận hàng (COD)")).isTrue();
    assertThat(OrderSql.paid("Chờ hoàn tiền")).isFalse();
    assertThat(OrderSql.lost("Mất hàng trong vận chuyển")).isTrue();
    assertThat(OrderSql.accident("Tai nạn vận chuyển")).isTrue();
  }
}
