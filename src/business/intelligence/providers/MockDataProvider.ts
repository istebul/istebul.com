/**
 * @deprecated Use `src/business/providers/MockBusinessProvider.ts` (EPIC-520).
 * Compatibility shim — preserves EPIC-510 import paths.
 */
import {
  MockBusinessProvider,
  createMockBusinessProvider
} from '../../providers/MockBusinessProvider';
import type { BusinessDataProvider } from '../../types/business-provider';
import type { RawBusinessData } from '../types/raw-business-data';

/** @deprecated Prefer `BusinessDataProvider` from `types/business-provider`. */
export type IBusinessDataProvider = BusinessDataProvider;

/** @deprecated Prefer `MockBusinessProvider`. */
export class MockBusinessDataProvider extends MockBusinessProvider {
  override getSnapshot(): RawBusinessData {
    return super.getSnapshot();
  }
}

/** @deprecated Prefer `createMockBusinessProvider` / `createBusinessDataProvider`. */
export function createMockBusinessDataProvider(): BusinessDataProvider {
  return createMockBusinessProvider();
}

export default MockBusinessDataProvider;
