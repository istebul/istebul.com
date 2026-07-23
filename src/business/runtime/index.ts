/**
 * EPIC-570 — Business Runtime Integration barrel.
 *
 * Business UI → BusinessRuntime → ProviderResolver → Providers →
 * Analytics → Scoring → Health → KPI → Events → Metrics → Insights →
 * Recommendations → Advisor
 */

export type { BusinessRuntimeContext, BusinessRuntimeCacheOptions } from './BusinessRuntimeContext';
export { createBusinessRuntimeContext } from './BusinessRuntimeContext';

export type {
  RuntimeHealth,
  RuntimeHealthStatus,
  RuntimeProviderLifecycle,
  BuildRuntimeHealthInput
} from './RuntimeHealth';
export { buildRuntimeHealth, createIdleRuntimeHealth } from './RuntimeHealth';

export type { RuntimeCacheStore, RuntimeCacheEntry } from './RuntimeCache';
export {
  InMemoryRuntimeCache,
  createInMemoryRuntimeCache,
  buildRuntimeCacheKey
} from './RuntimeCache';

export type {
  BusinessRuntimeResult,
  BusinessRuntimeTelemetry
} from './BusinessRuntimeResult';
export {
  DEFAULT_RUNTIME_TIMEOUT_MS,
  DEFAULT_RUNTIME_CACHE_TTL_MS
} from './BusinessRuntimeResult';

export { BusinessRuntime } from './BusinessRuntime';
export type { BusinessRuntimeDeps } from './BusinessRuntime';

export {
  createBusinessRuntime,
  getDefaultBusinessRuntime
} from './BusinessRuntimeFactory';
export type { BusinessRuntimeFactoryOptions } from './BusinessRuntimeFactory';

export { nowMs, startStageTimer, endStageTimer } from './timing';
export type { StageTimer } from './timing';
