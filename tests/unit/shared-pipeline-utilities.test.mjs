/**
 * Shared Pipeline Utilities — EPIC-302.5 / PR-901B regression
 *
 * Verifies core helpers and domain public export names remain stable.
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(
  pathToFileURL(path.join(__dirname, '../helpers/business-ts-resolve.mjs')).href
);

const core = await import('../../src/core/pipeline/index.ts');
const identity = await import('../../src/identity/index.ts');
const businessAdmin = await import('../../src/business-admin/index.ts');
const platformAdmin = await import('../../src/platform-admin/index.ts');

describe('Core timing', () => {
  it('nowMs returns a finite number', () => {
    assert.equal(Number.isFinite(core.nowMs()), true);
  });

  it('start/end stage timer returns non-negative duration', () => {
    const timer = core.startStageTimer();
    const end = core.endStageTimer(timer);
    assert.ok(end.durationMs >= 0);
    assert.ok(end.endedAt);
    assert.ok(timer.startedAt);
  });
});

describe('Core stage helpers', () => {
  it('createSkippedStageExecution marks skipped', () => {
    const stage = core.createSkippedStageExecution('validation', 'Validation', 'skip');
    assert.equal(stage.outcome, 'skipped');
    assert.equal(stage.stageId, 'validation');
    assert.equal(stage.stageName, 'Validation');
  });

  it('createStageExecution records outcome', () => {
    const stage = core.createStageExecution(
      'summary',
      'Summary',
      'succeeded',
      'ok',
      {
        durationMs: 3,
        startedAt: 'a',
        endedAt: 'b'
      }
    );
    assert.equal(stage.outcome, 'succeeded');
    assert.equal(stage.durationMs, 3);
  });
});

describe('Core telemetry / summary', () => {
  it('buildPipelineExecutionSummary no-failures mode', () => {
    const summary = core.buildPipelineExecutionSummary(
      [
        { outcome: 'succeeded' },
        { outcome: 'skipped' }
      ],
      'no-failures'
    );
    assert.equal(summary.success, true);
    assert.equal(summary.stagesSucceeded, 1);
    assert.equal(summary.stagesSkipped, 1);
  });

  it('buildPipelineExecutionSummary requires succeeded for auth mode', () => {
    const summary = core.buildPipelineExecutionSummary(
      [{ outcome: 'skipped' }],
      'no-failures-and-some-succeeded'
    );
    assert.equal(summary.success, false);
  });

  it('buildAdminStyleExecutionTelemetry embeds summary', () => {
    const telemetry = core.buildAdminStyleExecutionTelemetry(
      [
        {
          stageId: 'validation',
          stageName: 'Validation',
          outcome: 'succeeded',
          detail: 'ok',
          durationMs: 1,
          startedAt: 'a',
          endedAt: 'b'
        }
      ],
      'a',
      'b',
      10,
      { successMode: 'no-failures' }
    );
    assert.equal(telemetry.summary.stagesSucceeded, 1);
    assert.equal(telemetry.totalDurationMs, 10);
  });

  it('buildIntegrationStyleExecutionTelemetry counts succeed/skip', () => {
    const telemetry = core.buildIntegrationStyleExecutionTelemetry(
      [
        {
          stageId: 'validation',
          stageName: 'Validation',
          outcome: 'succeeded',
          detail: 'ok',
          durationMs: 1,
          startedAt: 'a',
          endedAt: 'b'
        },
        {
          stageId: 'summary',
          stageName: 'Summary',
          outcome: 'skipped',
          detail: 'x',
          durationMs: 0,
          startedAt: 'a',
          endedAt: 'b'
        }
      ],
      'a',
      'b',
      5,
      4
    );
    assert.equal(telemetry.succeededStageCount, 1);
    assert.equal(telemetry.skippedStageCount, 1);
    assert.equal(telemetry.summaryCount, 4);
  });

  it('buildStageCountSummaryItems includes locale', () => {
    const items = core.buildStageCountSummaryItems(
      [{ outcome: 'succeeded' }],
      'tr'
    );
    assert.ok(items.some((item) => item.key === 'locale' && item.value === 'tr'));
  });
});

describe('Core validation primitives', () => {
  it('pushInvalidLocaleIssue adds error', () => {
    /** @type {import('../../src/core/execution/index.ts').ValidationIssueBase[]} */
    const issues = [];
    core.pushInvalidLocaleIssue(issues, 'de');
    assert.ok(issues.some((item) => item.code === 'INVALID_LOCALE'));
  });

  it('pushEmptyOptionalStringIssue ignores undefined', () => {
    /** @type {import('../../src/core/execution/index.ts').ValidationIssueBase[]} */
    const issues = [];
    core.pushEmptyOptionalStringIssue(issues, undefined, 'X', 'm');
    assert.equal(issues.length, 0);
  });
});

describe('Domain public API still exports helpers', () => {
  it('identity access helpers', () => {
    const stage = identity.createSkippedStageExecution('validation', 'skip');
    assert.equal(stage.outcome, 'skipped');
    assert.equal(typeof identity.nowMs, 'function');
  });

  it('auth integration helpers', () => {
    const stage = identity.createAuthenticationIntegrationSkippedStageExecution(
      'validation',
      'skip'
    );
    assert.equal(stage.outcome, 'skipped');
    const issues = identity.validateAuthenticationIntegrationContext({
      locale: 'de',
      providerId: 'p'
    });
    assert.ok(issues.some((item) => item.code === 'INVALID_LOCALE'));
  });

  it('tenant integration helpers', () => {
    const summary = identity.buildTenantIntegrationPipelineExecutionSummary([
      identity.createTenantIntegrationStageExecution(
        'validation',
        'succeeded',
        'ok'
      )
    ]);
    assert.equal(summary.success, true);
  });

  it('business admin helpers', () => {
    const telemetry = businessAdmin.buildBusinessAdminExecutionTelemetry(
      [
        businessAdmin.createStageExecution(
          'business-validation',
          'succeeded',
          'ok'
        )
      ],
      'a',
      'b',
      1
    );
    assert.equal(telemetry.summary.stagesSucceeded, 1);
  });

  it('platform admin helpers', () => {
    const stage = platformAdmin.createSkippedStageExecution(
      'platform-validation',
      'skip'
    );
    assert.equal(stage.stageName, 'Platform Validation');
  });
});
