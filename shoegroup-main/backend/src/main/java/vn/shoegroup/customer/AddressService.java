// Mục đích: Quản lý sổ địa chỉ của từng khách hàng và địa chỉ giao hàng mặc định.
package vn.shoegroup.customer;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import vn.shoegroup.api.ApiException;
import vn.shoegroup.api.Values;

@Service
public class AddressService {
    private static final String SELECT = """
        SELECT AddressID as id,UserID as userId,RecipientName as recipient,ISNULL(Phone,'') as phone,
          ISNULL(Province,'') as province,ISNULL(District,'') as district,ISNULL(Ward,'') as ward,
          ISNULL(AddressLine,'') as line,ISNULL(FullAddress,'') as fullAddress,
          CAST(ISNULL(IsVerified,0) AS bit) as isVerified,CAST(ISNULL(IsDefault,0) AS bit) as isDefault FROM UserAddresses
        """;
    private final JdbcTemplate jdbc;
    public AddressService(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public List<Map<String, Object>> list(long userId) { return jdbc.queryForList(SELECT + " WHERE UserID=? ORDER BY IsDefault DESC,AddressID DESC", userId); }
    private List<Map<String, Object>> lock(long userId) { return jdbc.queryForList(SELECT + " WITH (UPDLOCK,HOLDLOCK) WHERE UserID=? ORDER BY AddressID", userId); }
    private void onlyDefault(long userId, Object id) { jdbc.update("UPDATE UserAddresses SET IsDefault=CASE WHEN AddressID=? THEN 1 ELSE 0 END WHERE UserID=?", id, userId); }
    private Object preferred(List<Map<String, Object>> addresses) {
        Map<String, Object> preferred = addresses.get(addresses.size() - 1);
        for (var address : addresses) if (Boolean.TRUE.equals(address.get("isDefault"))) preferred = address;
        return preferred.get("id");
    }
    private Map<String, Object> payload(Map<String, Object> body, Map<String, Object> current) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("recipient", Values.text(Values.first(body, current.get("recipient"), "recipient", "recipientName"), 100));
        p.put("phone", Values.text(Values.first(body, current.get("phone"), "phone"), 20));
        p.put("province", Values.text(Values.first(body, current.get("province"), "province", "provinceName"), 100));
        p.put("district", Values.text(Values.first(body, current.get("district"), "district"), 100));
        p.put("ward", Values.text(Values.first(body, current.get("ward"), "ward", "communeName"), 100));
        p.put("line", Values.text(Values.first(body, current.get("line"), "line", "addressLine"), 255));
        for (String key : List.of("recipient", "phone", "province", "ward", "line"))
            if (p.get(key).equals("")) throw new ApiException(400, "Vui long nhap day du nguoi nhan, so dien thoai va dia chi.");
        if (!p.get("phone").toString().matches("0[35789]\\d{8}")) throw new ApiException(400, "So dien thoai nhan hang khong hop le.");
        p.put("fullAddress", Values.text(String.join(", ", List.of("line", "ward", "district", "province").stream().map(key -> p.get(key).toString()).filter(s -> !s.isEmpty()).toList()), 500));
        return p;
    }
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> save(long userId, Integer id, Map<String, Object> body) {
        var locked = lock(userId);
        Integer requestedId = id;
        Map<String, Object> current = id == null ? Map.of() : locked.stream().filter(row -> ((Number)row.get("id")).intValue() == requestedId).findFirst().orElseThrow(() -> new ApiException(404, "Khong tim thay dia chi."));
        Map<String, Object> p = payload(body, current);
        long defaults = locked.stream().filter(row -> Boolean.TRUE.equals(row.get("isDefault"))).count();
        boolean makeDefault = Boolean.TRUE.equals(body.get("isDefault")) || Integer.valueOf(1).equals(body.get("isDefault")) || Boolean.TRUE.equals(current.get("isDefault")) || defaults == 0;
        if (makeDefault) jdbc.update("UPDATE UserAddresses SET IsDefault=0 WHERE UserID=?", userId);
        else if (defaults != 1) onlyDefault(userId, preferred(locked));
        List<Object> args = new ArrayList<>();
        for (String key : List.of("recipient", "phone", "province", "district", "ward", "line", "fullAddress")) args.add(p.get(key));
        args.add(makeDefault);
        if (id == null) {
            args.add(userId);
            id = jdbc.queryForObject("INSERT UserAddresses(RecipientName,Phone,Province,District,Ward,AddressLine,FullAddress,IsDefault,UserID,IsVerified,CreatedAt) OUTPUT INSERTED.AddressID VALUES(?,?,?,?,?,?,?,?,?,0,GETDATE())", Integer.class, args.toArray());
        } else {
            args.add(userId); args.add(id);
            jdbc.update("UPDATE UserAddresses SET RecipientName=?,Phone=?,Province=?,District=?,Ward=?,AddressLine=?,FullAddress=?,IsDefault=?,IsVerified=0 WHERE UserID=? AND AddressID=?", args.toArray());
        }
        return jdbc.queryForMap(SELECT + " WHERE UserID=? AND AddressID=?", userId, id);
    }
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> delete(long userId, int id) {
        var locked = lock(userId);
        if (locked.stream().noneMatch(row -> ((Number)row.get("id")).intValue() == id)) throw new ApiException(404, "Khong tim thay dia chi.");
        jdbc.update("UPDATE Orders SET AddressID=NULL WHERE AddressID=?", id);
        jdbc.update("DELETE UserAddresses WHERE UserID=? AND AddressID=?", userId, id);
        var remaining = locked.stream().filter(row -> ((Number)row.get("id")).intValue() != id).toList();
        if (!remaining.isEmpty()) onlyDefault(userId, preferred(remaining));
        return Values.success();
    }
}
