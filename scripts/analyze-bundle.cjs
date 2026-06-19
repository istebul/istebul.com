const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const reportPath = path.join(dist, 'bundle-report.json');
const maxChunkBytes = 320 * 1024;
/** Homepage ships one bundled style.*.css (former @import graph inlined at build). */
const maxTotalBytes = 1045 * 1024;

/** Separate entry surfaces — not counted toward main SPA budget. */
const BUDGET_EXCLUDE = [
  /^js\/admin-panel\.js$/,
  /^js\/corporate\//,
  /^js\/chunks\//,
  /^assets\/auto-runtime\//,
  /^assets\/tatil-runtime\//,
  /^assets\/real-estate-runtime\//,
  /^assets\/konut-runtime\//,
  /^assets\/finans-runtime\//,
  /^assets\/sigorta-runtime\//,
  /^assets\/kasko-runtime\//,
  /^assets\/listing-analysis-runtime\//,
  /^assets\/ai-listings-admin-runtime\//,
  /^js\/auto\//,
  /^js\/sigorta\//,
  /^js\/tatil\//,
  /^js\/finans\//,
  /^js\/real-estate\//,
  /** Vertical page entry — not loaded by homepage SPA shell. */
  /^js\/runtime\/vertical-locale-shell\.js$/,
  /** Lazy-loaded on vertical results surfaces only. */
  /^js\/decision\/ai-decision-engine-v3\.js$/,
  /^js\/decision\/decision-v3-mount\.js$/,
  /** Standalone copy for vertical shells; homepage ships analytics via app.bundle. */
  /^js\/runtime\/site-analytics-boot\.js$/,
  /^css\/bundles\//,
  /^assets\/lucide\.min\.js$/,
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
  /^css\/auto/,
  /^css\/partner-platform/,
  /^css\/seo-landing/,
  /^css\/admin-partner-ops/,
  /^css\/admin-ai-listings/,
  /^css\/listing-analysis/,
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

const scriptFiles = files
  .filter((file) => file.path.endsWith('.js'))
  .filter((file) => !BUDGET_EXCLUDE.some((pattern) => pattern.test(file.path)));

/** Single bundled homepage stylesheet (esbuild inlines former @import graph). */
const styleBundle = files.find((file) => /^css\/style\.[a-f0-9]+\.css$/.test(file.path));

const scriptAndStyleFiles = [...scriptFiles];
if (styleBundle) scriptAndStyleFiles.push(styleBundle);
scriptAndStyleFiles.sort((a, b) => b.bytes - a.bytes);

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
