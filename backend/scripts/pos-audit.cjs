// Mục đích: Chạy bộ kiểm thử Spring cho bán hàng tại quầy, tồn kho và quy trình đơn hàng.
process.env.POS_AUDIT_BACKEND = 'spring';
require('../../backend/legacy-express/test/pos-cart.integration.cjs');
