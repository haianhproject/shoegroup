// Mục đích: Phân bổ giảm giá và làm tròn tiền trả từng phần theo giá trên đơn gốc.
package vn.shoegroup.orders;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

public final class ReturnAmounts {
  private ReturnAmounts() {}
  public static BigDecimal money(Object value) {
    return new BigDecimal(Objects.toString(value, "0")).setScale(2, RoundingMode.HALF_UP);
  }
  public static Map<Integer, BigDecimal> allocate(List<Map<String, Object>> items, BigDecimal netGoods) {
    BigDecimal gross = items.stream().map(i -> money(i.get("UnitPrice")).multiply(money(i.get("Quantity"))))
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal net = netGoods.max(BigDecimal.ZERO).min(gross).setScale(0, RoundingMode.DOWN);
    Map<Integer, BigDecimal> result = new LinkedHashMap<>();
    BigDecimal remaining = net;
    for (int index = 0; index < items.size(); index++) {
      var item = items.get(index);
      BigDecimal weight = money(item.get("UnitPrice")).multiply(money(item.get("Quantity")));
      BigDecimal amount = gross.signum() == 0 ? BigDecimal.ZERO : index == items.size() - 1 ? remaining
          : net.multiply(weight).divide(gross, 0, RoundingMode.DOWN);
      remaining = remaining.subtract(amount);
      result.put(((Number)item.get("OrderDetailID")).intValue(), amount);
    }
    return result;
  }
  public static BigDecimal portion(BigDecimal netLine, int sold, int alreadyReturned, int received) {
    if (sold <= 0 || alreadyReturned < 0 || received < 0 || (long)alreadyReturned + received > sold)
      throw new IllegalArgumentException("Invalid return quantity");
    BigDecimal before = netLine.multiply(BigDecimal.valueOf(alreadyReturned)).divide(BigDecimal.valueOf(sold), 0, RoundingMode.HALF_UP);
    BigDecimal after = netLine.multiply(BigDecimal.valueOf((long)alreadyReturned + received)).divide(BigDecimal.valueOf(sold), 0, RoundingMode.HALF_UP);
    return after.subtract(before);
  }
}
