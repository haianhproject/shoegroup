import { computed, reactive } from "vue";
/* [TOI UU] Lay dia chi API tu .env + luu token JWT */
import { API_BASE_URL, api, setToken, clearToken } from "../services/apiClient";

/* =====================================================================
   authStore - có cơ chế bảo mật cookie / phiên theo trình duyệt
   -------------------------------------------------------------------
   Yêu cầu: "cùng trình duyệt sẽ lưu tài khoản, khác trình duyệt
   (Chrome -> Cốc Cốc) sẽ KHÔNG lưu tài khoản".

   Cách làm: phiên đăng nhập được "gắn" (bind) vào một chữký
   trình duyệt (browser signature) sinh ra từ userAgent + platform +
   ngôn ngữ... Mỗi trình duyệt có localStorage/cookie riêng nên
   dữ liệu không bao giờ chia sẻ sang trình duyệt khác; ngoài ra ta
   còn kiểm tra chữ ký để từ chối phiên bị sao chép thủ công.
   ===================================================================== */

const STORAGE_KEY = "shoegroup_current_user";
const SIG_COOKIE = "sg_bsig";
const SESSION_COOKIE = "sg_session";

/* ---------- Cookie helpers ---------- */
const setCookie = (name, value, days = 30) => {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  // SameSite=Lax + path=/ : chỉ gửi trong cùng trình duyệt / cùng site
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};
const getCookie = (name) => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
};
const deleteCookie = (name) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

/* ---------- Browser signature ---------- */
const computeBrowserSignature = () => {
  if (typeof navigator === "undefined") return "srv";
  const raw = [
    navigator.userAgent,
    navigator.platform,
    navigator.language,
    navigator.hardwareConcurrency,
    (navigator.vendor || ""),
  ].join("|");
  // Hash 32-bit đơn giản
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  }
  return "b" + (h >>> 0).toString(36);
};

const currentSignature = computeBrowserSignature();

/* ---------- Load session (chỉ khi chữ ký trùng) ---------- */
const loadCurrentUser = () => {
  if (typeof localStorage === "undefined") return null;

  const savedSig = getCookie(SIG_COOKIE);
  const hasSession = getCookie(SESSION_COOKIE);

  // Nếu chữ ký trình duyệt không khớp (ví dụ dữ liệu bị chuyển sang
  // trình duyệt khác) thì không khôi phục phiên đăng nhập.
  if (!savedSig || !hasSession || savedSig !== currentSignature) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }

  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
};

const saveCurrentUser = (user) => {
  // [TOI UU] Dong bo token JWT voi phien dang nhap
  try {
    if (user && user.token) setToken(user.token);
    if (!user) clearToken();
  } catch (e) { /* bo qua */ }
  if (typeof localStorage === "undefined") return;
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
    deleteCookie(SESSION_COOKIE);
    deleteCookie(SIG_COOKIE);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  // Gắn phiên vào đúng trình duyệt hiện tại
  setCookie(SIG_COOKIE, currentSignature, 30);
  setCookie(SESSION_COOKIE, "1", 30);
};

export const authState = reactive({
  currentUser: loadCurrentUser(),
});

export const currentUser = computed(() => authState.currentUser);
export const isAuthenticated = computed(() => !!authState.currentUser);
export const getCurrentUser = () => authState.currentUser;

export const login = async ({ email, password }) => {
  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.success) {
      authState.currentUser = data.user;
      saveCurrentUser(data.user);
      return { ok: true, message: "\u0110\u0103ng nh\u1eadp th\u00e0nh c\u00f4ng.", user: data.user };
    }
    return { ok: false, message: data.message || "\u0110\u0103ng nh\u1eadp th\u1ea5t b\u1ea1i." };
  } catch {
    return { ok: false, message: "Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i \u0111\u1ebfn m\u00e1y ch\u1ee7." };
  }
};

export const register = async ({ fullName, email, password }) => {
  try {
    const res = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password }),
    });
    const data = await res.json();
    if (data.success) {
      authState.currentUser = data.user;
      saveCurrentUser(data.user);
      return { ok: true, message: "\u0110\u0103ng k\u00fd th\u00e0nh c\u00f4ng.", user: data.user };
    }
    return { ok: false, message: data.message || "\u0110\u0103ng k\u00fd th\u1ea5t b\u1ea1i." };
  } catch {
    return { ok: false, message: "Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i \u0111\u1ebfn m\u00e1y ch\u1ee7." };
  }
};

export const logout = () => {
  authState.currentUser = null;
  saveCurrentUser(null);
};

export const updateProfile = async (data) => {
  try {
    if (!data?.id) return { ok: false, message: "Khong xac dinh duoc tai khoan." };
    // Dung api client de tu gan JWT. Khong gui role_id tu man hinh khach;
    // backend chan thay doi quyen va truoc day khien luu ho so bi 403.
    await api.put(`/accounts/${data.id}`, {
      username: data.email,
      name: data.full_name,
      phone: data.phone,
      ...(data.address !== undefined ? { address: data.address } : {}),
    });
    authState.currentUser.full_name = data.full_name;
    authState.currentUser.phone = data.phone;
    if (data.address !== undefined) authState.currentUser.address = data.address;
    saveCurrentUser(authState.currentUser);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error?.message || "Loi ket noi may chu." };
  }
};

/* Yêu cầu đặt lại mật khẩu (gửi email) */
export const requestPasswordReset = async (email) => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    return { ok: !!data.success, message: data.message };
  } catch {
    return { ok: false, message: "Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i \u0111\u1ebfn m\u00e1y ch\u1ee7." };
  }
};

/* Đặt lại mật khẩu bằng token nhận từ email */
export const resetPassword = async ({ token, newPassword }) => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    const data = await res.json();
    return {
      ok: !!data.success,
      message:
        data.message ||
        (data.success
          ? "Đặt lại mật khẩu thành công."
          : "Token không hợp lệ hoặc đã hết hạn."),
    };
  } catch {
    return { ok: false, message: "Không thể kết nối đến máy chủ." };
  }
};
