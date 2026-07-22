/**
 * İSTEBUL Identity — AuthenticationSessionBridgeResult (EPIC-301C).
 */

import type { AuthenticationProviderResult } from '../adapters/AuthenticationProviderResult';
import type {
  SessionModule,
  SessionProjection
} from '../../session/runtime/SessionModule';
import type { SessionResult } from '../../session/runtime/SessionResult';
import type { AuthenticationSessionBridgeOperation } from './AuthenticationSessionBridgeContext';
import type { AuthenticationSessionBridgeBinding } from './AuthenticationSessionBridgeRegistry';

/**
 * Bridge doğrulama bulgusu.
 */
export interface AuthenticationSessionBridgeValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Bridge özet öğesi.
 */
export interface AuthenticationSessionBridgeSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Bridge telemetrisi.
 */
export interface AuthenticationSessionBridgeTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Session senkronizasyon sayısı */
  sessionSynchronizationCount: number;
  /** Refresh sayısı */
  refreshCount: number;
  /** Validation sayısı */
  validationCount: number;
  /** Özet öğe sayısı */
  summaryCount: number;
  /** Çalıştırılan operasyon */
  operation: AuthenticationSessionBridgeOperation;
}

/**
 * Authentication Session Bridge çıktısı.
 */
export interface AuthenticationSessionBridgeResult {
  /** Operasyon başarılı mı */
  success: boolean;
  /** Bridge operasyonu */
  operation: AuthenticationSessionBridgeOperation;
  /** Upstream provider sonucu */
  providerResult?: AuthenticationProviderResult;
  /** Downstream session runtime sonucu */
  sessionResult?: SessionResult;
  /** Senkronize edilen session modülü */
  sessionModule?: SessionModule;
  /** Session projeksiyonu */
  sessionProjection?: SessionProjection;
  /** Bridge binding */
  binding?: AuthenticationSessionBridgeBinding;
  /** Doğrulama bulguları */
  validationIssues: readonly AuthenticationSessionBridgeValidationIssue[];
  /** Özet öğeleri */
  summaryItems: readonly AuthenticationSessionBridgeSummaryItem[];
  /** Telemetri */
  telemetry: AuthenticationSessionBridgeTelemetry;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

export interface CreateAuthenticationSessionBridgeResultInput {
  success: boolean;
  operation: AuthenticationSessionBridgeOperation;
  providerResult?: AuthenticationProviderResult;
  sessionResult?: SessionResult;
  sessionModule?: SessionModule;
  sessionProjection?: SessionProjection;
  binding?: AuthenticationSessionBridgeBinding;
  validationIssues?: readonly AuthenticationSessionBridgeValidationIssue[];
  summaryItems?: readonly AuthenticationSessionBridgeSummaryItem[];
  telemetry: AuthenticationSessionBridgeTelemetry;
  bag?: Record<string, unknown>;
}

/**
 * AuthenticationSessionBridgeResult üretir.
 */
export function createAuthenticationSessionBridgeResult(
  input: CreateAuthenticationSessionBridgeResultInput
): AuthenticationSessionBridgeResult {
  return {
    success: input.success,
    operation: input.operation,
    providerResult: input.providerResult,
    sessionResult: input.sessionResult,
    sessionModule: input.sessionModule
      ? {
          ...input.sessionModule,
          session: {
            ...input.sessionModule.session,
            lifetime: { ...input.sessionModule.session.lifetime },
            expiration: { ...input.sessionModule.session.expiration },
            renewalReference: {
              ...input.sessionModule.session.renewalReference
            },
            activity: { ...input.sessionModule.session.activity },
            deviceReference: { ...input.sessionModule.session.deviceReference }
          }
        }
      : undefined,
    sessionProjection: input.sessionProjection
      ? { ...input.sessionProjection }
      : undefined,
    binding: input.binding ? { ...input.binding } : undefined,
    validationIssues: Object.freeze([...(input.validationIssues ?? [])]),
    summaryItems: Object.freeze([...(input.summaryItems ?? [])]),
    telemetry: { ...input.telemetry },
    bag: input.bag ? { ...input.bag } : undefined
  };
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_AUTHENTICATION_SESSION_BRIDGE_RESULT_KEY =
  'authenticationSessionBridgeResult' as const;
