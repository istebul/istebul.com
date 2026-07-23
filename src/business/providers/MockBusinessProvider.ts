import { MOCK_BUSINESS_RAW_DATA } from '../intelligence/data/mock-business-data';
import type {
  BusinessDataProvider,
  BusinessProviderAdapter
} from '../types/business-provider';
import type { RawBusinessData } from '../intelligence/types/raw-business-data';
import type { ProviderCapabilities } from './models/provider-capabilities';
import type { ProviderStatus } from './models/provider-status';
import { getProviderCapabilities } from './core/ProviderCapabilities';
import { createProviderStatus } from './utils/provider-validator';

/**
 * Mock Business Provider — default data source for the Intelligence pipeline.
 * Uses the existing Business Intelligence mock snapshot (same values as EPIC-510).
 * No API / DB / auth / tenant calls.
 */
export class MockBusinessProvider implements BusinessProviderAdapter {
  readonly kind = 'mock' as const;

  getCapabilities(): ProviderCapabilities {
    return getProviderCapabilities('mock');
  }

  getStatus(): ProviderStatus {
    return createProviderStatus({
      kind: this.kind,
      code: 'ready',
      ready: true,
      message: 'MockBusinessProvider is ready (local frozen snapshot).'
    });
  }

  getSnapshot(): RawBusinessData {
    return MOCK_BUSINESS_RAW_DATA;
  }
}

export function createMockBusinessProvider(): BusinessDataProvider {
  return new MockBusinessProvider();
}

export default MockBusinessProvider;
