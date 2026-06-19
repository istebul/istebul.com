import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('growth experiments registry', () => {
  it('experiments.json has P5.2 framework version', () => {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'data/growth/experiments.json'),
      'utf8'
    );
    const data = JSON.parse(raw);
    assert.equal(data.frameworkVersion, 'p5.2');
    const ids = (data.experiments || []).map((e) => e.id);
    assert.ok(ids.includes('hero_cta_copy_q2'));
    assert.ok(ids.includes('wizard_next_q2'));
    assert.ok(ids.includes('trust_headline_q2'));
  });

  it('hero_cta_copy_q2 keeps canonical auto hero experiment copy', () => {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'data/growth/experiments.json'),
      'utf8'
    );
    const data = JSON.parse(raw);
    const exp = (data.experiments || []).find((e) => e.id === 'hero_cta_copy_q2');
    assert.ok(exp, 'hero_cta_copy_q2 experiment must exist');

    const autoSelector = '[data-auto-hero-cta]';
    const control = exp.variants.find((v) => v.id === 'control');
    const urgency = exp.variants.find((v) => v.id === 'urgency');

    assert.equal(control?.copy?.[autoSelector], 'Aracımı Analiz Et');
    assert.equal(urgency?.copy?.[autoSelector], 'Araç analizine başla');
  });
});
