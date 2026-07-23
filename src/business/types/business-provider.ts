import type {
  BusinessCategoryMargin,
  BusinessDataPoint,
  RawBusinessData
} from '../intelligence/types/raw-business-data';
import type { ProviderCapabilities } from '../providers/models/provider-capabilities';
import type { ProviderStatus } from '../providers/models/provider-status';

/**
 * Supported Business data provider kinds.
 * Live kinds are foundation stubs (EPIC-560) — not connected.
 */
export type BusinessProviderKind = 'mock' | 'supabase' | 'erp' | 'garson-ai';

/**
 * Provider-based data access for Business Intelligence.
 * Live adapters must not call network, DB, auth, or tenant APIs until wired.
 */
export interface BusinessDataProvider {
  readonly kind: BusinessProviderKind;
  /** Returns a frozen business snapshot. */
  getSnapshot(): RawBusinessData;
}

/**
 * Extended adapter surface for live provider foundations (EPIC-560).
 * Optional methods — MockBusinessProvider remains a plain BusinessDataProvider.
 */
export interface BusinessProviderAdapter extends BusinessDataProvider {
  getCapabilities(): ProviderCapabilities;
  getStatus(): ProviderStatus;
}

export type { RawBusinessData, BusinessDataPoint, BusinessCategoryMargin };
export type { ProviderCapabilities, ProviderStatus };
