/**
 * İSTEBUL Identity — IdentityBridgeResult (EPIC-301D).
 */

import type { AuthenticationProviderResult } from '../authentication/adapters/AuthenticationProviderResult';
import type { AuthenticationSessionBridgeResult } from '../authentication/bridge/AuthenticationSessionBridgeResult';
import type {
  IdentityModule,
  IdentityProjection
} from '../runtime/IdentityModule';
import type { IdentityResult } from '../runtime/IdentityResult';
import type { IdentityBridgeOperation } from './IdentityBridgeContext';
import type { IdentityBridgeBinding } from './IdentityBridgeRegistry';

/**
 * Identity Bridge doğrulama bulgusu.
 */
export interface IdentityBridgeValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Identity Bridge özet öğesi.
 */
export interface IdentityBridgeSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Identity Bridge telemetrisi.
 */
export interface IdentityBridgeTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Identity senkronizasyon sayısı */
  identitySynchronizationCount: number;
  /** Session mapping sayısı */
  sessionMappingCount: number;
  /** Authentication mapping sayısı */
  authenticationMappingCount: number;
  /** Özet öğe sayısı */
  summaryCount: number;
  /** Çalıştırılan operasyon */
  operation: IdentityBridgeOperation;
}

/**
 * Identity Bridge çıktısı.
 */
export interface IdentityBridgeResult {
  /** Operasyon başarılı mı */
  success: boolean;
  /** Bridge operasyonu */
  operation: IdentityBridgeOperation;
  /** Upstream provider sonucu */
  providerResult?: AuthenticationProviderResult;
  /** Upstream session bridge sonucu */
  sessionBridgeResult?: AuthenticationSessionBridgeResult;
  /** Downstream identity runtime sonucu */
  identityResult?: IdentityResult;
  /** Senkronize edilen identity modülü */
  identityModule?: IdentityModule;
  /** Identity projeksiyonu */
  identityProjection?: IdentityProjection;
  /** Bridge binding */
  binding?: IdentityBridgeBinding;
  /** Doğrulama bulguları */
  validationIssues: readonly IdentityBridgeValidationIssue[];
  /** Özet öğeleri */
  summaryItems: readonly IdentityBridgeSummaryItem[];
  /** Telemetri */
  telemetry: IdentityBridgeTelemetry;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

export interface CreateIdentityBridgeResultInput {
  success: boolean;
  operation: IdentityBridgeOperation;
  providerResult?: AuthenticationProviderResult;
  sessionBridgeResult?: AuthenticationSessionBridgeResult;
  identityResult?: IdentityResult;
  identityModule?: IdentityModule;
  identityProjection?: IdentityProjection;
  binding?: IdentityBridgeBinding;
  validationIssues?: readonly IdentityBridgeValidationIssue[];
  summaryItems?: readonly IdentityBridgeSummaryItem[];
  telemetry: IdentityBridgeTelemetry;
  bag?: Record<string, unknown>;
}

/**
 * IdentityBridgeResult üretir.
 */
export function createIdentityBridgeResult(
  input: CreateIdentityBridgeResultInput
): IdentityBridgeResult {
  return {
    success: input.success,
    operation: input.operation,
    providerResult: input.providerResult,
    sessionBridgeResult: input.sessionBridgeResult,
    identityResult: input.identityResult,
    identityModule: input.identityModule
      ? cloneIdentityModule(input.identityModule)
      : undefined,
    identityProjection: input.identityProjection
      ? { ...input.identityProjection }
      : undefined,
    binding: input.binding ? { ...input.binding } : undefined,
    validationIssues: Object.freeze([...(input.validationIssues ?? [])]),
    summaryItems: Object.freeze([...(input.summaryItems ?? [])]),
    telemetry: { ...input.telemetry },
    bag: input.bag ? { ...input.bag } : undefined
  };
}

function cloneIdentityModule(module: IdentityModule): IdentityModule {
  return {
    ...module,
    user: { ...module.user },
    tenant: { ...module.tenant },
    roles: Object.freeze(module.roles.map((role) => ({ ...role }))),
    permissions: Object.freeze(
      module.permissions.map((permission) => ({ ...permission }))
    ),
    claims: Object.freeze({ ...module.claims }),
    sessionReference: { ...module.sessionReference }
  };
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_IDENTITY_BRIDGE_RESULT_KEY =
  'identityBridgeResult' as const;
