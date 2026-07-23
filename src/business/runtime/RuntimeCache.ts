/**
 * EPIC-570 — Runtime cache abstraction (in-memory).
 *
 * Optional; disabled by default. No persistence, no network.
 */

export interface RuntimeCacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Minimal cache store contract for BusinessRuntime.
 */
export interface RuntimeCacheStore<T = unknown> {
  get(key: string): T | undefined;
  set(key: string, value: T, ttlMs: number): void;
  delete(key: string): void;
  clear(): void;
  size(): number;
}

/**
 * In-memory TTL cache used by BusinessRuntime.
 */
export class InMemoryRuntimeCache<T = unknown> implements RuntimeCacheStore<T> {
  private readonly store = new Map<string, RuntimeCacheEntry<T>>();

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    const ttl = Math.max(0, Math.floor(ttlMs));
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.expiresAt) this.store.delete(key);
    }
    return this.store.size;
  }
}

export function createInMemoryRuntimeCache<T = unknown>(): InMemoryRuntimeCache<T> {
  return new InMemoryRuntimeCache<T>();
}

/**
 * Stable cache key for tenant-aware runtime executions.
 */
export function buildRuntimeCacheKey(parts: {
  tenantId: string;
  providerKind: string;
  locale: string;
}): string {
  return `biz-runtime:${parts.tenantId}:${parts.providerKind}:${parts.locale}`;
}
