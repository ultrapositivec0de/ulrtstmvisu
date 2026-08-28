const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateIcons() {
  const svgPath = path.join(__dirname, '..', 'public', 'icon.svg');
  const publicDir = path.join(__dirname, '..', 'public');
  const svgBuffer = fs.readFileSync(svgPath);

  const sizes = [
    { name: 'favicon.png', size: 64 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'icon.png', size: 512 }
  ];

  for (const item of sizes) {
    const outPath = path.join(publicDir, item.name);
    await sharp(svgBuffer)
      .resize(item.size, item.size)
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outPath);
    console.log(`Generated ${item.name} (${item.size}x${item.size})`);
  }
}

generateIcons().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
