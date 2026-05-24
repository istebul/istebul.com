const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const reportPath = path.join(dist, 'bundle-report.json');
const maxChunkBytes = 320 * 1024;
const maxTotalBytes = 900 * 1024;

/** Separate entry surfaces — not counted toward main SPA budget. */
const BUDGET_EXCLUDE = [
  /^js\/admin-panel\.js$/,
  /^js\/corporate\//,
  /^assets\/auto-runtime\//,
  /^env\.js$/,
  /^sw\.js$/,
  /** Hashed copies of @import layers (SPA loads single style.*.css). */
  /^css\/enterprise-polish/,
  /^css\/executive-polish/,
  /^css\/mobile-perfection/,
  /^css\/p4-premium-product/,
  /^css\/p4-1-homepage-venture/,
  /^css\/enterprise-ux-system/,
  /^css\/p4-3-mobile-premium/,
  /^css\/conversion-micro-ux/,
  /^css\/p4-5-perceived-performance/,
  /^css\/p4-6-brand-consistency/,
  /^css\/premium-pages/,
  /^css\/revenue/,
  /^css\/premium-pages/,
  /^css\/auto/,
  /^css\/partner-platform/,
  /^css\/seo-landing/,
  /^css\/admin-partner-ops/,
  /^css\/rtl/
];

const files = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile()) {
      const relativePath = path.relative(dist, fullPath).split(path.sep).join('/');
      const bytes = fs.statSync(fullPath).size;
      files.push({ path: relativePath, bytes });
    }
  }
};

if (!fs.existsSync(dist)) {
  console.error('dist/ not found. Run npm run build first.');
  process.exit(1);
}

walk(dist);

const scriptAndStyleFiles = files
  .filter((file) => /\.(js|css)$/.test(file.path))
  .filter((file) => !BUDGET_EXCLUDE.some((pattern) => pattern.test(file.path)))
  .sort((a, b) => b.bytes - a.bytes);

const totalBytes = scriptAndStyleFiles.reduce((sum, file) => sum + file.bytes, 0);
const oversized = scriptAndStyleFiles.filter((file) => file.bytes > maxChunkBytes);
const report = {
  generatedAt: new Date().toISOString(),
  maxChunkBytes,
  maxTotalBytes,
  totalBytes,
  excludedPatterns: BUDGET_EXCLUDE.map((pattern) => String(pattern)),
  oversized,
  files: scriptAndStyleFiles
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log('Bundle report written to dist/bundle-report.json');
console.log('Main SPA JS/CSS total: ' + totalBytes + ' bytes');

if (oversized.length > 0) {
  console.warn('Large chunks detected:');
  oversized.forEach((file) => console.warn('- ' + file.path + ': ' + file.bytes + ' bytes'));
}

if (totalBytes > maxTotalBytes) {
  console.error('Bundle budget exceeded: ' + totalBytes + ' bytes');
  process.exit(1);
}
