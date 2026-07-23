import type { BusinessProviderAdapter } from '../../types/business-provider';
import type { RawBusinessData } from '../../intelligence/types/raw-business-data';
import type { ProviderCapabilities } from '../models/provider-capabilities';
import type { ProviderStatus } from '../models/provider-status';
import { getProviderCapabilities } from '../core/ProviderCapabilities';
import {
  createProviderStatus,
  ProviderNotReadyError
} from '../utils/provider-validator';

/**
 * SupabaseProvider — foundation adapter for future Supabase live data.
 * Does not perform API or database calls.
 */
export class SupabaseProvider implements BusinessProviderAdapter {
  readonly kind = 'supabase' as const;

  getCapabilities(): ProviderCapabilities {
    return getProviderCapabilities('supabase');
  }

  getStatus(): ProviderStatus {
    return createProviderStatus({
      kind: this.kind,
      code: 'stub',
      ready: false,
      message:
        'SupabaseProvider is a foundation stub. No live API or database connection.'
    });
  }

  getSnapshot(): RawBusinessData {
    throw new ProviderNotReadyError(this.kind, this.getStatus());
  }
}

export function createSupabaseProvider(): SupabaseProvider {
  return new SupabaseProvider();
}

export default SupabaseProvider;
