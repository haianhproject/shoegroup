// Mục đích: Kiểm thử biểu mẫu liên hệ/nhận tin với mail giả lập và phản hồi lỗi gửi thư.
package vn.shoegroup.support;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import vn.shoegroup.api.ApiErrors;
import vn.shoegroup.api.ApiException;

class SupportServiceTest {
    private MockEnvironment configured() {
        return new MockEnvironment().withProperty("EMAIL_USER", "shop@example.test")
            .withProperty("EMAIL_PASS", "audit-only");
    }

    private Map<String, Object> contact(String address) {
        return Map.of("name", "Customer", "contact", address, "message", "Please help with sizing.");
    }

    @Test void contactUsesTheConfiguredRecipientAndTheCustomerReplyAddress() {
        var mail = mock(JavaMailSender.class);
        var env = configured().withProperty("EMAIL_REPLY_TO", "support@example.test")
            .withProperty("EMAIL_FROM_ADDRESS", "sender@example.test");
        var service = new SupportService(mail, env);
        assertThat(service.contact(contact("customer@example.test")).get("success")).isEqualTo(true);
        var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(message.capture());
        assertThat(message.getValue().getTo()).containsExactly("support@example.test");
        assertThat(message.getValue().getFrom()).isEqualTo("sender@example.test");
        assertThat(message.getValue().getReplyTo()).isEqualTo("customer@example.test");
        assertThat(message.getValue().getText()).contains("Please help with sizing.");
    }

    @Test void phoneContactsUseTheMailboxAsTheirReplyAddress() {
        var mail = mock(JavaMailSender.class);
        new SupportService(mail, configured()).contact(contact("+84 901 234 567"));
        var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(message.capture());
        assertThat(message.getValue().getTo()).containsExactly("shop@example.test");
        assertThat(message.getValue().getReplyTo()).isEqualTo("shop@example.test");
        assertThat(message.getValue().getText()).contains("+84 901 234 567");
    }

    @Test void newsletterNormalizesTheEmailAndSendsItsRequestToTheShop() {
        var mail = mock(JavaMailSender.class);
        var result = new SupportService(mail, configured()).newsletter(Map.of("email", " Member@Example.Test "));
        assertThat(result.get("success")).isEqualTo(true);
        var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(message.capture());
        assertThat(message.getValue().getTo()).containsExactly("shop@example.test");
        assertThat(message.getValue().getReplyTo()).isEqualTo("member@example.test");
        assertThat(message.getValue().getText()).contains("member@example.test");
    }

    @Test void invalidFieldsAreRejectedBeforeSendingMail() {
        var mail = mock(JavaMailSender.class);
        var service = new SupportService(mail, configured());
        List<Map<String, Object>> invalidBodies = List.of(contact("invalid"),
            Map.of("name", "A", "contact", "customer@example.test", "message", "Help"),
            Map.of("name", "Customer", "contact", "customer@example.test", "message", "x".repeat(5001)));
        for (var body : invalidBodies) {
            assertThatThrownBy(() -> service.contact(body)).isInstanceOf(ApiException.class);
        }
        assertThatThrownBy(() -> service.newsletter(Map.of("email", "member@example.test\r\nBcc: attacker@example.test")))
            .isInstanceOf(ApiException.class);
        verifyNoInteractions(mail);
    }

    @Test void missingConfigurationAndTransportErrorsReturnServiceUnavailable() throws Exception {
        var mail = mock(JavaMailSender.class);
        var mvc = MockMvcBuilders.standaloneSetup(new SupportController(new SupportService(mail, new MockEnvironment())))
            .setControllerAdvice(new ApiErrors()).build();
        mvc.perform(post("/api/newsletter").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"customer@example.test\"}"))
            .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.success").value(false));
        verifyNoInteractions(mail);
        doThrow(new MailSendException("offline")).when(mail).send(any(SimpleMailMessage.class));
        var service = new SupportService(mail, configured());
        assertThatThrownBy(() -> service.contact(contact("customer@example.test")))
            .isInstanceOfSatisfying(ApiException.class, error -> assertThat(error.status).isEqualTo(503));
    }

    @Test void contactControllerAcceptsOnlyValidatedPayloads() throws Exception {
        var mail = mock(JavaMailSender.class);
        var mvc = MockMvcBuilders.standaloneSetup(new SupportController(new SupportService(mail, configured())))
            .setControllerAdvice(new ApiErrors()).build();
        mvc.perform(post("/api/contact").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Customer\",\"contact\":\"customer@example.test\",\"message\":\"Please help\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        mvc.perform(post("/api/contact").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.success").value(false));
        verify(mail, times(1)).send(any(SimpleMailMessage.class));
    }
}
