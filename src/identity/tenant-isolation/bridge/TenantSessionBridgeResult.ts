/**
 * İSTEBUL Identity — TenantSessionBridgeResult (EPIC-302C).
 */

import type { TenantProviderResult } from '../adapters/TenantProviderResult';
import type {
  TenantIsolationModule,
  TenantIsolationProjection
} from '../runtime/TenantIsolationModule';
import type { TenantIsolationResult } from '../runtime/TenantIsolationResult';
import type { TenantSessionBridgeOperation } from './TenantSessionBridgeContext';
import type { TenantSessionBridgeBinding } from './TenantSessionBridgeRegistry';

/**
 * Bridge doğrulama bulgusu.
 */
export interface TenantSessionBridgeValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Bridge özet öğesi.
 */
export interface TenantSessionBridgeSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Bridge telemetrisi.
 */
export interface TenantSessionBridgeTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Tenant senkronizasyon sayısı */
  tenantSynchronizationCount: number;
  /** Membership senkronizasyon sayısı */
  membershipSynchronizationCount: number;
  /** Validation sayısı */
  validationCount: number;
  /** Refresh sayısı */
  refreshCount: number;
  /** Özet öğe sayısı */
  summaryCount: number;
  /** Çalıştırılan operasyon */
  operation: TenantSessionBridgeOperation;
}

/**
 * Tenant Session Bridge çıktısı.
 */
export interface TenantSessionBridgeResult {
  /** Operasyon başarılı mı */
  success: boolean;
  /** Bridge operasyonu */
  operation: TenantSessionBridgeOperation;
  /** Upstream provider sonucu */
  providerResult?: TenantProviderResult;
  /** Downstream tenant isolation runtime sonucu */
  isolationResult?: TenantIsolationResult;
  /** Senkronize edilen isolation modülü */
  isolationModule?: TenantIsolationModule;
  /** Tenant isolation projeksiyonu */
  isolationProjection?: TenantIsolationProjection;
  /** Bridge binding */
  binding?: TenantSessionBridgeBinding;
  /** Doğrulama bulguları */
  validationIssues: readonly TenantSessionBridgeValidationIssue[];
  /** Özet öğeleri */
  summaryItems: readonly TenantSessionBridgeSummaryItem[];
  /** Telemetri */
  telemetry: TenantSessionBridgeTelemetry;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

export interface CreateTenantSessionBridgeResultInput {
  success: boolean;
  operation: TenantSessionBridgeOperation;
  providerResult?: TenantProviderResult;
  isolationResult?: TenantIsolationResult;
  isolationModule?: TenantIsolationModule;
  isolationProjection?: TenantIsolationProjection;
  binding?: TenantSessionBridgeBinding;
  validationIssues?: readonly TenantSessionBridgeValidationIssue[];
  summaryItems?: readonly TenantSessionBridgeSummaryItem[];
  telemetry: TenantSessionBridgeTelemetry;
  bag?: Record<string, unknown>;
}

/**
 * TenantSessionBridgeResult üretir.
 */
export function createTenantSessionBridgeResult(
  input: CreateTenantSessionBridgeResultInput
): TenantSessionBridgeResult {
  return {
    success: input.success,
    operation: input.operation,
    providerResult: input.providerResult,
    isolationResult: input.isolationResult,
    isolationModule: input.isolationModule
      ? cloneIsolationModule(input.isolationModule)
      : undefined,
    isolationProjection: input.isolationProjection
      ? { ...input.isolationProjection }
      : undefined,
    binding: input.binding ? { ...input.binding } : undefined,
    validationIssues: Object.freeze([...(input.validationIssues ?? [])]),
    summaryItems: Object.freeze([...(input.summaryItems ?? [])]),
    telemetry: { ...input.telemetry },
    bag: input.bag ? { ...input.bag } : undefined
  };
}

function cloneIsolationModule(
  module: TenantIsolationModule
): TenantIsolationModule {
  return {
    ...module,
    tenantIdentity: { ...module.tenantIdentity },
    boundary: { ...module.boundary },
    memberships: Object.freeze(module.memberships.map((item) => ({ ...item }))),
    scopes: Object.freeze(module.scopes.map((item) => ({ ...item }))),
    isolationRules: Object.freeze(
      module.isolationRules.map((item) => ({ ...item }))
    ),
    accessScope: {
      ...module.accessScope,
      allowedTenantIds: Object.freeze([...module.accessScope.allowedTenantIds])
    },
    decisions: Object.freeze(module.decisions.map((item) => ({ ...item })))
  };
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_TENANT_SESSION_BRIDGE_RESULT_KEY =
  'tenantSessionBridgeResult' as const;
