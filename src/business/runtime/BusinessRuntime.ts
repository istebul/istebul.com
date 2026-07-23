/**
 * EPIC-570 — BusinessRuntime orchestrator.
 *
 * Pipeline:
 *   Context → ProviderResolver → (optional cache) → Intelligence Engine →
 *   RuntimeHealth + Telemetry
 *
 * Provider selection goes through ProviderResolver only.
 * Mock remains the default until explicitly configured.
 * Does not modify UI, API, auth, or database schema.
 */

import { nowMs, startStageTimer, endStageTimer } from './timing';
import {
  runBusinessIntelligenceEngine,
  type BusinessAdvisorResultWithHealth
} from '../intelligence/pipeline/BusinessIntelligenceEngine';
import type { ProviderResolver } from '../providers/core/ProviderResolver';
import type { ProviderResolveResult } from '../providers/core/ProviderResolver';
import type { BusinessRuntimeContext } from './BusinessRuntimeContext';
import {
  buildRuntimeCacheKey,
  type RuntimeCacheStore
} from './RuntimeCache';
import {
  buildRuntimeHealth,
  createIdleRuntimeHealth,
  type RuntimeHealth,
  type RuntimeProviderLifecycle
} from './RuntimeHealth';
import {
  DEFAULT_RUNTIME_CACHE_TTL_MS,
  DEFAULT_RUNTIME_TIMEOUT_MS,
  type BusinessRuntimeResult,
  type BusinessRuntimeTelemetry
} from './BusinessRuntimeResult';

export interface BusinessRuntimeDeps {
  resolver: ProviderResolver;
  cache: RuntimeCacheStore<BusinessRuntimeResult>;
  defaultTimeoutMs?: number;
  defaultCacheTtlMs?: number;
}

function validateContext(context: BusinessRuntimeContext): void {
  if (!context || typeof context !== 'object') {
    throw new Error('BusinessRuntimeContext is required.');
  }
  if (!context.tenantId || typeof context.tenantId !== 'string' || !context.tenantId.trim()) {
    throw new Error('BusinessRuntimeContext.tenantId is required.');
  }
  if (context.locale !== 'tr' && context.locale !== 'en') {
    throw new Error('BusinessRuntimeContext.locale must be "tr" or "en".');
  }
}

/**
 * Production runtime layer between Business UI and ProviderResolver.
 */
export class BusinessRuntime {
  private readonly resolver: ProviderResolver;
  private readonly cache: RuntimeCacheStore<BusinessRuntimeResult>;
  private readonly defaultTimeoutMs: number;
  private readonly defaultCacheTtlMs: number;
  private lastHealth: RuntimeHealth = createIdleRuntimeHealth();
  private lifecycle: RuntimeProviderLifecycle = 'idle';

  constructor(deps: BusinessRuntimeDeps) {
    this.resolver = deps.resolver;
    this.cache = deps.cache;
    this.defaultTimeoutMs = deps.defaultTimeoutMs ?? DEFAULT_RUNTIME_TIMEOUT_MS;
    this.defaultCacheTtlMs = deps.defaultCacheTtlMs ?? DEFAULT_RUNTIME_CACHE_TTL_MS;
  }

  /** Last known runtime health (idle before first execute). */
  getHealth(): RuntimeHealth {
    return this.lastHealth;
  }

  /** Current provider lifecycle phase. */
  getLifecycle(): RuntimeProviderLifecycle {
    return this.lifecycle;
  }

  /** Clear the runtime cache abstraction. */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Execute the intelligence pipeline for a tenant-aware context.
   * Provider selection uses ProviderResolver only.
   */
  execute(context: BusinessRuntimeContext): BusinessRuntimeResult {
    validateContext(context);

    const timer = startStageTimer();
    const startMark = nowMs();
    const requestedKind = context.providerKind ?? 'mock';
    const timeoutMs = context.timeoutMs ?? this.defaultTimeoutMs;
    const cacheEnabled = Boolean(context.cache?.enabled);
    const cacheKey = buildRuntimeCacheKey({
      tenantId: context.tenantId.trim(),
      providerKind: requestedKind,
      locale: context.locale
    });

    if (cacheEnabled) {
      const hit = this.cache.get(cacheKey);
      if (hit) {
        const cached: BusinessRuntimeResult = {
          ...hit,
          health: buildRuntimeHealth({
            lifecycle: 'complete',
            providerReady: hit.resolve.status.ready,
            requestedProviderKind: hit.telemetry.requestedProviderKind,
            resolvedProviderKind: hit.telemetry.resolvedProviderKind,
            fellBackToMock: hit.telemetry.fellBackToMock,
            timedOut: false,
            cacheHit: true,
            tenantId: context.tenantId.trim()
          }),
          telemetry: {
            ...hit.telemetry,
            cacheHit: true,
            durationMs: 0,
            providerResolveMs: 0,
            pipelineMs: 0,
            startedAt: timer.startedAt,
            endedAt: timer.startedAt
          }
        };
        this.lifecycle = 'complete';
        this.lastHealth = cached.health;
        return Object.freeze(cached);
      }
    }

    this.lifecycle = 'resolving';
    const resolveStarted = nowMs();
    let resolveResult: ProviderResolveResult;
    try {
      resolveResult = this.resolver.resolve({
        kind: requestedKind,
        strict: context.strictProvider
      });
    } catch (error) {
      this.lifecycle = 'failed';
      const message = error instanceof Error ? error.message : String(error);
      this.lastHealth = buildRuntimeHealth({
        lifecycle: 'failed',
        providerReady: false,
        requestedProviderKind: requestedKind,
        resolvedProviderKind: requestedKind,
        fellBackToMock: false,
        timedOut: false,
        cacheHit: false,
        tenantId: context.tenantId.trim(),
        errorMessage: message
      });
      throw error;
    }
    const providerResolveMs = Math.max(0, Math.round(nowMs() - resolveStarted));

    this.lifecycle = 'executing';

    const pipelineStarted = nowMs();
    let advisor: BusinessAdvisorResultWithHealth;
    try {
      advisor = runBusinessIntelligenceEngine({
        dataProvider: resolveResult.provider
      });
    } catch (error) {
      this.lifecycle = 'failed';
      const message = error instanceof Error ? error.message : String(error);
      this.lastHealth = buildRuntimeHealth({
        lifecycle: 'failed',
        providerReady: resolveResult.status.ready,
        requestedProviderKind: resolveResult.requestedKind,
        resolvedProviderKind: resolveResult.resolvedKind,
        fellBackToMock: resolveResult.fellBackToMock,
        timedOut: false,
        cacheHit: false,
        tenantId: context.tenantId.trim(),
        errorMessage: message
      });
      throw error;
    }
    const pipelineMs = Math.max(0, Math.round(nowMs() - pipelineStarted));

    const { endedAt, durationMs } = endStageTimer(timer);
    const totalMs = durationMs || Math.max(0, Math.round(nowMs() - startMark));
    const timedOut = timeoutMs <= 0 || totalMs > timeoutMs;

    const telemetry: BusinessRuntimeTelemetry = Object.freeze({
      durationMs: totalMs,
      startedAt: timer.startedAt,
      endedAt,
      providerResolveMs,
      pipelineMs,
      cacheHit: false,
      timedOut,
      tenantId: context.tenantId.trim(),
      locale: context.locale,
      requestedProviderKind: resolveResult.requestedKind,
      resolvedProviderKind: resolveResult.resolvedKind,
      fellBackToMock: resolveResult.fellBackToMock,
      ...(context.actorId ? { actorId: context.actorId } : {})
    });

    this.lifecycle = 'complete';
    const health = buildRuntimeHealth({
      lifecycle: 'complete',
      providerReady: resolveResult.status.ready || resolveResult.fellBackToMock,
      requestedProviderKind: resolveResult.requestedKind,
      resolvedProviderKind: resolveResult.resolvedKind,
      fellBackToMock: resolveResult.fellBackToMock,
      timedOut,
      cacheHit: false,
      tenantId: context.tenantId.trim(),
      checkedAt: endedAt
    });
    this.lastHealth = health;

    const result: BusinessRuntimeResult = Object.freeze({
      advisor,
      health,
      telemetry,
      resolve: resolveResult
    });

    if (cacheEnabled) {
      const ttl = context.cache?.ttlMs ?? this.defaultCacheTtlMs;
      this.cache.set(cacheKey, result, ttl);
    }

    return result;
  }
}

export default BusinessRuntime;
