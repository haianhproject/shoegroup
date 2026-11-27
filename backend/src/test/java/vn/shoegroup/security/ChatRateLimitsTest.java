package vn.shoegroup.security;
import static org.assertj.core.api.Assertions.*;
import java.time.*;
import org.junit.jupiter.api.Test;
class ChatRateLimitsTest {
  @Test void chatHasItsOwnBoundedWindowAndDoesNotLockOtherApis() {
    var limiter=new RateLimits(Clock.fixed(Instant.parse("2026-11-27T08:00:00Z"),ZoneOffset.UTC),900000,600,10);
    for(int i=0;i<30;i++)assertThat(limiter.acquireChat("test-ip")).isZero();
    assertThat(limiter.acquireChat("test-ip")).isEqualTo(60);
    assertThat(limiter.acquire("test-ip",false)).isZero();
    assertThat(limiter.acquireChat("different-ip")).isZero();
  }
}
