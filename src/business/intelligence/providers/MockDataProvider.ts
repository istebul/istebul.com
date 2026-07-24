import { MOCK_BUSINESS_RAW_DATA } from '../data/mock-business-data';
import type { IBusinessDataProvider, RawBusinessData } from '../types/raw-business-data';

/**
 * Mock Data Provider — returns a frozen in-memory snapshot.
 * No network, DB, auth, or tenant calls.
 */
export class MockBusinessDataProvider implements IBusinessDataProvider {
  getSnapshot(): RawBusinessData {
    return MOCK_BUSINESS_RAW_DATA;
  }
}

export function createMockBusinessDataProvider(): IBusinessDataProvider {
  return new MockBusinessDataProvider();
}

export default MockBusinessDataProvider;
