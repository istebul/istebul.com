import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCategoryDominanceSnapshot,
  scoreMoatStrength,
  threatWeight
} from '../../js/features/ops/category-dominance-strategy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../../data/ops/category-dominance-strategy.json');

describe('category-dominance-strategy', () => {
  it('scores moat and threat weights', () => {
    assert.equal(scoreMoatStrength({ score: 62 }), 62);
    assert.ok(threatWeight({ threatLevel: 'high' }) > threatWeight({ threatLevel: 'low' }));
  });

  it('builds snapshot with 6 competitors and 6 moats', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const snapshot = buildCategoryDominanceSnapshot({ config });
    assert.equal(snapshot.version, 'p23.0');
    assert.equal(snapshot.competitorLandscape.length, 6);
    assert.equal(snapshot.moatPlans.length, 6);
    assert.ok(snapshot.categoryOwnershipPct > 0);
    assert.ok(snapshot.executiveSummary.length >= 4);
    assert.equal(snapshot.competitorLandscape[0].threatLevel, 'high');
  });
});
