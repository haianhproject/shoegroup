// Muc dich: Moi hoa don cho co gio rieng; giu/hoan ton va kiem tra phien ban trong transaction.
package vn.shoegroup.pos;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.shoegroup.api.ApiException;
import vn.shoegroup.api.Values;

@Service
public class PosCartService {
  private final JdbcTemplate jdbc;
  public PosCartService(JdbcTemplate jdbc) { this.jdbc=jdbc; }
  public static int revision(Object value) {
    if(!(value instanceof Number n)||n.doubleValue()!=n.longValue()||n.longValue()<0||n.longValue()>Integer.MAX_VALUE) throw new ApiException(400,"POS_CART_CONFLICT","Vui lòng tải lại giỏ tại quầy.");
    return ((Number)value).intValue();
  }
  private int create(long user) {
    return jdbc.queryForObject("INSERT PosCarts(UserID) OUTPUT INSERTED.PosCartID VALUES(?)",Integer.class,user);
  }
  private int lock(long user,Object supplied,Integer expected) {
    var rows = supplied==null ? jdbc.queryForList("SELECT TOP 1 PosCartID,Revision FROM PosCarts WITH(UPDLOCK,HOLDLOCK) WHERE UserID=? AND Status='Open' AND ExpiresAt>SYSDATETIME() ORDER BY PosCartID",user)
      : jdbc.queryForList("SELECT PosCartID,Revision FROM PosCarts WITH(UPDLOCK,HOLDLOCK) WHERE UserID=? AND PosCartID=? AND Status='Open' AND ExpiresAt>SYSDATETIME()",user,Values.integer(supplied,1,Integer.MAX_VALUE,null));
    if(rows.isEmpty()) {
      if(supplied!=null||expected!=null&&expected!=0) throw new ApiException(409,"POS_CART_CONFLICT","Hóa đơn đã thanh toán hoặc hết hạn. Hãy tải lại.");
      return create(user);
    }
    if(expected!=null&&expected!=((Number)rows.get(0).get("Revision")).intValue()) throw new ApiException(409,"POS_CART_CONFLICT","Giỏ đã thay đổi. Hãy tải lại.");
    return ((Number)rows.get(0).get("PosCartID")).intValue();
  }
  private Map<String,Object> change(int cart,int variant,int quantity) {
    var old=jdbc.queryForList("SELECT Quantity FROM PosCartItems WHERE PosCartID=? AND ProductVariantID=?",cart,variant);
    int delta=quantity-(old.isEmpty()?0:((Number)old.get(0).get("Quantity")).intValue());
    var updated=jdbc.queryForList("""
      UPDATE v WITH(UPDLOCK) SET StockQuantity=v.StockQuantity-?,Version=v.Version+1
      OUTPUT INSERTED.ProductVariantID AS id,INSERTED.StockQuantity AS stock,INSERTED.Version AS version
      FROM ProductVariants v WHERE v.ProductVariantID=? AND v.StockQuantity>=?
      AND (?<=0 OR (v.IsActive=1 AND EXISTS(SELECT 1 FROM Products p WHERE p.ProductID=v.ProductID AND p.IsActive=1)))
      """,delta,variant,delta,delta);
    if(updated.isEmpty()) throw new ApiException(409,"STOCK_UNAVAILABLE","Không đủ tồn kho hoặc sản phẩm không hoạt động.");
    if(quantity==0) jdbc.update("DELETE FROM PosCartItems WHERE PosCartID=? AND ProductVariantID=?",cart,variant);
    else if(old.isEmpty()) jdbc.update("INSERT PosCartItems(PosCartID,ProductVariantID,Quantity) VALUES(?,?,?)",cart,variant,quantity);
    else jdbc.update("UPDATE PosCartItems SET Quantity=? WHERE PosCartID=? AND ProductVariantID=?",quantity,cart,variant);
    return updated.get(0);
  }
  private List<Map<String,Object>> clear(int cart) {
    var result=new ArrayList<Map<String,Object>>();
    for(int variant:jdbc.queryForList("SELECT ProductVariantID FROM PosCartItems WHERE PosCartID=? ORDER BY ProductVariantID",Integer.class,cart)) result.add(change(cart,variant,0));
    return result;
  }
  private List<Map<String,Object>> expire(long user) {
    var updates=new ArrayList<Map<String,Object>>();
    for(int cart:jdbc.queryForList("SELECT PosCartID FROM PosCarts WITH(UPDLOCK,HOLDLOCK) WHERE UserID=? AND Status='Open' AND ExpiresAt<=SYSDATETIME() ORDER BY PosCartID",Integer.class,user)) {
      updates.addAll(clear(cart));
      jdbc.update("UPDATE PosCarts SET Status='Expired',Revision=Revision+1,UpdatedAt=SYSDATETIME() WHERE PosCartID=?",cart);
    }
    return updates;
  }
  @Transactional
  public void expireAll() {
    for(long user:jdbc.queryForList("SELECT DISTINCT UserID FROM PosCarts WHERE Status='Open' AND ExpiresAt<=SYSDATETIME() ORDER BY UserID",Long.class)) expire(user);
  }
  @Transactional
  public Map<String,Object> handle(long user,String action,Integer variant,Map<String,Object> body) {
    var updates=new ArrayList<>(expire(user));
    int cart="create".equals(action)?create(user):lock(user,body.get("cart_id"),action==null?null:revision(body.get("revision")));
    if("item".equals(action)) {
      if(!(body.get("quantity") instanceof Number)) throw new ApiException(400,"INVALID_QUANTITY","Số lượng phải là số nguyên không âm.");
      int qty=Values.integer(body.get("quantity"),0,1000000,null);
      if(variant==null) throw new ApiException(400,"Thiếu biến thể.");
      updates.add(change(cart,variant,qty));
    } else if("clear".equals(action)) updates.addAll(clear(cart));
    if(action!=null&&!action.equals("create")) jdbc.update("UPDATE PosCarts SET Revision=Revision+1,UpdatedAt=SYSDATETIME() WHERE PosCartID=?",cart);
    int rev=jdbc.queryForObject("SELECT Revision FROM PosCarts WHERE PosCartID=?",Integer.class,cart);
    var items=jdbc.queryForList("""
      SELECT ci.ProductVariantID AS variant_id,v.ProductID AS product_id,ci.Quantity AS quantity,
      p.ProductName AS name,v.Size AS size,v.SizeStandard AS standard,v.ColorID AS color_id,v.ColorName AS color,v.ColorHex AS color_hex,
      v.ChildSKU AS sku,v.SalePrice AS base_price,v.SalePrice AS price,0 AS price_adjustment,
      v.StockQuantity AS stock,v.Version AS version,v.IsActive AS active,COALESCE(NULLIF(img.ImageURL,''),p.ImageURL,'') AS image
      FROM PosCartItems ci JOIN ProductVariantRead v ON v.ProductVariantID=ci.ProductVariantID JOIN Products p ON p.ProductID=v.ProductID
      OUTER APPLY(SELECT TOP 1 ImageURL FROM ProductImages pi WHERE pi.ProductID=v.ProductID AND pi.ColorID=v.ColorID ORDER BY pi.IsPrimary DESC,pi.SortOrder) img
      WHERE ci.PosCartID=? ORDER BY ci.ProductVariantID
      """,cart);
    var carts=jdbc.queryForList("SELECT PosCartID AS id,Revision AS revision,UpdatedAt AS updated_at,ExpiresAt AS expires_at FROM PosCarts WHERE UserID=? AND Status='Open' AND ExpiresAt>SYSDATETIME() ORDER BY PosCartID",user);
    return Map.of("success",true,"cart_id",cart,"revision",rev,"items",items,"stockUpdates",updates,"carts",carts);
  }
}
