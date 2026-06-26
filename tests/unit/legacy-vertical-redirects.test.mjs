import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

test('_redirects maps legacy vertical URLs to canonical shells', () => {
  const redirects = fs.readFileSync(path.join(root, '_redirects'), 'utf8');

  assert.match(redirects, /^\/finansman \/finans\/ 301/m);
  assert.match(redirects, /^\/finansman\/ \/finans\/ 301/m);
  assert.match(redirects, /^\/araba \/auto\/ 301/m);
  assert.match(redirects, /^\/araba\/ \/auto\/ 301/m);

  const finansmanIdx = redirects.search(/^\/finansman /m);
  const arabaIdx = redirects.search(/^\/araba /m);
  const spaFallbackIdx = redirects.search(/^\/\* \/index\.html 200/m);

  assert.ok(finansmanIdx !== -1, 'missing /finansman redirect');
  assert.ok(arabaIdx !== -1, 'missing /araba redirect');
  assert.ok(spaFallbackIdx !== -1, 'missing SPA fallback');
  assert.ok(finansmanIdx < spaFallbackIdx, '/finansman redirect must precede SPA fallback');
  assert.ok(arabaIdx < spaFallbackIdx, '/araba redirect must precede SPA fallback');
});
