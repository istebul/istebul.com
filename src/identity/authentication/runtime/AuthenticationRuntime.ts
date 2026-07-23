/**
 * İSTEBUL Identity — AuthenticationRuntime (PR-203B).
 *
 * Pipeline:
 *   Validation
 *     → Identity Projection
 *     → Authentication Projection
 *     → Summary
 *     → AuthenticationResult
 *
 * Identity Foundation üzerinde çalışır; foundation dosyaları değiştirilmez.
 * Yalnızca projeksiyon — Login UI / Logout UI / JWT / Supabase Auth /
 * OAuth / OIDC / API / DB yok.
 */

import type { AuthenticationContext } from './AuthenticationContext';
import type { AuthenticationRegistry } from './AuthenticationRegistry';
import { createAuthenticationRegistry } from './AuthenticationRegistry';
import { toAuthenticationProjection } from './AuthenticationModule';
import type {
  AuthenticationResult,
  AuthenticationTelemetry
} from './AuthenticationResult';
import {
  resolveIdentityProjections,
  resolveRequestedAuthentications,
  validateAuthenticationContext
} from './authenticationValidation';
import {
  buildAuthenticationSummary,
  buildAuthenticationSummaryItems
} from './authenticationSummary';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../runtime/timing';

/**
 * Authentication Runtime orchestrator.
 */
export class AuthenticationRuntime {
  private readonly registry: AuthenticationRegistry;

  constructor(registry?: AuthenticationRegistry) {
    this.registry = registry ?? createAuthenticationRegistry(true);
  }

  getRegistry(): AuthenticationRegistry {
    return this.registry;
  }

  /**
   * Authentication pipeline'ını çalıştırır; projeksiyon sonucu döndürür.
   */
  execute(context: AuthenticationContext): AuthenticationResult {
    const timer = startStageTimer();
    const startMark = nowMs();

    // Aşama 1: Validation
    const validationIssues = validateAuthenticationContext(
      context,
      this.registry
    );
    const hasErrors = validationIssues.some(
      (item) => item.severity === 'error'
    );

    // Aşama 2: Identity Projection
    const identityProjections = resolveIdentityProjections(context);

    // Aşama 3: Authentication Projection
    const { authentications, requestedCount, unavailableCount } =
      resolveRequestedAuthentications(context, this.registry);
    const projections = Object.freeze(
      authentications.map((module) => toAuthenticationProjection(module))
    );

    // Aşama 4: Summary
    const summary = buildAuthenticationSummary(
      projections,
      identityProjections,
      requestedCount,
      unavailableCount,
      hasErrors
    );
    const summaryItems = buildAuthenticationSummaryItems(
      context,
      summary,
      validationIssues
    );

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: AuthenticationTelemetry = {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      authenticatedPrincipalCount: summary.authenticatedPrincipalCount,
      authenticationStateCount: summary.authenticationStateCount,
      summaryItemCount: summaryItems.length
    };

    // Aşama 5: AuthenticationResult
    return {
      identityProjections,
      authentications: projections,
      summary,
      summaryItems,
      validationIssues,
      telemetry
    };
  }
}

export function createAuthenticationRuntime(
  registry?: AuthenticationRegistry
): AuthenticationRuntime {
  return new AuthenticationRuntime(registry);
}

export default AuthenticationRuntime;
