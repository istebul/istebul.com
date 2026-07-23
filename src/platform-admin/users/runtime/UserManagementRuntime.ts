/**
 * İSTEBUL Platform Admin — UserManagementRuntime (PR-201C).
 *
 * Pipeline:
 *   Validation → User Projection → Summary → UserManagementResult
 *
 * Girdi: PlatformAdminResult (opsiyonel) + UserManagementContext
 * Yalnızca projeksiyon — CRUD, Auth, API, veritabanı yok.
 */

import type { UserManagementContext } from './UserManagementContext';
import type { UserRegistryRuntime } from './UserRegistryRuntime';
import { createUserRegistryRuntime } from './UserRegistryRuntime';
import { toUserProjection } from './User';
import type {
  UserManagementResult,
  UserManagementTelemetry
} from './UserManagementResult';
import { buildUserSummary, buildUserSummaryItems } from './UserSummary';
import {
  resolveRequestedUsers,
  validateUserManagementContext
} from './userValidation';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../runtime/timing';

/**
 * User Management Runtime orchestrator.
 */
export class UserManagementRuntime {
  private readonly registry: UserRegistryRuntime;

  constructor(registry?: UserRegistryRuntime) {
    this.registry = registry ?? createUserRegistryRuntime(true);
  }

  getRegistry(): UserRegistryRuntime {
    return this.registry;
  }

  /**
   * User Management pipeline'ını çalıştırır; projeksiyon sonucu döndürür.
   */
  execute(context: UserManagementContext): UserManagementResult {
    const timer = startStageTimer();
    const startMark = nowMs();

    // Aşama 1: Validation
    const validationIssues = validateUserManagementContext(
      context,
      this.registry
    );
    const hasErrors = validationIssues.some(
      (item) => item.severity === 'error'
    );

    // Aşama 2: User Projection
    const { users, requestedCount, unavailableCount } = resolveRequestedUsers(
      context,
      this.registry
    );
    const projections = Object.freeze(
      users.map((definition) => toUserProjection(definition))
    );

    // Aşama 3: Summary
    const summary = buildUserSummary(
      projections,
      requestedCount,
      unavailableCount,
      hasErrors
    );
    const summaryItems = buildUserSummaryItems(
      summary,
      context.locale,
      context.actorId
    );

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: UserManagementTelemetry = {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      userCount: projections.length,
      summaryItemCount: summaryItems.length
    };

    // Aşama 4: UserManagementResult
    return {
      users: projections,
      summary,
      summaryItems,
      validationIssues,
      telemetry
    };
  }
}

export function createUserManagementRuntime(
  registry?: UserRegistryRuntime
): UserManagementRuntime {
  return new UserManagementRuntime(registry);
}

export default UserManagementRuntime;
