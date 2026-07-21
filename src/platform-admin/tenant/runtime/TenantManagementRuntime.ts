/**
 * İSTEBUL Platform Admin — TenantManagementRuntime (PR-201B).
 *
 * Pipeline:
 *   Validation → Tenant Projection → Summary → TenantManagementResult
 *
 * Girdi: PlatformAdminResult (opsiyonel) + TenantManagementContext
 * Yalnızca projeksiyon — CRUD, API, veritabanı yok.
 */

import type { TenantManagementContext } from './TenantManagementContext';
import type { TenantRegistryRuntime } from './TenantRegistryRuntime';
import { createTenantRegistryRuntime } from './TenantRegistryRuntime';
import { toTenantProjection } from './Tenant';
import type {
  TenantManagementResult,
  TenantManagementTelemetry
} from './TenantManagementResult';
import {
  buildTenantSummary,
  buildTenantSummaryItems
} from './TenantSummary';
import {
  resolveRequestedTenants,
  validateTenantManagementContext
} from './tenantValidation';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../runtime/timing';

/**
 * Tenant Management Runtime orchestrator.
 */
export class TenantManagementRuntime {
  private readonly registry: TenantRegistryRuntime;

  constructor(registry?: TenantRegistryRuntime) {
    this.registry = registry ?? createTenantRegistryRuntime(true);
  }

  getRegistry(): TenantRegistryRuntime {
    return this.registry;
  }

  /**
   * Tenant Management pipeline'ını çalıştırır; projeksiyon sonucu döndürür.
   */
  execute(context: TenantManagementContext): TenantManagementResult {
    const timer = startStageTimer();
    const startMark = nowMs();

    // Aşama 1: Validation
    const validationIssues = validateTenantManagementContext(
      context,
      this.registry
    );
    const hasErrors = validationIssues.some(
      (item) => item.severity === 'error'
    );

    // Aşama 2: Tenant Projection
    const { tenants, requestedCount, unavailableCount } =
      resolveRequestedTenants(context, this.registry);
    const projections = Object.freeze(
      tenants.map((definition) => toTenantProjection(definition))
    );

    // Aşama 3: Summary
    const summary = buildTenantSummary(
      projections,
      requestedCount,
      unavailableCount,
      hasErrors
    );
    const summaryItems = buildTenantSummaryItems(
      summary,
      context.locale,
      context.actorId
    );

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: TenantManagementTelemetry = {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      tenantCount: projections.length,
      summaryItemCount: summaryItems.length
    };

    // Aşama 4: TenantManagementResult
    return {
      tenants: projections,
      summary,
      summaryItems,
      validationIssues,
      telemetry
    };
  }
}

export function createTenantManagementRuntime(
  registry?: TenantRegistryRuntime
): TenantManagementRuntime {
  return new TenantManagementRuntime(registry);
}

export default TenantManagementRuntime;
