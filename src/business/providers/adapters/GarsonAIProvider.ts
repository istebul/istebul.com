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
 * GarsonAIProvider — foundation adapter for future Garson AI operational data.
 * Does not perform API or database calls.
 */
export class GarsonAIProvider implements BusinessProviderAdapter {
  readonly kind = 'garson-ai' as const;

  getCapabilities(): ProviderCapabilities {
    return getProviderCapabilities('garson-ai');
  }

  getStatus(): ProviderStatus {
    return createProviderStatus({
      kind: this.kind,
      code: 'stub',
      ready: false,
      message:
        'GarsonAIProvider is a foundation stub. No live Garson AI connection.'
    });
  }

  getSnapshot(): RawBusinessData {
    throw new ProviderNotReadyError(this.kind, this.getStatus());
  }
}

export function createGarsonAIProvider(): GarsonAIProvider {
  return new GarsonAIProvider();
}

export default GarsonAIProvider;
