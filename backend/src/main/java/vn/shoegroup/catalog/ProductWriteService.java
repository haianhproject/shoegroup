// Mục đích: Lưu sản phẩm, ảnh và biến thể trong transaction; bảo vệ phiên bản tồn kho và lịch sử đơn.
package vn.shoegroup.catalog;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import vn.shoegroup.api.ApiException;
import vn.shoegroup.api.Values;

@Service
public class ProductWriteService {
  private final JdbcTemplate jdbc;

  public ProductWriteService(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  private static String bounded(Object value, int max) {
    String s = value == null ? "" : value.toString().trim();
    if (s.length() > max) throw new ApiException(400, "Du lieu san pham vuot gioi han.");
    return s;
  }

  private static Object id(Object value) {
    return value == null || value.equals("")
        ? null
        : Values.integer(value, 1, Integer.MAX_VALUE, null);
  }

  private static String sku(String value) {
    return Normalizer.normalize(value, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .replace('\u0111', 'D')
        .replace('\u0110', 'D')
        .toUpperCase(Locale.ROOT)
        .trim()
        .replaceAll("[^A-Z0-9_-]+", "-")
        .replaceAll("^-+|-+$", "");
  }

  @SuppressWarnings("unchecked")
  private static List<Map<String, Object>> items(Object value, int max) {
    if (value == null) return List.of();
    if (!(value instanceof List<?> list)
        || list.size() > max
        || list.stream().anyMatch(item -> !(item instanceof Map)))
      throw new ApiException(400, "Danh sach san pham khong hop le.");
    return (List<Map<String, Object>>) value;
  }

  private static BigDecimal price(Object value) {
    try {
      BigDecimal p = new BigDecimal(Objects.toString(value, ""));
      if (p.signum() < 0 || p.compareTo(new BigDecimal("1000000000000")) > 0)
        throw new NumberFormatException();
      return p.setScale(0, RoundingMode.HALF_UP);
    } catch (NumberFormatException ex) {
      throw new ApiException(400, "Gia san pham khong hop le.");
    }
  }

  @Transactional(isolation = Isolation.SERIALIZABLE)
  public Map<String, Object> save(String routeId, Map<String, Object> body) {
    String name = bounded(body.get("name"), 255);
    if (name.isEmpty()) throw new ApiException(400, "Ten san pham khong duoc de trong.");
    BigDecimal price = price(body.get("price"));
    Object category = id(body.get("category_id")),
        brand = id(body.get("brand_id")),
        material = id(body.get("material_id"));
    String parent = sku(bounded(body.get("parent_sku"), 50)),
        description = bounded(body.get("description"), 10000),
        image = bounded(body.get("image_url"), 2200000);
    boolean active = Values.bool(body.get("active"), true),
        featured = Values.bool(body.get("is_featured"), false);
    var variants = items(body.get("variants"), 1000);
    var colors = items(body.get("colors"), 100);
    if (routeId == null && variants.isEmpty())
      throw new ApiException(400, "San pham phai co bien the.");
    Set<String> seen = new HashSet<>();
    for (var v : variants) {
      String color = bounded(Values.first(v, "", "color", "ColorName"), 50),
          size = bounded(Values.first(v, "", "size", "Size"), 10);
      if (color.isEmpty() && size.isEmpty())
        throw new ApiException(400, "Bien the phai co mau hoac size.");
      if (!seen.add((color + "\u0000" + size).toLowerCase(Locale.ROOT)))
        throw new ApiException(400, "Trung mau va size.");
      Values.integer(Values.first(v, 0, "stock", "StockQuantity"), 0, 1000000, 0);
      bounded(Values.first(v, "", "sku", "ChildSKU"), 60);
    }
    for (var color : colors) {
      bounded(Values.first(color, "", "name", "ColorName"), 50);
      String candidate = bounded(Values.first(color, "", "image", "ImageURL"), 2200000);
      if (image.isEmpty() && !candidate.isEmpty()) image = candidate;
    }
    int product;
    if (routeId == null) {
      product =
          jdbc.queryForObject(
              "INSERT"
                  + " Products(ProductName,BasePrice,CategoryID,BrandID,MaterialID,ImageURL,Description,ParentSKU,IsFeatured,IsActive)"
                  + " OUTPUT INSERTED.ProductID VALUES(?,?,?,?,?,?,?,?,?,?)",
              Integer.class,
              name,
              price,
              category,
              brand,
              material,
              image,
              description,
              parent,
              featured,
              active);
    } else {
      product = Values.integer(routeId, 1, Integer.MAX_VALUE, null);
      if (jdbc.update(
              "UPDATE Products SET"
                  + " ProductName=?,BasePrice=?,CategoryID=?,BrandID=?,MaterialID=?,ImageURL=?,Description=?,ParentSKU=?,IsFeatured=?,IsActive=?"
                  + " WHERE ProductID=?",
              name,
              price,
              category,
              brand,
              material,
              image,
              description,
              parent,
              featured,
              active,
              product)
          != 1) throw new ApiException(404, "Khong tim thay san pham.");
    }
    if (routeId == null || body.containsKey("variants")) saveVariants(product, variants);
    if (routeId == null || body.containsKey("colors")) {
      jdbc.update("DELETE FROM ProductImages WHERE ProductID=? AND ColorName IS NOT NULL", product);
      int order = 0;
      for (var c : colors) {
        String color = bounded(Values.first(c, "", "name", "ColorName"), 50),
            url = bounded(Values.first(c, "", "image", "ImageURL"), 2200000);
        if (!color.isEmpty() && !url.isEmpty())
          jdbc.update(
              "INSERT ProductImages(ProductID,ColorName,ImageURL,IsPrimary,SortOrder)"
                  + " VALUES(?,?,?,0,?)",
              product,
              color,
              url,
              order++);
      }
    }
    return routeId == null ? Map.of("success", true, "ProductID", product) : Values.success();
  }

  private void saveVariants(int product, List<Map<String, Object>> variants) {
    Set<Integer> kept = new HashSet<>();
    for (var v : variants) {
      String color = bounded(Values.first(v, "", "color", "ColorName"), 50),
          size = bounded(Values.first(v, "", "size", "Size"), 10);
      String hex = bounded(Values.first(v, "", "hex", "color_hex", "ColorHex"), 20),
          supplied = bounded(Values.first(v, "", "sku", "ChildSKU"), 60);
      String childSku;
      if (!supplied.isEmpty() && !supplied.matches(".*[?\uFFFD].*")) childSku = sku(supplied);
      else {
        String prefix = supplied.isEmpty() ? "SKU-" + product : sku(supplied.split("-", -1)[0]);
        childSku =
            (prefix.isEmpty() ? "SKU-" + product : prefix) + "-" + sku(color) + "-" + sku(size);
      }
      childSku = Values.text(childSku, 60);
      int stock = Values.integer(Values.first(v, 0, "stock", "StockQuantity"), 0, 1000000, 0);
      Object variantId = id(Values.first(v, null, "id", "ProductVariantID"));
      List<Map<String, Object>> rows =
          variantId != null
              ? jdbc.queryForList(
                  "SELECT ProductVariantID FROM ProductVariants WHERE ProductID=? AND"
                      + " ProductVariantID=?",
                  product,
                  variantId)
              : jdbc.queryForList(
                  "SELECT ProductVariantID FROM ProductVariants WHERE ProductID=? AND ChildSKU=?",
                  product,
                  childSku);
      if (rows.isEmpty())
        rows =
            jdbc.queryForList(
                "SELECT TOP 1 ProductVariantID FROM ProductVariants WHERE ProductID=? AND"
                    + " ISNULL(ColorName,N'')=? AND ISNULL(Size,N'')=? ORDER BY ProductVariantID",
                product,
                color,
                size);
      int vid;
      if (!rows.isEmpty()) {
        vid = ((Number) rows.get(0).get("ProductVariantID")).intValue();
        var current =
            jdbc.queryForMap(
                "SELECT StockQuantity,ISNULL(Version,0) AS Version FROM ProductVariants"
                    + " WITH(UPDLOCK,HOLDLOCK) WHERE ProductVariantID=?",
                vid);
        Object version = Values.first(v, null, "version", "Version");
        if ((version == null && stock != ((Number) current.get("StockQuantity")).intValue())
            || (version != null
                && Values.integer(version, 0, Integer.MAX_VALUE, null)
                    != ((Number) current.get("Version")).intValue()))
          throw new ApiException(
              409, "STOCK_VERSION_CONFLICT", "Ton kho da thay doi. Hay tai lai san pham.");
        jdbc.update(
            "UPDATE ProductVariants SET"
                + " StockQuantity=?,Version=ISNULL(Version,0)+1,ColorName=?,ColorHex=?,Size=?,ChildSKU=?,IsActive=1"
                + " WHERE ProductVariantID=?",
            stock,
            color,
            hex,
            size,
            childSku,
            vid);
      } else
        vid =
            jdbc.queryForObject(
                "INSERT"
                    + " ProductVariants(ProductID,Size,ColorName,ColorHex,ChildSKU,StockQuantity,PriceAdjustment,IsActive)"
                    + " OUTPUT INSERTED.ProductVariantID VALUES(?,?,?,?,?,?,0,1)",
                Integer.class,
                product,
                size,
                color,
                hex,
                childSku,
                stock);
      kept.add(vid);
    }
    var existing =
        jdbc.queryForList(
            "SELECT ProductVariantID FROM ProductVariants WHERE ProductID=? AND IsActive=1",
            Integer.class,
            product);
    for (int vid : existing)
      if (!kept.contains(vid))
        jdbc.update(
            "UPDATE ProductVariants SET IsActive=0,Version=ISNULL(Version,0)+1 WHERE"
                + " ProductVariantID=?",
            vid);
  }

  @Transactional(isolation = Isolation.SERIALIZABLE)
  public Map<String, Object> delete(String routeId, boolean hard) {
    int id = Values.integer(routeId, 1, Integer.MAX_VALUE, null);
    if (!hard) {
      if (jdbc.update("UPDATE Products SET IsActive=0 WHERE ProductID=?", id) != 1)
        throw new ApiException(404, "Khong tim thay san pham.");
      return Map.of("success", true, "mode", "soft");
    }
    if (jdbc.queryForList(
            "SELECT ProductID FROM Products WITH(UPDLOCK,HOLDLOCK) WHERE ProductID=?", id)
        .isEmpty()) throw new ApiException(404, "Khong tim thay san pham.");
    if (!jdbc.queryForList(
            "SELECT TOP 1 OrderDetailID FROM OrderDetails WITH(HOLDLOCK) WHERE ProductID=?", id)
        .isEmpty())
      throw new ApiException(409, "San pham da co lich su don hang; hay an san pham.");
    if (!jdbc.queryForList(
            "SELECT TOP 1 i.ProductVariantID FROM PosCartItems i JOIN ProductVariants v ON"
                + " v.ProductVariantID=i.ProductVariantID WHERE v.ProductID=?",
            id)
        .isEmpty()) throw new ApiException(409, "San pham dang duoc giu tai quay.");
    jdbc.update(
        "DELETE FROM VariantDiscounts WHERE ProductID=? OR ProductVariantID IN(SELECT"
            + " ProductVariantID FROM ProductVariants WHERE ProductID=?)",
        id,
        id);
    jdbc.update("DELETE FROM ProductImages WHERE ProductID=?", id);
    jdbc.update("DELETE FROM ProductVariants WHERE ProductID=?", id);
    jdbc.update("DELETE FROM Products WHERE ProductID=?", id);
    return Map.of("success", true, "mode", "hard");
  }

  public Map<String, Object> restore(String routeId) {
    int id = Values.integer(routeId, 1, Integer.MAX_VALUE, null);
    if (jdbc.update("UPDATE Products SET IsActive=1 WHERE ProductID=?", id) != 1)
      throw new ApiException(404, "Khong tim thay san pham.");
    return Values.success();
  }
}
