import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildExpansionPrioritizationSnapshot,
  computeCompositeScore
} from '../../js/features/ops/expansion-roadmap-prioritization.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../../data/ops/expansion-roadmap-prioritization.json');

describe('expansion-roadmap-prioritization', () => {
  it('computes weighted composite', () => {
    const criteria = [{ id: 'monetization', weight: 1 }];
    const score = computeCompositeScore({ scores: { monetization: 80 } }, criteria);
    assert.equal(score, 80);
  });

  it('ranks ev first with seven categories', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const snapshot = buildExpansionPrioritizationSnapshot({ config });
    assert.equal(snapshot.version, 'p25.0');
    assert.equal(snapshot.categories.length, 7);
    assert.equal(snapshot.firstCategory.id, 'ev');
    assert.equal(snapshot.verdict.firstCategory, 'ev');
  });
});
