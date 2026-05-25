import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  pickVariant,
  surfaceMatches,
  validateExperimentWeights,
  metricMatchesExperiment,
  hashToBucket
} from '../../js/features/growth/cro-experiment-framework.js';

describe('P5.2 CRO framework', () => {
  it('hashToBucket is deterministic', () => {
    assert.equal(hashToBucket('a'), hashToBucket('a'));
    assert.ok(hashToBucket('x') >= 0 && hashToBucket('x') < 100);
  });

  it('pickVariant respects weights', () => {
    const exp = {
      id: 't',
      variants: [
        { id: 'a', weight: 100 },
        { id: 'b', weight: 0 }
      ]
    };
    assert.equal(pickVariant(exp, 'user-1').id, 'a');
  });

  it('surfaceMatches handles auto path', () => {
    assert.equal(surfaceMatches('/auto/', ['/auto/']), true);
    assert.equal(surfaceMatches('/planlar', ['/']), false);
  });

  it('metricMatchesExperiment uses aliases', () => {
    const exp = { primaryMetric: 'hero_cta_click' };
    const aliases = { hero_cta_click: ['cta_primary_auto'] };
    assert.equal(metricMatchesExperiment(exp, 'cta_primary_auto', aliases), true);
    assert.equal(metricMatchesExperiment(exp, 'page_view', aliases), false);
  });

  it('experiments.json has all six zones active', () => {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'data/growth/experiments.json'),
      'utf8'
    );
    const data = JSON.parse(raw);
    const zones = new Set(
      (data.experiments || []).filter((e) => e.status === 'active').map((e) => e.zone)
    );
    for (const z of ['hero', 'cta', 'wizard', 'pricing', 'checkout', 'trust']) {
      assert.ok(zones.has(z), `missing active zone ${z}`);
    }
    for (const exp of data.experiments) {
      assert.equal(validateExperimentWeights(exp), true, exp.id);
    }
  });
});
