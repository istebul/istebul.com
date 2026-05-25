import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCompanyOperatingSnapshot,
  computeRiceScore,
  countRecentDecisions
} from '../../js/features/ops/company-operating-system.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../../data/ops/company-operating-system.json');
const logPath = path.join(__dirname, '../../data/ops/decision-log.json');

describe('company-operating-system', () => {
  it('computes RICE score', () => {
    const score = computeRiceScore({ reach: 8, impact: 2, confidence: 0.8, effort: 4 });
    assert.equal(score, 3.2);
  });

  it('counts recent approved decisions', () => {
    const n = countRecentDecisions(
      [{ decidedAt: new Date().toISOString(), status: 'approved' }],
      14
    );
    assert.equal(n, 1);
  });

  it('builds snapshot with reviews and independence checks', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const decisionLog = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    const snapshot = buildCompanyOperatingSnapshot({
      config,
      decisionLog,
      artifactStatus: { opsAutomation: true }
    });
    assert.equal(snapshot.version, 'p20.0');
    assert.equal(snapshot.reviews.length, 5);
    assert.ok(snapshot.independenceScore >= 0);
    assert.ok(snapshot.roadmapNow.length >= 1);
    assert.ok(snapshot.founderIndependenceChecks.length >= 5);
  });
});
