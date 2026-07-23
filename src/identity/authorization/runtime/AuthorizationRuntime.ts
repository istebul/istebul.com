/**
 * İSTEBUL Identity — AuthorizationRuntime (PR-203D).
 *
 * Pipeline:
 *   Validation
 *     → Identity Projection
 *     → Authentication Projection
 *     → Session Projection
 *     → Authorization Projection
 *     → Summary
 *     → AuthorizationResult
 *
 * Identity / Authentication / Session üzerinde çalışır;
 * PR-203A / PR-203B / PR-203C dosyaları değiştirilmez.
 * RBAC yalnızca projection modelidir — Middleware / JWT Claims /
 * Policy Engine / Supabase RLS / API / DB yok.
 */

import type { AuthorizationContext } from './AuthorizationContext';
import type { AuthorizationRegistry } from './AuthorizationRegistry';
import { createAuthorizationRegistry } from './AuthorizationRegistry';
import { toAuthorizationProjection } from './AuthorizationModule';
import type {
  AuthorizationResult,
  AuthorizationTelemetry
} from './AuthorizationResult';
import {
  resolveAuthorizationAuthenticationProjections,
  resolveAuthorizationIdentityProjections,
  resolveAuthorizationSessionProjections,
  resolveRequestedAuthorizations,
  validateAuthorizationContext
} from './authorizationValidation';
import {
  buildAuthorizationSummary,
  buildAuthorizationSummaryItems
} from './authorizationSummary';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../runtime/timing';

/**
 * Authorization Runtime orchestrator.
 */
export class AuthorizationRuntime {
  private readonly registry: AuthorizationRegistry;

  constructor(registry?: AuthorizationRegistry) {
    this.registry = registry ?? createAuthorizationRegistry(true);
  }

  getRegistry(): AuthorizationRegistry {
    return this.registry;
  }

  /**
   * Authorization pipeline'ını çalıştırır; projeksiyon sonucu döndürür.
   */
  execute(context: AuthorizationContext): AuthorizationResult {
    const timer = startStageTimer();
    const startMark = nowMs();

    // Aşama 1: Validation
    const validationIssues = validateAuthorizationContext(
      context,
      this.registry
    );
    const hasErrors = validationIssues.some(
      (item) => item.severity === 'error'
    );

    // Aşama 2: Identity Projection
    const identityProjections =
      resolveAuthorizationIdentityProjections(context);

    // Aşama 3: Authentication Projection
    const authenticationProjections =
      resolveAuthorizationAuthenticationProjections(context);

    // Aşama 4: Session Projection
    const sessionProjections =
      resolveAuthorizationSessionProjections(context);

    // Aşama 5: Authorization Projection
    const { authorizations, requestedCount, unavailableCount } =
      resolveRequestedAuthorizations(context, this.registry);
    const projections = Object.freeze(
      authorizations.map((module) => toAuthorizationProjection(module))
    );

    // Aşama 6: Summary
    const summary = buildAuthorizationSummary(
      projections,
      identityProjections,
      authenticationProjections,
      sessionProjections,
      requestedCount,
      unavailableCount,
      hasErrors
    );
    const summaryItems = buildAuthorizationSummaryItems(
      context,
      summary,
      validationIssues
    );

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: AuthorizationTelemetry = {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      roleCount: summary.roleCount,
      permissionCount: summary.permissionCount,
      decisionCount: summary.decisionCount,
      summaryItemCount: summaryItems.length
    };

    // Aşama 7: AuthorizationResult
    return {
      identityProjections,
      authenticationProjections,
      sessionProjections,
      authorizations: projections,
      summary,
      summaryItems,
      validationIssues,
      telemetry
    };
  }
}

export function createAuthorizationRuntime(
  registry?: AuthorizationRegistry
): AuthorizationRuntime {
  return new AuthorizationRuntime(registry);
}

export default AuthorizationRuntime;
