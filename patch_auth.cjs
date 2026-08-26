const fs = require('fs');

const files = [
  'src/views/LoginView.vue',
  'src/views/RegisterView.vue',
  'src/views/ForgotPasswordView.vue',
  'src/views/ResetPasswordView.vue'
];

files.forEach(f => {
  let code = fs.readFileSync(f, 'utf8');
  // Change logo group color
  code = code.replace(
    /\.auth-logo-text \.logo-group \{ color: #D4001A; \}/g,
    '.auth-logo-text .logo-group { color: #0A0A0A; }'
  );
  // Change hover colors from #D4001A to #666
  code = code.replace(/color: #D4001A;/g, 'color: #666;');
  fs.writeFileSync(f, code);
});
console.log('Fixed red colors in auth views!');
