// Mục đích: Truy vấn, phân trang và chuẩn hóa dữ liệu đơn hàng/báo cáo cho frontend.
package vn.shoegroup.orders;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.time.LocalDate;
import java.util.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.ColumnMapRowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import vn.shoegroup.api.Values;
import vn.shoegroup.security.ApiUser;

@Service
public class OrderReadService {
  private final NamedParameterJdbcTemplate jdbc;
  private final ObjectMapper mapper;
  private final Map<String, List<String>> queries;

  public OrderReadService(NamedParameterJdbcTemplate jdbc, ObjectMapper mapper) throws IOException {
    this.jdbc = jdbc;
    this.mapper = mapper;
    try (var input = new ClassPathResource("read-queries.json").getInputStream()) {
      queries = mapper.readValue(input, new TypeReference<>() {});
    }
  }

  private String sql(String route, int index) {
    return queries.get(route).get(index);
  }

  private List<Map<String, Object>> rows(String query, Map<String, ?> args) {
    var rows = jdbc.queryForList(query, args);
    rows.forEach(OrderReadService::dates);
    return rows;
  }

  private static void dates(Map<String, Object> row) {
    row.replaceAll(
        (key, value) ->
            value instanceof java.sql.Timestamp t
                ? new java.time.format.DateTimeFormatterBuilder()
                    .appendInstant(3)
                    .toFormatter()
                    .format(t.toInstant())
                : value);
  }

  public List<Map<String, Object>> list(String route) {
    return rows(sql(route, 0), Map.of());
  }

  public List<Map<String, Object>> notifications(int user) {
    return rows(sql("/api/customers/:id/notifications", 0), Map.of("id", user));
  }

  public List<Map<String, Object>> chart(Map<String, String> input) {
    LocalDate now = LocalDate.now();
    return rows(
        sql("/api/chart-data", 0),
        Map.of(
            "y",
            Values.integer(input.get("year"), 1, 9999, now.getYear()),
            "m",
            Values.integer(input.get("month"), 1, 12, now.getMonthValue())));
  }

  public Map<String, Object> summary() {
    return list("/api/v2/dashboard/summary").get(0);
  }

  public List<Map<String, Object>> orders(Integer user) {
    String route = user == null ? "/api/orders" : "/api/customers/:id/orders";
    Map<String, ?> args = user == null ? Map.of() : Map.of("id", user);
    var orders = rows(sql(route, 0), args);
    if (orders.isEmpty()) return orders;
    var details = rows(sql(route, 1), args);
    String historyQuery = sql(route, 2);
    Map<String, ?> historyArgs = args;
    if (user == null) {
      historyQuery = historyQuery.replace("${orderIds.join(\",\")}", ":ids");
      historyArgs = Map.of("ids", orders.stream().map(o -> o.get("id")).toList());
    }
    var histories = rows(historyQuery, historyArgs);
    var productsByOrder = group(details);
    var historyByOrder = group(histories);
    for (var order : orders) {
      String key = order.get("id").toString();
      order.put("products", productsByOrder.getOrDefault(key, List.of()));
      order.put("history", historyByOrder.getOrDefault(key, List.of()));
    }
    return orders;
  }

  private Map<String, List<Map<String, Object>>> group(List<Map<String, Object>> rows) {
    Map<String, List<Map<String, Object>>> groups = new HashMap<>();
    for (var row : rows)
      groups.computeIfAbsent(row.get("OrderID").toString(), k -> new ArrayList<>()).add(row);
    return groups;
  }

  public Map<String, Object> paginated(ApiUser user, Map<String, String> input) {
    int page = Values.integer(input.get("page"), 1, 100000, 1),
        limit = Values.integer(input.get("limit"), 1, 100, 20);
    Map<String, Object> args = new HashMap<>();
    Object owner = user.id();
    if (user.staff())
      owner =
          input.getOrDefault("userId", "").isEmpty()
              ? null
              : Values.integer(input.get("userId"), 1, 1000000000, null);
    args.put("uid", owner);
    args.put(
        "st",
        input.getOrDefault("statusCode", "").isEmpty()
            ? null
            : Values.text(input.get("statusCode"), 30));
    args.put("offset", (page - 1) * limit);
    args.put("limit", limit);
    boolean useCode =
        ((Number) jdbc.queryForMap(sql("/api/v2/orders", 0), Map.of()).get("c")).intValue() > 0;
    String where =
        "WHERE (:uid IS NULL OR o.UserID=:uid) AND (:st IS NULL OR "
            + (useCode ? "o.StatusCode=:st" : "1=1")
            + ")";
    String query =
        sql("/api/v2/orders", 1)
            .replace("${where}", where)
            .replace(
                "${useCode ? \"o.StatusCode AS status_code,\" : \"\"}",
                useCode ? "o.StatusCode AS status_code," : "");
    List<List<Map<String, Object>>> sets =
        jdbc.execute(
            query,
            args,
            statement -> {
              List<List<Map<String, Object>>> result = new ArrayList<>();
              var rowMapper = new ColumnMapRowMapper();
              boolean rows = statement.execute();
              while (rows || statement.getUpdateCount() != -1) {
                if (rows) {
                  List<Map<String, Object>> current = new ArrayList<>();
                  try (var rs = statement.getResultSet()) {
                    for (int row = 0; rs.next(); row++) current.add(rowMapper.mapRow(rs, row));
                  }
                  result.add(current);
                }
                rows = statement.getMoreResults();
              }
              return result;
            });
    long total = ((Number) sets.get(0).get(0).get("total")).longValue();
    for (var row : sets.get(1)) {
      dates(row);
      Object json = row.remove("products_json");
      try {
        row.put(
            "products", json == null ? List.of() : mapper.readValue(json.toString(), List.class));
      } catch (IOException ex) {
        throw new IllegalStateException("Invalid order detail JSON", ex);
      }
    }
    return Map.of(
        "data",
        sets.get(1),
        "pagination",
        Map.of(
            "page",
            page,
            "limit",
            limit,
            "total",
            total,
            "totalPages",
            (total + limit - 1) / limit));
  }
}
