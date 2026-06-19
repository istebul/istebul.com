import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildStartupOperatingSnapshot,
  scoreBottleneckUrgency,
  scorePillarReadiness
} from '../../js/features/ops/startup-operating-center.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../../data/ops/startup-operating-mode.json');

describe('startup-operating-center', () => {
  it('scores bottleneck urgency with live cap boost', () => {
    const base = scoreBottleneckUrgency(
      { id: 'analytics_write_volume', severity: 'high' },
      { analyticsAtCap: false }
    );
    const boosted = scoreBottleneckUrgency(
      { id: 'analytics_write_volume', severity: 'high' },
      { analyticsAtCap: true }
    );
    assert.ok(boosted > base);
  });

  it('builds snapshot with pillars and ranked bottlenecks', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const snapshot = buildStartupOperatingSnapshot({
      config,
      opsCenter: {
        overallHealth: 'warning',
        alerts: { triggeredCount: 2 },
        domains: [{ id: 'analytics', metrics: { eventsAtCap: 1 } }],
        executive: { partnerLeadQuality: { totalLeads: 120 } }
      }
    });

    assert.equal(snapshot.version, 'p18.0');
    assert.equal(snapshot.pillars.length, (config.scalePillars || []).length);
    assert.ok(snapshot.bottlenecks[0].urgencyScore >= snapshot.bottlenecks[1]?.urgencyScore);
    assert.ok(['foundation', 'scaling', 'scale_ready'].includes(snapshot.scaleStage));
    assert.ok(snapshot.executiveSummary.length >= 2);
  });

  it('pillar readiness responds to open high bottlenecks', () => {
    const pillar = { id: 'infrastructure', name: 'Infra' };
    const low = scorePillarReadiness(pillar, [], []);
    const high = scorePillarReadiness(
      pillar,
      [{ pillar: 'infrastructure', severity: 'high', status: 'planned' }],
      []
    );
    assert.ok(low > high);
  });
});
