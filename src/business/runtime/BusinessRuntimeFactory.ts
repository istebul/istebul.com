/**
 * EPIC-570 — BusinessRuntimeFactory.
 *
 * Builds BusinessRuntime instances. Provider selection always goes through
 * ProviderResolver (mock default until explicitly configured).
 */

import {
  createProviderResolver,
  type ProviderResolver
} from '../providers/core/ProviderResolver';
import { BusinessRuntime, type BusinessRuntimeDeps } from './BusinessRuntime';
import {
  createInMemoryRuntimeCache,
  type RuntimeCacheStore
} from './RuntimeCache';
import type { BusinessRuntimeResult } from './BusinessRuntimeResult';
import {
  DEFAULT_RUNTIME_CACHE_TTL_MS,
  DEFAULT_RUNTIME_TIMEOUT_MS
} from './BusinessRuntimeResult';

export interface BusinessRuntimeFactoryOptions {
  /** Optional injected ProviderResolver (tests). Default: createProviderResolver(). */
  resolver?: ProviderResolver;
  /** Optional cache store. Default: in-memory TTL cache. */
  cache?: RuntimeCacheStore<BusinessRuntimeResult>;
  /** Default soft timeout (ms). */
  defaultTimeoutMs?: number;
  /** Default cache TTL (ms) when cache.enabled without ttlMs. */
  defaultCacheTtlMs?: number;
}

/**
 * Create a BusinessRuntime. Mock remains the default provider path via Resolver.
 */
export function createBusinessRuntime(
  options: BusinessRuntimeFactoryOptions = {}
): BusinessRuntime {
  const deps: BusinessRuntimeDeps = {
    resolver: options.resolver ?? createProviderResolver(),
    cache: options.cache ?? createInMemoryRuntimeCache<BusinessRuntimeResult>(),
    defaultTimeoutMs: options.defaultTimeoutMs ?? DEFAULT_RUNTIME_TIMEOUT_MS,
    defaultCacheTtlMs: options.defaultCacheTtlMs ?? DEFAULT_RUNTIME_CACHE_TTL_MS
  };
  return new BusinessRuntime(deps);
}

/** Default runtime instance factory (mock provider path). */
export function getDefaultBusinessRuntime(): BusinessRuntime {
  return createBusinessRuntime();
}

export default createBusinessRuntime;
