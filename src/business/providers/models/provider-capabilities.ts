import type { BusinessProviderKind } from '../../types/business-provider';

/**
 * Declared capabilities for a Business data provider adapter.
 * Used by ProviderResolver — does not imply a live connection.
 */
export interface ProviderCapabilities {
  kind: BusinessProviderKind;
  /** True when the adapter is intended for live (non-mock) data. */
  live: boolean;
  supportsRealtime: boolean;
  supportsHistorical: boolean;
  requiresAuth: boolean;
  requiresNetwork: boolean;
  label: string;
  description: string;
}
