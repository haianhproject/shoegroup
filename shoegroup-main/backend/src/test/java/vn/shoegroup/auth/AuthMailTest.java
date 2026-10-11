// Mục đích: Kiểm thử cấu hình người gửi email và xóa đúng token khi gửi email đặt lại mật khẩu thất bại.
package vn.shoegroup.auth;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.env.MockEnvironment;
import vn.shoegroup.api.ApiException;
import vn.shoegroup.security.PasswordService;
import vn.shoegroup.security.TokenService;

class AuthMailTest {
  @Test void blankOptionalSenderUsesConfiguredMailbox() {
    var jdbc = mock(JdbcTemplate.class);
    var mail = mock(JavaMailSender.class);
    when(jdbc.queryForList(anyString(), eq("customer@example.test")))
        .thenReturn(List.of(Map.of("UserID", 1)));
    var service = service(jdbc, mail);
    service.forgot(Map.of("email", "customer@example.test"));
    var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
    verify(mail).send(message.capture());
    assertThat(message.getValue().getFrom()).isEqualTo("shop@example.test");
    assertThat(message.getValue().getReplyTo()).isEqualTo("shop@example.test");
    assertThat(message.getValue().getText()).contains("http://localhost:3000/reset-password?token=");
  }

  @Test void failedDeliveryClearsOnlyItsOwnResetToken() {
    var jdbc = mock(JdbcTemplate.class);
    var mail = mock(JavaMailSender.class);
    when(jdbc.queryForList(anyString(), eq("customer@example.test")))
        .thenReturn(List.of(Map.of("UserID", 1)));
    doThrow(new org.springframework.mail.MailSendException("offline"))
        .when(mail).send(any(SimpleMailMessage.class));
    assertThatThrownBy(() -> service(jdbc, mail).forgot(Map.of("email", "customer@example.test")))
        .isInstanceOf(ApiException.class);
    verify(jdbc).update(contains("AND PasswordResetToken=?"), eq("customer@example.test"), matches("[a-f0-9]{64}"));
  }

  private AuthService service(JdbcTemplate jdbc, JavaMailSender mail) {
    var env = new MockEnvironment().withProperty("EMAIL_USER", "shop@example.test")
        .withProperty("EMAIL_PASS", "audit-only").withProperty("EMAIL_FROM_ADDRESS", "")
        .withProperty("EMAIL_REPLY_TO", "");
    return new AuthService(jdbc, mock(PasswordService.class), mock(TokenService.class), mail, env);
  }
}
