// Mục đích: Dùng truy vấn SQL và quy tắc trạng thái chung để xử lý tồn kho, thanh toán và lịch sử đơn.
package vn.shoegroup.orders;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.text.Normalizer;
import java.util.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;
import vn.shoegroup.api.ApiException;
import vn.shoegroup.api.Values;

@Component
public class OrderSql {
  final NamedParameterJdbcTemplate jdbc;
  private final Map<String, List<String>> queries;
  private final Map<String, String> aliases;
  private final Map<String, List<String>> transitions;
  static final String ADDRESS =
      "SELECT AddressID AS id,UserID AS userId,RecipientName AS recipient,Phone AS phone,Province"
          + " AS province,District AS district,Ward AS ward,AddressLine AS line,FullAddress AS"
          + " fullAddress FROM UserAddresses";

  public OrderSql(NamedParameterJdbcTemplate jdbc, ObjectMapper mapper) throws IOException {
    this.jdbc = jdbc;
    try (var in = new ClassPathResource("order-queries.json").getInputStream()) {
      queries = mapper.readValue(in, new TypeReference<>() {});
    }
    try (var in = new ClassPathResource("order-rules.json").getInputStream()) {
      var rules = mapper.readTree(in);
      aliases = mapper.convertValue(rules.get("ORDER_STATUS_ALIASES"), new TypeReference<>() {});
      transitions =
          mapper.convertValue(rules.get("ORDER_STATUS_TRANSITIONS"), new TypeReference<>() {});
    }
  }

  public String query(String name, int index) {
    return queries.get(name).get(index).replace("${ADDRESS_SELECT}", ADDRESS);
  }

  public List<Map<String, Object>> rows(String name, int index, Map<String, ?> args) {
    return jdbc.queryForList(query(name, index), args);
  }

  public Map<String, Object> one(String name, int index, Map<String, ?> args) {
    var r = rows(name, index, args);
    if (r.isEmpty()) throw new ApiException(404, "Khong tim thay don hang.");
    return r.get(0);
  }

  public int update(String name, int index, Map<String, ?> args) {
    return jdbc.update(query(name, index), args);
  }

  public static Map<String, Object> params(Object... pairs) {
    Map<String, Object> result = new LinkedHashMap<>();
    for (int i = 0; i < pairs.length; i += 2) result.put(pairs[i].toString(), pairs[i + 1]);
    return result;
  }

  public static long number(Object value) {
    return value instanceof Number n ? n.longValue() : 0;
  }

  public static String text(Object value) {
    return Objects.toString(value, "");
  }

  public static String normalize(Object value) {
    return Normalizer.normalize(text(value), Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .replace('\u0111', 'd')
        .replace('\u0110', 'D')
        .trim()
        .toLowerCase(Locale.ROOT);
  }

  public String canonical(Object value) {
    String status = aliases.get(normalize(value));
    if (status == null) throw new ApiException(400, "Trang thai don hang khong hop le.");
    return status;
  }

  public boolean allowed(Object current, Object next) {
    String a = normalize(current), b = normalize(next);
    return a.equals(b) || transitions.getOrDefault(a, List.of()).contains(b);
  }

  public static boolean paid(Object value) {
    return normalize(value).equals("da thanh toan");
  }

  public static boolean bank(Object value) {
    String s = normalize(value);
    return List.of("chuyen khoan", "bank", "momo", "vnpay").stream().anyMatch(s::contains);
  }

  public static boolean cod(Object value) {
    String s = normalize(value);
    return List.of("cod", "nhan hang", "tien mat").stream().anyMatch(s::contains);
  }

  public static boolean lost(Object value) {
    String s = normalize(value);
    return List.of("mat hang", "that lac", "lost", "mat trong van chuyen").stream()
        .anyMatch(s::contains);
  }

  public static boolean accident(Object value) {
    String s = normalize(value);
    return List.of("tai nan", "truc trac", "va cham", "su co van chuyen").stream()
        .anyMatch(s::contains);
  }

  public static String payment(Object value) {
    return switch (normalize(value)) {
      case "chua thanh toan" -> "Chưa thanh toán";
      case "cho thanh toan" -> "Chờ thanh toán";
      case "da thanh toan" -> "Đã thanh toán";
      case "hoan tien" -> "Hoàn tiền";
      case "cho hoan tien" -> "Chờ hoàn tiền";
      case "da huy" -> "Đã hủy";
      default -> throw new ApiException(400, "Trang thai thanh toan khong hop le.");
    };
  }

  public void history(int id, Object old, Object next, String note, Object user) {
    update(
        "insertOrderHistory",
        0,
        params(
            "oid",
            id,
            "old",
            text(old),
            "next",
            text(next),
            "note",
            Values.text(note, 500),
            "uid",
            user));
  }

  public void collect(int id, Object amount, String provider) {
    update(
        "recordCollection",
        0,
        params("oid", id, "amt", amount, "provider", provider, "ref", "ORDER:" + id));
  }

  public void refund(int id, Object amount) {
    update("recordRefundTransaction", 0, params("oid", id, "amt", amount));
  }

  public void notify(Object user, int id, String title, String message) {
    if (number(user) > 0)
      update(
          "insertOrderNotification",
          0,
          params(
              "uid",
              user,
              "oid",
              id,
              "title",
              title,
              "message",
              message,
              "type",
              "ORDER_STATUS",
              "rid",
              id));
  }

  public boolean stock(int id, boolean restore) {
    String operation = restore ? "restoreOrderStock" : "reserveOrderStock";
    var p = params("oid", id);
    var order = one(operation, 0, p);
    boolean held = order.get("StockDeductedAt") != null && order.get("StockRestoredAt") == null;
    if (restore && !held || !restore && held) return false;
    var details = rows(operation, 1, p);
    if (!restore && details.isEmpty()) throw unavailable();
    for (var row : details) {
      long quantity = number(row.get("Quantity"));
      if (quantity <= 0) throw unavailable();
      var a =
          params(
              "pid",
              row.get("ProductID"),
              "vid",
              row.get("ProductVariantID"),
              "q",
              quantity,
              "sz",
              text(row.get("Size")),
              "clr",
              text(row.get("Color")));
      int index = 2;
      if (row.get("ProductVariantID") == null) {
        var variants = rows(operation, 3, a);
        if (variants.isEmpty()) {
          if (restore) continue;
          throw unavailable();
        }
        a.put("vid", variants.get(0).get("id"));
        index = 4;
      }
      if (update(operation, index, a) != 1 && !restore) throw unavailable();
    }
    update(operation, 5, p);
    return true;
  }

  public void restorePromotion(int id) {
    var p = params("oid", id);
    if (one("restoreVariantDiscountUsage", 0, p).get("VariantDiscountRestoredAt") == null)
      update("restoreVariantDiscountUsage", 1, p);
  }

  public void validateStock(int id) {
    var details = rows("validateOrderStock", 0, params("oid", id));
    if (details.isEmpty()) throw unavailable();
    Map<Long, Long> requested = new HashMap<>();
    for (var row : details) {
      long quantity = number(row.get("Quantity"));
      if (quantity <= 0) throw unavailable();
      long total = requested.merge(number(row.get("ProductVariantID")), quantity, Long::sum);
      if (rows(
              "validateOrderStock",
              1,
              params(
                  "pid",
                  row.get("ProductID"),
                  "vid",
                  row.get("ProductVariantID"),
                  "sz",
                  text(row.get("Size")),
                  "clr",
                  text(row.get("Color")),
                  "q",
                  total))
          .isEmpty()) throw unavailable();
    }
  }

  private ApiException unavailable() {
    return new ApiException(409, "STOCK_UNAVAILABLE", "Bien the khong con du ton kho.");
  }

  public Map<String, Object> address(int id, Object user) {
    var rows =
        jdbc.queryForList(
            ADDRESS + " WITH(UPDLOCK,HOLDLOCK) WHERE AddressID=:id", params("id", id));
    if (rows.isEmpty()) throw new ApiException(400, "Dia chi khong hop le.");
    var a = rows.get(0);
    if (number(a.get("userId")) != number(user))
      throw new ApiException(400, "Dia chi khong thuoc tai khoan dat hang.");
    for (String key : List.of("recipient", "phone", "province", "ward", "line"))
      if (text(a.get(key)).trim().isEmpty())
        throw new ApiException(409, "Dia chi da luu khong con hop le.");
    if (!text(a.get("phone")).matches("0[35789]\\d{8}"))
      throw new ApiException(409, "So dien thoai dia chi khong hop le.");
    if (text(a.get("fullAddress")).isEmpty())
      a.put(
          "fullAddress",
          String.join(
              ", ",
              List.of("line", "ward", "district", "province").stream()
                  .map(k -> text(a.get(k)))
                  .filter(s -> !s.isEmpty())
                  .toList()));
    return a;
  }
}
