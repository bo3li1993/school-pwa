const argon2 = require('argon2');
argon2.hash('husainan@2026', { type: argon2.argon2id, memoryCost: 32768, timeCost: 3, parallelism: 1 })
  .then(h => console.log('HASH:' + h));
