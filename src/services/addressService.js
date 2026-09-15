import { api } from "./apiClient";

const VIETNAM_DIVISION_API = "https://provinces.open-api.vn/api/v2";

const withTimeout = async (url, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Khong tai duoc du lieu dia gioi (${response.status}).`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

export const normalizeAddress = (raw = {}) => ({
  id: Number(raw.id ?? raw.AddressID),
  recipient: raw.recipient ?? raw.RecipientName ?? "",
  phone: raw.phone ?? raw.Phone ?? "",
  province: raw.province ?? raw.provinceName ?? raw.Province ?? "",
  provinceName: raw.provinceName ?? raw.province ?? raw.Province ?? "",
  district: raw.district ?? raw.District ?? "",
  ward: raw.ward ?? raw.communeName ?? raw.Ward ?? "",
  communeName: raw.communeName ?? raw.ward ?? raw.Ward ?? "",
  line: raw.line ?? raw.addressLine ?? raw.AddressLine ?? "",
  fullAddress: raw.fullAddress ?? raw.FullAddress ?? "",
  isDefault: Boolean(raw.isDefault ?? raw.IsDefault),
  isVerified: Boolean(raw.isVerified ?? raw.IsVerified),
});

export const formatAddress = (address = {}) => {
  if (!address) return "";
  if (address.fullAddress) return address.fullAddress;
  return [
    address.line,
    address.communeName || address.ward,
    address.district,
    address.provinceName || address.province,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
};

export const addressBookApi = {
  async list() {
    const rows = await api.get("/addresses");
    return Array.isArray(rows) ? rows.map(normalizeAddress) : [];
  },
  async create(payload) {
    return normalizeAddress(await api.post("/addresses", payload));
  },
  async update(id, payload) {
    return normalizeAddress(await api.put(`/addresses/${id}`, payload));
  },
  async remove(id) {
    return api.delete(`/addresses/${id}`);
  },
  async setDefault(id) {
    return normalizeAddress(
      await api.put(`/addresses/${id}`, { isDefault: true }),
    );
  },
};

export const vietnamAddressApi = {
  async provinces() {
    const rows = await withTimeout(`${VIETNAM_DIVISION_API}/p/`);
    return Array.isArray(rows) ? rows : [];
  },
  async wards(provinceCode) {
    if (!provinceCode) return [];
    const rows = await withTimeout(
      `${VIETNAM_DIVISION_API}/w/?province=${encodeURIComponent(provinceCode)}`,
    );
    return Array.isArray(rows) ? rows : [];
  },
};
