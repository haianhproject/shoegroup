// Mục đích: Xác thực tài khoản, giữ định dạng mật khẩu/JWT và gửi liên kết đặt lại mật khẩu.
package vn.shoegroup.auth;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.core.env.Environment;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.shoegroup.api.ApiException;
import vn.shoegroup.api.Values;
import vn.shoegroup.security.PasswordService;
import vn.shoegroup.security.TokenService;

@Service
public class AuthService {
    private static final String USER_COLUMNS = "UserID as id_user,Email as email,FullName as full_name,Phone as phone,Address as address,AvatarURL as avatar_url,RoleID as role_id";
    private final JdbcTemplate jdbc;
    private final PasswordService passwords;
    private final TokenService tokens;
    private final JavaMailSender mail;
    private final Environment env;
    public AuthService(JdbcTemplate jdbc, PasswordService passwords, TokenService tokens, JavaMailSender mail, Environment env) {
        this.jdbc = jdbc; this.passwords = passwords; this.tokens = tokens; this.mail = mail; this.env = env;
    }
    @Transactional
    public Map<String, Object> login(Map<String, Object> body) {
        String email = Values.email(body.get("email")), password = Values.string(body.get("password"));
        if (email == null || password.isEmpty() || password.length() > 256) throw new ApiException(400, "Thieu email hoac mat khau");
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT " + USER_COLUMNS + ",PasswordHash as password_hash,CAST(ISNULL(IsActive,1) AS bit) as is_active FROM Users WHERE LOWER(Email)=?", email);
        Map<String, Object> user = rows.isEmpty() ? null : new LinkedHashMap<>(rows.get(0));
        PasswordService.Check check = user == null ? new PasswordService.Check(false, false) : passwords.verify(password, (String)user.get("password_hash"));
        if (user == null || !check.ok()) throw new ApiException(401, "Sai email hoac mat khau.");
        if (!Boolean.TRUE.equals(user.get("is_active"))) throw new ApiException(423, "ACCOUNT_LOCKED", "Tai khoan da bi khoa. Vui long lien he quan tri vien.");
        if (check.needsUpgrade()) {
            jdbc.update("UPDATE Users SET PasswordHash=?,LastPasswordChangedAt=ISNULL(LastPasswordChangedAt,GETDATE()) WHERE UserID=? AND PasswordHash=?",
                passwords.hash(password), user.get("id_user"), user.get("password_hash"));
        }
        user.remove("password_hash"); user.remove("is_active");
        return session(user, null);
    }
    @Transactional
    public Map<String, Object> register(Map<String, Object> body) {
        String name = Values.string(body.get("fullName")).trim(), email = Values.email(body.get("email"));
        String password = Values.string(body.get("password"));
        if (name.length() < 2 || name.length() > 100 || email == null) throw new ApiException(400, "Vui long nhap day du thong tin hop le.");
        Values.password(password);
        if (!jdbc.queryForList("SELECT UserID FROM Users WHERE LOWER(Email)=?", email).isEmpty()) throw new ApiException(400, "Email nay da duoc su dung.");
        try {
            Map<String, Object> user = jdbc.queryForMap("INSERT INTO Users (RoleID,FullName,Email,PasswordHash,IsActive) OUTPUT INSERTED.UserID as id_user,INSERTED.Email as email,INSERTED.FullName as full_name,INSERTED.Phone as phone,INSERTED.Address as address,INSERTED.AvatarURL as avatar_url,INSERTED.RoleID as role_id VALUES (2,?,?,?,1)", name, email, passwords.hash(password));
            return session(new LinkedHashMap<>(user), "Dang ky thanh cong");
        } catch (DuplicateKeyException ex) { throw new ApiException(400, "Email nay da duoc su dung."); }
    }
    private Map<String, Object> session(Map<String, Object> user, String message) {
        int role = ((Number)user.get("role_id")).intValue();
        user.put("role", role == 1 ? "Admin" : role == 3 ? "Employee" : "Customer");
        String token = tokens.issue(user); user.put("token", token);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true); response.put("user", user); response.put("token", token);
        if (message != null) response.put("message", message);
        return response;
    }
    public Map<String, Object> forgot(Map<String, Object> body) {
        String email = Values.email(body.get("email"));
        if (email == null) throw new ApiException(400, "Email khong hop le.");
        if (jdbc.queryForList("SELECT UserID FROM Users WHERE Email=? AND IsActive=1", email).isEmpty()) return Values.success();
        byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
        String token = HexFormat.of().formatHex(bytes);
        jdbc.update("UPDATE Users SET PasswordResetToken=?,PasswordResetTokenExpiry=DATEADD(hour,1,GETDATE()) WHERE Email=? AND IsActive=1", token, email);
        try {
            String sender = env.getProperty("EMAIL_USER", "");
            if (sender.isBlank() || env.getProperty("EMAIL_PASS", "").isBlank()) throw new IllegalStateException("Email not configured");
            var message = new SimpleMailMessage();
            String from = Values.email(env.getProperty("EMAIL_FROM_ADDRESS", ""));
            String reply = Values.email(env.getProperty("EMAIL_REPLY_TO", ""));
            message.setFrom(from == null ? sender : from); message.setTo(email);
            message.setReplyTo(reply == null ? sender : reply);
            message.setSubject("Dat lai mat khau | ShoeGroup");
            message.setText("Mo lien ket de dat lai mat khau (hieu luc 1 gio):\n" + env.getProperty("FRONTEND_URL", "http://localhost:3000").replaceAll("/+$", "") + "/reset-password?token=" + token);
            mail.send(message);
        } catch (Exception ex) {
            jdbc.update("UPDATE Users SET PasswordResetToken=NULL,PasswordResetTokenExpiry=NULL WHERE Email=? AND PasswordResetToken=?", email, token);
            throw new ApiException(503, "Chua the gui email luc nay. Vui long thu lai sau.");
        }
        return Map.of("success", true, "message", "Da gui email dat lai mat khau. Vui long kiem tra hop thu.");
    }
    @Transactional
    public Map<String, Object> reset(Map<String, Object> body) {
        String token = Values.string(body.get("token")).trim(), password = Values.string(body.get("newPassword"));
        if (!token.matches("(?i)[a-f0-9]{64}")) throw new ApiException(400, "Token khong hop le.");
        Values.password(password);
        int count = jdbc.update("UPDATE Users SET PasswordHash=?,PasswordResetToken=NULL,PasswordResetTokenExpiry=NULL,LastPasswordChangedAt=GETDATE() WHERE PasswordResetToken=? AND PasswordResetTokenExpiry>GETDATE()", passwords.hash(password), token);
        if (count != 1) throw new ApiException(400, "Token khong hop le hoac da het han.");
        return Values.success();
    }
}
