import { computed, reactive } from "vue";
import { users } from "../data/mockData";

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

export const login = ({ email, password }) => {
  const loginText = String(email || "")
    .trim()
    .toLowerCase();
  const passwordText = String(password || "").trim();

  const foundUser = users.find((user) => {
    return (
      (user.email.toLowerCase() === loginText ||
        user.username.toLowerCase() === loginText) &&
      user.password === passwordText
    );
  });

  if (!foundUser) {
    return {
      ok: false,
      message: "Email hoặc mật khẩu không đúng.",
    };
  }

  const safeUser = {
    id_user: foundUser.id_user,
    username: foundUser.username,
    full_name: foundUser.full_name,
    email: foundUser.email,
    phone: foundUser.phone,
    address: foundUser.address,
    role: foundUser.role,
  };

  authState.currentUser = safeUser;
  saveCurrentUser(safeUser);

  return {
    ok: true,
    message: "Đăng nhập thành công.",
    user: safeUser,
  };
};

export const logout = () => {
  authState.currentUser = null;
  saveCurrentUser(null);
};
