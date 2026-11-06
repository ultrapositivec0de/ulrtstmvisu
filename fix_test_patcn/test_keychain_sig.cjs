const crypto = require('crypto');

const prefix = Buffer.from('ImageSigningChallenge', 'utf8');
const fileBuffer = Buffer.from('Sample Image Binary Data 12345');
const dataToSign = Buffer.concat([prefix, fileBuffer]);

const shaOriginal = crypto.createHash('sha256').update(dataToSign).digest('hex');

// Method 1: JSON stringify (CURRENT WRONG CODE)
const jsonStr = JSON.stringify(dataToSign);
const shaJson = crypto.createHash('sha256').update(jsonStr, 'utf8').digest('hex');

// Method 2: latin1 / binary string
const latinStr = dataToSign.toString('latin1');
const shaLatin = crypto.createHash('sha256').update(latinStr, 'latin1').digest('hex');

console.log('Original Buffer SHA256:', shaOriginal);
console.log('JSON stringify SHA256: ', shaJson, 'Matches?', shaOriginal === shaJson);
console.log('Latin1 string SHA256:  ', shaLatin, 'Matches?', shaOriginal === shaLatin);
