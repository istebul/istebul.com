import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

describe('vertical perf wave 2', () => {
  it('auto uses consolidated CSS bundle and lazy turnstile', () => {
    const auto = fs.readFileSync(path.join(root, 'auto/index.html'), 'utf8');
    assert.match(auto, /auto-page\.bundle\.css/);
    assert.doesNotMatch(auto, /turnstile\/v0\/api\.js/);
    const app = fs.readFileSync(path.join(root, 'js/auto/auto-app.js'), 'utf8');
    assert.match(app, /load-turnstile\.js/);
  });

  it('hero webp assets exist for verticals', () => {
    for (const name of ['auto-hero.webp', 'konut-hero.webp', 'finans-hero.webp']) {
      assert.ok(fs.existsSync(path.join(root, 'assets/images', name)), name);
    }
  });
});
