// Mục đích: Trợ lý tra cứu có ngữ cảnh, dùng giá/tồn và đơn chính chủ; không tự thao tác tài chính.
package vn.shoegroup.support;

import static vn.shoegroup.orders.OrderSql.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.regex.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import vn.shoegroup.api.*;
import vn.shoegroup.catalog.ProductReadService;
import vn.shoegroup.orders.OrderCodes;
import vn.shoegroup.security.ApiUser;

@Service
public class ChatService {
  private final ProductReadService catalog;
  private final NamedParameterJdbcTemplate jdbc;
  private final ChatShippingService shipping;
  private static final List<String> START=List.of("Tìm giày","Phí giao hàng","Hướng dẫn chọn size","Tra đơn hàng","Trả hàng / hoàn tiền","Gặp nhân viên");
  private static final Map<String,String> COLORS=Map.ofEntries(Map.entry("den","Đen"),Map.entry("trang","Trắng"),Map.entry("do","Đỏ"),Map.entry("xanh","Xanh"),Map.entry("xam","Xám"),Map.entry("hong","Hồng"),Map.entry("nau","Nâu"),Map.entry("vang","Vàng"),Map.entry("black","Đen"),Map.entry("white","Trắng"),Map.entry("red","Đỏ"));
  public ChatService(ProductReadService catalog,NamedParameterJdbcTemplate jdbc,ChatShippingService shipping) { this.catalog=catalog;this.jdbc=jdbc;this.shipping=shipping; }
  private boolean contains(String text,String... words) { return Arrays.stream(words).anyMatch(text::contains); }
  private Map<String,Object> reply(String intent,String message,List<String> quick,Map<String,Object> context) {
    return params("intent",intent,"message",message,"quick_replies",quick,"context",context,"products",List.of(),"orders",List.of(),"links",List.of());
  }
  private Map<String,Object> link(String label,String href) { return params("label",label,"href",href); }
  private Map<String,Object> info(String intent,String message,String label,String href) {
    var r=reply(intent,message,START,Map.of());r.put("links",List.of(link(label,href)));return r;
  }
  static Map<String,Object> filters(String message,Object rawContext) {
    Map<String,Object> c=new LinkedHashMap<>();
    if(rawContext instanceof Map<?,?> prior) {
      for(String key:List.of("size","color","query"))if(prior.get(key) instanceof String value && value.length()<=100)c.put(key,value);
      if(prior.get("budget") instanceof Number value && value.doubleValue()>0 && value.doubleValue()<=1e12)c.put("budget",value.doubleValue());
      if(prior.get("standard") instanceof String standard && Set.of("EU","US","UK").contains(standard))c.put("standard",standard);
    }
    String text=normalize(message);
    if(text.contains("xoa bo loc")||text.contains("tat ca san pham")||text.contains("tim giay moi"))c.clear();
    Matcher size=Pattern.compile("\\b(?:size|co|kich co)\\s*(?:(eu|us|uk)\\s*)?(\\d{1,2}(?:[.,]5)?)\\b").matcher(text);
    if(size.find()) { c.put("size",size.group(2).replace(',','.'));c.put("standard",Objects.toString(size.group(1),Objects.toString(c.get("standard"),"EU")).toUpperCase(Locale.ROOT)); }
    for(var color:COLORS.entrySet())if(Pattern.compile("\\b"+color.getKey()+"\\b").matcher(text).find()) { c.put("color",color.getValue());break; }
    Matcher budget=Pattern.compile("(?:duoi|toi da|ngan sach|tam|khoang)\\s*(\\d[\\d.,]*)\\s*(trieu|tr|nghin|ngan|k|vnd|dong)?|\\b(\\d[\\d.,]*)\\s*(trieu|tr|nghin|ngan|k)\\b").matcher(text);
    if(budget.find()) {
      String numeric=budget.group(1)!=null?budget.group(1):budget.group(3);
      String unit=Objects.toString(budget.group(1)!=null?budget.group(2):budget.group(4),"");
      numeric=numeric.matches("\\d{1,3}(?:[.,]\\d{3})+")?numeric.replaceAll("[.,]",""):numeric.replace(',','.');
      try { double value=Double.parseDouble(numeric)*(Set.of("trieu","tr").contains(unit)?1e6:Set.of("k","nghin","ngan").contains(unit)?1e3:1);if(Double.isFinite(value)&&value>0&&value<=1e12)c.put("budget",value); } catch(NumberFormatException ignored) {}
    }
    String query=text.replaceAll("\\b(?:size|co|kich co)\\s*(?:(eu|us|uk)\\s*)?\\d{1,2}(?:[.,]5)?\\b", " ")
        .replaceAll("(?:duoi|toi da|ngan sach|tam|khoang)\\s*\\d[\\d.,]*\\s*(trieu|tr|nghin|ngan|k|vnd|dong)?|\\b\\d[\\d.,]*\\s*(trieu|tr|nghin|ngan|k)\\b", " ");
    for(String color:COLORS.keySet())query=query.replaceAll("\\b"+color+"\\b"," ");
    query=query.replaceAll("\\b(?:toi|minh|em|anh|chi|ban|muon|can|tim|mua|giay|sneaker|san pham|goi y|cho|co|con|hang|khong|nao|mau|duoc|voi|nhe|a|di|tat ca|xoa bo loc|moi)\\b", " ").replaceAll("[^a-z0-9 ]"," ").replaceAll("\\s+"," ").strip();
    if(!query.isBlank() && !text.contains("xoa bo loc"))c.put("query",Values.text(query,100));
    return c;
  }
  private static double price(Map<String,Object> variant) {
    double original=variant.get("price") instanceof Number n?n.doubleValue():0;
    double sale=variant.get("sale_price") instanceof Number n?n.doubleValue():0;
    return sale>0&&sale<original?sale:original;
  }
  private static boolean enabled(Object value) { return !Boolean.FALSE.equals(value)&&!Objects.equals(value,0); }
  private static String colorKey(Object value) {
    String key=normalize(value);
    return switch(key) {case "black"->"den";case "white"->"trang";case "red"->"do";case "grey","gray"->"xam";case "blue","green"->"xanh";default->key;};
  }
  @SuppressWarnings("unchecked")
  private Map<String,Object> products(String message,Object context) {
    var f=filters(message,context);var cards=new ArrayList<Map<String,Object>>();
    String query=Objects.toString(f.get("query"),"");
    for(var p:catalog.products()) {
      if(!enabled(p.get("active")))continue;
      String searchable=normalize(p.get("name")+" "+p.get("brand")+" "+p.get("category")+" "+p.get("description"));
      if(!query.isBlank() && !Arrays.stream(query.split(" ")).allMatch(searchable::contains))continue;
      List<Map<String,Object>> variants=(List<Map<String,Object>>)p.getOrDefault("variants",List.of());
      var matches=variants.stream().filter(v->enabled(v.get("active"))&&number(v.get("stock"))>0)
          .filter(v->!f.containsKey("size")||Objects.toString(v.get("size"),"").equals(f.get("size")))
          .filter(v->!f.containsKey("standard")||Objects.toString(v.getOrDefault("size_standard",v.getOrDefault("standard","EU"))).equalsIgnoreCase(f.get("standard").toString()))
          .filter(v->!f.containsKey("color")||colorKey(v.get("color")).contains(colorKey(f.get("color"))))
          .filter(v->!f.containsKey("budget")||price(v)<=((Number)f.get("budget")).doubleValue()).toList();
      if(matches.isEmpty())continue;
      var card=params("id",p.get("id"),"name",p.get("name"),"image",p.get("image_url"),"href","/product/"+p.get("id"),
          "price",matches.stream().mapToDouble(ChatService::price).min().orElse(0),
          "stock",matches.stream().mapToLong(v->number(v.get("stock"))).sum(),
          "variants",matches.stream().limit(8).map(v->params("size",v.get("size"),"color",v.get("color"),"price",price(v),"stock",v.get("stock"))).toList());
      cards.add(card);if(cards.size()==3)break;
    }
    String description=cards.isEmpty()?"Mình chưa tìm thấy giày còn hàng đúng các điều kiện này. Bạn có thể đổi size, tăng ngân sách hoặc xóa bộ lọc.":"Mình tìm thấy các mẫu còn hàng phù hợp bên dưới. Giá và tồn vừa được tra từ cửa hàng; hãy chọn lại màu/size trên trang sản phẩm trước khi mua.";
    var result=reply("PRODUCTS",description,List.of("Xóa bộ lọc","Hướng dẫn chọn size","Gặp nhân viên"),f);
    result.put("products",cards);result.put("links",List.of(link("Xem cửa hàng","/products")));return result;
  }
  private Map<String,Object> orders(String message,ApiUser user) {
    if(user==null)return info("LOGIN","Bạn cần đăng nhập để tra đơn của chính mình. Mình sẽ không tra thông tin đơn của người khác.","Đăng nhập để tra đơn","/login?redirect=/orders");
    String normalized=normalize(message), supplied="";Integer id=null;
    Matcher code=Pattern.compile("(?i)\\bSGVN\\d{6}(\\d{5,10})[A-Z]\\d\\b").matcher(message);
    if(code.find()) { supplied=code.group().toUpperCase(Locale.ROOT);try{id=Integer.valueOf(code.group(1));}catch(NumberFormatException e){id=-1;} }
    else { Matcher number=Pattern.compile("\\b(?:don|order)\\s*(?:hang\\s*)?#?\\s*(\\d{1,10})\\b").matcher(normalized);if(number.find())try{id=Integer.valueOf(number.group(1));}catch(NumberFormatException e){id=-1;} }
    var rows=jdbc.queryForList("""
        SELECT TOP 3 OrderID,OrderDate,Status,PaymentStatus,TotalAmount,
          (SELECT COUNT(*) FROM OrderReturns r WHERE r.OrderID=o.OrderID AND r.IsOpen=1) AS active_returns
        FROM Orders o WHERE UserID=:uid AND (:id IS NULL OR OrderID=:id) ORDER BY OrderDate DESC,OrderID DESC
        """,params("uid",user.id(),"id",id));
    var cards=new ArrayList<Map<String,Object>>();
    for(var row:rows) {
      var date=row.get("OrderDate") instanceof java.sql.Timestamp t?t.toLocalDateTime().toLocalDate():java.time.LocalDate.now(java.time.ZoneId.of("Asia/Bangkok"));
      String canonical=OrderCodes.format(number(row.get("OrderID")),date);
      if(!supplied.isEmpty()&&!canonical.equals(supplied))continue;
      cards.add(params("code",canonical,"status",row.get("Status"),"payment_status",row.get("PaymentStatus"),"total",row.get("TotalAmount"),"has_open_return",number(row.get("active_returns"))>0,"href","/orders"));
    }
    var result=reply("ORDERS",cards.isEmpty()?"Mình chưa tìm thấy đơn phù hợp trong tài khoản của bạn. Hãy kiểm tra lại mã đơn hoặc mở Đơn hàng của tôi.":"Đây là trạng thái mới nhất của đơn thuộc tài khoản bạn đang đăng nhập. Bạn có thể mở đơn để xem chi tiết hàng trả và tiền hoàn; liên hệ Zalo khi cần hỗ trợ.",List.of("Trả hàng / hoàn tiền","Gặp nhân viên"),Map.of());
    result.put("orders",cards);result.put("links",List.of(link("Đơn hàng của tôi","/orders")));return result;
  }
  public Map<String,Object> chat(Map<String,Object> body,ApiUser user) {
    if(!(body.get("message") instanceof String message)||message.isBlank()||message.length()>500)throw new ApiException(400,"Tin nhắn cần có từ 1 đến 500 ký tự.");
    String text=normalize(message);
    if(contains(text,"gap nhan vien","nguoi that","lien he","zalo","hotline"))return info("HANDOFF","Bạn có thể gửi mã đơn và mô tả vấn đề cho nhân viên qua Zalo 0375 990 871. Mình chưa gửi nội dung cuộc trò chuyện sang Zalo; bạn chọn thông tin cần chia sẻ khi liên hệ.","Liên hệ nhân viên qua Zalo","https://zalo.me/0375990871");
    if(contains(text,"tra hang","doi tra","hoan tien","hang hong","bi loi","khong vua"))return info("RETURNS","Bạn liên hệ cửa hàng qua Zalo và cung cấp mã đơn, sản phẩm cùng số lượng cần trả để thống nhất cách xử lý. Khi đã nhận hàng thực tế, cửa hàng kiểm nhận từng sản phẩm và cập nhật khoản hoàn. Mở Đơn hàng của tôi để xem sản phẩm đã trả, tiền chờ hoàn và tiền đã hoàn.","Liên hệ Zalo để trao đổi","https://zalo.me/0375990871");
    if(contains(text,"tra don","don hang","don #","order","sgvn")||Pattern.compile("\\bdon\\s*#?\\s*\\d").matcher(text).find())return orders(message,user);
    if(contains(text,"huong dan chon size","bang size","do chan","chan dai","tu van size"))return info("SIZE_GUIDE","Bạn hãy đo chiều dài bàn chân và đối chiếu bảng size của đúng thương hiệu trên trang sản phẩm. Các hệ EU/US/UK và phom từng mẫu có thể khác nhau. Mình có thể tìm giày còn size bạn chọn, ví dụ: “giày đen size 40 dưới 1 triệu”.","Xem các mẫu giày","/products");
    if(shipping.question(text)||body.containsKey("shipping_address_id"))return shipping.chat(message,body.get("context"),user,body.get("shipping_address_id"));
    if(contains(text,"thanh toan","chuyen khoan","cod","tien mat"))return info("PAYMENT","Website hỗ trợ COD và chuyển khoản theo hướng dẫn ở bước thanh toán. Hãy kiểm tra đúng số tiền, nội dung chuyển khoản và liên hệ cửa hàng nếu cần đối soát. Mình chỉ tra cứu, không xác nhận đã thu tiền hay tự chuyển tiền.","Xem giỏ hàng","/cart");
    if(contains(text,"ma giam","voucher","khuyen mai"))return info("PROMOTION","Giá ưu đãi đang có được hiển thị theo từng sản phẩm/màu/size. Mã giảm giá theo đơn còn phụ thuộc thời gian, số lượt và điều kiện giá trị đơn; hệ thống kiểm tra khi bạn áp mã tại thanh toán.","Xem sản phẩm ưu đãi","/products?sale=true");
    if(contains(text,"xin chao","hello","chao shop")||Set.of("chao","hi").contains(text))return reply("WELCOME","Chào bạn! Mình là trợ lý tra cứu ShoeGroup. Mình có thể tìm giày còn hàng, hướng dẫn chọn size và tra đơn của bạn. Bạn đang cần hỗ trợ việc gì?",START,Map.of());
    if(contains(text,"tim","giay","size","sneaker","con hang","tat ca san pham","xoa bo loc"))return products(message,body.get("context"));
    if(shipping.awaiting(body.get("context")))return shipping.chat(message,body.get("context"),user,null);
    if(contains(text,"mau")||body.get("context") instanceof Map<?,?> c&&!c.isEmpty())return products(message,body.get("context"));
    return reply("FALLBACK","Mình chưa hiểu rõ yêu cầu này. Bạn có thể mô tả mẫu giày, màu, size và ngân sách, hoặc chọn một mục bên dưới. Nếu vấn đề cần nhân viên quyết định, mình sẽ hướng dẫn bạn liên hệ cửa hàng.",START,Map.of());
  }
}
