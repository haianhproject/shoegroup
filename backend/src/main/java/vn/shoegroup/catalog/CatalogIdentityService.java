// Muc dich: Cong bo bang doi ID va bao ve yeu cau/checkout con dung ID cu.
package vn.shoegroup.catalog;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class CatalogIdentityService {
  private final JdbcTemplate jdbc;
  private final ObjectMapper mapper;
  private volatile Map<String,Object> cached;
  private static final Map<String,String> FIELDS=Map.ofEntries(
      Map.entry("productId","Products"),Map.entry("product_id","Products"),Map.entry("ProductID","Products"),
      Map.entry("productVariantId","ProductVariants"),Map.entry("product_variant_id","ProductVariants"),Map.entry("variant_id","ProductVariants"),Map.entry("ProductVariantID","ProductVariants"));
  public CatalogIdentityService(JdbcTemplate jdbc,ObjectMapper mapper) {this.jdbc=jdbc;this.mapper=mapper;}

  @SuppressWarnings("unchecked")
  public Map<String,Object> metadata() {
    if(cached!=null) return cached;
    synchronized(this) {
      if(cached!=null) return cached;
      var rows=jdbc.queryForList("SELECT CAST(value AS nvarchar(4000)) AS payload FROM sys.extended_properties WHERE class=1 AND major_id=OBJECT_ID('dbo.AppMigrations') AND minor_id=0 AND name=N'ShoeGroup.CatalogIdentity'");
      if(rows.isEmpty()) return cached=Map.of();
      try {return cached=Collections.unmodifiableMap(mapper.readValue(rows.get(0).get("payload").toString(),Map.class));}
      catch(JsonProcessingException ex) {throw new IllegalStateException("Invalid catalog identity mapping",ex);}
    }
  }
  public String revision() {return Objects.toString(metadata().get("revision"),"");}
  public static boolean requiresRevision(String method,String path) {
    if(Set.of("GET","HEAD","OPTIONS").contains(method)) return false;
    return path.matches("^/api/(products|categories|brands|materials|colors|sizes|inventory|variantDiscounts)(/.*)?$")
        || path.equals("/api/orders") || path.startsWith("/api/cart") || path.startsWith("/api/pos/cart");
  }
  public boolean legacyCheckout(Object createdAt) {
    if(!(createdAt instanceof Timestamp stamp) || metadata().get("legacyCheckoutCutoff")==null) return false;
    return !stamp.toLocalDateTime().toInstant(ZoneOffset.UTC).isAfter(Instant.parse(metadata().get("legacyCheckoutCutoff").toString()));
  }
  @SuppressWarnings("unchecked")
  public Object originalCheckout(Object value) {
    if(value instanceof List<?> list) return list.stream().map(this::originalCheckout).toList();
    if(!(value instanceof Map<?,?> map)) return value;
    var result=new LinkedHashMap<String,Object>();
    var maps=(Map<String,List<List<Number>>>)metadata().getOrDefault("maps",Map.of());
    for(var entry:map.entrySet()) {
      String key=entry.getKey().toString();Object item=entry.getValue();
      String table=FIELDS.get(key);var pairs=table==null?null:maps.get(table);
      if(pairs!=null && item!=null) {
        for(var pair:pairs) if(Objects.toString(pair.get(1)).equals(item.toString())) {
          item=item instanceof String?pair.get(0).toString():pair.get(0);break;
        }
      } else item=originalCheckout(item);
      result.put(key,item);
    }
    return result;
  }
}
