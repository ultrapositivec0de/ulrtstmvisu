import fs from 'fs';
import zlib from 'zlib';

function makeCrc32Table() {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = makeCrc32Table();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return crc ^ -1;
}

function makeChunk(typeStr, data) {
  const typeBuf = Buffer.from(typeStr, 'ascii');
  const sizeBuf = Buffer.alloc(4);
  sizeBuf.writeUInt32BE(data.length, 0);

  const crcTarget = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcTarget);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal >>> 0, 0);

  return Buffer.concat([sizeBuf, crcTarget, crcBuf]);
}

function createPng(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width (4b), height (4b), depth (1b), colorType (1b), compression (1b), filter (1b), interlace (1b)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT: deflated pixel data
  // 1 index byte + 4 bytes per pixel (RGBA) per row
  const rowSize = 1 + width * 4;
  const rawPixels = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    rawPixels[y * rowSize] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      const offset = y * rowSize + 1 + x * 4;
      // Beautiful background: cyan/teal gradient
      rawPixels[offset] = Math.floor(6 + (y / height) * 30);      // R
      rawPixels[offset + 1] = Math.floor(182 - (x / width) * 40);  // G
      rawPixels[offset + 2] = Math.floor(212 + (y / height) * 20);  // B
      rawPixels[offset + 3] = 255;  // A
    }
  }

  const deflated = zlib.deflateSync(rawPixels);
  const idat = makeChunk('IDAT', deflated);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const width = 512;
const height = 512;
const pngBuf = createPng(width, height);
fs.writeFileSync('app-icon.png', pngBuf);
console.log('Successfully created app-icon.png');
