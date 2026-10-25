// Mục đích: Xử lý trạng thái, thanh toán, nhận hàng và đổi địa chỉ; kiểm tra quyền và hoàn tồn một lần.
package vn.shoegroup.orders;

import static vn.shoegroup.orders.OrderSql.*;

import java.math.BigDecimal;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import vn.shoegroup.api.*;
import vn.shoegroup.security.ApiUser;

@Service
public class OrderWorkflow {
  private final OrderSql sql;
  private final OrderEffects effects;
  static final Set<String> EDITABLE =
      Set.of(
          "cho xac nhan",
          "cho xu ly",
          "pending",
          "da xac nhan",
          "confirmed",
          "dang lay hang",
          "dang chuan bi hang",
          "processing",
          "picking");

  public OrderWorkflow(OrderSql sql, OrderEffects effects) {
    this.sql = sql;
    this.effects = effects;
  }

  private void owner(ApiUser user, Map<String, Object> order) {
    if (!user.staff() && number(order.get("UserID")) != user.id())
      throw new ApiException(403, "Ban khong duoc cap nhat don hang nay.");
  }

  @Transactional(isolation = Isolation.SERIALIZABLE)
  public Map<String, Object> status(int id, ApiUser user, Map<String, Object> body) {
    String operation = "put /api/orders/:id/status",
        reason = Values.text(body.get("reason"), 500),
        next = sql.canonical(body.get("status")),
        n = normalize(next);
    var order = sql.one(operation, 0, params("oid", id));
    owner(user, order);
    String current = normalize(order.get("Status"));
    boolean cancel = n.equals("da huy"),
        cancelled = Set.of("da huy", "cancelled", "canceled").contains(current);
    boolean shipping =
        Set.of("dang van chuyen", "dang giao", "shipped", "shipping").contains(current);
    boolean lostCancellation =
        user.staff()
            && cancel
            && lost(reason)
            && (shipping || current.equals("giao hang that bai"));
    boolean warehouse = n.equals("ve kho"),
        reship = current.equals("ve kho") && n.equals("dang van chuyen"),
        confirm =
            Set.of("cho xac nhan", "cho xu ly", "pending").contains(current)
                && n.equals("da xac nhan");
    if (Set.of("yeu cau tra hang", "da hoan tat tra hang").contains(n))
      throw new ApiException(
          409, "RETURN_FLOW_REQUIRED", "Trang thai tra hang can quy trinh tra hang.");
    if ((text(order.get("StockIssueStatus")).equals("LOST_IN_TRANSIT")
            || lost(text(order.get("StockIssueReason")) + " " + text(order.get("CancelReason"))))
        && !cancel)
      throw new ApiException(409, "LOST_ORDER_TERMINAL", "Don that lac khong the giao lai.");
    if (cancel && !cancelled && reason.isEmpty())
      throw new ApiException(400, "CANCEL_REASON_REQUIRED", "Vui long nhap ly do huy.");
    if (!cancel && !sql.allowed(order.get("Status"), next))
      throw new ApiException(409, "Khong the chuyen trang thai don hang.");
    if (!user.staff() && !cancel)
      throw new ApiException(403, "Khach hang chi co the huy don qua API nay.");
    if (cancel && !cancelled && !EDITABLE.contains(current) && !lostCancellation)
      throw new ApiException(409, "Don hang khong con o trang thai co the huy.");
    if (user.staff()
        && Set.of("da xac nhan", "dang van chuyen").contains(n)
        && bank(order.get("PaymentMethod"))
        && !paid(order.get("PaymentStatus")))
      throw new ApiException(409, "PAYMENT_REQUIRED", "Don chuyen khoan chua duoc thanh toan.");
    if (current.equals(n) || cancel && cancelled) return Map.of("success", true, "unchanged", true);
    boolean deducted = false;
    if (confirm || reship) deducted = sql.stock(id, false);
    if (warehouse || cancel && !lostCancellation) sql.stock(id, true);
    if (cancel) sql.restorePromotion(id);
    sql.update(
        operation,
        1,
        params(
            "id",
            id,
            "s",
            next,
            "r",
            reason,
            "lost",
            lostCancellation,
            "accident",
            accident(reason)));
    if (cancel && paid(order.get("PaymentStatus"))) sql.refund(id, order.get("TotalAmount"));
    if (n.equals("da giao hang thanh cong") && cod(order.get("PaymentMethod")))
      sql.collect(id, order.get("TotalAmount"), "COD_COLLECTION");
    boolean direct = user.staff() && shipping && (warehouse || lostCancellation);
    if (direct) sql.history(id, order.get("Status"), "Giao hàng thất bại", reason, user.id());
    sql.history(
        id,
        direct ? "Giao hàng thất bại" : order.get("Status"),
        next,
        reason.isEmpty() ? "Cập nhật trạng thái đơn hàng" : reason,
        user.id());
    Object customer = order.get("UserID");
    if (n.equals("giao hang that bai"))
      sql.notify(
          customer,
          id,
          "Giao hàng thất bại",
          "Đơn hàng của bạn giao không thành công. Vui lòng vào mục Trả hàng để báo chưa nhận được"
              + " hàng hoặc theo dõi hướng xử lý.");
    else if (reship)
      sql.notify(
          customer,
          id,
          "Đơn hàng được sắp xếp giao lại",
          "Shop đã sắp xếp giao lại đơn hàng vào thời gian gần nhất. Bạn có thể theo dõi tiếp trạng"
              + " thái đang giao hàng và giao hàng thành công.");
    else if (warehouse && accident(reason))
      sql.notify(
          customer, id, "Sự cố vận chuyển", "Đơn gặp sự cố vận chuyển. Shop sẽ giao lại sớm.");
    else if (warehouse)
      sql.notify(
          customer,
          id,
          "Chưa liên hệ được người nhận",
          "Đơn chưa giao được vì chưa liên hệ được người nhận. Shop sẽ giao lại sớm.");
    else if (lostCancellation)
      sql.notify(
          customer,
          id,
          "Hàng bị thất lạc",
          "Hàng bị thất lạc trong quá trình vận chuyển nên đơn đã hủy."
              + (bank(order.get("PaymentMethod"))
                  ? " Nếu đã chuyển khoản, vui lòng liên hệ shop để được hoàn tiền."
                  : " Nếu đã thanh toán, shop sẽ xử lý hoàn tiền theo quy định."));
    effects.afterCommit(id, "status_changed", null);
    return Map.of("success", true, "stock_deducted", deducted);
  }

  @Transactional(isolation = Isolation.SERIALIZABLE)
  public Map<String, Object> payment(int id, ApiUser user, Map<String, Object> body) {
    String operation = "put /api/orders/:id/payment",
        next = OrderSql.payment(Values.first(body, "Chưa thanh toán", "payment_status")),
        n = normalize(next);
    var order = sql.one(operation, 0, params("id", id));
    owner(user, order);
    String current = normalize(order.get("PaymentStatus")), status = normalize(order.get("Status"));
    boolean terminal = Set.of("da huy", "da hoan tat tra hang").contains(status),
        customer = !user.staff();
    if (customer) {
      if (!bank(order.get("PaymentMethod"))
          || !Set.of("cho thanh toan", "da thanh toan").contains(n))
        throw new ApiException(403, "Khach chi duoc xac nhan chuyen khoan.");
      if (terminal
          || Set.of("da thanh toan", "hoan tien", "cho hoan tien", "da huy").contains(current))
        throw new ApiException(409, "Trang thai thanh toan khong the thay doi.");
      next = "Đã thanh toán";
    } else {
      if (body.containsKey("amount")
              && CheckoutService.money(body.get("amount"))
                      .compareTo(new BigDecimal(text(order.get("TotalAmount"))))
                  != 0
          || body.containsKey("currency") && !Objects.equals(body.get("currency"), "VND"))
        throw new ApiException(409, "So tien hoac loai tien khong khop.");
      boolean terminalPayment = Set.of("hoan tien", "cho hoan tien", "da huy").contains(current);
      if ((terminal || terminalPayment) && n.equals("da thanh toan"))
        throw new ApiException(409, "Don da ket thuc, khong ghi nhan thanh toan moi.");
      if (current.equals(n))
        return Map.of("success", true, "payment_status", order.get("PaymentStatus"));
      if (terminal
          || terminalPayment
          || current.equals("da thanh toan")
          || Set.of("hoan tien", "cho hoan tien", "da huy").contains(n))
        throw new ApiException(409, "Khong duoc sua truc tiep trang thai thu/hoan tien.");
      if (cod(order.get("PaymentMethod"))
          && n.equals("da thanh toan")
          && !Set.of("da giao hang thanh cong", "da nhan hang").contains(status))
        throw new ApiException(409, "COD chi thanh toan khi giao thanh cong.");
    }
    sql.update(operation, 1, params("id", id, "ps", next));
    if (customer) sql.update(operation, 2, params("oid", id, "amt", order.get("TotalAmount")));
    else if (n.equals("da thanh toan"))
      sql.update(
          operation,
          3,
          params("oid", id, "amt", order.get("TotalAmount"), "provider", "MANUAL_CONFIRM"));
    sql.history(
        id,
        order.get("Status"),
        order.get("Status"),
        "[PAYMENT_STATUS] " + order.get("PaymentStatus") + " -> " + next,
        user.id());
    effects.afterCommit(id, "payment_changed", paid(next) ? "paid" : null);
    return Map.of("success", true, "payment_status", next);
  }

  @Transactional(isolation = Isolation.SERIALIZABLE)
  public Map<String, Object> receive(int id, ApiUser user) {
    String operation = "put /api/orders/:id/receive";
    var order = sql.one(operation, 0, params("id", id));
    owner(user, order);
    if (!Set.of("da giao", "da giao hang thanh cong", "delivered")
        .contains(normalize(order.get("Status"))))
      throw new ApiException(409, "Don hang chua o trang thai da giao.");
    sql.update(operation, 1, params("id", id, "hold", 14));
    sql.history(id, order.get("Status"), "Đã nhận hàng", "Khách xác nhận đã nhận hàng", user.id());
    effects.afterCommit(id, "received", null);
    return Values.success();
  }

  @Transactional(isolation = Isolation.SERIALIZABLE)
  public Map<String, Object> address(int id, ApiUser user, Map<String, Object> body) {
    String operation = "put /api/orders/:id/address";
    int aid = Values.integer(body.get("addressId"), 1, Integer.MAX_VALUE, null);
    var addresses = sql.rows(operation, 0, params("aid", aid));
    if (addresses.isEmpty()) throw new ApiException(400, "Dia chi khong hop le.");
    var order = sql.one(operation, 1, params("oid", id));
    owner(user, order);
    if (!EDITABLE.contains(normalize(order.get("Status"))))
      throw new ApiException(409, "Don da giao hoac ket thuc khong the doi dia chi.");
    var address = sql.address(aid, order.get("UserID"));
    String full = Values.text(address.get("fullAddress"), 500);
    boolean unchanged =
        number(order.get("AddressID")) == aid
            && text(order.get("ShippingAddress")).equals(full)
            && text(order.get("CustomerName")).equals(address.get("recipient"))
            && text(order.get("CustomerPhone")).equals(address.get("phone"));
    var result =
        params(
            "success",
            true,
            "orderId",
            id,
            "addressId",
            aid,
            "shippingAddress",
            full,
            "customerName",
            address.get("recipient"),
            "customerPhone",
            address.get("phone"));
    if (unchanged) {
      result.put("unchanged", true);
      return result;
    }
    if (!sql.rows(operation, 2, params("oid", id)).isEmpty())
      throw new ApiException(
          409, "ADDRESS_CHANGE_LIMIT_REACHED", "Moi don chi duoc doi dia chi mot lan.");
    sql.update(
        operation,
        3,
        params(
            "oid",
            id,
            "uid",
            order.get("UserID"),
            "aid",
            aid,
            "address",
            full,
            "name",
            address.get("recipient"),
            "phone",
            address.get("phone")));
    sql.history(
        id,
        order.get("Status"),
        order.get("Status"),
        "[ADDRESS_CHANGED] " + text(order.get("ShippingAddress")) + " => " + full,
        user.id());
    result.put("addressChanged", true);
    effects.afterCommit(id, "address_changed", null);
    return result;
  }
}
