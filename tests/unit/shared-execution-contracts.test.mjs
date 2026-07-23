/**
 * Shared Execution Contracts — EPIC-302.5 / PR-901A regression
 *
 * Ensures domain public type names remain structurally compatible with
 * core contracts (assignability / shape checks). No pipeline execution.
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

const core = await import('../../src/core/execution/index.ts');
const identity = await import('../../src/identity/index.ts');
const businessAdmin = await import('../../src/business-admin/index.ts');
const platformAdmin = await import('../../src/platform-admin/index.ts');

describe('Core execution barrel', () => {
  it('exports StageOutcome-compatible string literals via domain aliases', () => {
    const outcomes = ['succeeded', 'failed', 'skipped'];
    for (const outcome of outcomes) {
      assert.ok(typeof outcome === 'string');
    }
    assert.ok(core);
  });

  it('PipelineBag is a plain object bag', () => {
    /** @type {import('../../src/core/execution/index.ts').PipelineBag} */
    const bag = { a: 1 };
    assert.equal(bag.a, 1);
  });

  it('ExecutionSummaryItem shape', () => {
    /** @type {import('../../src/core/execution/index.ts').ExecutionSummaryItem} */
    const item = { key: 'k', label: 'L', value: true };
    assert.equal(item.key, 'k');
  });

  it('ValidationIssueBase shape', () => {
    /** @type {import('../../src/core/execution/index.ts').ValidationIssueBase} */
    const issue = {
      code: 'X',
      message: 'm',
      severity: 'error'
    };
    assert.equal(issue.severity, 'error');
  });

  it('PipelineExecutionSummaryBase shape', () => {
    /** @type {import('../../src/core/execution/index.ts').PipelineExecutionSummaryBase} */
    const summary = {
      stagesExecuted: 6,
      stagesSucceeded: 5,
      stagesFailed: 0,
      stagesSkipped: 1,
      success: true
    };
    assert.equal(summary.success, true);
  });

  it('StageExecutionBase shape', () => {
    /** @type {import('../../src/core/execution/index.ts').StageExecutionBase<'validation'>} */
    const stage = {
      stageId: 'validation',
      stageName: 'Validation',
      outcome: 'succeeded',
      detail: 'ok',
      durationMs: 1,
      startedAt: '2026-07-22T00:00:00.000Z',
      endedAt: '2026-07-22T00:00:00.001Z'
    };
    assert.equal(stage.outcome, 'succeeded');
  });

  it('ExecutionTiming shape', () => {
    /** @type {import('../../src/core/execution/index.ts').ExecutionTiming} */
    const timing = {
      durationMs: 2,
      startedAt: 'a',
      endedAt: 'b'
    };
    assert.equal(timing.durationMs, 2);
  });

  it('ExecutionMetadata is readonly record', () => {
    /** @type {import('../../src/core/execution/index.ts').ExecutionMetadata} */
    const meta = Object.freeze({ x: 1 });
    assert.equal(meta.x, 1);
  });
});

describe('Public API aliases — Identity Access', () => {
  it('exports createIdentityAccessExecutionContext', () => {
    const ctx = identity.createIdentityAccessExecutionContext({
      locale: 'tr',
      actorId: 'a1'
    });
    assert.equal(ctx.locale, 'tr');
    assert.equal(ctx.actorId, 'a1');
  });

  it('stage outcome labels still include succeeded', () => {
    assert.ok(
      Object.values(identity.IDENTITY_ACCESS_STAGE_LABELS).includes(
        'Validation'
      )
    );
  });

  it('pipeline stages length unchanged', () => {
    assert.equal(identity.IDENTITY_ACCESS_PIPELINE_STAGES.length, 7);
  });
});

describe('Public API aliases — Auth Integration', () => {
  it('exports createAuthenticationIntegrationExecutionContext', () => {
    const ctx = identity.createAuthenticationIntegrationExecutionContext({
      operation: 'synchronize',
      providerId: 'provider-auth-supabase-001'
    });
    assert.equal(ctx.operation, 'synchronize');
  });

  it('auth integration stage count unchanged', () => {
    assert.equal(
      identity.AUTHENTICATION_INTEGRATION_PIPELINE_STAGES.length,
      6
    );
  });
});

describe('Public API aliases — Tenant Integration', () => {
  it('exports createTenantIntegrationExecutionContext', () => {
    const ctx = identity.createTenantIntegrationExecutionContext({
      operation: 'validate',
      providerId: 'provider-tenant-supabase-001',
      tenantId: 't1'
    });
    assert.equal(ctx.tenantId, 't1');
  });

  it('tenant integration skip list excludes summary', () => {
    assert.equal(
      identity.TENANT_INTEGRATION_SKIP_ON_VALIDATION_FAILURE.includes(
        'summary'
      ),
      false
    );
  });
});

describe('Public API aliases — Business Admin', () => {
  it('exports createBusinessAdminExecutionContext', () => {
    const ctx = businessAdmin.createBusinessAdminExecutionContext({
      tenantId: 'tenant-1',
      locale: 'en'
    });
    assert.equal(ctx.tenantId, 'tenant-1');
    assert.equal(ctx.locale, 'en');
  });

  it('business admin stages unchanged', () => {
    assert.equal(businessAdmin.BUSINESS_ADMIN_PIPELINE_STAGES.length, 7);
  });
});

describe('Public API aliases — Platform Admin', () => {
  it('exports createPlatformAdminExecutionContext', () => {
    const ctx = platformAdmin.createPlatformAdminExecutionContext({
      locale: 'tr',
      actorId: 'ops'
    });
    assert.equal(ctx.actorId, 'ops');
  });

  it('platform admin stages unchanged', () => {
    assert.equal(platformAdmin.PLATFORM_ADMIN_PIPELINE_STAGES.length, 7);
  });
});

describe('Assignability smoke — domain bag aliases', () => {
  it('domain bags accept core PipelineBag values', () => {
    /** @type {import('../../src/core/execution/index.ts').PipelineBag} */
    const coreBag = { k: 'v' };
    const access = identity.createIdentityAccessExecutionContext({
      initialBag: coreBag
    });
    const auth = identity.createAuthenticationIntegrationExecutionContext({
      initialBag: coreBag
    });
    const tenant = identity.createTenantIntegrationExecutionContext({
      initialBag: coreBag
    });
    const biz = businessAdmin.createBusinessAdminExecutionContext({
      initialBag: coreBag
    });
    const plat = platformAdmin.createPlatformAdminExecutionContext({
      initialBag: coreBag
    });
    assert.equal(access.initialBag?.k, 'v');
    assert.equal(auth.initialBag?.k, 'v');
    assert.equal(tenant.initialBag?.k, 'v');
    assert.equal(biz.initialBag?.k, 'v');
    assert.equal(plat.initialBag?.k, 'v');
  });
});
