package vn.shoegroup.pos;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.shoegroup.api.ApiException;

@Service
public class PosCartService {
    private final JdbcTemplate jdbc;
    public PosCartService(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public static int revision(Object value) {
        if (!(value instanceof Number number) || number.doubleValue() != number.longValue() || number.longValue() < 0 || number.longValue() > Integer.MAX_VALUE)
            throw new ApiException(400, "POS_CART_CONFLICT", "Vui long tai lai gio tai quay truoc khi tiep tuc.");
        return number.intValue();
    }
    private void lock(long userId, Integer expected) {
        jdbc.update("IF NOT EXISTS (SELECT 1 FROM PosCarts WITH (UPDLOCK,HOLDLOCK) WHERE UserID=?) INSERT PosCarts(UserID) VALUES (?)", userId, userId);
        Integer current = jdbc.queryForObject("SELECT Revision FROM PosCarts WITH (UPDLOCK,HOLDLOCK) WHERE UserID=?", Integer.class, userId);
        if (expected != null && !expected.equals(current)) throw new ApiException(409, "POS_CART_CONFLICT", "Gio tai quay da thay doi. Vui long tai lai gio.");
    }
    private Map<String, Object> change(long userId, int variantId, int quantity) {
        var previous = jdbc.queryForList("SELECT Quantity FROM PosCartItems WHERE UserID=? AND ProductVariantID=?", userId, variantId);
        int delta = quantity - (previous.isEmpty() ? 0 : ((Number)previous.get(0).get("Quantity")).intValue());
        var updated = jdbc.queryForList("""
            UPDATE v WITH (UPDLOCK)
            SET StockQuantity=ISNULL(v.StockQuantity,0)-?,Version=ISNULL(v.Version,0)+1
            OUTPUT INSERTED.ProductVariantID AS id,INSERTED.StockQuantity AS stock,INSERTED.Version AS version
            FROM ProductVariants v
            WHERE v.ProductVariantID=? AND ISNULL(v.StockQuantity,0)>=?
              AND (?<=0 OR (ISNULL(v.IsActive,1)=1 AND EXISTS (
                SELECT 1 FROM Products p WHERE p.ProductID=v.ProductID AND ISNULL(p.IsActive,1)=1)))
            """, delta, variantId, delta, delta);
        if (updated.isEmpty()) throw new ApiException(409, "STOCK_UNAVAILABLE", "Kho khong du hoac san pham da ngung ban.");
        if (quantity == 0) jdbc.update("DELETE FROM PosCartItems WHERE UserID=? AND ProductVariantID=?", userId, variantId);
        else if (previous.isEmpty()) jdbc.update("INSERT PosCartItems(UserID,ProductVariantID,Quantity) VALUES (?,?,?)", userId, variantId, quantity);
        else jdbc.update("UPDATE PosCartItems SET Quantity=? WHERE UserID=? AND ProductVariantID=?", quantity, userId, variantId);
        return updated.get(0);
    }
    @Transactional
    public Map<String, Object> handle(long userId, String action, Integer variantId, Map<String, Object> body) {
        Integer expected = action == null ? null : revision(body.get("revision"));
        lock(userId, expected);
        List<Map<String, Object>> stockUpdates = new ArrayList<>();
        if ("item".equals(action)) {
            Object raw = body.get("quantity");
            if (variantId == null || variantId <= 0 || !(raw instanceof Number n) || n.doubleValue() != n.longValue() || n.longValue() < 0 || n.longValue() > 1000000)
                throw new ApiException(400, "INVALID_QUANTITY", "So luong phai la so nguyen tu 0 den 1.000.000.");
            stockUpdates.add(change(userId, variantId, ((Number)raw).intValue()));
        } else if ("clear".equals(action)) {
            for (Integer id : jdbc.queryForList("SELECT ProductVariantID FROM PosCartItems WHERE UserID=? ORDER BY ProductVariantID", Integer.class, userId)) stockUpdates.add(change(userId, id, 0));
        }
        if (action != null) jdbc.update("UPDATE PosCarts SET Revision=Revision+1,UpdatedAt=SYSDATETIME() WHERE UserID=?", userId);
        Integer current = jdbc.queryForObject("SELECT Revision FROM PosCarts WHERE UserID=?", Integer.class, userId);
        var items = jdbc.queryForList("""
            SELECT ci.ProductVariantID AS variant_id,v.ProductID AS product_id,ci.Quantity AS quantity,
                   p.ProductName AS name,v.Size AS size,v.ColorName AS color,v.ColorHex AS color_hex,
                   v.ChildSKU AS sku,p.BasePrice AS base_price,ISNULL(v.PriceAdjustment,0) AS price_adjustment,
                   ISNULL(v.StockQuantity,0) AS stock,ISNULL(v.Version,0) AS version,
                   COALESCE(NULLIF(img.ImageURL,''),p.ImageURL,'') AS image
            FROM PosCartItems ci JOIN ProductVariants v ON v.ProductVariantID=ci.ProductVariantID
            JOIN Products p ON p.ProductID=v.ProductID
            OUTER APPLY (SELECT TOP 1 ImageURL FROM ProductImages pi
              WHERE pi.ProductID=v.ProductID AND ISNULL(pi.ColorName,N'')=ISNULL(v.ColorName,N'')
              ORDER BY pi.IsPrimary DESC,pi.SortOrder) img
            WHERE ci.UserID=? ORDER BY ci.ProductVariantID
            """, userId);
        return Map.of("success", true, "revision", current, "items", items, "stockUpdates", stockUpdates);
    }
}
