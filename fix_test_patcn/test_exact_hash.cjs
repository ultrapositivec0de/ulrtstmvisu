const crypto = require('crypto');

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

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
  return digits.reverse().map(digit => BASE58_ALPHABET[digit]).join('');
}

function computeSteemHash(fileBuffer) {
  const imageHash = crypto.createHash('sha256')
    .update('ImageSigningChallenge')
    .update(fileBuffer)
    .digest();

  const multihash = Buffer.concat([Buffer.from([0x12, 0x20]), imageHash]);
  const contentHash = 'D' + base58Encode(multihash);
  return contentHash;
}

const sampleData = Buffer.from('Duck-ai-image-sample');
const hash = computeSteemHash(sampleData);
console.log('Sample computed hash:', hash);
console.log('Length:', hash.length, 'Starts with DQm:', hash.startsWith('DQm'));
