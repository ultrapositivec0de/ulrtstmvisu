const crypto = require('crypto');

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(buffer) {
  const digits = [0];
  for (let i = 0; i < buffer.length; i++) {
    for (let j = 0; j < digits.length; j++) digits[j] <<= 8;
    digits[0] += buffer[i];
    let carry = 0;
    for (let j = 0; j < digits.length; ++j) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  for (let i = 0; buffer[i] === 0 && i < buffer.length - 1; i++) digits.push(0);
  return digits.reverse().map(digit => ALPHABET[digit]).join('');
}

function computeSteemImageKey(buffer) {
  const sha = crypto.createHash('sha256').update(buffer).digest();
  // multihash prefix for sha2-256 is 0x12 (code), 0x20 (length 32)
  const mh = Buffer.concat([Buffer.from([0x12, 0x20]), sha]);
  return 'D' + base58Encode(mh);
}

const testBuf = Buffer.from('Testing 1 2 3');
const key = computeSteemImageKey(testBuf);
console.log('Computed Key:', key);
console.log('Starts with DQm:', key.startsWith('DQm'));
console.log('Length:', key.length);
