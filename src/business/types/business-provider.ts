import type {
  BusinessCategoryMargin,
  BusinessDataPoint,
  RawBusinessData
} from '../intelligence/types/raw-business-data';

/** Supported Business data provider kinds (EPIC-520). */
export type BusinessProviderKind = 'mock';

/**
 * Provider-based data access for Business Intelligence.
 * Implementations must not call network, DB, auth, or tenant APIs.
 */
export interface BusinessDataProvider {
  readonly kind: BusinessProviderKind;
  /** Returns a frozen business snapshot. */
  getSnapshot(): RawBusinessData;
}

export type { RawBusinessData, BusinessDataPoint, BusinessCategoryMargin };
