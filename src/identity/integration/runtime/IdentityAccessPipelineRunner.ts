/**
 * İSTEBUL Identity — IdentityAccessPipelineRunner (PR-203F).
 *
 * Pipeline:
 *   Validation → Identity → Authentication → Session →
 *   Authorization → Tenant Isolation → Summary → IdentityAccessResult
 *
 * Validation başarısızsa Identity–Tenant Isolation atlanır; Summary yine çalışır.
 * Her durumda geçerli IdentityAccessResult döner.
 *
 * PR-203A–203E dosyalarını değiştirmez; mevcut runtime'ları koordine eder.
 */

import {
  createIdentityContext,
  createIdentityRuntime,
  PIPELINE_BAG_IDENTITY_RESULT_KEY,
  type IdentityResult,
  type IdentityRuntime
} from '../../runtime/index';
import {
  createAuthenticationContext,
  createAuthenticationRuntime,
  PIPELINE_BAG_AUTHENTICATION_RESULT_KEY,
  type AuthenticationResult,
  type AuthenticationRuntime
} from '../../authentication/index';
import {
  createSessionContext,
  createSessionRuntime,
  PIPELINE_BAG_SESSION_RESULT_KEY,
  type SessionResult,
  type SessionRuntime
} from '../../session/index';
import {
  createAuthorizationContext,
  createAuthorizationRuntime,
  PIPELINE_BAG_AUTHORIZATION_RESULT_KEY,
  type AuthorizationResult,
  type AuthorizationRuntime
} from '../../authorization/index';
import {
  createTenantIsolationContext,
  createTenantIsolationRuntime,
  PIPELINE_BAG_TENANT_ISOLATION_RESULT_KEY,
  type TenantIsolationResult,
  type TenantIsolationRuntime
} from '../../tenant-isolation/index';
import type {
  IdentityAccessExecutionContext,
  IdentityAccessPipelineBag
} from './IdentityAccessExecutionContext';
import type {
  IdentityAccessExecutionResult,
  IdentityAccessResult,
  IdentityAccessStageExecution,
  IdentityAccessValidationIssue
} from './IdentityAccessExecutionResult';
import { PIPELINE_BAG_IDENTITY_ACCESS_RESULT_KEY } from './IdentityAccessExecutionResult';
import {
  buildE2ESummaryItems,
  buildIdentityAccessExecutionTelemetry,
  createEmptyIdentityAccessResult,
  createIdentityAccessResult,
  createSkippedStageExecution,
  createStageExecution,
  endStageTimer,
  nowMs,
  startStageTimer,
  validateIdentityAccessContext
} from './helpers';
import { IDENTITY_ACCESS_SKIP_ON_VALIDATION_FAILURE } from './stages';

export interface IdentityAccessPipelineRunnerDependencies {
  identityRuntime?: IdentityRuntime;
  authenticationRuntime?: AuthenticationRuntime;
  sessionRuntime?: SessionRuntime;
  authorizationRuntime?: AuthorizationRuntime;
  tenantIsolationRuntime?: TenantIsolationRuntime;
}

/**
 * Uçtan uca Identity & Access Pipeline yürütücüsü.
 */
export class IdentityAccessPipelineRunner {
  private readonly identity: IdentityRuntime;
  private readonly authentication: AuthenticationRuntime;
  private readonly session: SessionRuntime;
  private readonly authorization: AuthorizationRuntime;
  private readonly tenantIsolation: TenantIsolationRuntime;

  constructor(deps: IdentityAccessPipelineRunnerDependencies = {}) {
    this.identity = deps.identityRuntime ?? createIdentityRuntime();
    this.authentication =
      deps.authenticationRuntime ?? createAuthenticationRuntime();
    this.session = deps.sessionRuntime ?? createSessionRuntime();
    this.authorization =
      deps.authorizationRuntime ?? createAuthorizationRuntime();
    this.tenantIsolation =
      deps.tenantIsolationRuntime ?? createTenantIsolationRuntime();
  }

  /**
   * Tam uçtan uca akışı yürütür.
   */
  execute(
    execution: IdentityAccessExecutionContext = {}
  ): IdentityAccessExecutionResult {
    const startedMark = nowMs();
    const startedAt = new Date().toISOString();
    const rawLocale = execution.locale ?? 'tr';
    const locale: 'tr' | 'en' = rawLocale === 'en' ? 'en' : 'tr';
    const bag: IdentityAccessPipelineBag = {
      ...(execution.initialBag ?? {})
    };
    const stageExecutions: IdentityAccessStageExecution[] = [];
    const collectedIssues: IdentityAccessValidationIssue[] = [];

    let identityResult: IdentityResult | undefined;
    let authenticationResult: AuthenticationResult | undefined;
    let sessionResult: SessionResult | undefined;
    let authorizationResult: AuthorizationResult | undefined;
    let tenantIsolationResult: TenantIsolationResult | undefined;

    // ─── 1. Validation ───
    const validationTimer = startStageTimer();
    const validationIssues = validateIdentityAccessContext(execution);
    collectedIssues.push(...validationIssues);
    const validationTiming = endStageTimer(validationTimer);
    const hasValidationErrors = validationIssues.some(
      (issue) => issue.severity === 'error'
    );

    stageExecutions.push(
      createStageExecution(
        'validation',
        hasValidationErrors ? 'failed' : 'succeeded',
        hasValidationErrors
          ? `${validationIssues.filter((i) => i.severity === 'error').length} validation error(s).`
          : 'Identity Access validation passed.',
        {
          durationMs: validationTiming.durationMs,
          startedAt: validationTimer.startedAt,
          endedAt: validationTiming.endedAt
        }
      )
    );

    if (hasValidationErrors) {
      for (const stageId of IDENTITY_ACCESS_SKIP_ON_VALIDATION_FAILURE) {
        stageExecutions.push(
          createSkippedStageExecution(
            stageId,
            'Skipped due to identity access validation failure.'
          )
        );
      }
    } else {
      // ─── 2. Identity Projection ───
      const identityTimer = startStageTimer();
      identityResult = this.identity.execute(
        createIdentityContext({
          locale,
          actorId: execution.actorId,
          identityIds: execution.identityIds,
          tenantId: execution.tenantId,
          bag
        })
      );
      const identityTiming = endStageTimer(identityTimer);
      bag[PIPELINE_BAG_IDENTITY_RESULT_KEY] = identityResult;
      collectedIssues.push(
        ...identityResult.validationIssues.map((issue) => ({
          code: issue.code,
          message: issue.message,
          severity: issue.severity
        }))
      );
      stageExecutions.push(
        createStageExecution(
          'identity',
          identityResult.summary.success ? 'succeeded' : 'failed',
          `${identityResult.summary.identityCount} identity(ies) projected.`,
          {
            durationMs: identityTiming.durationMs,
            startedAt: identityTimer.startedAt,
            endedAt: identityTiming.endedAt
          }
        )
      );

      // ─── 3. Authentication Projection ───
      const authenticationTimer = startStageTimer();
      authenticationResult = this.authentication.execute(
        createAuthenticationContext({
          locale,
          actorId: execution.actorId,
          authenticationIds: execution.authenticationIds,
          identityResult,
          bag
        })
      );
      const authenticationTiming = endStageTimer(authenticationTimer);
      bag[PIPELINE_BAG_AUTHENTICATION_RESULT_KEY] = authenticationResult;
      collectedIssues.push(
        ...authenticationResult.validationIssues.map((issue) => ({
          code: issue.code,
          message: issue.message,
          severity: issue.severity
        }))
      );
      stageExecutions.push(
        createStageExecution(
          'authentication',
          authenticationResult.summary.success ? 'succeeded' : 'failed',
          `${authenticationResult.summary.authenticationStateCount} authentication(s) projected.`,
          {
            durationMs: authenticationTiming.durationMs,
            startedAt: authenticationTimer.startedAt,
            endedAt: authenticationTiming.endedAt
          }
        )
      );

      // ─── 4. Session Projection ───
      const sessionTimer = startStageTimer();
      sessionResult = this.session.execute(
        createSessionContext({
          locale,
          actorId: execution.actorId,
          sessionIds: execution.sessionIds,
          identityResult,
          authenticationResult,
          bag
        })
      );
      const sessionTiming = endStageTimer(sessionTimer);
      bag[PIPELINE_BAG_SESSION_RESULT_KEY] = sessionResult;
      collectedIssues.push(
        ...sessionResult.validationIssues.map((issue) => ({
          code: issue.code,
          message: issue.message,
          severity: issue.severity
        }))
      );
      stageExecutions.push(
        createStageExecution(
          'session',
          sessionResult.summary.success ? 'succeeded' : 'failed',
          `${sessionResult.summary.sessionCount} session(s) projected.`,
          {
            durationMs: sessionTiming.durationMs,
            startedAt: sessionTimer.startedAt,
            endedAt: sessionTiming.endedAt
          }
        )
      );

      // ─── 5. Authorization Projection ───
      const authorizationTimer = startStageTimer();
      authorizationResult = this.authorization.execute(
        createAuthorizationContext({
          locale,
          actorId: execution.actorId,
          authorizationIds: execution.authorizationIds,
          identityResult,
          authenticationResult,
          sessionResult,
          bag
        })
      );
      const authorizationTiming = endStageTimer(authorizationTimer);
      bag[PIPELINE_BAG_AUTHORIZATION_RESULT_KEY] = authorizationResult;
      collectedIssues.push(
        ...authorizationResult.validationIssues.map((issue) => ({
          code: issue.code,
          message: issue.message,
          severity: issue.severity
        }))
      );
      stageExecutions.push(
        createStageExecution(
          'authorization',
          authorizationResult.summary.success ? 'succeeded' : 'failed',
          `${authorizationResult.summary.authorizationCount} authorization(s) projected.`,
          {
            durationMs: authorizationTiming.durationMs,
            startedAt: authorizationTimer.startedAt,
            endedAt: authorizationTiming.endedAt
          }
        )
      );

      // ─── 6. Tenant Isolation Projection ───
      const tenantIsolationTimer = startStageTimer();
      tenantIsolationResult = this.tenantIsolation.execute(
        createTenantIsolationContext({
          locale,
          actorId: execution.actorId,
          isolationIds: execution.isolationIds,
          tenantId: execution.tenantId,
          identityResult,
          authenticationResult,
          sessionResult,
          authorizationResult,
          bag
        })
      );
      const tenantIsolationTiming = endStageTimer(tenantIsolationTimer);
      bag[PIPELINE_BAG_TENANT_ISOLATION_RESULT_KEY] = tenantIsolationResult;
      collectedIssues.push(
        ...tenantIsolationResult.validationIssues.map((issue) => ({
          code: issue.code,
          message: issue.message,
          severity: issue.severity
        }))
      );
      stageExecutions.push(
        createStageExecution(
          'tenant-isolation',
          tenantIsolationResult.summary.success ? 'succeeded' : 'failed',
          `${tenantIsolationResult.summary.tenantCount} tenant isolation(s) projected.`,
          {
            durationMs: tenantIsolationTiming.durationMs,
            startedAt: tenantIsolationTimer.startedAt,
            endedAt: tenantIsolationTiming.endedAt
          }
        )
      );
    }

    // ─── 7. Summary (always runs) ───
    const summaryTimer = startStageTimer();
    const identityCount = identityResult?.summary.identityCount ?? 0;
    const authenticationCount =
      authenticationResult?.summary.authenticationStateCount ?? 0;
    const sessionCount = sessionResult?.summary.sessionCount ?? 0;
    const authorizationCount =
      authorizationResult?.summary.authorizationCount ?? 0;
    const tenantIsolationCount =
      tenantIsolationResult?.summary.tenantCount ?? 0;

    const e2eSummaryItems = buildE2ESummaryItems(stageExecutions, locale, {
      identityCount,
      authenticationCount,
      sessionCount,
      authorizationCount,
      tenantIsolationCount
    });
    const summaryTiming = endStageTimer(summaryTimer);
    stageExecutions.push(
      createStageExecution(
        'summary',
        'succeeded',
        `${e2eSummaryItems.length} summary item(s) built.`,
        {
          durationMs: summaryTiming.durationMs,
          startedAt: summaryTimer.startedAt,
          endedAt: summaryTiming.endedAt
        }
      )
    );

    const endedAt = new Date().toISOString();
    const totalDurationMs = Math.max(0, Math.round(nowMs() - startedMark));

    const stagesSucceeded = stageExecutions.filter(
      (s) => s.outcome === 'succeeded'
    ).length;
    const stagesSkipped = stageExecutions.filter(
      (s) => s.outcome === 'skipped'
    ).length;
    const stagesFailed = stageExecutions.filter(
      (s) => s.outcome === 'failed'
    ).length;

    const nestedSuccess =
      !hasValidationErrors &&
      (identityResult?.summary.success ?? false) &&
      (authenticationResult?.summary.success ?? false) &&
      (sessionResult?.summary.success ?? false) &&
      (authorizationResult?.summary.success ?? false) &&
      (tenantIsolationResult?.summary.success ?? false);

    let identityAccessResult: IdentityAccessResult;

    if (hasValidationErrors) {
      identityAccessResult = createEmptyIdentityAccessResult(
        collectedIssues,
        e2eSummaryItems,
        startedAt,
        endedAt,
        totalDurationMs,
        { stagesSucceeded, stagesSkipped, stagesFailed }
      );
    } else {
      identityAccessResult = createIdentityAccessResult({
        success: nestedSuccess && stagesFailed === 0,
        identityCount,
        authenticationCount,
        sessionCount,
        authorizationCount,
        tenantIsolationCount,
        stagesSucceeded,
        stagesSkipped,
        stagesFailed,
        summaryItems: e2eSummaryItems,
        validationIssues: collectedIssues,
        startedAt,
        endedAt,
        durationMs: totalDurationMs,
        identityResult,
        authenticationResult,
        sessionResult,
        authorizationResult,
        tenantIsolationResult
      });
    }

    bag[PIPELINE_BAG_IDENTITY_ACCESS_RESULT_KEY] = identityAccessResult;

    const telemetry = buildIdentityAccessExecutionTelemetry(
      stageExecutions,
      startedAt,
      endedAt,
      totalDurationMs,
      e2eSummaryItems.length
    );

    return {
      identityAccessResult,
      stageExecutions: Object.freeze([...stageExecutions]),
      telemetry,
      bag: Object.freeze({ ...bag }),
      identityResult,
      authenticationResult,
      sessionResult,
      authorizationResult,
      tenantIsolationResult
    };
  }
}

export function createIdentityAccessPipelineRunner(
  deps?: IdentityAccessPipelineRunnerDependencies
): IdentityAccessPipelineRunner {
  return new IdentityAccessPipelineRunner(deps);
}

export default IdentityAccessPipelineRunner;
