import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMetricValue,
  compareMetric,
  evaluateAlertRules
} from '../../js/features/ops/ops-alert-engine.js';

describe('ops-alert-engine', () => {
  it('getMetricValue resolves dot paths', () => {
    assert.equal(getMetricValue({ ops: { criticalCount: 2 } }, 'ops.criticalCount'), 2);
  });

  it('compareMetric supports gte and lt', () => {
    assert.equal(compareMetric(5, 'gte', 5), true);
    assert.equal(compareMetric(69, 'lt', 70), true);
  });

  it('evaluateAlertRules fires matching rules', () => {
    const rules = [
      {
        id: 'test_critical',
        domain: 'operations',
        severity: 'critical',
        metric: 'ops.criticalCount',
        op: 'gte',
        threshold: 1,
        message: 'critical'
      }
    ];
    const out = evaluateAlertRules({ ops: { criticalCount: 2 } }, rules);
    assert.equal(out.triggeredCount, 1);
    assert.equal(out.overallSeverity, 'critical');
  });

  it('evaluateAlertRules ok when below threshold', () => {
    const rules = [
      {
        id: 'test_critical',
        domain: 'operations',
        severity: 'critical',
        metric: 'ops.criticalCount',
        op: 'gte',
        threshold: 1,
        message: 'critical'
      }
    ];
    const out = evaluateAlertRules({ ops: { criticalCount: 0 } }, rules);
    assert.equal(out.triggeredCount, 0);
    assert.equal(out.overallSeverity, 'ok');
  });
});
