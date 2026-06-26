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

const BLUE = [37, 99, 235];
const SLATE = [15, 23, 42];

const dist2 = (x1, y1, x2, y2) => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
};

const distToSegment = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.sqrt(dist2(px, py, x1, y1));
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return Math.sqrt(dist2(px, py, qx, qy));
};

const strokeAlpha = (dist, radius, strokeW) => {
  const edge = Math.abs(dist - radius);
  const aa = Math.max(0.75, strokeW * 0.22);
  return Math.max(0, Math.min(1, (strokeW / 2 + aa - edge) / aa));
};

const fillAlpha = (dist, radius) => {
  const aa = Math.max(0.6, radius * 0.12);
  return Math.max(0, Math.min(1, (radius + aa - dist) / aa));
};

const over = (dst, color, alpha) => {
  if (alpha <= 0) return dst;
  const srcA = alpha;
  const dstA = dst[3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return [0, 0, 0, 0];
  const r = (color[0] * srcA + dst[0] * dstA * (1 - srcA)) / outA;
  const g = (color[1] * srcA + dst[1] * dstA * (1 - srcA)) / outA;
  const b = (color[2] * srcA + dst[2] * dstA * (1 - srcA)) / outA;
  return [r, g, b, outA * 255];
};

/** Rasterize assets/brand/istebul-icon.svg (64×64 viewBox) to RGBA. */
const sampleIcon = (sx, sy) => {
  let pixel = [0, 0, 0, 0];

  const ringDist = Math.sqrt(dist2(sx, sy, 28, 34));
  pixel = over(pixel, SLATE, strokeAlpha(ringDist, 17, 5));

  const handleDist = distToSegment(sx, sy, 41, 47, 56, 58);
  pixel = over(pixel, SLATE, strokeAlpha(handleDist, 0, 5));

  const dotDist = Math.sqrt(dist2(sx, sy, 27, 11));
  pixel = over(pixel, BLUE, fillAlpha(dotDist, 7.5));

  const checkA = strokeAlpha(distToSegment(sx, sy, 17, 34, 25.5, 42.5), 0, 4.5);
  const checkB = strokeAlpha(distToSegment(sx, sy, 25.5, 42.5, 43, 23), 0, 4.5);
  pixel = over(pixel, BLUE, Math.max(checkA, checkB));

  return pixel;
};

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
  return png;
};

const drawIcon = (size) => writePng(`assets/icons/favicon-${size}.png`, size, size, (x, y, w, h) => {
  const pad = size * 0.08;
  const inner = size - pad * 2;
  const sx = pad + (x / Math.max(1, w - 1)) * inner;
  const sy = pad + (y / Math.max(1, h - 1)) * inner;
  const scale = inner / 64;
  return sampleIcon(sx / scale, sy / scale);
});

const writeIco = (relativePath, sizes) => {
  const pngs = sizes.map((size) => ({
    size,
    buffer: drawIcon(size)
  }));

  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const entries = [];
  let offset = 6 + count * 16;
  pngs.forEach(({ size, buffer }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[4] = 1;
    entry[6] = 32;
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += buffer.length;
  });

  fs.writeFileSync(
    path.join(root, relativePath),
    Buffer.concat([header, ...entries, ...pngs.map((p) => p.buffer)])
  );
};

[16, 32, 192, 512].forEach(drawIcon);
writeIco('favicon.ico', [16, 32]);

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

const sharp = require('sharp');

sharp(Buffer.from(ogSvg))
  .resize(1200, 630, { fit: 'fill' })
  .png({ compressionLevel: 9, effort: 10 })
  .toFile(path.join(root, 'assets/images/og-image.png'))
  .then(() => {
    console.log('Generated PWA icons (istebul-icon), favicon.ico, and OG image (SVG + PNG).');
  })
  .catch((err) => {
    console.error('Failed to generate og-image.png:', err);
    process.exit(1);
  });
