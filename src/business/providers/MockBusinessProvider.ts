import { MOCK_BUSINESS_RAW_DATA } from '../intelligence/data/mock-business-data';
import type { BusinessDataProvider } from '../types/business-provider';
import type { RawBusinessData } from '../intelligence/types/raw-business-data';

/**
 * Mock Business Provider — default data source for the Intelligence pipeline.
 * Uses the existing Business Intelligence mock snapshot (same values as EPIC-510).
 * No API / DB / auth / tenant calls.
 */
export class MockBusinessProvider implements BusinessDataProvider {
  readonly kind = 'mock' as const;

  getSnapshot(): RawBusinessData {
    return MOCK_BUSINESS_RAW_DATA;
  }
}

export function createMockBusinessProvider(): BusinessDataProvider {
  return new MockBusinessProvider();
}

export default MockBusinessProvider;
