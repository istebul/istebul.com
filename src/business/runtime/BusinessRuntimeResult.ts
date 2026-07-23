/**
 * EPIC-570 — BusinessRuntime result + telemetry contracts.
 */

import type { BusinessAdvisorResultWithHealth } from '../intelligence/pipeline/BusinessIntelligenceEngine';
import type { ProviderResolveResult } from '../providers/core/ProviderResolver';
import type { BusinessProviderKind } from '../types/business-provider';
import type { RuntimeHealth } from './RuntimeHealth';

export interface BusinessRuntimeTelemetry {
  durationMs: number;
  startedAt: string;
  endedAt: string;
  providerResolveMs: number;
  pipelineMs: number;
  cacheHit: boolean;
  timedOut: boolean;
  tenantId: string;
  locale: 'tr' | 'en';
  requestedProviderKind: BusinessProviderKind;
  resolvedProviderKind: BusinessProviderKind;
  fellBackToMock: boolean;
  actorId?: string;
}

/**
 * Full BusinessRuntime execution output.
 * Advisor payload shape matches `runBusinessIntelligenceEngine` (UI-identical).
 */
export interface BusinessRuntimeResult {
  advisor: BusinessAdvisorResultWithHealth;
  health: RuntimeHealth;
  telemetry: BusinessRuntimeTelemetry;
  /** ProviderResolver selection metadata. */
  resolve: ProviderResolveResult;
}

export const DEFAULT_RUNTIME_TIMEOUT_MS = 5_000;
export const DEFAULT_RUNTIME_CACHE_TTL_MS = 30_000;
