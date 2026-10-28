const dsteem = require('@blazeapps/dsteem');

const key = dsteem.PrivateKey.fromSeed('test-seed-12345');
const prefix = Buffer.from("ImageSigningChallenge", 'utf8');

for (let i = 0; i < 20; i++) {
  const fileBuffer = Buffer.from(`dummy image content ${i} ${Math.random()}`);
  const dataToSign = Buffer.concat([prefix, fileBuffer]);
  const hash = dsteem.cryptoUtils.sha256(dataToSign);
  const sig = key.sign(hash);
  const isCanon = dsteem.cryptoUtils.isCanonicalSignature(sig.data);
  const recovered = sig.recover(hash);
  const match = recovered.toString() === key.createPublic().toString();
  if (!isCanon || !match) {
    console.log(`Failed at ${i}: isCanon=${isCanon}, match=${match}`);
  }
}
console.log('Tested 20 signatures: all checks completed!');
