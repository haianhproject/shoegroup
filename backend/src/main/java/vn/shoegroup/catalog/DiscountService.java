// Mục đích: Kiểm tra điều kiện khuyến mãi, thời gian, phạm vi và ngăn chương trình chồng lấn.
package vn.shoegroup.catalog;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.text.Normalizer;
import java.time.*;
import java.time.format.DateTimeParseException;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import vn.shoegroup.api.*;

@Service
public class DiscountService {
  private final JdbcTemplate jdbc;

  public DiscountService(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  private static Object field(Map<String, Object> b, Object fallback, String... names) {
    return Values.first(b, fallback, names);
  }

  private static String text(Object value, int max) {
    String text = Objects.toString(value, "").trim();
    if (text.length() > max) throw new ApiException(400, "Du lieu khuyen mai vuot gioi han.");
    return text;
  }

  private static BigDecimal amount(Object value) {
    try {
      BigDecimal n = new BigDecimal(Objects.toString(value, "0"));
      if (n.signum() < 0 || n.compareTo(new BigDecimal("1000000000000")) > 0)
        throw new NumberFormatException();
      return n;
    } catch (NumberFormatException ex) {
      throw new ApiException(400, "Gia tri khuyen mai khong hop le.");
    }
  }

  private static String type(Object value, boolean freeship) {
    String key =
        Normalizer.normalize(Objects.toString(value, ""), Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .replace('\u0111', 'd')
            .toLowerCase(Locale.ROOT)
            .trim();
    if (freeship && key.contains("freeship")) return "freeship";
    if (key.contains("co dinh") || key.equals("fixed")) return "fixed";
    if (key.contains("phan tram") || key.equals("percent")) return "percent";
    throw new ApiException(400, "Loai khuyen mai khong hop le.");
  }

  private static Timestamp date(Object value, boolean endOfDay, boolean required) {
    String raw = Objects.toString(value, "").trim();
    if (raw.isEmpty()) {
      if (required) throw new ApiException(400, "Thieu ngay het han.");
      return null;
    }
    try {
      if (raw.matches("\\d{4}-\\d{2}-\\d{2}"))
        return Timestamp.valueOf(
            LocalDate.parse(raw)
                .atTime(endOfDay ? LocalTime.of(23, 59, 59, 997000000) : LocalTime.MIDNIGHT));
      try {
        return Timestamp.from(OffsetDateTime.parse(raw).toInstant());
      } catch (DateTimeParseException ignored) {
        return Timestamp.valueOf(LocalDateTime.parse(raw));
      }
    } catch (IllegalArgumentException | DateTimeParseException ex) {
      throw new ApiException(400, "Ngay khuyen mai khong hop le.");
    }
  }

  @Transactional(isolation = Isolation.SERIALIZABLE)
  public Map<String, Object> coupon(String routeId, Map<String, Object> b) {
    String code = text(field(b, "", "CouponCode", "code"), 50).toUpperCase(Locale.ROOT),
        name = text(field(b, "", "CouponName", "name"), 200);
    if (!code.matches("[A-Z0-9][A-Z0-9_-]{1,49}") || name.isEmpty())
      throw new ApiException(400, "Ma hoac ten khuyen mai khong hop le.");
    String kind = type(field(b, "Phần trăm", "DiscountType", "discount_type", "type"), true);
    BigDecimal value = amount(field(b, 0, "DiscountValue", "value")),
        minimum = amount(field(b, 0, "MinOrderAmount", "min_order")),
        maximum = amount(field(b, 0, "MaxDiscountAmount", "max_discount"));
    Values.integer(
        field(b, kind.equals("percent") ? value : 0, "DiscountPercent", "percent"), 0, 100, 0);
    if ((!kind.equals("freeship") && value.signum() <= 0)
        || (kind.equals("percent") && value.compareTo(BigDecimal.valueOf(100)) > 0))
      throw new ApiException(400, "Gia tri khuyen mai khong hop le.");
    int limit =
        Values.integer(field(b, 0, "UsageLimit", "limit", "quantity"), 0, Integer.MAX_VALUE, 0);
    Timestamp start = date(field(b, null, "StartDate", "start_date"), false, false),
        expiry = date(field(b, null, "ExpiryDate", "expiry"), false, true);
    if (start != null && !expiry.after(start))
      throw new ApiException(400, "Ngay het han phai sau ngay bat dau.");
    String description = text(field(b, "", "Description", "description"), 500);
    boolean active = Values.bool(field(b, true, "IsActive", "active"), true);
    var args =
        new ArrayList<Object>(
            Arrays.asList(
                code,
                name,
                kind.equals("percent")
                    ? "Phần trăm"
                    : kind.equals("fixed") ? "Cố định" : "freeship",
                value,
                kind.equals("percent") ? value : 0,
                minimum,
                maximum,
                limit,
                start,
                expiry,
                description,
                active));
    if (routeId == null)
      jdbc.update(
          "INSERT"
              + " Coupons(CouponCode,CouponName,DiscountType,DiscountValue,DiscountPercent,MinOrderAmount,MaxDiscountAmount,UsageLimit,StartDate,ExpiryDate,Description,IsActive)"
              + " VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
          args.toArray());
    else {
      args.add(Values.integer(routeId, 1, Integer.MAX_VALUE, null));
      if (jdbc.update(
              "UPDATE Coupons SET"
                  + " CouponCode=?,CouponName=?,DiscountType=?,DiscountValue=?,DiscountPercent=?,MinOrderAmount=?,MaxDiscountAmount=?,UsageLimit=?,StartDate=?,ExpiryDate=?,Description=?,IsActive=?"
                  + " WHERE CouponID=?",
              args.toArray())
          != 1) throw new ApiException(404, "Khong tim thay ma giam gia.");
    }
    return Values.success();
  }

  @Transactional(isolation = Isolation.SERIALIZABLE)
  public Map<String, Object> variant(String routeId, Map<String, Object> b) {
    int
        vid =
            Values.integer(
                field(b, null, "ProductVariantID", "variant_id"), 1, Integer.MAX_VALUE, null),
        pid = Values.integer(field(b, null, "ProductID", "product_id"), 1, Integer.MAX_VALUE, null);
    String scope =
        text(field(b, "color", "ApplyScope", "apply_scope", "scope"), 20).toLowerCase(Locale.ROOT);
    if (scope.equals("size")) scope = "variant";
    if (!scope.equals("color") && !scope.equals("variant"))
      throw new ApiException(400, "Pham vi giam gia khong hop le.");
    String kind = type(field(b, "", "DiscountType", "discount_type", "type"), false);
    BigDecimal value = amount(field(b, 0, "DiscountValue", "value"));
    if (value.signum() <= 0
        || (kind.equals("percent")
            && (value.compareTo(BigDecimal.valueOf(100)) >= 0
                || value.stripTrailingZeros().scale() > 0)))
      throw new ApiException(400, "Gia tri giam gia khong hop le.");
    int quantity = Values.integer(field(b, 0, "Quantity", "quantity"), 0, Integer.MAX_VALUE, 0);
    Timestamp start = date(field(b, null, "StartDate", "start_date"), false, false),
        end = date(field(b, null, "EndDate", "end_date"), true, false);
    if (start != null && end != null && !end.after(start))
      throw new ApiException(400, "Ngay ket thuc phai sau ngay bat dau.");
    boolean active = Values.bool(field(b, true, "IsActive", "active"), true);
    String reason = text(field(b, "", "Reason", "reason"), 100),
        description = text(field(b, "", "Description", "description"), 500),
        hex = text(field(b, "", "ColorHex", "color_hex"), 20);
    if (!hex.isEmpty() && !hex.matches("(?i)#[0-9a-f]{3,8}"))
      throw new ApiException(400, "Ma mau khong hop le.");
    // Serialize overlapping promotions on one product, including different sizes of a color.
    jdbc.queryForList(
        "SELECT ProductID FROM Products WITH(UPDLOCK,HOLDLOCK) WHERE ProductID=?", pid);
    var variants =
        jdbc.queryForList(
            "SELECT v.ColorName,v.ColorHex,p.BasePrice+ISNULL(v.PriceAdjustment,0) AS"
                + " ExactPrice,p.BasePrice+ISNULL((SELECT MIN(s.PriceAdjustment) FROM"
                + " ProductVariants s WHERE s.ProductID=v.ProductID AND"
                + " ISNULL(s.ColorName,N'')=ISNULL(v.ColorName,N'') AND ISNULL(s.IsActive,1)=1),0)"
                + " AS ColorPrice FROM ProductVariants v JOIN Products p ON p.ProductID=v.ProductID"
                + " WHERE v.ProductID=? AND v.ProductVariantID=? AND ISNULL(v.IsActive,1)=1 AND"
                + " ISNULL(p.IsActive,1)=1",
            pid,
            vid);
    if (variants.isEmpty()) throw new ApiException(400, "Bien the khong thuoc san pham dang ban.");
    var row = variants.get(0);
    if (kind.equals("fixed")
        && value.compareTo(
                new BigDecimal(
                    row.get(scope.equals("variant") ? "ExactPrice" : "ColorPrice").toString()))
            >= 0) throw new ApiException(400, "Gia ban moi phai nho hon gia goc.");
    Integer id = routeId == null ? null : Values.integer(routeId, 1, Integer.MAX_VALUE, null);
    if (active
        && !jdbc.queryForList(
                "SELECT TOP 1 VariantDiscountID FROM VariantDiscounts WITH(UPDLOCK,HOLDLOCK) WHERE"
                    + " ProductID=? AND IsActive=1 AND VariantDiscountID<>? AND ((?='color' AND"
                    + " ISNULL(ColorName,N'')=?) OR (?='variant' AND"
                    + " ((ISNULL(ApplyScope,'color')='color' AND ISNULL(ColorName,N'')=?) OR"
                    + " (ISNULL(ApplyScope,'color')='variant' AND ProductVariantID=?)))) AND"
                    + " (ISNULL(Quantity,0)<=0 OR ISNULL(UsedCount,0)<Quantity) AND (EndDate IS"
                    + " NULL OR EndDate>=ISNULL(?,GETDATE())) AND (? IS NULL OR StartDate IS NULL"
                    + " OR StartDate<=?)",
                pid,
                id == null ? 0 : id,
                scope,
                Objects.toString(row.get("ColorName"), ""),
                scope,
                Objects.toString(row.get("ColorName"), ""),
                vid,
                start,
                end,
                end)
            .isEmpty()) throw new ApiException(409, "Pham vi da co chuong trinh trung thoi gian.");
    var args =
        new ArrayList<Object>(
            Arrays.asList(
                vid,
                pid,
                row.get("ColorName"),
                row.get("ColorHex"),
                scope,
                kind.equals("percent") ? "Theo phần trăm" : "Cố định",
                value,
                kind.equals("percent") ? value : 0,
                0,
                quantity,
                start,
                end,
                reason,
                active,
                description));
    if (id == null) {
      int created =
          jdbc.queryForObject(
              "INSERT"
                  + " VariantDiscounts(ProductVariantID,ProductID,ColorName,ColorHex,ApplyScope,DiscountType,DiscountValue,DiscountPercent,MaxDiscountAmount,Quantity,StartDate,EndDate,Reason,IsActive,Description,UsedCount,CreatedAt)"
                  + " OUTPUT INSERTED.VariantDiscountID"
                  + " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,GETDATE())",
              Integer.class,
              args.toArray());
      return Map.of("success", true, "id", created);
    }
    args.add(id);
    if (jdbc.update(
            "UPDATE VariantDiscounts SET"
                + " ProductVariantID=?,ProductID=?,ColorName=?,ColorHex=?,ApplyScope=?,DiscountType=?,DiscountValue=?,DiscountPercent=?,MaxDiscountAmount=?,Quantity=?,StartDate=?,EndDate=?,Reason=?,IsActive=?,Description=?"
                + " WHERE VariantDiscountID=?",
            args.toArray())
        != 1) throw new ApiException(404, "Khong tim thay giam gia bien the.");
    return Values.success();
  }

  public Map<String, Object> delete(String routeId, boolean variant) {
    int id = Values.integer(routeId, 1, Integer.MAX_VALUE, null);
    if (jdbc.update(
            variant
                ? "UPDATE VariantDiscounts SET IsActive=0 WHERE VariantDiscountID=?"
                : "DELETE FROM Coupons WHERE CouponID=?",
            id)
        != 1) throw new ApiException(404, "Khong tim thay khuyen mai.");
    return Values.success();
  }
}
