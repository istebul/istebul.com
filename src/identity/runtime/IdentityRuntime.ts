/**
 * İSTEBUL Identity — IdentityRuntime (PR-203A).
 *
 * Pipeline:
 *   Validation → Identity Projection → Summary → IdentityResult
 *
 * Yalnızca projeksiyon — Login, Logout, Supabase Auth, JWT, API, DB yok.
 * Platform Admin ve Business Admin tarafından ortak kullanılır.
 */

import type { IdentityContext } from './IdentityContext';
import type { IdentityRegistry } from './IdentityRegistry';
import { createIdentityRegistry } from './IdentityRegistry';
import { toIdentityProjection } from './IdentityModule';
import type {
  IdentityResult,
  IdentityTelemetry
} from './IdentityResult';
import {
  resolveRequestedIdentities,
  validateIdentityContext
} from './identityValidation';
import {
  buildIdentitySummary,
  buildIdentitySummaryItems
} from './identitySummary';
import { endStageTimer, nowMs, startStageTimer } from './timing';

/**
 * Identity Runtime orchestrator.
 */
export class IdentityRuntime {
  private readonly registry: IdentityRegistry;

  constructor(registry?: IdentityRegistry) {
    this.registry = registry ?? createIdentityRegistry(true);
  }

  getRegistry(): IdentityRegistry {
    return this.registry;
  }

  /**
   * Identity pipeline'ını çalıştırır; projeksiyon sonucu döndürür.
   */
  execute(context: IdentityContext): IdentityResult {
    const timer = startStageTimer();
    const startMark = nowMs();

    // Aşama 1: Validation
    const validationIssues = validateIdentityContext(context, this.registry);
    const hasErrors = validationIssues.some(
      (item) => item.severity === 'error'
    );

    // Aşama 2: Identity Projection
    const { identities, requestedCount, unavailableCount } =
      resolveRequestedIdentities(context, this.registry);
    const projections = Object.freeze(
      identities.map((module) => toIdentityProjection(module))
    );

    // Aşama 3: Summary
    const summary = buildIdentitySummary(
      projections,
      requestedCount,
      unavailableCount,
      hasErrors
    );
    const summaryItems = buildIdentitySummaryItems(
      context,
      summary,
      validationIssues
    );

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: IdentityTelemetry = {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      identityCount: summary.identityCount,
      roleCount: summary.roleCount,
      permissionCount: summary.permissionCount,
      summaryItemCount: summaryItems.length
    };

    // Aşama 4: IdentityResult
    return {
      identities: projections,
      summary,
      summaryItems,
      validationIssues,
      telemetry
    };
  }
}

export function createIdentityRuntime(
  registry?: IdentityRegistry
): IdentityRuntime {
  return new IdentityRuntime(registry);
}

export default IdentityRuntime;
