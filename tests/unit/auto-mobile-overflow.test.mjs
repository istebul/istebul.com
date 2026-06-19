import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('auto finance bank row buttons wrap on mobile', () => {
  const css = readFileSync(join(root, 'css/auto.css'), 'utf8');
  assert.match(
    css,
    /@media\(max-width:768px\)\{[\s\S]*?\.finance-bank-row\{[\s\S]*?grid-template-columns:1fr;[\s\S]*?\.finance-bank-row \.btn\{[\s\S]*?white-space:normal;[\s\S]*?text-align:center;/
  );
});

test('auto compare matrix inner scroll guard remains', () => {
  const css = readFileSync(join(root, 'css/auto.css'), 'utf8');
  assert.match(css, /\.ib-auto-compare-matrix-scroll/);
  assert.match(css, /overflow-x:\s*auto/);
});

test('auto trust banner CTA wraps on mobile', () => {
  const css = readFileSync(join(root, 'css/auto.css'), 'utf8');
  assert.match(
    css,
    /@media \(max-width: 760px\)\{[\s\S]*?\.auto-results-trust-banner \.btn\{[\s\S]*?width:100%;[\s\S]*?white-space:normal;[\s\S]*?text-align:center;/
  );
});

test('auto conversion result card mobile block avoids dead overflow visible', () => {
  const autoCss = readFileSync(join(root, 'css/auto.css'), 'utf8');
  const mobileResultsCss = readFileSync(join(root, 'css/auto-mobile-results.css'), 'utf8');

  const mobileConversionCardBlock = autoCss.match(
    /@media \(max-width: 768px\)\{\s*#auto-results \.auto-market-card\.conversion-result-card\{([^}]*)\}/
  );
  assert.ok(mobileConversionCardBlock, 'expected mobile conversion result card block in auto.css');
  assert.doesNotMatch(mobileConversionCardBlock[1], /overflow:\s*visible/);
  assert.match(
    mobileResultsCss,
    /body\.ib-auto #auto-results \.auto-market-card\.conversion-result-card[\s\S]*?overflow:\s*hidden/
  );
});
