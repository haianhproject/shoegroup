<template>
  <div class="login-page">
    <div class="login-card">

      <div class="logo">
        <h1>SHOE GROUP</h1>
        <p>Welcome Back</p>
      </div>

      <h2>Đăng nhập</h2>

      <form @submit.prevent="login">

        <div class="form-group">
          <label>Email</label>

          <input
            type="email"
            v-model="email"
            placeholder="example@gmail.com"
            @input="validateEmail"
          />

          <span class="error">
            {{ emailError }}
          </span>
        </div>

        <div class="form-group">
          <label>Mật khẩu</label>

          <div class="password-box">
            <input
              :type="showPassword ? 'text' : 'password'"
              v-model="password"
              placeholder="Nhập mật khẩu"
              @input="validatePassword"
            />

            <button
              type="button"
              class="toggle-btn"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? "👁" : "🙈" }}
            </button>
          </div>

          <span class="error">
            {{ passwordError }}
          </span>
        </div>

        <button class="login-btn">
          Đăng nhập
        </button>

      </form>

      <div class="links">
        <RouterLink to="/forgot-password">
          Quên mật khẩu?
        </RouterLink>

        <br /><br />

        <RouterLink to="/register">
          Chưa có tài khoản? Đăng ký
        </RouterLink>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const email = ref("");
const password = ref("");

const showPassword = ref(false);

const emailError = ref("");
const passwordError = ref("");

// Tạo Admin mặc định
const users =
  JSON.parse(localStorage.getItem("users")) || [];

const adminExist = users.find(
  user => user.role === "ADMIN"
);

if (!adminExist) {

  users.push({
    id: 1,
    fullName: "Administrator",
    email: "admin@gmail.com",
    password: "Admin123",
    role: "ADMIN"
  });

  localStorage.setItem(
    "users",
    JSON.stringify(users)
  );
}

const validateEmail = () => {

  const regex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email.value) {

    emailError.value =
      "Vui lòng nhập email";

  } else if (
    !regex.test(email.value)
  ) {

    emailError.value =
      "Email không hợp lệ";

  } else {

    emailError.value = "";
  }
};

const validatePassword = () => {

  if (!password.value) {

    passwordError.value =
      "Vui lòng nhập mật khẩu";

  } else if (
    password.value.length < 8
  ) {

    passwordError.value =
      "Mật khẩu tối thiểu 8 ký tự";

  } else {

    passwordError.value = "";
  }
};

const login = () => {

  validateEmail();
  validatePassword();

  if (
    emailError.value ||
    passwordError.value
  ) {
    return;
  }

  const users =
    JSON.parse(
      localStorage.getItem("users")
    ) || [];

  const foundUser = users.find(
    user =>
      user.email.trim().toLowerCase() ===
      email.value.trim().toLowerCase() &&
      user.password === password.value
  );

  if (!foundUser) {

    passwordError.value =
      "Email hoặc mật khẩu không đúng";

    return;
  }

  localStorage.setItem(
    "currentUser",
    JSON.stringify(foundUser)
  );

  alert(
    `Xin chào ${foundUser.fullName}`
  );

  if (
    foundUser.role === "ADMIN"
  ) {

    router.push("/admin");

  } else {

    router.push("/home");
  }
};
</script>

<style scoped>
*{
  margin:0;
  padding:0;
  box-sizing:border-box;
}

.login-page{
  min-height:100vh;
  background:#f6f7fb;
  display:flex;
  justify-content:center;
  align-items:center;
  padding:20px;
}

.login-card{
  width:100%;
  max-width:500px;
  background:white;
  padding:40px;
  border-radius:25px;
  box-shadow:0 15px 40px rgba(0,0,0,.08);
}

.logo{
  text-align:center;
  margin-bottom:25px;
}

.logo h1{
  font-size:42px;
  font-weight:800;
  letter-spacing:2px;
}

.logo p{
  color:#888;
}

h2{
  text-align:center;
  margin-bottom:25px;
}

.form-group{
  margin-bottom:18px;
}

.form-group label{
  display:block;
  margin-bottom:8px;
  font-weight:600;
}

.form-group input{
  width:100%;
  height:50px;
  border:1.5px solid #ddd;
  border-radius:12px;
  padding:0 15px;
}

.password-box{
  position:relative;
}

.toggle-btn{
  position:absolute;
  right:10px;
  top:50%;
  transform:translateY(-50%);
  border:none;
  background:none;
  cursor:pointer;
}

.error{
  color:red;
  font-size:13px;
  margin-top:5px;
  display:block;
  min-height:18px;
}

.login-btn{
  width:100%;
  height:52px;
  border:none;
  border-radius:12px;
  background:black;
  color:white;
  cursor:pointer;
}

.links{
  text-align:center;
  margin-top:20px;
}

.links a{
  color:black;
  text-decoration:none;
  font-weight:700;
}
</style>