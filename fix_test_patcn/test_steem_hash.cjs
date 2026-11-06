const crypto = require('crypto');

// Let's test standard multihash base58 vs steem hash
// A standard base58 alphabet:
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function toBase58(buffer) {
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

// IPFS unixfs sha256 or raw sha256 multihash:
function getMultihash(buffer) {
  const hash = crypto.createHash('sha256').update(buffer).digest();
  // multihash prefix 0x12 (sha2-256), 0x20 (32 bytes length)
  const multihashBuffer = Buffer.concat([Buffer.from([0x12, 0x20]), hash]);
  return toBase58(multihashBuffer);
}

// Let's test with sample text
const sample = Buffer.from("Hello Steem world!");
const ipfsHash = getMultihash(sample);
console.log('Sample IPFS hash:', ipfsHash);
console.log('Sample with D prefix:', 'D' + ipfsHash);
