/**
 * İSTEBUL Identity — Tenant Session Bridge (EPIC-302C).
 *
 * Architecture Freeze — Tenant Isolation Runtime / TenantAdapter /
 * SupabaseTenantProvider değiştirilmez.
 */

export type {
  TenantSessionBridgeOperation,
  TenantSessionBridgeContext
} from './TenantSessionBridgeContext';

export {
  createTenantSessionBridgeContext,
  resolveTenantBridgeProviderContext,
  mapTenantBridgeOperationToProviderOperation
} from './TenantSessionBridgeContext';

export type {
  TenantSessionBridgeValidationIssue,
  TenantSessionBridgeSummaryItem,
  TenantSessionBridgeTelemetry,
  TenantSessionBridgeResult,
  CreateTenantSessionBridgeResultInput
} from './TenantSessionBridgeResult';

export {
  createTenantSessionBridgeResult,
  PIPELINE_BAG_TENANT_SESSION_BRIDGE_RESULT_KEY
} from './TenantSessionBridgeResult';

export type { TenantSessionBridgeBinding } from './TenantSessionBridgeRegistry';

export {
  TenantSessionBridgeRegistry,
  TenantSessionBridgeRegistryRuntime,
  createTenantSessionBridgeRegistry,
  createTenantSessionBridgeRegistryRuntime
} from './TenantSessionBridgeRegistry';

export type { MapTenantProviderToIsolationOptions } from './tenantSessionBridgeMapping';

export {
  mapTenantProviderStatusToDecisionOutcome,
  resolveTenantBridgeIdentifiers,
  mapTenantProviderResultToIsolationModule,
  createBridgeBindingFromIsolationModule,
  mapTenantProviderIssuesToBridgeIssues,
  projectMappedIsolationModule
} from './tenantSessionBridgeMapping';

export type { TenantSessionBridgeDependencies } from './TenantSessionBridge';

export {
  TenantSessionBridge,
  createTenantSessionBridge
} from './TenantSessionBridge';
