/**
 * İSTEBUL Identity — Identity Bridge (EPIC-301D).
 *
 * Architecture Freeze — Identity / Authentication / Session / Authorization /
 * Tenant Runtime, Authentication Adapter, Supabase Provider ve
 * Authentication Session Bridge değiştirilmez.
 */

export type {
  IdentityBridgeOperation,
  IdentityBridgeContext
} from './IdentityBridgeContext';

export {
  createIdentityBridgeContext,
  resolveIdentityBridgeProviderContext,
  mapIdentityBridgeOperationToSessionBridgeOperation,
  toAuthenticationSessionBridgeContextFromIdentity
} from './IdentityBridgeContext';

export type {
  IdentityBridgeValidationIssue,
  IdentityBridgeSummaryItem,
  IdentityBridgeTelemetry,
  IdentityBridgeResult,
  CreateIdentityBridgeResultInput
} from './IdentityBridgeResult';

export {
  createIdentityBridgeResult,
  PIPELINE_BAG_IDENTITY_BRIDGE_RESULT_KEY
} from './IdentityBridgeResult';

export type { IdentityBridgeBinding } from './IdentityBridgeRegistry';

export {
  IdentityBridgeRegistry,
  IdentityBridgeRegistryRuntime,
  createIdentityBridgeRegistry,
  createIdentityBridgeRegistryRuntime
} from './IdentityBridgeRegistry';

export type { MapToIdentityModuleOptions } from './identityBridgeMapping';

export {
  mapAuthenticationStatusToIdentityStatus,
  resolveIdentityIdentifiers,
  mapIntegrationResultsToIdentityModule,
  createIdentityBridgeBindingFromModule,
  mapIntegrationIssuesToIdentityBridgeIssues,
  projectMappedIdentityModule
} from './identityBridgeMapping';

export type { IdentityBridgeDependencies } from './IdentityBridge';

export { IdentityBridge, createIdentityBridge } from './IdentityBridge';
