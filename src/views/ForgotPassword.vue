<template>
  <div class="forgot-page">

    <div class="forgot-card">

      <div class="logo">
        <h1>SHOE GROUP</h1>
        <p>Reset Password</p>
      </div>

      <h2>Quên mật khẩu</h2>

      <form @submit.prevent="resetPassword">

        <!-- Email -->
        <div class="form-group">
          <label>Email</label>

          <input
            type="email"
            v-model="email"
            placeholder="Nhập email đã đăng ký"
          />

          <span class="error">
            {{ emailError }}
          </span>
        </div>

        <!-- Mật khẩu mới -->
        <div class="form-group">
          <label>Mật khẩu mới</label>

          <div class="password-box">
            <input
              :type="showPassword ? 'text' : 'password'"
              v-model="newPassword"
              placeholder="Nhập mật khẩu mới"
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

        <!-- Xác nhận mật khẩu -->
        <div class="form-group">
          <label>Xác nhận mật khẩu</label>

          <div class="password-box">
            <input
              :type="
                showConfirmPassword
                  ? 'text'
                  : 'password'
              "
              v-model="confirmPassword"
              placeholder="Nhập lại mật khẩu"
            />

            <button
              type="button"
              class="toggle-btn"
              @click="
                showConfirmPassword =
                !showConfirmPassword
              "
            >
              {{ showConfirmPassword ? "👁" : "🙈" }}
            </button>
          </div> 

          <span class="error">
            {{ confirmPasswordError }}
          </span>
        </div>

        <button class="reset-btn">
          Đổi mật khẩu
        </button>

      </form>

      <div class="bottom-link">
        <RouterLink to="/login">
          Quay lại đăng nhập
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
const newPassword = ref("");
const confirmPassword = ref("");

const showPassword = ref(false);
const showConfirmPassword = ref(false);

const emailError = ref("");
const passwordError = ref("");
const confirmPasswordError = ref("");

const resetPassword = () => {

  emailError.value = "";
  passwordError.value = "";
  confirmPasswordError.value = "";

  const users =
    JSON.parse(
      localStorage.getItem("users")
    ) || [];

  const user =
    users.find(
      u =>
        u.email
          .trim()
          .toLowerCase() ===
        email.value
          .trim()
          .toLowerCase()
    );

  if (!user) {

    emailError.value =
      "Email chưa đăng ký";

    return;
  }

  const strongPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  if (
    !strongPassword.test(
      newPassword.value
    )
  ) {

    passwordError.value =
      "Ít nhất 8 ký tự, có chữ hoa, chữ thường và số";

    return;
  }

  if (
    confirmPassword.value !==
    newPassword.value
  ) {

    confirmPasswordError.value =
      "Mật khẩu không khớp";

    return;
  }

  user.password =
    newPassword.value;

  localStorage.setItem(
    "users",
    JSON.stringify(users)
  );

  alert(
    "Đổi mật khẩu thành công!"
  );

  router.push("/login");
};
</script>

<style scoped>
*{
  margin:0;
  padding:0;
  box-sizing:border-box;
}

.forgot-page{
  min-height:100vh;
  background:#f6f7fb;
  display:flex;
  justify-content:center;
  align-items:center;
  padding:20px;
}

.forgot-card{
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

.password-box input{
  padding-right:60px;
}

.toggle-btn{
  position:absolute;
  right:10px;
  top:50%;
  transform:translateY(-50%);
  border:none;
  background:none;
  cursor:pointer;
  font-size:18px;
}

.error{
  display:block;
  margin-top:5px;
  font-size:13px;
  color:red;
  min-height:18px;
}

.reset-btn{
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

.reset-btn:hover{
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

  .forgot-card{
    padding:25px;
  }

  .logo h1{
    font-size:32px;
  }

}
</style>