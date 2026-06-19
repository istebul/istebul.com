#!/usr/bin/env node
/**
 * Compress vertical hero assets (requires sharp: npm install).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const assetsDir = path.join(root, 'assets/images');

const TARGETS = [
  'auto-hero.jpg',
  'konut-hero.jpg',
  'finans-hero.jpg',
  'kasko-hero.jpg',
  'sigorta-hero.jpg',
  'tatil-hero.png'
];

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.warn('optimize-hero-images: sharp not installed — skip');
    process.exit(0);
  }

  for (const src of TARGETS) {
    const input = path.join(assetsDir, src);
    if (!fs.existsSync(input)) {
      console.warn('skip missing', src);
      continue;
    }
    const base = src.replace(/\.(jpg|jpeg|png)$/i, '');
    const webpOut = path.join(assetsDir, `${base}.webp`);
    const jpgOut = path.join(assetsDir, `${base}-1280.jpg`);

    await sharp(input)
      .resize(1280, null, { withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(webpOut);
    await sharp(input)
      .resize(1280, null, { withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(jpgOut);

    const webpBytes = fs.statSync(webpOut).size;
    const jpgBytes = fs.statSync(jpgOut).size;
    console.log(`${src} → webp ${webpBytes} B, jpg ${jpgBytes} B`);
  }
  console.log('optimize-hero-images: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
