import {
  createMockBusinessProvider,
  MockBusinessProvider
} from './MockBusinessProvider';
import type { BusinessDataProvider, BusinessProviderKind } from '../types/business-provider';

export interface ProviderFactoryOptions {
  /** Provider kind. Defaults to `mock`. */
  kind?: BusinessProviderKind;
}

/**
 * ProviderFactory — resolves BusinessDataProvider instances.
 * Mock is the default and only kind in EPIC-520.
 */
export function createBusinessDataProvider(
  options: ProviderFactoryOptions = {}
): BusinessDataProvider {
  const kind = options.kind ?? 'mock';

  switch (kind) {
    case 'mock':
      return createMockBusinessProvider();
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function getDefaultBusinessDataProvider(): BusinessDataProvider {
  return createBusinessDataProvider({ kind: 'mock' });
}

export { MockBusinessProvider, createMockBusinessProvider };

export default createBusinessDataProvider;
