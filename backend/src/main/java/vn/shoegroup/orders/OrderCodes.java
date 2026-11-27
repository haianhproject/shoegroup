// Mục đích: Đồng nhất mã đơn trả về từ chatbot với mã trên giao diện và hóa đơn.
package vn.shoegroup.orders;
import java.time.LocalDate;
public final class OrderCodes {
  private OrderCodes() {}
  public static String format(long id,LocalDate date) {
    return "SGVN"+String.format("%02d%02d%02d%05d",date.getYear()%100,date.getMonthValue(),date.getDayOfMonth(),id)
        +(char)('A'+((id*7+3)%26))+((id*13+7)%10);
  }
}
