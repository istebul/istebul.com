import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHiringArchitectureSnapshot, scoreRoleUrgency } from '../../js/features/ops/hiring-architecture.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../../data/ops/hiring-architecture.json');

describe('hiring-architecture', () => {
  it('boosts ops_manager urgency when ops unhealthy', () => {
    const role = { id: 'ops_manager', when: { earliestPhase: 'phase_0_first_hire' } };
    const low = scoreRoleUrgency(role, { opsHealth: 'healthy' });
    const high = scoreRoleUrgency(role, { opsHealth: 'critical' });
    assert.ok(high > low);
  });

  it('builds snapshot with 8 roles and next hire', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const snapshot = buildHiringArchitectureSnapshot({
      config,
      liveSignals: { analyticsAtCap: true, dispatchRatePct: 70 }
    });
    assert.equal(snapshot.version, 'p21.0');
    assert.equal(snapshot.roles.length, 8);
    assert.ok(snapshot.nextRecommendedHire?.roleId);
    assert.ok(snapshot.scalableTeamDesign.squads.length >= 4);
  });
});
