/**
 * İSTEBUL Identity — Business Context Bridge (EPIC-302D).
 *
 * Architecture Freeze — Tenant Runtime / Business Runtime / Business Admin /
 * Tenant Session Bridge değiştirilmez.
 */

export type {
  BusinessRuntimeExecutionContext,
  BusinessRuntimeModuleProjection,
  BusinessRuntimeExecutionResult,
  BusinessRuntimePort
} from './BusinessRuntimePort';

export type {
  BusinessContextStatus,
  BusinessContextWorkspaceRef,
  BusinessContextModule,
  BusinessContextProjection
} from './BusinessContextModule';

export { toBusinessContextProjection } from './BusinessContextModule';

export type {
  BusinessContextBridgeOperation,
  BusinessContextBridgeContext
} from './BusinessContextBridgeContext';

export {
  createBusinessContextBridgeContext,
  resolveTenantSessionBridgeContextFromBusiness,
  mapBusinessBridgeOperationToTenantBridgeOperation
} from './BusinessContextBridgeContext';

export type {
  BusinessContextBridgeValidationIssue,
  BusinessContextBridgeSummaryItem,
  BusinessContextBridgeTelemetry,
  BusinessContextBridgeResult,
  CreateBusinessContextBridgeResultInput
} from './BusinessContextBridgeResult';

export {
  createBusinessContextBridgeResult,
  PIPELINE_BAG_BUSINESS_CONTEXT_BRIDGE_RESULT_KEY
} from './BusinessContextBridgeResult';

export type { BusinessContextBridgeBinding } from './BusinessContextBridgeRegistry';

export {
  BusinessContextBridgeRegistry,
  BusinessContextBridgeRegistryRuntime,
  createBusinessContextBridgeRegistry,
  createBusinessContextBridgeRegistryRuntime
} from './BusinessContextBridgeRegistry';

export type { MapTenantToBusinessContextOptions } from './businessContextBridgeMapping';

export {
  mapToBusinessContextStatus,
  resolveBusinessContextIdentifiers,
  mapBusinessModulesToWorkspaces,
  mapTenantBridgeResultToBusinessContextModule,
  createBusinessContextBridgeBindingFromModule,
  mapUpstreamIssuesToBusinessContextBridgeIssues,
  projectMappedBusinessContextModule
} from './businessContextBridgeMapping';

export type { BusinessContextBridgeDependencies } from './BusinessContextBridge';

export {
  BusinessContextBridge,
  createBusinessContextBridge
} from './BusinessContextBridge';
