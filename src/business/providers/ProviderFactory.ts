import {
  createMockBusinessProvider,
  MockBusinessProvider
} from './MockBusinessProvider';
import {
  createProviderResolver,
  resolveBusinessDataProvider,
  type ProviderResolveOptions,
  type ProviderResolveResult
} from './core/ProviderResolver';
import type { BusinessDataProvider, BusinessProviderKind } from '../types/business-provider';

export interface ProviderFactoryOptions {
  /** Provider kind. Defaults to `mock`. */
  kind?: BusinessProviderKind;
  /**
   * When true, unready live providers throw instead of falling back to mock.
   * Default false — preserves pipeline runtime behaviour.
   */
  strict?: boolean;
}

/**
 * ProviderFactory — resolves BusinessDataProvider instances via ProviderResolver.
 * Mock remains the default (EPIC-520 / EPIC-560).
 */
export function createBusinessDataProvider(
  options: ProviderFactoryOptions = {}
): BusinessDataProvider {
  return resolveBusinessDataProvider({
    kind: options.kind ?? 'mock',
    strict: options.strict
  });
}

export function getDefaultBusinessDataProvider(): BusinessDataProvider {
  return createBusinessDataProvider({ kind: 'mock' });
}

/** Full resolve metadata (kind, fallback, status, capabilities). */
export function resolveBusinessProvider(
  options: ProviderFactoryOptions = {}
): ProviderResolveResult {
  return createProviderResolver().resolve({
    kind: options.kind ?? 'mock',
    strict: options.strict
  });
}

export {
  MockBusinessProvider,
  createMockBusinessProvider,
  createProviderResolver,
  resolveBusinessDataProvider
};
export type { ProviderResolveOptions, ProviderResolveResult };

export default createBusinessDataProvider;
