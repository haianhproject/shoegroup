const fs = require('fs');
let code = fs.readFileSync('src/views/admin/adminStore.js', 'utf8');

code = code.replace(
  'return { key: "COD", code: "Thu h?", cls: "bg-dark text-white" };',
  'return { key: "COD", code: "Thu h?", cls: "bg-light text-dark border" };'
);
code = code.replace(
  'return { key: "BANK_TRANSFER", code: "Chuy?n kho?n", cls: "bg-secondary-subtle text-dark" };',
  'return { key: "BANK_TRANSFER", code: "Chuy?n kho?n", cls: "bg-light text-dark border" };'
);
code = code.replace(
  'return { label: "Hoàn ti?n", cls: "bg-secondary-subtle text-dark" };',
  'return { label: "Hoàn ti?n", cls: "bg-light text-dark border" };'
);
code = code.replace(
  'return { label: "Khách báo dã chuy?n", cls: "bg-dark text-white" };',
  'return { label: "Khách báo dã chuy?n", cls: "bg-light text-dark border" };'
);

code = code.replace(
  /cls:\s*"bg-secondary-subtle text-dark"/g,
  'cls: "bg-light text-dark border"'
);

fs.writeFileSync('src/views/admin/adminStore.js', code);
console.log('Done!');
