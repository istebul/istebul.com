#!/usr/bin/env node
/**
 * Compress vertical hero assets (requires sharp: npm install).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const assetsDir = path.join(root, 'assets/images');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.warn('optimize-hero-images: sharp not installed — skip');
    process.exit(0);
  }

  const targets = [
    { src: 'tatil-hero.png', webp: 'tatil-hero.webp', jpg: 'tatil-hero-1280.jpg', width: 1280 },
    { src: 'konut-hero.jpg', webp: 'konut-hero.webp', jpg: 'konut-hero-1280.jpg', width: 1280 }
  ];

  for (const t of targets) {
    const input = path.join(assetsDir, t.src);
    if (!fs.existsSync(input)) continue;
    await sharp(input)
      .resize(t.width, null, { withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(assetsDir, t.webp));
    await sharp(input)
      .resize(t.width, null, { withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(path.join(assetsDir, t.jpg));
    console.log('optimized', t.src);
  }
  console.log('optimize-hero-images: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
