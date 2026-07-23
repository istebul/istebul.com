import type {
  BusinessDataProvider,
  BusinessProviderAdapter,
  BusinessProviderKind
} from '../../types/business-provider';
import type { ProviderCapabilities } from '../models/provider-capabilities';
import type { ProviderStatus } from '../models/provider-status';
import {
  createMockBusinessProvider,
  MockBusinessProvider
} from '../MockBusinessProvider';
import {
  createSupabaseProvider,
  SupabaseProvider
} from '../adapters/SupabaseProvider';
import { createERPProvider, ERPProvider } from '../adapters/ERPProvider';
import {
  createGarsonAIProvider,
  GarsonAIProvider
} from '../adapters/GarsonAIProvider';
import { getProviderCapabilities } from './ProviderCapabilities';
import {
  createProviderStatus,
  isProviderReady,
  validateProviderCapabilities
} from '../utils/provider-validator';

export interface ProviderResolveOptions {
  /** Requested provider kind. Defaults to `mock`. */
  kind?: BusinessProviderKind;
  /**
   * When true and the requested live provider is not ready, throw instead of
   * falling back to mock. Default false preserves runtime behaviour.
   */
  strict?: boolean;
}

export interface ProviderResolveResult {
  provider: BusinessDataProvider;
  requestedKind: BusinessProviderKind;
  resolvedKind: BusinessProviderKind;
  fellBackToMock: boolean;
  status: ProviderStatus;
  capabilities: ProviderCapabilities;
}

function instantiate(kind: BusinessProviderKind): BusinessDataProvider {
  switch (kind) {
    case 'mock':
      return createMockBusinessProvider();
    case 'supabase':
      return createSupabaseProvider();
    case 'erp':
      return createERPProvider();
    case 'garson-ai':
      return createGarsonAIProvider();
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function readStatus(provider: BusinessDataProvider): ProviderStatus {
  if (
    provider &&
    typeof provider === 'object' &&
    'getStatus' in provider &&
    typeof (provider as BusinessProviderAdapter).getStatus === 'function'
  ) {
    return (provider as BusinessProviderAdapter).getStatus();
  }
  if (provider.kind === 'mock') {
    return createProviderStatus({
      kind: 'mock',
      code: 'ready',
      ready: true,
      message: 'MockBusinessProvider is ready (local frozen snapshot).'
    });
  }
  return createProviderStatus({
    kind: provider.kind,
    code: 'unavailable',
    ready: false,
    message: `Provider "${provider.kind}" has no status surface.`
  });
}

/**
 * ProviderResolver — selects Business data providers by kind.
 * Mock remains the default; live adapters are never auto-activated.
 */
export class ProviderResolver {
  /**
   * Resolve a provider instance. Unready live kinds fall back to mock unless
   * `strict` is set (no live API/DB calls either way).
   */
  resolve(options: ProviderResolveOptions = {}): ProviderResolveResult {
    const requestedKind = options.kind ?? 'mock';
    const capabilities = getProviderCapabilities(requestedKind);
    if (!validateProviderCapabilities(capabilities)) {
      throw new Error(`Invalid capabilities for provider kind: ${requestedKind}`);
    }

    const candidate = instantiate(requestedKind);
    const status = readStatus(candidate);

    if (isProviderReady(status)) {
      return Object.freeze({
        provider: candidate,
        requestedKind,
        resolvedKind: candidate.kind,
        fellBackToMock: false,
        status,
        capabilities
      });
    }

    if (options.strict) {
      throw new Error(
        `Provider "${requestedKind}" is not ready (${status.code}): ${status.message}`
      );
    }

    const mock = createMockBusinessProvider();
    return Object.freeze({
      provider: mock,
      requestedKind,
      resolvedKind: 'mock',
      fellBackToMock: requestedKind !== 'mock',
      status,
      capabilities
    });
  }

  /** Convenience: return only the provider (mock default). */
  resolveProvider(options: ProviderResolveOptions = {}): BusinessDataProvider {
    return this.resolve(options).provider;
  }

  listKinds(): readonly BusinessProviderKind[] {
    return Object.freeze(['mock', 'supabase', 'erp', 'garson-ai'] as const);
  }
}

export function createProviderResolver(): ProviderResolver {
  return new ProviderResolver();
}

export function resolveBusinessDataProvider(
  options: ProviderResolveOptions = {}
): BusinessDataProvider {
  return createProviderResolver().resolveProvider(options);
}

export {
  MockBusinessProvider,
  SupabaseProvider,
  ERPProvider,
  GarsonAIProvider
};

export default ProviderResolver;
