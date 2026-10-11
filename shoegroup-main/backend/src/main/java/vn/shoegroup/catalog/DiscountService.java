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
    if(value instanceof Timestamp timestamp) return timestamp;
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
  public Map<String, Object> coupon(String routeId, Map<String, Object> input) {
    Map<String,Object> b=new HashMap<>(input);
    if(routeId!=null) {
      int id=Values.integer(routeId,1,Integer.MAX_VALUE,null);
      var rows=jdbc.queryForList("SELECT *,CASE WHEN ExpiryDate<GETDATE() THEN 1 ELSE 0 END AS Finished FROM Coupons WITH(UPDLOCK,HOLDLOCK) WHERE CouponID=?",id);
      if(rows.isEmpty()) throw new ApiException(404,"Không tìm thấy mã giảm giá.");
      if(((Number)rows.get(0).get("Finished")).intValue()==1) throw new ApiException(409,"Mã giảm giá đã kết thúc, không được sửa.");
      if(b.size()==1 && (b.containsKey("active")||b.containsKey("IsActive"))) {
        Object active=field(b,false,"IsActive","active"); b=new HashMap<>(rows.get(0)); b.put("IsActive",active);
      }
    }
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
        expiry = date(field(b, null, "ExpiryDate", "expiry"), true, true);
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
  public Map<String, Object> variant(String routeId, Map<String, Object> input) {
    Map<String,Object> b=new HashMap<>(input);
    Integer id=routeId==null?null:Values.integer(routeId,1,Integer.MAX_VALUE,null);
    if(id!=null) {
      var existing=jdbc.queryForList("SELECT *,CASE WHEN EndDate<GETDATE() THEN 1 ELSE 0 END AS Finished FROM VariantDiscounts WITH(UPDLOCK,HOLDLOCK) WHERE VariantDiscountID=?",id);
      if(existing.isEmpty()) throw new ApiException(404,"Không tìm thấy khuyến mại.");
      if(((Number)existing.get(0).get("Finished")).intValue()==1) throw new ApiException(409,"Khuyến mại đã kết thúc, không được sửa.");
      if(b.size()==1 && (b.containsKey("active")||b.containsKey("IsActive"))) {
        Object active=Values.first(b,false,"active","IsActive");
        if(!Values.bool(active,true)) {
          jdbc.update("UPDATE VariantDiscounts SET IsActive=0 WHERE VariantDiscountID=?",id);
          return Values.success();
        }
        b=new HashMap<>(existing.get(0)); b.put("IsActive",active);
      }
    }
    String scope=text(field(b,"color","ApplyScope","apply_scope","scope"),20).toLowerCase(Locale.ROOT);
    if(!Set.of("color","variant").contains(scope)) throw new ApiException(400,"Phạm vi khuyến mại không hợp lệ.");
    Object rawVid=field(b,null,"ProductVariantID","variant_id");
    Integer vid=rawVid==null||rawVid.toString().isBlank()?null:Values.integer(rawVid,1,Integer.MAX_VALUE,null);
    int pid=Values.integer(field(b,null,"ProductID","product_id"),1,Integer.MAX_VALUE,null);
    Object rawColor=field(b,null,"ColorID","color_id");
    Integer color=rawColor==null||rawColor.toString().isBlank()?null:Values.integer(rawColor,1,Integer.MAX_VALUE,null);
    jdbc.queryForList("SELECT ProductID FROM Products WITH(UPDLOCK,HOLDLOCK) WHERE ProductID=?",pid);
    var target=jdbc.queryForList("SELECT TOP 1 v.ColorID,v.SalePrice AS ExactPrice,(SELECT MIN(s.SalePrice) FROM ProductVariants s WHERE s.ProductID=v.ProductID AND s.ColorID=v.ColorID AND s.IsActive=1) AS ColorPrice FROM ProductVariants v JOIN Products p ON p.ProductID=v.ProductID WHERE v.ProductID=? AND ((? IS NOT NULL AND v.ProductVariantID=?) OR (? IS NULL AND v.ColorID=?)) AND v.IsActive=1 AND p.IsActive=1 ORDER BY v.ProductVariantID",pid,vid,vid,vid,color);
    if(target.isEmpty() || (scope.equals("variant")&&vid==null)) throw new ApiException(400,"Vui lòng chọn sản phẩm, màu hoặc biến thể đang hoạt động.");
    int resolved=((Number)target.get(0).get("ColorID")).intValue();
    if(color!=null && color!=resolved) throw new ApiException(400,"Màu không thuộc biến thể đã chọn.");
    color=resolved;
    String kind=type(field(b,"Theo phần trăm","DiscountType","discount_type","type"),false);
    BigDecimal value=amount(field(b,0,"DiscountValue","value"));
    if(value.signum()<=0 || (kind.equals("percent")&&(value.compareTo(BigDecimal.valueOf(100))>=0||value.stripTrailingZeros().scale()>0))) throw new ApiException(400,"Phần trăm giảm phải là số nguyên từ 1 đến 99.");
    if(kind.equals("fixed") && value.compareTo((BigDecimal)target.get(0).get(scope.equals("variant")?"ExactPrice":"ColorPrice"))>=0) throw new ApiException(400,"Giá khuyến mại phải nhỏ hơn giá bán.");
    int quantity=Values.integer(field(b,0,"Quantity","quantity"),0,Integer.MAX_VALUE,0);
    BigDecimal cap=amount(field(b,0,"MaxDiscountAmount","max_discount"));
    Timestamp begin=date(field(b,null,"StartDate","start_date"),false,false),end=date(field(b,null,"EndDate","end_date"),true,false);
    if(begin!=null&&end!=null&&!end.after(begin)) throw new ApiException(400,"Ngày kết thúc phải sau ngày bắt đầu.");
    boolean active=Values.bool(field(b,true,"IsActive","active"),true);
    if(active&&!jdbc.queryForList("SELECT TOP 1 d.VariantDiscountID FROM VariantDiscounts d WITH(UPDLOCK,HOLDLOCK) LEFT JOIN ProductVariants v ON v.ProductVariantID=d.ProductVariantID WHERE d.ProductID=? AND d.IsActive=1 AND d.VariantDiscountID<>? AND (ISNULL(d.Quantity,0)<=0 OR d.UsedCount<d.Quantity) AND (d.EndDate IS NULL OR d.EndDate>=ISNULL(?,GETDATE())) AND (? IS NULL OR d.StartDate IS NULL OR d.StartDate<=?) AND ((?='color' AND COALESCE(d.ColorID,v.ColorID)=?) OR (?='variant' AND ((d.ApplyScope='color' AND d.ColorID=?) OR (d.ApplyScope='variant' AND d.ProductVariantID=?))))",pid,id==null?0:id,begin,end,end,scope,color,scope,color,vid).isEmpty()) throw new ApiException(409,"Phạm vi đã có khuyến mại trùng thời gian.");
    var args=new ArrayList<Object>(Arrays.asList(scope.equals("variant")?vid:null,pid,color,scope,kind.equals("percent")?"Theo phần trăm":"Cố định",value,cap,quantity,begin,end,text(field(b,"","Reason","reason"),100),active));
    if(id==null) {
      int created=jdbc.queryForObject("INSERT VariantDiscounts(ProductVariantID,ProductID,ColorID,ApplyScope,DiscountType,DiscountValue,MaxDiscountAmount,Quantity,StartDate,EndDate,Reason,IsActive,UsedCount,CreatedAt) OUTPUT INSERTED.VariantDiscountID VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0,GETDATE())",Integer.class,args.toArray());
      return Map.of("success",true,"id",created);
    }
    args.add(id);
    jdbc.update("UPDATE VariantDiscounts SET ProductVariantID=?,ProductID=?,ColorID=?,ApplyScope=?,DiscountType=?,DiscountValue=?,MaxDiscountAmount=?,Quantity=?,StartDate=?,EndDate=?,Reason=?,IsActive=? WHERE VariantDiscountID=?",args.toArray());
    return Values.success();
  }

  @Transactional(isolation = Isolation.SERIALIZABLE)
  public Map<String, Object> delete(String routeId, boolean variant) {
    return variant ? variant(routeId,Map.of("active",false)) : coupon(routeId,Map.of("active",false));
  }
}
