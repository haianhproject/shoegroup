// Muc dich: Kiem tra quy doi checkout cu va gioi han cac thao tac can phien ID moi.
package vn.shoegroup.catalog;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class CatalogIdentityServiceTest {
  @Test void legacyCheckoutChangesOnlyProductReferencesAndKeepsBusinessFields() throws Exception {
    var jdbc=mock(JdbcTemplate.class);var mapper=new ObjectMapper();
    when(jdbc.queryForList(anyString())).thenReturn(List.of(Map.of("payload","{\"revision\":\"v1\",\"legacyCheckoutCutoff\":\"2026-10-16T00:00:00Z\",\"maps\":{\"Products\":[[22,1]],\"ProductVariants\":[[194,1]]}}")));
    var identity=new CatalogIdentityService(jdbc,mapper);
    var body=Map.of("items",List.of(Map.of("productId",1,"productVariantId",1,"quantity",3,"price",100000)),"userId",9,"pos_cart_id",5);
    assertThat(identity.originalCheckout(body)).isEqualTo(Map.of("items",List.of(Map.of("productId",22,"productVariantId",194,"quantity",3,"price",100000)),"userId",9,"pos_cart_id",5));
    assertThat(identity.legacyCheckout(Timestamp.valueOf(LocalDateTime.of(2026,10,15,23,59)))).isTrue();
    assertThat(identity.legacyCheckout(Timestamp.valueOf(LocalDateTime.of(2026,10,16,0,1)))).isFalse();
    assertThat(identity.revision()).isEqualTo("v1");
    verify(jdbc,times(1)).queryForList(anyString());
  }
  @Test void catalogWritesRequireRevisionWhileOrdersAndAccountsKeepTheirIds() {
    for(String path:List.of("/api/products/1","/api/categories/1","/api/orders","/api/pos/cart/items/1","/api/cart/items"))
      assertThat(CatalogIdentityService.requiresRevision("PUT",path)).isTrue();
    for(String path:List.of("/api/login","/api/accounts/1","/api/orders/1/status","/api/products"))
      assertThat(CatalogIdentityService.requiresRevision("GET",path)).isFalse();
    assertThat(CatalogIdentityService.requiresRevision("PUT","/api/orders/1/status")).isFalse();
  }
}
