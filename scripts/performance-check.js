const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const buildScript = read('scripts/production-build.js');
const netlifyConfig = read('netlify.toml');

const imageTags = index.match(/<img\b[^>]*>/gi) || [];
for (const tag of imageTags) {
  assert(/loading=["']lazy["']/.test(tag), `Image should use loading="lazy": ${tag}`);
  assert(/decoding=["']async["']/.test(tag), `Image should use decoding="async": ${tag}`);
}

assert(buildScript.includes('minify: true'), 'Production build should minify JS/CSS.');
assert(netlifyConfig.includes('max-age=31536000'), 'Long-lived asset caching is missing.');
assert(index.includes('rel="preconnect"') || index.includes('rel="dns-prefetch"'), 'Third-party delivery strategy should be explicit.');

console.log('Performance static checks passed.');
