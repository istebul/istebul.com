const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let c = index;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

const crc32 = (buffers) => {
  let crc = 0xffffffff;
  for (const buffer of buffers) {
    for (const byte of buffer) {
      crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32([typeBuffer, data]), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
};

const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
const mix = (a, b, t) => a + (b - a) * t;

const writePng = (relativePath, width, height, pixel) => {
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a = 255] = pixel(x, y, width, height);
      const offset = 1 + x * 4;
      row[offset] = clamp(r);
      row[offset + 1] = clamp(g);
      row[offset + 2] = clamp(b);
      row[offset + 3] = clamp(a);
    }
    rows.push(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);

  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, png);
};

const roundedRect = (x, y, left, top, right, bottom, radius) => {
  const cx = x < left + radius ? left + radius : x > right - radius ? right - radius : x;
  const cy = y < top + radius ? top + radius : y > bottom - radius ? bottom - radius : y;
  return x >= left && x <= right && y >= top && y <= bottom && (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
};

const drawIcon = (size) => writePng(`assets/icons/favicon-${size}.png`, size, size, (x, y, w, h) => {
  const tx = x / (w - 1);
  const ty = y / (h - 1);
  let r = mix(20, 14, ty);
  let g = mix(103, 165, tx);
  let b = mix(164, 132, ty);

  const card = roundedRect(x, y, w * 0.18, h * 0.18, w * 0.82, h * 0.82, w * 0.14);
  if (card) {
    r = 255;
    g = 255;
    b = 255;
  }

  const stem = x > w * 0.32 && x < w * 0.43 && y > h * 0.38 && y < h * 0.68;
  const dot = (x - w * 0.375) ** 2 + (y - h * 0.30) ** 2 < (w * 0.055) ** 2;
  const bTop = roundedRect(x, y, w * 0.48, h * 0.31, w * 0.68, h * 0.49, w * 0.06);
  const bBottom = roundedRect(x, y, w * 0.48, h * 0.51, w * 0.70, h * 0.70, w * 0.06);
  if (stem || dot || bTop || bBottom) {
    r = 14;
    g = 103;
    b = 164;
  }

  return [r, g, b, 255];
});

drawIcon(192);
drawIcon(512);

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#0f67a4"/>
      <stop offset="0.55" stop-color="#10a37f"/>
      <stop offset="1" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="76" y="72" width="1048" height="486" rx="34" fill="#ffffff" opacity="0.94"/>
  <text x="126" y="174" fill="#0f172a" font-family="Arial, Helvetica, sans-serif" font-size="76" font-weight="800">isteBu</text>
  <text x="126" y="245" fill="#334155" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="600">AI destekli seçim ve satın alma platformu</text>
  <text x="126" y="326" fill="#475569" font-family="Arial, Helvetica, sans-serif" font-size="30">Araç, ev ve tatil kararlarında toplam maliyet, kredi ve</text>
  <text x="126" y="370" fill="#475569" font-family="Arial, Helvetica, sans-serif" font-size="30">satın alma kanallarını tek sonuç ekranında karşılaştırın.</text>
  <rect x="126" y="432" width="210" height="54" rx="16" fill="#0f67a4"/>
  <text x="157" y="468" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">Karar Asistanı</text>
  <rect x="366" y="432" width="176" height="54" rx="16" fill="#ecfdf5" stroke="#10a37f"/>
  <text x="396" y="468" fill="#047857" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">AI Skoru</text>
  <circle cx="930" cy="238" r="92" fill="#0f67a4" opacity="0.12"/>
  <circle cx="986" cy="320" r="122" fill="#10a37f" opacity="0.14"/>
  <path d="M852 403h208" stroke="#0f172a" stroke-width="18" stroke-linecap="round"/>
  <path d="M884 343h176" stroke="#0f172a" stroke-width="18" stroke-linecap="round" opacity="0.64"/>
  <path d="M916 283h144" stroke="#0f172a" stroke-width="18" stroke-linecap="round" opacity="0.38"/>
</svg>
`;

fs.writeFileSync(path.join(root, 'assets/images/og-image.svg'), ogSvg);

console.log('Generated PWA icons and OG image.');
