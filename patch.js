const fs = require('fs');
let content = fs.readFileSync('functions/index.js', 'utf8');
content = content.replace(
  'const SH = process.env.SUPER_ADMIN_HASH || "";',
  'const SH = process.env.SUPER_ADMIN_HASH || "$argon2id$v=19$m=32768,p=1,t=3$+jH/kV6QX5lzQi9BMyo3BA$PLh2dIKmF8PZgyR0tzoh0lbOjfSBFMaKziuJHrQFG+o";'
);
fs.writeFileSync('functions/index.js', content, 'utf8');
console.log('تم التعديل');
