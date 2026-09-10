const fs=require('node:fs');const path=require('node:path');
const {findings,features}=require('./audit-findings.cjs');
const root=path.resolve(__dirname,'../..');
const link=f=>`[${f}](<${path.join(root,f).replaceAll('\\','/')}>)`;
const clean=v=>String(v??'').replaceAll('|','\\|').replaceAll('\n','<br>');
const table=(headers,rows)=>`| ${headers.join(' | ')} |\n| ${headers.map(()=>'---').join(' | ')} |\n${rows.map(row=>`| ${row.map(clean).join(' | ')} |`).join('\n')}`;
const fixed=findings.filter(x=>x.status==='Fixed'),remaining=findings.filter(x=>x.status!=='Fixed');
const completed=features.filter(x=>x[2]==='Complete').length;
const suiteNames=['runtime-results.json','extended-results.json','boundary-results.json','jobs-results.json','known-gaps-results.json'];
const runtime=suiteNames.flatMap(name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8')).results.map(r=>({...r,source:name})));
const unitFiles=['test/frontend-audit.test.cjs','backend/test/payment-audit.test.cjs','backend/test/security.test.cjs','backend/test/validation.test.cjs'];
const unit=unitFiles.flatMap(file=>[...fs.readFileSync(path.join(root,file),'utf8').matchAll(/test\(\s*(["'])(.*?)\1/g)].map(match=>({scenario:match[2],file})));
const ui=[
['UI-01','Home và ProductDetail policy','14 ngày; phí xem khi checkout','Quan sát UI đúng sau sửa','PASS'],
['UI-02','Variant M còn 100 / L hết hàng','M mua được, L bị disable','UI hiển thị L Hết; M còn hàng','PASS'],
['UI-03','Cart → checkout → COD success','500k + 75k; một đơn được lưu','UI SG186668; SQL OrderID85, qty1, total575000, stock99','PASS'],
['UI-04','Account → hủy đơn có lý do','Đã hủy, stock trả một lần','UI Đã hủy; SQL PaymentStatus Đã hủy, stock100, StockRestoredAt có giá trị','PASS'],
['UI-05','Drawer không dùng phí giả 30k','Phí tính ở checkout, CTA không báo sai total','Quan sát sau sửa: Tính khi thanh toán / Tiếp tục thanh toán','PASS'],
];
const modules=[...new Set(features.map(x=>x[0]))];
let report=`# Audit bán hàng ShoeGroup — 09/09/2026

Phạm vi: working tree tại ${root}; đọc backend/router/security/schema/migrations và frontend liên quan, sửa trực tiếp, chạy Express/Vue và SQL Server thật trên dữ liệu tổng hợp. Bản báo cáo phản ánh bản sửa trong workspace; **chưa triển khai production và chưa chạy migration trên ShoegroupDB gốc**.

# 1. Executive Summary

**Kết luận production: NO.** Các lỗi trọng yếu có thể sửa an toàn đã được sửa và kiểm thử. Thanh toán gateway, hoàn tiền ra ngoài/rút ví, lưu PAN, pricing promotion và một số quy tắc thu/hoàn chênh lệch còn chặn sử dụng thật.

${table(['Chỉ số','Kết quả'],[
['Module được đánh giá',`${modules.length}: ${modules.join(', ')}`],
['Feature được đánh giá',`${features.length}; Complete ${completed}; chưa hoàn thiện ${features.length-completed}`],
['Phân loại feature', ['Complete','Partial','Missing','Broken'].map(s=>`${s}: ${features.filter(x=>x[2]===s).length}`).join('; ')],
['Issue/bug có bằng chứng',`${findings.length}; bao gồm lỗi runtime, code/unit đã tái hiện và gap kiến trúc được xác minh`],
['Mức độ', ['P0','P1','P2','P3'].map(p=>`${p}: ${findings.filter(x=>x.priority===p).length}`).join('; ')],
['Đã sửa',`${fixed.length} Fixed trong code/audit DB`],['Còn lại',`${remaining.length}: ${remaining.filter(x=>x.status==='Not Fixed').length} Not Fixed; ${remaining.filter(x=>x.status==='Needs Business Decision').length} Needs Business Decision`],
['HTTP + SQL/scheduler integration',`${runtime.filter(x=>x.result==='PASS').length}/${runtime.length} PASS; ${runtime.filter(x=>x.result==='FAIL').length} FAIL đã biết (G01–G04)`],
['Unit/handler/frontend',`${unit.length}/${unit.length} PASS (15 backend + 11 frontend)`],
['UI thực tế','5 quan sát kiểm thử; checkout và cancel đối chiếu SQL'],
['Build/patch validation','npm run build PASS; git diff --check không có lỗi whitespace'],
])}

Không cộng số test thành số bug. Một test có thể kiểm tra nhiều invariant; một bug có thể cần nhiều test. “Complete” chỉ dùng cho phạm vi feature hẹp đã có backend/database hoặc test phù hợp, không hàm ý toàn bộ module hoàn chỉnh.

## Kiến trúc và môi trường xác minh

${table(['Thành phần','Thực tế'],[
['Frontend','Vue 3 + Vue Router; Vite 6 (runtime build 6.4.3); reactive stores/localStorage; adminStore lớn'],
['Backend','Express 5; backend/server.js khoảng 5.2k dòng + optimized v2 routes; mssql native queries'],
['Database/ORM','SQL Server 2022 Express local; không ORM; database/dbsql.sql và migrations'],
['Auth','JWT bearer, scrypt/bcrypt password support, role/ownership policy middleware'],
['Order/inventory','Orders + OrderDetails; stock tại ProductVariants; decrement khi tạo order; trạng thái/history/StockRestoredAt'],
['Coupon/promotion','Coupons; thêm CouponRedemptions; VariantDiscounts CRUD tách rời giá checkout'],
['Payment/refund','PaymentTransactions nội bộ/manual; Returns/ReturnDetails; ShoeGroupWallets/Transactions/Withdrawals'],
['Shipping','ShippingMethods + helper distance từ Hà Nội; trạng thái/tracking trong order; chưa carrier thật'],
['Tests','node:test, handler VM tests, frontend module/SFC qua esbuild; integration dùng HTTP thật + SQL queries/fault injection'],
['Isolation','ShoegroupAudit_20260909 (baseline) và ShoegroupAudit_20260909_fixed; API5101/5100; worker5102; Vite3100; không gửi email/thanh toán thật'],
])}

Đã đọc các module đang phục vụ ứng dụng; thư mục bản thiết kế Figma độc lập/ảnh build/vendor không được coi là backend hoạt động. Đã giữ các chỉnh sửa giao diện có sẵn của người dùng. Không dùng seed khách hàng thật từ SQL dump; test chỉ dùng tài khoản @example.test.

Giới hạn: không có payment sandbox, SMTP/shipper/external media service nên **không xác nhận runtime gateway SUCCESS, chữ ký webhook, refund ngân hàng, email exactly-once hay tracking carrier**. Các handler payment unit dùng mock SQL không chứng minh concurrency; phần này được kiểm tra riêng bằng SQL thật. Chưa load/soak test nhiều giờ, kiểm thử mọi trình duyệt/mobile, pentest độc lập hay diễn tập khôi phục backup. B07 kiểm tra predicate SQL tại timestamp đã lưu, không giả lập đồng hồ của payment provider.

# 2. Feature Audit

${table(['Module','Feature','Status','Test Result','Issue','Priority'],features)}

## Luồng tồn kho và thời hạn hiện có

Cart không giữ kho. Checkout SERIALIZABLE lấy giá/variant active rồi trừ available stock bằng conditional update; order/items/coupon/idempotency cùng commit hoặc rollback. Đây là **hold ngầm qua stock đã trừ**, chưa có bảng InventoryReservations với RESERVED/SOLD tách biệt. Payment không trừ lần hai. Cancel/expiry/warehouse dùng marker để trả một lần; reship trừ lại với kiểm tra stock.

Đơn bank chưa khai báo thanh toán có PaymentDueAt=24 giờ; job lúc khởi động sau 5 giây và mỗi giờ release khi hết hạn. Vì lịch chạy hourly, release có thể chậm gần một giờ, lâu hơn nếu server tắt. Lời khai Chờ thanh toán được loại khỏi nhánh 24h theo logic cũ; deadline tổng 7 ngày vẫn áp dụng cho pending/confirmed. Paid pending quá deadline tổng có thể bị hủy và chuyển Chờ hoàn tiền. Cần BR-001/BR-002 và reconciliation trước vận hành.

## Cancellation/state machine hiện có

${table(['Trạng thái nghiệp vụ','Cancel trực tiếp','Kho/tiền'],[
['Pending/awaiting payment','Khách chủ đơn và admin được hủy; API yêu cầu reason','Trả stock một lần; unpaid không refund'],
['Confirmed/Processing','Cho phép; processing/picking được quy về confirmed','Paid → Chờ hoàn tiền + pending ledger; chưa chi trả'],
['Packed','Không có trạng thái/lifecycle riêng được thực thi','Cần định nghĩa mốc ngừng cancel'],
['Paid','Là payment status, không phải một order state độc lập','Quyền hủy phụ thuộc fulfillment; không tự coi pending refund là đã refund'],
['Shipping','Không cho khách cancel trực tiếp','Admin nhánh thất lạc có lý do: cancel không restock; nhánh về kho: restock'],
['Delivered/Received','Không cancel trực tiếp','Đi qua Return trong window14 ngày'],
['Cancelled','Retry trả unchanged; không ship/mở lại','Không trả kho/ghi refund lần hai'],
['Refunded/Return completed','Terminal qua Return API','Không đổi lại processing; completed return immutable'],
])}

Luồng chính: Chờ xác nhận → Đã xác nhận → Đang vận chuyển → Đã giao hàng thành công → Đã nhận hàng. Có nhánh Về kho → giao lại và return workflow. Có validation transition ở backend, không phải string update tùy ý; chưa tách payment/fulfillment/return thành ba máy trạng thái độc lập.

# 3. Bugs Found

${table(['ID','Module','Bug','Severity','Root Cause','Status'],findings.map(b=>[b.id,b.module,b.problem,b.priority,b.root,b.status]))}

P0=Critical; P1=High; P2=Medium; P3=Low. Fixed là code + test trên môi trường cô lập, không nói dữ liệu lịch sử đã được sửa. Không ghi “overselling đã xảy ra” vì baseline có khóa/conditional update và các ca chạy không chứng minh tồn âm; lỗi chứng minh được là deadlock và duplicate checkout.

## Reproduce các issue còn mở

${remaining.map(b=>`### ${b.id} — ${b.problem}

- Module/Severity: ${b.module} / ${b.priority}.
- Precondition: fixture audit; tài khoản/đơn đủ điều kiện theo mô tả; với gateway cần sandbox hiện chưa có.
- Steps: ${b.steps}
- Expected: ${b.expected}
- Actual: ${b.actual}
- Root cause: ${b.root}
- Status: ${b.status}.
- Hướng xử lý: ${b.fix}
- Evidence: ${b.tests}; ${b.files.map(link).join(', ')}.
`).join('\n')}

# 4. Bugs Fixed

Precondition chung: SQL fixture độc lập; chạy server tương ứng, dùng user/customer/admin tổng hợp. “Before” dưới đây lấy từ baseline runtime JSON khi có, hoặc code/unit trước sửa được nêu rõ. Baseline server snapshot có dùng chung optimized route file, nên T23 không phải bằng chứng runtime của v2 trước sửa. B05 baseline thiếu ledger, không tính đó là một bug mới.

${fixed.map(b=>`### ${b.id}

**Problem:** ${b.problem}

**Precondition / Steps to reproduce:** ${b.steps}

**Expected:** ${b.expected}

**Actual trước sửa / bằng chứng:** ${b.actual}

**Root cause:** ${b.root}

**Fix:** ${b.fix}

**Files changed:** ${b.files.map(link).join(', ')}.

**Tests:** ${b.tests}. Các bộ regression dùng fixture riêng, gồm đường bình thường, biên/duplicate/concurrency và rollback liên quan; xem mục 9. Không phải mọi mã trên đều là test trước sửa.

**Result:** PASS trong phạm vi sửa. ${b.id==='BUG-019'?'Migration cần WITH CHECK trên dữ liệu đích trước khi deploy.':''}
`).join('\n')}

## Các file thay đổi và khả năng tương thích

${table(['Nhóm','File/module'],[
['Backend','server.js; src/checkout-idempotency.js; src/revenue.js; src/routes/optimized.routes.js; src/security/env.js, guard.js; src/validation.js; .env.example'],
['SQL','20260909_checkout_idempotency.sql; 20260909_coupon_redemptions.sql; 20260909_audit_constraints.sql'],
['Frontend','services/checkoutAttempt.js, revenue.js, httpInterceptor.js; stores/cartStore.js, orderStore.js; CheckoutView, MyOrders, HomeDisplay, ProductDetail, CartDrawer; adminStore, PosPage, ReturnsPage'],
['Tests/docs','backend/test/audit.*.cjs, helpers/audit-db.cjs, payment-audit.test.cjs, security.test.cjs; test/frontend-audit.test.cjs; package.json test script; docs/audit/*'],
])}

Không commit/deploy tự động. Git diff có cả các thay đổi người dùng đã có ở AccountView, ProductsPage, router, layout, icon/CSS và một số view; không quy toàn bộ diff đó cho audit. Không đổi URL API checkout. Idempotency-Key còn optional để tương thích client cũ; stock edit nay yêu cầu version khi sửa tồn, POS paid sai total trả409, customer payment chỉ là pending, generic return state trả409. Đây là thay đổi có chủ đích để đóng lỗ hổng, client liên quan đã được cập nhật.

# 5. Business Logic Chưa Được Định Nghĩa

Tất cả mục sau là **BUSINESS RULE REQUIRED** trước khi mở rộng hành vi. Khuyến nghị chưa phải rule được triển khai.

${table(['ID / Rule','Current','Need decision / Lựa chọn','Recommendation'],[
['BR-001 Inventory reservation duration','Decrement khi tạo; bank24h, pending/confirmed deadline7d, job hourly','Hold ngắn hay dài; giới hạn số hold/user; lời khai pending có được kéo dài?','Reservation riêng có expires_at; quota user; worker theo phút và đối soát với payment'],
['BR-002 Cancellation','Trước shipping được hủy; paid→pending refund; deadline7d có thể hủy paid pending','Mốc packed; auto-cancel paid; phí hủy; ai phê duyệt','Tách order/payment/fulfillment; paid expiry chuyển hàng chờ xử lý/refund có theo dõi'],
['BR-003 Return window','14 ngày từ received/delivered; copy đã khớp','Tính 14×24h hay ngày lịch; ngoại lệ hàng lỗi; evidence bắt buộc?','Giữ14 ngày hiện có đến khi chủ dự án chốt; lưu lý do/ảnh và deadline snapshot'],
['BR-004 Refund','Return credit ví; paid cancel pending ngoài ví','Ví hay phương thức gốc; SLA; offline guest; failure/retry','Ưu tiên hoàn phương thức gốc nếu provider hỗ trợ; ledger độc lập với trạng thái yêu cầu'],
['BR-005 Exchange/replacement','Chưa có workflow','Đổi cùng SKU miễn phí vs A→B; cách thu/hoàn chênh','Dựa net value snapshot đã trả; reserve B; chỉ commit khi chênh lệch được xử lý'],
['BR-006 Voucher restoration','Cancel không giảm UsedCount/không xóa usage','Trước/sau payment, expiry, one-time, private/admin vs campaign','Lưu trạng thái redemption; chỉ restore theo rule có giới hạn; không hồi sinh mã hết hạn tự động'],
['BR-007 Partial return','Không discount thì hỗ trợ qty; có discount bị409','Pro-rata discount/tax, rounding, shipping, min-spend clawback','Lưu allocation tại checkout, tổng allocation khớp order; cap quantity/refund cumulative'],
['BR-008 Combo return','Không có bundle model','Cấm partial rõ ràng hoặc phân bổ net paid500k cho A+B+C','Không refund200k mặc định; nếu cho partial dùng allocation snapshot bảo toàn tổng'],
['BR-009 Promotion/price locking','SalePrice khóa khi tạo order; VariantDiscounts bị bỏ qua','Stacking/ưu tiên SalePrice, adjustment, scheduled variant/coupon; thời điểm hết hạn','Khóa tại order với hạn thanh toán; promotion version và quota atomic; quy định [start,end) hoặc giữ inclusive end rõ ràng'],
['BR-010 Order modification','Không có qty edit; address đổi được một lần','Trạng thái cho phép, reprice, coupon, stock, tiền đã thu','Unpaid sửa qua transaction revalidation; paid dùng adjustment/refund workflow'],
['BR-011 Failed delivery','Manual về kho/thất lạc/giao lại; không attempt counter','Số lần giao, refusal/unreachable, COD settlement, ai chịu phí','Tách Shipment attempts + ledger thu COD; kiểm nhận hàng về trước available'],
['BR-012 Revenue recognition','Code hiện received+14 ngày+paid; query mới trừ refund','Ngày tạo/thu tiền/hoàn thành; phí giao còn giữ sau full return; tax; kỳ refund','Giữ rule hiện có trong đợt sửa; sổ giao dịch tiền và báo cáo kỳ recognition/refund riêng'],
['BR-013 Shipping fee','Quote theo khoảng cách; đổi địa chỉ chưa reprice; return mặc định tiền hàng','Lỗi shop/hàng lỗi/đổi ý/refusal; partial/full; thu/hoàn chênh địa chỉ','Decision table phí theo nguyên nhân; requote trước xác nhận thay đổi'],
['BR-014 Variant pricing','POS cộng PriceAdjustment, online chưa cộng; discount CRUD riêng','Giá thống nhất theo variant hay chênh theo kênh bán?','Một price service theo policy được version hóa; không âm thầm sửa giá bán hiện có'],
['BR-015 Legacy/timezone/data','Ngày local và UTC có thể lẫn; coupon usage lịch sử không có order link','Phạm vi backfill, cách xử lý order cũ thiếu snapshot','Audit dữ liệu từng cột/nguồn; không shift tất cả timestamp hay đoán mã coupon của đơn cũ'],
])}

# 6. Hidden Risks / Edge Cases

- **Duplicate request:** client mới có key được bảo vệ giữa hai API process. Client cũ không có key, hai tab tạo key khác, hoặc thay payload sau timeout chưa xác định kết quả vẫn là rủi ro. Cần checkout intent lưu trên server và endpoint lookup/recovery, không xóa key trước khi biết kết quả.
- **Payment/order mismatch:** không có provider event inbox, signature verification hay reconciliation. Manual SUCCESS chỉ chứng minh người vận hành xác nhận; SignatureValid=false, không được gọi là xác thực ngân hàng. Success sau expiry/cancel phải vào hàng chờ đối soát/refund; hiện chưa tự xử lý.
- **Reservation treo:** hold implicit; server/worker ngừng chạy thì không release. Chưa metric/alert tuổi hold; chưa hạn chế abuse nhiều checkout. Retry khác key vẫn tiêu thụ quota/kho như giao dịch mới.
- **Concurrency:** 2/5/10 last-SKU, reverse-SKU và same-key multi-process đã chạy. SQL locks không thay thế load test/deadlock retry có giới hạn. Coupon lock có thể thành điểm nghẽn campaign lớn; schema startup tự migration có rủi ro khi scale nhiều process cùng lúc.
- **Inventory:** hàng lỗi không vào available khi return chưa kiểm tra, nhưng chưa có quarantine/movement ledger. “Về kho” shipping hiện nhập available ngay theo action admin; nên tách sự kiện kiểm nhận thực tế. Variant lịch sử đã bị xóa hoặc dữ liệu stock sai cũ chưa được tự chữa.
- **Refund:** paid cancel chỉ pending; ví nội bộ không đồng nghĩa tiền về ngân hàng. G03 rút ví giữ tiền nhưng chưa có executor. Full/partial shipping tax allocation chưa thống nhất; full return bị loại toàn bộ revenue dù phí giao có thể còn giữ.
- **Coupon:** account-level đã khóa đồng thời; phone/email/multi-account abuse chưa được chống. History không đủ backfill per-user trước migration; không tự phục hồi voucher hết hạn. Không có policy stacking nhiều coupon.
- **Price:** OrderDetails.UnitPrice snapshot bảo toàn giá cũ; thiếu final unit/net discount/tax allocation. SQL DECIMAL dùng cho tiền nhưng app tính Number/Math.round và legacy MONEY/decimal scale khác nhau; cần thống nhất VND integer và rounding cuối cùng. Chưa thử toàn bộ cực trị monetary lên đến hạn1e12 qua mọi báo cáo.
- **Authorization:** trọng yếu owner/admin đã test; tài khoản khóa/hạ role có hiệu lực ngay. Password reset chưa revoke toàn bộ JWT đã phát; lưu token browser tạo bề mặt XSS. Cần production config bắt buộc secret mạnh, DB account tối thiểu, TLS; không suy diễn cấu hình dev là deployment production.
- **Data:** constraint WITH CHECK có thể từ chối dữ liệu cũ; đây là tín hiệu cần xử lý, không bỏ CHECK hay xóa lịch sử. Decimal/FK không tự đảm bảo SUM(items)=total vì còn phí/discount; invariant được kiểm thử ở application transaction.
- **Timezone:** sửa driver khớp schema GETDATE; chỉ đúng khi Node/SQL cùng business timezone. Timestamp cũ bị lệch không được tự động dịch7h. Exact-end coupon hiện inclusive; promotion engine chưa hoạt động nên không tuyên bố đã test runtime sale end.
- **Audit/security:** OrderStatusHistory có reason/actor, payment internal logs có ref; chưa có admin/stock audit đầy đủ, correlation ID, immutable event log. Raw PAN còn trong Destination là issue cần đóng trước thu thập dữ liệu thật.
- **Frontend/report:** UI smoke desktop và module tests không thay thế full browser matrix. Dashboard theo ngày tạo order hiện là cohort của đơn, chưa phải sổ doanh thu phát sinh trong kỳ. Banner ảnh khoảng2.3–2.5MB là vấn đề hiệu năng P3, không ưu tiên hơn tiền/kho.

# 7. Recommended Improvements

## Must Fix

1. BUG-028/029: gateway và quy trình refund/payout có idempotency, trạng thái thất bại/retry/reconciliation; hoặc tắt phương thức chưa hỗ trợ trước mở bán.
2. BUG-030: ngừng lưu PAN trực tiếp, token hóa qua nhà cung cấp; khảo sát/xử lý dữ liệu cũ có kiểm soát.
3. BUG-031/032/033: chốt rule và hoàn thiện pricing promotion, partial discounted return, shipping adjustment; không hiển thị là hỗ trợ khi backend chưa thực hiện.
4. Áp dụng migrations vào staging rồi DB đích sau backup, kiểm tra dữ liệu cũ/timezone/coupon history; bảo đảm toàn bộ client gửi idempotency key và version stock.
5. Chốt vận hành manual payment/COD collection, quyền xác nhận/refund và audit; không coi trạng thái paid nhập tay là chứng cứ gateway.

## Should Fix

Reservation/expiry worker có retry/metrics; inventory movement + quarantine; state machine riêng payment/fulfillment; checkout recovery sau timeout; allocation snapshot theo order item; sổ doanh thu theo kỳ; revoke token sau reset; integration CI với SQL thật; bỏ migration dữ liệu tự chạy khi server boot.

## Nice to Have

Transactional outbox cho email/notification, cảnh báo deadlock/hold/payment mismatch, admin diff audit, tracing/correlation ID, kiểm thử mobile/accessibility, tối ưu banner/lazy-load, phân trang UI lớn. Không refactor cosmetic trước các Must Fix.

# 8. FUNCTIONALITY NÊN BỔ SUNG

${table(['Chức năng','Hiện trạng','Ưu tiên / hướng bổ sung'],[
['Inventory reservation','Implicit stock deduction','P1: bảng hold, TTL, quota, conversion/release state'],
['Order expiration','Có job hourly','P1: durable worker, retry, monitor và reconcile payment'],
['Payment reconciliation','Missing','P0: provider lookup, event inbox, manual exception queue'],
['Idempotency key','Đã thêm checkout','P0/P1: mandatory v2 intent, recovery endpoint; áp dụng payout/provider events'],
['Order state machine','Có transition map','P1: tách order/payment/fulfillment và actor-specific transitions'],
['Return management','Partial','P1: inspection/evidence/quarantine, SLA và audit'],
['Partial refund','Undiscounted wallet đã chạy','P1: allocation, shipping/tax và provider partial refund'],
['Exchange/replacement','Missing','P1: liên kết return/new order, phần chênh từ net paid'],
['Coupon usage tracking','Đã thêm redemption ledger','P1: lifecycle restore/release và xử lý history/abuse'],
['Inventory movement history','Missing','P1: entry idempotent theo order/return/stock adjustment'],
['Audit/payment/order/admin logs','Có một phần','P1: actor, old/new, correlation, bất biến và cảnh báo'],
['Failed payment recovery','Missing provider recovery','P0: retry/late success/expired order/reconciliation'],
['Failed delivery handling','Manual partial','P1: attempts, return-to-sender, actual COD settlement và phí'],
])}

Không triển khai các module lớn này trong đợt audit vì cần policy/provider/schema mới. Chỉ bổ sung nền tảng nhỏ cần thiết để đóng bug đã chứng minh.

# 9. TEST MATRIX

Chạy local HTTP và SQL thật trong database audit; file kết quả giữ actual raw cho từng case. Các ca inject trigger cố ý tạo500, PASS khi transaction rollback đúng. Các ca known gap **FAIL được giữ nguyên**, không sửa test để xanh. R02 PASS nghĩa là guard an toàn hoạt động, không nghĩa partial discounted refund hoàn thiện.

${table(['Test ID','Scenario','Expected','Actual','Result'],runtime.map(r=>[r.id,r.scenario,r.expected,(typeof r.actual==='string'?r.actual:JSON.stringify(r.actual)).slice(0,440)+(JSON.stringify(r.actual).length>440?' … xem JSON':''),r.result]))}

## Unit/handler tests

${table(['Test ID','Scenario','Expected','Actual','Result'],unit.map((r,i)=>[`U${String(i+1).padStart(2,'0')}`,r.scenario,'Assertion của case thỏa mãn','node:test PASS','PASS']))}

## UI smoke

${table(['Test ID','Scenario','Expected','Actual','Result'],ui)}

## Chưa thể chạy hoặc chưa có feature để chạy

${table(['Test ID','Scenario','Expected','Actual','Result'],[
['X01','Gateway SUCCESS nhưng callback timeout/browser đóng','Provider retry/reconcile hồi phục đơn','Không có provider/webhook adapter/sandbox','NOT RUN'],
['X02','Duplicate/out-of-order/late webhook, amount400k vs500k','Verify signature/ref/currency/amount; xử lý đúng một lần','B06 chỉ manual endpoint; không thay thế gateway test','NOT RUN'],
['X03','Provider refund fail/timeout/duplicate','DB không báo refunded trước provider confirm','Chưa có refund provider integration','NOT RUN'],
['X04','Exchange A→B, combo A+B+C partial','Giá trị net snapshot, chênh lệch/rounding đúng','Không có module exchange/bundle','NOT IMPLEMENTED'],
['X05','Carrier failed attempts/COD reconciliation','Theo dõi giao/thu tiền thực','Chỉ manual simulation; carrier chưa nối','NOT RUN'],
['X06','SMTP/evidence upload service, duplicate notification','Không gửi trùng/mất event','Không có credentials/service để test end-to-end','NOT RUN'],
['X07','Soak/performance và mọi browser/mobile','Không deadlock/retry storm dài hạn','Chỉ bounded concurrency và desktop smoke','NOT RUN'],
])}

**Database consistency đã kiểm tra:** Orders/OrderDetails/ProductVariants/CheckoutRequests/Coupons/CouponRedemptions/PaymentTransactions/Returns/ReturnDetails/ShoeGroupWalletTransactions và OrderStatusHistory. T24 không có stock âm/order trống/orphan item trong audit fixed DB. R05/R06 chứng minh credit/refund/restock một lần hoặc rollback toàn bộ; B05 chứng minh fail coupon ledger không để lại order/items/stock/counter/idempotency commit. J04 chứng minh hai process dùng chung SQL cùng một checkout chỉ có một OrderID. Không có bảng Shipment/reservation/refund provider thực thi tương đương để tuyên bố đã kiểm tra.

**Evidence files:** ${suiteNames.map(x=>link(`docs/audit/${x}`)).join(', ')}; ${link('docs/audit/ui-database-results.json')}. Baseline: ${['baseline-runtime.json','baseline-extended.json','baseline-boundary.json'].map(x=>link(`docs/audit/${x}`)).join(', ')}. Hướng dẫn chạy: ${link('docs/audit/RUNBOOK.md')}.

# 10. KẾT LUẬN

## A. Đủ an toàn để sử dụng thực tế chưa?

**NO** cho production bán hàng/nhận tiền đầy đủ. Code đã an toàn hơn rõ rệt trong checkout, tồn kho, quyền truy cập, hoàn vào ví và reporting; vẫn còn4 runtime gap đỏ cùng2 gap/decision khác trong6 issue mở. Bộ test xanh của phần đã sửa không phải chứng nhận toàn hệ thống an toàn.

## B. Bắt buộc trước production

Đóng BUG-028 đến BUG-033 hoặc khóa minh bạch tính năng chưa hỗ trợ; đưa migrations/legacy-data review vào deployment; cấu hình production security; định nghĩa payment/refund/shipping/revenue policy; chứng minh provider sandbox và recovery bằng test. Không dùng ví/rút thẻ hiện tại để xử lý tiền thật.

## C. Gần hoàn thiện nhưng còn lỗi

Scheduled variant promotion có CRUD nhưng chưa vào giá; address edit có ownership/limit nhưng cước sai; wallet credit chạy nhưng payout chưa có; return có qty workflow nhưng partial discount chưa có allocation; dashboard net đã sửa nhưng recognition period/shipping policy chưa chốt.

## D. Hoàn toàn chưa tồn tại

Gateway webhook/reconciliation thực; provider refund/payout executor; replacement/exchange; bundle composition/allocation; quantity order amendment; reservation ledger riêng; inventory movement/quarantine đầy đủ; shipping carrier attempts/COD settlement; transactional event outbox.

## E. Chạy được nhưng thiết kế còn rủi ro

Hold bằng decrement và timer trong API process; manual payment status; status strings/aliases qua nhiều UI; discount cấp order thiếu allocation; startup migrations; driver local timezone cho dữ liệu legacy; optional checkout key; localStorage cache; báo cáo doanh thu dựa flag/cohort. Những phần này cần thiết kế tiếp, không sửa tùy tiện trong audit.

## F. Top 10 việc tiếp theo

${table(['#','Việc','Priority','Impact','Risk nếu trì hoãn','Implementation effort (ước lượng)'],[
[1,'Payment adapter + webhook inbox + reconciliation','P0','Tiền/đơn nhất quán','Tiền đã trừ nhưng đơn không nhận; success trễ','Lớn: nhiều ngày–tuần, tùy provider'],
[2,'Refund/payout workflow; chặn phương thức chưa hỗ trợ','P0','Không treo tiền khách','Pending vô thời hạn/chi trả lặp','Lớn; gate ngắn, executor cần provider'],
[3,'Bỏ raw PAN, token hóa và rà dữ liệu cũ','P0/P1','Bảo vệ dữ liệu thanh toán','Lộ số thẻ trong DB/backup','Vừa–lớn, tùy dữ liệu thật'],
[4,'Staging migrations/backup/legacy/timezone review','P0/P1','Đưa fix vào DB thật an toàn','Code/DB không tương thích, lịch sử sai','Vừa; phụ thuộc dữ liệu cũ'],
[5,'Chốt pricing/variant promotion/rounding/allocation','P1','Giá bán/refund đúng','Khuyến mãi bỏ qua, hoàn thừa','Lớn'],
[6,'Requote address + shipping return decision table','P1','Thu/hoàn đúng phí','Thu sai phí khi đổi địa chỉ/trả hàng','Vừa'],
[7,'Checkout intent recovery, key bắt buộc cho client mới','P1','Chống duplicate qua timeout/multi-tab','Đơn trùng nếu mất key/đổi payload','Vừa'],
[8,'Reservation worker + movement/quarantine ledger','P1','Kho có thể đối soát','Hold treo, hàng lỗi quay lại available','Lớn'],
[9,'Coupon lifecycle + partial return/exchange policy','P1','Giảm abuse, hậu mãi đúng','Reuse sai/hoàn giá niêm yết','Vừa–lớn'],
[10,'CI SQL integration + fault/soak tests + monitoring/outbox','P1/P2','Phát hiện regression trước mở bán','Lỗi concurrency/payment im lặng','Vừa–lớn'],
])}

Effort là ước lượng tương đối, chưa có SLA/provider hay business decision nên không cam kết lịch. Các sửa đổi hiện tại được để lại trong workspace để review, cùng test tái lập và bằng chứng kết quả.
`;
fs.writeFileSync(path.join(__dirname,'AUDIT-2026-09-09.md'),report);
const summary={modules:modules.length,features:features.length,featureStatus:Object.fromEntries(['Complete','Partial','Missing','Broken'].map(s=>[s,features.filter(x=>x[2]===s).length])),issues:findings.length,fixed:fixed.length,remaining:remaining.length,severity:Object.fromEntries(['P0','P1','P2','P3'].map(p=>[p,findings.filter(x=>x.priority===p).length])),runtime:{total:runtime.length,passed:runtime.filter(x=>x.result==='PASS').length,failed:runtime.filter(x=>x.result==='FAIL').length},unitPassed:unit.length,uiChecks:ui.length,production:'NO'};
fs.writeFileSync(path.join(__dirname,'summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary));
