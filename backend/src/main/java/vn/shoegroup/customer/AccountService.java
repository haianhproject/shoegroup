// Mục đích: Cập nhật tài khoản, mật khẩu và quyền; bảo vệ quản trị viên hoạt động cuối cùng.
package vn.shoegroup.customer;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import vn.shoegroup.api.ApiException;
import vn.shoegroup.api.Values;
import vn.shoegroup.security.ApiUser;
import vn.shoegroup.security.PasswordService;

@Service
public class AccountService {
    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;
    private final PasswordService passwords;
    public AccountService(JdbcTemplate jdbc, PasswordService passwords) {
        this.jdbc = jdbc; this.named = new NamedParameterJdbcTemplate(jdbc); this.passwords = passwords;
    }
    public List<Map<String, Object>> list() {
        return jdbc.queryForList("SELECT UserID as id, Email as username, Email as email, FullName as name, RoleID as role_id, ISNULL(IsActive,1) as active, ISNULL(Phone,'') as phone, ISNULL(Address,'') as address FROM Users WHERE RoleID IN (1,2,3) ORDER BY RoleID, UserID DESC");
    }
    public Map<String, Object> create(Map<String, Object> body) {
        String email = Values.email(Values.first(body, null, "username", "email"));
        String name = name(body.get("name"));
        String password = password(body.get("password"));
        int role = Values.integer(body.get("role_id"), 1, 2, null);
        if (email == null) throw new ApiException(400, "Email khong hop le.");
        jdbc.update("INSERT Users(Email,PasswordHash,FullName,RoleID,IsActive) VALUES(?,?,?,?,1)", email, passwords.hash(password), name, role);
        return Values.success();
    }
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> update(int id, ApiUser actor, Map<String, Object> body) {
        if (!actor.admin() && (body.containsKey("role_id") || body.containsKey("active")))
            throw new ApiException(403, "Khach hang khong duoc thay doi vai tro hoac trang thai tai khoan.");
        if (body.containsKey("active") && !Values.bool(body.get("active"), true) && actor.id() == id)
            throw new ApiException(400, "Khong the khoa tai khoan dang dang nhap.");
        if (body.containsKey("username") || body.containsKey("email")) throw new ApiException(400, "Email dang nhap khong the thay doi.");
        List<String> sets = new ArrayList<>(); Map<String, Object> params = new HashMap<>(); params.put("id", id);
        if (body.containsKey("name")) field(sets, params, "FullName", "name", name(body.get("name")));
        if (body.containsKey("phone")) {
            String phone = Values.text(body.get("phone"), 100).replaceAll("\\s+", "");
            if (!phone.isEmpty() && !phone.matches("0[35789]\\d{8}")) throw new ApiException(400, "So dien thoai khong hop le.");
            field(sets, params, "Phone", "phone", phone);
        }
        if (body.containsKey("address")) field(sets, params, "Address", "address", Values.text(body.get("address"), 500));
        if (body.containsKey("avatar_url") || body.containsKey("avatarUrl")) {
            Object raw = Values.first(body, "", "avatar_url", "avatarUrl"); String avatar = raw.toString().trim();
            if (avatar.length() > 2200000) throw new ApiException(413, "Anh dai qua 2 MB.");
            if (!avatar.isEmpty() && !avatar.matches("(?i)data:image/(?:jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}"))
                throw new ApiException(400, "Dinh dang anh khong hop le.");
            field(sets, params, "AvatarURL", "avatar", avatar.isEmpty() ? null : avatar);
        }
        if (body.get("role_id") != null && !body.get("role_id").equals(""))
            field(sets, params, "RoleID", "role", Values.integer(body.get("role_id"), 1, 2, null));
        if (body.containsKey("active")) field(sets, params, "IsActive", "active", Values.bool(body.get("active"), true));
        if (body.get("password") != null && !body.get("password").toString().trim().isEmpty()) {
            field(sets, params, "PasswordHash", "password", passwords.hash(password(body.get("password"))));
            sets.add("LastPasswordChangedAt=GETDATE()");
        }
        if (sets.isEmpty()) return Values.success();
        // Lock the complete admin set in a stable order before removing an active admin.
        if (Boolean.FALSE.equals(params.get("active")) || (params.containsKey("role") && !params.get("role").equals(1))) {
            var admins = jdbc.queryForList("SELECT UserID,CAST(ISNULL(IsActive,1) AS bit) AS IsActive FROM Users WITH (UPDLOCK,HOLDLOCK) WHERE RoleID=1 ORDER BY UserID");
            boolean targetActive = admins.stream().anyMatch(a -> ((Number)a.get("UserID")).intValue() == id && Boolean.TRUE.equals(a.get("IsActive")));
            long activeCount = admins.stream().filter(a -> Boolean.TRUE.equals(a.get("IsActive"))).count();
            if (targetActive && activeCount <= 1) throw new ApiException(409, "LAST_ACTIVE_ADMIN", "Khong the khoa hoac ha quyen quan tri vien hoat dong cuoi cung.");
        }
        if (named.update("UPDATE Users SET " + String.join(",", sets) + ",UpdatedAt=GETDATE() WHERE UserID=:id", params) != 1)
            throw new ApiException(404, "Khong tim thay tai khoan.");
        return Map.of("success", true, "user", jdbc.queryForMap("SELECT UserID as id_user,Email as email,FullName as full_name,Phone as phone,Address as address,AvatarURL as avatar_url,RoleID as role_id FROM Users WHERE UserID=?", id));
    }
    private void field(List<String> sets, Map<String, Object> params, String column, String key, Object value) {
        sets.add(column + "=:" + key); params.put(key, value);
    }
    private String name(Object raw) {
        String name = raw == null ? "" : raw.toString().trim();
        if (name.isEmpty() || name.length() > 100) throw new ApiException(400, "Ho ten khong hop le.");
        return name;
    }
    private String password(Object raw) {
        if (!(raw instanceof String s) || s.length() < 6 || s.length() > 256) throw new ApiException(400, "Mat khau phai co 6-256 ky tu.");
        return (String)raw;
    }
}
