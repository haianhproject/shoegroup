/* ============================================================
 * httpInterceptor.js - LOP TUONG THICH NGUOC (rat quan trong)
 * ------------------------------------------------------------
 * Toan bo code cu dang goi truc tiep:
 *     fetch("http://localhost:5000/api/products")
 * Sau khi backend bat phan quyen JWT, cac loi goi nay se bi 401.
 *
 * Thay vi phai sua tay hang chuc file .vue / store, module nay boc lai
 * ham fetch cua trinh duyet MOT LAN duy nhat:
 *   1. Tu dong gan header Authorization: Bearer <token> cho moi request
 *      den API cua du an.
 *   2. Tu dong doi "http://localhost:5000/api" -> VITE_API_BASE_URL
 *      (de deploy khong phai sua code).
 *   3. Khi API tra 401 -> xoa phien va dieu huong ve trang dang nhap.
 *
 * => KHONG file cu nao bi sua, moi thu chay nhu truoc, chi an toan hon.
 * ============================================================ */
import { API_BASE_URL, getToken, clearToken } from "./apiClient";

const LEGACY_BASES = [
  "http://localhost:5000/api",
  "http://127.0.0.1:5000/api",
];

let installed = false;

export function installHttpInterceptor({ onUnauthorized } = {}) {
  if (installed || typeof window === "undefined" || !window.fetch) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    try {
      let url =
        typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : String(input);

      // 1) Doi dia chi may chu cu -> dia chi trong bien moi truong
      for (const legacy of LEGACY_BASES) {
        if (url.startsWith(legacy)) {
          url = API_BASE_URL + url.slice(legacy.length);
          break;
        }
      }

      const isProjectApi =
        url.startsWith(API_BASE_URL) ||
        LEGACY_BASES.some((b) => url.startsWith(b)) ||
        url.startsWith("/api/");

      if (!isProjectApi) return originalFetch(input, init);

      // 2) Gan token
      const token = getToken();
      const headers = new Headers(
        init.headers || (input instanceof Request ? input.headers : undefined),
      );
      if (token && !headers.has("Authorization"))
        headers.set("Authorization", `Bearer ${token}`);

      const res = await originalFetch(url, { ...init, headers });

      // 3) Phien het han
      if (res.status === 401) {
        clearToken();
        if (typeof onUnauthorized === "function") onUnauthorized();
      }
      return res;
    } catch (err) {
      // Neu co bat ky su co trong lop boc -> fallback ve fetch goc
      console.warn("[httpInterceptor] fallback:", err?.message);
      return originalFetch(input, init);
    }
  };
}

export default installHttpInterceptor;
