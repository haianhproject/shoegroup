// Muc dich: Dong hoa don cho qua ngay va hoan ton kho trong transaction.
package vn.shoegroup.pos;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name="shoegroup.jobs-enabled",havingValue="true",matchIfMissing=true)
public class PosCartExpiryJob {
  private final PosCartService carts;
  public PosCartExpiryJob(PosCartService carts) { this.carts=carts; }
  @Scheduled(cron="0 * * * * *",zone="Asia/Bangkok")
  public void expire() { carts.expireAll(); }
}
