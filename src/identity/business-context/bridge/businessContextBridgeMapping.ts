/**
 * İSTEBUL Identity — Tenant → Business Context mapping (EPIC-302D).
 *
 * Tenant Session Bridge sonucunu Business Context modeline dönüştürür.
 * Supabase / Repository / CRUD / Dashboard / API / Middleware yok.
 */

import type { TenantSessionBridgeResult } from '../../tenant-isolation/bridge/TenantSessionBridgeResult';
import type { BusinessRuntimeExecutionResult } from './BusinessRuntimePort';
import type {
  BusinessContextModule,
  BusinessContextStatus,
  BusinessContextWorkspaceRef
} from './BusinessContextModule';
import { toBusinessContextProjection } from './BusinessContextModule';
import type { BusinessContextBridgeOperation } from './BusinessContextBridgeContext';
import type { BusinessContextBridgeValidationIssue } from './BusinessContextBridgeResult';
import type { BusinessContextBridgeBinding } from './BusinessContextBridgeRegistry';

export interface MapTenantToBusinessContextOptions {
  operation: BusinessContextBridgeOperation;
  existingModule?: BusinessContextModule;
  businessId?: string;
  workspaceId?: string;
  workspaceLabel?: string;
  moduleIds?: readonly string[];
  nowIso?: string;
  order?: number;
}

/**
 * Tenant / business runtime durumundan BusinessContextStatus.
 */
export function mapToBusinessContextStatus(
  tenantSuccess: boolean,
  businessSuccess: boolean,
  operation: BusinessContextBridgeOperation
): BusinessContextStatus {
  if (!tenantSuccess) {
    return operation === 'refresh' ? 'stale' : 'invalid';
  }
  if (!businessSuccess) {
    return operation === 'validate' ? 'invalid' : 'pending';
  }
  return 'active';
}

/**
 * Tenant bridge sonucundan kimlikleri çözer.
 */
export function resolveBusinessContextIdentifiers(
  tenantBridgeResult: TenantSessionBridgeResult | undefined,
  options: MapTenantToBusinessContextOptions
): {
  tenantId: string;
  businessId: string;
  displayName: string;
  contextModuleId: string;
  identityId?: string;
  sessionId?: string;
  tenantBindingId?: string;
} {
  const tenantId =
    tenantBridgeResult?.isolationModule?.tenantIdentity.tenantId ||
    tenantBridgeResult?.binding?.tenantId ||
    options.existingModule?.tenantId ||
    'tenant-unknown';

  const businessId =
    options.businessId ||
    options.existingModule?.businessId ||
    tenantId;

  const displayName =
    tenantBridgeResult?.isolationModule?.tenantIdentity.displayName ||
    options.existingModule?.displayName ||
    businessId;

  const identityId =
    tenantBridgeResult?.isolationModule?.primaryIdentityId ||
    tenantBridgeResult?.binding?.identityId ||
    options.existingModule?.identityId;

  const sessionId =
    tenantBridgeResult?.isolationModule?.sessionId ||
    tenantBridgeResult?.binding?.sessionId ||
    options.existingModule?.sessionId;

  const tenantBindingId =
    tenantBridgeResult?.binding?.id ||
    options.existingModule?.tenantBindingId;

  const contextModuleId =
    options.existingModule?.id || `business-context-${businessId}`;

  return {
    tenantId,
    businessId,
    displayName,
    contextModuleId,
    identityId,
    sessionId,
    tenantBindingId
  };
}

/**
 * Business runtime modüllerinden workspace referansları üretir.
 */
export function mapBusinessModulesToWorkspaces(
  businessResult: BusinessRuntimeExecutionResult | undefined,
  options: MapTenantToBusinessContextOptions,
  existing?: readonly BusinessContextWorkspaceRef[]
): BusinessContextWorkspaceRef[] {
  const fromRuntime =
    businessResult?.modules.map((item) => ({
      workspaceId: `workspace-${item.moduleId}`,
      label: item.name,
      moduleId: item.moduleId,
      active: item.available
    })) ?? [];

  if (options.operation === 'mapWorkspace' && options.workspaceId) {
    const explicit: BusinessContextWorkspaceRef = {
      workspaceId: options.workspaceId,
      label: options.workspaceLabel || options.workspaceId,
      moduleId: options.moduleIds?.[0],
      active: true
    };
    const withoutDup = fromRuntime.filter(
      (item) => item.workspaceId !== explicit.workspaceId
    );
    return [explicit, ...withoutDup];
  }

  if (fromRuntime.length > 0) {
    return fromRuntime;
  }

  return existing ? existing.map((item) => ({ ...item })) : [];
}

/**
 * Tenant Session Bridge + Business Runtime → BusinessContextModule.
 */
export function mapTenantBridgeResultToBusinessContextModule(
  tenantBridgeResult: TenantSessionBridgeResult | undefined,
  businessResult: BusinessRuntimeExecutionResult | undefined,
  options: MapTenantToBusinessContextOptions
): BusinessContextModule {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const existing = options.existingModule;
  const ids = resolveBusinessContextIdentifiers(tenantBridgeResult, options);

  const runtimeModuleIds =
    businessResult?.modules.map((item) => item.moduleId) ?? [];
  const moduleIds =
    options.moduleIds && options.moduleIds.length > 0
      ? [...options.moduleIds]
      : runtimeModuleIds.length > 0
        ? runtimeModuleIds
        : existing
          ? [...existing.moduleIds]
          : [];

  const workspaces = mapBusinessModulesToWorkspaces(
    businessResult,
    options,
    existing?.workspaces
  );

  const status = mapToBusinessContextStatus(
    Boolean(tenantBridgeResult?.success),
    Boolean(businessResult?.summary.success),
    options.operation
  );

  return {
    id: ids.contextModuleId,
    businessId: ids.businessId,
    tenantId: ids.tenantId,
    displayName: ids.displayName,
    status,
    workspaces: Object.freeze(workspaces),
    moduleIds: Object.freeze(moduleIds),
    sessionId: ids.sessionId,
    identityId: ids.identityId,
    tenantBindingId: ids.tenantBindingId,
    order: options.order ?? existing?.order ?? 100,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso
  };
}

/**
 * BusinessContextModule → binding.
 */
export function createBusinessContextBridgeBindingFromModule(
  module: BusinessContextModule,
  operation: BusinessContextBridgeOperation,
  existing?: BusinessContextBridgeBinding
): BusinessContextBridgeBinding {
  const nowIso = new Date().toISOString();
  return {
    id: existing?.id || `business-bridge-${module.id}`,
    businessId: module.businessId,
    tenantId: module.tenantId,
    businessContextModuleId: module.id,
    tenantBridgeBindingId: module.tenantBindingId,
    sessionId: module.sessionId,
    identityId: module.identityId,
    workspaceCount: module.workspaces.length,
    moduleCount: module.moduleIds.length,
    order: existing?.order ?? module.order,
    createdAt: existing?.createdAt || module.createdAt,
    updatedAt: nowIso,
    lastOperation: operation
  };
}

/**
 * Upstream issues → bridge issues.
 */
export function mapUpstreamIssuesToBusinessContextBridgeIssues(
  tenantBridgeResult?: TenantSessionBridgeResult,
  businessResult?: BusinessRuntimeExecutionResult
): BusinessContextBridgeValidationIssue[] {
  const issues: BusinessContextBridgeValidationIssue[] = [];
  if (tenantBridgeResult) {
    for (const issue of tenantBridgeResult.validationIssues) {
      issues.push({
        code: issue.code,
        message: issue.message,
        severity: issue.severity
      });
    }
  }
  if (businessResult) {
    for (const issue of businessResult.validationIssues) {
      issues.push({
        code: issue.code,
        message: issue.message,
        severity: issue.severity
      });
    }
  }
  return issues;
}

/**
 * Projeksiyon yardımcı.
 */
export function projectMappedBusinessContextModule(
  module: BusinessContextModule
): ReturnType<typeof toBusinessContextProjection> {
  return toBusinessContextProjection(module);
}
