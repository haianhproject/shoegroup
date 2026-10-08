// Mục đích: Tạo đơn trong transaction, khóa tồn kho/khuyến mãi và chống trùng đơn bằng Idempotency-Key.
package vn.shoegroup.orders;

import static vn.shoegroup.orders.OrderSql.*;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import vn.shoegroup.api.*;
import vn.shoegroup.security.ApiUser;
import vn.shoegroup.shipping.ShippingService;

@Service
public class CheckoutService {
  private static final String OP = "post /api/orders";
  private final OrderSql sql;
  private final ShippingService shipping;
  private final OrderEffects effects;
  private final ObjectMapper mapper;
  private final TransactionTemplate transaction;

  public CheckoutService(
      OrderSql sql,
      ShippingService shipping,
      OrderEffects effects,
      ObjectMapper mapper,
      PlatformTransactionManager manager) {
    this.sql = sql;
    this.shipping = shipping;
    this.effects = effects;
    this.mapper = mapper;
    transaction = new TransactionTemplate(manager);
    transaction.setIsolationLevel(TransactionDefinition.ISOLATION_SERIALIZABLE);
  }

  static BigDecimal money(Object value) {
    try {
      BigDecimal n = new BigDecimal(Objects.toString(value, "0"));
      if (n.signum() < 0 || n.compareTo(new BigDecimal("1000000000000")) > 0)
        throw new NumberFormatException();
      return n;
    } catch (NumberFormatException ex) {
      throw new ApiException(400, "So tien khong hop le.");
    }
  }

  private static Object first(Map<String, Object> body, Object fallback, String... keys) {
    return Values.first(body, fallback, keys);
  }

  private static Integer optionalId(Object value) {
    return value == null || value.equals("")
        ? null
        : Values.integer(value, 1, Integer.MAX_VALUE, null);
  }

  static String stableJson(Object value, ObjectMapper mapper) {
    try {
      if (value instanceof Map<?, ?> map) {
        var sorted = new TreeMap<String, Object>();
        map.forEach((k, v) -> sorted.put(k.toString(), v));
        var entries = new ArrayList<String>();
        for (var e : sorted.entrySet())
          entries.add(
              mapper.writeValueAsString(e.getKey()) + ":" + stableJson(e.getValue(), mapper));
        return "{" + String.join(",", entries) + "}";
      }
      if (value instanceof List<?> list) {
        var entries = new ArrayList<String>();
        for (Object entry : list) entries.add(stableJson(entry, mapper));
        return "[" + String.join(",", entries) + "]";
      }
      if (value instanceof Number n) {
        BigDecimal d = new BigDecimal(n.toString()).stripTrailingZeros();
        if (d.signum() == 0) return "0";
        double a = Math.abs(d.doubleValue());
        if (a >= 1e-6 && a < 1e21) return d.toPlainString();
        return d.toString().replace("E", "e");
      }
      return mapper.writeValueAsString(value);
    } catch (JsonProcessingException ex) {
      throw new ApiException(400, "Noi dung don hang khong hop le.");
    }
  }

  private String hash(Map<String, Object> body) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256")
                  .digest(stableJson(body, mapper).getBytes(StandardCharsets.UTF_8)));
    } catch (java.security.NoSuchAlgorithmException ex) {
      throw new IllegalStateException(ex);
    }
  }

  public Map<String, Object> checkout(ApiUser user, String key, Map<String, Object> body) {
    if (key != null && !key.matches("[A-Za-z0-9._:-]{8,128}"))
      throw new ApiException(400, "Idempotency-Key phai co 8-128 ky tu hop le.");
    String hash = hash(body);
    for (int attempt = 1; ; attempt++) {
      try {
        return transaction.execute(status -> create(user, key, hash, body));
      } catch (DataAccessException ex) {
        boolean deadlock = false;
        for (Throwable cause = ex; cause != null; cause = cause.getCause())
          if (cause instanceof java.sql.SQLException s && s.getErrorCode() == 1205) deadlock = true;
        if (!deadlock || attempt >= 3) throw ex;
        try {
          Thread.sleep(20L * attempt);
        } catch (InterruptedException interrupted) {
          Thread.currentThread().interrupt();
          throw ex;
        }
      }
    }
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> create(ApiUser user, String key, String hash, Map<String, Object> b) {
    if (key != null) {
      // JDBC starts SQL Server transactions lazily; applock must already have an owner.
      Integer lock =
          sql.jdbc
              .getJdbcTemplate()
              .queryForObject(
                  "IF @@TRANCOUNT=0 BEGIN TRANSACTION; DECLARE @r int; EXEC @r=sys.sp_getapplock"
                      + " @Resource=?,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=15000;"
                      + " SELECT @r",
                  Integer.class,
                  "checkout:" + user.id() + ":" + key);
      if (lock == null || lock < 0)
        throw new ApiException(409, "Giao dich dang duoc xu ly; thu lai voi cung Idempotency-Key.");
      var existing =
          sql.jdbc.queryForList(
              "SELECT RequestHash,ResponseJson FROM CheckoutRequests WHERE UserID=:uid AND"
                  + " IdempotencyKey=:key",
              params("uid", user.id(), "key", key));
      if (!existing.isEmpty()) {
        if (!hash.equals(existing.get(0).get("RequestHash")))
          throw new ApiException(
              409, "IDEMPOTENCY_CONFLICT", "Idempotency-Key da dung cho noi dung khac.");
        try {
          return mapper.readValue(text(existing.get(0).get("ResponseJson")), Map.class);
        } catch (JsonProcessingException ex) {
          throw new IllegalStateException("Invalid checkout replay", ex);
        }
      }
    }
    Integer uid = Math.toIntExact(user.id());
    if (user.admin()) uid = optionalId(first(b, null, "userId", "user_id"));
    Integer aid = optionalId(first(b, null, "addressId", "address_id"));
    if (!user.admin() && aid == null)
      throw new ApiException(400, "Vui long chon dia chi tu so dia chi.");
    String name = Values.text(first(b, "Khach le", "customerName", "customer_name"), 100),
        phone =
            Values.text(first(b, "", "customerPhone", "customer_phone"), 20).replaceAll("\\s+", "");
    String address = Values.text(first(b, "", "shippingAddress", "customer_address"), 500),
        note = Values.text(first(b, "", "note", "order_note"), 500);
    if (!phone.isEmpty() && !phone.matches("[0-9+(). -]{7,20}"))
      throw new ApiException(400, "So dien thoai khong hop le.");
    String method = text(first(b, "COD", "paymentMethod", "payment_method")),
        methodKey = normalize(method),
        status = user.admin() ? sql.canonical(first(b, "Chờ xác nhận", "status")) : "Chờ xác nhận";
    String
        payment =
            user.admin()
                ? OrderSql.payment(first(b, "Chua thanh toan", "paymentStatus", "payment_status"))
                : "Chưa thanh toán",
        handled = Values.text(first(b, null, "handledBy", "handled_by"), 50);
    String shippingCode =
        Values.text(first(b, "STANDARD", "shippingMethodCode", "shipping_method_code"), 20)
            .toUpperCase(Locale.ROOT);
    BigDecimal submitted = money(first(b, 0, "totalAmount", "total"));
    money(first(b, 0, "shippingFee", "shipping_fee"));
    money(first(b, 0, "discountAmount", "discount_amount"));
    if (user.admin()) {
      name =
          Values.text(first(b, "", "customerName", "customer_name"), 100).replaceAll("\\s+", " ");
      if (name.isEmpty() || !phone.matches("0[35789]\\d{8}"))
        throw new ApiException(400, "Vui long nhap ten va so dien thoai hop le.");
      if (cod(method)) method = "Tiền mặt";
      else if (methodKey.contains("chuyen khoan") || methodKey.contains("bank"))
        method = "Chuyển khoản";
      else throw new ApiException(400, "Phuong thuc thanh toan khong hop le.");
      if (!Set.of("Chờ xác nhận", "Đã xác nhận", "Đã nhận hàng").contains(status)
          || !Set.of("Chưa thanh toán", "Đã thanh toán").contains(payment)
          || status.equals("Đã nhận hàng") && !paid(payment))
        throw new ApiException(400, "Trang thai khoi tao don tai quay khong hop le.");
      if (handled.isEmpty()) handled = "Quầy";
    } else {
      if (methodKey.contains("chuyen khoan") || methodKey.contains("bank"))
        method = "Chuyển khoản ngân hàng";
      else if (methodKey.contains("cod") || methodKey.contains("nhan hang"))
        method = "Thanh toán khi nhận hàng (COD)";
      else throw new ApiException(400, "Phuong thuc thanh toan khong hop le.");
      if (!shippingCode.equals("STANDARD"))
        throw new ApiException(400, "Phuong thuc van chuyen khong hop le.");
      status = "Chờ xác nhận";
      payment = "Chưa thanh toán";
      handled = "Online";
    }
    Object rawItems = first(b, List.of(), "items", "products");
    if (!(rawItems instanceof List<?> list)
        || list.isEmpty()
        || list.size() > 200
        || list.stream().anyMatch(i -> !(i instanceof Map)))
      throw new ApiException(400, "Danh sach san pham khong hop le.");
    List<Map<String, Object>> items = new ArrayList<>();
    for (Object raw : (List<?>) rawItems) {
      Map<String, Object> item = (Map<String, Object>) raw;
      int
          pid =
              Values.integer(
                  first(item, null, "productId", "product_id"), 1, Integer.MAX_VALUE, null),
          quantity = Values.integer(first(item, 1, "quantity"), 1, 1000000, 1);
      Integer vid =
          optionalId(first(item, null, "productVariantId", "product_variant_id", "variant_id"));
      String size = Values.text(item.get("size"), 10), color = Values.text(item.get("color"), 50);
      if (vid == null && (size.isEmpty() || color.isEmpty()))
        throw new ApiException(400, "San pham thieu size hoac mau.");
      if (user.admin()) {
        Object price = first(item, null, "price", "unitPrice");
        if (price == null) throw new ApiException(400, "Thieu gia san pham.");
        money(price);
      }
      items.add(params("pid", pid, "vid", vid, "qty", quantity, "sz", size, "clr", color));
    }
    items.sort(
        Comparator.comparingLong((Map<String, Object> i) -> number(i.get("pid")))
            .thenComparingLong(i -> number(i.get("vid")))
            .thenComparing(i -> text(i.get("sz")))
            .thenComparing(i -> text(i.get("clr"))));
    if (user.admin()) claimCart(user.id(), b.get("pos_cart_revision"), items);
    Map<String, Object> selected = null;
    if (aid != null) {
      if (uid == null) throw new ApiException(401, "Can tai khoan de su dung dia chi.");
      selected = sql.address(aid, uid);
      address = text(selected.get("fullAddress"));
      name = text(selected.get("recipient"));
      phone = text(selected.get("phone"));
    }
    BigDecimal subtotal = BigDecimal.ZERO;
    String pricing =
        sql.query(OP, 1)
            .replace(
                "${isAdminOrder ? \"WITH (UPDLOCK, HOLDLOCK)\" : \"\"}",
                user.admin() ? "WITH (UPDLOCK,HOLDLOCK)" : "");
    for (var item : items) {
      var priced = sql.jdbc.queryForList(pricing, item);
      if (priced.isEmpty())
        throw new ApiException(409, "San pham hoac bien the khong con kinh doanh.");
      var p = priced.get(0);
      item.put("vid", p.get("variantId"));
      item.put("sz", p.get("size"));
      item.put("clr", p.get("color"));
      item.put("price", money(p.get("price")));
      item.put("nm", text(p.get("name")));
      item.put("sku", text(p.get("sku")));
      item.put("hex", text(p.get("colorHex")));
      item.put("img", text(p.get("imageUrl")));
      item.put("vdid", p.get("variantDiscountId"));
      subtotal =
          subtotal.add(money(p.get("price")).multiply(BigDecimal.valueOf(number(item.get("qty")))));
    }
    Map<String, Object> quote =
        user.admin()
            ? params("fee", 0, "methodId", null, "distanceKm", null, "eta", null)
            : shipping.quote(
                params(
                    "methodCode",
                    shippingCode,
                    "province",
                    selected.get("province"),
                    "district",
                    selected.get("district"),
                    "ward",
                    selected.get("ward"),
                    "address",
                    address));
    BigDecimal fee = money(quote.get("fee")), discount = BigDecimal.ZERO;
    String couponCode = Values.text(first(b, "", "couponCode", "coupon_code"), 50),
        couponType = null;
    Object couponId = null;
    if (!couponCode.isEmpty()) {
      var coupons = sql.rows(OP, 2, params("code", couponCode));
      if (coupons.isEmpty()) throw new ApiException(409, "Ma giam gia khong hop le.");
      var c = coupons.get(0);
      if (number(c.get("UsageLimit")) > 0
          && number(c.get("UsedCount")) >= number(c.get("UsageLimit")))
        throw new ApiException(409, "Ma giam gia da het luot.");
      if (number(c.get("PerUserLimit")) > 0
          && (uid == null
              || number(sql.one(OP, 3, params("cid", c.get("CouponID"), "uid", uid)).get("count"))
                  >= number(c.get("PerUserLimit"))))
        throw new ApiException(409, "COUPON_USER_LIMIT", "Tai khoan da het luot khuyen mai.");
      if (subtotal.compareTo(money(c.get("MinOrderAmount"))) < 0)
        throw new ApiException(409, "Don chua dat gia tri toi thieu.");
      couponId = c.get("CouponID");
      couponType = normalize(c.get("DiscountType"));
      BigDecimal value = money(c.get("DiscountValue"));
      if (value.signum() == 0) value = money(c.get("DiscountPercent"));
      discount =
          switch (couponType) {
            case "co dinh", "fixed" -> value;
            case "phan tram", "percent" ->
                subtotal.multiply(value).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
            case "freeship" -> fee;
            default -> throw new ApiException(400, "Loai ma giam gia khong duoc ho tro.");
          };
      if (couponType.equals("freeship")) discount = discount.min(fee);
      else {
        BigDecimal cap = money(c.get("MaxDiscountAmount"));
        if (cap.signum() > 0) discount = discount.min(cap);
        discount = discount.min(subtotal);
      }
    }
    BigDecimal total = money(subtotal.add(fee).subtract(discount).max(BigDecimal.ZERO));
    if (user.admin()
        && paid(payment)
        && submitted.subtract(total).abs().compareTo(new BigDecimal("0.001")) > 0)
      throw new ApiException(409, "Tong tien da thay doi; kiem tra lai so tien da thu.");
    var order =
        params(
            "uid",
            uid,
            "addressId",
            aid,
            "tot",
            total,
            "cname",
            name,
            "cphone",
            phone,
            "addr",
            address,
            "pay",
            method,
            "pstat",
            payment,
            "stt",
            status,
            "hb",
            handled,
            "sfee",
            fee,
            "smid",
            quote.get("methodId"),
            "dist",
            quote.get("distanceKm"),
            "eta",
            quote.get("eta"),
            "disc",
            discount,
            "note",
            note,
            "due",
            null);
    int id = ((Number) sql.one(OP, 4, order).get("OrderID")).intValue();
    if (user.admin() && paid(payment)) {
      sql.update(OP, 5, params("oid", id));
      sql.collect(id, total, bank(method) ? "POS_TRANSFER" : "POS_CASH");
    }
    if (status.equals("Đã nhận hàng") && paid(payment)) sql.update(OP, 6, params("oid", id));
    for (var item : items) {
      item.put("oid", id);
      sql.update(OP, 7, item);
      if (item.get("vdid") != null
          && sql.update(OP, 8, params("id", item.get("vdid"), "qty", item.get("qty"))) != 1)
        throw new ApiException(409, "Khuyen mai bien the vua het luot.");
    }
    if (user.admin()) {
      sql.jdbc.update(
          "UPDATE Orders SET StockDeductedAt=GETDATE(),StockRestoredAt=NULL WHERE OrderID=:oid;"
              + " DELETE FROM PosCartItems WHERE UserID=:uid; UPDATE PosCarts SET"
              + " Revision=Revision+1,UpdatedAt=SYSDATETIME() WHERE UserID=:uid",
          params("oid", id, "uid", user.id()));
    } else {
      sql.validateStock(id);
      sql.update(OP, 9, params("uid", uid));
    }
    if (couponId != null) {
      sql.update(OP, 10, params("code", couponCode));
      sql.update(
          OP,
          11,
          params("cid", couponId, "uid", uid, "oid", id, "amount", discount, "type", couponType));
    }
    var response =
        params(
            "success",
            true,
            "orderId",
            id,
            "OrderID",
            id,
            "subtotalAmount",
            subtotal,
            "shippingFee",
            fee,
            "discountAmount",
            discount,
            "totalAmount",
            total,
            "shippingMethodCode",
            shippingCode,
            "shippingMethodId",
            quote.get("methodId"),
            "distanceKm",
            quote.get("distanceKm"),
            "eta",
            quote.get("eta"));
    sql.history(id, "", status, "Tạo đơn hàng", user.id());
    if (key != null) {
      try {
        sql.jdbc.update(
            "INSERT CheckoutRequests(UserID,IdempotencyKey,RequestHash,OrderID,ResponseJson)"
                + " VALUES(:uid,:key,:hash,:oid,:response)",
            params(
                "uid",
                user.id(),
                "key",
                key,
                "hash",
                hash,
                "oid",
                id,
                "response",
                mapper.writeValueAsString(response)));
      } catch (JsonProcessingException ex) {
        throw new IllegalStateException(ex);
      }
    }
    effects.afterCommit(id, "created", !user.admin() && !bank(method) ? "created" : null);
    return response;
  }

  private void claimCart(long user, Object expected, List<Map<String, Object>> items) {
    if (!(expected instanceof Number n)
        || n.doubleValue() != n.longValue()
        || n.longValue() < 0
        || n.longValue() > Integer.MAX_VALUE)
      throw new ApiException(400, "POS_CART_CONFLICT", "Hay tai lai gio tai quay.");
    var p = params("uid", user);
    sql.jdbc.update(
        "IF NOT EXISTS(SELECT 1 FROM PosCarts WITH(UPDLOCK,HOLDLOCK) WHERE UserID=:uid) INSERT"
            + " PosCarts(UserID) VALUES(:uid)",
        p);
    int revision =
        sql.jdbc.queryForObject(
            "SELECT Revision FROM PosCarts WITH(UPDLOCK,HOLDLOCK) WHERE UserID=:uid",
            p,
            Integer.class);
    if (revision != n.intValue())
      throw new ApiException(409, "POS_CART_CONFLICT", "Gio tai quay da thay doi.");
    var held =
        sql.jdbc.queryForList(
            "SELECT ci.ProductVariantID AS vid,v.ProductID AS pid,ci.Quantity AS qty FROM"
                + " PosCartItems ci JOIN ProductVariants v ON"
                + " v.ProductVariantID=ci.ProductVariantID WHERE ci.UserID=:uid",
            p);
    Map<Long, Map<String, Object>> requested = new HashMap<>();
    for (var item : items) {
      long vid = number(item.get("vid"));
      if (vid == 0 || requested.put(vid, item) != null)
        throw new ApiException(409, "POS_CART_CONFLICT", "San pham khong khop gio tai quay.");
    }
    if (held.isEmpty()
        || held.size() != requested.size()
        || held.stream()
            .anyMatch(
                row -> {
                  var i = requested.get(number(row.get("vid")));
                  return i == null
                      || number(i.get("pid")) != number(row.get("pid"))
                      || number(i.get("qty")) != number(row.get("qty"));
                }))
      throw new ApiException(409, "POS_CART_CONFLICT", "So luong khong khop gio da giu.");
  }
}
