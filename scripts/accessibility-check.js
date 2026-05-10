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

console.log('Accessibility static checks passed.');
