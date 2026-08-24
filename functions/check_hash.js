const fs = require('fs');
const argon2 = require('argon2');
const c = fs.readFileSync('./index.js', 'utf8');
const line = c.split('\n')[8];
console.log('Line:', line.substring(0,100));
const match = line.match(/"(\$argon2[^"]+)"/);
if (!match) { console.log('Hash NOT found in line'); process.exit(1); }
const hash = match[1];
console.log('Hash found:', hash.substring(0,30)+'...');
argon2.verify(hash, 'lhdakyg').then(v => console.log('Password match:', v)).catch(e => console.log('Error:', e.message));
