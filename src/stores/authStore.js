// src/stores/authStore.js
import { computed, reactive } from "vue";

const STORAGE_KEY = "shoegroup_current_user";

// === COOKIE HELPERS ===
const getCookie = (name) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const setCookie = (name, value, days = 7) => {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Strict`;
};

const deleteCookie = (name) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

// === LOAD USER FROM STORAGE ===
const loadCurrentUser = () => {
  if (typeof localStorage === "undefined") return null;
  
  try {
    // Ưu tiên 1: Cookie
    const cookieUser = getCookie('user_session');
    if (cookieUser) {
      try {
        return JSON.parse(decodeURIComponent(cookieUser));
      } catch (e) {}
    }

    // Ưu tiên 2: sessionStorage (cùng tab)
    const sessionUser = sessionStorage.getItem('user_session');
    if (sessionUser) {
      try {
        return JSON.parse(sessionUser);
      } catch (e) {}
    }

    // Ưu tiên 3: localStorage (ghi nhớ)
    const localUser = localStorage.getItem('user_session');
    if (localUser) {
      try {
        return JSON.parse(localUser);
      } catch (e) {}
    }

    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
};

const saveCurrentUser = (user, remember = false) => {
  if (typeof localStorage === "undefined") return;
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('user_session');
    sessionStorage.removeItem('user_session');
    deleteCookie('user_session');
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  
  if (remember) {
    localStorage.setItem('user_session', JSON.stringify(user));
    setCookie('user_session', encodeURIComponent(JSON.stringify(user)), 7);
  } else {
    sessionStorage.setItem('user_session', JSON.stringify(user));
    deleteCookie('user_session');
  }
};

// === STATE ===
export const authState = reactive({
  currentUser: loadCurrentUser(),
});

export const currentUser = computed(() => authState.currentUser);
export const isAuthenticated = computed(() => !!authState.currentUser);
export const getCurrentUser = () => authState.currentUser;

// === API CALLS ===
const API_BASE = 'http://localhost:5000/api';

// LOGIN
export const login = async ({ email, password, remember = false }) => {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // De trinh duyet luu cookie httpOnly access_token server tra ve
      body: JSON.stringify({ email, password, remember }),
    });

    const data = await res.json();

    if (data.success) {
      authState.currentUser = data.user;
      saveCurrentUser(data.user, remember);
      
      if (remember) {
        localStorage.setItem('remember_email', email);
      } else {
        localStorage.removeItem('remember_email');
      }
      
      return { ok: true, message: "Đăng nhập thành công.", user: data.user };
    } else {
      return { ok: false, message: data.message || "Đăng nhập thất bại." };
    }
  } catch (error) {
    return { ok: false, message: "Không thể kết nối đến máy chủ." };
  }
};

// REGISTER
export const register = async ({ fullName, email, password }) => {
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fullName, email, password }),
    });

    const data = await res.json();

    if (data.success) {
      authState.currentUser = data.user;
      saveCurrentUser(data.user, false);
      return { ok: true, message: "Đăng ký thành công.", user: data.user };
    } else {
      return { ok: false, message: data.message || "Đăng ký thất bại." };
    }
  } catch (error) {
    return { ok: false, message: "Không thể kết nối đến máy chủ." };
  }
};

// LOGOUT
export const logout = () => {
  authState.currentUser = null;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('user_session');
  localStorage.removeItem('remember_email');
  localStorage.removeItem('last_activity');
  sessionStorage.removeItem('user_session');
  deleteCookie('user_session');
  
  // Gọi API logout để xóa cookie httpOnly phía server
  fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
};

// UPDATE PROFILE
export const updateProfile = async (data) => {
  try {
    const res = await fetch(`${API_BASE}/accounts/${data.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: data.email,
        name: data.full_name,
        phone: data.phone,
        address: data.address,
        role_id: data.role_id || 2,
      }),
    });

    if (res.ok) {
      const result = await res.json();
      if (result.success) {
        authState.currentUser = { ...authState.currentUser, ...result.user };
        saveCurrentUser(authState.currentUser, !!localStorage.getItem('user_session'));
        return { ok: true };
      }
    }
    return { ok: false, message: "Cập nhật thất bại." };
  } catch (error) {
    return { ok: false, message: "Lỗi kết nối máy chủ." };
  }
};

// CHANGE PASSWORD
export const changePassword = async ({ email, oldPassword, newPassword }) => {
  try {
    const res = await fetch(`${API_BASE}/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, oldPassword, newPassword }),
    });

    const data = await res.json();

    if (data.success) {
      return { ok: true, message: "Đổi mật khẩu thành công." };
    } else {
      return { ok: false, message: data.message || "Đổi mật khẩu thất bại." };
    }
  } catch (error) {
    return { ok: false, message: "Không thể kết nối đến máy chủ." };
  }
};

// FORGOT PASSWORD
export const forgotPassword = async ({ email }) => {
  try {
    const res = await fetch(`${API_BASE}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (data.success) {
      return { 
        ok: true, 
        message: "Link đặt lại mật khẩu đã được gửi đến email của bạn." 
      };
    } else {
      return { ok: false, message: data.message || "Email không tồn tại trong hệ thống." };
    }
  } catch (error) {
    return { ok: false, message: "Không thể kết nối đến máy chủ." };
  }
};

// RESET PASSWORD
export const resetPassword = async ({ token, newPassword }) => {
  try {
    const res = await fetch(`${API_BASE}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });

    const data = await res.json();

    if (data.success) {
      return { ok: true, message: "Đặt lại mật khẩu thành công." };
    } else {
      return { ok: false, message: data.message || "Token không hợp lệ hoặc đã hết hạn." };
    }
  } catch (error) {
    return { ok: false, message: "Không thể kết nối đến máy chủ." };
  }
};

// CHECK SESSION (nhanh, chi doc du lieu cuc bo - dung de hien UI ngay khi mo app)
export const checkSession = () => {
  const user = loadCurrentUser();
  if (user) {
    authState.currentUser = user;
  }
  return !!user;
};

// XAC THUC PHIEN VOI SERVER (dua tren cookie httpOnly access_token).
// Day la lop bao mat thuc su: cookie nay JS khong doc/sua duoc va CHI ton tai
// o dung trinh duyet da dang nhap, nen:
// - Cung mot trinh duyet: phien van con -> van dang nhap sau khi tai lai trang.
// - Trinh duyet/thiet bi khac (vd Chrome -> Cốc Cốc): khong co cookie nay
//   -> server tra ve 401 -> ung dung tu dong dang xuat, khong con "lo" tai khoan.
// Nen goi ham nay 1 lan luc app khoi dong (xem App.vue).
export const verifySessionWithServer = async () => {
  try {
    const res = await fetch(`${API_BASE}/session`, {
      method: "GET",
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        authState.currentUser = data.user;
        // Dong bo lai du lieu cuc bo theo thong tin moi nhat tu server
        const remembered = !!localStorage.getItem("user_session");
        saveCurrentUser(data.user, remembered);
        return true;
      }
    }

    // Khong co cookie hop le (vd dang o trinh duyet khac, hoac cookie het han)
    // -> dam bao khong con du lieu dang nhap "gia" luu cuc bo.
    authState.currentUser = null;
    saveCurrentUser(null);
    return false;
  } catch (error) {
    // Loi ket noi (server chua chay...): giu nguyen trang thai cuc bo hien tai
    // thay vi ep dang xuat, de khong lam gian doan trai nghiem khi mat mang tam thoi.
    return isAuthenticated.value;
  }
};