const argon2 = require("argon2");
const hash = "$argon2id$v=19$m=32768,p=1,t=3$+jH/kV6QX5lzQi9BMyo3BA$PLh2dIKmF8PZgyR0tzoh0lbOjfSBFMaKziuJHrQFG+o";
argon2.verify(hash, "admin123").then(ok => console.log("النتيجة:", ok)).catch(e => console.log("خطأ:", e.message));
