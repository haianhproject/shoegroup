// Mục đích: Giao dịch hậu mãi có khóa theo đơn, hoàn đúng biến thể, tiền và lịch sử một lần.
package vn.shoegroup.orders;

import static vn.shoegroup.orders.OrderSql.*;
import static vn.shoegroup.orders.ReturnAmounts.money;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import vn.shoegroup.api.*;
import vn.shoegroup.security.ApiUser;

@Service
public class AfterSalesService {
  private final NamedParameterJdbcTemplate jdbc;
  private final OrderSql sql;
  private final OrderEffects effects;
  private static final Set<String> DELIVERED = Set.of("da giao", "da giao hang thanh cong", "delivered", "da nhan hang", "received", "hoan thanh", "hoan tat", "completed");
  public AfterSalesService(NamedParameterJdbcTemplate jdbc, OrderSql sql, OrderEffects effects) {
    this.jdbc=jdbc; this.sql=sql; this.effects=effects;
  }
  private ApiException conflict(String message) { return new ApiException(409,message); }
  private Map<String,Object> one(String query,Map<String,?> p) {
    var rows=jdbc.queryForList(query,p);
    if(rows.isEmpty())throw new ApiException(404,"Không tìm thấy dữ liệu cần xử lý.");
    return rows.get(0);
  }
  private void admin(ApiUser user) { if(user==null || !user.admin())throw new ApiException(403,"Chỉ quản trị viên được xử lý hậu mãi và hoàn tiền."); }
  private void owner(ApiUser user,Map<String,Object> order) {
    if(user==null || !user.staff() && user.id()!=number(order.get("UserID")))throw new ApiException(403,"Bạn không có quyền xem đơn hàng này.");
  }
  private Map<String,Object> order(int id,boolean lock) {
    return one("SELECT * FROM Orders "+(lock?"WITH(UPDLOCK,HOLDLOCK) ":"")+"WHERE OrderID=:id",params("id",id));
  }
  private List<Map<String,Object>> lines(int id) {
    return jdbc.queryForList("SELECT * FROM OrderDetails WHERE OrderID=:id ORDER BY OrderDetailID",params("id",id));
  }
  private Map<String,Object> returnCase(int id,boolean lock) {
    return one("SELECT * FROM OrderReturns "+(lock?"WITH(UPDLOCK,HOLDLOCK) ":"")+"WHERE ReturnID=:id",params("id",id));
  }
  private int integer(Object n) { return (int)number(n); }
  private int quantity(Map<String,Object> line) { return integer(line.get("Quantity")); }
  private int returned(Map<String,Object> line) { return integer(line.get("HistoricalReturnedQuantity"))+integer(line.get("ReturnedQuantity")); }
  private boolean delivered(Map<String,Object> o) { return DELIVERED.contains(normalize(o.get("Status"))); }
  private String note(Object value,boolean required) {
    String s=Objects.toString(value,"").strip();
    if(s.length()>500 || required && s.length()<5)throw new ApiException(400,"Vui lòng nhập lý do/ghi chú từ 5 đến 500 ký tự.");
    return s;
  }
  private String requestKey(Object value) {
    String s=Objects.toString(value,"");
    try { String canonical=UUID.fromString(s).toString(); if(!canonical.equalsIgnoreCase(s))throw new IllegalArgumentException(); return canonical; }
    catch(IllegalArgumentException e) { throw new ApiException(400,"Mã yêu cầu không hợp lệ. Vui lòng tải lại biểu mẫu."); }
  }
  private String refundMethod(Object value) {
    String method=Objects.toString(value,"").strip().toUpperCase(Locale.ROOT);
    if(!Set.of("CASH","BANK").contains(method))throw new ApiException(400,"Chọn hoàn tiền mặt hoặc chuyển khoản.");
    return method;
  }
  @SuppressWarnings("unchecked")
  private List<Map<String,Object>> items(Object value) {
    if(!(value instanceof List<?> list) || list.isEmpty() || list.size()>100 || list.stream().anyMatch(i->!(i instanceof Map)))
      throw new ApiException(400,"Danh sách hàng cần xử lý không hợp lệ.");
    return (List<Map<String,Object>>)value;
  }
  private Map<Integer,Map<String,Object>> indexed(List<Map<String,Object>> items,String key) {
    Map<Integer,Map<String,Object>> result=new TreeMap<>();
    for(var item:items)if(result.put(Values.integer(item.get(key),1,Integer.MAX_VALUE,null),item)!=null)
      throw new ApiException(400,"Một dòng sản phẩm chỉ được chọn một lần.");
    return result;
  }
  private Map<Integer,BigDecimal> allocations(Map<String,Object> order,List<Map<String,Object>> lines) {
    return ReturnAmounts.allocate(lines,money(order.get("TotalAmount")).subtract(money(order.get("ShippingFee"))));
  }
  private String hash(String s) {
    try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8))); }
    catch(java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
  }
  private void event(int id,String status,String note,ApiUser user) {
    jdbc.update("INSERT OrderReturnEvents(ReturnID,Status,Note,UserID) VALUES(:id,:s,:n,:u)",params("id",id,"s",status,"n",note,"u",user.id()));
  }
  private void changed(Map<String,Object> order,ApiUser user,String message,String reason) {
    int id=integer(order.get("OrderID"));
    sql.history(id,order.get("Status"),order.get("Status"),message,user.id());
    sql.notify(order.get("UserID"),id,"Cập nhật hậu mãi",message);
    effects.afterCommit(id,reason,null);
  }

  @Transactional(readOnly=true)
  public Map<String,Object> detail(int orderId,ApiUser user) {
    var o=order(orderId,false); owner(user,o);
    var details=lines(orderId); var net=allocations(o,details);
    var caseRows=jdbc.queryForList("""
        SELECT ReturnID AS id,Status AS status,Reason AS reason,ReviewNote AS review_note,
          ReceiptNote AS receipt_note,CreatedAt AS created_at,ReviewedAt AS reviewed_at,ReceivedAt AS received_at,
          RefundedAt AS refunded_at,RefundAmount AS refund_amount,ShippingRefundAmount AS shipping_refund_amount,
          RefundTransactionID AS refund_transaction_id,IsOpen AS is_open,Source AS source
        FROM OrderReturns WHERE OrderID=:id ORDER BY ReturnID DESC
        """,params("id",orderId));
    for(var r:caseRows) {
      var p=params("id",r.get("id"));
      r.put("items",jdbc.queryForList("""
          SELECT ri.ReturnItemID AS id,ri.OrderDetailID AS order_detail_id,ri.RequestedQuantity AS requested_quantity,
            ri.GoodQuantity AS good_quantity,ri.DamagedQuantity AS damaged_quantity,ri.RefundAmount AS refund_amount,
            od.ProductNameSnapshot AS name,od.Size AS size,od.Color AS color
          FROM OrderReturnItems ri JOIN OrderDetails od ON od.OrderDetailID=ri.OrderDetailID
          WHERE ri.ReturnID=:id ORDER BY ri.ReturnItemID
          """,p));
      r.put("events",jdbc.queryForList("SELECT Status AS status,Note AS note,CreatedAt AS created_at FROM OrderReturnEvents WHERE ReturnID=:id ORDER BY EventID",p));
    }
    var refunds=jdbc.queryForList("""
        SELECT pt.TransactionID AS id,pt.Provider AS provider,pt.Amount AS amount,pt.Status AS status,
          pt.CompletedAt AS completed_at,fc.Reference AS reference,fc.RefundMethod AS refund_method
        FROM PaymentTransactions pt LEFT JOIN RefundConfirmations fc ON fc.TransactionID=pt.TransactionID
        WHERE pt.OrderID=:id AND pt.Provider IN (N'AFTERSALES_REFUND',N'MANUAL_REFUND') ORDER BY pt.TransactionID DESC
        """,params("id",orderId));
    if(!user.staff())for(var refund:refunds)refund.remove("reference");
    List<Map<String,Object>> lineViews=new ArrayList<>();
    for(var line:details) {
      var view=new LinkedHashMap<String,Object>();
      view.put("order_detail_id",line.get("OrderDetailID")); view.put("variant_id",line.get("ProductVariantID"));
      view.put("name",Objects.toString(line.get("ProductNameSnapshot"),"Sản phẩm"));
      view.put("size",Objects.toString(line.get("Size"),"")); view.put("color",Objects.toString(line.get("Color"),""));
      view.put("quantity",quantity(line)); view.put("returned_quantity",returned(line));
      view.put("refunded_quantity",jdbc.queryForObject("SELECT ISNULL(SUM(ri.GoodQuantity+ri.DamagedQuantity),0) FROM OrderReturnItems ri JOIN OrderReturns r ON r.ReturnID=ri.ReturnID WHERE ri.OrderDetailID=:id AND r.Status='COMPLETED'",params("id",line.get("OrderDetailID")),Integer.class));
      view.put("remaining_quantity",Math.max(0,quantity(line)-returned(line)));
      view.put("net_line_total",net.get(integer(line.get("OrderDetailID"))));
      lineViews.add(view);
    }
    boolean open=caseRows.stream().anyMatch(r->Boolean.TRUE.equals(r.get("is_open")));
    BigDecimal shippingRefunded=jdbc.queryForObject("SELECT ISNULL(SUM(ShippingRefundAmount),0) FROM OrderReturns WHERE OrderID=:id",params("id",orderId),BigDecimal.class);
    return params("order_id",orderId,"order_code",OrderCodes.format(orderId,((java.sql.Timestamp)o.get("OrderDate")).toLocalDateTime().toLocalDate()),"status",o.get("Status"),"payment_status",o.get("PaymentStatus"),"payment_method",o.get("PaymentMethod"),
        "total",o.get("TotalAmount"),"shipping_refundable_amount",money(o.get("ShippingFee")).subtract(shippingRefunded).max(BigDecimal.ZERO),
        "remaining_refundable_amount",money(o.get("TotalAmount")).subtract(money(o.get("HistoricalRefundAmount"))).subtract(money(o.get("ReturnAdjustmentAmount"))).max(BigDecimal.ZERO),
        "items",lineViews,"returns",caseRows,"refunds",refunds,
        "can_request",delivered(o)&&paid(o.get("PaymentStatus"))&&!open&&lineViews.stream().anyMatch(i->integer(i.get("remaining_quantity"))>0),
        "return_adjustment_amount",o.get("ReturnAdjustmentAmount"),
        "can_warehouse",Set.of("dang van chuyen","dang giao","giao hang that bai","ve kho","shipping","shipped").contains(normalize(o.get("Status")))&&o.get("WarehouseClosedAt")==null,
        "warehouse_closed",o.get("WarehouseClosedAt")!=null,
        "already_restocked",o.get("StockRestoredAt")!=null);
  }

  @Transactional(readOnly=true)
  public Map<String,Object> lookup(String input,ApiUser user) {
    admin(user); String code=Values.text(input,100).replaceFirst("^#","").strip();
    if(code.isEmpty())throw new ApiException(400,"Nhập mã đơn hàng cần nhận trả.");
    Integer candidate=null;
    try {
      if(code.matches("[0-9]{1,10}"))candidate=Integer.valueOf(code);
      var matcher=java.util.regex.Pattern.compile("(?i)^SGVN\\d{6}(\\d{5,10})[A-Z]\\d$").matcher(code);
      if(matcher.matches())candidate=Integer.valueOf(matcher.group(1));
    } catch(NumberFormatException ignored) {}
    var rows=jdbc.queryForList("SELECT OrderID,OrderDate,TrackingNumber FROM Orders WHERE OrderID=:id OR TrackingNumber=:code",params("id",candidate==null?0:candidate,"code",code));
    for(var row:rows) {
      int id=integer(row.get("OrderID"));
      String canonical=OrderCodes.format(id,((java.sql.Timestamp)row.get("OrderDate")).toLocalDateTime().toLocalDate());
      if(code.equals(String.valueOf(id)) || code.equalsIgnoreCase(canonical) || code.equalsIgnoreCase(Objects.toString(row.get("TrackingNumber"),"")))return detail(id,user);
    }
    throw new ApiException(404,"Không tìm thấy đơn theo mã đã nhập. Kiểm tra lại toàn bộ mã đơn.");
  }

  @Transactional(isolation=Isolation.SERIALIZABLE)
  public Map<String,Object> register(int orderId,ApiUser user,Map<String,Object> body) {
    admin(user); var o=order(orderId,true);
    boolean simple=Values.bool(body.get("simple"),false);
    String method=simple?refundMethod(body.get("refund_method")):"UNKNOWN";
    if(!simple&&!Values.bool(body.get("confirm_received"),false))throw new ApiException(400,"Chỉ xác nhận khi đã nhận và kiểm tra hàng trả thực tế.");
    String key=requestKey(body.get("request_key")),reason=note(body.get("reason"),!simple);
    if(reason.isEmpty())reason="Khách liên hệ Zalo trả hàng; cửa hàng nhận trả và hoàn tiền.";
    var selected=indexed(items(body.get("items")),"order_detail_id");
    List<String> signature=new ArrayList<>();
    for(var e:selected.entrySet()) {
      int q=Values.integer(e.getValue().get("quantity"),1,1000000,null);
      int damaged=simple?0:Values.integer(e.getValue().get("damaged_quantity"),0,q,null);
      signature.add(e.getKey()+":"+q+":"+damaged);
    }
    boolean paidNow=simple||Values.bool(body.get("confirm_paid"),false),shipping=Values.bool(body.get("refund_shipping"),false);
    String reference=Objects.toString(body.get("reference"),"").strip().toUpperCase(Locale.ROOT),refundNote=Objects.toString(body.get("refund_note"),"").strip();
    String fingerprint=hash("ZALO|"+reason+"|"+signature+"|"+shipping+"|"+paidNow+"|"+reference+"|"+refundNote+(simple?"|SIMPLE|"+method:""));
    var prior=jdbc.queryForList("SELECT ReturnID,RequestHash,RefundAmount,Status FROM OrderReturns WHERE OrderID=:id AND RequestKey=CONVERT(uniqueidentifier,:key)",params("id",orderId,"key",key));
    if(!prior.isEmpty()) {
      var row=prior.get(0);
      if(!fingerprint.equals(row.get("RequestHash")))throw conflict("Mã thao tác đã được dùng cho nội dung khác. Kiểm tra phiếu đã lưu.");
      return params("success",true,"unchanged",true,"order_id",orderId,"return_id",row.get("ReturnID"),"refund_amount",row.get("RefundAmount"),"status",row.get("Status"));
    }
    if(!delivered(o)||!paid(o.get("PaymentStatus")))throw conflict("Chỉ nhận trả theo mã đơn đã giao thành công và đã thanh toán.");
    if(!jdbc.queryForList("SELECT ReturnID FROM OrderReturns WHERE OrderID=:id AND IsOpen=1",params("id",orderId)).isEmpty())throw conflict("Đơn đang có phiếu chưa hoàn tất. Xử lý khoản chờ hoàn hoặc phiếu cũ trước.");
    var details=indexed(lines(orderId),"OrderDetailID");
    for(var e:selected.entrySet()) {
      var line=details.get(e.getKey()); int q=Values.integer(e.getValue().get("quantity"),1,1000000,null);
      if(line==null || q>quantity(line)-returned(line))throw conflict("Sản phẩm không thuộc đơn hoặc số lượng vượt phần còn được trả.");
    }
    int id=jdbc.queryForObject("""
        INSERT OrderReturns(OrderID,RequestKey,RequestHash,Reason,RequestedByUserID,Source,Status,IsOpen,ReviewedAt,ReviewNote)
        OUTPUT INSERTED.ReturnID VALUES(:oid,CONVERT(uniqueidentifier,:key),:hash,:reason,:uid,'ZALO','APPROVED',1,SYSDATETIME(),N'Tiếp nhận theo trao đổi qua Zalo')
        """,params("oid",orderId,"key",key,"hash",fingerprint,"reason",reason,"uid",user.id()),Integer.class);
    List<Map<String,Object>> received=new ArrayList<>();
    for(var e:selected.entrySet()) {
      int q=Values.integer(e.getValue().get("quantity"),1,1000000,null),bad=simple?0:Values.integer(e.getValue().get("damaged_quantity"),0,q,null);
      int item=jdbc.queryForObject("INSERT OrderReturnItems(ReturnID,OrderDetailID,RequestedQuantity) OUTPUT INSERTED.ReturnItemID VALUES(:id,:detail,:q)",params("id",id,"detail",e.getKey(),"q",q),Integer.class);
      received.add(params("return_item_id",item,"good_quantity",q-bad,"damaged_quantity",bad));
    }
    event(id,"APPROVED","Đã trao đổi với khách qua Zalo; tiếp nhận và kiểm hàng tại cửa hàng.",user);
    var result=receive(id,user,params("items",received,"note",simple?"Trả hàng theo mã đơn. "+reason:reason,"refund_shipping",shipping,"confirm_received",true));
    if(paidNow && result.get("refund_transaction_id")!=null)
      confirmRefund(orderId,integer(result.get("refund_transaction_id")),user,simple?params("refund_method",method):params("reference",reference,"note",refundNote,"confirm_paid",true));
    return params("success",true,"order_id",orderId,"return_id",id,"refund_amount",result.get("refund_amount"),"status",paidNow||result.get("refund_transaction_id")==null?"COMPLETED":"REFUND_PENDING");
  }

  @Transactional(isolation=Isolation.SERIALIZABLE)
  public Map<String,Object> create(int orderId,ApiUser user,Map<String,Object> body) {
    var o=order(orderId,true); owner(user,o);
    var selected=indexed(items(body.get("items")),"order_detail_id");
    String reason=note(body.get("reason"),true), key=requestKey(body.get("request_key"));
    String fingerprint=hash(reason+"|"+selected.entrySet().stream().map(e->e.getKey()+":"+Values.integer(e.getValue().get("quantity"),1,1000000,null)).toList());
    var prior=jdbc.queryForList("SELECT ReturnID,RequestHash FROM OrderReturns WHERE OrderID=:id AND RequestKey=CONVERT(uniqueidentifier,:key)",params("id",orderId,"key",key));
    if(!prior.isEmpty()) {
      if(!fingerprint.equals(prior.get(0).get("RequestHash")))throw conflict("Mã yêu cầu đã được dùng cho nội dung khác.");
      return params("success",true,"id",prior.get(0).get("ReturnID"),"unchanged",true);
    }
    if(!delivered(o)||!paid(o.get("PaymentStatus")))throw conflict("Chỉ yêu cầu trả hàng cho đơn đã giao và đã thanh toán.");
    if(!jdbc.queryForList("SELECT ReturnID FROM OrderReturns WHERE OrderID=:id AND IsOpen=1",params("id",orderId)).isEmpty())
      throw conflict("Đơn đang có một yêu cầu trả hàng chưa xử lý xong.");
    var details=indexed(lines(orderId),"OrderDetailID");
    for(var e:selected.entrySet()) {
      var line=details.get(e.getKey());
      int q=Values.integer(e.getValue().get("quantity"),1,1000000,null);
      if(line==null || q>quantity(line)-returned(line))throw conflict("Số lượng trả vượt quá phần hàng còn được trả của đơn.");
    }
    int id=jdbc.queryForObject("INSERT OrderReturns(OrderID,RequestKey,RequestHash,Reason,RequestedByUserID) OUTPUT INSERTED.ReturnID VALUES(:id,CONVERT(uniqueidentifier,:key),:hash,:reason,:uid)",params("id",orderId,"key",key,"hash",fingerprint,"reason",reason,"uid",user.id()),Integer.class);
    for(var e:selected.entrySet())jdbc.update("INSERT OrderReturnItems(ReturnID,OrderDetailID,RequestedQuantity) VALUES(:id,:detail,:q)",params("id",id,"detail",e.getKey(),"q",Values.integer(e.getValue().get("quantity"),1,1000000,null)));
    event(id,"REQUESTED",reason,user);
    changed(o,user,"[RETURN] Đã tạo yêu cầu trả hàng #"+id,"return_requested");
    return params("success",true,"id",id);
  }

  @Transactional(readOnly=true)
  public List<Map<String,Object>> list(Map<String,String> input) {
    String scope=input.getOrDefault("scope","OPEN");
    if(!Set.of("OPEN","CLOSED","ALL").contains(scope))throw new ApiException(400,"Bộ lọc không hợp lệ.");
    String q=Values.text(input.get("q"),100);
    var code=java.util.regex.Pattern.compile("(?i)^#?SGVN\\d{6}(\\d{5,10})[A-Z]\\d$").matcher(q);
    if(code.matches())try { q=String.valueOf(Integer.parseInt(code.group(1))); }catch(NumberFormatException ignored) {}
    var rows=jdbc.queryForList("""
        SELECT TOP 200 r.ReturnID AS id,r.OrderID AS order_id,r.Status AS status,r.Reason AS reason,r.Source AS source,
          r.RefundAmount AS refund_amount,r.CreatedAt AS created_at,r.IsOpen AS is_open,
          o.OrderDate AS order_date,o.CustomerName AS customer_name,o.TrackingNumber AS tracking_code
        FROM OrderReturns r JOIN Orders o ON o.OrderID=r.OrderID
        WHERE (:scope='ALL' OR (:scope='OPEN' AND r.IsOpen=1) OR (:scope='CLOSED' AND r.IsOpen=0))
          AND (:q='' OR o.CustomerName LIKE :like OR CONVERT(varchar(20),r.OrderID)=:q OR CONVERT(varchar(20),r.ReturnID)=:q OR o.TrackingNumber LIKE :like)
        ORDER BY CASE WHEN r.IsOpen=1 THEN 0 ELSE 1 END,r.CreatedAt DESC,r.ReturnID DESC
        """,params("scope",scope,"q",q,"like","%"+q+"%"));
    var items=jdbc.queryForList("""
        SELECT ri.ReturnID AS return_id,od.ProductNameSnapshot AS name,od.Size AS size,od.Color AS color,
          ri.RequestedQuantity AS requested_quantity,ri.GoodQuantity AS good_quantity,ri.DamagedQuantity AS damaged_quantity,ri.RefundAmount AS refund_amount
        FROM OrderReturnItems ri JOIN OrderDetails od ON od.OrderDetailID=ri.OrderDetailID
        WHERE ri.ReturnID IN (:ids) ORDER BY ri.ReturnItemID
        """,params("ids",rows.isEmpty()?List.of(0):rows.stream().map(r->r.get("id")).toList()));
    for(var row:rows)row.put("items",items.stream().filter(i->Objects.equals(i.get("return_id"),row.get("id"))).toList());
    return rows;
  }

  @Transactional(isolation=Isolation.SERIALIZABLE)
  public Map<String,Object> review(int id,ApiUser user,Map<String,Object> body) {
    admin(user); var initial=returnCase(id,false); var o=order(integer(initial.get("OrderID")),true); var r=returnCase(id,true);
    String decision=Objects.toString(body.get("decision"),"");
    if(!Set.of("APPROVE","REJECT").contains(decision))throw new ApiException(400,"Quyết định không hợp lệ.");
    String next=decision.equals("APPROVE")?"APPROVED":"REJECTED", message=note(body.get("note"),decision.equals("REJECT"));
    if(next.equals(r.get("Status")))return params("success",true,"unchanged",true);
    if(!"REQUESTED".equals(r.get("Status")) && !("APPROVED".equals(r.get("Status")) && next.equals("REJECTED") && r.get("ReceivedAt")==null))throw conflict("Yêu cầu đã được xử lý; vui lòng tải lại.");
    jdbc.update("UPDATE OrderReturns SET Status=:s,IsOpen=:open,ReviewNote=:n,ReviewedAt=SYSDATETIME() WHERE ReturnID=:id",params("s",next,"open",next.equals("APPROVED"),"n",message,"id",id));
    event(id,next,message.isEmpty()?"Cửa hàng đồng ý tiếp nhận hàng để kiểm tra.":message,user);
    changed(o,user,"[RETURN] Yêu cầu #"+id+(next.equals("APPROVED")?" đã được duyệt tiếp nhận.":" đã bị từ chối: "+message),"return_reviewed");
    return params("success",true);
  }

  private int variant(Map<String,Object> line) {
    int id=integer(line.get("ProductVariantID"));
    if(id>0)return id;
    var candidates=jdbc.queryForList("SELECT ProductVariantID FROM ProductVariantRead WHERE ProductID=:p AND Size=:s AND ColorName=:c",params("p",line.get("ProductID"),"s",line.get("Size"),"c",line.get("Color")));
    if(candidates.size()!=1)throw conflict("Biến thể lịch sử không còn xác định được. Cần đối soát kho trước khi tiếp nhận.");
    return integer(candidates.get(0).get("ProductVariantID"));
  }
  private void move(int variant,int order,Integer returnItem,String key,String kind,int available,int damaged,String note,ApiUser user) {
    var p=params("v",variant,"o",order==0?null:order,"ri",returnItem,"key",key,"kind",kind,"a",available,"d",damaged,"n",note,"u",user.id());
    int count=jdbc.update("""
        UPDATE ProductVariants SET StockQuantity=StockQuantity+:a,DamagedQuantity=DamagedQuantity+:d,Version=Version+1
        WHERE ProductVariantID=:v AND CAST(StockQuantity AS bigint)+:a BETWEEN 0 AND 2147483647
          AND CAST(DamagedQuantity AS bigint)+:d BETWEEN 0 AND 2147483647
        """,p);
    if(count!=1)throw conflict("Tồn kho đã thay đổi hoặc không đủ để phân loại. Vui lòng kiểm tra lại.");
    jdbc.update("INSERT InventoryMovements(ProductVariantID,OrderID,ReturnItemID,EventKey,Kind,AvailableDelta,DamagedDelta,Note,CreatedByUserID) VALUES(:v,:o,:ri,:key,:kind,:a,:d,:n,:u)",p);
  }

  @Transactional(isolation=Isolation.SERIALIZABLE)
  public Map<String,Object> receive(int id,ApiUser user,Map<String,Object> body) {
    admin(user); var initial=returnCase(id,false); int orderId=integer(initial.get("OrderID"));
    var o=order(orderId,true); var r=returnCase(id,true);
    if(r.get("ReceivedAt")!=null)return params("success",true,"unchanged",true,"order_id",orderId);
    if(!"APPROVED".equals(r.get("Status")))throw conflict("Cần duyệt yêu cầu trước khi kiểm nhận hàng thực tế.");
    if(!Values.bool(body.get("confirm_received"),false))throw new ApiException(400,"Cần xác nhận đã nhận và kiểm tra hàng thực tế.");
    var selected=indexed(items(body.get("items")),"return_item_id");
    var returnItems=jdbc.queryForList("SELECT * FROM OrderReturnItems WHERE ReturnID=:id ORDER BY OrderDetailID",params("id",id));
    if(selected.size()!=returnItems.size() || returnItems.stream().anyMatch(i->!selected.containsKey(integer(i.get("ReturnItemID")))))throw new ApiException(400,"Cần kiểm tra đủ các dòng trên phiếu trả hàng.");
    var details=lines(orderId); var byId=indexed(details,"OrderDetailID"); var net=allocations(o,details);
    String receiptNote=note(body.get("note"),true); BigDecimal refund=BigDecimal.ZERO;
    int received=0;
    for(var item:returnItems) {
      int itemId=integer(item.get("ReturnItemID")), detailId=integer(item.get("OrderDetailID"));
      var entered=selected.get(itemId); var line=byId.get(detailId);
      int good=Values.integer(entered.get("good_quantity"),0,1000000,null), damaged=Values.integer(entered.get("damaged_quantity"),0,1000000,null), q=good+damaged;
      if(q>integer(item.get("RequestedQuantity")) || q>quantity(line)-returned(line))throw conflict("Số lượng thực nhận vượt quá yêu cầu hoặc lượng còn được trả.");
      var amount=ReturnAmounts.portion(net.get(detailId),quantity(line),returned(line),q);
      refund=refund.add(amount); received+=q;
      jdbc.update("UPDATE OrderReturnItems SET GoodQuantity=:g,DamagedQuantity=:d,RefundAmount=:amt WHERE ReturnItemID=:id",params("g",good,"d",damaged,"amt",amount,"id",itemId));
      if(q>0) {
        move(variant(line),orderId,itemId,"RETURN:"+itemId,"RETURN_RECEIVED",good,damaged,receiptNote,user);
        jdbc.update("UPDATE OrderDetails SET ReturnedQuantity=ReturnedQuantity+:q WHERE OrderDetailID=:id",params("q",q,"id",detailId));
      }
    }
    if(received==0)throw new ApiException(400,"Chưa có hàng thực nhận. Chỉ kiểm nhận khi kiện hàng đã về.");
    BigDecimal shipping=BigDecimal.ZERO;
    if(Values.bool(body.get("refund_shipping"),false)) {
      int remaining=details.stream().mapToInt(i->quantity(i)-returned(i)).sum()-received;
      if(remaining!=0)throw conflict("Chỉ hoàn phí giao hàng khi đã nhận lại toàn bộ phần hàng còn lại.");
      BigDecimal prior=jdbc.queryForObject("SELECT ISNULL(SUM(ShippingRefundAmount),0) FROM OrderReturns WHERE OrderID=:id",params("id",orderId),BigDecimal.class);
      shipping=money(o.get("ShippingFee")).subtract(prior).max(BigDecimal.ZERO);
      refund=refund.add(shipping);
    }
    BigDecimal balance=money(o.get("TotalAmount")).subtract(money(o.get("HistoricalRefundAmount"))).subtract(money(o.get("ReturnAdjustmentAmount")));
    if(refund.compareTo(balance)>0)throw conflict("Khoản trả vượt số tiền còn lại của đơn. Cần đối soát các khoản hoàn lịch sử.");
    Integer transaction=null;
    if(refund.signum()>0)transaction=jdbc.queryForObject("INSERT PaymentTransactions(OrderID,Provider,ProviderTxnRef,Amount,Status,SignatureValid,CreatedAt) OUTPUT INSERTED.TransactionID VALUES(:oid,N'AFTERSALES_REFUND',:ref,:amount,N'PENDING',0,GETDATE())",params("oid",orderId,"ref","RMA:"+id,"amount",refund),Integer.class);
    String next=transaction==null?"COMPLETED":"REFUND_PENDING";
    jdbc.update("UPDATE OrderReturns SET Status=:s,IsOpen=:open,ReceivedAt=SYSDATETIME(),ReceiptNote=:n,RefundAmount=:amount,ShippingRefundAmount=:shipping,RefundTransactionID=:tx WHERE ReturnID=:id",params("s",next,"open",transaction!=null,"n",receiptNote,"amount",refund,"shipping",shipping,"tx",transaction,"id",id));
    jdbc.update("UPDATE Orders SET ReturnAdjustmentAmount=ReturnAdjustmentAmount+:amount,UpdatedAt=GETDATE() WHERE OrderID=:id",params("amount",refund,"id",orderId));
    event(id,next,"Đã kiểm nhận "+received+" sản phẩm. "+receiptNote,user);
    changed(o,user,"[RETURN] Đã kiểm nhận yêu cầu #"+id+"; điều chỉnh doanh thu "+refund+" VND, chờ đối soát khoản hoàn.","return_received");
    return params("success",true,"refund_amount",refund,"refund_transaction_id",transaction,"order_id",orderId);
  }

  @Transactional(isolation=Isolation.SERIALIZABLE)
  public Map<String,Object> warehouse(int orderId,ApiUser user,Map<String,Object> body) {
    admin(user); var o=order(orderId,true);
    if(o.get("WarehouseClosedAt")!=null)return params("success",true,"unchanged",true);
    if(Values.bool(body.get("simple"),false)) {
      boolean wasPaid=paid(o.get("PaymentStatus"));
      String method=wasPaid?refundMethod(body.get("refund_method")):"CASH";
      var receipt=lines(orderId).stream().map(line->params("order_detail_id",line.get("OrderDetailID"),"good_quantity",quantity(line),"damaged_quantity",0)).toList();
      String reason=note(body.get("reason"),false);
      if(reason.isEmpty())reason="Khách không nghe máy / không nhận hàng. Hoàn kho và hủy đơn.";
      var result=warehouse(orderId,user,params("confirm_received",true,"reason",reason.length()<5?"Khách không nhận hàng. "+reason:reason,"items",receipt));
      if(wasPaid) {
        var pending=jdbc.queryForList("SELECT TransactionID FROM PaymentTransactions WHERE OrderID=:id AND Provider=N'MANUAL_REFUND' AND Status=N'PENDING'",params("id",orderId));
        for(var tx:pending)confirmRefund(orderId,integer(tx.get("TransactionID")),user,params("refund_method",method));
      }
      result.put("refund_pending",false);result.put("refund_method",wasPaid?method:null);
      return result;
    }
    if(!Set.of("dang van chuyen","dang giao","giao hang that bai","ve kho","shipping","shipped").contains(normalize(o.get("Status"))) || "LOST_IN_TRANSIT".equals(o.get("StockIssueStatus")))
      throw conflict("Chỉ hoàn kho cho kiện giao thất bại đã thực sự được nhận lại. Đơn đã giao cần dùng phiếu trả hàng.");
    if(o.get("StockDeductedAt")==null)throw conflict("Đơn chưa có dấu vết xuất kho. Cần đối soát tồn trước khi hoàn kho.");
    if(!Values.bool(body.get("confirm_received"),false))throw new ApiException(400,"Cần xác nhận đã kiểm tra kiện hàng thực tế.");
    var details=lines(orderId); var selected=indexed(items(body.get("items")),"order_detail_id");
    if(selected.size()!=details.size() || details.isEmpty())throw new ApiException(400,"Cần kiểm nhận đủ các dòng trong kiện hàng.");
    String message=note(body.get("reason"),true); boolean restored=o.get("StockRestoredAt")!=null;
    for(var line:details) {
      int detail=integer(line.get("OrderDetailID")); var input=selected.get(detail);
      if(input==null)throw new ApiException(400,"Dòng kiểm nhận không thuộc đơn.");
      int good=Values.integer(input.get("good_quantity"),0,1000000,null), damaged=Values.integer(input.get("damaged_quantity"),0,1000000,null);
      if(good+damaged!=quantity(line))throw conflict("Số lượng tốt và hỏng phải bằng số hàng đã xuất. Kiện thiếu hàng cần đối soát trước khi đóng.");
      move(variant(line),orderId,null,"WAREHOUSE:"+orderId+":"+detail,"WAREHOUSE_RECEIVED",restored?-damaged:good,damaged,message,user);
    }
    boolean paid=paid(o.get("PaymentStatus"));
    jdbc.update("UPDATE Orders SET Status=N'Đã hủy',CancelReason=:n,StockIssueStatus=N'WAREHOUSE_CLOSED',StockIssueReason=:n,StockRestoredAt=ISNULL(StockRestoredAt,GETDATE()),WarehouseClosedAt=SYSDATETIME(),IsCountedAsRevenue=0,AutoCancelDeadline=NULL,PaymentStatus=:ps,UpdatedAt=GETDATE() WHERE OrderID=:id",params("n",message,"ps",paid?"Chờ hoàn tiền":"Đã hủy","id",orderId));
    sql.restorePromotion(orderId);
    if(paid)sql.refund(orderId,o.get("TotalAmount"));
    sql.history(orderId,o.get("Status"),"Đã hủy","[WAREHOUSE] Đã kiểm nhận, hoàn tồn hàng tốt và đóng đơn. "+message,user.id());
    sql.notify(o.get("UserID"),orderId,"Đơn đã hoàn kho","Cửa hàng đã nhận lại kiện giao không thành công và đóng đơn."+(paid?" Khoản hoàn tiền đang được đối soát.":""));
    effects.afterCommit(orderId,"warehouse_closed",null);
    return params("success",true,"refund_pending",paid);
  }

  @Transactional(isolation=Isolation.SERIALIZABLE)
  public Map<String,Object> confirmRefund(int orderId,int transaction,ApiUser user,Map<String,Object> body) {
    admin(user); var o=order(orderId,true);
    boolean simple=body.containsKey("refund_method");
    String method=simple?refundMethod(body.get("refund_method")):"UNKNOWN";
    String reference=simple?"SG-REFUND-"+orderId+"-"+transaction:Objects.toString(body.get("reference"),"").strip().toUpperCase(Locale.ROOT);
    if(reference.length()<3||reference.length()>100||!simple&&!Values.bool(body.get("confirm_paid"),false))throw new ApiException(400,"Cần mã chứng từ và xác nhận khoản tiền đã thực sự được hoàn.");
    String message=simple?"Hoàn tiền bằng "+(method.equals("CASH")?"tiền mặt.":"chuyển khoản."):note(body.get("note"),true);
    var tx=one("SELECT * FROM PaymentTransactions WITH(UPDLOCK,HOLDLOCK) WHERE TransactionID=:tx AND OrderID=:id AND Provider IN (N'AFTERSALES_REFUND',N'MANUAL_REFUND')",params("tx",transaction,"id",orderId));
    var confirmations=jdbc.queryForList("SELECT Reference,RefundMethod FROM RefundConfirmations WHERE TransactionID=:tx",params("tx",transaction));
    if("SUCCESS".equals(tx.get("Status"))) {
      if(!confirmations.isEmpty()&&reference.equals(confirmations.get(0).get("Reference"))&&(!simple||method.equals(confirmations.get(0).get("RefundMethod"))))return params("success",true,"unchanged",true);
      throw conflict("Khoản hoàn đã được ghi nhận bằng chứng từ khác.");
    }
    if(!"PENDING".equals(tx.get("Status")))throw conflict("Khoản hoàn không còn chờ xử lý.");
    if(!jdbc.queryForList("SELECT TransactionID FROM RefundConfirmations WITH(UPDLOCK,HOLDLOCK) WHERE Reference=:ref",params("ref",reference)).isEmpty())throw conflict("Chứng từ này đã được dùng cho một khoản hoàn khác.");
    BigDecimal completed=jdbc.queryForObject("SELECT ISNULL(SUM(Amount),0) FROM PaymentTransactions WHERE OrderID=:id AND Provider IN (N'AFTERSALES_REFUND',N'MANUAL_REFUND') AND Status=N'SUCCESS'",params("id",orderId),BigDecimal.class);
    BigDecimal cumulative=completed.add(money(tx.get("Amount"))).add(money(o.get("HistoricalRefundAmount")));
    if(money(tx.get("Amount")).signum()<=0||cumulative.compareTo(money(o.get("TotalAmount")))>0)throw conflict("Tổng hoàn vượt số tiền đã thu. Cần đối soát trước khi ghi nhận.");
    jdbc.update("INSERT RefundConfirmations(TransactionID,Reference,Note,ConfirmedByUserID,RefundMethod) VALUES(:tx,:ref,:n,:u,:method)",params("tx",transaction,"ref",reference,"n",message,"u",user.id(),"method",method));
    jdbc.update("UPDATE PaymentTransactions SET Status=N'SUCCESS',CompletedAt=GETDATE() WHERE TransactionID=:tx",params("tx",transaction));
    var cases=jdbc.queryForList("SELECT ReturnID FROM OrderReturns WHERE RefundTransactionID=:tx",params("tx",transaction));
    for(var r:cases) {
      int id=integer(r.get("ReturnID"));
      jdbc.update("UPDATE OrderReturns SET Status='COMPLETED',IsOpen=0,RefundedAt=SYSDATETIME() WHERE ReturnID=:id",params("id",id));
      event(id,"COMPLETED","Cửa hàng đã đối soát và ghi nhận hoàn tiền.",user);
    }
    if(cumulative.compareTo(money(o.get("TotalAmount")))==0)jdbc.update("UPDATE Orders SET PaymentStatus=N'Hoàn tiền',UpdatedAt=GETDATE() WHERE OrderID=:id",params("id",orderId));
    changed(o,user,"[REFUND] Đã ghi nhận khoản hoàn "+tx.get("Amount")+" VND; chứng từ "+reference,"refund_confirmed");
    return params("success",true);
  }

  @Transactional(readOnly=true)
  public Map<String,Object> damaged() {
    var items=jdbc.queryForList("""
        SELECT v.ProductVariantID AS id,v.ProductID AS product_id,v.ColorName AS color,v.Size AS size,
          v.ChildSKU AS sku,p.ProductName AS name,pv.DamagedQuantity AS damaged_quantity,pv.StockQuantity AS available_quantity,
          pv.Version AS version,pv.IsActive AS active
        FROM ProductVariantRead v JOIN ProductVariants pv ON pv.ProductVariantID=v.ProductVariantID
          JOIN ProductRead p ON p.ProductID=v.ProductID
        WHERE pv.DamagedQuantity>0 ORDER BY p.ProductName,v.ProductVariantID
        """,Map.of());
    var history=jdbc.queryForList("""
        SELECT TOP 50 m.MovementID AS id,m.Kind AS kind,m.AvailableDelta AS available_delta,m.DamagedDelta AS damaged_delta,
          m.CreatedAt AS created_at,m.Note AS note,p.ProductName AS name,v.Size AS size,v.ColorName AS color,u.FullName AS actor
        FROM InventoryMovements m JOIN ProductVariantRead v ON v.ProductVariantID=m.ProductVariantID
          JOIN ProductRead p ON p.ProductID=v.ProductID JOIN Users u ON u.UserID=m.CreatedByUserID
        ORDER BY m.MovementID DESC
        """,Map.of());
    return params("items",items,"history",history);
  }

  @Transactional(isolation=Isolation.SERIALIZABLE)
  public Map<String,Object> resolveDamage(int variantId,ApiUser user,Map<String,Object> body) {
    admin(user); String action=Objects.toString(body.get("action"),"");
    if(!Set.of("REPAIR","WRITE_OFF").contains(action))throw new ApiException(400,"Cách xử lý hàng hỏng không hợp lệ.");
    int q=Values.integer(body.get("quantity"),1,1000000,null); String message=note(body.get("note"),true), key="DAMAGE:"+requestKey(body.get("request_key"));
    if(!Values.bool(body.get("confirm_checked"),false))throw new ApiException(400,"Cần xác nhận đã kiểm tra và phê duyệt cách xử lý hàng hỏng.");
    one("SELECT ProductVariantID FROM ProductVariants WITH(UPDLOCK,HOLDLOCK) WHERE ProductVariantID=:id",params("id",variantId));
    var prior=jdbc.queryForList("SELECT * FROM InventoryMovements WHERE EventKey=:key",params("key",key));
    String kind=action.equals("REPAIR")?"DAMAGE_REPAIRED":"DAMAGE_WRITEOFF";
    if(!prior.isEmpty()) {
      var row=prior.get(0);
      if(integer(row.get("ProductVariantID"))!=variantId || !kind.equals(row.get("Kind")) || integer(row.get("DamagedDelta"))!=-q || !message.equals(row.get("Note")))throw conflict("Mã thao tác đã được dùng cho nội dung khác.");
      return params("success",true,"unchanged",true);
    }
    move(variantId,0,null,key,kind,action.equals("REPAIR")?q:0,-q,message,user);
    return params("success",true);
  }
  public List<Map<String,Object>> stockUpdates(int orderId,int variantId) {
    return jdbc.queryForList("SELECT ProductVariantID AS id,StockQuantity AS stock,Version AS version FROM ProductVariants WHERE ProductVariantID=:v OR ProductVariantID IN(SELECT ProductVariantID FROM InventoryMovements WHERE OrderID=:o)",params("v",variantId,"o",orderId));
  }
}
