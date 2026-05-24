import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStepSchedule,
  isPublicEnrollFlow,
  scheduleStepAt,
  LIFECYCLE_FLOW_IDS
} from '../../js/features/lifecycle/lifecycle-schedule.js';

describe('lifecycle-schedule', () => {
  it('schedules step from enrollment time', () => {
    const enrolled = '2026-05-23T10:00:00.000Z';
    const at = scheduleStepAt(enrolled, 24);
    assert.equal(at, '2026-05-24T10:00:00.000Z');
  });

  it('builds full step schedule', () => {
    const enrolled = '2026-05-23T00:00:00.000Z';
    const steps = [
      { id: 'a', delayHours: 0 },
      { id: 'b', delayHours: 2 }
    ];
    const schedule = buildStepSchedule(steps, enrolled);
    assert.equal(schedule.length, 2);
    assert.equal(schedule[0].stepId, 'a');
    assert.equal(schedule[1].scheduledAt, '2026-05-23T02:00:00.000Z');
  });

  it('exposes eight flow ids', () => {
    assert.equal(LIFECYCLE_FLOW_IDS.length, 8);
  });

  it('marks public enroll flows', () => {
    assert.equal(isPublicEnrollFlow('signup_nurture'), true);
    assert.equal(isPublicEnrollFlow('retention_campaigns'), false);
  });
});
