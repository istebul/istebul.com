import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildScaleArchitectureReport,
  computeTierConfidence,
  adjustConfidenceWithLiveSignals
} from '../../js/features/ops/scale-architecture-matrix.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../../data/ops/scale-architecture-scenarios.json');

describe('scale-architecture-matrix', () => {
  it('computes lower confidence for higher risk tiers', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const c10 = computeTierConfidence(config.dimensions, '10k');
    const c1m = computeTierConfidence(config.dimensions, '1m');
    assert.ok(c10 >= c1m);
  });

  it('reduces 10k confidence when analytics at cap', () => {
    const base = 90;
    const adjusted = adjustConfidenceWithLiveSignals(base, { analyticsAtCap: true });
    assert.ok(adjusted < base);
  });

  it('builds report with hot dimensions and tier confidence', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const report = buildScaleArchitectureReport({
      config,
      liveSignals: { analyticsAtCap: 1, triggeredAlerts: 4, opsHealth: 'warning' }
    });
    assert.equal(report.version, 'p19.0');
    assert.equal(report.dimensions.length, 13);
    assert.ok(report.tierConfidence['10k'] >= 0);
    assert.ok(report.hotDimensions.length >= 1);
    assert.ok(report.executiveSummary.some((s) => s.includes('cap')));
  });
});
