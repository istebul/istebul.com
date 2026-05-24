import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('growth experiments registry', () => {
  it('experiments.json has active hero and pricing tests', () => {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'data/growth/experiments.json'),
      'utf8'
    );
    const data = JSON.parse(raw);
    const ids = (data.experiments || []).map((e) => e.id);
    assert.ok(ids.includes('hero_cta_copy_q2'));
    assert.ok(ids.includes('pricing_cta_q2'));
    const hero = data.experiments.find((e) => e.id === 'hero_cta_copy_q2');
    assert.equal(hero.status, 'active');
    assert.equal(hero.variants.length, 2);
    const weights = hero.variants.reduce((s, v) => s + v.weight, 0);
    assert.equal(weights, 100);
  });
});
