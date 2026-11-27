// Kiểm chứng báo phí dùng cùng checkout và không đọc địa chỉ của tài khoản khác.
package vn.shoegroup.support;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import vn.shoegroup.api.ApiException;
import vn.shoegroup.security.ApiUser;
import vn.shoegroup.shipping.ShippingService;

class ChatShippingServiceTest {
  private final NamedParameterJdbcTemplate jdbc=mock(NamedParameterJdbcTemplate.class);
  private final ShippingService shipping;
  private final ChatShippingService service;
  ChatShippingServiceTest() throws Exception { shipping=spy(new ShippingService(mock(JdbcTemplate.class),new ObjectMapper()));service=new ChatShippingService(shipping,jdbc); }
  @Test void asksForDestinationInsteadOfQuotingTheFallbackAndKeepsProductFilters() {
    var response=service.chat("Phí vận chuyển bao nhiêu?",Map.of("size","40","color","Đen","budget",500000,"userId",99),null,null);
    assertThat(response).containsEntry("intent","SHIPPING").doesNotContainKey("shipping_quote");
    var context=(Map<?,?>)response.get("context");
    assertThat(context.get("shipping_requested")).isEqualTo(true);assertThat(context.containsKey("userId")).isFalse();
    verify(shipping,never()).quote(anyMap());verifyNoInteractions(jdbc);
  }
  @Test void followupProvincesReturnTheSameFeeAndEtaAsCheckout() {
    for(String place:List.of("Hà Nội","Đà Nẵng","TP. Hồ Chí Minh","Vĩnh Long","Bắc Ninh")) {
      var response=service.chat(place,Map.of("shipping_requested",true),null,null);
      var quote=(Map<?,?>)response.get("shipping_quote");var checkout=shipping.quote(Map.of("province",place));
      assertThat(response).containsEntry("intent","SHIPPING_QUOTE");
      assertThat(quote.get("fee")).isEqualTo(checkout.get("fee"));assertThat(quote.get("eta")).isEqualTo(checkout.get("eta"));
    }
    assertThat(((Map<?,?>)service.chat("ship HCM bao nhiêu",Map.of(),null,null).get("shipping_quote")).get("fee")).isEqualTo(75000);
    assertThat(((Map<?,?>)service.chat("Phí giao tới Hà Nội?",Map.of(),null,null).get("shipping_quote")).get("destination")).isEqualTo("Hà Nội");
  }
  @Test void unknownOrAmbiguousPlacesDoNotProduceAFeeAndStreetNamesCannotOverrideTheFinalProvince() {
    for(String place:List.of("Địa chỉ khác","Atlantis","Hà Nội hay Đà Nẵng"))assertThat(service.chat(place,Map.of("shipping_requested",true),null,null)).doesNotContainKey("shipping_quote");
    var response=service.chat("Ship tới 12 đường Hải Phòng, Đà Nẵng",Map.of(),null,null);
    assertThat(((Map<?,?>)response.get("shipping_quote")).get("fee")).isEqualTo(65000);
  }
  @Test void savedAddressQueryUsesAuthenticatedOwnerAndItsProvinceOverMessageContent() {
    var owner=new ApiUser(7,false);
    var address=Map.<String,Object>of("id",12,"province","Hà Nội","district","Hai Bà Trưng","ward","Bạch Mai","line","12 Đà Nẵng","full_address","12 Đà Nẵng, Bạch Mai, Hai Bà Trưng, Hà Nội","is_default",true);
    when(jdbc.queryForList(contains("WHERE UserID=:uid"),eq(Map.of("uid",7L)))).thenReturn(List.of(address));
    when(jdbc.queryForList(contains("AddressID=:id AND UserID=:uid"),eq(Map.of("id",12,"uid",7L)))).thenReturn(List.of(address));
    var response=service.chat("Giao Đà Nẵng",Map.of("userId",99),owner,12);
    assertThat(((Map<?,?>)response.get("shipping_quote")).get("fee")).isEqualTo(30000);
    verify(jdbc).queryForList(contains("AddressID=:id AND UserID=:uid"),eq(Map.of("id",12,"uid",7L)));
    assertThat(response.toString()).doesNotContain("recipient","phone","userId");
  }
  @Test void foreignAddressIsRejectedAndGuestsCannotLookupSavedAddresses() {
    assertThatThrownBy(()->service.chat("Phí giao hàng",Map.of(),new ApiUser(8,false),12)).isInstanceOf(ApiException.class).hasMessageContaining("tài khoản của bạn");
    reset(jdbc);
    assertThat(service.chat("Phí giao hàng",Map.of(),null,12)).doesNotContainKey("shipping_quote");verifyNoInteractions(jdbc);
  }
  @Test void defaultAddressIsOnlyUsedOnExplicitRequestAndDoesNotExposeContactData() {
    var owner=new ApiUser(7,false);
    var address=Map.<String,Object>of("id",12,"province","Đà Nẵng","full_address","12 Demo, Đà Nẵng","is_default",true,"phone","0901234567","recipient","Private name");
    when(jdbc.queryForList(anyString(),anyMap())).thenReturn(List.of(address));
    var prompt=service.chat("Phí giao hàng",Map.of(),owner,null);
    assertThat(prompt).doesNotContainKey("shipping_quote");assertThat(prompt.toString()).doesNotContain("0901234567","Private name");
    var quote=service.chat("Tính phí địa chỉ mặc định",Map.of(),owner,null);
    assertThat(((Map<?,?>)quote.get("shipping_quote")).get("fee")).isEqualTo(65000);
  }
}
