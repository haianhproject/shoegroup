/* ============================================================
 * apiClient.js - Lop goi API dung chung cho toan bo frontend
 * ------------------------------------------------------------
 * - Dia chi may chu doc tu bien moi truong VITE_API_BASE_URL
 *   (khong hard-code http://localhost:5000 nua).
 * - Tu dong gan token JWT vao header Authorization.
 * - Tu dong dang xuat khi token het han (401).
 *
 * Cach dung (code moi nen dung cai nay):
 *   import { api } from "@/services/apiClient";
 *   const products = await api.get("/products?page=1&limit=12");
 *   await api.post("/orders", payload);
 *
 * Code cu dung fetch("http://localhost:5000/api/...") VAN CHAY BINH THUONG
 * nho lop "httpInterceptor.js" (tu dong gan token + doi base URL).
 * ============================================================ */

export const API_BASE_URL = (
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const TOKEN_KEY = "shoegroup_token";
const USER_KEY = "shoegroup_current_user";

export const getToken = () => {
  try {
    const direct = localStorage.getItem(TOKEN_KEY);
    if (direct) return direct;
    // Tuong thich: token cu duoc luu ben trong object user
    const user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    return user?.token || null;
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

export const clearToken = () => setToken(null);

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(method, path, body, options = {}) {
  const url = /^https?:\/\//i.test(path)
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = { ...(options.headers || {}) };
  if (body !== undefined && !(body instanceof FormData))
    headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
    signal: options.signal,
  });

  if (res.status === 401) {
    clearToken();
    if (typeof onUnauthorized === "function") onUnauthorized();
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) ||
      `Loi ${res.status}: khong goi duoc API`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (path, options) => request("GET", path, undefined, options),
  post: (path, body, options) => request("POST", path, body ?? {}, options),
  put: (path, body, options) => request("PUT", path, body ?? {}, options),
  patch: (path, body, options) => request("PATCH", path, body ?? {}, options),
  delete: (path, options) => request("DELETE", path, undefined, options),
};

/* ---------- Cac API moi (nhanh hon, co phan trang) ---------- */
export const productsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
    ).toString();
    return api.get(`/v2/products${q ? `?${q}` : ""}`);
  },
  featured: (limit = 8) => api.get(`/v2/products/featured?limit=${limit}`),
};

export const ordersApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
    ).toString();
    return api.get(`/v2/orders${q ? `?${q}` : ""}`);
  },
};

export const dashboardApi = {
  summary: () => api.get("/v2/dashboard/summary"),
};

export default api;
