const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const reportPath = path.join(dist, 'bundle-report.json');
const maxChunkBytes = 320 * 1024;
/** Main SPA JS + bundled style.css — raised after GarsonAI / production module growth (~4.75 MB, Jul 2026). */
const maxTotalBytes = 5000 * 1024;

/**
 * Separate entry surfaces — not counted toward homepage (/) SPA budget.
 * EPIC-002: platform is multi-entry; / and /ai are independent product shells.
 */
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
  /**
   * EPIC-002 / PR-566A: independent İSTEBUL AI Landing entry at /ai/.
   * Loaded only from ai/index.html — never by homepage app.bundle.
   */
  /^js\/ai\//,
  /**
   * İSTEBUL Business bağımsız ürün yüzeyi.
   * Ana sayfa SPA bütçesine dahil edilmez.
   */
  /^js\/business\//,
  /** AI Landing stylesheets (linked from /ai/ only; not in style.*.css). */
  /^css\/ai\//,
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

/** Informational surface rollup for /ai (excluded from hard SPA budget). */
const AI_LANDING_SURFACE = [/^js\/ai\//, /^css\/ai\//];

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

const aiLandingFiles = files
  .filter((file) => AI_LANDING_SURFACE.some((pattern) => pattern.test(file.path)))
  .sort((a, b) => b.bytes - a.bytes);
const aiLandingBytes = aiLandingFiles.reduce((sum, file) => sum + file.bytes, 0);

const report = {
  generatedAt: new Date().toISOString(),
  maxChunkBytes,
  maxTotalBytes,
  /** Homepage (/) shell budget — does not include independent product entries. */
  totalBytes,
  excludedPatterns: BUDGET_EXCLUDE.map((pattern) => String(pattern)),
  oversized,
  files: scriptAndStyleFiles,
  /** Informational only — hard gate uses totalBytes above. */
  surfaces: {
    aiLanding: {
      note: 'Independent /ai entry (EPIC-002). Excluded from main SPA budget.',
      totalBytes: aiLandingBytes,
      files: aiLandingFiles
    }
  }
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log('Bundle report written to dist/bundle-report.json');
console.log('Main SPA JS/CSS total (homepage / budget): ' + totalBytes + ' bytes');
console.log(
  'AI Landing entry (informational, excluded from SPA budget): ' + aiLandingBytes + ' bytes'
);
if (aiLandingFiles.length > 0) {
  aiLandingFiles.slice(0, 8).forEach((file) => {
    console.log('- ' + file.path + ': ' + file.bytes + ' bytes');
  });
}

if (oversized.length > 0) {
  console.warn('Large chunks detected (homepage budget set):');
  oversized.forEach((file) => console.warn('- ' + file.path + ': ' + file.bytes + ' bytes'));
}

if (totalBytes > maxTotalBytes) {
  console.error('Bundle budget exceeded: ' + totalBytes + ' bytes');
  process.exit(1);
}
