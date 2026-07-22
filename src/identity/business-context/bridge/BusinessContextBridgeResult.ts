/**
 * İSTEBUL Identity — BusinessContextBridgeResult (EPIC-302D).
 */

import type { TenantSessionBridgeResult } from '../../tenant-isolation/bridge/TenantSessionBridgeResult';
import type { BusinessRuntimeExecutionResult } from './BusinessRuntimePort';
import type {
  BusinessContextModule,
  BusinessContextProjection
} from './BusinessContextModule';
import type { BusinessContextBridgeOperation } from './BusinessContextBridgeContext';
import type { BusinessContextBridgeBinding } from './BusinessContextBridgeRegistry';

/**
 * Bridge doğrulama bulgusu.
 */
export interface BusinessContextBridgeValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Bridge özet öğesi.
 */
export interface BusinessContextBridgeSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Bridge telemetrisi.
 */
export interface BusinessContextBridgeTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Business context sayısı */
  businessContextCount: number;
  /** Workspace mapping sayısı */
  workspaceMappingCount: number;
  /** Validation sayısı */
  validationCount: number;
  /** Refresh sayısı */
  refreshCount: number;
  /** Özet öğe sayısı */
  summaryCount: number;
  /** Çalıştırılan operasyon */
  operation: BusinessContextBridgeOperation;
}

/**
 * Business Context Bridge çıktısı.
 */
export interface BusinessContextBridgeResult {
  /** Operasyon başarılı mı */
  success: boolean;
  /** Bridge operasyonu */
  operation: BusinessContextBridgeOperation;
  /** Upstream tenant session bridge sonucu */
  tenantBridgeResult?: TenantSessionBridgeResult;
  /** Downstream business runtime sonucu */
  businessRuntimeResult?: BusinessRuntimeExecutionResult;
  /** Senkronize edilen business context modülü */
  businessContextModule?: BusinessContextModule;
  /** Business context projeksiyonu */
  businessContextProjection?: BusinessContextProjection;
  /** Bridge binding */
  binding?: BusinessContextBridgeBinding;
  /** Doğrulama bulguları */
  validationIssues: readonly BusinessContextBridgeValidationIssue[];
  /** Özet öğeleri */
  summaryItems: readonly BusinessContextBridgeSummaryItem[];
  /** Telemetri */
  telemetry: BusinessContextBridgeTelemetry;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

export interface CreateBusinessContextBridgeResultInput {
  success: boolean;
  operation: BusinessContextBridgeOperation;
  tenantBridgeResult?: TenantSessionBridgeResult;
  businessRuntimeResult?: BusinessRuntimeExecutionResult;
  businessContextModule?: BusinessContextModule;
  businessContextProjection?: BusinessContextProjection;
  binding?: BusinessContextBridgeBinding;
  validationIssues?: readonly BusinessContextBridgeValidationIssue[];
  summaryItems?: readonly BusinessContextBridgeSummaryItem[];
  telemetry: BusinessContextBridgeTelemetry;
  bag?: Record<string, unknown>;
}

/**
 * BusinessContextBridgeResult üretir.
 */
export function createBusinessContextBridgeResult(
  input: CreateBusinessContextBridgeResultInput
): BusinessContextBridgeResult {
  return {
    success: input.success,
    operation: input.operation,
    tenantBridgeResult: input.tenantBridgeResult,
    businessRuntimeResult: input.businessRuntimeResult,
    businessContextModule: input.businessContextModule
      ? cloneBusinessContextModule(input.businessContextModule)
      : undefined,
    businessContextProjection: input.businessContextProjection
      ? { ...input.businessContextProjection }
      : undefined,
    binding: input.binding ? { ...input.binding } : undefined,
    validationIssues: Object.freeze([...(input.validationIssues ?? [])]),
    summaryItems: Object.freeze([...(input.summaryItems ?? [])]),
    telemetry: { ...input.telemetry },
    bag: input.bag ? { ...input.bag } : undefined
  };
}

function cloneBusinessContextModule(
  module: BusinessContextModule
): BusinessContextModule {
  return {
    ...module,
    workspaces: Object.freeze(module.workspaces.map((item) => ({ ...item }))),
    moduleIds: Object.freeze([...module.moduleIds])
  };
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_BUSINESS_CONTEXT_BRIDGE_RESULT_KEY =
  'businessContextBridgeResult' as const;
