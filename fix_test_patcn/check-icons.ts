import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('./public');
const files = ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon.png', 'icon.png', 'icon.svg'];

function getPngDimensions(buffer: Buffer) {
  if (buffer.length < 24) return null;
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  if (!isPng) return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

console.log('--- Checking PWA Icons ---');
for (const file of files) {
  const filePath = path.join(publicDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${file}: NOT FOUND`);
    continue;
  }
  const stat = fs.statSync(filePath);
  const buffer = fs.readFileSync(filePath);
  if (file.endsWith('.png')) {
    const dims = getPngDimensions(buffer);
    if (dims) {
      console.log(`✅ ${file}: ${dims.width}x${dims.height} (${stat.size} bytes)`);
    } else {
      console.log(`⚠️ ${file}: invalid PNG header (${stat.size} bytes)`);
    }
  } else if (file.endsWith('.svg')) {
    console.log(`✅ ${file}: SVG file (${stat.size} bytes, content length: ${buffer.toString('utf8').length})`);
  }
}
