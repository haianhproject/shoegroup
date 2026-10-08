// Mục đích: Quản lý giỏ hàng online, kiểm tra biến thể và số lượng mà không giữ tồn kho.
package vn.shoegroup.customer;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import vn.shoegroup.api.ApiException;
import vn.shoegroup.api.Values;

@Service
public class CartService {
    private final JdbcTemplate jdbc;
    public CartService(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    private ApiException unavailable() { return new ApiException(409, "STOCK_UNAVAILABLE", "Bien the vua het hang hoac khong du so luong."); }
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> add(long userId, Map<String, Object> body) {
        int productId = Values.integer(Values.first(body, null, "productId", "product_id"), 1, Integer.MAX_VALUE, null);
        int quantity = Values.integer(body.get("quantity"), 1, Integer.MAX_VALUE, null);
        Object rawVariant = Values.first(body, null, "variantId", "variant_id");
        Integer variant = null;
        try { variant = Values.integer(rawVariant, 1, Integer.MAX_VALUE, null); } catch (ApiException ignored) { }
        if (variant == null) {
            var rows = jdbc.queryForList("SELECT TOP 1 ProductVariantID FROM ProductVariants WITH (UPDLOCK,HOLDLOCK) WHERE ProductID=? AND ISNULL(IsActive,1)=1 AND ISNULL(Size,N'')=? AND ISNULL(ColorName,N'')=? ORDER BY ProductVariantID", productId, Values.text(body.get("size"), 10), Values.text(body.get("color"), 50));
            if (rows.isEmpty()) throw new ApiException(409, "Khong tim thay bien the san pham da chon.");
            variant = ((Number)rows.get(0).get("ProductVariantID")).intValue();
        }
        var available = jdbc.queryForList("SELECT v.StockQuantity FROM ProductVariants v WITH (UPDLOCK,HOLDLOCK) JOIN Products p ON p.ProductID=v.ProductID WHERE v.ProductVariantID=? AND v.ProductID=? AND ISNULL(v.IsActive,1)=1 AND ISNULL(p.IsActive,1)=1", variant, productId);
        if (available.isEmpty() || available.get(0).get("StockQuantity") == null) throw unavailable();
        int stock = ((Number)available.get(0).get("StockQuantity")).intValue();
        if (stock < 0) throw unavailable();
        jdbc.update("IF NOT EXISTS (SELECT 1 FROM Carts WITH (UPDLOCK,HOLDLOCK) WHERE UserID=?) INSERT Carts(UserID,CreatedAt,UpdatedAt) VALUES(?,GETDATE(),GETDATE())", userId, userId);
        int cartId = jdbc.queryForObject("SELECT CartID FROM Carts WITH (UPDLOCK,HOLDLOCK) WHERE UserID=?", Integer.class, userId);
        var existing = jdbc.queryForList("SELECT CartItemID,Quantity FROM CartItems WITH (UPDLOCK,HOLDLOCK) WHERE CartID=? AND ProductVariantID=?", cartId, variant);
        long newQuantity = quantity + (existing.isEmpty() ? 0L : ((Number)existing.get(0).get("Quantity")).longValue());
        if (newQuantity > stock) throw unavailable();
        if (existing.isEmpty()) jdbc.update("INSERT CartItems(CartID,ProductVariantID,Quantity,AddedAt) VALUES(?,?,?,GETDATE())", cartId, variant, (int)newQuantity);
        else jdbc.update("UPDATE CartItems SET Quantity=? WHERE CartItemID=?", (int)newQuantity, existing.get(0).get("CartItemID"));
        jdbc.update("UPDATE Carts SET UpdatedAt=GETDATE() WHERE CartID=?", cartId);
        return Map.of("success", true, "variant_id", variant, "quantity", (int)newQuantity, "available_stock", stock);
    }
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> update(long userId, int variant, Map<String, Object> body) {
        int quantity = Values.integer(body.get("quantity"), 0, 1000000, null);
        var rows = jdbc.queryForList("""
            SELECT ci.CartItemID,ci.Quantity,v.StockQuantity,ISNULL(p.IsActive,1) AS ProductActive,ISNULL(v.IsActive,1) AS VariantActive
            FROM CartItems ci WITH (UPDLOCK,HOLDLOCK) JOIN Carts c ON c.CartID=ci.CartID
            JOIN ProductVariants v WITH (UPDLOCK,HOLDLOCK) ON v.ProductVariantID=ci.ProductVariantID
            JOIN Products p ON p.ProductID=v.ProductID WHERE c.UserID=? AND ci.ProductVariantID=?
            """, userId, variant);
        if (rows.isEmpty()) throw new ApiException(404, "Khong tim thay san pham trong gio hang.");
        var row = rows.get(0);
        int stock = row.get("StockQuantity") == null ? 0 : Math.max(0, ((Number)row.get("StockQuantity")).intValue());
        if (quantity > 0 && (!Boolean.TRUE.equals(row.get("ProductActive")) || !Boolean.TRUE.equals(row.get("VariantActive")) || quantity > stock)) throw unavailable();
        if (quantity == 0) jdbc.update("DELETE CartItems WHERE CartItemID=?", row.get("CartItemID"));
        else jdbc.update("UPDATE CartItems SET Quantity=? WHERE CartItemID=?", quantity, row.get("CartItemID"));
        return Map.of("success", true, "variant_id", variant, "quantity", quantity);
    }
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> delete(long userId, Integer variant) {
        if (variant == null) {
            jdbc.update("DELETE ci FROM CartItems ci JOIN Carts c ON c.CartID=ci.CartID WHERE c.UserID=?", userId);
            jdbc.update("UPDATE Carts SET UpdatedAt=GETDATE() WHERE UserID=?", userId);
        } else {
            var rows = jdbc.queryForList("SELECT ci.CartItemID FROM CartItems ci WITH (UPDLOCK,HOLDLOCK) JOIN Carts c ON c.CartID=ci.CartID WHERE c.UserID=? AND ci.ProductVariantID=?", userId, variant);
            if (!rows.isEmpty()) jdbc.update("DELETE CartItems WHERE CartItemID=?", rows.get(0).get("CartItemID"));
        }
        return Values.success();
    }
}
