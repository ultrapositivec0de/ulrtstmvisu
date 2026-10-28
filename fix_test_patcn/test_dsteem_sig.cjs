const dsteem = require('@blazeapps/dsteem');

// Generate a dummy private key
const key = dsteem.PrivateKey.fromSeed('test-seed');
const prefix = Buffer.from("ImageSigningChallenge", 'utf8');
const fileBuffer = Buffer.from("dummy-image-bytes");
const dataToSign = Buffer.concat([prefix, fileBuffer]);

const hash = dsteem.cryptoUtils.sha256(dataToSign);
const sig = key.sign(hash);

console.log('sig type:', typeof sig);
console.log('sig.toString():', sig.toString());
console.log('sig length:', sig.toString().length);
console.log('sig toHex:', typeof sig.toHex === 'function' ? sig.toHex() : 'no toHex');
console.log('public key:', key.createPublic().toString());

// Check signature recovery:
const recovered = sig.recover(hash);
console.log('recovered matches public key:', recovered.toString() === key.createPublic().toString());
