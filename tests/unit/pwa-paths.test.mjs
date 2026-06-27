import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const redirects = fs.readFileSync(path.join(root, '_redirects'), 'utf8');

const ALIAS_RULES = [
  ['/service-worker.js', '/sw.js'],
  ['/manifest.webmanifest', '/manifest.json'],
  ['/offline.html', '/offline']
];

function ruleLine(source, target) {
  return new RegExp(`^${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} ${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} 301$`, 'm');
}

test('service worker uses canonical offline path and bumped cache version', () => {
  assert.match(sw, /OFFLINE_PAGE\s*=\s*'\/offline'/);
  assert.match(sw, /CACHE_VERSION\s*=\s*'v52'/);
  assert.match(sw, /istebul-static-\$\{CACHE_VERSION\}/);
});

test('_redirects maps PWA alias paths before SPA fallback', () => {
  const spaFallbackIdx = redirects.search(/^\/\* \/index\.html 200$/m);
  assert.notEqual(spaFallbackIdx, -1, 'missing SPA fallback rule');

  for (const [source, target] of ALIAS_RULES) {
    assert.match(redirects, ruleLine(source, target), `missing redirect: ${source} -> ${target}`);
    const ruleIdx = redirects.search(ruleLine(source, target));
    assert.ok(ruleIdx < spaFallbackIdx, `${source} redirect must precede SPA fallback`);
    assert.notEqual(source, target, `redirect loop: ${source} -> ${target}`);
  }
});

test('manifest.json remains canonical without adding manifest.webmanifest source file', () => {
  assert.ok(fs.existsSync(path.join(root, 'manifest.json')));
  assert.ok(!fs.existsSync(path.join(root, 'manifest.webmanifest')));
  assert.match(
    fs.readFileSync(path.join(root, 'index.html'), 'utf8'),
    /href="\/manifest\.json"/
  );
});
