// Mục đích: Phát sự kiện sau commit và gửi email đặt hàng/thanh toán bằng hàng đợi có giới hạn.
package vn.shoegroup.orders;

import jakarta.annotation.PreDestroy;
import java.util.*;
import java.util.concurrent.*;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import vn.shoegroup.api.Values;
import vn.shoegroup.events.AdminEvents;

@Service
public class OrderEffects {
  private final AdminEvents events;
  private final JdbcTemplate jdbc;
  private final JavaMailSender mail;
  private final Environment env;
  private final ExecutorService worker =
      new ThreadPoolExecutor(2, 2, 0, TimeUnit.SECONDS, new ArrayBlockingQueue<>(100));

  public OrderEffects(AdminEvents events, JdbcTemplate jdbc, JavaMailSender mail, Environment env) {
    this.events = events;
    this.jdbc = jdbc;
    this.mail = mail;
    this.env = env;
  }

  public void afterCommit(int order, String reason, String email) {
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            events.publish("order.updated", Map.of("orderId", order, "reason", reason));
            if (email != null
                && !env.getProperty("EMAIL_USER", "").isBlank()
                && !env.getProperty("EMAIL_PASS", "").isBlank()) {
              try {
                worker.execute(() -> send(order, email));
              } catch (RejectedExecutionException ex) {
                LoggerFactory.getLogger(OrderEffects.class)
                    .warn("Order email queue full for order {}", order);
              }
            }
          }
        });
  }

  void send(int id, String kind) {
    try {
      var rows =
          jdbc.queryForList(
              "SELECT o.*,u.Email FROM Orders o JOIN Users u ON u.UserID=o.UserID WHERE"
                  + " o.OrderID=?",
              id);
      if (rows.isEmpty()) return;
      var o = rows.get(0);
      String to = Values.email(o.get("Email"));
      if (to == null) return;
      String from = Values.email(env.getProperty("EMAIL_FROM_ADDRESS", ""));
      if (from == null) from = Values.email(env.getProperty("EMAIL_USER", ""));
      if (from == null) return;
      String title = kind.equals("paid") ? "Xác nhận thanh toán" : "Đặt hàng thành công";
      StringBuilder text = new StringBuilder("ShoeGroup - " + title + " #" + id + "\n\n");
      if (kind.equals("created"))
        for (var item :
            jdbc.queryForList(
                "SELECT ProductNameSnapshot,Quantity,UnitPrice,Size,Color FROM OrderDetails WHERE"
                    + " OrderID=? ORDER BY OrderDetailID",
                id))
          text.append(item.get("ProductNameSnapshot"))
              .append(" / ")
              .append(item.get("Size"))
              .append(" / ")
              .append(item.get("Color"))
              .append(" x")
              .append(item.get("Quantity"))
              .append(": ")
              .append(item.get("UnitPrice"))
              .append(" VND\n");
      text.append("\nTổng thanh toán: ")
          .append(o.get("TotalAmount"))
          .append(" VND\nPhương thức: ")
          .append(o.get("PaymentMethod"))
          .append("\nTrạng thái: ")
          .append(o.get("PaymentStatus"));
      text.append("\nĐịa chỉ: ")
          .append(o.get("ShippingAddress"))
          .append("\nTheo dõi: ")
          .append(env.getProperty("FRONTEND_URL", "http://localhost:3000").replaceAll("/+$", ""))
          .append("/orders\n\nEmail giao dịch tự động từ ShoeGroup.");
      var message = new SimpleMailMessage();
      message.setFrom(from);
      message.setTo(to);
      String reply = Values.email(env.getProperty("EMAIL_REPLY_TO", from));
      if (reply != null) message.setReplyTo(reply);
      message.setSubject("ShoeGroup - " + title + " #" + id);
      message.setText(text.toString());
      mail.send(message);
    } catch (Exception ex) {
      LoggerFactory.getLogger(OrderEffects.class)
          .warn("Order email failed for order {} ({})", id, ex.getClass().getSimpleName());
    }
  }

  @PreDestroy
  public void close() {
    worker.shutdown();
  }
}
