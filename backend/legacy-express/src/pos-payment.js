// Mục đích: Đối chiếu Express: đọc cấu hình ngân hàng tại quầy.
function clean(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function plainAccountName(value) {
  return clean(value, 100)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50)
    .toUpperCase();
}

function getPosBankTransferConfig(env = process.env) {
  const bankId = clean(env.POS_BANK_ID, 20);
  const bankName = clean(env.POS_BANK_NAME, 100) || bankId;
  const accountNo = clean(env.POS_BANK_ACCOUNT_NO, 30).replace(/\s+/g, "");
  const accountName = plainAccountName(env.POS_BANK_ACCOUNT_NAME);
  const configured =
    /^[a-zA-Z0-9]{2,20}$/.test(bankId) &&
    /^\d{6,19}$/.test(accountNo) &&
    accountName.length >= 5;

  return {
    configured,
    bankId: configured ? bankId : "",
    bankName: configured ? bankName : "",
    accountNo: configured ? accountNo : "",
    accountName: configured ? accountName : "",
  };
}

module.exports = { getPosBankTransferConfig };

