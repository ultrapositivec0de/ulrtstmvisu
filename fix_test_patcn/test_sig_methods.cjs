const dsteem = require('@blazeapps/dsteem');

const key = dsteem.PrivateKey.fromSeed('test-seed');
const prefix = Buffer.from("ImageSigningChallenge", 'utf8');
const fileBuffer = Buffer.from("test image content 12345");
const dataToSign = Buffer.concat([prefix, fileBuffer]);

// Method 1: dsteem sha256 + key.sign
const hash1 = dsteem.cryptoUtils.sha256(dataToSign);
const sig1 = key.sign(hash1);
console.log('Method 1 (sha256 + sign):', sig1.toString());

// What if dataToSign is double sha256?
const hash2 = dsteem.cryptoUtils.doubleSha256(dataToSign);
const sig2 = key.sign(hash2);
console.log('Method 2 (doubleSha256 + sign):', sig2.toString());

// Check Signature.fromBuffer / fromHex
const sigFromHex = dsteem.Signature.fromString(sig1.toString());
console.log('sigFromHex valid:', sigFromHex.recover(hash1).toString() === key.createPublic().toString());
