/**
 * İSTEBUL Identity — TenantIsolationRuntime (PR-203E).
 *
 * Pipeline:
 *   Validation
 *     → Identity Projection
 *     → Authentication Projection
 *     → Session Projection
 *     → Authorization Projection
 *     → Tenant Isolation Projection
 *     → Summary
 *     → TenantIsolationResult
 *
 * Identity / Authentication / Session / Authorization üzerinde çalışır;
 * PR-203A–203D dosyaları değiştirilmez.
 * Tenant Isolation yalnızca projection modelidir — Supabase RLS /
 * Database / API / Middleware / JWT Claims yok.
 */

import type { TenantIsolationContext } from './TenantIsolationContext';
import type { TenantIsolationRegistry } from './TenantIsolationRegistry';
import { createTenantIsolationRegistry } from './TenantIsolationRegistry';
import { toTenantIsolationProjection } from './TenantIsolationModule';
import type {
  TenantIsolationResult,
  TenantIsolationTelemetry
} from './TenantIsolationResult';
import {
  resolveRequestedIsolations,
  resolveTenantIsolationAuthenticationProjections,
  resolveTenantIsolationAuthorizationProjections,
  resolveTenantIsolationIdentityProjections,
  resolveTenantIsolationSessionProjections,
  validateTenantIsolationContext
} from './tenantIsolationValidation';
import {
  buildTenantIsolationSummary,
  buildTenantIsolationSummaryItems
} from './tenantIsolationSummary';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../runtime/timing';

/**
 * Tenant Isolation Runtime orchestrator.
 */
export class TenantIsolationRuntime {
  private readonly registry: TenantIsolationRegistry;

  constructor(registry?: TenantIsolationRegistry) {
    this.registry = registry ?? createTenantIsolationRegistry(true);
  }

  getRegistry(): TenantIsolationRegistry {
    return this.registry;
  }

  /**
   * Tenant Isolation pipeline'ını çalıştırır; projeksiyon sonucu döndürür.
   */
  execute(context: TenantIsolationContext): TenantIsolationResult {
    const timer = startStageTimer();
    const startMark = nowMs();

    // Aşama 1: Validation
    const validationIssues = validateTenantIsolationContext(
      context,
      this.registry
    );
    const hasErrors = validationIssues.some(
      (item) => item.severity === 'error'
    );

    // Aşama 2: Identity Projection
    const identityProjections =
      resolveTenantIsolationIdentityProjections(context);

    // Aşama 3: Authentication Projection
    const authenticationProjections =
      resolveTenantIsolationAuthenticationProjections(context);

    // Aşama 4: Session Projection
    const sessionProjections =
      resolveTenantIsolationSessionProjections(context);

    // Aşama 5: Authorization Projection
    const authorizationProjections =
      resolveTenantIsolationAuthorizationProjections(context);

    // Aşama 6: Tenant Isolation Projection
    const { isolations, requestedCount, unavailableCount } =
      resolveRequestedIsolations(context, this.registry);
    const projections = Object.freeze(
      isolations.map((module) => toTenantIsolationProjection(module))
    );

    // Aşama 7: Summary
    const summary = buildTenantIsolationSummary(
      projections,
      identityProjections,
      authenticationProjections,
      sessionProjections,
      authorizationProjections,
      requestedCount,
      unavailableCount,
      hasErrors
    );
    const summaryItems = buildTenantIsolationSummaryItems(
      context,
      summary,
      validationIssues
    );

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: TenantIsolationTelemetry = {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      tenantCount: summary.tenantCount,
      membershipCount: summary.membershipCount,
      isolationDecisionCount: summary.isolationDecisionCount,
      summaryItemCount: summaryItems.length
    };

    // Aşama 8: TenantIsolationResult
    return {
      identityProjections,
      authenticationProjections,
      sessionProjections,
      authorizationProjections,
      isolations: projections,
      summary,
      summaryItems,
      validationIssues,
      telemetry
    };
  }
}

export function createTenantIsolationRuntime(
  registry?: TenantIsolationRegistry
): TenantIsolationRuntime {
  return new TenantIsolationRuntime(registry);
}

export default TenantIsolationRuntime;
