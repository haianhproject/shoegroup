// Mục đích: Đọc và cập nhật các thuộc tính dùng để phân loại sản phẩm.
package vn.shoegroup.catalog;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import vn.shoegroup.api.ApiException;
import vn.shoegroup.api.Values;

@Service
public class CatalogService {
    private record Catalog(String table, String id, String name, int max, String columns, String order, String extra) {}
    private static final Map<String, Catalog> CATALOGS = Map.of(
        "categories", new Catalog("Categories", "CategoryID", "CategoryName", 100, "Sport as sport", "Sport,CategoryName", "Sport"),
        "brands", new Catalog("Brands", "BrandID", "BrandName", 100, "LogoURL as logo_url,SortOrder as sort_order", "ISNULL(SortOrder,999),BrandID", "LogoURL,SortOrder"),
        "materials", new Catalog("Materials", "MaterialID", "MaterialName", 100, "", "MaterialID", ""),
        "colors", new Catalog("Colors", "ColorID", "ColorName", 50, "ColorHex as hex,SortOrder as sort_order", "ISNULL(SortOrder,999),ColorID", "ColorHex,SortOrder"),
        "sizes", new Catalog("Sizes", "SizeID", "SizeName", 20, "SizeStandard as standard,SortOrder as sort_order", "ISNULL(SortOrder,999),SizeID", "SizeStandard,SortOrder")
    );
    private final JdbcTemplate jdbc;
    public CatalogService(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    private Catalog catalog(String type) {
        Catalog c = CATALOGS.get(type); if (c == null) throw new ApiException(404, "Khong tim thay danh muc."); return c;
    }
    public List<Map<String, Object>> list(String type) {
        Catalog c = catalog(type);
        return jdbc.queryForList("SELECT " + c.id + " as id," + c.name + " as name," + (c.columns.isEmpty() ? "" : c.columns + ",") + "IsActive as active FROM " + c.table + " ORDER BY " + c.order);
    }
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> save(String type, String id, Map<String, Object> body) {
        Catalog c = catalog(type);
        String name = Values.text(body.get("name"), c.max + 1);
        if (name.isEmpty() || name.length() > c.max) throw new ApiException(400, "Ten khong duoc de trong hoac vuot gioi han.");
        boolean active = Values.bool(body.get("active"), true);
        Map<String, Object> fields = new LinkedHashMap<>(); fields.put(c.name, name);
        switch (type) {
            case "categories" -> { String sport = Values.text(body.get("sport"), 50); fields.put("Sport", sport.isEmpty() ? null : sport); }
            case "brands" -> fields.put("LogoURL", Values.text(body.get("logo_url"), 2200000));
            case "colors" -> {
                String hex = Values.text(body.get("hex"), 20); if (hex.isEmpty()) hex = "#000000";
                if (!hex.matches("(?i)#[0-9a-f]{3,8}")) throw new ApiException(400, "Ma mau HEX khong hop le.");
                fields.put("ColorHex", hex);
            }
            case "sizes" -> {
                String standard = Values.text(body.get("standard"),20).toUpperCase(java.util.Locale.ROOT);
                if (!java.util.Set.of("EU","US","UK").contains(standard)) throw new ApiException(400,"Chỉ chấp nhận hệ kích cỡ EU, US hoặc UK.");
                try {
                    var size = new java.math.BigDecimal(name);
                    int min = standard.equals("EU") ? 14 : 0, max = standard.equals("EU") ? 60 : 22;
                    if (size.compareTo(java.math.BigDecimal.valueOf(min))<0 || size.compareTo(java.math.BigDecimal.valueOf(max))>0 || size.multiply(java.math.BigDecimal.valueOf(2)).stripTrailingZeros().scale()>0) throw new NumberFormatException();
                    name=size.stripTrailingZeros().toPlainString(); fields.put(c.name,name);
                } catch(NumberFormatException ex) { throw new ApiException(400,"Kích cỡ phải là số hợp lệ, bước 0,5; EU từ 14–60, US/UK từ 0–22."); }
                if (!jdbc.queryForList("SELECT SizeID FROM Sizes WITH(UPDLOCK,HOLDLOCK) WHERE SizeName=? AND SizeStandard=? AND SizeID<>?",name,standard,id==null?0:Values.integer(id,1,Integer.MAX_VALUE,null)).isEmpty())
                    throw new ApiException(409,"Kích cỡ đã tồn tại trong cùng hệ. Hãy sửa trạng thái bản ghi hiện có.");
                fields.put("SizeStandard",standard);
            }
            default -> { }
        }
        if (c.extra.contains("SortOrder")) fields.put("SortOrder", Values.integer(body.get("sort_order"), 0, 1000000, 0));
        fields.put("IsActive", active);
        List<Object> args = new ArrayList<>(fields.values());
        if (id == null) {
            jdbc.update("INSERT INTO " + c.table + " (" + String.join(",", fields.keySet()) + ") VALUES (" + String.join(",", java.util.Collections.nCopies(fields.size(), "?")) + ")", args.toArray());
        } else {
            args.add(Values.integer(id, 1, Integer.MAX_VALUE, null));
            int count = jdbc.update("UPDATE " + c.table + " SET " + String.join(",", fields.keySet().stream().map(key -> key + "=?").toList()) + " WHERE " + c.id + "=?", args.toArray());
            if (count != 1) throw new ApiException(404, "Khong tim thay du lieu danh muc.");
        }
        return Values.success();
    }
    public Map<String, Object> delete(String type, String id) {
        Catalog c = catalog(type); int value = Values.integer(id, 1, Integer.MAX_VALUE, null);
        int count = jdbc.update("UPDATE " + c.table + " SET IsActive=0 WHERE " + c.id + "=?", value);
        if (count != 1) throw new ApiException(404, "Khong tim thay du lieu danh muc.");
        return Values.success();
    }
}
