package vn.shoegroup.support;
import static org.assertj.core.api.Assertions.*;
import java.util.Map;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.mockito.Mockito.*;
import vn.shoegroup.catalog.ProductReadService;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

class ChatServiceTest {
  @Test void parsesVietnameseVariantAndBudgetAndKeepsThemForAFollowup() {
    var first=ChatService.filters("Tìm giày đen size 40 dưới 1 triệu",Map.of());
    assertThat(first).containsEntry("size","40").containsEntry("standard","EU").containsEntry("color","Đen").containsEntry("budget",1000000d);
    var second=ChatService.filters("size 41",first);
    assertThat(second).containsEntry("size","41").containsEntry("color","Đen").containsEntry("budget",1000000d);
    assertThat(ChatService.filters("size 8",ChatService.filters("size US 7.5",Map.of()))).containsEntry("standard","US").containsEntry("size","8");
  }
  @Test void parsesDecimalBudgetsAndDoesNotConfuseSizeWithMoney() {
    assertThat(ChatService.filters("giày dưới 1,2tr",Map.of())).containsEntry("budget",1200000d);
    assertThat(ChatService.filters("giày 500k",Map.of())).containsEntry("budget",500000d);
    assertThat(ChatService.filters("size 40",Map.of())).doesNotContainKey("budget");
  }
  @Test void clearsFiltersAndIgnoresUntrustedContextKeys() {
    var context=Map.of("userId",99,"sql","SELECT secret","budget",200000d,"size","41","query","Nike");
    assertThat(ChatService.filters("Xóa bộ lọc",context)).isEmpty();
    assertThat(ChatService.filters("size 40",context)).doesNotContainKeys("userId","sql");
  }
  @Test void looksUpAnExactProductNameWithSizeAndBudget() {
    String name="AfterSales Audit 1795767000 1";
    assertThat(ChatService.filters("Tìm giày "+name+" size 40 dưới 1 triệu",Map.of())).containsEntry("query","aftersales audit 1795767000 1");
    var catalog=mock(ProductReadService.class);
    when(catalog.products()).thenReturn(List.of(Map.of("id",7,"name",name,"active",true,"variants",List.of(Map.of("size","40","standard","EU","color","Black","active",true,"stock",9,"price",300000,"sale_price",0)))));
    var service=new ChatService(catalog,mock(NamedParameterJdbcTemplate.class),mock(ChatShippingService.class));
    assertThat((List<?>)service.chat(Map.of("message","Tìm giày "+name+" size 40 dưới 1 triệu"),null).get("products")).hasSize(1);
  }
  @Test void shippingCityNamesDoNotBecomeColorQueriesAndExplicitSizeQueriesExitShippingMode() {
    var catalog=mock(ProductReadService.class);var shipping=mock(ChatShippingService.class);
    var context=Map.of("shipping_requested",true);
    when(shipping.awaiting(context)).thenReturn(true);
    when(shipping.chat("Cà Mau",context,null,null)).thenReturn(Map.of("intent","SHIPPING_QUOTE"));
    var service=new ChatService(catalog,mock(NamedParameterJdbcTemplate.class),shipping);
    assertThat(service.chat(Map.of("message","Cà Mau","context",context),null)).containsEntry("intent","SHIPPING_QUOTE");
    assertThat(service.chat(Map.of("message","size 41","context",context),null)).containsEntry("intent","PRODUCTS");
    verify(shipping).chat("Cà Mau",context,null,null);
  }
}
