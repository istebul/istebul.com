const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const css = read('css/style.css');

assert(index.includes('<main') || index.includes('id="main-content"'), 'Main landmark/content container is missing.');
assert(index.includes('<nav') && index.includes('aria-label'), 'Navigation should expose an aria-label.');
assert(index.includes('aria-label="Çerez ve analiz tercihi"'), 'Cookie consent region label is missing.');
assert(index.includes('aria-live') || css.includes('role="status"'), 'Live/status notification support should be present.');
assert(css.includes(':focus') || css.includes(':focus-visible'), 'Focus indicator styles are missing.');
assert(css.includes('sr-only'), 'Screen-reader-only utility is missing.');
assert(!index.includes('onclick="'), 'Inline onclick handlers should be avoided in source HTML.');
assert(!index.includes('onload="'), 'Inline onload handlers should be avoided in source HTML.');
const productionBuild = read('scripts/production-build.cjs');
assert(!productionBuild.includes('onload="'), 'production-build must not inject inline onload handlers.');

// P0-1 kritik yüzey marker'ları (Platform root + AI ürün yüzeyi)
const criticalMarkers = [
  ['index.html', 'id="platform-landing"'],
  ['index.html', 'id="neden-istebul"'],
  ['index.html', 'id="premium-karar-analizi-root"'],
  ['index.html', 'id="listing-result-count"'],
  ['ai/index.html', 'id="hero-v4-title"'],
  ['ai/index.html', 'data-hero-cta-primary'],
  ['auto/index.html', 'data-auto-hero-cta'],
  ['tatil/index.html', 'id="vacation-hero-cta"'],
  ['sigorta/index.html', 'id="sigorta-hero-cta"'],
  ['kasko/index.html', 'id="kasko-hero-cta"'],
  ['admin-panel.html', 'id="admin-nav"'],
  ['admin/ai-listings.html', 'id="ai-listings-new-menu-btn"']
];

for (const [file, marker] of criticalMarkers) {
  const source = read(file);
  assert(source.includes(marker), `${file} must include critical marker: ${marker}`);
}

console.log('Accessibility static checks passed.');
