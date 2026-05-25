import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  pickLifecycleFlowForRetention,
  lifecyclePriorityForLtv
} from '../../js/features/growth/retention-lifecycle-optimizer.js';
import { parseReactivationContext } from '../../js/features/growth/retention-reactivation.js';

describe('P5.4 retention LTV', () => {
  it('pickLifecycleFlowForRetention prioritizes reactivation', () => {
    assert.equal(pickLifecycleFlowForRetention({ level: 'reactivation' }), 'reactivation_ltv');
  });

  it('pickLifecycleFlowForRetention uses saved decisions', () => {
    assert.equal(
      pickLifecycleFlowForRetention({ level: 'hard', savedCount: 2 }),
      'saved_decision_revisit'
    );
  });

  it('lifecyclePriorityForLtv ranks churn and inactivity', () => {
    const ranked = lifecyclePriorityForLtv({
      churnRisk: true,
      inactiveDays: 20,
      savedDecisions: 1,
      habitStreak: 3
    });
    assert.equal(ranked[0].id, 'retention_campaigns');
    assert.ok(ranked.some((f) => f.id === 'reactivation_ltv'));
  });

  it('parseReactivationContext detects winback UTMs', () => {
    const params = new URLSearchParams('utm_campaign=reactivation_ltv&utm_medium=email');
    const ctx = parseReactivationContext(params);
    assert.ok(ctx);
    assert.equal(ctx.campaign, 'reactivation_ltv');
  });

  it('retention-framework.json is p5.4', () => {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'data/growth/retention-framework.json'),
      'utf8'
    );
    const data = JSON.parse(raw);
    assert.equal(data.version, 'p5.4');
    assert.ok(data.revisitTriggers.inactiveDaysHard >= data.revisitTriggers.inactiveDaysSoft);
  });
});
