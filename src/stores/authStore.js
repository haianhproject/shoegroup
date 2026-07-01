import { computed, reactive } from "vue";

const STORAGE_KEY = "shoegroup_current_user";

const loadCurrentUser = () => {
  if (typeof localStorage === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
};

const saveCurrentUser = (user) => {
  if (typeof localStorage === "undefined") return;
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
};

export const authState = reactive({
  currentUser: loadCurrentUser(),
});

export const currentUser = computed(() => authState.currentUser);

export const isAuthenticated = computed(() => {
  return !!authState.currentUser;
});

export const getCurrentUser = () => {
  return authState.currentUser;
};

// Gọi API Login
export const login = async ({ email, password }) => {
  try {
    const res = await fetch("http://localhost:5000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.success) {
      authState.currentUser = data.user;
      saveCurrentUser(data.user);
      return { ok: true, message: "Đăng nhập thành công.", user: data.user };
    } else {
      return { ok: false, message: data.message || "Đăng nhập thất bại." };
    }
  } catch (error) {
    return { ok: false, message: "Không thể kết nối đến máy chủ." };
  }
};

// Gọi API Register
export const register = async ({ fullName, email, password }) => {
  try {
    const res = await fetch("http://localhost:5000/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password }),
    });

    const data = await res.json();

    if (data.success) {
      // Đăng ký xong cho đăng nhập luôn
      authState.currentUser = data.user;
      saveCurrentUser(data.user);
      return { ok: true, message: "Đăng ký thành công.", user: data.user };
    } else {
      return { ok: false, message: data.message || "Đăng ký thất bại." };
    }
  } catch (error) {
    return { ok: false, message: "Không thể kết nối đến máy chủ." };
  }
};

export const logout = () => {
  authState.currentUser = null;
  saveCurrentUser(null);
};
export const updateProfile = async (data) => {
  try {
    const res = await fetch(`http://localhost:5000/api/accounts/${data.id}`, {
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
      // Cập nhật lại phiên đăng nhập hiện tại trên trình duyệt
      authState.currentUser.full_name = data.full_name;
      authState.currentUser.phone = data.phone;
      authState.currentUser.address = data.address;
      saveCurrentUser(authState.currentUser);
      return { ok: true };
    }
    return { ok: false, message: "Cập nhật thất bại." };
  } catch (error) {
    return { ok: false, message: "Lỗi kết nối máy chủ." };
  }
};
