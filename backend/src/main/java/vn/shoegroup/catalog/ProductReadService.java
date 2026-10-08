// Mục đích: Truy vấn sản phẩm, giá bán, khuyến mãi và tồn kho theo hợp đồng dữ liệu của Vue.
package vn.shoegroup.catalog;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.ColumnMapRowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import vn.shoegroup.api.Values;

@Service
public class ProductReadService {
    private final NamedParameterJdbcTemplate jdbc;
    private final Map<String, List<String>> queries;
    public ProductReadService(NamedParameterJdbcTemplate jdbc, ObjectMapper mapper) throws IOException {
        this.jdbc = jdbc;
        try (var input = new ClassPathResource("read-queries.json").getInputStream()) { queries = mapper.readValue(input, new TypeReference<>() {}); }
    }
    private String sql(String route, int index) { return queries.get(route).get(index); }
    private static long number(Object value) { return value instanceof Number n ? n.longValue() : 0; }
    private static double price(Object value) { return value instanceof Number n ? n.doubleValue() : 0; }
    public List<Map<String, Object>> products() {
        var products = jdbc.queryForList(sql("/api/products", 0), Map.of());
        var variants = jdbc.queryForList(sql("/api/products", 1), Map.of());
        var images = jdbc.queryForList(sql("/api/products", 2), Map.of());
        Map<String, Object> imageByColor = new HashMap<>();
        for (var image : images) {
            String key = number(image.get("product_id")) + "::" + (image.get("color") == null ? "" : image.get("color"));
            if (!imageByColor.containsKey(key) || Boolean.TRUE.equals(image.get("is_primary"))) imageByColor.put(key, image.get("image"));
        }
        Map<Long, List<Map<String, Object>>> byProduct = new HashMap<>(), imagesByProduct = new HashMap<>();
        for (var variant : variants) byProduct.computeIfAbsent(number(variant.get("product_id")), id -> new ArrayList<>()).add(variant);
        for (var image : images) imagesByProduct.computeIfAbsent(number(image.get("product_id")), id -> new ArrayList<>()).add(image);
        for (var product : products) {
            long id = number(product.get("id"));
            var vs = byProduct.getOrDefault(id, List.of());
            if (!vs.isEmpty()) product.put("sale_price", vs.stream().filter(v -> price(v.get("sale_price")) > 0 && price(v.get("sale_price")) < price(v.get("price"))).mapToDouble(v -> price(v.get("sale_price"))).min().orElse(0));
            var sizes = vs.stream().map(v -> v.get("size")).filter(s -> s != null && !s.equals("")).distinct().toList();
            long stock = vs.stream().mapToLong(v -> number(v.get("stock"))).sum();
            product.put("variants", vs); product.put("sizes", sizes); product.put("total_stock", stock); product.put("stock", stock);
            product.put("variant_count", vs.size()); product.put("in_stock", stock > 0);
            product.put("stock_by_size", sizes.stream().map(size -> Map.of("size", size, "stock", vs.stream().filter(v -> size.equals(v.get("size"))).mapToLong(v -> number(v.get("stock"))).sum())).toList());
            Map<String, Map<String, Object>> colors = new LinkedHashMap<>();
            for (var variant : vs) {
                String color = Values.string(variant.get("color"));
                if (!color.isEmpty()) colors.computeIfAbsent(color, key -> new LinkedHashMap<>(Map.of("name", color, "hex", variant.get("hex") == null ? "" : variant.get("hex"), "image", "")));
            }
            for (var image : imagesByProduct.getOrDefault(id, List.of())) {
                String color = Values.string(image.get("color"));
                if (!color.isEmpty()) colors.computeIfAbsent(color, key -> new LinkedHashMap<>(Map.of("name", color, "hex", "", "image", "")));
            }
            colors.forEach((color, entry) -> { if (imageByColor.containsKey(id + "::" + color)) entry.put("image", imageByColor.get(id + "::" + color)); });
            product.put("colors", new ArrayList<>(colors.values()));
        }
        return products;
    }
    public Map<String, Object> paginated(Map<String, String> input) {
        int page = Values.integer(input.get("page"), 1, 100000, 1), limit = Values.integer(input.get("limit"), 1, 100, 12);
        String search = input.getOrDefault("q", ""); search = search.substring(0, Math.min(search.length(), 100));
        Map<String, Object> params = new HashMap<>();
        params.put("offset", (page - 1) * limit); params.put("limit", limit); params.put("q", search.isEmpty() ? null : "%" + search + "%");
        params.put("cat", input.get("categoryId") == null || input.get("categoryId").isEmpty() ? null : Values.integer(input.get("categoryId"), 0, 1000000000, 0));
        params.put("brand", input.get("brandId") == null || input.get("brandId").isEmpty() ? null : Values.integer(input.get("brandId"), 0, 1000000000, 0));
        String where = "WHERE ISNULL(p.IsActive,1)=1 AND (:q IS NULL OR p.ProductName LIKE :q) AND (:cat IS NULL OR p.CategoryID=:cat) AND (:brand IS NULL OR p.BrandID=:brand)";
        String order = switch (input.getOrDefault("sort", "newest")) {
            case "price_asc" -> "COALESCE(NULLIF(pricing.MinSalePrice,0),pricing.MinPrice,p.BasePrice) ASC";
            case "price_desc" -> "COALESCE(NULLIF(pricing.MinSalePrice,0),pricing.MinPrice,p.BasePrice) DESC";
            case "name" -> "p.ProductName ASC"; case "popular" -> "ISNULL(p.ViewCount,0) DESC";
            default -> "p.CreatedAt DESC,p.ProductID DESC";
        };
        String query = sql("/api/v2/products", 0).replace("${where}", where).replace("${orderBy}", order);
        List<List<Map<String, Object>>> sets = jdbc.execute(query, params, statement -> {
            List<List<Map<String, Object>>> result = new ArrayList<>(); var rowMapper = new ColumnMapRowMapper();
            boolean rows = statement.execute();
            while (rows || statement.getUpdateCount() != -1) {
                if (rows) {
                    List<Map<String, Object>> current = new ArrayList<>();
                    try (var rs = statement.getResultSet()) { for (int row = 0; rs.next(); row++) current.add(rowMapper.mapRow(rs, row)); }
                    result.add(current);
                }
                rows = statement.getMoreResults();
            }
            return result;
        });
        long total = number(sets.get(0).get(0).get("total"));
        return Map.of("data", sets.get(1), "pagination", Map.of("page", page, "limit", limit, "total", total, "totalPages", (total + limit - 1) / limit));
    }
    public Map<String, Object> featured(String rawLimit) {
        int limit = Values.integer(rawLimit, 1, 40, 8);
        return Map.of("data", jdbc.queryForList(sql("/api/v2/products/featured", 0), Map.of("limit", limit)));
    }
    public List<Map<String, Object>> inventory() { return jdbc.queryForList(sql("/api/inventory", 0), Map.of()); }
    public Map<String, Object> alerts(String rawThreshold) {
        int threshold = Values.integer(rawThreshold, 0, 1000000, 10);
        var rows = jdbc.queryForList(sql("/api/inventory/alerts", 0), Map.of("th", threshold));
        var empty = rows.stream().filter(row -> number(row.get("stock")) <= 0).toList();
        var low = rows.stream().filter(row -> number(row.get("stock")) > 0).toList();
        return Map.of("threshold", threshold, "out_of_stock_count", empty.size(), "low_stock_count", low.size(), "out_of_stock_product_count", empty.stream().map(row -> row.get("product_id")).distinct().count(), "out_of_stock", empty, "low_stock", low, "items", rows);
    }
    public List<Map<String, Object>> discounts(boolean variant) { return jdbc.queryForList(sql(variant ? "/api/variantDiscounts" : "/api/discounts", 0), Map.of()); }
}
