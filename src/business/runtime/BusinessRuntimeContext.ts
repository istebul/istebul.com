/**
 * EPIC-570 — Business Runtime execution context.
 *
 * Tenant-aware input for BusinessRuntime. Does not change auth, API, or UI.
 */

import type { BusinessProviderKind } from '../types/business-provider';

/** Cache options for a single runtime execution. */
export interface BusinessRuntimeCacheOptions {
  /** When true, use the runtime cache abstraction. Default false. */
  enabled?: boolean;
  /** Entry time-to-live in milliseconds. Default applied by factory when omitted. */
  ttlMs?: number;
}

/**
 * Business Runtime execution context.
 * Provider selection always goes through ProviderResolver (kind defaults to mock).
 */
export interface BusinessRuntimeContext {
  /** Tenant (işletme) identity — required for tenant-aware execution. */
  tenantId: string;
  /** Locale for future localisation; default `tr`. */
  locale: 'tr' | 'en';
  /**
   * Requested provider kind. Defaults to `mock`.
   * Live kinds fall back to mock unless `strictProvider` is set.
   */
  providerKind?: BusinessProviderKind;
  /**
   * When true, unready live providers throw instead of falling back to mock.
   * Default false — preserves prior EPIC behaviour.
   */
  strictProvider?: boolean;
  /** Soft timeout budget in ms (sync pipeline records timedOut when exceeded). */
  timeoutMs?: number;
  /** Optional in-memory cache controls. */
  cache?: BusinessRuntimeCacheOptions;
  /** Optional actor for telemetry/traceability. */
  actorId?: string;
  /** Opaque bag for future extensions (no schema coupling). */
  bag?: Record<string, unknown>;
}

/**
 * Build a runtime context with locale default `tr`.
 */
export function createBusinessRuntimeContext(
  partial: Omit<BusinessRuntimeContext, 'locale' | 'tenantId'> & {
    tenantId: string;
    locale?: 'tr' | 'en';
  }
): BusinessRuntimeContext {
  const { locale, tenantId, ...rest } = partial;
  return {
    ...rest,
    tenantId,
    locale: locale ?? 'tr'
  };
}
