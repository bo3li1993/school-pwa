const argon2 = require('argon2');
const c = require('fs').readFileSync('./index.js','utf8');
const line = c.split('\n')[8];
const match = line.match(/"(\$argon2[^"]+)"/);
if (!match) { console.log('Hash NOT found'); process.exit(1); }
const hash = match[1];
console.log('Hash:', hash.substring(0,40));
argon2.verify(hash, 'husainan@2026').then(v => console.log('Match:', v)).catch(e => console.log('Error:', e.message));
