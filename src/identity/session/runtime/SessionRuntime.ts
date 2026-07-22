/**
 * İSTEBUL Identity — SessionRuntime (PR-203C).
 *
 * Pipeline:
 *   Validation
 *     → Identity Projection
 *     → Authentication Projection
 *     → Session Projection
 *     → Summary
 *     → SessionResult
 *
 * Identity Foundation ve Authentication Runtime üzerinde çalışır;
 * PR-203A / PR-203B dosyaları değiştirilmez.
 * Yalnızca oturum modeli projeksiyonu — JWT / Refresh Token / Cookie /
 * Supabase Auth / OAuth / OIDC / API / DB yok.
 */

import type { SessionContext } from './SessionContext';
import type { SessionRegistry } from './SessionRegistry';
import { createSessionRegistry } from './SessionRegistry';
import { toSessionProjection } from './SessionModule';
import type { SessionResult, SessionTelemetry } from './SessionResult';
import {
  resolveSessionAuthenticationProjections,
  resolveSessionIdentityProjections,
  resolveRequestedSessions,
  validateSessionContext
} from './sessionValidation';
import {
  buildSessionSummary,
  buildSessionSummaryItems
} from './sessionSummary';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../runtime/timing';

/**
 * Session Runtime orchestrator.
 */
export class SessionRuntime {
  private readonly registry: SessionRegistry;

  constructor(registry?: SessionRegistry) {
    this.registry = registry ?? createSessionRegistry(true);
  }

  getRegistry(): SessionRegistry {
    return this.registry;
  }

  /**
   * Session pipeline'ını çalıştırır; projeksiyon sonucu döndürür.
   */
  execute(context: SessionContext): SessionResult {
    const timer = startStageTimer();
    const startMark = nowMs();

    // Aşama 1: Validation
    const validationIssues = validateSessionContext(context, this.registry);
    const hasErrors = validationIssues.some(
      (item) => item.severity === 'error'
    );

    // Aşama 2: Identity Projection
    const identityProjections = resolveSessionIdentityProjections(context);

    // Aşama 3: Authentication Projection
    const authenticationProjections =
      resolveSessionAuthenticationProjections(context);

    // Aşama 4: Session Projection
    const { sessions, requestedCount, unavailableCount } =
      resolveRequestedSessions(context, this.registry);
    const projections = Object.freeze(
      sessions.map((module) => toSessionProjection(module))
    );

    // Aşama 5: Summary
    const summary = buildSessionSummary(
      projections,
      identityProjections,
      authenticationProjections,
      requestedCount,
      unavailableCount,
      hasErrors
    );
    const summaryItems = buildSessionSummaryItems(
      context,
      summary,
      validationIssues
    );

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: SessionTelemetry = {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      sessionCount: summary.sessionCount,
      activeSessionCount: summary.activeSessionCount,
      expiredSessionCount: summary.expiredSessionCount,
      summaryItemCount: summaryItems.length
    };

    // Aşama 6: SessionResult
    return {
      identityProjections,
      authenticationProjections,
      sessions: projections,
      summary,
      summaryItems,
      validationIssues,
      telemetry
    };
  }
}

export function createSessionRuntime(
  registry?: SessionRegistry
): SessionRuntime {
  return new SessionRuntime(registry);
}

export default SessionRuntime;
