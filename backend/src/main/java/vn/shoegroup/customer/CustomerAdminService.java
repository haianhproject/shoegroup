// Mục đích: Xử lý khách lẻ và tài khoản khách hàng theo email, giữ đúng cơ chế mật khẩu.
package vn.shoegroup.customer;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import vn.shoegroup.api.*;
import vn.shoegroup.security.PasswordService;

@Service
public class CustomerAdminService {
  private final JdbcTemplate jdbc;
  private final PasswordService passwords;

  public CustomerAdminService(JdbcTemplate jdbc, PasswordService passwords) {
    this.jdbc = jdbc;
    this.passwords = passwords;
  }

  @Transactional(isolation = Isolation.SERIALIZABLE)
  public Map<String, Object> create(Map<String, Object> body) {
    String name = Values.text(Values.first(body, "Khach le", "FullName", "name", "full_name"), 101);
    String phone = Values.text(Values.first(body, "", "Phone", "phone"), 20).replaceAll("\\s+", "");
    if (name.isEmpty()
        || name.length() > 100
        || (!phone.isEmpty() && !phone.matches("0[35789]\\d{8}")))
      throw new ApiException(400, "Ho ten hoac so dien thoai khong hop le.");
    String rawEmail = Values.text(Values.first(body, "", "Email", "email"), 101);
    if (rawEmail.isEmpty()) {
      Map<String, Object> result = new LinkedHashMap<>();
      result.put("success", true);
      result.put("UserID", null);
      result.put("is_walkin", true);
      result.put(
          "message", "Khach vang lai duoc luu cung don hang, khong tao tai khoan dang nhap.");
      return result;
    }
    String email = Values.email(rawEmail);
    if (email == null) throw new ApiException(400, "Email khong hop le.");
    Object rawPassword = Values.first(body, "POS_WALK_IN", "PasswordHash", "password");
    String password = rawPassword instanceof String s ? s : "POS_WALK_IN";
    if (password.length() < 6 || password.length() > 256)
      throw new ApiException(400, "Mat khau khong hop le.");
    var existing =
        jdbc.queryForList("SELECT UserID FROM Users WITH(UPDLOCK,HOLDLOCK) WHERE Email=?", email);
    if (!existing.isEmpty())
      return Map.of(
          "success", true, "UserID", existing.get(0).get("UserID"), "message", "Khach da ton tai");
    int id =
        jdbc.queryForObject(
            "INSERT"
                + " Users(RoleID,FullName,Phone,Email,PasswordHash,Address,Source,IsActive,CreatedAt)"
                + " OUTPUT INSERTED.UserID VALUES(2,?,?,?,?,?,?,1,GETDATE())",
            Integer.class,
            name,
            phone,
            email,
            passwords.hash(password),
            Values.text(Values.first(body, "", "Address", "address"), 500),
            Values.text(Values.first(body, "POS", "Source", "source"), 50));
    return Map.of("success", true, "UserID", id);
  }
}
