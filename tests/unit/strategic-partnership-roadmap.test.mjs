import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildStrategicPartnershipSnapshot,
  computePartnerTypeScore
} from '../../js/features/ops/strategic-partnership-roadmap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../../data/ops/strategic-partnership-roadmap.json');

describe('strategic-partnership-roadmap', () => {
  it('computes weighted partner type score', () => {
    const dims = [{ id: 'monetization_lift', weight: 1 }];
    assert.equal(
      computePartnerTypeScore({ scores: { monetization_lift: 90 } }, dims),
      90
    );
  });

  it('builds snapshot with 7 partner types', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const snapshot = buildStrategicPartnershipSnapshot({ config });
    assert.equal(snapshot.version, 'p26.0');
    assert.equal(snapshot.partnerTypes.length, 7);
    assert.equal(snapshot.firstPartnerType.id, 'bayiler');
    assert.ok(snapshot.roadmapPhases.length >= 4);
  });
});
