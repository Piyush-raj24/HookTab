const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const targetDir = path.join(__dirname, 'assets');
const wallpapersDir = path.join(targetDir, 'wallpapers');

if (!fs.existsSync(wallpapersDir)) {
  fs.mkdirSync(wallpapersDir, { recursive: true });
}

// 1. Copy generated wallpapers
const sourceImages = [
  {
    src: 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\358f0a55-98b9-4c2b-a7e7-82a563b7dec6\\cyber_aurora_wallpaper_1793028836582.jpg',
    dest: path.join(wallpapersDir, 'aurora.jpg')
  },
  {
    src: 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\358f0a55-98b9-4c2b-a7e7-82a563b7dec6\\warm_sunset_minimal_1793028860234.jpg',
    dest: path.join(wallpapersDir, 'sunset.jpg')
  },
  {
    src: 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\358f0a55-98b9-4c2b-a7e7-82a563b7dec6\\cyber_rainy_city_1793028886744.jpg',
    dest: path.join(wallpapersDir, 'cyberpunk.jpg')
  }
];

for (const img of sourceImages) {
  if (fs.existsSync(img.src)) {
    fs.copyFileSync(img.src, img.dest);
    console.log(`Copied ${img.src} -> ${img.dest}`);
  } else {
    console.warn(`File not found: ${img.src}`);
  }
}

// 2. Pure Node.js function to generate a valid PNG file
function createPng(width, height, drawFn) {
  // RGBA buffer with filter byte 0 at start of each row
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

// CRC32 implementation
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return crc ^ (-1);
}

// Icon design: Gradient rounded squircle with bookmark/star icon
function drawIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = w * 0.46;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Corner radius check (approximate rounded rect)
  const pad = w * 0.12;
  const inBox = x >= pad && x <= w - pad && y >= pad && y <= h - pad;

  // Background gradient: Brave orange / neon violet
  const t = (x + y) / (w + h);
  let bgR = Math.round(255 * (1 - t * 0.4)); // 255 -> 153
  let bgG = Math.round(75 + 100 * t);        // 75 -> 175
  let bgB = Math.round(30 + 225 * t);        // 30 -> 255
  let bgA = 255;

  if (dist > r + 1) {
    return [0, 0, 0, 0];
  } else if (dist > r - 1) {
    const alpha = Math.max(0, Math.min(255, Math.round((r + 1 - dist) * 128)));
    return [bgR, bgG, bgB, alpha];
  }

  // Draw bookmark emblem in center
  const bx = x / w;
  const by = y / h;
  if (bx >= 0.32 && bx <= 0.68 && by >= 0.25 && by <= 0.75) {
    // Cutout bottom notch of bookmark ribbon
    const notchY = 0.65;
    const centerDist = Math.abs(bx - 0.5);
    if (by > notchY && by > 0.75 - centerDist * 0.6) {
      return [bgR, bgG, bgB, bgA];
    }
    // White ribbon with soft inner glow
    return [255, 255, 255, 250];
  }

  return [bgR, bgG, bgB, bgA];
}

for (const size of [16, 48, 128]) {
  const pngBuf = createPng(size, size, drawIcon);
  fs.writeFileSync(path.join(targetDir, `icon-${size}.png`), pngBuf);
  console.log(`Generated icon-${size}.png`);
}

console.log('Assets build complete!');
