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

test('Platform Hero CSS is delivered via homepage bundle (no duplicate index link)', () => {
  const required = [
    'css/platform-hero.css',
    'css/platform-urun-karti.css',
    'css/platform-urun-izgarasi.css',
    'css/platform-shell-home.css'
  ];
  for (const sheet of required) {
    assert.ok(HOMEPAGE_EXTENSION.includes(sheet), `manifest missing ${sheet}`);
  }

  const bundle = fs.readFileSync(
    path.join(process.cwd(), 'css/bundles/homepage.bundle.css'),
    'utf8'
  );
  assert.match(bundle, /platform-hero\.css/);
  assert.match(bundle, /platform-urun-karti\.css/);
  assert.match(bundle, /platform-urun-izgarasi\.css/);
  assert.match(bundle, /platform-shell-home\.css/);

  const index = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  assert.match(index, /css\/bundles\/homepage\.bundle\.css/);
  assert.doesNotMatch(index, /href=["']\/css\/platform-hero\.css/);
  assert.doesNotMatch(index, /href=["']\/css\/platform-urun-karti\.css/);
  assert.doesNotMatch(index, /href=["']\/css\/platform-urun-izgarasi\.css/);
  assert.doesNotMatch(index, /href=["']\/css\/platform-shell-home\.css/);
  assert.match(index, /href=["']\/css\/platform-landing-preview\.css/);
});
