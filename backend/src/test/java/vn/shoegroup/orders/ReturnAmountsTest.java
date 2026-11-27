package vn.shoegroup.orders;
import static org.assertj.core.api.Assertions.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;

class ReturnAmountsTest {
  @Test void partialReturnsUseTheOriginalDiscountedAmount() {
    var lines=List.<Map<String,Object>>of(Map.of("OrderDetailID",1,"Quantity",3,"UnitPrice",300000));
    var net=ReturnAmounts.allocate(lines,new BigDecimal("810000")).get(1);
    assertThat(ReturnAmounts.portion(net,3,0,1)).isEqualByComparingTo("270000");
    assertThat(ReturnAmounts.portion(net,3,1,2)).isEqualByComparingTo("540000");
  }
  @Test void repeatedPartialRefundsConserveWholeDongIncludingTheLastRemainder() {
    var net=new BigDecimal("100");
    var a=ReturnAmounts.portion(net,3,0,1);var b=ReturnAmounts.portion(net,3,1,1);var c=ReturnAmounts.portion(net,3,2,1);
    assertThat(a).isEqualByComparingTo("33");assertThat(b).isEqualByComparingTo("34");assertThat(c).isEqualByComparingTo("33");
    assertThat(a.add(b).add(c)).isEqualByComparingTo(net);
  }
  @Test void allocationAcrossVariantsPreservesTheOrderDiscount() {
    var lines=List.<Map<String,Object>>of(Map.of("OrderDetailID",1,"Quantity",1,"UnitPrice",100),Map.of("OrderDetailID",2,"Quantity",2,"UnitPrice",100));
    var amounts=ReturnAmounts.allocate(lines,new BigDecimal("100"));
    assertThat(amounts.get(1)).isEqualByComparingTo("33");assertThat(amounts.get(2)).isEqualByComparingTo("67");
    assertThat(amounts.values().stream().reduce(BigDecimal.ZERO,BigDecimal::add)).isEqualByComparingTo("100");
  }
  @Test void quantitiesCannotExceedTheUnreturnedPart() {
    assertThatThrownBy(()->ReturnAmounts.portion(BigDecimal.TEN,3,2,2)).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(()->ReturnAmounts.portion(BigDecimal.TEN,0,0,1)).isInstanceOf(IllegalArgumentException.class);
  }
  @Test void orderCodeMatchesTheCustomerAndInvoiceConvention() {
    assertThat(OrderCodes.format(1,LocalDate.of(2026,11,27))).isEqualTo("SGVN26112700001K0");
  }
}
