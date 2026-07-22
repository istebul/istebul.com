/**
 * İSTEBUL Identity — Authentication Session Bridge (EPIC-301C).
 *
 * Architecture Freeze — AuthenticationRuntime / SessionRuntime /
 * SupabaseAuthenticationProvider değiştirilmez.
 */

export type {
  AuthenticationSessionBridgeOperation,
  AuthenticationSessionBridgeContext
} from './AuthenticationSessionBridgeContext';

export {
  createAuthenticationSessionBridgeContext,
  resolveBridgeProviderContext,
  mapBridgeOperationToProviderOperation
} from './AuthenticationSessionBridgeContext';

export type {
  AuthenticationSessionBridgeValidationIssue,
  AuthenticationSessionBridgeSummaryItem,
  AuthenticationSessionBridgeTelemetry,
  AuthenticationSessionBridgeResult,
  CreateAuthenticationSessionBridgeResultInput
} from './AuthenticationSessionBridgeResult';

export {
  createAuthenticationSessionBridgeResult,
  PIPELINE_BAG_AUTHENTICATION_SESSION_BRIDGE_RESULT_KEY
} from './AuthenticationSessionBridgeResult';

export type { AuthenticationSessionBridgeBinding } from './AuthenticationSessionBridgeRegistry';

export {
  AuthenticationSessionBridgeRegistry,
  AuthenticationSessionBridgeRegistryRuntime,
  createAuthenticationSessionBridgeRegistry,
  createAuthenticationSessionBridgeRegistryRuntime
} from './AuthenticationSessionBridgeRegistry';

export type { MapAuthenticationToSessionOptions } from './authenticationSessionBridgeMapping';

export {
  mapAuthenticationStatusToSessionState,
  resolveSessionIdentifiers,
  mapAuthenticationProviderResultToSessionModule,
  createBridgeBindingFromSessionModule,
  mapProviderIssuesToBridgeIssues,
  projectMappedSessionModule
} from './authenticationSessionBridgeMapping';

export type { AuthenticationSessionBridgeDependencies } from './AuthenticationSessionBridge';

export {
  AuthenticationSessionBridge,
  createAuthenticationSessionBridge
} from './AuthenticationSessionBridge';
