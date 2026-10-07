const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('POS bank config rejects missing or malformed receiver data', async () => {
  const { normalizePosBankConfig } = await import('../src/services/vietQr.js');
  assert.equal(normalizePosBankConfig({}).configured, false);
  assert.equal(normalizePosBankConfig({ bankId: 'VCB', accountNo: 'abc', accountName: 'SHOEGROUP' }).configured, false);
});

test('POS creates a real VietQR quick link with amount and order reference', async () => {
  const { buildVietQrUrl, createPosTransferContent } = await import('../src/services/vietQr.js');
  const transferContent = createPosTransferContent('Q260929-123456');
  const url = new URL(buildVietQrUrl({
    bankId: '970415',
    bankName: 'VietinBank',
    accountNo: '113366668888',
    accountName: 'SHOEGROUP STORE',
  }, 790000, transferContent));

  assert.equal(url.origin, 'https://img.vietqr.io');
  assert.equal(url.pathname, '/image/970415-113366668888-compact2.png');
  assert.equal(url.searchParams.get('amount'), '790000');
  assert.equal(url.searchParams.get('addInfo'), 'SG Q260929 123456');
  assert.equal(url.searchParams.get('accountName'), 'SHOEGROUP STORE');
});

test('POS still creates an amount QR when no bank account is configured', async () => {
  const { buildPosPaymentQrUrl, createPosTransferContent } = await import('../src/services/vietQr.js');
  const url = new URL(buildPosPaymentQrUrl(790000, createPosTransferContent('Q260929-123456')));

  assert.equal(url.origin, 'https://api.qrserver.com');
  assert.equal(url.searchParams.get('size'), '320x320');
  assert.match(url.searchParams.get('data'), /SO TIEN 790000 VND/);
  assert.match(url.searchParams.get('data'), /SG Q260929 123456/);
});

test('backend exposes POS receiver data only when every field is valid', () => {
  const { getPosBankTransferConfig } = require('../../backend/legacy-express/src/pos-payment');
  assert.equal(getPosBankTransferConfig({}).configured, false);
  assert.deepEqual(getPosBankTransferConfig({
    POS_BANK_ID: 'VCB',
    POS_BANK_NAME: 'Vietcombank',
    POS_BANK_ACCOUNT_NO: '0123456789',
    POS_BANK_ACCOUNT_NAME: 'Cửa hàng ShoeGroup',
  }), {
    configured: true,
    bankId: 'VCB',
    bankName: 'Vietcombank',
    accountNo: '0123456789',
    accountName: 'CUA HANG SHOEGROUP',
  });
});

test('POS payment modal stays inside the admin shell so its overlay styles apply', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/views/admin/pages/PosPage.vue'), 'utf8');
  assert.doesNotMatch(source, /<Teleport[^>]*>[\s\S]*posPayModal\.open/);
  assert.match(source, /v-if="posPayModal\.open" class="custom-modal-overlay"/);
  assert.match(source, /Đang ghi nhận\.\.\.' : 'Hoàn thành'/);
  assert.doesNotMatch(source, /Chưa cấu hình tài khoản nhận tiền/);
});

test('POS requires a customer name and valid Vietnamese mobile number', async () => {
  const { validatePosCustomer } = await import('../src/services/posCustomer.js');
  const { validatePosCustomerDetails } = require('../../backend/legacy-express/src/pos-customer');

  assert.equal(validatePosCustomer({ customer_name: '', customer_phone: '0901234567' }).ok, false);
  assert.equal(validatePosCustomer({ customer_name: 'Nguyễn An', customer_phone: '' }).ok, false);
  assert.equal(validatePosCustomer({ customer_name: 'Nguyễn An', customer_phone: '0123456789' }).ok, false);
  assert.deepEqual(validatePosCustomer({
    customer_name: '  Nguyễn   An  ',
    customer_phone: '090 123 4567',
  }), {
    ok: true,
    name: 'Nguyễn An',
    phone: '0901234567',
    message: '',
  });
  assert.equal(validatePosCustomerDetails({ customerName: '', customerPhone: '0901234567' }).ok, false);
  assert.equal(validatePosCustomerDetails({ customerName: 'Nguyễn An', customerPhone: '0123456789' }).ok, false);
  assert.deepEqual(validatePosCustomerDetails({ customerName: ' Nguyễn  An ', customerPhone: '090 123 4567' }), {
    ok: true,
    name: 'Nguyễn An',
    phone: '0901234567',
  });
});

test('POS invoice uses one scrollable body and keeps its action footer visible', () => {
  const view = fs.readFileSync(path.resolve(__dirname, '../src/views/admin/pages/PosPage.vue'), 'utf8');
  const theme = fs.readFileSync(path.resolve(__dirname, '../src/views/admin/admin-theme.css'), 'utf8');

  assert.match(view, /class="custom-modal-box fade-in-scale pos-invoice-dialog"/);
  assert.match(view, /class="p-4 pos-invoice-body"/);
  assert.match(view, /pos-invoice-footer/);
  assert.doesNotMatch(view, /max-height:72vh/);
  assert.match(theme, /\.custom-modal-box\.pos-invoice-dialog[^}]*overflow:\s*hidden/);
  assert.match(theme, /\.pos-invoice-body[^}]*overflow-y:\s*auto/);
});

