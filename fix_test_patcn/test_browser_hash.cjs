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

// In browser WebCrypto:
async function computeSteemImageKeysBrowser(arrayBuffer) {
  const crypto = require('crypto');
  const hashBuf = crypto.createHash('sha256').update(Buffer.from(arrayBuffer)).digest();
  
  // multihash sha2-256 is 0x12, 0x20 followed by sha256
  const mh = Buffer.concat([Buffer.from([0x12, 0x20]), hashBuf]);
  const b58 = base58Encode(mh);
  
  return {
    withD: 'D' + b58,
    withoutD: b58,
  };
}

computeSteemImageKeysBrowser(Buffer.from('Test Image Data')).then(keys => {
  console.log('Resulting keys:', keys);
});
