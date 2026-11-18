// Mục đích: Kiểm tra nội dung và chuyển yêu cầu của khách hàng tới hộp thư hỗ trợ đã cấu hình.
package vn.shoegroup.support;

import java.util.Map;
import org.springframework.core.env.Environment;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import vn.shoegroup.api.ApiException;
import vn.shoegroup.api.Values;

@Service
public class SupportService {
    private final JavaMailSender mail;
    private final Environment env;

    public SupportService(JavaMailSender mail, Environment env) {
        this.mail = mail;
        this.env = env;
    }

    public Map<String, Object> contact(Map<String, Object> body) {
        String name = Values.string(body.get("name")).trim();
        String contact = Values.string(body.get("contact")).trim();
        String text = Values.string(body.get("message")).trim();
        String replyTo = Values.email(contact);
        String phone = contact.replaceAll("[\\s().-]", "");
        if (name.length() < 2 || name.length() > 100) {
            throw new ApiException(400, "Họ tên cần có từ 2 đến 100 ký tự.");
        }
        if (contact.length() > 100 || (replyTo == null && !phone.matches("\\+?\\d{9,15}"))) {
            throw new ApiException(400, "Vui lòng nhập email hoặc số điện thoại liên hệ hợp lệ.");
        }
        if (text.isEmpty() || text.length() > 5000) {
            throw new ApiException(400, "Nội dung lời nhắn cần có từ 1 đến 5.000 ký tự.");
        }
        send("Lời nhắn từ khách hàng | ShoeGroup",
            "Họ tên: " + name + "\nLiên hệ: " + contact + "\n\n" + text, replyTo);
        return Map.of("success", true, "message", "Đã gửi lời nhắn tới cửa hàng.");
    }

    public Map<String, Object> newsletter(Map<String, Object> body) {
        String email = Values.email(body.get("email"));
        if (email == null) throw new ApiException(400, "Vui lòng nhập địa chỉ email hợp lệ.");
        send("Yêu cầu nhận tin | ShoeGroup",
            "Khách hàng yêu cầu nhận thông tin về bộ sưu tập và ưu đãi của ShoeGroup.\nEmail: " + email, email);
        return Map.of("success", true, "message", "Đã gửi yêu cầu nhận tin tới cửa hàng.");
    }

    private void send(String subject, String text, String replyTo) {
        String mailbox = Values.email(env.getProperty("EMAIL_USER", ""));
        if (mailbox == null || env.getProperty("EMAIL_PASS", "").isBlank()) {
            throw new ApiException(503, "Cửa hàng đang tạm ngừng nhận email. Vui lòng liên hệ qua số điện thoại hỗ trợ.");
        }
        String sender = Values.email(env.getProperty("EMAIL_FROM_ADDRESS", ""));
        String recipient = Values.email(env.getProperty("EMAIL_REPLY_TO", ""));
        var message = new SimpleMailMessage();
        message.setFrom(sender == null ? mailbox : sender);
        message.setTo(recipient == null ? mailbox : recipient);
        message.setReplyTo(replyTo == null ? mailbox : replyTo);
        message.setSubject(subject);
        message.setText(text);
        try {
            mail.send(message);
        } catch (MailException ex) {
            throw new ApiException(503, "Chưa thể gửi yêu cầu lúc này. Vui lòng thử lại sau.");
        }
    }
}
