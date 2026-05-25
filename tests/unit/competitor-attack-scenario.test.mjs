import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCompetitorAttackSnapshot,
  attackLikelihoodWeight,
  scoreDefensePillar
} from '../../js/features/ops/competitor-attack-scenario.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../../data/ops/competitor-attack-scenario.json');

describe('competitor-attack-scenario', () => {
  it('weights likelihood and pillar scores', () => {
    assert.equal(scoreDefensePillar({ score: 62 }), 62);
    assert.ok(
      attackLikelihoodWeight({ likelihood: 'high' }) >
        attackLikelihoodWeight({ likelihood: 'low' })
    );
  });

  it('builds snapshot with attacks and six defense pillars', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const snapshot = buildCompetitorAttackSnapshot({ config });
    assert.equal(snapshot.version, 'p24.0');
    assert.ok(snapshot.attackScenarios.length >= 4);
    assert.equal(snapshot.defensePlans.length, 6);
    assert.ok(snapshot.defenseReadinessPct > 0);
    assert.ok(snapshot.warGameMatrix.length >= 4);
  });
});
