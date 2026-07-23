/** Lifecycle status codes for Business data providers. */
export type ProviderStatusCode =
  | 'ready'
  | 'stub'
  | 'unavailable'
  | 'misconfigured';

/**
 * Runtime status for a provider adapter.
 * Live adapters remain `stub` / `unavailable` until wired (no network/DB).
 */
export interface ProviderStatus {
  kind: string;
  code: ProviderStatusCode;
  /** True only when getSnapshot() may return live data. */
  ready: boolean;
  message: string;
  checkedAt: string;
}
