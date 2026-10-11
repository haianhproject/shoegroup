// Mục đích: Áp dụng các bản cập nhật SQL cần khi khởi động, có khóa chống chạy đồng thời.
package vn.shoegroup.config;

import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(
    name = "shoegroup.schema-enabled",
    havingValue = "true",
    matchIfMissing = true)
public class SchemaInitializer {
  private static final List<String> MIGRATIONS =
      List.of(
          "20260909_checkout_idempotency.sql",
          "20260909_coupon_redemptions.sql",
          "20260919_confirmation_stock_deduction.sql",
          "20260920_order_variant_image_snapshot.sql",
          "20260923_variant_discount_order_tracking.sql",
          "20260923_variant_discount_scope.sql",
          "20261004_pos_cart_stock.sql",
          "20261004_revenue_history.sql",
          "20261010_catalog_optimization.sql",
          "20261010_staff_role.sql");
  private final JdbcTemplate jdbc;

  public SchemaInitializer(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @PostConstruct
  public void initialize() {
    jdbc.execute(
        (ConnectionCallback<Void>)
            connection -> {
              boolean locked = false;
              try (var statement = connection.createStatement()) {
                try (var result =
                    statement.executeQuery(
                        "DECLARE @r int; EXEC @r=sys.sp_getapplock"
                            + " @Resource=N'shoegroup-schema',@LockMode='Exclusive',@LockOwner='Session',@LockTimeout=30000;"
                            + " SELECT @r")) {
                  if (!result.next() || result.getInt(1) < 0)
                    throw new java.sql.SQLException("Cannot lock schema migration");
                  locked = true;
                }
                for (String name : MIGRATIONS) {
                  if (name.compareTo("20261010_catalog_optimization.sql") < 0) {
                    try (var done = statement.executeQuery("SELECT CASE WHEN OBJECT_ID('dbo.ProductVariantRead','V') IS NOT NULL THEN 1 ELSE 0 END")) {
                      if (done.next() && done.getInt(1) == 1) continue;
                    }
                  }
                  String script;
                  try (var in = new ClassPathResource("db/migrations/" + name).getInputStream()) {
                    script =
                        new String(in.readAllBytes(), StandardCharsets.UTF_8).replace("\uFEFF", "");
                  } catch (java.io.IOException ex) {
                    throw new java.sql.SQLException("Missing migration: " + name, ex);
                  }
                  for (String batch : script.split("(?im)^\\s*GO\\s*(?:--[^\\r\\n]*)?$"))
                    if (!batch.isBlank()) {
                      boolean results = statement.execute(batch);
                      while (results || statement.getUpdateCount() != -1)
                        results = statement.getMoreResults();
                    }
                }
                try (var result =
                    statement.executeQuery(
                        "SELECT CASE WHEN COL_LENGTH('dbo.VariantDiscounts','ApplyScope') IS NOT"
                            + " NULL AND COL_LENGTH('dbo.OrderDetails','VariantDiscountID') IS NOT"
                            + " NULL AND COL_LENGTH('dbo.Orders','VariantDiscountRestoredAt') IS"
                            + " NOT NULL AND OBJECT_ID('dbo.PosCarts','U') IS NOT NULL AND"
                            + " OBJECT_ID('dbo.PosCartItems','U') IS NOT NULL THEN 1 ELSE 0 END")) {
                  if (!result.next() || result.getInt(1) != 1)
                    throw new java.sql.SQLException("Database schema is incompatible");
                }
              } finally {
                try (var cleanup = connection.createStatement()) {
                  cleanup.execute("IF @@TRANCOUNT>0 ROLLBACK TRANSACTION");
                  if (locked)
                    cleanup.execute(
                        "EXEC sys.sp_releaseapplock"
                            + " @Resource=N'shoegroup-schema',@LockOwner='Session'");
                }
              }
              return null;
            });
  }
}
