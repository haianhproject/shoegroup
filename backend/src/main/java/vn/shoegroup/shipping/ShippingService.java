// Mục đích: Tính phí và thời gian giao hàng theo tỉnh, khoảng cách và quy tắc vận chuyển hiện hành.
package vn.shoegroup.shipping;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.text.Normalizer;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.shoegroup.api.ApiException;
import vn.shoegroup.api.Values;

@Service
public class ShippingService {
    private final JdbcTemplate jdbc;
    private final List<Map.Entry<String, Integer>> rules;
    private final Map<String, Object> fallback;
    public ShippingService(JdbcTemplate jdbc, ObjectMapper mapper) throws IOException {
        this.jdbc = jdbc;
        try (var input = new ClassPathResource("shipping-distances.json").getInputStream()) {
            Map<String, Integer> distances = mapper.readValue(input, new TypeReference<LinkedHashMap<String, Integer>>() {});
            rules = distances.entrySet().stream().sorted(Comparator.comparingInt((Map.Entry<String, Integer> e) -> e.getKey().length()).reversed()).toList();
        }
        fallback = new LinkedHashMap<>();
        fallback.put("ShippingMethodID", null); fallback.put("MethodCode", "STANDARD");
        fallback.put("MethodName", "Giao hàng tiêu chuẩn"); fallback.put("BasePrice", 30000); fallback.put("PricePerKm", 0);
        fallback.put("OriginCity", "Hai Bà Trưng, Hà Nội"); fallback.put("EstimatedTimeText", "2 - 3 ngày");
    }
    public List<Map<String, Object>> methods() {
        List<Map<String, Object>> rows;
        try {
            rows = jdbc.queryForList("SELECT ShippingMethodID,MethodCode,MethodName,BasePrice,PricePerKm,OriginCity,EstimatedTimeText FROM ShippingMethods WHERE ISNULL(IsActive,1)=1 AND UPPER(MethodCode)='STANDARD' ORDER BY ShippingMethodID");
            rows = rows.stream().filter(r -> text(r.get("MethodCode"), "").trim().equalsIgnoreCase("STANDARD")).toList();
        } catch (DataAccessException ex) { rows = List.of(); }
        if (rows.isEmpty()) rows = List.of(fallback);
        return rows.stream().map(row -> {
            Map<String, Object> method = new LinkedHashMap<>();
            method.put("id", row.get("ShippingMethodID")); method.put("code", text(row.get("MethodCode"), "STANDARD").trim().toUpperCase(Locale.ROOT));
            method.put("name", text(row.get("MethodName"), "Giao hàng tiêu chuẩn")); method.put("basePrice", number(row.get("BasePrice")));
            method.put("pricePerKm", number(row.get("PricePerKm"))); method.put("originCity", text(row.get("OriginCity"), "Hai Bà Trưng, Hà Nội"));
            method.put("eta", text(row.get("EstimatedTimeText"), "2 - 3 ngày")); method.put("desc", "Tính theo khoảng cách từ kho Hai Bà Trưng, Hà Nội.");
            return method;
        }).toList();
    }
    public Map<String, Object> quote(Map<String, Object> body) {
        String code = Values.text(Values.first(body, "STANDARD", "methodCode", "method_code"), 20).toUpperCase(Locale.ROOT);
        if (!code.equals("STANDARD")) throw new ApiException(400, "Phương thức vận chuyển không hợp lệ.");
        String province = normalize(Values.text(Values.first(body, "", "province", "provinceName", "city"), 100));
        String location = normalize(Values.text(Values.first(body, "", "address", "addressLine", "shippingAddress"), 500) + " " +
            Values.text(Values.first(body, "", "ward", "commune", "communeName"), 100) + " " + Values.text(body.get("district"), 100));
        var match = rules.stream().filter(e -> province.equals(e.getKey()) || province.contains(e.getKey()) || (province.isEmpty() && location.contains(e.getKey()))).findFirst();
        int distance = match.map(Map.Entry::getValue).orElse(150);
        Map<String, Object> method = fallback;
        try {
            var rows = jdbc.queryForList("SELECT TOP 1 ShippingMethodID,MethodCode,MethodName,BasePrice,PricePerKm,OriginCity,EstimatedTimeText FROM ShippingMethods WHERE UPPER(MethodCode)=? AND ISNULL(IsActive,1)=1 ORDER BY ShippingMethodID", code);
            if (!rows.isEmpty()) method = rows.get(0);
        } catch (DataAccessException ex) { /* Older schemas use the same fallback as Express. */ }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true); result.put("methodId", method.get("ShippingMethodID")); result.put("methodCode", text(method.get("MethodCode"), code).trim().toUpperCase(Locale.ROOT));
        result.put("methodName", text(method.get("MethodName"), "Giao hàng tiêu chuẩn")); result.put("basePrice", Math.max(0, number(method.get("BasePrice"))));
        result.put("pricePerKm", Math.max(0, number(method.get("PricePerKm")))); result.put("distanceKm", distance); result.put("estimatedDistance", match.isEmpty());
        result.put("matchedProvince", match.map(Map.Entry::getKey).orElse(null)); result.put("fee", fee(distance)); result.put("eta", eta(distance));
        result.put("originCity", text(method.get("OriginCity"), "Hai Bà Trưng, Hà Nội"));
        return result;
    }
    static int fee(int d) { return d <= 20 ? 30000 : d <= 50 ? 35000 : d <= 120 ? 40000 : d <= 300 ? 45000 : d <= 600 ? 55000 : d <= 1000 ? 65000 : 75000; }
    static String eta(int d) { return d <= 30 ? "1 ngày" : d <= 100 ? "1-2 ngày" : d <= 300 ? "2 ngày" : d <= 600 ? "2-3 ngày" : d <= 1200 ? "3-4 ngày" : "4-5 ngày"; }
    private String normalize(String value) { return Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}+", "").replace('đ', 'd').replace('Đ', 'd').toLowerCase(Locale.ROOT).replaceAll("[.,;:/()\\[\\]{}]+", " ").replaceAll("\\s+", " ").trim(); }
    private String text(Object value, String fallback) { return value == null || value.toString().isEmpty() ? fallback : value.toString(); }
    private double number(Object value) { return value instanceof Number n ? n.doubleValue() : 0; }
}
