// Báo phí trong chat bằng quy tắc checkout; địa chỉ lưu luôn được kiểm tra chính chủ.
package vn.shoegroup.support;

import static vn.shoegroup.orders.OrderSql.*;

import java.text.NumberFormat;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import vn.shoegroup.api.ApiException;
import vn.shoegroup.api.Values;
import vn.shoegroup.security.ApiUser;
import vn.shoegroup.shipping.ShippingService;

@Service
public class ChatShippingService {
  private final ShippingService shipping;
  private final NamedParameterJdbcTemplate jdbc;
  private static final String ADDRESS_COLUMNS = "AddressID AS id,Province AS province,District AS district,Ward AS ward,AddressLine AS line,FullAddress AS full_address,IsDefault AS is_default";
  public ChatShippingService(ShippingService shipping, NamedParameterJdbcTemplate jdbc) { this.shipping=shipping;this.jdbc=jdbc; }
  boolean question(String text) {
    return Pattern.compile("\\b(ship|shipping)\\b").matcher(text).find()
        || List.of("van chuyen","giao hang","phi giao","cuoc giao","bao lau").stream().anyMatch(text::contains);
  }
  boolean awaiting(Object context) { return context instanceof Map<?,?> c && Boolean.TRUE.equals(c.get("shipping_requested")); }
  private String locationText(String value) { return normalize(value).replaceAll("[^a-z0-9]+"," ").replaceAll("\\bhcm\\b","ho chi minh").replaceAll("\\s+"," ").strip(); }
  private List<String> matches(String value) {
    String text=" "+locationText(value)+" ";
    var matches=shipping.destinationKeys().stream().filter(key->text.contains(" "+key+" ")).toList();
    // 'Vinh' trong 'Vĩnh Long' hoặc 'TP HCM' trong một tên dài chỉ là một nơi nhận.
    return matches.stream().filter(key->matches.stream().noneMatch(longer->!longer.equals(key)&&(" "+longer+" ").contains(" "+key+" "))).toList();
  }
  private String destination(String message) {
    // Tỉnh/thành thường ở cuối địa chỉ; không nhầm tên đường với tỉnh nhận hàng.
    String[] segments=message.split("[,;\\n]");
    if(segments.length>1) { var last=matches(segments[segments.length-1]);if(last.size()==1)return last.get(0); }
    var found=matches(message);return found.size()==1?found.get(0):null;
  }
  private String displayDestination(String message,String key) {
    String original=message.strip(), folded=normalize(original).replaceAll("[^a-z0-9\\s]"," ");
    var match=Pattern.compile("\\b"+String.join("\\s+",Arrays.stream(key.split(" ")).map(Pattern::quote).toList())+"\\b").matcher(folded);
    if(match.find()&&match.end()<=original.length()) { String candidate=original.substring(match.start(),match.end());if(locationText(candidate).equals(key))return candidate; }
    if(key.equals("ho chi minh"))return "TP. Hồ Chí Minh";
    return key;
  }
  private List<Map<String,Object>> addresses(ApiUser user) {
    if(user==null)return List.of();
    return jdbc.queryForList("SELECT TOP 20 "+ADDRESS_COLUMNS+" FROM UserAddresses WHERE UserID=:uid ORDER BY IsDefault DESC,AddressID DESC",params("uid",user.id()));
  }
  private String label(Map<String,Object> address) {
    String full=Objects.toString(address.get("full_address"),"").strip();
    if(!full.isEmpty())return full;
    return String.join(", ",List.of("line","ward","district","province").stream().map(k->Objects.toString(address.get(k),"").strip()).filter(s->!s.isEmpty()).toList());
  }
  private Map<String,Object> result(String message,Object rawContext) {
    var context=ChatService.filters("",rawContext);context.put("shipping_requested",true);
    return params("intent","SHIPPING","message",message,"context",context,"products",List.of(),"orders",List.of(),"addresses",List.of(),
        "quick_replies",List.of("Hà Nội","Đà Nẵng","TP. Hồ Chí Minh","Tìm giày mới","Gặp nhân viên"),
        "links",List.of(params("label","Xem phí tại thanh toán","href","/cart")));
  }
  public Map<String,Object> chat(String message,Object rawContext,ApiUser user,Object addressId) {
    var saved=addresses(user);
    Map<String,Object> address=null;
    if(addressId!=null) {
      if(user==null) { var login=result("Bạn cần đăng nhập để dùng địa chỉ đã lưu, hoặc nhập tỉnh/thành nhận hàng ngay trong chat.",rawContext);login.put("links",List.of(params("label","Đăng nhập","href","/login")));return login; }
      int id=Values.integer(addressId,1,Integer.MAX_VALUE,null);
      var rows=jdbc.queryForList("SELECT "+ADDRESS_COLUMNS+" FROM UserAddresses WHERE AddressID=:id AND UserID=:uid",params("id",id,"uid",user.id()));
      if(rows.isEmpty())throw new ApiException(404,"Không tìm thấy địa chỉ trong tài khoản của bạn. Hãy chọn lại địa chỉ.");
      address=rows.get(0);
    } else if(normalize(message).contains("dia chi mac dinh")) {
      address=saved.stream().filter(a->Boolean.TRUE.equals(a.get("is_default"))||Objects.equals(a.get("is_default"),1)).findFirst().orElse(null);
    }
    String province=address==null?destination(message):Objects.toString(address.get("province"),"").strip();
    String prompt="Bạn muốn nhận hàng ở tỉnh/thành nào? Ví dụ: Hà Nội, Đà Nẵng hoặc TP. Hồ Chí Minh.";
    var response=result(prompt+(saved.isEmpty()?"":" Bạn cũng có thể chọn một địa chỉ đã lưu bên dưới."),rawContext);
    response.put("addresses",saved.stream().map(a->params("id",a.get("id"),"label",label(a),"is_default",a.get("is_default"))).toList());
    if(province==null||province.isBlank())return response;
    Map<String,Object> input=params("methodCode","STANDARD","province",province);
    if(address!=null) { input.put("district",Objects.toString(address.get("district"),""));input.put("ward",Objects.toString(address.get("ward"),""));input.put("address",label(address)); }
    var quote=shipping.quote(input);
    if(Boolean.TRUE.equals(quote.get("estimatedDistance"))) { response.put("message","Mình chưa nhận diện rõ tỉnh/thành nhận hàng. Bạn nhập lại tên tỉnh/thành để mình báo phí, hoặc kiểm tra địa chỉ ở bước thanh toán.");return response; }
    String target=address==null?displayDestination(message,province):label(address);
    String formatted=NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN")).format(quote.get("fee"));
    response.put("intent","SHIPPING_QUOTE");
    response.put("message","Phí giao hàng tiêu chuẩn tới "+target+" hiện là "+formatted+". Thời gian dự kiến: "+quote.get("eta")+". Đây là phí trước ưu đãi trên đơn; hệ thống kiểm tra lại khi thanh toán.");
    response.put("shipping_quote",params("destination",target,"fee",quote.get("fee"),"eta",quote.get("eta"),"method",quote.get("methodName")));
    response.put("addresses",List.of());
    return response;
  }
}
