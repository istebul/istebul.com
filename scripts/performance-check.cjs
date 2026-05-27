const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const buildScript = read('scripts/production-build.cjs');
const netlifyConfig = read('netlify.toml');
const distIndexPath = path.join(root, 'dist', 'index.html');
const distIndex = fs.existsSync(distIndexPath)
  ? fs.readFileSync(distIndexPath, 'utf8')
  : '';

const imageTags = index.match(/<img\b[^>]*>/gi) || [];
for (const tag of imageTags) {
  assert(/loading=["']lazy["']/.test(tag), `Image should use loading="lazy": ${tag}`);
  assert(/decoding=["']async["']/.test(tag), `Image should use decoding="async": ${tag}`);
}

assert(buildScript.includes('minify: true'), 'Production build should minify JS/CSS.');
assert(netlifyConfig.includes('max-age=31536000'), 'Long-lived asset caching is missing.');
assert(index.includes('rel="preconnect"') || index.includes('rel="dns-prefetch"'), 'Third-party delivery strategy should be explicit.');
assert(index.includes('perf:importmap'), 'index.html should reserve an import map injection slot.');
assert(
  index.includes('route-bootstrap-head.js'),
  'index.html should load route bootstrap from external script (CSP).'
);
assert(
  !/<script>[\s\S]*ROUTE_BOOTSTRAP_START/i.test(index),
  'index.html must not inline route bootstrap script.'
);
assert(buildScript.includes('external: bundleExternals'), 'Production build should externalize heavy vendors.');
assert(buildScript.includes('hashContent(autoBundleCode)'), 'Auto runtime should ship as a content-hashed bundle.');

if (distIndex) {
  assert(distIndex.includes('type="importmap"'), 'Built index.html should include an import map.');
  assert(distIndex.includes('rel="modulepreload"'), 'Built index.html should preload the app bundle.');
}

console.log('Performance static checks passed.');
