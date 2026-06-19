import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BUNDLES, HOMEPAGE_EXTENSION } from '../../scripts/lib/css-bundles.cjs';

test('CSS bundle manifest sources exist', () => {
  for (const sources of Object.values(BUNDLES)) {
    for (const rel of sources) {
      assert.ok(fs.existsSync(path.join(process.cwd(), rel)), `missing ${rel}`);
    }
  }
});

test('homepage bundle file is generated with imports', () => {
  const bundlePath = path.join(process.cwd(), 'css/bundles/homepage.bundle.css');
  assert.ok(fs.existsSync(bundlePath));
  const text = fs.readFileSync(bundlePath, 'utf8');
  assert.match(text, /@import/);
  assert.equal((text.match(/@import/g) || []).length, HOMEPAGE_EXTENSION.length);
});
