// Mục đích: Tự hủy đơn quá hạn và ghi nhận doanh thu khi đủ điều kiện, tránh xử lý lặp.
package vn.shoegroup.orders;

import static vn.shoegroup.orders.OrderSql.*;

import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Component
@ConditionalOnProperty(name = "shoegroup.jobs-enabled", havingValue = "true", matchIfMissing = true)
public class OrderJobs {
  private final OrderSql sql;
  private final OrderEffects effects;
  private final TransactionTemplate transaction;

  public OrderJobs(OrderSql sql, OrderEffects effects, PlatformTransactionManager manager) {
    this.sql = sql;
    this.effects = effects;
    transaction = new TransactionTemplate(manager);
    transaction.setIsolationLevel(TransactionDefinition.ISOLATION_SERIALIZABLE);
  }

  @Scheduled(
      initialDelayString = "${shoegroup.jobs-initial-delay:5000}",
      fixedDelayString = "${shoegroup.jobs-delay:3600000}")
  public void run() {
    try {
      for (var row : sql.rows("runAutoCancelJob", 0, params())) {
        int id = ((Number) row.get("OrderID")).intValue();
        try {
          transaction.executeWithoutResult(
              status -> {
                var orders = sql.rows("runAutoCancelJob", 1, params("id", id));
                if (orders.isEmpty()) return;
                var order = orders.get(0);
                sql.stock(id, true);
                sql.restorePromotion(id);
                String reason =
                    "Shop chưa chuẩn bị hàng cho khách. Xin lỗi quý khách, vui lòng đặt lại đơn"
                        + " hàng.";
                sql.update("runAutoCancelJob", 2, params("id", id, "reason", reason));
                if (paid(order.get("PaymentStatus"))) sql.refund(id, order.get("TotalAmount"));
                sql.history(id, order.get("Status"), "Đã hủy", reason, null);
                effects.afterCommit(id, "expired", null);
              });
        } catch (Exception ex) {
          LoggerFactory.getLogger(OrderJobs.class)
              .warn("Order expiry failed for {} ({})", id, ex.getClass().getSimpleName());
        }
      }
      sql.update("runAutoCancelJob", 3, params());
    } catch (Exception ex) {
      LoggerFactory.getLogger(OrderJobs.class)
          .warn("Order jobs failed ({})", ex.getClass().getSimpleName());
    }
  }
}
