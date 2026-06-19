<template>
  <div class="register-page">

    <div class="register-card">

      <div class="logo">
        <h1>SHOE GROUP</h1>
        <p>Create Your Account</p>
      </div>

      <h2>Đăng ký tài khoản</h2>

      <form @submit.prevent="handleRegister">

        <!-- Họ tên -->
        <div class="form-group">
          <label>Họ và tên</label>

          <input
            type="text"
            v-model="fullName"
            placeholder="Nhập họ tên"
            @input="validateName"
          />

          <span class="error">
            {{ nameError }}
          </span>
        </div>

        <!-- Email -->
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

        <!-- Password -->
        <div class="form-group">
          <label>Mật khẩu</label>

          <div class="password-box">
            <input
              :type="showPassword ? 'text' : 'password'"
              v-model="password"
              placeholder="Ít nhất 8 ký tự"
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

        <!-- Confirm Password -->
        <div class="form-group">
          <label>Xác nhận mật khẩu</label>

          <div class="password-box">
            <input
              :type="showConfirmPassword ? 'text' : 'password'"
              v-model="confirmPassword"
              placeholder="Nhập lại mật khẩu"
              @input="validateConfirmPassword"
            />

            <button
              type="button"
              class="toggle-btn"
              @click="
                showConfirmPassword =
                !showConfirmPassword
              "
            >
              {{ showPassword ? "👁" : "🙈" }}
            </button>
          </div>

          <span class="error">
            {{ confirmPasswordError }}
          </span>
        </div>

        <button class="register-btn">
          Đăng ký
        </button>

      </form>

      <div class="bottom-link">
        Đã có tài khoản?

        <RouterLink to="/login">
          Đăng nhập ngay
        </RouterLink>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const fullName = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");

const showPassword = ref(false);
const showConfirmPassword = ref(false);

const nameError = ref("");
const emailError = ref("");
const passwordError = ref("");
const confirmPasswordError = ref("");

const validateName = () => {

  if (!fullName.value.trim()) {

    nameError.value =
      "Vui lòng nhập họ tên";

  } else if (
    fullName.value.trim().length < 3
  ) {

    nameError.value =
      "Họ tên tối thiểu 3 ký tự";

  } else {

    nameError.value = "";
  }
};

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

  const strongPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  if (!password.value) {

    passwordError.value =
      "Vui lòng nhập mật khẩu";

  } else if (
    !strongPassword.test(
      password.value
    )
  ) {

    passwordError.value =
      "Ít nhất 8 ký tự, có chữ hoa, chữ thường và số";

  } else {

    passwordError.value = "";
  }
};

const validateConfirmPassword = () => {

  if (!confirmPassword.value) {

    confirmPasswordError.value =
      "Vui lòng xác nhận mật khẩu";

  } else if (
    confirmPassword.value !==
    password.value
  ) {

    confirmPasswordError.value =
      "Mật khẩu không khớp";

  } else {

    confirmPasswordError.value = "";
  }
};

const handleRegister = () => {

  validateName();
  validateEmail();
  validatePassword();
  validateConfirmPassword();

  if (
    nameError.value ||
    emailError.value ||
    passwordError.value ||
    confirmPasswordError.value
  ) {
    return;
  }

  const users =
    JSON.parse(
      localStorage.getItem("users")
    ) || [];

  const existedUser = users.find(
    user =>
      user.email
        .trim()
        .toLowerCase() ===
      email.value
        .trim()
        .toLowerCase()
  );

  if (existedUser) {

    emailError.value =
      "Email đã tồn tại";

    return;
  }

  const newUser = {
    id: Date.now(),
    fullName: fullName.value,
    email: email.value,
    password: password.value,
    role: "USER"
  };

  users.push(newUser);

  localStorage.setItem(
    "users",
    JSON.stringify(users)
  );

  alert(
    "Đăng ký thành công!"
  );

  fullName.value = "";
  email.value = "";
  password.value = "";
  confirmPassword.value = "";

  router.push("/login");
};
</script>

<style scoped>
*{
  margin:0;
  padding:0;
  box-sizing:border-box;
}

.register-page{
  min-height:100vh;
  background:#f6f7fb;
  display:flex;
  justify-content:center;
  align-items:center;
  padding:20px;
}

.register-card{
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
  font-size:15px;
}

.form-group input:focus{
  outline:none;
  border-color:black;
  box-shadow:0 0 0 4px rgba(0,0,0,.08);
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
  font-weight:600;
}

.error{
  display:block;
  margin-top:5px;
  font-size:13px;
  color:red;
  min-height:18px;
}

.register-btn{
  width:100%;
  height:52px;
  border:none;
  border-radius:12px;
  background:black;
  color:white;
  font-size:16px;
  font-weight:600;
  cursor:pointer;
  transition:.3s;
}

.register-btn:hover{
  background:#222;
  transform:translateY(-2px);
}

.bottom-link{
  text-align:center;
  margin-top:20px;
}

.bottom-link a{
  color:black;
  font-weight:700;
  text-decoration:none;
}

.bottom-link a:hover{
  text-decoration:underline;
}

@media(max-width:768px){

  .register-card{
    padding:25px;
  }

  .logo h1{
    font-size:32px;
  }

}
</style>