const MAX_TRANSFER_CONTENT_LENGTH = 25;

function plainTransferText(value, maxLength = 50) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizePosBankConfig(value = {}) {
  const bankId = String(value.bankId ?? value.bank_id ?? "").trim();
  const bankName = String(value.bankName ?? value.bank_name ?? bankId).trim();
  const accountNo = String(value.accountNo ?? value.account_no ?? "").replace(/\s+/g, "");
  const accountName = plainTransferText(value.accountName ?? value.account_name, 50).toUpperCase();
  const configured =
    /^[a-zA-Z0-9]{2,20}$/.test(bankId) &&
    /^\d{6,19}$/.test(accountNo) &&
    accountName.length >= 5;

  return { configured, bankId, bankName, accountNo, accountName };
}

export function createPosTransferContent(orderCode) {
  const code = plainTransferText(orderCode, MAX_TRANSFER_CONTENT_LENGTH - 3);
  return plainTransferText(`SG ${code}`, MAX_TRANSFER_CONTENT_LENGTH);
}

export function buildVietQrUrl(config, amount, transferContent) {
  const bank = normalizePosBankConfig(config);
  const roundedAmount = Math.round(Number(amount));
  if (!bank.configured || !Number.isSafeInteger(roundedAmount) || roundedAmount <= 0) {
    return "";
  }

  const content = plainTransferText(transferContent, MAX_TRANSFER_CONTENT_LENGTH);
  const query = new URLSearchParams({
    amount: String(roundedAmount),
    addInfo: content,
    accountName: bank.accountName,
  });
  return `https://img.vietqr.io/image/${encodeURIComponent(bank.bankId)}-${encodeURIComponent(bank.accountNo)}-compact2.png?${query.toString()}`;
}

export function buildPosPaymentQrUrl(amount, transferContent) {
  const roundedAmount = Math.round(Number(amount));
  if (!Number.isSafeInteger(roundedAmount) || roundedAmount <= 0) return "";

  const content = plainTransferText(transferContent, MAX_TRANSFER_CONTENT_LENGTH);
  const data = [
    "SHOEGROUP POS",
    `SO TIEN ${roundedAmount} VND`,
    `NOI DUNG ${content}`,
  ].join("\n");
  const query = new URLSearchParams({ size: "320x320", data });
  return `https://api.qrserver.com/v1/create-qr-code/?${query.toString()}`;
}

