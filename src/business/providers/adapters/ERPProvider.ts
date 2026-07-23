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
 * ERPProvider — foundation adapter for future ERP live data.
 * Does not perform API or database calls.
 */
export class ERPProvider implements BusinessProviderAdapter {
  readonly kind = 'erp' as const;

  getCapabilities(): ProviderCapabilities {
    return getProviderCapabilities('erp');
  }

  getStatus(): ProviderStatus {
    return createProviderStatus({
      kind: this.kind,
      code: 'stub',
      ready: false,
      message: 'ERPProvider is a foundation stub. No live ERP connection.'
    });
  }

  getSnapshot(): RawBusinessData {
    throw new ProviderNotReadyError(this.kind, this.getStatus());
  }
}

export function createERPProvider(): ERPProvider {
  return new ERPProvider();
}

export default ERPProvider;
